#!/usr/bin/env node
/**
 * Family作成・管理側からの招待発行を行う管理用CLI。
 *
 * service role key はこのスクリプト以外（Next.jsアプリ・ブラウザ）からは
 * 一切参照しない。.env.admin.local はコミットしない（.gitignore の .env* で保護）。
 *
 *   node --env-file=.env.admin.local scripts/admin.mts create-family --name "村上家" --yes
 *   node --env-file=.env.admin.local scripts/admin.mts invite --family <uuid> --email x@example.com --display-name "しん" --yes
 *   node --env-file=.env.admin.local scripts/admin.mts list-families
 *   node --env-file=.env.admin.local scripts/admin.mts list-members --family <uuid>
 *   node --env-file=.env.admin.local scripts/admin.mts list-invitations --family <uuid>
 *   node --env-file=.env.admin.local scripts/admin.mts revoke --invitation <uuid> --yes
 *   node --env-file=.env.admin.local scripts/admin.mts remove-member --member <uuid> --yes
 *   node --env-file=.env.admin.local scripts/admin.mts grant-admin --email x@example.com --yes
 *   node --env-file=.env.admin.local scripts/admin.mts revoke-admin --email x@example.com --yes
 *   node --env-file=.env.admin.local scripts/admin.mts list-admins
 *
 * 書き込み系コマンドは --yes を付けない限り、接続先と内容を表示するだけで何もしない
 * （config push事故の再発防止 — 常に「今どこに何をしようとしているか」を先に見せる）。
 */
