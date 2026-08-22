"use client";

import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import FolderOpenOutlinedIcon from "@mui/icons-material/FolderOpenOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMemo, useState, useTransition } from "react";
import { discoverProcedureLinks, ingestProcedure } from "../actions";
import { AREA_CODE_OPTIONS, type DiscoverCandidate } from "../types";

type Section = {
  id: string;
  seedLabel: string;
  candidates: DiscoverCandidate[];
  truncated: boolean;
};

type IngestItem = {
  url: string;
  title: string;
  status: "pending" | "success" | "skipped" | "failed";
  message?: string;
};

export function AddProcedureScreen() {
  const [url, setUrl] = useState("");
  const [areaCode, setAreaCode] = useState<string>("13210");
  const [sections, setSections] = useState<Section[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [pendingSeedLabel, setPendingSeedLabel] = useState<string | null>(null);
  const [isDiscovering, startDiscoverTransition] = useTransition();
  const [ingestItems, setIngestItems] = useState<IngestItem[]>([]);
  const [isIngesting, startIngestTransition] = useTransition();

  const candidateByUrl = useMemo(() => {
    const map = new Map<string, DiscoverCandidate>();
    for (const section of sections) {
      for (const candidate of section.candidates) {
        map.set(candidate.url, candidate);
      }
    }
    return map;
  }, [sections]);

  function runDiscover(seedUrl: string, seedLabel: string) {
    setDiscoverError(null);
    setPendingSeedLabel(seedLabel);
    startDiscoverTransition(async () => {
      const result = await discoverProcedureLinks({ url: seedUrl, areaCode });
      setPendingSeedLabel(null);

      if (!result.ok) {
        setDiscoverError(result.error);
        return;
      }

      setSections((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          seedLabel,
          candidates: result.candidates,
          truncated: result.truncated,
        },
      ]);
      setChecked((current) => {
        const next = { ...current };
        for (const candidate of result.candidates) {
          if (candidate.kind === "procedure" && !(candidate.url in next)) {
            next[candidate.url] = !candidate.likelyExcluded;
          }
        }
        return next;
      });
    });
  }

  function handleSearch() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setSections([]);
    setChecked({});
    setIngestItems([]);
    runDiscover(trimmed, trimmed);
  }

  function toggleChecked(candidateUrl: string) {
    setChecked((current) => ({
      ...current,
      [candidateUrl]: !current[candidateUrl],
    }));
  }

  const checkedUrls = Object.entries(checked)
    .filter(([, isChecked]) => isChecked)
    .map(([candidateUrl]) => candidateUrl);

  function handleIngest() {
    if (checkedUrls.length === 0) return;

    const items: IngestItem[] = checkedUrls.map((candidateUrl) => ({
      url: candidateUrl,
      title: candidateByUrl.get(candidateUrl)?.title ?? candidateUrl,
      status: "pending",
    }));
    setIngestItems(items);

    startIngestTransition(async () => {
      for (const item of items) {
        const result = await ingestProcedure({ url: item.url, areaCode });

        setIngestItems((current) =>
          current.map((currentItem) => {
            if (currentItem.url !== item.url) return currentItem;
            if (!result.ok) {
              return {
                ...currentItem,
                status: "failed",
                message: result.error,
              };
            }
            if (result.status === "already-exists") {
              return {
                ...currentItem,
                status: "skipped",
                message: "登録済みです",
              };
            }
            return {
              ...currentItem,
              status: "success",
              message:
                result.droppedCount > 0
                  ? `${result.droppedCount}件は根拠不十分のため要確認にしました`
                  : undefined,
            };
          }),
        );
      }
    });
  }

  const doneCount = ingestItems.filter(
    (item) => item.status !== "pending",
  ).length;

  return (
    <Box sx={{ p: 2, pb: 10 }}>
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          制度が並んでいる索引ページのURLを貼ってください。索引でなく制度そのものの
          ページを貼っても構いません。
        </Typography>

        <TextField
          label="索引ページのURL"
          placeholder="https://..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          fullWidth
          size="small"
        />

        <TextField
          select
          label="対象地域（ページの管轄が判定できない場合に使う値）"
          value={areaCode}
          onChange={(event) => setAreaCode(event.target.value)}
          size="small"
          fullWidth
        >
          {AREA_CODE_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={isDiscovering || url.trim() === ""}
        >
          {isDiscovering && pendingSeedLabel === url.trim() ? (
            <CircularProgress size={20} sx={{ color: "inherit" }} />
          ) : (
            "候補を取得"
          )}
        </Button>

        {discoverError && <Alert severity="warning">{discoverError}</Alert>}

        {sections.map((section) => (
          <Box key={section.id}>
            <Divider sx={{ my: 1 }} />
            <Typography
              variant="subtitle2"
              color="text.secondary"
              gutterBottom
              sx={{ wordBreak: "break-all" }}
            >
              {section.seedLabel}
            </Typography>
            {section.truncated && (
              <Alert severity="info" sx={{ mb: 1 }}>
                時間内に処理しきれなかったページがあります。必要なら再度お試しください。
              </Alert>
            )}
            {section.candidates.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                リンクが見つかりませんでした。
              </Typography>
            )}
            <List dense disablePadding>
              {section.candidates.map((candidate) => (
                <ListItem
                  key={candidate.url}
                  disableGutters
                  secondaryAction={
                    candidate.kind === "index" ? (
                      <Button
                        size="small"
                        startIcon={
                          isDiscovering &&
                          pendingSeedLabel === candidate.title ? undefined : (
                            <FolderOpenOutlinedIcon />
                          )
                        }
                        disabled={isDiscovering}
                        onClick={() =>
                          runDiscover(candidate.url, candidate.title)
                        }
                      >
                        {isDiscovering &&
                        pendingSeedLabel === candidate.title ? (
                          <CircularProgress size={16} />
                        ) : (
                          "もう1階層掘る"
                        )}
                      </Button>
                    ) : undefined
                  }
                >
                  {candidate.kind === "procedure" ? (
                    <FormControlLabel
                      sx={{ width: "100%", mr: 0, alignItems: "flex-start" }}
                      control={
                        <Checkbox
                          checked={!!checked[candidate.url]}
                          onChange={() => toggleChecked(candidate.url)}
                        />
                      }
                      label={
                        <ListItemText
                          primary={
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{ alignItems: "center", flexWrap: "wrap" }}
                            >
                              <ArticleOutlinedIcon
                                fontSize="small"
                                color="action"
                              />
                              <Typography variant="body2">
                                {candidate.title}
                              </Typography>
                              {candidate.likelyExcluded && (
                                <Chip
                                  size="small"
                                  label="対象外?"
                                  color="warning"
                                  variant="outlined"
                                />
                              )}
                            </Stack>
                          }
                          secondary={[
                            candidate.updatedOn
                              ? `更新日: ${candidate.updatedOn}`
                              : null,
                            candidate.areaCode
                              ? (AREA_CODE_OPTIONS.find(
                                  (option) =>
                                    option.value === candidate.areaCode,
                                )?.label ?? candidate.areaCode)
                              : "国（全国）",
                          ]
                            .filter(Boolean)
                            .join(" / ")}
                        />
                      }
                    />
                  ) : (
                    <ListItemText
                      primary={
                        <Stack
                          direction="row"
                          spacing={0.5}
                          sx={{ alignItems: "center", flexWrap: "wrap" }}
                        >
                          <FolderOpenOutlinedIcon
                            fontSize="small"
                            color="action"
                          />
                          <Typography variant="body2">
                            {candidate.title}
                          </Typography>
                          {candidate.fetchFailed && (
                            <Chip
                              size="small"
                              label="取得失敗"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      }
                    />
                  )}
                </ListItem>
              ))}
            </List>
          </Box>
        ))}

        {sections.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Button
              variant="contained"
              color="primary"
              onClick={handleIngest}
              disabled={isIngesting || checkedUrls.length === 0}
            >
              {isIngesting
                ? `取り込み中... (${doneCount}/${ingestItems.length})`
                : `チェックした${checkedUrls.length}件を取り込む`}
            </Button>
          </>
        )}

        {ingestItems.length > 0 && (
          <List dense disablePadding>
            {ingestItems.map((item) => (
              <ListItem key={item.url} disableGutters>
                <ListItemText
                  primary={item.title}
                  secondary={
                    <Typography
                      variant="caption"
                      color={
                        item.status === "failed"
                          ? "error"
                          : item.status === "pending"
                            ? "text.secondary"
                            : "success.main"
                      }
                    >
                      {item.status === "pending"
                        ? "処理中..."
                        : item.status === "success"
                          ? (item.message ?? "取り込みました")
                          : item.status === "skipped"
                            ? item.message
                            : `失敗: ${item.message}`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Box>
  );
}
