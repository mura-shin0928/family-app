# ライフイベント「探す・記録」 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 旧「手続き」画面を、カタログを探してタスクにする「探す」と、子供ごとの「記録」の2タブに作り直す。やることの登録はタスク画面に一本化する。

**Architecture:**
- カタログ（テンプレ＋自治体の制度）はコードと API に置く。DB には家族が手を付けた項目だけを `life_event_items` に持つ。
- タスクは `tasks.life_event_item_id` で項目を参照する。完了・完了解除・削除の同期は **DB トリガー** で行う。
  - spec では「Server Action で」としていたが、タスク更新と同じトランザクションで確実に揃い、統合テストでも検証できるので、トリガーに変える。同期のルール自体は spec のとおり。
- 画面は `/life-events`。旧 `/procedures`・`/procedures/programs`・旧テーブルは削除する。

**Tech Stack:** Next.js 16 (App Router, Server Actions) / React 19 / MUI 9 / Supabase (Postgres + RLS) / zod 4 / TanStack Query 5 / Vitest

**Spec:** `docs/superpowers/specs/2026-10-02-life-events-search-and-record-design.md`

## Global Constraints

- ページタイトル：`/tasks`＝「タスク」、`/recipes`＝「レシピ」、`/life-events`＝「ライフイベント」。BottomNav の `aria-label` も同じにする。
- `/procedures` は削除する。リダイレクトは置かない。
- 画面の文言は日本語。探すタブの絞り込みチップは「いまの時期 / 妊活 / 妊娠 / 出産 / 保育園入園 / 小学校入学」。
- いまの時期＝目安日が「今日(JST)の30日前〜90日後」（両端を含む）。目安日の昇順で並べる。
- `life_event_items.status` は `in_task` / `done` の2値。`(status = 'done') = (done_on is not null)`。
- 行政／慣習の区別（`isGovernment`）、見送り（`skipped`）、`event_start` 基準は持たない。
- タスク画面のチップ：オフのときは「記録」、オンのときは「📝 {子の表示名}の記録」。行のチップは「📝 {子の表示名}」。
- 文字数上限：`title` ≤ 100、`note` ≤ 2000（既存の CHECK 制約と同じ）。
- コードコメントは簡潔にする。経緯は書かない（判断の理由はコミットや PR に書く）。
- ローカルの Supabase は全 worktree で共有している。`supabase db reset` は実行前に必ずユーザーに確認する。migration の適用は `supabase migration up --local` で行う。
- CI は `test:integration` を実行しない。統合テストはローカルで実行する。

## Review Focus

1. **子に予定日も出生日もない**（妊活中など）：いまの時期は0件になり、「イベントのチップから探してください」という案内を出す。→ Task 2 のテスト、Task 7 の手順
2. **深夜(JST)にタスクを完了した**（UTC では前日）：`done_on` は JST の日付になる。→ Task 4 のトリガーのテスト
3. **夫婦が同時に同じカタログ項目を「やることに追加」した**：部分ユニークに当たった側は、既存の行を再利用し、エラーにしない。→ Task 4 のユニークのテスト、Task 5 の再試行
4. **「タスクにある」項目を「もうやった」で記録したあと、そのタスクを完了・完了解除・削除した**：手で付けた記録が巻き戻らない。→ Task 5 で、記録時にタスクの参照を外す。Task 4 で、参照のないタスクは同期しないことをテストする
5. **検索語の表記揺れ**（全角／半角、カタカナ／ひらがな、大文字／小文字）：同じ項目が当たる。→ Task 2 のテスト

---

## File Structure

