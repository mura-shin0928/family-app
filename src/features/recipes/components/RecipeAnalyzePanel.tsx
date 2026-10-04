"use client";

import AssistantIcon from "@mui/icons-material/Assistant";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { analyzeRecipeImage, analyzeRecipeSource } from "../actions";
import {
  type AnalyzeMessage,
  IMAGE_TOO_LARGE_MESSAGE,
  IMAGE_UNSUPPORTED_MESSAGE,
  imageAnalyzedMessage,
  recipeImageFileName,
  sourceAnalyzedMessage,
} from "../analyze-messages";
import type { RecipeDraft } from "../extraction/types";
import { compressImage } from "../image/compress";

/**
 * 「レシピの簡単読み取り」。URL・テキストか画像を解析し、読み取れた下書きを
 * onDraft で返す。フォームへの反映は親が行う。貼り付けテキストは保存対象
 * なので親が持つ。
 */
export function RecipeAnalyzePanel({
  sourceText,
  onSourceTextChange,
  onDraft,
  onDetectedUrl,
}: {
  sourceText: string;
  onSourceTextChange: (value: string) => void;
  // source は、貼り付けテキストが URL だったときだけ渡る。
  onDraft: (
    draft: RecipeDraft,
    source?: { url: string; imageUrl: string | null },
  ) => void;
  // 解析には失敗したが、貼り付けテキストから URL だけは見つかったとき。
  onDetectedUrl: (url: string) => void;
}) {
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [isAnalyzingImage, startImageTransition] = useTransition();
  // URL・テキストと画像は同時に表示せず切り替える（縦に伸ばさないため）。
  const [inputMode, setInputMode] = useState<"text" | "image">("text");
  const [analyzeMessage, setAnalyzeMessage] = useState<AnalyzeMessage | null>(
    null,
  );
  // 解析に失敗したときだけ保持し、「もう一度解析」で選び直しなしに再送する。
  const [pendingImage, setPendingImage] = useState<{
    blob: Blob;
    mimeType: string;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleAnalyze() {
    const trimmedText = sourceText.trim();
    if (!trimmedText) return;

    setAnalyzeMessage(null);
    startAnalyzeTransition(async () => {
      const result = await analyzeRecipeSource({ text: trimmedText });

      if (!result.ok) {
        if (result.detectedUrl) {
          onDetectedUrl(result.detectedUrl);
        }
        setAnalyzeMessage({ severity: "warning", text: result.error });
        return;
      }

      onDraft(
        result.draft,
        result.sourceUrl
          ? { url: result.sourceUrl, imageUrl: result.imageUrl ?? null }
          : undefined,
      );
      setAnalyzeMessage(
        sourceAnalyzedMessage(
          result.via,
          !!result.sourceUrl,
          result.draft.ingredients.length,
        ),
      );
    });
  }

  async function runImageAnalysis(blob: Blob, mimeType: string) {
    const formData = new FormData();
    formData.append("images", blob, recipeImageFileName(mimeType));

    const result = await analyzeRecipeImage(formData);

    if (!result.ok) {
      setAnalyzeMessage({ severity: "warning", text: result.error });
      return;
    }

    onDraft(result.draft);
    setPendingImage(null);
    setAnalyzeMessage(imageAnalyzedMessage(result.draft.ingredients.length));
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
        setAnalyzeMessage(IMAGE_UNSUPPORTED_MESSAGE);
        return;
      }
      if (compressed.kind === "too-large") {
        setAnalyzeMessage(IMAGE_TOO_LARGE_MESSAGE);
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

  return (
    <Box component="section">
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <AssistantIcon color="primary" fontSize="small" />
        <Typography variant="subtitle1" component="h2">
          レシピの簡単読み取り
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
            onChange={(event) => onSourceTextChange(event.target.value)}
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
                <AutoAwesomeIcon fontSize="small" />
              )
            }
            sx={{ alignSelf: "flex-start" }}
          >
            画像選択・読み取り
          </Button>
          <Typography variant="caption" color="textSecondary">
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
  );
}
