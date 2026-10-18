import { afterEach, describe, expect, it, vi } from "vitest";
import { getAreaPrograms, getAreas } from "@/features/programs/api";

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

function stubProgramsResponse(programs: unknown[]) {
  vi.stubEnv("SEIDO_DATA_HUB_API_URL", "https://seido.example.test");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: programs,
        attribution: {
          source: "東京都",
          license: "CC BY 4.0",
          license_url: "https://creativecommons.org/licenses/by/4.0/",
          notice: "",
        },
      }),
    }),
  );
}

function rawProgram(overrides: Record<string, unknown>) {
  return {
    id: "p1",
    area_code: "999999",
    canonical_name: "標準名",
    short_name: null,
    source_url: "https://example.test/old",
    category_codes: ["003"],
    target_codes: ["087"],
    age_min_months: null,
    age_max_months: null,
    url: "https://example.test/now",
    state: "active",
    checked_at: "2026-10-12T03:20:00+09:00",
    changed_at: null,
    auto_update: true,
    moved_to: null,
    related_links: [],
    ...overrides,
  };
}

describe("seido-data-hub の制度の事実", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("いま開ける URL・状態・日付・関連リンクを読む", async () => {
    stubProgramsResponse([
      rawProgram({
        state: "deleted",
        changed_at: "2026-10-05T03:20:00+09:00",
        related_links: [
          {
            url: "https://example.test/related",
            state: "active",
            checked_at: "2026-10-12T03:21:00+09:00",
          },
        ],
      }),
    ]);
    const result = await getAreaPrograms("999999");
    expect(result.ok && result.data[0]).toMatchObject({
      sourceUrl: "https://example.test/old",
      url: "https://example.test/now",
      state: "deleted",
      checkedAt: "2026-10-12T03:20:00+09:00",
      changedAt: "2026-10-05T03:20:00+09:00",
      autoUpdate: true,
      relatedLinks: [
        {
          url: "https://example.test/related",
          state: "active",
          checkedAt: "2026-10-12T03:21:00+09:00",
        },
      ],
    });
  });

  it("知らない状態でも一覧を落とさない", async () => {
    stubProgramsResponse([rawProgram({ state: "something_new" })]);
    const result = await getAreaPrograms("999999");
    expect(result.ok && result.data[0].state).toBe("something_new");
  });

  it("いま開ける URL が http(s) でない制度は出さない", async () => {
    stubProgramsResponse([
      rawProgram({ id: "a", url: "javascript:alert(1)" }),
      rawProgram({ id: "b" }),
    ]);
    const result = await getAreaPrograms("999999");
    expect(result.ok && result.data.map((p) => p.id)).toEqual(["b"]);
  });

  it("http(s) でない関連リンクは落とす", async () => {
    stubProgramsResponse([
      rawProgram({
        related_links: [
          { url: "data:text/html,x", state: "active", checked_at: null },
          { url: "https://example.test/r", state: null, checked_at: null },
        ],
      }),
    ]);
    const result = await getAreaPrograms("999999");
    expect(
      result.ok && result.data[0].relatedLinks.map((link) => link.url),
    ).toEqual(["https://example.test/r"]);
  });
});