| ファイル | 役割 |
|---|---|
| `src/features/life-events/types.ts` | `LifeEventKind`・`CatalogItem`・`LifeEventItem` の型（旧型は Task 9 で削除する） |
| `src/features/life-events/catalog.ts` | テンプレのカタログ（`LIFE_EVENT_CATALOG`）と種別の表示名。`default-templates.ts` を置き換える |
| `src/features/life-events/search.ts` | 目安日の計算、いまの時期、検索一致、状態の突き合わせ（純粋関数） |
| `src/features/life-events/program-catalog.ts` | seido-data-hub の `Program` → `CatalogItem` 変換（純粋関数） |
| `src/features/life-events/item-queries.ts` | `life_event_items` の読み取り |
| `src/features/life-events/item-schema.ts` | Server Action の zod スキーマ |
| `src/features/life-events/item-actions.ts` | Server Action（やることに追加／もうやった／記録の編集／制度の取得） |
| `src/features/life-events/components/LifeEventsScreen.tsx` | 子供タブと「探す｜記録」の切り替え |
| `src/features/life-events/components/SearchTab.tsx` | 検索欄・チップ・一覧・制度の区分 |
| `src/features/life-events/components/CatalogItemRow.tsx` / `CatalogItemSheet.tsx` | 行と詳細シート |
| `src/features/life-events/components/AddToTaskDialog.tsx` | 既存の `LifeEventListScreen` 内のダイアログを切り出したもの |
| `src/features/life-events/components/RecordTab.tsx` | 記録タブ |
| `src/features/life-events/components/RecordDoneDialog.tsx` | 既存のものを流用する |
| `src/app/(app)/life-events/page.tsx` | ページ |
| `supabase/migrations/20261002120000_life_event_items.sql` | テーブル・RLS・トリガー・移行・旧テーブルの drop |
| `tests/unit/life-event-catalog.test.ts` / `life-event-search.test.ts` / `life-event-program-catalog.test.ts` | 単体テスト |
| `tests/integration/rls-life-event-items.test.ts` | RLS・ユニーク・トリガーの統合テスト（`rls-life-events.test.ts` を置き換える） |

---

### Task 1: カタログの型とテンプレの移し替え

**Files:**
- Modify: `src/features/life-events/types.ts`（新しい型を追加する。旧型はまだ残す）
- Create: `src/features/life-events/catalog.ts`
- Test: `tests/unit/life-event-catalog.test.ts`

**Interfaces:**
- Produces:
  - `type CatalogTiming = { kind: TimingKind; anchor: "birth" | "expected_birth"; offsetDays: number }`
  - `type CatalogItem = { key: string; kind: LifeEventKind; title: string; summary: string; note: string | null; aliases: string[]; timing: CatalogTiming | null; url: string | null }`
  - `const LIFE_EVENT_KINDS: readonly { kind: LifeEventKind; label: string }[]`。並びは 妊活, 妊娠, 出産, 保育園入園, 小学校入学
  - `const LIFE_EVENT_CATALOG: readonly CatalogItem[]`
  - `function findCatalogItem(key: string): CatalogItem | undefined`

- [ ] **Step 1: 失敗するテストを書く**

```ts
describe("LIFE_EVENT_CATALOG", () => {
  it("key は一意", () => {
    const keys = LIFE_EVENT_CATALOG.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it("key は `${kind}:` で始まり、英小文字・数字・ハイフンの slug", () => {
    for (const i of LIFE_EVENT_CATALOG)
      expect(i.key).toMatch(new RegExp(`^${i.kind}:[a-z0-9-]+$`));
  });
  it("妊活の項目は時期を持たない", () => {
    for (const i of LIFE_EVENT_CATALOG.filter((i) => i.kind === "preconception"))
      expect(i.timing).toBeNull();
  });
  it("既存テンプレの項目を落とさず移す（45件）", () => {
    expect(LIFE_EVENT_CATALOG).toHaveLength(45);
  });
  it("出生届は出生日から14日以内（deadline, birth, 13）", () => {
    expect(findCatalogItem("birth:birth-registration")?.timing).toEqual({
      kind: "deadline", anchor: "birth", offsetDays: 13,
    });
  });
});
```

（45件と出生届の値は、既存の `default-templates.ts` を数えて確かめてから書く。違えば実数に直す。）

- [ ] **Step 2: 実行して失敗を確認する**

Run: `npx vitest run tests/unit/life-event-catalog.test.ts`
Expected: FAIL（`catalog` モジュールがない）

