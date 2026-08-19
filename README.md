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
npm run dev              # 開発サーバ
npm run build             # 本番ビルド
npm run typecheck         # tsc --noEmit
npm run lint               # biome check
npm run lint:ci             # biome ci（CI用）
npm run format               # biome format --write
npm run test                  # vitest run（unit）
npm run test:integration       # vitest run（RLS等、supabase start が必要）
npm run admin                   # 管理用CLI（下記）
```

## Family作成・招待

新しいFamilyはアプリ内からは作れない（管理側のみ）。`scripts/admin.mts` を使う。

```bash
cp .env.admin.example .env.admin.local   # SUPABASE_SERVICE_ROLE_KEY等を埋める（コミットしない）

npm run admin -- create-family --name "村上家" --yes
npm run admin -- invite --family <family_id> --email you@example.com --display-name "しん" --yes
npm run admin -- list-families
npm run admin -- list-invitations --family <family_id>
npm run admin -- revoke --invitation <invitation_id> --yes
```

書き込み系コマンドは `--yes` を付けない限り、接続先と内容を表示するだけで何も変更しない。

Familyに参加した既存メンバーは、アプリの `/family` 画面から新しいメンバーを招待できる
（自分が所属するFamily宛の招待のみ発行可能。DB側のRLSで強制される）。
発行された招待URL（`/invite/<token>`）は7日で失効し、1回受諾すると使えなくなる。
生トークンはDBに保存されない（sha256ハッシュのみ保存）ため、発行直後の画面以外では再表示できない。
