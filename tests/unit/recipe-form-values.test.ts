import { describe, expect, it } from "vitest";
import {
  appendServingsToNote,
  formValuesFromRecipe,
  ingredientRowsFromRecipe,
  isRecipeFormDirty,
  type RecipeFormValues,
  toSubmittedIngredients,
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

describe("ingredientRowsFromRecipe", () => {
  it("新規作成は行なし", () => {
    expect(ingredientRowsFromRecipe()).toEqual([]);
  });

  it("保存済みの材料は id を key にして、分量の null を空文字にする", () => {
    const recipe = makeRecipe({
      ingredients: [
        {
          id: "00000000-0000-4000-8000-000000000011",
          name: "玉ねぎ",
          quantity: null,
          sortOrder: 0,
          taskId: null,
        },
      ],
    });
    expect(ingredientRowsFromRecipe(recipe)).toEqual([
      {
        key: "00000000-0000-4000-8000-000000000011",
        id: "00000000-0000-4000-8000-000000000011",
        name: "玉ねぎ",
        quantity: "",
      },
    ]);
  });
});

describe("toSubmittedIngredients", () => {
  it("前後の空白を落とし、key は送らない", () => {
    expect(
      toSubmittedIngredients([
        { key: "k1", id: "i1", name: " 玉ねぎ ", quantity: " 2個 " },
        { key: "k2", name: "にんじん", quantity: "" },
      ]),
    ).toEqual([
      { id: "i1", name: "玉ねぎ", quantity: "2個" },
      { id: undefined, name: "にんじん", quantity: "" },
    ]);
  });

  it("材料名が空の行は分量があっても送らない", () => {
    expect(
      toSubmittedIngredients([
        { key: "k1", name: "  ", quantity: "2個" },
        { key: "k2", name: "", quantity: "" },
      ]),
    ).toEqual([]);
  });
});

describe("appendServingsToNote", () => {
  it("メモが空（空白だけ）なら人数分だけを入れる", () => {
    expect(appendServingsToNote("", "2人分")).toBe("2人分");
    expect(appendServingsToNote("  ", "2人分")).toBe("2人分");
  });

  it("メモがあれば改行して末尾に足す", () => {
    expect(appendServingsToNote("辛口で作る", "2人分")).toBe(
      "辛口で作る\n2人分",
    );
  });
});
