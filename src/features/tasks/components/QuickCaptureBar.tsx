"use client";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { type FormEvent, useId, useState } from "react";
import { PurchaseLocationOptions } from "@/features/purchase-locations/components/PurchaseLocationOptions";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import { addDaysToDateString, todayInJst } from "@/lib/date";

type Props = {
  locations: PurchaseLocation[];
  onSubmit: (input: {
    title: string;
    dueOn: string | null;
    isPurchase: boolean;
    purchaseLocationId: string | null;
  }) => void;
};

/**
 * タイトル入力中に他のコントロールをタップすると、そちらへフォーカスが移って
 * ソフトウェアキーボードが閉じてしまう（＝フォームが閉じたように見える）。
 * mousedown 側でデフォルト動作（フォーカス移動）を止めることで、
 * クリック自体は通しつつ入力中のフォーカス/キーボードを保つ。
 */
function preventBlur(event: { preventDefault: () => void }) {
  event.preventDefault();
}

/**
 * 常設Quick Captureバー。タイトルだけで登録が完了する。
 * 「期限」チップをタップすると、今日/明日のワンタップ選択とカレンダーからの
 * 任意選択をまとめたパネルが開く（タグUIは意図的に置かない）。
 */
export function QuickCaptureBar({ locations, onSubmit }: Props) {
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState<string | null>(null);
  const [isPurchase, setIsPurchase] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [dueOpen, setDueOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const inputId = useId();

  const today = todayInJst();
  const tomorrow = addDaysToDateString(today, 1);
  const dueLabel =
    dueOn === today
      ? "今日"
      : dueOn === tomorrow
        ? "明日"
        : dueOn
          ? // "2026-09-30" → "9/30"（チップが横に伸びて3つ目が折り返すのを防ぐ）
            `${Number(dueOn.slice(5, 7))}/${Number(dueOn.slice(8, 10))}`
          : "期限";
  const selectedLocation =
    locations.find((location) => location.id === locationId) ?? null;

  function resetForm() {
    setTitle("");
    setDueOn(null);
    setIsPurchase(false);
    setLocationId(null);
    setDueOpen(false);
    setLocationOpen(false);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit({
      title: trimmed,
      dueOn,
      isPurchase,
      // 「買うもの」OFF なら場所は付けない。
      purchaseLocationId: isPurchase ? locationId : null,
    });
    resetForm();
  }

  function selectDue(value: string | null) {
    setDueOn(value);
    setDueOpen(false);
  }

  function togglePurchase() {
    setIsPurchase((current) => {
      const next = !current;
      if (!next) {
        setLocationId(null);
        setLocationOpen(false);
      }
      return next;
    });
  }

  function selectLocation(value: string | null) {
    setLocationId(value);
    setLocationOpen(false);
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={3}
      square
      sx={{
        position: "fixed",
        insetInline: 0,
        bottom: "calc(56px + env(safe-area-inset-bottom))",
        // Checkbox内部のネイティブinputがz-index:1を持つため、指定しないと
        // タスク行と重なった際にそちらへクリックが先取りされてしまう。
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: 1,
        borderColor: "divider",
        px: 2,
        pt: 1,
        pb: 1,
      }}
    >
      <Box
        sx={{
          mx: "auto",
          maxWidth: "36rem",
          pb: 1,
          display: "grid",
          gridTemplateColumns: "1fr auto",
          columnGap: 1,
          rowGap: 1,
          alignItems: "center",
        }}
      >
        <TextField
          id={inputId}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="やること・買うものを入力"
          size="small"
          fullWidth
          slotProps={{
            htmlInput: { "aria-label": "やること・買うものを入力" },
          }}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!title.trim()}
          sx={{ flexShrink: 0 }}
        >
          追加
        </Button>

        {/*
          入力欄と追加ボタンの下に、グリッド全幅で左揃えに並べる。
          「期限」チップと期限パネルの両方をClickAwayListenerの内側に
          含めることで、チップの外側クリック判定にチップ自身を含めないための
          ref/除外ロジックなしで「開いてる時に再タップしたら閉じる」を実現する
          （チップは境界の内側なので、そのクリックはonClickAwayの対象にならず、
          チップ自身のonClickだけがトグルする）。
        */}
        <ClickAwayListener
          onClickAway={() => {
            setDueOpen(false);
            setLocationOpen(false);
          }}
        >
          <Stack
            direction="row"
            spacing={0.75}
            useFlexGap
            sx={{
              position: "relative",
              gridColumn: "1 / -1",
              flexWrap: "wrap",
            }}
          >
            <Chip
              size="small"
              icon={
                <CalendarTodayOutlinedIcon sx={{ width: 15, height: 15 }} />
              }
              label={dueLabel}
              clickable
              color={dueOn || dueOpen ? "primary" : "default"}
              variant={dueOn || dueOpen ? "filled" : "outlined"}
              onMouseDown={preventBlur}
              onClick={() => {
                setLocationOpen(false);
                setDueOpen((current) => !current);
              }}
            />
            <Chip
              size="small"
              icon={<ShoppingCartOutlinedIcon sx={{ width: 15, height: 15 }} />}
              label="買うもの"
              clickable
              color={isPurchase ? "primary" : "default"}
              variant={isPurchase ? "filled" : "outlined"}
              onMouseDown={preventBlur}
              onClick={togglePurchase}
            />
            {isPurchase && (
              <Chip
                size="small"
                icon={<PlaceOutlinedIcon sx={{ width: 15, height: 15 }} />}
                label={selectedLocation ? selectedLocation.name : "場所"}
                clickable
                color={locationId || locationOpen ? "primary" : "default"}
                variant={locationId || locationOpen ? "filled" : "outlined"}
                onMouseDown={preventBlur}
                onClick={() => {
                  setDueOpen(false);
                  setLocationOpen((current) => !current);
                }}
              />
            )}

            {dueOpen && (
              // MUIのPopoverはPortal+絶対座標計算のため、iOSでキーボード表示中は
              // visual viewportとのズレで位置がおかしくなる。この行（position:
              // relative）をcontaining blockにしたposition:absoluteで、JSでの
              // 座標計算なしにChip群の真上に出す。Modal/FocusTrapを
              // 使わないのでキーボードを閉じさせる副作用もない。
              <Paper
                elevation={4}
                sx={{
                  position: "absolute",
                  insetInlineStart: 0,
                  bottom: "100%",
                  mb: 1,
                  width: "16rem",
                  maxWidth: "100%",
                }}
              >
                <Stack spacing={1} sx={{ p: 1.5 }}>
                  <TextField
                    type="date"
                    size="small"
                    fullWidth
                    value={dueOn ?? ""}
                    onChange={(event) => setDueOn(event.target.value || null)}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      onMouseDown={preventBlur}
                      onClick={() => selectDue(today)}
                    >
                      今日
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      fullWidth
                      onMouseDown={preventBlur}
                      onClick={() => selectDue(tomorrow)}
                    >
                      明日
                    </Button>
                  </Stack>
                  {dueOn && (
                    <Button
                      size="small"
                      fullWidth
                      sx={{ textTransform: "none" }}
                      onMouseDown={preventBlur}
                      onClick={() => selectDue(null)}
                    >
                      期限なしにする
                    </Button>
                  )}
                </Stack>
              </Paper>
            )}

            {locationOpen && (
              // 期限パネルと同じ absolute 配置。Popover を使わないのは
              // iOS でキーボード表示中に visual viewport とズレる問題を避けるため。
              <Paper
                elevation={4}
                sx={{
                  position: "absolute",
                  insetInlineStart: 0,
                  bottom: "100%",
                  mb: 1,
                  width: "16rem",
                  maxWidth: "100%",
                }}
              >
                <MenuList disablePadding>
                  <PurchaseLocationOptions
                    locations={locations}
                    selectedId={selectedLocation?.id ?? null}
                    onSelect={selectLocation}
                  />
                </MenuList>
              </Paper>
            )}
          </Stack>
        </ClickAwayListener>
      </Box>
    </Paper>
  );
}
