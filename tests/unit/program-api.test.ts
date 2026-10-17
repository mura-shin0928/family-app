import { afterEach, describe, expect, it, vi } from "vitest";
import { getAreas } from "@/features/programs/api";

function stubSeidoResponse(licenseUrl: string) {
  vi.stubEnv("SEIDO_DATA_HUB_API_URL", "https://seido.example.test");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: [],
        attribution: {
          source: "東京都",
          license: "CC BY 4.0",
          license_url: licenseUrl,
          notice: "",
        },
      }),
    }),
  );
}

describe("seido-data-hub の出典リンク", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    "javascript:alert(1)",
    " javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "not a url",
  ])("license_url が %s なら取得失敗にする", async (licenseUrl) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubSeidoResponse(licenseUrl);
    expect(await getAreas()).toEqual({ ok: false, reason: "unavailable" });
  });

  it.each([
    "https://creativecommons.org/licenses/by/4.0/",
    "http://creativecommons.org/licenses/by/4.0/",
  ])("license_url が %s ならそのまま返す", async (licenseUrl) => {
    stubSeidoResponse(licenseUrl);
    const result = await getAreas();
    expect(result.ok && result.attribution.licenseUrl).toBe(licenseUrl);
  });
});
