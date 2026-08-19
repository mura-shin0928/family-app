import { afterEach, describe, expect, it, vi } from "vitest";
import { urlOnly } from "@/features/recipes/extraction/detect";
import { extractRecipeFromText } from "@/features/recipes/extraction/gemini";
import {
  buildRequestBody,
  parseOutput,
} from "@/features/recipes/extraction/protocol";

describe("urlOnly", () => {
  it("returns the URL when the input is a single https URL", () => {
    expect(urlOnly("https://example.com/recipe/1")).toBe(
      "https://example.com/recipe/1",
    );
  });

  it("returns the URL when surrounded by whitespace", () => {
    expect(urlOnly("  https://example.com/recipe/1  ")).toBe(
      "https://example.com/recipe/1",
    );
  });

  it("returns null when a URL is mixed with body text", () => {
    expect(
      urlOnly("鶏の照り焼き https://example.com/recipe/1 材料..."),
    ).toBeNull();
  });

  it("returns null for body text only", () => {
    expect(urlOnly("鶏もも肉 300g\n白菜 1/4個")).toBeNull();
  });

  it("returns null for a non-http(s) scheme", () => {
    expect(urlOnly("mailto:test@example.com")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(urlOnly("   ")).toBeNull();
  });
});

describe("buildRequestBody", () => {
  it("carries the pasted text verbatim as input", () => {
    const body = buildRequestBody("鶏もも肉 300g");
    expect(body.input).toBe("鶏もも肉 300g");
  });

  it("defaults to GEMINI_MODEL but accepts a model override", () => {
    expect(buildRequestBody("text").model).toBe("gemini-3.7-flash");
    expect(buildRequestBody("text", "gemini-3.5-flash-lite").model).toBe(
      "gemini-3.5-flash-lite",
    );
  });

  it("requests structured JSON output and stateless mode", () => {
    const body = buildRequestBody("text");
    expect(body.store).toBe(false);
    expect(body.response_format.type).toBe("text");
    expect(body.response_format.mime_type).toBe("application/json");
    expect(body.response_format.schema.required).toEqual([
      "title",
      "ingredients",
    ]);
  });

  it("uses a fixed system instruction that never includes caller-provided text", () => {
    const body = buildRequestBody("家族の秘密のメモ");
    expect(body.system_instruction).not.toContain("家族の秘密のメモ");
    expect(typeof body.system_instruction).toBe("string");
    expect(body.system_instruction.length).toBeGreaterThan(0);
  });
});

function envelope(outputText: unknown) {
  return { output_text: JSON.stringify(outputText) };
}

describe("parseOutput", () => {
  it("parses a well-formed draft", () => {
    const result = parseOutput(
      envelope({
        title: "鶏の照り焼き",
        ingredients: [
          { name: "鶏もも肉", quantity: "300g" },
          { name: "白菜", quantity: "1/4個" },
        ],
      }),
    );
    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        ingredients: [
          { name: "鶏もも肉", quantity: "300g" },
          { name: "白菜", quantity: "1/4個" },
        ],
      },
    });
  });

  it("fails when output_text is not JSON", () => {
    const result = parseOutput({ output_text: "not json" });
    expect(result).toEqual({ kind: "failed", reason: "invalid-response" });
  });

  it("fails when the response has neither output_text nor steps", () => {
    const result = parseOutput({ steps: [] });
    expect(result).toEqual({ kind: "failed", reason: "invalid-response" });
  });

  it("parses a draft from steps when output_text is absent (thinking_level response)", () => {
    // 実疎通で確認した実際の形: thinking_level を使うと output_text が省略され、
    // thought ステップの後に model_output ステップが来る。
    const result = parseOutput({
      status: "completed",
      steps: [
        { type: "thought", signature: "opaque-signature" },
        {
          type: "model_output",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                title: "鶏の照り焼き",
                ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
              }),
            },
          ],
        },
      ],
      object: "interaction",
      model: "gemini-3.7-flash",
    });
    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
      },
    });
  });

  it("ignores non-model_output steps and takes text from model_output only", () => {
    const result = parseOutput({
      steps: [
        {
          type: "model_output",
          content: [{ type: "text", text: JSON.stringify({ title: "x" }) }],
        },
      ],
    });
    // 不完全なJSON（ingredients欠落）はdraftSchemaで弾かれる
    expect(result).toEqual({ kind: "failed", reason: "invalid-response" });
  });

  it("accepts an empty ingredients array", () => {
    const result = parseOutput(
      envelope({ title: "謎の料理", ingredients: [] }),
    );
    expect(result).toEqual({
      kind: "draft",
      draft: { title: "謎の料理", ingredients: [] },
    });
  });

  it("fails when a required field is missing", () => {
    const result = parseOutput(envelope({ ingredients: [] }));
    expect(result).toEqual({ kind: "failed", reason: "invalid-response" });
  });

  it("ignores extra fields in the schema output", () => {
    const result = parseOutput(
      envelope({
        title: "鶏の照り焼き",
        ingredients: [{ name: "鶏もも肉", quantity: "300g", note: "国産" }],
      }),
    );
    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
      },
    });
  });

  it("caps ingredients at 50 rows", () => {
    const ingredients = Array.from({ length: 60 }, (_, i) => ({
      name: `材料${i}`,
      quantity: "",
    }));
    const result = parseOutput(envelope({ title: "大量レシピ", ingredients }));
    expect(result.kind).toBe("draft");
    if (result.kind === "draft") {
      expect(result.draft.ingredients).toHaveLength(50);
    }
  });

  it("drops ingredients with an empty name", () => {
    const result = parseOutput(
      envelope({
        title: "鶏の照り焼き",
        ingredients: [
          { name: "  ", quantity: "300g" },
          { name: "白菜", quantity: "" },
        ],
      }),
    );
    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        ingredients: [{ name: "白菜", quantity: "" }],
      },
    });
  });

  it("truncates overly long name and quantity", () => {
    const longName = "あ".repeat(150);
    const longQuantity = "い".repeat(80);
    const result = parseOutput(
      envelope({
        title: "料理",
        ingredients: [{ name: longName, quantity: longQuantity }],
      }),
    );
    expect(result.kind).toBe("draft");
    if (result.kind === "draft") {
      expect(result.draft.ingredients[0]?.name).toHaveLength(100);
      expect(result.draft.ingredients[0]?.quantity).toHaveLength(50);
    }
  });
});

