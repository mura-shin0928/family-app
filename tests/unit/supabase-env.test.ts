import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv } from "@/lib/supabase/env";

describe("getSupabaseEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("両方設定されていれば値を返す", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");

    expect(getSupabaseEnv()).toEqual({
      url: "http://127.0.0.1:54321",
      anonKey: "anon",
    });
  });

  it("どちらかが未設定なら変数名を含むエラーを投げる", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");

    expect(() => getSupabaseEnv()).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
