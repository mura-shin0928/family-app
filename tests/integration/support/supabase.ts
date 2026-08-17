import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// `supabase start` が発行するローカル専用の固定デフォルト値（127.0.0.1:54321 にのみ有効）。
const LOCAL_URL = "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const LOCAL_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

export const SUPABASE_URL = process.env.SUPABASE_URL ?? LOCAL_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? LOCAL_ANON_KEY;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_SERVICE_ROLE_KEY;

/** service_role: RLS を無視できる管理者クライアント。テストのセットアップ専用。 */
export function createAdminClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/** anon: RLS が効く一般クライアント。サインイン前に使う。 */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type TestUser = { id: string; email: string };

/** email_confirm済みのテストユーザーを作成する。 */
export async function createConfirmedUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<TestUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`failed to create test user ${email}: ${error?.message}`);
  }
  return { id: data.user.id, email };
}

/** パスワードサインインして、そのユーザーとしてRLSが効くクライアントを返す。 */
export async function signInAsClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`failed to sign in as ${email}: ${error.message}`);
  }
  return client;
}

export async function deleteUser(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  await admin.auth.admin.deleteUser(userId);
}
