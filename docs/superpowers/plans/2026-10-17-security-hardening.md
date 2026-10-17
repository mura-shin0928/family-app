# セキュリティ監査の指摘対応 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 2026-10-17 の監査で出た F1〜F6 を、コード修正・回帰テスト・本番設定の確認で閉じる。

**Architecture:** アプリの認可モデル（RLS が最終防衛線、Server Action は zod + guard）は変えない。
CI の供給網リスクを固定バージョンと最小権限で塞ぎ、外部 API 由来の URL を既存の `isHttpUrl` で検証し、
列単位 GRANT による防御を統合テストで固定する。本番側の設定は PO が手順に沿って確認する。

**Tech Stack:** GitHub Actions, Next.js 16 / TypeScript, zod 4, vitest 5, Supabase (Postgres 17)

**Spec:** `docs/superpowers/specs/2026-10-17-security-audit.md`

## Global Constraints

- 新しい migration は作らない（本番 DB の権限は今の migration で正しい。確認だけ行う）。
- Supabase CLI のバージョンは `db.yml` と同じ `2.114.0` に揃える（型生成の書式が CLI の版で変わるため）。
- URL の検証は `src/lib/url.ts` の `isHttpUrl` を使い、新しい判定関数を作らない。
- コードコメントは簡潔に。経緯や事故の説明はコミットメッセージ / PR に書く。
- ローカル Supabase は全 worktree 共有。`supabase db reset` はしない（統合テストは runId 付きのデータで動く）。
- 本番での確認は PO が行う。Browser tool での実地確認はしない。

## Review Focus

- seido-data-hub が `license_url` に前後空白付きや大文字の `JAVASCRIPT:` を返す → `new URL` の正規化で
  `javascript:` 扱いになり、取得失敗（`unavailable`）になること。Task 2 のテストに含める。
- seido-data-hub が `http://`（https でない）の出典 URL を返す → 制度の `source_url` と同じく許可されること。
  Task 2 のテストに含める。
- メンバーが `municipality_code` と `recipe_analysis_daily_limit` を1回の UPDATE でまとめて書き換える
  → 許可列が混ざっていても文全体が拒否され、枠は変わらないこと。Task 3 のテストに含める。
- `permissions: contents: read` にしたあとも `actions/checkout`・`npm ci` のキャッシュ・`supabase link`
  が動くこと → Task 1 の PR の CI が green であることで確認する。
- CLI を固定したことで `migrate` が `--include-all` を解釈できなくなっていないこと → 2.114.0 は
  `db push --include-all` に対応済み。Task 1 で `supabase db push --help` の出力で確認する。

---

### Task 1: CI の供給網リスクを塞ぐ（F1, F2）

**Files:**
- Modify: `.github/workflows/ci.yml:3-17`（`permissions` を追加）, `.github/workflows/ci.yml:60`
- Modify: `.github/workflows/db.yml:9-19`（`permissions` を追加）

**Interfaces:**
- Consumes: なし
- Produces: なし

- [ ] **Step 1: `ci.yml` の `on:` と `jobs:` の間に最小権限を宣言する**

```yaml
permissions:
  contents: read
```

- [ ] **Step 2: `ci.yml` の `migrate` ジョブの `supabase/setup-cli` を `version: 2.114.0` にする**

コメントは1行だけ足す: `# 本番 DB の資格情報を渡すジョブなので latest にしない。db.yml と揃える。`

- [ ] **Step 3: `db.yml` にも同じ `permissions: contents: read` を `on:` と `jobs:` の間に入れる**

- [ ] **Step 4: 固定した版が `--include-all` に対応しているか確認する**

Run: `npx --yes supabase@2.114.0 db push --help | grep -- --include-all`
Expected: `--include-all` の説明行が1行出る

- [ ] **Step 5: `latest` が残っていないことを確認する**

