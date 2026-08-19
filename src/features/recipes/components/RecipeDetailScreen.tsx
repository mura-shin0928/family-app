"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LinkIcon from "@mui/icons-material/Link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { TASKS_QUERY_KEY } from "@/features/tasks/types";
import {
  addIngredientsToPurchases,
  deleteRecipe,
  undoAddIngredientsToPurchases,
} from "../actions";
import { fetchRecipe } from "../query-actions";
import type { RecipeDetailDTO } from "../types";
import { recipeDetailQueryKey } from "../types";

export function RecipeDetailScreen({
  initialRecipe,
}: {
  initialRecipe: RecipeDetailDTO;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedOverride, setCheckedOverride] = useState<
    Record<string, boolean>
  >({});
  const [toast, setToast] = useState<{
    message: string;
    taskIds: string[];
  } | null>(null);

  const { data: recipe = initialRecipe } = useQuery({
    queryKey: recipeDetailQueryKey(initialRecipe.id),
    queryFn: () => fetchRecipe(initialRecipe.id),
    initialData: initialRecipe,
  });

  const addMutation = useMutation({
    mutationFn: addIngredientsToPurchases,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCheckedOverride({});
      queryClient.invalidateQueries({
        queryKey: recipeDetailQueryKey(initialRecipe.id),
      });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
      setToast({
        message: `${result.taskIds.length}件を買うものに追加しました`,
        taskIds: result.taskIds,
      });
    },
    onError: () => {
      setError("通信に失敗しました");
    },
  });

  const undoMutation = useMutation({
    mutationFn: undoAddIngredientsToPurchases,
    onSuccess: (result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      queryClient.invalidateQueries({
        queryKey: recipeDetailQueryKey(initialRecipe.id),
      });
      queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY });
    },
    onError: () => {
      setError("通信に失敗しました");
    },
  });

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteRecipe({ recipeId: initialRecipe.id });
      setConfirmDelete(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/recipes");
    });
  }

  const selectedIngredientIds = (recipe?.ingredients ?? [])
    .filter(
      (ingredient) =>
        checkedOverride[ingredient.id] ?? !ingredient.isInPurchases,
    )
    .map((ingredient) => ingredient.id);

  function handleAddToPurchases() {
    setError(null);
    addMutation.mutate({
      recipeId: initialRecipe.id,
      ingredientIds: selectedIngredientIds,
    });
  }

  return (
    <Stack
      spacing={3}
      sx={{
        width: "100%",
        p: 2,
        pb: "calc(16px + 56px + env(safe-area-inset-bottom))",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Stack direction="row" spacing={1}>
        <Button
          component={Link}
          href={`/recipes/${initialRecipe.id}/edit`}
          size="small"
          startIcon={<EditOutlinedIcon fontSize="small" />}
        >
          編集
        </Button>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          onClick={() => setConfirmDelete(true)}
        >
          削除
        </Button>
      </Stack>

      {recipe?.sourceUrl && (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <LinkIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography
            component="a"
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ color: "primary.main", wordBreak: "break-all" }}
          >
            {recipe.sourceUrl}
          </Typography>
        </Stack>
      )}

      {recipe?.note && (
        <Box component="section">
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            メモ
          </Typography>
          <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
            {recipe.note}
          </Typography>
        </Box>
      )}

      <Divider />

      <Box component="section">
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          材料（{recipe?.ingredients.length ?? 0}）
        </Typography>
        {recipe && recipe.ingredients.length > 0 ? (
          <Stack spacing={0.25}>
            {recipe.ingredients.map((ingredient) => {
              const checked =
                checkedOverride[ingredient.id] ?? !ingredient.isInPurchases;
              return (
                <Stack
                  key={ingredient.id}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: "center" }}
                >
                  <Checkbox
                    size="small"
                    checked={checked}
                    onChange={(event) =>
                      setCheckedOverride((prev) => ({
                        ...prev,
                        [ingredient.id]: event.target.checked,
                      }))
                    }
                  />
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {ingredient.name}
                  </Typography>
                  {ingredient.quantity && (
                    <Typography variant="body2" color="text.secondary">
                      {ingredient.quantity}
                    </Typography>
                  )}
                  {ingredient.isInPurchases && (
                    <Chip label="追加済み" size="small" variant="outlined" />
                  )}
                </Stack>
              );
            })}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            材料は登録されていません
          </Typography>
        )}
        {recipe && recipe.ingredients.length > 0 && (
          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 1.5 }}
            disabled={
              selectedIngredientIds.length === 0 || addMutation.isPending
            }
            onClick={handleAddToPurchases}
          >
            買うものに追加（{selectedIngredientIds.length}）
          </Button>
        )}
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>削除しますか？</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            「{initialRecipe.title}」を削除しますか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>キャンセル</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isPending}
            onClick={handleDelete}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        onClose={() => setToast(null)}
        autoHideDuration={8000}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ bottom: 72 }}
        message={toast?.message}
        action={
          <Button
            color="inherit"
            size="small"
            onClick={() => {
              if (toast) {
                undoMutation.mutate({ taskIds: toast.taskIds });
              }
              setToast(null);
            }}
          >
            元に戻す
          </Button>
        }
      />
    </Stack>
  );
}
