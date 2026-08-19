"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LinkIcon from "@mui/icons-material/Link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteRecipe } from "../actions";
import { fetchRecipe } from "../query-actions";
import type { RecipeDetailDTO } from "../types";
import { recipeDetailQueryKey } from "../types";

export function RecipeDetailScreen({
  initialRecipe,
}: {
  initialRecipe: RecipeDetailDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: recipe = initialRecipe } = useQuery({
    queryKey: recipeDetailQueryKey(initialRecipe.id),
    queryFn: () => fetchRecipe(initialRecipe.id),
    initialData: initialRecipe,
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
          <Stack spacing={0.75}>
            {recipe.ingredients.map((ingredient) => (
              <Stack
                key={ingredient.id}
                direction="row"
                spacing={1}
                sx={{ justifyContent: "space-between" }}
              >
                <Typography variant="body2">{ingredient.name}</Typography>
                {ingredient.quantity && (
                  <Typography variant="body2" color="text.secondary">
                    {ingredient.quantity}
                  </Typography>
                )}
              </Stack>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            材料は登録されていません
          </Typography>
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
    </Stack>
  );
}
