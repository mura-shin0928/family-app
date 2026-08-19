#!/usr/bin/env node
// ローカルSupabase (`supabase start`) 専用のログイン補助スクリプト。
// family / family_members が無いとログインできない（招待フローなし）ため、
// 1) 指定emailのfamily_memberを（無ければfamilyごと）作成
// 2) マジックリンクを送信
// 3) Mailpitからリンクを取得してブラウザで開く
// までを1コマンドで行う。本番/リモートのSupabaseには一切接続しない。
//
// 使い方: node scripts/dev-login.mjs [email] [displayName]
//   例:   node scripts/dev-login.mjs taro@example.test 太郎

import { execFile } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
// supabase start が毎回発行する固定のデモキー（秘密情報ではない）。
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const MAILPIT_URL = "http://127.0.0.1:54324";
const APP_URL = "http://localhost:3000";

const email = process.argv[2] ?? "dev@example.test";
const displayName = process.argv[3] ?? "開発用";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureFamilyMember() {
  const { data: existing, error: findError } = await admin
    .from("family_members")
    .select("id, family_id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();
  if (findError)
    throw new Error(`family_members検索に失敗: ${findError.message}`);
  if (existing) return { ...existing, created: false };

  const { data: family, error: familyError } = await admin
    .from("families")
    .insert({ name: `${displayName}の開発用family` })
    .select("id")
    .single();
  if (familyError) throw new Error(`family作成に失敗: ${familyError.message}`);

  const { data: member, error: memberError } = await admin
    .from("family_members")
    .insert({ family_id: family.id, email, display_name: displayName })
    .select("id, family_id")
    .single();
  if (memberError)
    throw new Error(`family_member作成に失敗: ${memberError.message}`);

  return { ...member, created: true };
}

async function sendMagicLink() {
  const { error } = await anon.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${APP_URL}/auth/callback` },
  });
  if (error) throw new Error(`マジックリンク送信に失敗: ${error.message}`);
}

async function fetchLatestVerifyLink() {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const list = await fetch(`${MAILPIT_URL}/api/v1/messages`).then((r) =>
      r.json(),
    );
    const message = list.messages?.find((m) =>
      m.To?.some((to) => to.Address === email),
    );
    if (message) {
      const detail = await fetch(
        `${MAILPIT_URL}/api/v1/message/${message.ID}`,
      ).then((r) => r.json());
      const body = detail.HTML ?? detail.Text ?? "";
      const match = body.match(
        /https?:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?[^\s"'<]+/,
      );
      if (match) return match[0].replace(/&amp;/g, "&");
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(
    "Mailpitにメールが届きませんでした。`supabase status` でローカルSupabaseが起動しているか確認してください。",
  );
}

const member = await ensureFamilyMember();
console.log(
  `family_member: ${email}（family_id=${member.family_id}）${member.created ? "を新規作成しました" : "は既存です"}`,
);

await sendMagicLink();
console.log("マジックリンクを送信しました。Mailpitから取得しています…");

const link = await fetchLatestVerifyLink();
console.log(`\nログインリンク:\n${link}\n`);

if (process.platform === "darwin") {
  execFile("open", [link], (error) => {
    if (!error) console.log("ブラウザで開きました。");
  });
} else {
  console.log("上のリンクをブラウザで開いてください。");
}
