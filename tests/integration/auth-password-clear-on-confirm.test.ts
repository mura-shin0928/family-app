import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { createAdminClient, createAnonClient } from "./support/supabase";

const PASSWORD = "Attacker-Password-123!";

// 招待フローでは signInWithOtp を create_user:true で呼ぶため、第三者が招待先の
// メールアドレス宛に先にパスワード付きで sign up しておくと、本人がログインリンクで
// そのメール確認を完了させた瞬間に、第三者の設定したパスワードがそのまま使える
// ようになってしまう。これを防ぐ clear_password_on_first_confirm トリガーの回帰テスト。
describe("メール初回確認時にパスワードを無効化する", () => {
  const admin = createAdminClient();
  const userIds: string[] = [];

  afterAll(async () => {
    await Promise.all(userIds.map((id) => admin.auth.admin.deleteUser(id)));
  });

  it("確認前に設定されたパスワードは、確認後に使えなくなる", async () => {
    const email = `pw-preregister-${randomUUID().slice(0, 8)}@example.test`;

    // 第三者が、まだ誰のものでもないアドレス宛にパスワード付きで sign up する。
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: false,
      });
    if (createError || !created.user) {
      throw new Error(`failed to create user: ${createError?.message}`);
    }
    userIds.push(created.user.id);

    // 確認前は GoTrue 自体が未確認ユーザーのパスワードログインを拒否するため、
    // この時点でパスワードが使えるかどうかは確認しない（確認前後の対比が本題）。

    // 本人がログインリンクを開いた、という想定で email_confirmed_at を立てる。
    const { error: confirmError } = await admin.auth.admin.updateUserById(
      created.user.id,
      { email_confirm: true },
    );
    expect(confirmError).toBeNull();

    // 第三者の設定したパスワードは、もう使えない。
    const anonAfter = createAnonClient();
    const after = await anonAfter.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    expect(after.error).not.toBeNull();
  });

  it("確認後にパスワードを設定する通常の操作は妨げない（対照）", async () => {
    const email = `pw-after-confirm-${randomUUID().slice(0, 8)}@example.test`;

    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
    if (createError || !created.user) {
      throw new Error(`failed to create user: ${createError?.message}`);
    }
    userIds.push(created.user.id);

    const { error: passwordError } = await admin.auth.admin.updateUserById(
      created.user.id,
      { password: PASSWORD },
    );
    expect(passwordError).toBeNull();

    const anon = createAnonClient();
    const { error } = await anon.auth.signInWithPassword({
      email,
      password: PASSWORD,
    });
    expect(error).toBeNull();
  });
});