- [ ] **Step 3: `catalog.ts` を実装する**
  - `default-templates.ts` の各項目を `CatalogItem` に移し替える。
  - `title`・`note`・`timingKind`/`anchorEvent`/`offsetDays` はそのまま引き継ぐ。
  - `summary: ""`、`aliases: []`、`url: null` とする。
  - `anchorEvent` が `event_start` または null のものは `timing: null` にする。
  - `isGovernment` は捨てる。
  - `key` は項目の意味を表す英語の slug にする。

- [ ] **Step 4: 実行して通ることを確認する**

Run: `npx vitest run tests/unit/life-event-catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/life-events/types.ts src/features/life-events/catalog.ts tests/unit/life-event-catalog.test.ts
git commit -m "feat: ライフイベントのカタログを安定した key 付きの形で持つ"
```

---

### Task 2: 探すための純粋ロジック

**Files:**
- Create: `src/features/life-events/search.ts`
- Test: `tests/unit/life-event-search.test.ts`

**Interfaces:**
- Consumes: `CatalogItem`, `LifeEventItem`（Task 1。`LifeEventItem` もこのタスクで `types.ts` に足す）
  - `type LifeEventItem = { id: string; childId: string; catalogKey: string | null; title: string; note: string | null; status: "in_task" | "done"; doneOn: DateString | null }`
- Produces:
  - `type ChildDates = { birthDate: DateString | null; expectedBirthDate: DateString | null }`
  - `function resolveTargetDate(item: CatalogItem, child: ChildDates): DateString | null`
  - `function selectCurrentItems(items: readonly CatalogItem[], child: ChildDates, today: DateString): CatalogItem[]`。窓の中のものを目安日の昇順で返す。
  - `function matchesQuery(item: CatalogItem, query: string): boolean`。`title`・`aliases`・`summary` に部分一致するか。空の query は true。
  - `function normalizeForSearch(text: string): string`。NFKC → 小文字 → カタカナをひらがなにする。
  - `type ItemState = { status: "in_task" } | { status: "done"; doneOn: DateString } | { status: "none" }`
  - `function itemStateFor(catalogKey: string, childId: string, items: readonly LifeEventItem[]): ItemState`
  - `function describeTiming(item: CatalogItem, child: ChildDates): string | null`。「2026/9/30までが目安」「2026/10/1ごろが目安」の形。既存の `formatSlashDate` を使う。

- [ ] **Step 1: 失敗するテストを書く**（主なアサーション）

```ts
const born = { birthDate: "2026-08-20", expectedBirthDate: "2026-08-25" };
const today = "2026-10-02";

it("窓は今日の30日前〜90日後を両端含む", () => {
  const at = (offsetDays: number) => item({ anchor: "birth", offsetDays });
  // 2026-09-02 = 今日-30、2026-12-31 = 今日+90
  expect(selectCurrentItems([at(13)], born, today)).toHaveLength(1);  // 09-02
  expect(selectCurrentItems([at(12)], born, today)).toHaveLength(0);  // 09-01
  expect(selectCurrentItems([at(133)], born, today)).toHaveLength(1); // 12-31
  expect(selectCurrentItems([at(134)], born, today)).toHaveLength(0); // 2027-01-01
});
it("目安日の昇順に並べる", ...);
it("時期のない項目は出さない", ...);
it("子に日付がなければ0件", () => {
  expect(selectCurrentItems(all, { birthDate: null, expectedBirthDate: null }, today)).toEqual([]);
});
it("expected_birth 基準の項目は、出生後も予定日から計算する", ...);
it("表記揺れを吸収する", () => {
  expect(matchesQuery(item({ title: "ベビー用品を準備する" }), "べびー")).toBe(true);
  expect(matchesQuery(item({ title: "ＡＢＣ検査" }), "abc")).toBe(true);
  expect(matchesQuery(item({ title: "x", aliases: ["出生の届出"] }), "届出")).toBe(true);
});
it("状態：同じ子・同じ key の行で判定し、他の子の行は見ない", ...);
```

`item(...)` は、テストファイル内に置く `CatalogItem` の既定値を持つファクトリ。

