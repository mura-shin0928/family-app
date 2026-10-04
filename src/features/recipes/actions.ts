"use server";

import { requireFamilyMember } from "@/features/auth/guard";
import { createClient } from "@/lib/supabase/server";
import { isSnsHost, urlOnly } from "./extraction/detect";
import { fetchHtml } from "./extraction/fetch-html";
import {
  extractRecipeFromImage,
  extractRecipeFromText,
} from "./extraction/gemini";
import { extractRecipeFromJsonLd } from "./extraction/jsonld";
import { MAX_NAME_LENGTH } from "./extraction/normalize";
import { extractReadable } from "./extraction/readable";
import type { RecipeDraft } from "./extraction/types";
import {
  addIngredientsToPurchasesSchema,
  analyzeRecipeSourceSchema,
  createRecipeSchema,
  IMAGE_HARD_LIMIT_BYTES,
  MAX_RECIPE_IMAGES,
  recipeIdSchema,
  SUPPORTED_IMAGE_MIME_TYPES,
  undoAddIngredientsToPurchasesSchema,
  updateRecipeSchema,
} from "./schema";

// URL/画像どちらの経路もページのmaxDurationは60秒（new/page.tsx, [id]/edit/page.tsx）。
// URL経路のfetchとGeminiで共有する予算。
const ANALYZE_DEADLINE_MS = 50_000;
// 画像は入力トークンが多くテキストより レイテンシが伸びる想定のため、
// テキスト経路と同じ予算を取る。
const IMAGE_ANALYZE_DEADLINE_MS = 50_000;

export type ActionResult = { ok: true } | { ok: false; error: string };

type IngredientInput = {
  id?: string;
  name: string;
  quantity: string;
};

export async function createRecipe(input: {
  id: string;
  title: string;
  sourceUrl: string;
  sourceText: string;
  note: string;
  ingredients: IngredientInput[];
}): Promise<ActionResult> {
  const parsed = createRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase.rpc("create_recipe", {
    p_id: parsed.data.id,
    p_title: parsed.data.title,
    p_source_url: parsed.data.sourceUrl,
    p_source_text: parsed.data.sourceText,
    p_note: parsed.data.note,
    p_ingredients: parsed.data.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
    })),
  });

  if (error) {
    return { ok: false, error: "登録に失敗しました" };
  }

  return { ok: true };
}

export async function updateRecipe(input: {
  recipeId: string;
  title: string;
  sourceUrl: string;
  sourceText: string;
  note: string;
  ingredients: IngredientInput[];
}): Promise<ActionResult> {
  const parsed = updateRecipeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_recipe", {
    p_recipe_id: parsed.data.recipeId,
    p_title: parsed.data.title,
    p_source_url: parsed.data.sourceUrl,
    p_source_text: parsed.data.sourceText,
    p_note: parsed.data.note,
    p_ingredients: parsed.data.ingredients.map((ingredient) => ({
      ...(ingredient.id ? { id: ingredient.id } : {}),
      name: ingredient.name,
      quantity: ingredient.quantity,
    })),
  });

  if (error) {
    return { ok: false, error: "更新に失敗しました" };
  }

  return { ok: true };
}

export async function deleteRecipe(input: {
  recipeId: string;
}): Promise<ActionResult> {
  const parsed = recipeIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  const { member } = await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", parsed.data.recipeId)
    .eq("family_id", member.familyId);

  if (error) {
    return { ok: false, error: "削除に失敗しました" };
  }

  return { ok: true };
}

export type AddIngredientsToPurchasesResult =
  | { ok: true; taskIds: string[] }
  | { ok: false; error: string };

export async function addIngredientsToPurchases(input: {
  recipeId: string;
  ingredientIds: string[];
}): Promise<AddIngredientsToPurchasesResult> {
  const parsed = addIngredientsToPurchasesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { data: taskIds, error } = await supabase.rpc(
    "add_ingredients_to_purchases",
    {
      p_recipe_id: parsed.data.recipeId,
      p_ingredient_ids: parsed.data.ingredientIds,
    },
  );

  if (error) {
    return { ok: false, error: "買うものへの追加に失敗しました" };
  }

  return { ok: true, taskIds };
}

export async function undoAddIngredientsToPurchases(input: {
  taskIds: string[];
}): Promise<ActionResult> {
  const parsed = undoAddIngredientsToPurchasesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "不正な操作です" };
  }

  await requireFamilyMember();
  const supabase = await createClient();

  const { error } = await supabase.rpc("undo_add_ingredients_to_purchases", {
    p_task_ids: parsed.data.taskIds,
  });

  if (error) {
    return { ok: false, error: "取り消しに失敗しました" };
  }

  return { ok: true };
}

export type AnalyzeRecipeSourceResult =
  | {
      ok: true;
      draft: RecipeDraft;
      sourceUrl?: string;
      via: "jsonld" | "gemini";
    }
  | { ok: false; error: string; detectedUrl?: string };

