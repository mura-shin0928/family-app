"use client";

import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import MuiLink from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { type DoneItem, splitNoteByUrl } from "../records";
import { formatSlashDate } from "../timing";

/** メモの URL だけリンクにする。 */
function NoteText({ note }: { note: string }) {
  return (
    <Typography
      variant="body2"
      sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {splitNoteByUrl(note).map((part, index) =>
        part.isUrl ? (
          <MuiLink
            // biome-ignore lint/suspicious/noArrayIndexKey: 分割結果は並びが変わらない
            key={index}
            href={part.text}
            target="_blank"
            rel="noopener noreferrer"
          >
            {part.text}
          </MuiLink>
        ) : (
          part.text
        ),
      )}
    </Typography>
  );
}

/**
 * 記録の詳細を出す下部シート。item が null の間は閉じている。
 * 編集や削除はここでは行わず、選ばれた操作を親に伝えるだけ。
 */
export function RecordDetailSheet({
  item,
  onClose,
  onEditNote,
  onEditDate,
  onRemove,
}: {
  item: DoneItem | null;
  onClose: () => void;
  onEditNote: (item: DoneItem) => void;
  onEditDate: (item: DoneItem) => void;
  onRemove: (item: DoneItem) => void;
}) {
  return (
    <Drawer
      anchor="bottom"
      open={item !== null}
      onClose={onClose}
      slotProps={{
        paper: { sx: { borderRadius: "16px 16px 0 0", maxHeight: "85dvh" } },
      }}
    >
      {item && (
        <Stack
          spacing={1.5}
          sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {formatSlashDate(item.doneOn)} にやった
          </Typography>
          <Typography variant="h6">{item.title}</Typography>
          {item.note ? (
            <NoteText note={item.note} />
          ) : (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              メモはありません
            </Typography>
          )}
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            <Button variant="outlined" onClick={() => onEditNote(item)}>
              メモを編集
            </Button>
            <Button variant="outlined" onClick={() => onEditDate(item)}>
              やった日を直す
            </Button>
            <Button
              color="error"
              // 折り返したとき、上の行のボタンの左端に文字を揃える
              sx={{ pl: "2px", pr: 2 }}
              onClick={() => onRemove(item)}
            >
              記録から外す
            </Button>
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