- [ ] **Step 2: 実行して失敗を確認する** — `npx vitest run tests/unit/life-event-search.test.ts` → FAIL
- [ ] **Step 3: `search.ts` を実装する**。カタカナをひらがなにする処理は、コードポイントの範囲 `U+30A1–U+30F6` を `-0x60` する。
- [ ] **Step 4: 実行して通ることを確認する** — 同じコマンドで PASS
- [ ] **Step 5: Commit** — `feat: いまの時期・検索・状態の突き合わせを純粋関数で足す`

---

### Task 3: 自治体の制度をカタログの形にする

**Files:**
- Create: `src/features/life-events/program-catalog.ts`
- Test: `tests/unit/life-event-program-catalog.test.ts`

**Interfaces:**
- Consumes: `Program`, `programTitle`（`features/programs`）、`CatalogItem`
- Produces:
  - `function programToCatalogItem(program: Program): CatalogItem`
    - `key = "program:" + program.id`
    - `title = programTitle(program)`
    - `url = program.sourceUrl`
    - `summary = ""`、`aliases = program.shortName ? [program.canonicalName] : []`
    - `note = null`、`timing = null`
    - `kind` は次の順で決める：カテゴリ `002` を含むか対象者 `086` なら `"pregnancy"`、`004` なら `"nursery"`、それ以外は `"birth"`
  - `function programsToCatalog(programs: Program[], ageMonths: number | null): CatalogItem[]`
    - `selectPrograms(programs, { ageMonths, category: "all" })` で重複をまとめてから変換する。

- [ ] **Step 1: 失敗するテストを書く**
  - kind の対応 3パターン（`002`、`086` のみ、`004`、`003` のみ → `birth`）
  - `shortName` があるときは `canonicalName` が aliases に入ること
  - 同じページの重複が1件になること
- [ ] **Step 2: 実行して失敗を確認する** — `npx vitest run tests/unit/life-event-program-catalog.test.ts`
- [ ] **Step 3: 実装する**
- [ ] **Step 4: 実行して通ることを確認する**
- [ ] **Step 5: Commit** — `feat: 自治体の制度をライフイベントのカタログ項目に変換する`

---

### Task 4: migration（テーブル・RLS・同期トリガー・移行）

**Files:**
- Create: `supabase/migrations/20261002120000_life_event_items.sql`
- Create: `tests/integration/rls-life-event-items.test.ts`
- Delete: `tests/integration/rls-life-events.test.ts`

**Interfaces:**
- Produces:
  - テーブル `life_event_items(id, family_id, child_id, catalog_key, title, note, status, done_on, created_by, created_at, updated_at, deleted_at)`
  - `tasks.life_event_item_id`

migration の中身（この順）:
1. **テーブルを作る**
   - `create table public.life_event_items`。列は spec §2 のとおり。
   - CHECK：`status in ('in_task','done')`、`(status = 'done') = (done_on is not null)`、`title` は 1〜100 文字、`note` は 2000 文字以下、`catalog_key` は 200 文字以下。
   - 部分ユニーク：`unique (child_id, catalog_key) where deleted_at is null and catalog_key is not null`
   - index：`(family_id) where deleted_at is null`
   - `updated_at` のトリガーは、既存テーブルと同じ関数を使う。
2. **RLS**
   - 旧 `life_event_procedures` と同じ形（select / insert / update。delete ポリシーは置かない）。
   - insert と update の with check には、次の2つを入れる。
     - `children c where c.id = child_id and c.family_id = life_event_items.family_id`
     - `created_by` が同じ家族のメンバーであること
   - `grant ... to service_role` も旧テーブルと同じにする。
3. **tasks の列を足す**
   - `alter table public.tasks add column life_event_item_id uuid references public.life_event_items(id)`
4. **同期トリガー**
   - `tasks` の after update に、`life_event_item_id is not null` のときだけ動く関数 `sync_life_event_item_from_task()` を付ける。security invoker で動かす。
   - old と new の比較で、次のように更新する。
     - `open → done`：`update life_event_items set status='done', done_on=(new.completed_at at time zone 'Asia/Tokyo')::date where id=new.life_event_item_id and status='in_task' and deleted_at is null`
     - `done → open`：`set status='in_task', done_on=null where ... and status='done'`
     - `deleted_at` が null から非 null に変わった：`set deleted_at=now() where ... and status='in_task'`
