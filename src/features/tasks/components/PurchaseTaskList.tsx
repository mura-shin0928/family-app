"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { type ReactNode, useState } from "react";
import type { PurchaseLocation } from "@/features/purchase-locations/types";
import {
  filterByPurchaseLocation,
  type PurchaseLocationSelection,
} from "../purchase-filter";
import type { TaskDTO } from "../types";
import { BucketSection, CompletedSection } from "./TaskSections";

/**
 * 「買うもの」だけの一覧。期限の緊急度ではなく、売り場を回る順（sort_order）で見せる。
 * 場所フィルタの選択はここで持つので、表示を閉じると選択も消える。
 * 親の Stack の間隔をそのまま受けるため、ルートは Fragment にしている。
 */
export function PurchaseTaskList({
  open,
  completedToday,
  locations,
  renderRow,
}: {
  open: TaskDTO[];
  completedToday: TaskDTO[];
  locations: PurchaseLocation[];
  renderRow: (task: TaskDTO) => ReactNode;
}) {
  const [locationSelection, setLocationSelection] =
    useState<PurchaseLocationSelection>("all");

  const purchaseOpen = open
    .filter((task) => task.isPurchase)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const purchaseCompletedToday = completedToday.filter(
    (task) => task.isPurchase,
  );

  const knownLocationIds = new Set(locations.map((location) => location.id));
  // 選択中の場所idが削除済みなら「すべて」に戻す（行き止まりの空表示を避ける）。
  const effectiveSelection: PurchaseLocationSelection =
    locationSelection === "all" ||
    locationSelection === "none" ||
    knownLocationIds.has(locationSelection)
      ? locationSelection
      : "all";
  const filteredOpen = filterByPurchaseLocation(
    purchaseOpen,
    effectiveSelection,
    knownLocationIds,
  );
  const filteredCompletedToday = filterByPurchaseLocation(
    purchaseCompletedToday,
    effectiveSelection,
    knownLocationIds,
  );

  return (
    <>
      {locations.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Chip
            label="すべて"
            size="small"
            clickable
            color={effectiveSelection === "all" ? "primary" : "default"}
            variant={effectiveSelection === "all" ? "filled" : "outlined"}
            onClick={() => setLocationSelection("all")}
          />
          {locations.map((location) => (
            <Chip
              key={location.id}
              label={location.name}
              size="small"
              clickable
              color={effectiveSelection === location.id ? "primary" : "default"}
              variant={
                effectiveSelection === location.id ? "filled" : "outlined"
              }
              onClick={() => setLocationSelection(location.id)}
            />
          ))}
          <Chip
            label="未設定"
            size="small"
            clickable
            color={effectiveSelection === "none" ? "primary" : "default"}
            variant={effectiveSelection === "none" ? "filled" : "outlined"}
            onClick={() => setLocationSelection("none")}
          />
        </Box>
      )}

      {filteredOpen.length > 0 && (
        <BucketSection label="買うもの" count={filteredOpen.length}>
          {filteredOpen.map(renderRow)}
        </BucketSection>
      )}

      {filteredCompletedToday.length > 0 && (
        <CompletedSection count={filteredCompletedToday.length}>
          {filteredCompletedToday.map(renderRow)}
        </CompletedSection>
      )}

      {filteredOpen.length === 0 && filteredCompletedToday.length === 0 && (
        <Typography
          variant="body1"
          color="textSecondary"
          align="center"
          sx={{ py: 8 }}
        >
          {effectiveSelection === "all"
            ? "買うものはありません。"
            : "この場所の買うものはありません。"}
        </Typography>
      )}
    </>
  );
}
