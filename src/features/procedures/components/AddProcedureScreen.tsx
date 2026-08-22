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
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useRef, useState, useTransition } from "react";
import { discoverProcedureLinks, ingestProcedure } from "../actions";
import {
  matchesSelectedLabelGroups,
  PROCEDURE_LABEL_GROUPS,
} from "../discover";
import { AREA_CODE_OPTIONS, type DiscoverCandidate } from "../types";

// 「一定の階層は時間がかかってもいいから最初から取得しておいてほしい」という
// フィードバックへの対応。ユーザーの操作を待たずに深さ3(索引URL直下から3階層)
// までは自動で掘り進める。1req/秒のレート制限はdiscoverProcedureLinks内で
// 維持したまま行うため、実行には数十秒〜数分かかりうるが、既に取得できた候補は
// 掘り進めている間もチェック・取り込みができる（バックグラウンドで進む体裁）。
// これより深い階層は候補一覧の「もっと掘る」で手動になる。
const AUTO_EXPAND_MAX_DEPTH = 3;

// 「対象外?としてるのはなんだっけ?」への対応。タップ/ホバーで理由が分かるように
// Tooltipで補足する。
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

function areaCodeLabel(areaCode: string | null): string {
  if (areaCode === null) return "国（全国）";
  return (
    AREA_CODE_OPTIONS.find((option) => option.value === areaCode)?.label ??
    areaCode
  );
}

// 候補が「後回しでよい」もの(=対象外?の印がある、または絞り込んだラベルに
// 一致しない)かどうか。優先度の低い候補一覧の折りたたみに使う。
function isDeprioritized(
  candidate: DiscoverCandidate,
  selectedGroupIds: string[],
): boolean {
  if (candidate.kind !== "procedure") return false;
  if (candidate.likelyExcluded) return true;
  return !matchesSelectedLabelGroups(candidate.title, selectedGroupIds);
}

