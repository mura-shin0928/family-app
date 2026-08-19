"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { analyzeRecipeSource, createRecipe, updateRecipe } from "../actions";
import type { RecipeDetailDTO } from "../types";

type IngredientRow = {
  key: string;
  id?: string;
  name: string;
  quantity: string;
};

function toRows(recipe?: RecipeDetailDTO): IngredientRow[] {
  if (!recipe) return [];
  return recipe.ingredients.map((ingredient) => ({
    key: ingredient.id,
    id: ingredient.id,
    name: ingredient.name,
    quantity: ingredient.quantity ?? "",
  }));
}

export function RecipeEditor({
  mode,
  recipe,
}: {
  mode: "create" | "edit";
  recipe?: RecipeDetailDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl ?? "");
  const [sourceText, setSourceText] = useState(recipe?.sourceText ?? "");
  const [note, setNote] = useState(recipe?.note ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    toRows(recipe),
  );
  const [error, setError] = useState<string | null>(null);
  const [analyzeMessage, setAnalyzeMessage] = useState<{
    severity: "success" | "warning";
    text: string;
  } | null>(null);

  function addIngredientRow() {
    setIngredients((current) => [
      ...current,
      { key: crypto.randomUUID(), name: "", quantity: "" },
    ]);
  }

  function updateIngredientRow(
    key: string,
    field: "name" | "quantity",
    value: string,
  ) {
    setIngredients((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
  }

  function removeIngredientRow(key: string) {
    setIngredients((current) => current.filter((row) => row.key !== key));
  }

  function handleAnalyze() {
    const trimmedText = sourceText.trim();
    if (!trimmedText) return;

    setAnalyzeMessage(null);
    startAnalyzeTransition(async () => {
      const result = await analyzeRecipeSource({ text: trimmedText });

      if (!result.ok) {
        if (result.detectedUrl && !sourceUrl.trim()) {
          setSourceUrl(result.detectedUrl);
        }
        setAnalyzeMessage({ severity: "warning", text: result.error });
        return;
      }

      if (!title.trim() && result.draft.title) {
        setTitle(result.draft.title);
      }

      if (result.draft.ingredients.length > 0) {
        setIngredients((current) => [
          ...current,
          ...result.draft.ingredients.map((ingredient) => ({
            key: crypto.randomUUID(),
            name: ingredient.name,
            quantity: ingredient.quantity,
          })),
        ]);
      }

      if (result.sourceUrl) {
        // URLは専用フィールドに移したので、貼り付け欄に二重に残さない。
        setSourceUrl(result.sourceUrl);
        setSourceText("");
      }

      const via =
        result.via === "jsonld"
          ? "ページから"
          : result.sourceUrl
            ? "ページの本文をAIで読み取り"
            : "AIで読み取り";

      setAnalyzeMessage({
        severity: "success",
        text: `${via}${result.draft.ingredients.length}件の材料を読み取りました。内容を確認して保存してください。`,
      });
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("タイトルを入力してください");
      return;
    }

    const submittedIngredients = ingredients
      .map((row) => ({
        id: row.id,
        name: row.name.trim(),
        quantity: row.quantity.trim(),
      }))
      .filter((row) => row.name !== "");

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createRecipe({
              id: crypto.randomUUID(),
              title: trimmedTitle,
              sourceUrl: sourceUrl.trim(),
              sourceText: sourceText.trim(),
              note: note.trim(),
              ingredients: submittedIngredients,
            })
          : await updateRecipe({
              recipeId: recipe?.id ?? "",
              title: trimmedTitle,
              sourceUrl: sourceUrl.trim(),
              sourceText: sourceText.trim(),
              note: note.trim(),
              ingredients: submittedIngredients,
            });

      if (!result.ok) {
        setError(result.error);
        return;
      }

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
        pb: "calc(16px + 56px + env(safe-area-inset-bottom))",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Box component="section">
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          URL または 本文を貼り付け（任意）
        </Typography>
        <Stack spacing={1}>
          <TextField
            label="URL または 本文を貼り付け"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            multiline
            minRows={4}
            maxRows={4}
          />
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || sourceText.trim() === ""}
            startIcon={isAnalyzing ? <CircularProgress size={16} /> : undefined}
            sx={{ alignSelf: "flex-start" }}
          >
            レシピをAIで読み取る
          </Button>
          {analyzeMessage && (
            <Alert severity={analyzeMessage.severity}>
              {analyzeMessage.text}
            </Alert>
          )}
        </Stack>
      </Box>

      <Divider />

      <Stack spacing={1.5}>
        <TextField
          label="タイトル"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          autoFocus
        />
        <TextField
          label="元のURL（任意）"
          type="url"
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
        />
        <TextField
          label="メモ（任意）"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={2}
        />
      </Stack>

      <Box component="section">
        <Stack spacing={1.5}>
          {ingredients.map((row) => (
            <Stack
              key={row.key}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <TextField
                label="材料名"
                value={row.name}
                onChange={(event) =>
                  updateIngredientRow(row.key, "name", event.target.value)
                }
                sx={{ flex: 1, minWidth: 0 }}
              />
              <TextField
                label="分量"
                value={row.quantity}
                onChange={(event) =>
                  updateIngredientRow(row.key, "quantity", event.target.value)
                }
                sx={{ width: 104, flexShrink: 0 }}
              />
              <IconButton
                onClick={() => removeIngredientRow(row.key)}
                aria-label="材料を削除"
                sx={{ color: "text.disabled", flexShrink: 0 }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
        <Button onClick={addIngredientRow} sx={{ mt: 1.5 }}>
          材料を追加
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Button type="submit" variant="contained" disabled={isPending}>
        {mode === "create" ? "登録する" : "保存する"}
      </Button>
    </Stack>
  );
}