5. **移行**
   - `life_event_procedures` の `status='done'` で `deleted_at is null` の行を `life_event_items` へ `done` で insert する。
     - `id` は新しく振る。`title`・`note`・`done_on`・`child_id`・`family_id`・`created_by` を引き継ぐ。
   - `catalog_key` は、`(life_events.kind, life_event_procedures.title)` を対応表 `values (kind, title, key), ...` と照らして入れる。`legacy` の行も、種別と項目名で引ける。
     - 対応表は Task 1 の `LIFE_EVENT_CATALOG` から生成して貼る。
     - 例：`node -e` で `import` して `(kind, title, key)` を出力する一回きりのスクリプトを使う。スクリプトはコミットしない。
6. **旧テーブルを drop する**
   - `drop table public.life_event_procedures; drop table public.life_events;`

- [ ] **Step 1: 統合テストを書く**（既存の `rls-life-events.test.ts` の準備コードを流用する）
  - 他家族のメンバーは select で0行、insert は拒否される。
  - 他家族の子の `child_id` では insert が拒否される。
  - 同じ `(child_id, catalog_key)` の2行目の insert は、ユニーク違反（`23505`）になる。論理削除済みの行があれば作れる。
  - トリガー（家族メンバーとしてタスクを作り、`life_event_item_id` を付けて操作する）
    - 完了：`completed_at = '2026-10-01T15:30:00Z'` で done にすると、`status='done'`、`done_on='2026-10-02'` になる。
    - 完了解除：`in_task`、`done_on=null` に戻る。
    - `in_task` の項目のタスクを削除する：項目の `deleted_at` が入る。
    - `done` の項目のタスクを削除する：項目は変わらない。
    - `life_event_item_id` が null のタスクを完了しても、どの項目も変わらない。
- [ ] **Step 2: migration を適用する**
  - `supabase migration up --local`
  - 履歴がずれていて失敗したら、メモリの「ローカル migration 履歴のずれ」の手順で対処する。`db reset` はユーザーに確認してから行う。
- [ ] **Step 3: 統合テストを実行する** — `npm run test:integration -- tests/integration/rls-life-event-items.test.ts` → PASS
- [ ] **Step 4: Commit** — `feat: life_event_items とタスク連動のトリガーを足し、旧テーブルを移行して消す`

---

### Task 5: 項目の読み取りと Server Action

**Files:**
- Create: `src/features/life-events/item-queries.ts`, `item-schema.ts`, `item-actions.ts`

**Interfaces:**
- Consumes: `findCatalogItem`（Task 1）、`programToCatalogItem`／`programsToCatalog`（Task 3）、`getFamilyMunicipality`、`getAreaPrograms`、`getAreas`、`ageInMonths`
- Produces（すべて `ActionResult = { ok: true } | { ok: false; error: string }` 系を返す）:
  - `getLifeEventItems(familyId: string): Promise<LifeEventItem[]>`（server-only）
  - `addLifeEventItemToTask(input: { childId: string; catalogKey: string; title: string; dueOn: string }): Promise<{ ok: true; taskId: string } | { ok: false; error: string }>`
    1. `in_task` の行を insert する。`23505` なら既存の行を select して使う。既存が `done` なら「すでに記録されています」とエラーを返す。
    2. 行の `title` はカタログ項目の `title` にする。テンプレは `findCatalogItem` で、制度は呼び出し側から渡す `title` で決める。
    3. タスクを insert する（`title`・`due_on` は入力値、`note`・`url` はカタログ項目のもの、`life_event_item_id` 付き）。
  - `recordLifeEventItemDone(input: { childId: string; catalogKey: string; title: string; doneOn: string }): Promise<ActionResult>`
    - 行がなければ `done` で作り、`in_task` なら `done` に更新する。
    - 更新した場合は、その行を参照しているタスクの `life_event_item_id` を null にする（Review Focus 4）。
  - `updateLifeEventItemDoneOn(input: { id: string; doneOn: string })`, `updateLifeEventItemNote(input: { id: string; note: string })`, `removeLifeEventItem(input: { id: string })`（論理削除）
  - `fetchAreaCatalog(input: { childId: string }): Promise<{ ok: true; municipalityName: string; items: CatalogItem[]; attribution: Attribution } | { ok: false; reason: "not_configured" | "no_municipality" | "error" }>`
    - 子の出生日から `ageInMonths` を求め、`programsToCatalog` に渡す。
