"use client";

import NotesIcon from "@mui/icons-material/Notes";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import { createRecipe, updateRecipe } from "../actions";
import type { RecipeDraft } from "../extraction/types";
import {
  appendServingsToNote,
  formValuesFromRecipe,
  type IngredientRow,
  ingredientRowsFromRecipe,
  isRecipeFormDirty,
  type RecipeImage,
  recipeImageFromRecipe,
  toSubmittedImageUrl,
  toSubmittedIngredients,
} from "../form-values";
import { RECIPES_QUERY_KEY, type RecipeDetailDTO } from "../types";
import { IngredientRowsEditor } from "./IngredientRowsEditor";
import { RecipeAnalyzePanel } from "./RecipeAnalyzePanel";
import { useLeaveConfirm } from "./useLeaveConfirm";

export function RecipeEditor({
  mode,
  recipe,
}: {
  mode: "create" | "edit";
  recipe?: RecipeDetailDTO;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl ?? "");
  const [image, setImage] = useState<RecipeImage | null>(() =>
    recipeImageFromRecipe(recipe),
  );
  const [sourceText, setSourceText] = useState(recipe?.sourceText ?? "");
  const [note, setNote] = useState(recipe?.note ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    ingredientRowsFromRecipe(recipe),
  );
  const [error, setError] = useState<string | null>(null);
  const [originalValues] = useState(() => formValuesFromRecipe(recipe));
  const leaveConfirm = useLeaveConfirm(
    isRecipeFormDirty(originalValues, {
      title,
      sourceUrl,
      sourceText,
      note,
      ingredients,
    }),
  );

  // 読み取った下書きをフォームに足す。入力済みのタイトルは上書きせず、
  // 材料は末尾に追加する。
  function addDraftToForm(
    draft: RecipeDraft,
    source?: { url: string; imageUrl: string | null },
  ) {
    if (!title.trim() && draft.title) {
      setTitle(draft.title);
    }

    if (draft.ingredients.length > 0) {
      setIngredients((current) => [
        ...current,
        ...draft.ingredients.map((ingredient) => ({
          key: crypto.randomUUID(),
          name: ingredient.name,
          quantity: ingredient.quantity,
        })),
      ]);
    }

    if (draft.servings && !note.includes(draft.servings)) {
      setNote((current) => appendServingsToNote(current, draft.servings));
    }

    if (source) {
      // URLは専用フィールドに移したので、貼り付け欄に二重に残さない。
      setSourceUrl(source.url);
      setSourceText("");
      setImage(
        source.imageUrl
          ? { url: source.imageUrl, sourceUrl: source.url }
          : null,
      );
    }
  }

  function fillSourceUrlIfEmpty(url: string) {
    if (!sourceUrl.trim()) {
      setSourceUrl(url);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("タイトルを入力してください");
      return;
    }

    const submittedIngredients = toSubmittedIngredients(ingredients);
    const submittedImageUrl = toSubmittedImageUrl(image, sourceUrl);

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRecipe({
              id: crypto.randomUUID(),
              title: trimmedTitle,
              sourceUrl: sourceUrl.trim(),
              imageUrl: submittedImageUrl,
              sourceText: sourceText.trim(),
              note: note.trim(),
              ingredients: submittedIngredients,
            })
          : await updateRecipe({
              recipeId: recipe?.id ?? "",
              title: trimmedTitle,
              sourceUrl: sourceUrl.trim(),
              imageUrl: submittedImageUrl,
              sourceText: sourceText.trim(),
              note: note.trim(),
              ingredients: submittedIngredients,
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      // Server Action + router.pushでの遷移はTanStack Queryのキャッシュに
      // 関知しないため、遷移先が古いキャッシュ（staleTime内）を表示し続け
      // ないよう明示的に無効化する。["recipes"]は一覧・詳細どちらの
      // queryKeyもprefixとして含むため、1回でまとめて無効化できる。
      queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      router.push(
        mode === "create" ? "/recipes" : `/recipes/${recipe?.id ?? ""}`,
      );
    });
  }

  return (
    <Stack
      component="form"
      onSubmit={handleSubmit}
      spacing={3}
      sx={{
        width: "100%",
        p: 2,
        pb: BOTTOM_NAV_CLEARANCE,
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <RecipeAnalyzePanel
        sourceText={sourceText}
        onSourceTextChange={setSourceText}
        onDraft={addDraftToForm}
        onDetectedUrl={fillSourceUrlIfEmpty}
      />

      <Divider />

      <Box component="section">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <NotesIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" component="h2">
            レシピ詳細
          </Typography>
        </Box>
        <Stack spacing={1.5}>
          <TextField
            label="タイトル"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <TextField
            label="元のURL"
            type="url"
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
          <TextField
            label="メモ"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            multiline
            minRows={2}
          />
        </Stack>
      </Box>

      <IngredientRowsEditor rows={ingredients} setRows={setIngredients} />

      {error && <Alert severity="error">{error}</Alert>}

      <Button type="submit" variant="contained" disabled={isPending}>
        {mode === "create" ? "登録する" : "保存する"}
      </Button>

      <Dialog open={leaveConfirm.confirmOpen} onClose={leaveConfirm.stay}>
        <DialogTitle>変更を破棄しますか？</DialogTitle>
        <DialogActions>
          <Button onClick={leaveConfirm.stay}>編集に戻る</Button>
          <Button color="error" onClick={leaveConfirm.leave}>
            破棄
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
