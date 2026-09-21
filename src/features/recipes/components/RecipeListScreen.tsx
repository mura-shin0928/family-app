"use client";

import AddIcon from "@mui/icons-material/Add";
import LinkIcon from "@mui/icons-material/Link";
import Box from "@mui/material/Box";
import Fab from "@mui/material/Fab";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/layout";
import { fetchRecipes } from "../query-actions";
import { RECIPES_QUERY_KEY, type RecipeDTO } from "../types";

export function RecipeListScreen({
  initialRecipes,
}: {
  initialRecipes: RecipeDTO[];
}) {
  const { data: recipes = [] } = useQuery({
    queryKey: RECIPES_QUERY_KEY,
    queryFn: fetchRecipes,
    initialData: initialRecipes,
  });

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", pb: 12 }}>
      <Stack spacing={1} sx={{ flex: 1, px: 2, py: 2 }}>
        {recipes.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{ py: 8 }}
          >
            レシピはまだありません
          </Typography>
        ) : (
          recipes.map((recipe) => (
            <Paper
              key={recipe.id}
              component={Link}
              href={`/recipes/${recipe.id}`}
              variant="outlined"
              sx={{
                display: "block",
                p: 1.5,
                textDecoration: "none",
                color: "text.primary",
              }}
            >
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                {recipe.title}
              </Typography>
              {recipe.sourceUrl && (
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center", mt: 0.25 }}
                >
                  <LinkIcon
                    fontSize="inherit"
                    sx={{ color: "text.secondary" }}
                  />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {recipe.sourceUrl}
                  </Typography>
                </Stack>
              )}
            </Paper>
          ))
        )}
      </Stack>

      <Fab
        component={Link}
        href="/recipes/new"
        color="primary"
        aria-label="レシピを追加"
        sx={{
          position: "fixed",
          right: 16,
          bottom: BOTTOM_NAV_CLEARANCE,
        }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
}
