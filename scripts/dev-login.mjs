#!/usr/bin/env node
// ローカルSupabase (`supabase start`) 専用のログイン準備スクリプト。
// family / family_members が無いとログインできない（参加は招待の受諾経由のみ）ため、
// 指定emailのauthユーザーとfamily_memberを（無ければfamilyごと）service_roleで
// 直接作成し、ログイン画面を開く（招待メールの発行・受諾を毎回手で辿らずに
// 開発時にすぐ動作確認できるようにするための近道であり、本番の参加経路ではない）。
//
// マジックリンクの送信自体はこのスクリプトではなく、開いたブラウザから
// 行う必要がある（PKCEのcode_verifierがブラウザのCookieに保存される
// ため。Node側から signInWithOtp を呼ぶと、そのCookieが実ブラウザに
// 乗らずログインに失敗する）。ログイン画面でemailを入力し「ログイン
// リンクを送る」を押した後、届いたメールをMailpit
// (http://127.0.0.1:54324) から開くこと。
// （ログイン画面へのemail自動入力はproductionコードの変更が必要になる
// ため、あえてやっていない）
//
// 使い方: node scripts/dev-login.mjs [email] [displayName]
//   例:   node scripts/dev-login.mjs taro@example.test 太郎

import { execFile } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "http://127.0.0.1:54321";
// supabase start が毎回発行する固定のデモキー（秘密情報ではない）。
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
const MAILPIT_URL = "http://127.0.0.1:54324";
const APP_URL = "http://localhost:3000";

const email = process.argv[2] ?? "dev@example.test";
const displayName = process.argv[3] ?? "開発用";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureAuthUser() {
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError)
    throw new Error(`ユーザー一覧取得に失敗: ${listError.message}`);
  const existing = list.users.find((u) => u.email === email);
  if (existing) return existing.id;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error || !data.user)
    throw new Error(`ユーザー作成に失敗: ${error?.message}`);
  return data.user.id;
}

async function ensureFamilyMember() {
  const userId = await ensureAuthUser();

  const { data: existing, error: findError } = await admin
    .from("family_members")
    .select("id, family_id")
    .eq("user_id", userId)
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
    .insert({
      family_id: family.id,
      user_id: userId,
      display_name: displayName,
    })
    .select("id, family_id")
    .single();
  if (memberError)
    throw new Error(`family_member作成に失敗: ${memberError.message}`);

  return { ...member, created: true };
}

const member = await ensureFamilyMember();
console.log(
  `family_member: ${email}（family_id=${member.family_id}）${member.created ? "を新規作成しました" : "は既存です"}`,
);

const loginUrl = `${APP_URL}/login`;
console.log(`\nログイン画面を開きます: ${loginUrl}`);
console.log(`メールアドレス欄に ${email} を入力し、`);
console.log("「ログインリンクを送る」を押してください。");
console.log(`届いたメールは Mailpit (${MAILPIT_URL}) から開けます。\n`);

if (process.platform === "darwin") {
  execFile("open", [loginUrl], (error) => {
    if (!error) console.log("ブラウザで開きました。");
  });
} else {
  console.log("上のURLをブラウザで開いてください。");
}