- 「やることに追加」の Undo は、既存の `deleteTask` を呼ぶ（トリガーで行が消えるので、専用の Action は作らない）。

- [ ] **Step 1: zod スキーマを書く**
  - 日付は `YYYY-MM-DD`。`dueOn` だけは空文字も許す。
  - `title` は 1〜100 文字、`note` は 2000 文字以下か空文字。
  - `catalogKey` は 1〜200 文字。
- [ ] **Step 2: 上の Action を実装する**
  - 認可は `requireFamilyMember` と RLS に任せる。
  - `childId` が自家族の子であることを先に select して確かめる（`/families` の他 Action と同じ流儀）。
- [ ] **Step 3: 型とリントを確認する** — `npm run typecheck && npm run lint` → エラーなし
- [ ] **Step 4: Commit** — `feat: ライフイベント項目をタスクにする・記録する Server Action を足す`

---

### Task 6: タスク画面の「記録」

**Files:**
- Modify: `src/features/tasks/types.ts`, `queries.ts`, `schema.ts`, `actions.ts`
- Modify: `src/features/tasks/components/QuickCaptureBar.tsx`, `TaskRow.tsx`, `TaskListScreen.tsx`
- Modify: `src/app/(app)/tasks/page.tsx`, `src/app/(app)/tasks/loading.tsx`

**Interfaces:**
- Produces:
  - `TaskDTO.recordChildId: string | null`
    - `getTasks` の select に `life_event_items(child_id)` を足して埋める。
    - `TaskListScreen` の楽観更新の `add` でも埋める。
  - `createTask(input: { ...今の引数; recordChildId: string })`
    - `""` なら記録しない。
    - 値があれば、`life_event_items` に `catalog_key=null, status='in_task', title=タイトル` の行を作ってから、`life_event_item_id` 付きでタスクを insert する。
  - `QuickCaptureBar` の props に `familyChildren: Child[]` を足し、`onSubmit` の入力に `recordChildId: string | null` を足す。
  - `TaskRow` の props に `recordChildName: string | null` を足す。
  - `TaskListScreen` の props に `familyChildren: Child[]` を足す。

- [ ] **Step 1: `createTask` と `getTasks` を拡張する**（スキーマの `recordChildId` は uuid か空文字）
- [ ] **Step 2: `QuickCaptureBar` に「記録」チップを足す**
  - 子が0人なら出さない。1人なら、押すと即オン／オフ。
  - 複数人なら、「場所」と同じ `ClickAwayListener` 付きのパネルに「どの子の記録に残す？」と子の一覧、「記録しない」を出す。
  - アイコンは `EditNoteOutlined`。オンのときは「{名前}の記録」と表示する。
  - 送信したらリセットする。
- [ ] **Step 3: `TaskRow` のメタ行に「📝 {名前}」を出す**
  - `recordChildName` が非 null のときだけ出す。
  - 場所ボタンと同じ `text.secondary` の小さい表示にする。
- [ ] **Step 4: ページでつなぐ**
  - `tasks/page.tsx` で `getChildren` を並行取得し、`TaskListScreen` に渡す。
  - `AppHeader` と `AppHeaderSkeleton` の title を「タスク」にする。
- [ ] **Step 5: 型とリントを確認する** — `npm run typecheck && npm run lint && npm test` → すべて PASS
- [ ] **Step 6: Commit** — `feat: タスクを子の記録に残せるようにし、画面タイトルを「タスク」にする`

---

### Task 7: ライフイベント画面と探すタブ

