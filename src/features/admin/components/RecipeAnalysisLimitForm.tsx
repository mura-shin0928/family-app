"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import type { ActionResult } from "@/lib/action-result";

type Props = {
  /** null は既定値。 */
  dailyLimit: number | null;
  setDailyLimit: (input: {
    dailyLimit: number | null;
  }) => Promise<ActionResult>;
};

type Message = { severity: "success" | "error"; text: string };

export function RecipeAnalysisLimitForm({ dailyLimit, setDailyLimit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(dailyLimit?.toString() ?? "");
  const [message, setMessage] = useState<Message | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const trimmed = value.trim();
    startTransition(async () => {
      const result = await setDailyLimit({
        dailyLimit: trimmed === "" ? null : Number(trimmed),
      });
      if (!result.ok) {
        setMessage({ severity: "error", text: result.error });
        return;
      }
      setMessage({ severity: "success", text: "保存しました" });
      router.refresh();
    });
  }

  return (
    <Box
      component="section"
      sx={{ p: 2, pb: 0, width: "100%", maxWidth: 480, mx: "auto" }}
    >
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        レシピ解析の上限
      </Typography>
      <Stack component="form" spacing={1} onSubmit={handleSubmit}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
          <TextField
            label="1日あたりの回数"
            size="small"
            type="number"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            helperText="空欄は既定値。0 にすると解析を止めます。"
            slotProps={{ htmlInput: { min: 0, step: 1 } }}
            sx={{ flex: 1 }}
          />
          <Button type="submit" variant="contained" disabled={isPending}>
            保存
          </Button>
        </Stack>
        {message && (
          <Alert severity={message.severity} sx={{ py: 0 }}>
            {message.text}
          </Alert>
        )}
      </Stack>
    </Box>
  );
}
