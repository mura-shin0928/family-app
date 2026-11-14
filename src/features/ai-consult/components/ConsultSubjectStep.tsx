"use client";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { SEARCH_QUERY_MAX_LENGTH } from "@/features/life-events/search";
import type { CatalogItem } from "@/features/life-events/types";
import type { ConsultSubjectInput } from "../schema";

/** 何について相談するかを選ぶ段階。いまの時期の候補か、自由に入れる。 */
export function ConsultSubjectStep({
  candidates,
  onPick,
}: {
  candidates: CatalogItem[];
  onPick: (subject: ConsultSubjectInput) => void;
}) {
  const [text, setText] = useState("");
  const trimmed = text.trim();

  function submitText() {
    if (trimmed === "") return;
    onPick({ title: trimmed, summary: "", note: null });
  }

  return (
    <Stack spacing={2.5} sx={{ py: 2 }}>
      <Typography variant="subtitle1" component="p">
        何について相談しますか？
      </Typography>
      {candidates.length > 0 && (
        <Box>
          <Typography
            variant="caption"
            component="p"
            sx={{ color: "text.secondary", mb: 1 }}
          >
            いまの時期
          </Typography>
          <Box sx={{ borderTop: 1, borderColor: "divider" }}>
            {candidates.map((item) => (
              <ButtonBase
                key={item.key}
                onClick={() =>
                  onPick({
                    title: item.title,
                    summary: item.summary,
                    note: item.note,
                    catalogKey: item.key,
                  })
                }
                sx={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: 1,
                  py: 1.5,
                  textAlign: "left",
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="body1" component="span" sx={{ flex: 1 }}>
                  {item.title}
                </Typography>
                <ChevronRightIcon
                  fontSize="small"
                  sx={{ color: "text.secondary" }}
                />
              </ButtonBase>
            ))}
          </Box>
        </Box>
      )}
      <Box>
        <Typography
          variant="caption"
          component="p"
          sx={{ color: "text.secondary", mb: 1 }}
        >
          ほかのこと
        </Typography>
        <Box
          component="form"
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            submitText();
          }}
          sx={{ display: "flex", gap: 1, alignItems: "center" }}
        >
          <TextField
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="例: 七五三、産後の退院"
            size="small"
            fullWidth
            slotProps={{
              htmlInput: {
                style: { fontSize: "1rem" },
                maxLength: SEARCH_QUERY_MAX_LENGTH,
                "aria-label": "相談したいこと",
              },
            }}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={trimmed === ""}
            aria-label="相談する"
          >
            <ArrowForwardIcon />
          </IconButton>
        </Box>
      </Box>
    </Stack>
  );
}