**Files:**
- Create: `src/app/(app)/life-events/page.tsx`
- Create: `src/features/life-events/components/LifeEventsScreen.tsx`, `SearchTab.tsx`, `CatalogItemRow.tsx`, `CatalogItemSheet.tsx`, `AddToTaskDialog.tsx`
- Modify: `src/features/life-events/components/RecordDoneDialog.tsx`（必要なら props を合わせる）

**Interfaces:**
- Consumes: Task 1・2・5 の Produces、`Child`
- Produces:
  - `LifeEventsScreen({ familyChildren, items, showPrograms }: { familyChildren: Child[]; items: LifeEventItem[]; showPrograms: boolean })`
    - 子供タブ（2人以上のとき）、`ToggleButtonGroup` の「探す｜記録」、Task 8 の `RecordTab` を差し込む場所を持つ。
  - `SearchTab({ child, items, showPrograms, onAddToTask, onRecordDone })`

- [ ] **Step 1: `page.tsx` を作る**
  - `requireFamilyMember`、`getChildren`、`getLifeEventItems`、`getIsAppAdmin` を並行取得する。
  - `AppHeader` の title は「ライフイベント」。
  - `showPrograms` は `isSeidoDataHubConfigured()` から決める。
  - 子が0人のときの案内は、既存の `LifeEventListScreen` のものをそのまま使う。
- [ ] **Step 2: `SearchTab` を作る**
  - 検索欄（`TextField`、16px）と絞り込みチップを置く。初期は「いまの時期」。
  - 一覧を出す条件
    - query が空でない：全カタログを `matchesQuery` で絞り、チップは無視する。
    - チップが「いまの時期」：`selectCurrentItems` の結果。0件なら「いまの時期に当たる項目はありません。イベントのチップから探してください」と出す。
    - チップがイベント：その kind の項目をカタログ順に出す。
  - 制度の区分
    - `showPrograms` のとき、`useQuery(["life-event-programs", child.id], () => fetchAreaCatalog({ childId }))` で取る。
    - 見出しは「{市区町村名}の制度」。中身は同じ絞り込み（いまの時期のときは全件）を通す。
    - 区分の末尾に出典の表記を出す（既存 `ProgramListScreen` と同じ文言）。
    - `no_municipality` なら家族画面への案内、`error` なら「制度の情報を取得できませんでした」と出す。
- [ ] **Step 3: `CatalogItemRow` を作る**
  - 項目名、`summary`（空なら出さない）、`describeTiming` を出す。
  - 状態の表示：`in_task` は「タスクにある」チップで、「＋」は出さない。`done` は `opacity: 0.5` にして「{M/D} 記録済み」と添え、「＋」は出さない。
  - 「＋」は `AddToTaskDialog` を開く（タスク名＝項目名、期限＝目安日。なければ空）。
  - 行のタップで `CatalogItemSheet` を開く。
- [ ] **Step 4: `CatalogItemSheet` を作る**
  - 下から出す `Drawer anchor="bottom"`。
  - 中身：項目名、`summary`、種別名・時期、`note`、公式ページのリンク（`url` があるとき）、「＋ やることに追加」「もうやった」。
  - `in_task` や `done` のときは、追加と記録のボタンを出さず、状態だけを出す。
- [ ] **Step 5: 追加と記録をつなぐ**
  - 追加：`addLifeEventItemToTask` を呼び、成功したら既存の「タスクに追加しました／元に戻す」Snackbar を出す。元に戻すは `deleteTask({ taskId })` を呼ぶ。
  - 記録：`RecordDoneDialog`（初期値は今日）から `recordLifeEventItemDone` を呼ぶ。
  - どちらも `router.refresh()` で `items` を取り直す。
- [ ] **Step 6: 型・リント・ビルドを確認する** — `npm run typecheck && npm run lint && npm run build` → 成功
- [ ] **Step 7: Commit** — `feat: ライフイベント画面に「探す」タブを作る`

---

### Task 8: 記録タブ

**Files:**
- Create: `src/features/life-events/components/RecordTab.tsx`
- Modify: `LifeEventsScreen.tsx`

