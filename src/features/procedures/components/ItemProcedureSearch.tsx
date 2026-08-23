"use client";

import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState, useTransition } from "react";
import { discoverProcedureLinks, ingestProcedure } from "../actions";
import type { DiscoverCandidate, ProcedureCategory } from "../types";

// 「一定の階層は時間がかかってもいいから最初から取得しておいてほしい」という
// フィードバックへの対応（AddProcedureScreen由来）。索引URL直下から3階層までは
// 自動で掘り進める。
const AUTO_EXPAND_MAX_DEPTH = 3;

const EXCLUDED_TOOLTIP =
  "「審議会」「計画」などの言葉があり、「届」「手当」「健診」など制度らしい言葉が" +
  "見当たらないため、機械的に対象外の可能性ありとしています(誤判定のこともあります)";

type ChildrenStatus = "idle" | "loading" | "loaded" | "error";

type CandidateNode = {
  candidate: DiscoverCandidate;
  depth: number;
  childUrls: string[] | null;
  childrenStatus: ChildrenStatus;
  childrenError?: string;
  childrenTruncated?: boolean;
};

type IngestItem = {
  url: string;
  title: string;
  status: "pending" | "success" | "skipped" | "failed";
  message?: string;
};

type FetchLevelResult =
  | {
      ok: true;
      childUrls: string[];
      newIndexUrls: string[];
      truncated: boolean;
    }
  | { ok: false; error: string };

/**
 * テンプレート項目の詳細から「この項目の制度情報を探す」で開く縮小版フォーム。
 * AddProcedureScreen(旧P1のトップレベル探索画面)から、探しているカテゴリと
 * 対象地域は既に項目の文脈で決まっているという前提でラベル絞り込み・地域選択を
 * 取り除いたもの。索引URLを貼って階層を自動で掘る挙動自体は引き継ぐ
 * （URLだけで正しい制度ページに辿り着けるとは限らないため）。
 */
