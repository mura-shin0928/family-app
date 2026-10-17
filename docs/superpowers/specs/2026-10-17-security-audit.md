# セキュリティ監査結果（2026-10-17）

対象: `main` @ `5b90774`。アプリコード（`src/`）、Supabase migration と実際の権限、`supabase/config.toml`、
`next.config.ts`、GitHub Actions、依存関係、git 履歴の秘密情報。

## 結論

**Critical / High は無し。** 認可は RLS + security definer/invoker 関数で一貫しており、
全 Server Action が入力検証（zod）と `requireFamilyMember()` / `requireAppAdmin()` を通っている。
SSRF ガード（`guarded-request.ts` / `ip-guard.ts`）は接続時の DNS 解決結果を検査しており、
DNS rebinding・IPv4-mapped IPv6・リダイレクトのホップごとの検査まで押さえている。

## 確認したこと（問題なし）

- ローカル DB の実権限を `information_schema` で確認。`families` の UPDATE は
  `municipality_code, municipality_name` 列だけ、`invitations` は `revoked_at` 列だけ。
  `admin_users` / `*_usage` は anon・authenticated に SELECT/INSERT/UPDATE/DELETE が無い。
- security definer 関数はすべて `set search_path = public`、`auth.uid()` 起点で family を解決。
  anon が実行できるのは `check_invite_email`（トークン必須）と trigger 関数だけ。
- 招待トークンは 32 byte 乱数、DB には sha256 のみ。ログイン後の戻り先は
  `sanitizeNextPath` の固定パターンのみで open redirect なし。
- 画面の外部リンクは `isHttpUrl` で `javascript:` を弾いている（下記 F2 を除く）。
  `dangerouslySetInnerHTML` / `eval` は使っていない。
- Gemini / Tavily キーはヘッダーで送り、ログに出さない。外部 API 呼び出しの前に家族単位の日次枠を消費。
- `npm audit`: 脆弱性 0 件。git 全履歴に実キーなし（Supabase ローカルのデモキーのみ）。
- CI が `src/` での `SERVICE_ROLE` 参照を禁止している。

## 指摘事項

| ID | 重要度 | 内容 | 根拠 | 対応 |
|----|--------|------|------|------|
| F1 | Medium | 本番 DB の DB パスワードと Supabase アクセストークンを持つ `migrate` ジョブが、Supabase CLI を `version: latest` で取得している。上流のリリースが侵害されると本番 DB の資格情報がそのまま渡る。`db.yml` は `2.114.0` に固定済みで揃っていない | `.github/workflows/ci.yml:60` | 修正（Task 1） |
| F2 | Medium | ワークフローに `permissions:` が無く、`GITHUB_TOKEN` の権限がリポジトリ設定の既定（書き込みの可能性あり）に従う。どのジョブも書き込みは不要 | `.github/workflows/ci.yml`, `db.yml` | 修正（Task 1） |
| F3 | Low | seido-data-hub の `attribution.license_url` を検証せずに `href` に流している。上流 API が `javascript:` を返すとクリックで XSS。制度の `source_url` は `isHttpUrl` で弾いているのに、出典リンクだけ抜けている | `src/features/programs/api.ts:17-22`, `src/features/life-events/components/SearchTab.tsx:402` | 修正（Task 2） |
| F4 | Low（回帰防止） | 家族メンバーが自分の `families.recipe_analysis_daily_limit` を書き換えられると Gemini の日次枠を外せる。今は列単位の GRANT で防げているが、これを固定するテストが無い（`name` の改名だけテストされている） | `supabase/migrations/20260913120000_add_municipality_and_procedure_url.sql:9-14`, `tests/integration/rls-families.test.ts:185` | テスト追加（Task 3） |
| F5 | Low（要確認） | `sendInviteLoginLink` が `Host` ヘッダーから `emailRedirectTo` を組み立てている。Supabase の Redirect URL 許可リストが完全一致なら偽の Host は `site_url` に落ちるので実害は無いが、本番の許可リストにワイルドカードがあると、招待メールのログインリンクを攻撃者のドメインへ向けられる | `src/features/invitations/actions.ts:181-201` | 本番設定の確認（Task 4） |
| F6 | 要確認 | 本番 DB の権限がローカル（migration から作った状態）と一致しているかはリポジトリからは確認できない。古い既定権限のまま作られていると F4 が実際に開く | — | 本番設定の確認（Task 4） |

## 対応しないもの（理由つき）

- **CSP に `script-src` が無い**: nonce 必須で static shell を失うという判断が `next.config.ts` に明記済み。
  React のエスケープと `isHttpUrl` で XSS の入口は閉じている。
- **`login_redirect` Cookie に `Secure` が無い**: `vercel.app` は HSTS preload 済みで HTTP で送られる経路が無い。
- **anon / authenticated に TRUNCATE・TRIGGER・REFERENCES・MAINTAIN が付いている**: Supabase の既定。
  PostgREST からは発行できず、動的 SQL を実行する関数も無い。
- **`proxy.ts` の `PUBLIC_PATHS` が前方一致**（`/invitex` なども素通し）: 該当するページが無く、
  各ページが `requireFamilyMember()` を呼ぶので影響なし。
- **サインアップが誰でもできる**: 招待で新規ユーザーを作るため必要。未所属ユーザーは RLS で何も読めず、
  外部 API の枠関数も `not_a_family_member` で落ちる。
- **家族メンバーが他メンバーを削除できる / 取り消した招待を戻せる**: 夫婦が対等という信頼モデル上の仕様。
