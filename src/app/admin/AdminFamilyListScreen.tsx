"use client";

import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import type { CreateFamilyResult } from "@/features/admin/actions";
import type { AdminFamilyListItemDTO } from "@/features/admin/types";

type Props = {
  families: AdminFamilyListItemDTO[];
  createFamily: (input: { name: string }) => Promise<CreateFamilyResult>;
};

export function AdminFamilyListScreen({ families, createFamily }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createFamily({ name });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDialogOpen(false);
      setName("");
      router.push(`/admin/families/${result.familyId}`);
    });
  }

  return (
    <Stack
      spacing={2}
      sx={{
        p: 2,
        width: "100%",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      <Typography variant="subtitle1">Family（{families.length}）</Typography>
      <Stack spacing={1}>
        {families.map((family) => (
          <Paper
            key={family.id}
            variant="outlined"
            component={Link}
            href={`/admin/families/${family.id}`}
            sx={{
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>
                {family.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                component="div"
              >
                メンバー{family.memberCount}人・
                {new Date(family.createdAt).toLocaleDateString("ja-JP")}
                作成
              </Typography>
            </Box>
            <ChevronRightIcon fontSize="small" sx={{ flexShrink: 0 }} />
          </Paper>
        ))}

        <Button
          fullWidth
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{ borderStyle: "dashed" }}
          onClick={() => setDialogOpen(true)}
        >
          Familyを作成
        </Button>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>新しいFamilyを作成</DialogTitle>
        <DialogContent>
          <Stack
            component="form"
            id="create-family-form"
            onSubmit={handleCreate}
            spacing={1.5}
            sx={{ pt: 0.5 }}
          >
            <TextField
              label="Family名"
              size="small"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoFocus
            />
            {error && (
              <Alert severity="error" sx={{ py: 0 }}>
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>キャンセル</Button>
          <Button
            type="submit"
            form="create-family-form"
            variant="contained"
            disabled={isPending}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