**Interfaces:**
- Produces: `RecordTab({ items }: { items: LifeEventItem[] })`。その子の `done` の行だけを受け取る。

- [ ] **Step 1: 一覧を作る**
  - `doneOn` の降順、同じ日は `title` 順に並べる。
  - 月見出しは「2026年9月」の形。
  - 行には「M/D」と項目名、メモがあれば1行目を省略して出す。
  - 0件なら「まだ記録はありません。探すタブの「もうやった」か、タスクの完了で記録されます」と出す。
- [ ] **Step 2: 「⋯」メニューを作る**
  - やった日を直す：`RecordDoneDialog` から `updateLifeEventItemDoneOn` を呼ぶ。
  - メモ：ダイアログの `TextField multiline` から `updateLifeEventItemNote` を呼ぶ。
  - 記録から外す：確認ダイアログを出し、OK なら `removeLifeEventItem` を呼ぶ。本文は `catalogKey` があれば「探すに戻ります」、なければ「記録から消えます」。
- [ ] **Step 3: 型・リント・ビルドを確認する** — `npm run typecheck && npm run lint && npm run build` → 成功
- [ ] **Step 4: Commit** — `feat: ライフイベント画面に子供ごとの「記録」タブを作る`

---

### Task 9: 旧画面の削除・ナビ・タイトル

**Files:**
- Delete: `src/app/(app)/procedures/`（`programs/` を含む）、`src/features/programs/components/ProgramListScreen.tsx`
- Delete: `src/features/life-events/` の `actions.ts`、`queries.ts`、`schema.ts`、`status.ts`、`grouping.ts`、`default-templates.ts`
- Delete: `src/features/life-events/components/` の `LifeEventListScreen.tsx`、`LifeEventProcedureRow.tsx`、`CandidateSection.tsx`、`DoneProcedureTimeline.tsx`
- Delete: `tests/unit/` の `life-event-grouping.test.ts`、`life-event-templates.test.ts`、`life-event-status.test.ts`
- Modify: `src/features/life-events/timing.ts`
  - `formatJpDate` と `formatSlashDate` だけ残す（`search.ts` から使う）。
  - `life-event-timing.test.ts` と `life-event-when.test.ts` は、残す関数の分だけにする。
- Modify: `src/features/life-events/types.ts`（旧型を削除する）
- Modify: `src/app/(app)/BottomNav.tsx`
  - `href`・`value` を `/life-events` にし、`aria-label` を「タスク」「レシピ」「ライフイベント」にする。
- Modify: `src/app/(app)/recipes/` のタイトルは「レシピ」のまま（変更なし。確認だけ）。

- [ ] **Step 1: 削除と修正を行う**。そのあと `grep -rn "procedures\|life_event_procedures\|default-templates" src tests` で残りがないことを確かめる（`features/programs` 内の API 型は対象外）。
- [ ] **Step 2: 全部を確認する** — `npm run typecheck && npm run lint && npm test && npm run build` → すべて成功
- [ ] **Step 3: Commit** — `refactor: 旧「手続き」画面と使わなくなったモジュールを消し、ナビを /life-events に向ける`
- [ ] **Step 4: 手動確認の手順を書いてユーザーに渡す**（ブラウザツールで実地確認はしない）
  1. タスク画面のタイトルが「タスク」で、ナビの3つ目からライフイベント画面に行ける。
  2. 予定日のある子で「いまの時期」に項目が出る。予定日も出生日もない子では案内が出る。
  3. 「＋」でタスクを作る → 探すに「タスクにある」が付く → タスクで完了 → 記録タブに今日の日付で出る → 完了を外すと記録から消え、「タスクにある」に戻る。
  4. 「タスクにある」項目のタスクを削除する → 探すで「＋」に戻る。
  5. 「もうやった」で過去の日付を記録する → 記録タブに出る。「記録から外す」で探すに戻る。
  6. タスク画面で「記録」をオンにしてタスクを作り、完了する → 記録タブに出る。「記録から外す」の文言が「記録から消えます」になる。
  7. 検索欄に「べびー」と入れて、ベビー用品の項目が出る。
