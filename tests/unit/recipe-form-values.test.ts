import { describe, expect, it } from "vitest";
import {
  formValuesFromRecipe,
  isRecipeFormDirty,
  type RecipeFormValues,
} from "@/features/recipes/form-values";
import type { RecipeDetailDTO } from "@/features/recipes/types";

function makeRecipe(overrides: Partial<RecipeDetailDTO> = {}): RecipeDetailDTO {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    title: "カレー",
    sourceUrl: null,
    sourceText: null,
    note: null,
    createdAt: "2026-10-01T00:00:00Z",
    ingredients: [
      {
        id: "00000000-0000-4000-8000-000000000011",
        name: "玉ねぎ",
        quantity: "2個",
        sortOrder: 0,
        taskId: null,
      },
    ],
    ...overrides,
  };
}

describe("formValuesFromRecipe", () => {
  it("新規作成は空のフォーム", () => {
    expect(formValuesFromRecipe()).toEqual({
      title: "",
      sourceUrl: "",
      sourceText: "",
      note: "",
      ingredients: [],
    });
  });

  it("null の項目を空文字にする", () => {
    expect(
      formValuesFromRecipe(
        makeRecipe({
          ingredients: [
            {
              id: "00000000-0000-4000-8000-000000000011",
              name: "塩",
              quantity: null,
              sortOrder: 0,
              taskId: null,
            },
          ],
        }),
      ),
    ).toEqual({
      title: "カレー",
      sourceUrl: "",
      sourceText: "",
      note: "",
      ingredients: [{ name: "塩", quantity: "" }],
    });
  });
});

describe("isRecipeFormDirty", () => {
  const original = formValuesFromRecipe(makeRecipe());

  function withChange(fields: Partial<RecipeFormValues>): RecipeFormValues {
    return { ...original, ...fields };
  }

  it("開いたままなら変更なし", () => {
    expect(isRecipeFormDirty(original, original)).toBe(false);
  });

  it("前後の空白だけの違いは変更なし", () => {
    expect(isRecipeFormDirty(original, withChange({ title: " カレー " }))).toBe(
      false,
    );
  });

  it("タイトル・URL・テキスト・メモの変更を検出する", () => {
    expect(isRecipeFormDirty(original, withChange({ title: "シチュー" }))).toBe(
      true,
    );
    expect(
      isRecipeFormDirty(original, withChange({ sourceUrl: "https://a.jp" })),
    ).toBe(true);
    expect(isRecipeFormDirty(original, withChange({ sourceText: "x" }))).toBe(
      true,
    );
    expect(isRecipeFormDirty(original, withChange({ note: "2人分" }))).toBe(
      true,
    );
  });

  it("材料の追加・削除・書き換えを検出する", () => {
    expect(
      isRecipeFormDirty(
        original,
        withChange({
          ingredients: [
            ...original.ingredients,
            { name: "人参", quantity: "" },
          ],
        }),
      ),
    ).toBe(true);
    expect(isRecipeFormDirty(original, withChange({ ingredients: [] }))).toBe(
      true,
    );
    expect(
      isRecipeFormDirty(
        original,
        withChange({ ingredients: [{ name: "玉ねぎ", quantity: "3個" }] }),
      ),
    ).toBe(true);
  });

  it("空の材料行を足しただけなら変更なし", () => {
    expect(
      isRecipeFormDirty(
        original,
        withChange({
          ingredients: [...original.ingredients, { name: " ", quantity: "" }],
        }),
      ),
    ).toBe(false);
  });

  it("新規作成で何か入力すれば変更あり", () => {
    const empty = formValuesFromRecipe();
    expect(isRecipeFormDirty(empty, empty)).toBe(false);
    expect(isRecipeFormDirty(empty, { ...empty, title: "カレー" })).toBe(true);
  });
});
