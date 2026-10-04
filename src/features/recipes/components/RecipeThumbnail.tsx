"use client";

import Box from "@mui/material/Box";
import { useState } from "react";
import { PotIllustration } from "@/components/EmptyState";

const SIZE = 56;

/** 一覧の左端に出す代表画像。画像がない・読み込めないときは鍋のイラストを出す。 */
export function RecipeThumbnail({ imageUrl }: { imageUrl: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== null && imageUrl !== failedUrl;

  return (
    <Box
      sx={{
        flexShrink: 0,
        width: SIZE,
        height: SIZE,
        borderRadius: 1,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "action.hover",
        color: "text.disabled",
      }}
    >
      {showImage ? (
        // 取り込み元サイトの画像を直接出す。next/image は任意のホストを許可できない。
        // biome-ignore lint/performance/noImgElement: 上記のとおり
        <img
          src={imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(imageUrl)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <PotIllustration size={32} />
      )}
    </Box>
  );
}
