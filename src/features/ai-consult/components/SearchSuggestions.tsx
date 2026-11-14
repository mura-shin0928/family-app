"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useState } from "react";

const DEFAULT_HEIGHT = 72;

/**
 * Google 検索のグラウンディングの検索候補。規約で、検索を使った結果と一緒に表示する。
 * 中身は Google が返した HTML のまま、スクリプトを動かさない iframe に出す。
 * base で、候補のリンクは新しいタブで Google 検索を開く（iframe の中では開けない）。
 */
export function SearchSuggestions({ html }: { html: string }) {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);

  return (
    <Box sx={{ pt: 2 }}>
      <Typography
        variant="caption"
        component="p"
        sx={{ color: "text.secondary", mb: 0.5 }}
      >
        Google で調べる
      </Typography>
      <Box
        component="iframe"
        title="Google 検索の候補"
        srcDoc={`<meta name="color-scheme" content="light dark"><base target="_blank">${html}`}
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        onLoad={(event: React.SyntheticEvent<HTMLIFrameElement>) => {
          const body = event.currentTarget.contentDocument?.body;
          if (body) setHeight(body.scrollHeight);
        }}
        sx={{ width: "100%", height, border: 0, display: "block" }}
      />
    </Box>
  );
}