const FAILURE_MESSAGES: Record<string, string> = {
  "no-key": "解析機能は現在利用できません。手入力で保存してください。",
  timeout:
    "解析がタイムアウトしました。時間をおいて試すか、手入力で保存してください。",
  "api-error":
    "解析に失敗しました。時間をおいて試すか、手入力で保存してください。",
  "invalid-response":
    "解析結果を読み取れませんでした。手入力で保存してください。",
};

const URL_UNREADABLE_ERROR =
  "ページを読み取れませんでした。本文をコピーして貼り付けてください。";
const PASTE_ONLY_ERROR =
  "URLだけでは材料を読み取れません。本文をコピーして貼り付けてください。";

export async function analyzeRecipeSource(input: {
  text: string;
}): Promise<AnalyzeRecipeSourceResult> {
  const parsed = analyzeRecipeSourceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "入力内容を確認してください",
    };
  }

  await requireFamilyMember();

  const detectedUrl = urlOnly(parsed.data.text);

  if (!detectedUrl) {
    const result = await extractRecipeFromText(parsed.data.text);
    if (result.kind === "failed") {
      return {
        ok: false,
        error:
          FAILURE_MESSAGES[result.reason] ??
          "解析に失敗しました。手入力で保存してください。",
      };
    }
    return { ok: true, draft: result.draft, via: "gemini" };
  }

  if (isSnsHost(detectedUrl)) {
    return { ok: false, error: PASTE_ONLY_ERROR, detectedUrl };
  }

  const deadlineAt = Date.now() + ANALYZE_DEADLINE_MS;
  const fetched = await fetchHtml(detectedUrl, { deadlineAt });
  if (!fetched.ok) {
    return { ok: false, error: URL_UNREADABLE_ERROR, detectedUrl };
  }

  const jsonLdDraft = extractRecipeFromJsonLd(fetched.html);
  if (jsonLdDraft) {
    return {
      ok: true,
      draft: jsonLdDraft,
      sourceUrl: detectedUrl,
      via: "jsonld",
    };
  }

  const { title: pageTitle, text: pageText } = extractReadable(fetched.html);
  if (pageText === "") {
    return { ok: false, error: URL_UNREADABLE_ERROR, detectedUrl };
  }

  const result = await extractRecipeFromText(pageText, { deadlineAt });
  if (result.kind === "failed") {
    return {
      ok: false,
      error:
        FAILURE_MESSAGES[result.reason] ??
        "解析に失敗しました。手入力で保存してください。",
      detectedUrl,
    };
  }

  // ページの og:title はGeminiの推測titleより素性が確かなので優先する。
  const draft =
    pageTitle !== ""
      ? { ...result.draft, title: pageTitle.slice(0, MAX_NAME_LENGTH) }
      : result.draft;

  return { ok: true, draft, sourceUrl: detectedUrl, via: "gemini" };
}

export type AnalyzeRecipeImageResult =
  | { ok: true; draft: RecipeDraft; via: "gemini-image" }
  | { ok: false; error: string };

const IMAGE_UNSUPPORTED_FORMAT_ERROR =
  "この画像の形式には対応していません。JPEG・PNG・HEIC等の画像を選んでください。";
const IMAGE_TOO_LARGE_ERROR =
  "画像が大きすぎます。撮り直すか、手入力で保存してください。";
const IMAGE_MISSING_ERROR = "画像を選択してください";
const IMAGE_TOO_MANY_ERROR = "画像は1枚だけ選択してください";

// クライアント側で圧縮済みの画像1枚をGeminiへ送りRecipeDraftへ変換する。
// クライアント側の圧縮結果は改ざん可能なため、形式・サイズをここでも再検証する。
// 画像そのものはこの呼び出しの中でのみ扱い、DBやログへは一切書き込まない。
export async function analyzeRecipeImage(
  formData: FormData,
): Promise<AnalyzeRecipeImageResult> {
  await requireFamilyMember();

  const files = formData
    .getAll("images")
    .filter((value): value is File => value instanceof File);

  if (files.length === 0) {
    return { ok: false, error: IMAGE_MISSING_ERROR };
  }
  if (files.length > MAX_RECIPE_IMAGES) {
    return { ok: false, error: IMAGE_TOO_MANY_ERROR };
  }

  const file = files[0];

  if (
    !SUPPORTED_IMAGE_MIME_TYPES.includes(
      file.type as (typeof SUPPORTED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return { ok: false, error: IMAGE_UNSUPPORTED_FORMAT_ERROR };
  }

  if (file.size > IMAGE_HARD_LIMIT_BYTES) {
    return { ok: false, error: IMAGE_TOO_LARGE_ERROR };
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const deadlineAt = Date.now() + IMAGE_ANALYZE_DEADLINE_MS;
  const result = await extractRecipeFromImage(
    [{ data: base64, mimeType: file.type }],
    { deadlineAt },
  );

  if (result.kind === "failed") {
    return {
      ok: false,
      error:
        FAILURE_MESSAGES[result.reason] ??
        "解析に失敗しました。手入力で保存してください。",
    };
  }

  return { ok: true, draft: result.draft, via: "gemini-image" };
}
