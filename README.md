# Family App

家族で、やること・買うもの・レシピを共有し、子育てにまつわるイベント・手続きを一覧化・記録する Web アプリ（PWA）。

## 画面

| パス | 内容 |
| --- | --- |
| `/tasks` | やること・買うものの一覧（`/` はここへリダイレクト） |
| `/tasks/settings` | 買う場所のマスタ |
| `/recipes` | レシピ（URL・本文・画像から材料を抽出し、買うものへ追加） |
| `/procedures` | 子育てにまつわる必要なイベント・手続きの一覧化と記録 |
| `/procedures/programs` | 家族の自治体の子育て支援制度（seido-data-hub から取得） |
| `/family` | メンバーの招待・削除、子ども・自治体の登録 |
| `/admin` | アプリ管理者向けの Family 作成・招待管理 |

## スタック

- Next.js (App Router) + TypeScript
- Supabase (Postgres / Auth / RLS / Realtime)
- MUI (Material UI) + Emotion
- TanStack Query
- Biome (lint / format)
- Vitest
- Vercel（リージョン `hnd1`）

## セットアップ

Node.js 24 以上が必要（`.node-version` 参照）。

```bash
npm install
cp .env.example .env.local   # 値を埋める
make db-reset                # ローカルSupabase起動 + migration適用（supabase start + db reset --local）
npm run dev
```

http://localhost:3000 を開く。

### 環境変数（`.env.local`）

| 変数 | 必須 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ○ | Supabase 接続 |
| `GEMINI_API_KEY` | — | レシピ本文・URL・画像からの材料抽出（Google AI Studio で発行） |
| `SEIDO_DATA_HUB_API_URL` | — | 自治体の子育て支援制度の取得 |

任意の変数は未設定でもアプリは動く。`GEMINI_API_KEY` が無いと解析機能だけが使えない
（レシピは手入力での保存はできる）。`SEIDO_DATA_HUB_API_URL` が無いと、制度一覧への導線と
「家族」画面の自治体の設定が出なくなる（`/procedures/programs` を直接開くと 404）。
画像取り込みは元画像を保存せず、解析（Gemini呼び出し）が終わったら破棄する。

### ローカルでのログイン

参加は招待の受諾経由のみなので、ローカルでは `scripts/dev-login.mjs` で
ユーザーと Family を直接作ってからログインする。

```bash
npm run dev:login -- taro@example.test 太郎
```

ログイン画面でメールアドレスを入力してリンクを送り、届いたメールを
Mailpit（http://127.0.0.1:54324 ）から開く。

## スクリプト

```bash
npm run dev               # 開発サーバ
npm run build             # 本番ビルド
npm run typecheck         # next typegen && tsc --noEmit
npm run lint              # biome check
npm run lint:ci           # biome ci（CI用）
npm run format            # biome format --write
npm run test              # vitest run（unit）
npm run test:integration  # vitest run（RLS等、supabase start が必要。CIでは動かさない）
npm run admin             # 管理用CLI（下記）
npm run dev:login         # ローカル用ログイン準備（上記）
```

Gemini の疎通確認用に `scripts/gemini-smoke.mjs` / `scripts/gemini-image-smoke.mjs` がある
（`node --env-file=.env.local scripts/gemini-smoke.mjs`）。

## CI / デプロイ

- `.github/workflows/ci.yml` が PR と main への push で typecheck / lint / unit test / build を実行する
  （`*.md` だけの変更では動かない）。
- main への push では、続けて `supabase db push` で本番DBに migration を適用する。
- デプロイは Vercel が main から行う。

## Family作成・招待

新しい Family は、一般メンバーはアプリ内から作れない。アプリ管理者（`admin_users` に登録されたユーザー）が
`/admin` 画面から作るか、`scripts/admin.mts` を使う。

```bash
cp .env.admin.example .env.admin.local   # SUPABASE_SERVICE_ROLE_KEY等を埋める（コミットしない）

npm run admin -- create-family --name "山田家" --yes
npm run admin -- invite --family <family_id> --email you@example.com --display-name "たろう" --yes
npm run admin -- list-families
npm run admin -- list-members --family <family_id>
npm run admin -- list-invitations --family <family_id>
npm run admin -- revoke --invitation <invitation_id> --yes
npm run admin -- remove-member --member <family_member_id> --yes

# アプリ管理者（/admin に入れるユーザー）の管理
npm run admin -- grant-admin --email you@example.com --yes
npm run admin -- revoke-admin --email you@example.com --yes
npm run admin -- list-admins
```

書き込み系コマンドは `--yes` を付けない限り、接続先と内容を表示するだけで何も変更しない。

Familyに参加した既存メンバーは、アプリの `/family` 画面から新しいメンバーを招待できる
（自分が所属するFamily宛の招待のみ発行可能。DB側のRLSで強制される）。
発行された招待URL（`/invite/<token>`）は7日で失効し、1回受諾すると使えなくなる。
生トークンはDBに保存されない（sha256ハッシュのみ保存）ため、発行直後の画面以外では再表示できない。

`/family` 画面からもメンバーを削除できるが、消えるのは `family_members` 行だけで
本人のログイン（auth.users）は残る。認証情報ごと完全に削除したい場合は
`remove-member` を使う（service_role が要るためアプリからは行わない）。