Run: `grep -rn "version: latest" .github/workflows/`
Expected: 出力なし（exit 1）

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/db.yml
git commit -m "ci: Supabase CLI を固定し、ワークフローの権限を contents: read に絞る"
```

PR を出したら `check` ジョブが green になることを確認する（`migrate` は main への push でだけ動く。
マージ後の初回 `migrate` の成功を PO が Actions 画面で確認する）。

---

### Task 2: 出典リンクの URL を検証する（F3）

**Files:**
- Modify: `src/features/programs/api.ts:17-22`
- Test: `tests/unit/program-api.test.ts`（新規）

**Interfaces:**
- Consumes: `isHttpUrl(value: string): boolean`（`src/lib/url.ts`, 既存）
- Produces: なし（`getAreas()` / `getAreaPrograms()` / `getProgramCategories()` の型は変えない。
  `license_url` が http(s) でない応答は `{ ok: false, reason: "unavailable" }` になる）

- [ ] **Step 1: 失敗するテストを書く**

`tests/unit/recipe-extraction.test.ts:274-337` と同じく `vi.stubGlobal("fetch", ...)` で fetch を差し替え、
`vi.stubEnv("SEIDO_DATA_HUB_API_URL", "https://seido.example.test")` で設定済みにする。
`afterEach` で `vi.unstubAllGlobals()` と `vi.unstubAllEnvs()`。応答は
`{ ok: true, status: 200, json: async () => ({ data: [], attribution: { source: "東京都", license: "CC BY 4.0", license_url: <値>, notice: "" } }) }`。

```ts
describe("seido-data-hub の出典リンク", () => {
  it.each([
    "javascript:alert(1)",
    " javascript:alert(1)",
    "JAVASCRIPT:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "not a url",
  ])("license_url が %s なら取得失敗にする", async (licenseUrl) => {
    stubSeidoResponse(licenseUrl);
    expect(await getAreas()).toEqual({ ok: false, reason: "unavailable" });
  });

  it.each([
    "https://creativecommons.org/licenses/by/4.0/",
    "http://creativecommons.org/licenses/by/4.0/",
  ])("license_url が %s ならそのまま返す", async (licenseUrl) => {
    stubSeidoResponse(licenseUrl);
    const result = await getAreas();
    expect(result.ok && result.attribution.licenseUrl).toBe(licenseUrl);
  });
});
```

- [ ] **Step 2: テストが落ちることを確認する**

Run: `npx vitest run tests/unit/program-api.test.ts`
Expected: 「取得失敗にする」の5件が FAIL（`ok: true` が返る）、「そのまま返す」の2件は PASS

- [ ] **Step 3: `attributionSchema` の `license_url` を `z.string().refine(isHttpUrl)` にする**

`src/features/programs/api.ts` の `attributionSchema` だけを変える。表示側（`SearchTab.tsx`）は変えない。
応答の検証で落とすので、`get()` の既存の `unexpected body` ログと `unavailable` 経路にそのまま乗る。

- [ ] **Step 4: テストが通ることを確認する**

Run: `npx vitest run tests/unit/program-api.test.ts && npm run typecheck && npm run lint`
Expected: 7件 PASS、typecheck / lint ともエラーなし

- [ ] **Step 5: Commit**

```bash
git add src/features/programs/api.ts tests/unit/program-api.test.ts
git commit -m "fix: seido-data-hub の出典リンクを http(s) に限る"
```

---

### Task 3: 解析回数の上限を家族側から変えられないことをテストで固定する（F4）

**Files:**
- Modify: `tests/integration/rls-families.test.ts:185-193` の直後（`families_update_municipality_own policy` の describe 内）

**Interfaces:**
- Consumes: `signInAsClient`, `createAdminClient`（`tests/integration/support/supabase.ts`, 既存）、
  同ファイルの `userA`, `familyF1`, `PASSWORD`
- Produces: なし

このタスクは回帰防止のテストで、今のスキーマでは最初から PASS するのが正しい。
FAIL したら本番を含めて権限が開いているので、テストを直さずに止めて報告する。

- [ ] **Step 1: テストを2件足す**

```ts
it("a member cannot change their family's recipe analysis daily limit", async () => {
  const clientA = await signInAsClient(userA.email, PASSWORD);
  const { error } = await clientA
    .from("families")
    .update({ recipe_analysis_daily_limit: 100000 })
    .eq("id", familyF1);
  expect(error).not.toBeNull();
  expect(await dailyLimitOf(familyF1)).toBeNull();
});

