"use client";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { type DoneItem, formatMonthDay } from "../records";

/**
 * 記録の一覧の1行。タップで詳細シートを開く。メモが1行に収まらないときだけ
 * 右端の開閉ボタンで、行の中にメモ全文を広げられる。
 */
export function RecordRow({
  item,
  onOpen,
}: {
  item: DoneItem;
  onOpen: () => void;
}) {
  const noteRef = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  const note = item.note;

  useEffect(() => {
    const element = noteRef.current;
    if (!note || !element) {
      setOverflowing(false);
      return;
    }
    if (expanded) return;
    const measure = () =>
      setOverflowing(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [note, expanded]);

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      <ButtonBase
        component="div"
        onClick={onOpen}
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          justifyContent: "flex-start",
          textAlign: "left",
          py: 1,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            minWidth: 40,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {formatMonthDay(item.doneOn)}
        </Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body1">{item.title}</Typography>
          {item.note && (
            <Typography
              ref={noteRef}
              variant="caption"
              sx={{
                color: "text.secondary",
                display: expanded ? "block" : "-webkit-box",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                ...(expanded
                  ? {}
                  : {
                      WebkitLineClamp: 1,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }),
              }}
            >
              {item.note}
            </Typography>
          )}
        </Box>
      </ButtonBase>
      {note && (overflowing || expanded) && (
        <IconButton
          size="small"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-label={expanded ? "メモを閉じる" : "メモを広げる"}
          sx={{ alignSelf: "flex-start", mt: 1 }}
        >
          <ExpandMoreIcon
            fontSize="small"
            sx={{
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 0.15s",
            }}
          />
        </IconButton>
      )}
    </Box>
  );
}
