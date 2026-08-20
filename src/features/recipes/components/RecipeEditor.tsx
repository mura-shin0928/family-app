"use client";

import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import { alpha } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  analyzeRecipeImage,
  analyzeRecipeSource,
  createRecipe,
  updateRecipe,
} from "../actions";
import type { RecipeDraft } from "../extraction/types";
import { compressImage } from "../image/compress";
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
  const [isAnalyzingImage, startImageTransition] = useTransition();
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl ?? "");
  const [sourceText, setSourceText] = useState(recipe?.sourceText ?? "");
  const [note, setNote] = useState(recipe?.note ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    toRows(recipe),
  );
  const [error, setError] = useState<string | null>(null);
  // URL・テキストと画像は同時に表示せず切り替える（縦に伸ばさないため）。
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
  const [analyzeMessage, setAnalyzeMessage] = useState<{
    severity: "success" | "warning";
    text: string;
  } | null>(null);
  // 解析に失敗したときだけ保持し、「もう一度解析」で選び直しなしに再送する。
  // 保存後は不要になるため、handleSubmit成功時に破棄する。
  const [pendingImage, setPendingImage] = useState<{
    blob: Blob;
    mimeType: string;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  // URL/テキスト解析・画像解析の両方から呼ぶ、フォームへのdraft反映処理だけを
  // 切り出したもの。成功/失敗メッセージの組み立ては呼び出し元ごとに異なる
  // （画像解析だけ材料0件をwarning扱いにする等）ため、ここには含めない。
  function addDraftToForm(draft: RecipeDraft, sourceUrlFromDraft?: string) {
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
      setNote((current) =>
        current.trim() === ""
          ? draft.servings
          : `${current}\n${draft.servings}`,
      );
    }

    if (sourceUrlFromDraft) {
      // URLは専用フィールドに移したので、貼り付け欄に二重に残さない。
      setSourceUrl(sourceUrlFromDraft);
      setSourceText("");
    }
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

      addDraftToForm(result.draft, result.sourceUrl);

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

  async function runImageAnalysis(blob: Blob, mimeType: string) {
    const formData = new FormData();
    const extension =
      mimeType === "image/jpeg" ? "jpg" : (mimeType.split("/")[1] ?? "bin");
    formData.append("images", blob, `recipe.${extension}`);

    const result = await analyzeRecipeImage(formData);

    if (!result.ok) {
      setAnalyzeMessage({ severity: "warning", text: result.error });
      return;
    }

    addDraftToForm(result.draft);
    setPendingImage(null);

    if (result.draft.ingredients.length === 0) {
      setAnalyzeMessage({
        severity: "warning",
        text: "画像から材料を読み取れませんでした。材料は手入力で追加してください。",
      });
      return;
    }

    setAnalyzeMessage({
      severity: "success",
      text: `画像から${result.draft.ingredients.length}件の材料を読み取りました。内容を確認して保存してください。`,
    });
  }

  function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // 同じファイルを選び直せるようにする（inputはchangeイベントが2回目以降
    // 発火しないため、値を毎回リセットする）。
    event.target.value = "";
    if (!file) return;

    setAnalyzeMessage(null);
    setPendingImage(null);
    startImageTransition(async () => {
      const compressed = await compressImage(file);

      if (compressed.kind === "unsupported") {
        setAnalyzeMessage({
          severity: "warning",
          text: "この画像は読み取れませんでした。スクリーンショットを撮り直すか、タイトル・材料を手入力してください。",
        });
        return;
      }
      if (compressed.kind === "too-large") {
        setAnalyzeMessage({
          severity: "warning",
          text: "画像が大きすぎます。撮り直すか、手入力で保存してください。",
        });
        return;
      }

      setPendingImage({ blob: compressed.blob, mimeType: compressed.mimeType });
      await runImageAnalysis(compressed.blob, compressed.mimeType);
    });
  }

  function handleRetryImageAnalysis() {
    if (!pendingImage) return;
    setAnalyzeMessage(null);
    startImageTransition(() =>
      runImageAnalysis(pendingImage.blob, pendingImage.mimeType),
    );
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

      setPendingImage(null);
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
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.25,
            py: 0.5,
            mb: 0.5,
            borderRadius: 999,
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
          }}
        >
          <AutoAwesomeIcon color="primary" fontSize="small" />
          <Typography
            variant="subtitle1"
            color="primary"
            sx={{ fontWeight: 700 }}
          >
            レシピのAI読み取り
          </Typography>
        </Box>
        <RadioGroup
          row
          value={inputMode}
          onChange={(event) => {
            setInputMode(event.target.value as "text" | "image");
            setAnalyzeMessage(null);
          }}
          sx={{ mb: 1 }}
        >
          <FormControlLabel
            value="text"
            control={<Radio size="small" />}
            label="URL・テキスト"
          />
          <FormControlLabel
            value="image"
            control={<Radio size="small" />}
            label="画像"
          />
        </RadioGroup>

        {/* modeに関わらず常時マウントしておき、ラジオボタン切り替えでもrefが
            外れないようにする（hiddenなので表示には影響しない）。 */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleImagePick}
        />

        {inputMode === "text" ? (
          <Stack spacing={1}>
            <TextField
              label="URL または テキストを貼り付け"
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              multiline
              minRows={4}
              maxRows={4}
            />
            <Button
              variant="outlined"
              size="small"
              onClick={handleAnalyze}
              disabled={isAnalyzing || sourceText.trim() === ""}
              startIcon={
                isAnalyzing ? (
                  <CircularProgress size={14} />
                ) : (
                  <AutoAwesomeIcon fontSize="small" />
                )
              }
              sx={{ alignSelf: "flex-start" }}
            >
              読み取り
            </Button>
          </Stack>
        ) : (
          <Stack spacing={1}>
            <Button
              variant="outlined"
              onClick={() => imageInputRef.current?.click()}
              disabled={isAnalyzingImage}
              startIcon={
                isAnalyzingImage ? (
                  <CircularProgress size={16} />
                ) : (
                  <AddPhotoAlternateOutlinedIcon fontSize="small" />
                )
              }
              sx={{ alignSelf: "flex-start" }}
            >
              選択・読み取り
            </Button>
            <Typography variant="caption" color="text.secondary">
              画像はGoogle Gemini
              APIへ送信して解析します。なお、画像は保存されません。
            </Typography>
          </Stack>
        )}

        {analyzeMessage && (
          <Alert
            severity={analyzeMessage.severity}
            sx={{ mt: 1.5 }}
            action={
              pendingImage && analyzeMessage.severity === "warning" ? (
                <Button
                  color="inherit"
                  size="small"
                  onClick={handleRetryImageAnalysis}
                  disabled={isAnalyzingImage}
                >
                  もう一度解析
                </Button>
              ) : undefined
            }
          >
            {analyzeMessage.text}
          </Alert>
        )}
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