it("a member cannot slip the daily limit into a municipality update", async () => {
  const clientA = await signInAsClient(userA.email, PASSWORD);
  const { error } = await clientA
    .from("families")
    .update({
      municipality_code: "131130",
      municipality_name: "渋谷区",
      recipe_analysis_daily_limit: 100000,
    })
    .eq("id", familyF1);
  expect(error).not.toBeNull();
  expect(await dailyLimitOf(familyF1)).toBeNull();
});
```

`dailyLimitOf(familyId: string): Promise<number | null>` は同じ describe 内のローカル関数として、
`admin` クライアントで `families.recipe_analysis_daily_limit` を `.single()` で読む
（`tests/integration/recipe-analysis-quota.test.ts:99-106` と同じ形）。F1 の上限は beforeAll で未設定（null）。

- [ ] **Step 2: テストを実行する**

前提: ローカル Supabase が起動していること（`docker ps` に `supabase_db_family-app`）。
起動していなければ `supabase start` だけ行い、`db reset` はしない。

Run: `npx vitest run -c vitest.integration.config.ts tests/integration/rls-families.test.ts`
Expected: 既存テストを含めて全件 PASS

- [ ] **Step 3: Commit**

```bash
git add tests/integration/rls-families.test.ts
git commit -m "test: 家族メンバーが解析回数の上限を変えられないことを固定する"
```

---

### Task 4: 本番設定の確認（F5, F6）— PO が実施

**Files:** なし（結果を PR の説明に書く）

**Interfaces:** なし

実装者はこの手順を PR 説明に貼り、PO に確認を依頼する。どれも読み取りだけで、設定は変えない。

- [ ] **Step 1: 本番 DB の権限を確認する（F6）**

Supabase Dashboard > SQL Editor で実行する:

```sql
select
  has_table_privilege('authenticated', 'public.families', 'UPDATE') as families_update_all,
  has_column_privilege('authenticated', 'public.families', 'recipe_analysis_daily_limit', 'UPDATE') as daily_limit_update,
  has_table_privilege('authenticated', 'public.invitations', 'UPDATE') as invitations_update_all,
  has_table_privilege('authenticated', 'public.admin_users', 'SELECT') as admin_users_select,
  has_table_privilege('authenticated', 'public.recipe_analysis_usage', 'UPDATE') as quota_update,
  has_table_privilege('authenticated', 'public.web_search_usage', 'UPDATE') as web_quota_update,
  has_table_privilege('anon', 'public.invitations', 'SELECT') as anon_invitations_select;
```

Expected: 7列すべて `false`。1つでも `true` なら、その表の不要な権限を revoke する migration を別タスクで作る。

- [ ] **Step 2: Redirect URL の許可リストを確認する（F5）**

Supabase Dashboard > Authentication > URL Configuration。
Expected: Site URL が `https://family-app-pi-hazel.vercel.app`、Redirect URLs が `/auth/callback` で終わる
完全な URL だけ（本番・`http://localhost:3000`・`http://127.0.0.1:3000`）。`*` や `**` を含む行があれば、
そのドメインを自分たちが管理しているか確認し、不要なら消す。

- [ ] **Step 3: Vercel の環境変数を確認する**

Vercel > Project Settings > Environment Variables。
Expected: `SUPABASE_SERVICE_ROLE_KEY`（や `service_role` / `sb_secret_` の値）が無い。
`GEMINI_API_KEY`・`TAVILY_API_KEY`・`SEIDO_DATA_HUB_API_URL` に `NEXT_PUBLIC_` が付いていない。

- [ ] **Step 4: GitHub の Actions 既定権限を確認する**

GitHub > Settings > Actions > General > Workflow permissions。
Expected: 「Read repository contents and packages permissions」。Task 1 で各ワークフローに書いたので
必須ではないが、今後追加するワークフローの既定を安全側にしておく。
