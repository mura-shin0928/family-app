# Family App

家族（Family）内でこれからやること・買うものを共有し、期限を把握するための Web アプリ（PWA）。

## スタック

- Next.js (App Router) + TypeScript
- Supabase (Postgres / Auth / RLS)
- Tailwind CSS + shadcn/ui
- Biome (lint / format)
- Vitest / Playwright

## セットアップ

```bash
npm install
npm run dev
```

http://localhost:3000 を開く。

## スクリプト

```bash
npm run dev         # 開発サーバ
npm run build        # 本番ビルド
npm run typecheck    # tsc --noEmit
npm run lint          # biome check
npm run lint:ci       # biome ci（CI用）
npm run format        # biome format --write
npm run test           # vitest run
```