describe("extractRecipeFromText", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalApiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = originalApiKey;
    }
  });

  it("returns no-key when GEMINI_API_KEY is unset", async () => {
    delete process.env.GEMINI_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractRecipeFromText("鶏もも肉 300g");

    expect(result).toEqual({ kind: "failed", reason: "no-key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns api-error on a non-200 response", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const result = await extractRecipeFromText("鶏もも肉 300g");

    expect(result).toEqual({ kind: "failed", reason: "api-error" });
  });

  it("returns timeout when the request is aborted", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        const error = new Error("aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      }),
    );

    const result = await extractRecipeFromText("鶏もも肉 300g");

    expect(result).toEqual({ kind: "failed", reason: "timeout" });
  });

  it("moves to the next fallback model each time the current one returns 429", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 }) // gemini-3.7-flash
      .mockResolvedValueOnce({ ok: false, status: 429 }) // gemini-3.6-flash
      .mockResolvedValueOnce({
        ok: true, // gemini-3.5-flash
        json: () =>
          Promise.resolve(
            envelope({
              title: "鶏の照り焼き",
              ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
            }),
          ),
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractRecipeFromText("鶏もも肉 300g");

    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const modelsCalled = fetchMock.mock.calls.map(
      (call) => JSON.parse(call[1].body).model,
    );
    expect(modelsCalled).toEqual([
      "gemini-3.7-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ]);
  });

  it("does not retry non-429 errors", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractRecipeFromText("鶏もも肉 300g");

    expect(result).toEqual({ kind: "failed", reason: "api-error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns api-error when every model in the chain is rate-limited", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractRecipeFromText("鶏もも肉 300g");

    expect(result).toEqual({ kind: "failed", reason: "api-error" });
    // gemini-3.7-flash + 3つのフォールバック = 4回
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("does not call fetch at all once the shared deadline has already passed", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractRecipeFromText("鶏もも肉 300g", {
      deadlineAt: Date.now() - 1,
    });

    expect(result).toEqual({ kind: "failed", reason: "timeout" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops the fallback chain once the shared deadline is exhausted, regardless of remaining models", async () => {
    // 各モデルへの再試行は「新たに25秒もらえる」のではなく、呼び出し開始時に
    // 固定した1つのdeadlineAtの残り時間を使い回す。429が連続しても、
    // 経過時間の分だけ次の試行に使える時間は減っていくことを検証する。
    process.env.GEMINI_API_KEY = "test-key";
    vi.useFakeTimers();

    const fetchMock = vi.fn().mockImplementation(async () => {
      // 1回の試行に3秒かかったとみなして仮想時計を進める。
      vi.advanceTimersByTime(3000);
      return { ok: false, status: 429 };
    });
    vi.stubGlobal("fetch", fetchMock);

    const deadlineAt = Date.now() + 5000; // 4モデル分(3秒x4=12秒)には全く足りない

    const result = await extractRecipeFromText("鶏もも肉 300g", { deadlineAt });

    expect(result).toEqual({ kind: "failed", reason: "timeout" });
    // 5秒の猶予に対して1回3秒かかるので、2回目までしか試せない
    // （4モデル全部を律儀に試すわけではない）。
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("returns a draft on success", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            envelope({
              title: "鶏の照り焼き",
              ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
            }),
          ),
      }),
    );

    const result = await extractRecipeFromText("鶏もも肉 300g");

    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
      },
    });
  });
});