export function AddProcedureScreen() {
  const [url, setUrl] = useState("");
  const [areaCode, setAreaCode] = useState<string>("13210");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(
    PROCEDURE_LABEL_GROUPS.map((group) => group.id),
  );
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
  // 「見たことのあるURL」はツリー全体で一度だけ持つ（複数の索引ページから同じ
  // ページへリンクされることがあるため）。setStateの関数形の外で使うのでrefにする。
  const visitedRef = useRef<Set<string>>(new Set());

  function toggleLabelGroup(groupId: string) {
    setSelectedGroupIds((current) => {
      if (current.includes(groupId)) {
        // 最後の1つは外せないようにする（全解除=絞り込み無しと区別が付かなくなるため）
        if (current.length === 1) return current;
        return current.filter((item) => item !== groupId);
      }
      return [...current, groupId];
    });
  }

  // 「対象外?・絞り込み対象外の候補を表示」に隠れている(=isDeprioritized)候補は、
  // 見ていないのに取り込まれることが無いよう既定でチェックを入れない。
  function applyDefaultChecks(candidates: DiscoverCandidate[]) {
    setChecked((current) => {
      const next = { ...current };
      for (const candidate of candidates) {
        if (candidate.kind === "procedure" && !(candidate.url in next)) {
          next[candidate.url] = !isDeprioritized(candidate, selectedGroupIds);
        }
      }
      return next;
    });
  }

  // 1階層分を取得し、まだ見ていないURLだけをツリーへ追加する。索引のうち
  // 選んだラベルに一致しないものは自動で掘る対象から外す(自動深掘りの
  // 分岐を絞ることで所要時間と表示件数の両方を減らす)。「対象外?」の索引も
  // 同様に対象から外す。どちらも手動の「もっと掘る」では引き続き辿れる。
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
      if (
        candidate.kind === "index" &&
        !candidate.likelyExcluded &&
        matchesSelectedLabelGroups(candidate.title, selectedGroupIds)
      ) {
        newIndexUrls.push(candidate.url);
      }
    }

    setNodesByUrl((current) => ({ ...current, ...added }));
    applyDefaultChecks(result.candidates);

    return { ok: true, childUrls, newIndexUrls, truncated: result.truncated };
  }

  // 特定のノードを1階層だけ展開する。展開結果はそのノードの子として
  // その場にネストする(sectionを末尾に追加していた旧実装からの変更点)。
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

  // 見つかった索引を深さ優先ではなく階層ごとに(幅優先で)自動的に展開する。
  // AUTO_EXPAND_MAX_DEPTH に達したら止め、それ以上はユーザーの「もっと掘る」に委ねる。
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
          ページを貼っても構いません。関連しそうな階層は自動でしばらく掘り進めます。
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

        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            取り込みたい情報（絞ると自動で掘る範囲と候補の表示が絞られます。すべて選ぶと絞り込みなし）
          </Typography>
          <Stack direction="row" useFlexGap sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {PROCEDURE_LABEL_GROUPS.map((group) => (
              <Chip
                key={group.id}
                label={group.title}
                size="small"
                color={
                  selectedGroupIds.includes(group.id) ? "primary" : "default"
                }
                variant={
                  selectedGroupIds.includes(group.id) ? "filled" : "outlined"
                }
                onClick={() => toggleLabelGroup(group.id)}
              />
            ))}
          </Stack>
        </Box>

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
            件）。 見つかった候補から先にチェックできます。
          </Alert>
        )}

        {rootUrls.length > 0 && (
          <List dense disablePadding>
            <CandidateList
              urls={rootUrls}
              nodesByUrl={nodesByUrl}
              checked={checked}
              selectedGroupIds={selectedGroupIds}
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

// urlsを「優先度の高い候補」と「後回しでよい候補(対象外?/選んだラベルに
// 不一致)」に分け、後者は既定で折りたたむ。件数だけ見せて必要な人だけ開く。
function CandidateList({
  urls,
  nodesByUrl,
  checked,
  selectedGroupIds,
  isAutoExpanding,
  onToggle,
  onExpand,
}: {
  urls: string[];
  nodesByUrl: Record<string, CandidateNode>;
  checked: Record<string, boolean>;
  selectedGroupIds: string[];
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
    if (isDeprioritized(node.candidate, selectedGroupIds)) {
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
          selectedGroupIds={selectedGroupIds}
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
            color="warning"
            endIcon={
              showDeprioritized ? <ExpandLessIcon /> : <ExpandMoreIcon />
            }
            onClick={() => setShowDeprioritized((current) => !current)}
          >
            {showDeprioritized
              ? "隠す"
              : `対象外?・絞り込み対象外の候補を表示 (${deprioritized.length}件)`}
          </Button>
          {showDeprioritized &&
            deprioritized.map((candidateUrl) => (
              <CandidateRow
                key={candidateUrl}
                nodeUrl={candidateUrl}
                nodesByUrl={nodesByUrl}
                checked={checked}
                selectedGroupIds={selectedGroupIds}
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

// 索引ページを再帰的にネスト表示するための行。展開結果は末尾に追加する
// セクションではなく、このノードの直下に差し込む(その場に増える見た目にするため)。
function CandidateRow({
  nodeUrl,
  nodesByUrl,
  checked,
  selectedGroupIds,
  isAutoExpanding,
  onToggle,
  onExpand,
}: {
  nodeUrl: string;
  nodesByUrl: Record<string, CandidateNode>;
  checked: Record<string, boolean>;
  selectedGroupIds: string[];
  isAutoExpanding: boolean;
  onToggle: (url: string) => void;
  onExpand: (url: string, depth: number) => void;
}) {
  const node = nodesByUrl[nodeUrl];
  if (!node) return null;

  const { candidate } = node;
  const indent = (node.depth - 1) * 3;

  // 深さ1・2の索引のうち、選んだラベルに一致し「対象外?」でもないものは
  // 自動展開キューが処理する。展開中(=isAutoExpanding)はそれらへの手動操作を
  // 止めて、自動キューとの競合(同じノードへの二重fetch)を避ける。
  // ラベル不一致・対象外?の索引や深さ3以降は自動展開の対象外なので常に手動で操作できる。
  const isAutoManagedDepth =
    node.depth < AUTO_EXPAND_MAX_DEPTH &&
    candidate.kind === "index" &&
    !candidate.likelyExcluded &&
    matchesSelectedLabelGroups(candidate.title, selectedGroupIds);
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
                secondary={[
                  candidate.updatedOn ? `更新日: ${candidate.updatedOn}` : null,
                  areaCodeLabel(candidate.areaCode),
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
          selectedGroupIds={selectedGroupIds}
          isAutoExpanding={isAutoExpanding}
          onToggle={onToggle}
          onExpand={onExpand}
        />
      )}
    </>
  );
}
