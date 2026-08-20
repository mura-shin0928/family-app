import { afterEach, describe, expect, it, vi } from "vitest";
import { extractRecipeFromImage } from "@/features/recipes/extraction/gemini";
import { buildImageRequestBody } from "@/features/recipes/extraction/protocol";

function envelope(outputText: unknown) {
  return { output_text: JSON.stringify(outputText) };
}

describe("buildImageRequestBody", () => {
  it("sends text+image parts as the input array", () => {
    const body = buildImageRequestBody([
      { data: "QkFTRTY0", mimeType: "image/jpeg" },
    ]);
    expect(Array.isArray(body.input)).toBe(true);
    expect(body.input).toHaveLength(2);
    expect(body.input[0]).toEqual({
      type: "text",
      text: expect.any(String),
    });
    expect(body.input[1]).toEqual({
      type: "image",
      data: "QkFTRTY0",
      mime_type: "image/jpeg",
    });
  });

  it("carries multiple images in order", () => {
    const body = buildImageRequestBody([
      { data: "aW1hZ2Ux", mimeType: "image/jpeg" },
      { data: "aW1hZ2Uy", mimeType: "image/png" },
    ]);
    expect(body.input).toHaveLength(3);
    expect(body.input[1]).toMatchObject({ mime_type: "image/jpeg" });
    expect(body.input[2]).toMatchObject({ mime_type: "image/png" });
  });

  it("defaults to GEMINI_MODEL but accepts a model override", () => {
    const images = [{ data: "QkFTRTY0", mimeType: "image/jpeg" }];
    expect(buildImageRequestBody(images).model).toBe("gemini-3.7-flash");
    expect(buildImageRequestBody(images, "gemini-3.5-flash-lite").model).toBe(
      "gemini-3.5-flash-lite",
    );
  });

  it("requests structured JSON output and stateless mode, matching the text path's schema", () => {
    const body = buildImageRequestBody([
      { data: "QkFTRTY0", mimeType: "image/jpeg" },
    ]);
    expect(body.store).toBe(false);
    expect(body.response_format.type).toBe("text");
    expect(body.response_format.mime_type).toBe("application/json");
    expect(body.response_format.schema.required).toEqual([
      "title",
      "servings",
      "ingredients",
    ]);
  });

  it("uses an image-specific system instruction that warns against unrelated info", () => {
    const body = buildImageRequestBody([
      { data: "QkFTRTY0", mimeType: "image/jpeg" },
    ]);
    expect(typeof body.system_instruction).toBe("string");
    expect(body.system_instruction).not.toBe("");
    expect(body.system_instruction).toContain("画像");
  });
});

describe("extractRecipeFromImage", () => {
  const originalApiKey = process.env.GEMINI_API_KEY;
  const sampleImages = [
    { data: "QkFTRTY0SU1BR0VCWVRFUw==", mimeType: "image/jpeg" },
  ];

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

    const result = await extractRecipeFromImage(sampleImages);

    expect(result).toEqual({ kind: "failed", reason: "no-key" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a draft on success, reusing the same parseOutput as the text path", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve(
            envelope({
              title: "鶏の照り焼き",
              servings: "2人分",
              ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
            }),
          ),
      }),
    );

    const result = await extractRecipeFromImage(sampleImages);

    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        servings: "2人分",
        ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
      },
    });
  });

  it("parses the steps[].model_output response shape (thinking_level response), same as text", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "completed",
            steps: [
              { type: "thought", signature: "opaque" },
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
          }),
      }),
    );

    const result = await extractRecipeFromImage(sampleImages);

    expect(result).toEqual({
      kind: "draft",
      draft: {
        title: "鶏の照り焼き",
        servings: "",
        ingredients: [{ name: "鶏もも肉", quantity: "300g" }],
      },
    });
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

    const result = await extractRecipeFromImage(sampleImages);

    expect(result.kind).toBe("draft");
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

    const result = await extractRecipeFromImage(sampleImages);

    expect(result).toEqual({ kind: "failed", reason: "api-error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

    const result = await extractRecipeFromImage(sampleImages);

    expect(result).toEqual({ kind: "failed", reason: "timeout" });
  });

  it("does not call fetch at all once the shared deadline has already passed", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await extractRecipeFromImage(sampleImages, {
      deadlineAt: Date.now() - 1,
    });

    expect(result).toEqual({ kind: "failed", reason: "timeout" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never leaks the input image bytes into a failure result", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );

    const result = await extractRecipeFromImage(sampleImages);

    expect(JSON.stringify(result)).not.toContain(sampleImages[0]?.data);
  });
});