export function ItemProcedureSearch({
  category,
  areaCode,
  onIngested,
}: {
  category: ProcedureCategory;
  areaCode: string;
  onIngested: () => void;
}) {
  const [url, setUrl] = useState("");
  const [rootUrls, setRootUrls] = useState<string[]>([]);
  const [nodesByUrl, setNodesByUrl] = useState<Record<string, CandidateNode>>(
    {},
  );
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const [isDiscovering, startDiscoverTransition] = useTransition();
  const [autoExpandRemaining, setAutoExpandRemaining] = useState(0);
  const [ingestItems, setIngestItems] = useState<IngestItem[]>([]);
  const [isIngesting, startIngestTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);
  const visitedRef = useRef<Set<string>>(new Set());

  function applyDefaultChecks(candidates: DiscoverCandidate[]) {
    setChecked((current) => {
      const next = { ...current };
      for (const candidate of candidates) {
        if (candidate.kind === "procedure" && !(candidate.url in next)) {
          next[candidate.url] = !candidate.likelyExcluded;
        }
      }
      return next;
    });
  }

  async function fetchLevel(
    seedUrl: string,
    depth: number,
  ): Promise<FetchLevelResult> {
    const result = await discoverProcedureLinks({ url: seedUrl, areaCode });
    if (!result.ok) return { ok: false, error: result.error };

    const added: Record<string, CandidateNode> = {};
    const childUrls: string[] = [];
    const newIndexUrls: string[] = [];

    for (const candidate of result.candidates) {
      if (visitedRef.current.has(candidate.url)) continue;
      visitedRef.current.add(candidate.url);
      added[candidate.url] = {
        candidate,
        depth,
        childUrls: null,
        childrenStatus: "idle",
      };
      childUrls.push(candidate.url);
      if (candidate.kind === "index" && !candidate.likelyExcluded) {
        newIndexUrls.push(candidate.url);
      }
    }

    setNodesByUrl((current) => ({ ...current, ...added }));
    applyDefaultChecks(result.candidates);

    return { ok: true, childUrls, newIndexUrls, truncated: result.truncated };
  }

  async function expandNode(
    parentUrl: string,
    childDepth: number,
  ): Promise<string[]> {
    setNodesByUrl((current) => ({
      ...current,
      [parentUrl]: { ...current[parentUrl], childrenStatus: "loading" },
    }));

    const result = await fetchLevel(parentUrl, childDepth);

    if (!result.ok) {
      setNodesByUrl((current) => ({
        ...current,
        [parentUrl]: {
          ...current[parentUrl],
          childrenStatus: "error",
          childrenError: result.error,
        },
      }));
      return [];
    }

    setNodesByUrl((current) => ({
      ...current,
      [parentUrl]: {
        ...current[parentUrl],
        childUrls: result.childUrls,
        childrenStatus: "loaded",
        childrenTruncated: result.truncated,
      },
    }));

    return result.newIndexUrls;
  }

  async function runAutoExpandQueue(
    initialQueue: { url: string; depth: number }[],
  ) {
    const queue = [...initialQueue];
    setAutoExpandRemaining(queue.length);

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const childDepth = item.depth + 1;
      const newIndexUrls = await expandNode(item.url, childDepth);

      if (childDepth < AUTO_EXPAND_MAX_DEPTH) {
        for (const childUrl of newIndexUrls) {
          queue.push({ url: childUrl, depth: childDepth });
        }
      }

      setAutoExpandRemaining(queue.length);
    }
  }

  function handleSearch() {
    const trimmed = url.trim();
    if (!trimmed) return;

    visitedRef.current = new Set();
    setNodesByUrl({});
    setRootUrls([]);
    setChecked({});
    setIngestItems([]);
    setDiscoverError(null);
    setAutoExpandRemaining(0);
    setHasSearched(true);

    startDiscoverTransition(async () => {
      const result = await fetchLevel(trimmed, 1);
      if (!result.ok) {
        setDiscoverError(result.error);
        return;
      }

      setRootUrls(result.childUrls);

      await runAutoExpandQueue(
        result.newIndexUrls.map((childUrl) => ({ url: childUrl, depth: 1 })),
      );
    });
  }

  function handleManualExpand(candidateUrl: string, depth: number) {
    void expandNode(candidateUrl, depth + 1);
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
      title: nodesByUrl[candidateUrl]?.candidate.title ?? candidateUrl,
      status: "pending",
    }));
    setIngestItems(items);

    startIngestTransition(async () => {
      let hasSuccess = false;
      for (const item of items) {
        const result = await ingestProcedure({
          url: item.url,
          areaCode,
          category,
        });

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

        if (result.ok && result.status === "inserted") hasSuccess = true;
      }

      if (hasSuccess) onIngested();
    });
  }

  const doneCount = ingestItems.filter(
    (item) => item.status !== "pending",
  ).length;

  return (
    <Box sx={{ pt: 1 }}>
      <Stack spacing={1.5}>
        <Typography variant="body2" color="text.secondary">
          自治体・国のページのURLを貼ってください。索引ページでも制度そのものの
          ページでも構いません。関連しそうな階層は自動でしばらく掘り進めます。
        </Typography>

        <TextField
          label="URL"
          placeholder="https://..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          fullWidth
          size="small"
        />

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={isDiscovering || url.trim() === ""}
        >
          {isDiscovering ? (
            <CircularProgress size={20} sx={{ color: "inherit" }} />
          ) : (
            "候補を取得"
          )}
        </Button>

        {discoverError && <Alert severity="warning">{discoverError}</Alert>}

        {autoExpandRemaining > 0 && (
          <Alert severity="info" icon={<CircularProgress size={16} />}>
            関連しそうな階層を裏側で確認しています（残り{autoExpandRemaining}
            件）。見つかった候補から先にチェックできます。
          </Alert>
        )}

        {rootUrls.length > 0 && (
          <List dense disablePadding>
            <CandidateList
              urls={rootUrls}
              nodesByUrl={nodesByUrl}
              checked={checked}
              isAutoExpanding={autoExpandRemaining > 0 || isDiscovering}
              onToggle={toggleChecked}
              onExpand={handleManualExpand}
            />
          </List>
        )}

        {hasSearched &&
          rootUrls.length === 0 &&
          !isDiscovering &&
          !discoverError && (
            <Typography variant="body2" color="text.secondary">
              リンクが見つかりませんでした。
            </Typography>
          )}

        {rootUrls.length > 0 && (
          <>
            <Divider sx={{ my: 0.5 }} />
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

function CandidateList({
  urls,
  nodesByUrl,
  checked,
  isAutoExpanding,
  onToggle,
  onExpand,
}: {
  urls: string[];
  nodesByUrl: Record<string, CandidateNode>;
  checked: Record<string, boolean>;
  isAutoExpanding: boolean;
  onToggle: (url: string) => void;
  onExpand: (url: string, depth: number) => void;
}) {
  const [showDeprioritized, setShowDeprioritized] = useState(false);

  const primary: string[] = [];
  const deprioritized: string[] = [];
  for (const candidateUrl of urls) {
    const node = nodesByUrl[candidateUrl];
    if (!node) continue;
    if (node.candidate.kind === "procedure" && node.candidate.likelyExcluded) {
      deprioritized.push(candidateUrl);
    } else {
      primary.push(candidateUrl);
    }
  }

  return (
    <>
      {primary.map((candidateUrl) => (
        <CandidateRow
          key={candidateUrl}
          nodeUrl={candidateUrl}
          nodesByUrl={nodesByUrl}
          checked={checked}
          isAutoExpanding={isAutoExpanding}
          onToggle={onToggle}
          onExpand={onExpand}
        />
      ))}
      {deprioritized.length > 0 && (
        <Box sx={{ pl: 2, my: 0.5 }}>
          <Button
            size="small"
            variant="outlined"
            color="info"
            endIcon={
              showDeprioritized ? <ExpandLessIcon /> : <ExpandMoreIcon />
            }
            onClick={() => setShowDeprioritized((current) => !current)}
          >
            {showDeprioritized
              ? "隠す"
              : `対象外?の候補を表示 (${deprioritized.length}件)`}
          </Button>
          {showDeprioritized &&
            deprioritized.map((candidateUrl) => (
              <CandidateRow
                key={candidateUrl}
                nodeUrl={candidateUrl}
                nodesByUrl={nodesByUrl}
                checked={checked}
                isAutoExpanding={isAutoExpanding}
                onToggle={onToggle}
                onExpand={onExpand}
              />
            ))}
        </Box>
      )}
    </>
  );
}

function CandidateRow({
  nodeUrl,
  nodesByUrl,
  checked,
  isAutoExpanding,
  onToggle,
  onExpand,
}: {
  nodeUrl: string;
  nodesByUrl: Record<string, CandidateNode>;
  checked: Record<string, boolean>;
  isAutoExpanding: boolean;
  onToggle: (url: string) => void;
  onExpand: (url: string, depth: number) => void;
}) {
  const node = nodesByUrl[nodeUrl];
  if (!node) return null;

  const { candidate } = node;
  const indent = (node.depth - 1) * 3;

  const isAutoManagedDepth =
    node.depth < AUTO_EXPAND_MAX_DEPTH &&
    candidate.kind === "index" &&
    !candidate.likelyExcluded;
  const showManualExpandButton =
    candidate.kind === "index" &&
    node.childUrls === null &&
    node.childrenStatus !== "loading" &&
    (!isAutoManagedDepth || !isAutoExpanding);

  return (
    <>
      <ListItem
        disableGutters
        sx={{ pl: indent }}
        secondaryAction={
          node.childrenStatus === "loading" ? (
            <CircularProgress size={16} sx={{ mr: 1 }} />
          ) : showManualExpandButton ? (
            <Button
              size="small"
              startIcon={<FolderOpenOutlinedIcon />}
              onClick={() => onExpand(candidate.url, node.depth)}
            >
              もっと掘る
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
                onChange={() => onToggle(candidate.url)}
              />
            }
            label={
              <ListItemText
                primary={
                  <Stack
                    direction="row"
                    useFlexGap
                    sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
                  >
                    <ArticleOutlinedIcon fontSize="small" color="action" />
                    <Typography variant="body2">{candidate.title}</Typography>
                    {candidate.likelyExcluded && (
                      <Tooltip title={EXCLUDED_TOOLTIP}>
                        <Chip
                          size="small"
                          label="対象外?"
                          color="warning"
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                  </Stack>
                }
                secondary={
                  candidate.updatedOn
                    ? `更新日: ${candidate.updatedOn}`
                    : undefined
                }
              />
            }
          />
        ) : (
          <ListItemText
            primary={
              <Stack
                direction="row"
                useFlexGap
                sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
              >
                <FolderOpenOutlinedIcon fontSize="small" color="action" />
                <Typography variant="body2">{candidate.title}</Typography>
                {candidate.fetchFailed && (
                  <Chip size="small" label="取得失敗" variant="outlined" />
                )}
                {candidate.likelyExcluded && (
                  <Tooltip title={EXCLUDED_TOOLTIP}>
                    <Chip
                      size="small"
                      label="対象外?"
                      color="warning"
                      variant="outlined"
                    />
                  </Tooltip>
                )}
                {node.childrenTruncated && (
                  <Chip size="small" label="一部省略" variant="outlined" />
                )}
              </Stack>
            }
          />
        )}
      </ListItem>

      {node.childrenStatus === "error" && (
        <Box sx={{ pl: indent + 2 }}>
          <Alert severity="warning" sx={{ mb: 1 }}>
            {node.childrenError}
          </Alert>
        </Box>
      )}

      {node.childUrls && node.childUrls.length > 0 && (
        <CandidateList
          urls={node.childUrls}
          nodesByUrl={nodesByUrl}
          checked={checked}
          isAutoExpanding={isAutoExpanding}
          onToggle={onToggle}
          onExpand={onExpand}
        />
      )}
    </>
  );
}
