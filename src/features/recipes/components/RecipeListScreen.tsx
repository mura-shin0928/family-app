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
          <Stack
            spacing={2}
            sx={{ alignItems: "center", py: 8, color: "text.secondary" }}
          >
            <svg
              width="72"
              height="72"
              viewBox="0 0 72 72"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M14 30h44v10a16 16 0 0 1-16 16H30a16 16 0 0 1-16-16V30Z"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M10 30h52M22 20c0-4 4-4 4-8M36 20c0-4 4-4 4-8M50 20c0-4 4-4 4-8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <Typography variant="body1" align="center">
              レシピはまだありません
            </Typography>
          </Stack>
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
              <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
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