import { createHash, randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const USAGE = `使い方:
  node --env-file=.env.admin.local scripts/admin.mts <command> [options]

commands:
  create-family --name <name> [--yes]
  invite --family <uuid> --email <email> --display-name <name> [--yes]
  list-families
  list-members --family <uuid>
  list-invitations --family <uuid>
  revoke --invitation <uuid> [--yes]
  remove-member --member <uuid> [--yes]
  grant-admin --email <email> [--yes]
  revoke-admin --email <email> [--yes]
  list-admins

.env.admin.example を .env.admin.local としてコピーし、値を埋めてから実行してください。`;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_ORIGIN = process.env.APP_ORIGIN;
const INVITATION_TTL_DAYS = 7;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。\n");
  console.error(USAGE);
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function generateInvitationToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function requireField(value: string | undefined, flag: string): string {
  if (!value) {
    console.error(`--${flag} は必須です`);
    process.exit(1);
  }
  return value;
}

/** 書き込み系コマンドの共通ゲート。接続先と内容を必ず表示し、--yes が無ければ何もせず終了する。 */
function confirmOrExit(summary: string, yes: boolean) {
  console.log(`接続先: ${SUPABASE_URL}`);
  console.log(summary);
  if (!yes) {
    console.log(
      "\n何も変更していません。実行するには --yes を付けてください。",
    );
    process.exit(0);
  }
}

function printInviteUrl(token: string) {
  console.log(
    "\n招待URLを作成しました（この場でしか表示されません。再表示はできません）:",
  );
  if (APP_ORIGIN) {
    console.log(`  ${APP_ORIGIN.replace(/\/+$/, "")}/invite/${token}`);
  } else {
    console.log(`  /invite/${token}`);
    console.log(
      "  (APP_ORIGIN 未設定のため、アプリのドメインは各自で先頭に付けてください)",
    );
  }
}

/**
 * GoTrue admin API に email 検索が無いため、全ユーザーを1000件ずつ辿って探す。
 * admin_users 付与はごく低頻度の運用操作なので、これで十分。
 */
async function findUserByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  const target = email.trim().toLowerCase();
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      console.error(`ユーザー検索に失敗しました: ${error.message}`);
      process.exit(1);
    }
    const found = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === target,
    );
    if (found) return { id: found.id, email: found.email ?? target };
    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function createInvitationRow(
  familyId: string,
  email: string,
  displayName: string,
): Promise<void> {
  if (!isValidEmail(email)) {
    console.error("メールアドレスの形式が正しくありません");
    process.exit(1);
  }

  const token = generateInvitationToken();
  const expiresAt = new Date(
    Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // service_role はRLSをbypassするため、is_family_member等のチェックは適用されない
  // （それが「管理側は任意のFamilyへ操作できる」の実体）。invited_by は常にnull
  // = 「管理側が発行した招待」であることをDB上でも区別できるようにする。
  const { error } = await admin.from("invitations").insert({
    family_id: familyId,
    token_hash: hashInvitationToken(token),
    invited_email: email.trim().toLowerCase(),
    display_name: displayName,
    invited_by: null,
    expires_at: expiresAt,
  });

  if (error) {
    console.error(`招待の作成に失敗しました: ${error.message}`);
    process.exit(1);
  }

  printInviteUrl(token);
}

async function main() {
  const [, , command, ...rest] = process.argv;

  const { values } = parseArgs({
    args: rest,
    options: {
      name: { type: "string" },
      family: { type: "string" },
      email: { type: "string" },
      "display-name": { type: "string" },
      invitation: { type: "string" },
      member: { type: "string" },
      yes: { type: "boolean", default: false },
    },
  });

  switch (command) {
    case "create-family": {
      const name = requireField(values.name, "name");
      confirmOrExit(`Family「${name}」を新規作成します`, values.yes);

      const { data: family, error } = await admin
        .from("families")
        .insert({ name })
        .select("id")
        .single();

      if (error || !family) {
        console.error(`Familyの作成に失敗しました: ${error?.message}`);
        process.exit(1);
      }
      console.log(`Family作成完了: id=${family.id}`);
      break;
    }

    case "invite": {
      const familyId = requireField(values.family, "family");
      const email = requireField(values.email, "email");
      const displayName = requireField(values["display-name"], "display-name");

      confirmOrExit(
        `Family(${familyId}) へ ${email}（表示名: ${displayName}）を招待します`,
        values.yes,
      );
      await createInvitationRow(familyId, email, displayName);
      break;
    }

    case "list-families": {
      const { data, error } = await admin
        .from("families")
        .select("id, name, created_at")
        .order("created_at");
      if (error) {
        console.error(error.message);
        process.exit(1);
      }
      console.table(data);
      break;
    }

    case "list-members": {
      const familyId = requireField(values.family, "family");
      const { data, error } = await admin
        .from("family_members")
        .select("id, display_name, joined_at")
        .eq("family_id", familyId)
        .order("joined_at");
      if (error) {
        console.error(error.message);
        process.exit(1);
      }
      console.table(data);
      break;
    }

    case "list-invitations": {
      const familyId = requireField(values.family, "family");
      const { data, error } = await admin
        .from("invitations")
        .select(
          "id, invited_email, display_name, created_at, expires_at, accepted_at, revoked_at",
        )
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error.message);
        process.exit(1);
      }
      console.table(data);
      break;
    }

    case "revoke": {
      const invitationId = requireField(values.invitation, "invitation");
      confirmOrExit(`招待(${invitationId})を取り消します`, values.yes);

      const { error } = await admin
        .from("invitations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", invitationId);
      if (error) {
        console.error(error.message);
        process.exit(1);
      }
      console.log("取り消しました");
      break;
    }

    case "remove-member": {
      const memberId = requireField(values.member, "member");

      const { data: memberRow, error: lookupError } = await admin
        .from("family_members")
        .select("id, display_name, user_id")
        .eq("id", memberId)
        .single();
      if (lookupError || !memberRow) {
        console.error(`メンバーが見つかりません: ${lookupError?.message}`);
        process.exit(1);
      }

      confirmOrExit(
        `メンバー「${memberRow.display_name}」(${memberId}) を認証情報ごと削除します`,
        values.yes,
      );

      // auth.users を消せば family_members 行は on delete cascade で
      // 自動的に消える（アプリの「削除」ボタンは family_members 行だけを消すが、
      // それだと本人のログイン自体は残るため、完全に消したいときはこちらを使う）。
      const { error: deleteError } = await admin.auth.admin.deleteUser(
        memberRow.user_id,
      );
      if (deleteError) {
        console.error(`認証情報の削除に失敗しました: ${deleteError.message}`);
        process.exit(1);
      }
      console.log("認証情報ごと削除しました");
      break;
    }

    case "grant-admin": {
      const email = requireField(values.email, "email");
      const user = await findUserByEmail(email);
      if (!user) {
        console.error(
          `ユーザーが見つかりません（先にサインインが必要です）: ${email}`,
        );
        process.exit(1);
      }

      confirmOrExit(
        `${user.email}（user_id=${user.id}）にadmin権限を付与します`,
        values.yes,
      );

      const { error } = await admin
        .from("admin_users")
        .upsert({ user_id: user.id }, { onConflict: "user_id" });
      if (error) {
        console.error(`admin権限の付与に失敗しました: ${error.message}`);
        process.exit(1);
      }
      console.log("admin権限を付与しました");
      break;
    }

    case "revoke-admin": {
      const email = requireField(values.email, "email");
      const user = await findUserByEmail(email);
      if (!user) {
        console.error(`ユーザーが見つかりません: ${email}`);
        process.exit(1);
      }

      confirmOrExit(
        `${user.email}（user_id=${user.id}）のadmin権限を剥奪します`,
        values.yes,
      );

      const { error } = await admin
        .from("admin_users")
        .delete()
        .eq("user_id", user.id);
      if (error) {
        console.error(`admin権限の剥奪に失敗しました: ${error.message}`);
        process.exit(1);
      }
      console.log("admin権限を剥奪しました");
      break;
    }

    case "list-admins": {
      const { data, error } = await admin
        .from("admin_users")
        .select("user_id, created_at")
        .order("created_at");
      if (error) {
        console.error(error.message);
        process.exit(1);
      }

      const rows = await Promise.all(
        (data ?? []).map(async (row) => {
          const { data: userData } = await admin.auth.admin.getUserById(
            row.user_id,
          );
          return {
            email: userData.user?.email ?? "(不明)",
            user_id: row.user_id,
            created_at: row.created_at,
          };
        }),
      );
      console.table(rows);
      break;
    }

    default: {
      console.log(USAGE);
      process.exit(command ? 1 : 0);
    }
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
