"use client";

import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateFamilyMunicipality } from "../actions";
import type { FamilyMunicipality } from "../queries";
import type { Area } from "../types";

/**
 * 家族の自治体。「手続き」画面の制度一覧（その自治体＋都道府県の制度）に使う。
 * 子供と同じく家族全体の設定なので「家族」画面に置く。
 * areas が null（seido-data-hub に届かない・未設定）のときは変更できない。
 */
export function MunicipalitySection({
  municipality,
  areas,
}: {
  municipality: FamilyMunicipality | null;
  areas: Area[] | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle1">住んでいる自治体</Typography>
          <Typography variant="body2" color="text.secondary">
            {municipality?.name ?? "未設定"}
          </Typography>
        </Box>
        <IconButton
          size="small"
          aria-label="自治体を変更"
          onClick={() => setOpen(true)}
          disabled={areas === null}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>
      {areas === null && (
        <Typography variant="caption" color="text.secondary">
          自治体の一覧を取得できないため、いまは変更できません。
        </Typography>
      )}

      {areas && (
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <MunicipalityForm
            key={String(open)}
            municipality={municipality}
            areas={areas}
            onDone={() => setOpen(false)}
          />
        </Dialog>
      )}
    </Box>
  );
}

function MunicipalityForm({
  municipality,
  areas,
  onDone,
}: {
  municipality: FamilyMunicipality | null;
  areas: Area[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Area | null>(
    areas.find((area) => area.code === municipality?.code) ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updateFamilyMunicipality({
        code: selected?.code ?? "",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone();
      router.refresh();
    });
  }

  return (
    <>
      <DialogTitle>住んでいる自治体</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Autocomplete
            options={areas}
            value={selected}
            onChange={(_, value) => setSelected(value)}
            getOptionLabel={(area) => area.name}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            renderInput={(params) => (
              <TextField
                {...params}
                label="市区町村"
                size="small"
                helperText="「手続き」画面で、この自治体と都道府県の子育て支援制度を一覧できます（いまは東京都内のみ）"
              />
            )}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onDone} disabled={isPending}>
          キャンセル
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={isPending}>
          保存
        </Button>
      </DialogActions>
    </>
  );
}
