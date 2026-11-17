# ライフイベント項目シートの見直し Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 探すタブの項目シートを「上で分かる・下で操作する」の 2 段に並べ直し、AI への相談の入口を「{タイトル}の周辺タスクを AI と相談」というカードにする。

**Architecture:** 変えるのは `CatalogItemSheet` の並びと見た目だけで、props と呼び出し側（`SearchTab`）は変えない。AI の入口には、探すタブ上部と同じ `ConsultEntryCard` を使い回す。入口の文言は純粋関数に切り出して、unit test で固定する。

**Tech Stack:** Next.js（App Router）、React、MUI v9、vitest（node 環境・`tests/unit/**/*.test.ts` のみ。コンポーネントのテスト基盤は無い）、biome

**Spec:** `docs/superpowers/specs/2026-11-17-catalog-item-sheet-design.md`

## Global Constraints

- AI の入口の文言は `${title}の周辺タスクを AI と相談`。2 行目（`line`）は渡さない。
- 「タスクに追加」の文言とアイコン（`AddIcon`）は今のまま。
- 「もうやった」は枠のないテキストボタンにして、一番下の中央に置く。
- 追加済み・記録済み（`state.status !== "none"`）のときは、AI の入口を出さない。
- Typography で `color="text.secondary"` のようなドット経路の指定は使わない。`sx={{ color: "text.secondary" }}` を使う（`tests/unit/typography-color-prop.test.ts` で検査している）。
- `src/content/release-notes.ts` は編集しない。PR 本文に `## リリースノート` を設けて、次の 1 行を書く: 「ライフイベントの項目の詳細を見やすくし、AI への相談の入口を分かりやすくしました。」

## Review Focus

- タイトルの長い項目（例: 20 文字以上）でも、入口カードは 1 行のまま末尾が「…」になり、右端の `›` は見えたままになる。今の `ConsultEntryCard` は flex の子に `minWidth: 0` が無いので、はみ出す恐れがある → Task 2 で直し、Task 3 のブラウザ確認で見る。
- 公式ページが消えた項目（`link.notice === "公式ページを開けませんでした"` で `relatedUrls` があるもの）でも、代わりのリンクが押せる → Task 3 のブラウザ確認で見る。
- `onConsult` が無い環境（キー未設定）では、区切り線の下は「タスクに追加」と「もうやった」だけになり、余計な隙間ができない → Task 3。
- 概要・注記・種類と時期が空の項目でも、空の行や隙間ができない → Task 3。
- ダークモードでも、入口カードの面と文字が読める（CSS 変数 `--mui-palette-brand-tagBg` のまま）→ Task 3。

---

### Task 1: AI の入口の文言を関数にする

**Files:**
- Create: `src/features/ai-consult/entry-label.ts`
- Test: `tests/unit/ai-consult-entry-label.test.ts`

**Interfaces:**
- Produces: `export function consultEntryLabel(title: string): string`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { consultEntryLabel } from "@/features/ai-consult/entry-label";

describe("consultEntryLabel", () => {
  it("項目のタイトルを入れて、周辺タスクの相談だと分かる文言にする", () => {
    expect(consultEntryLabel("児童手当")).toBe("児童手当の周辺タスクを AI と相談");
  });
});
```

- [ ] **Step 2: 失敗を確かめる**

Run: `npx vitest run tests/unit/ai-consult-entry-label.test.ts`
Expected: FAIL（モジュールが見つからない）

- [ ] **Step 3: `consultEntryLabel(title: string): string` を `src/features/ai-consult/entry-label.ts` に実装する**

JSDoc に「項目シートに出す AI への相談の入口の文言」と書く。

- [ ] **Step 4: 通ることを確かめる**

Run: `npx vitest run tests/unit/ai-consult-entry-label.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/ai-consult/entry-label.ts tests/unit/ai-consult-entry-label.test.ts
git commit -m "feat: 項目シートの AI への相談の入口の文言を関数にする"
```

### Task 2: 入口カードで長い文言が「…」で切れるようにする

**Files:**
- Modify: `src/features/ai-consult/components/ConsultEntryCard.tsx`（ラベルの `Typography`）

**Interfaces:**
- Produces: `ConsultEntryCard` の props は変えない（`label`, `line?`, `onOpen`）。

- [ ] **Step 1: ラベルの `Typography` に `sx={{ minWidth: 0 }}` を足す**

flex の子は既定で `min-width: auto` のため、`noWrap` を付けても縮まずにはみ出す。`minWidth: 0` で縮めて、ellipsis が効くようにする。アイコンと `›` には `flexShrink: 0` を付ける。探すタブ上部と検索中の入口にも効くが、短い文言の見た目は変わらない。

- [ ] **Step 2: 型と lint を通す**

Run: `npm run typecheck && npm run lint`
Expected: エラーなし

- [ ] **Step 3: Commit**

```bash
git add src/features/ai-consult/components/ConsultEntryCard.tsx
git commit -m "fix: AI への相談の入口で長い文言を末尾で切る"
```

### Task 3: 項目シートを 2 段に並べ直す

**Files:**
- Modify: `src/features/life-events/components/CatalogItemSheet.tsx`

**Interfaces:**
- Consumes: `consultEntryLabel(title: string): string`（Task 1）、`ConsultEntryCard({ label, onOpen })`（Task 2）
- Produces: `CatalogItemSheet` の props は変えない（`SearchTab.tsx` は触らない）。

- [ ] **Step 1: 上半分（分かる）を並べ直す**

上から次の順にする。中身が空の行は今と同じく出さない。
1. `item.title`（h6）
2. `meta`（caption・`text.secondary`）。タイトルのすぐ下に移し、タイトルとの間は詰める（同じ `Box` に入れるなど）
3. `item.summary`（body2）
4. `item.note`（body2・`text.secondary`・`pre-wrap`）
5. 公式ページ: `isHttpUrl(item.url)` のときだけ、`公式ページ` + `OpenInNewIcon`（`fontSize="inherit"`）のリンク（body2）。`link.notice` があれば同じ塊の下に caption（`text.secondary`）で出す
6. `link.relatedUrls`: 見出し「関連していそうなページ」は外す。`linkLabel(url)` の表記のまま、caption の大きさのリンクを並べる（`overflowWrap: "anywhere"` は残す）

- [ ] **Step 2: 区切り線と下半分（操作）を作る**

上半分との間に `Divider` を入れる。その下は次のように出し分ける。
- `state.status === "none"`: 縦に並べる
  1. `Button variant="contained" fullWidth startIcon={<AddIcon />}`「タスクに追加」→ `onAdd`
  2. `onConsult` があるときだけ `<ConsultEntryCard label={consultEntryLabel(item.title)} onOpen={onConsult} />`
  3. `Button variant="text"`「もうやった」→ `onRecord`。中央寄せ、色は `text.secondary`
- `state.status === "in_task"`: 今と同じ「タスク追加済み」の `Chip`
- `state.status === "done"`: 今と同じ「MM/DD 記録済み」の Typography

`AutoAwesomeOutlinedIcon` の import は使わなくなるので消す。

- [ ] **Step 3: unit test・型・lint を通す**

Run: `npm test && npm run typecheck && npm run lint`
Expected: すべて PASS・エラーなし（`typography-color-prop` を含む）

- [ ] **Step 4: ブラウザで確かめる**

`preview_start {name: "dev"}` で起動し、ログインして探すタブで項目を開く（ログインは使う人に頼む）。次を確かめて、スクリーンショットを撮る。
- 通常の項目: 並びがスペックの図どおりになっている
- タイトルの長い項目: 入口カードが 1 行で「…」になり、`›` が見えている
- タスク追加済みの項目と記録済みの項目: AI の入口が出ず、状態の表示が出ている
- 公式ページが消えた項目があれば、注記と代わりのリンクが出ている
- `resize_window colorScheme: "dark"` でダークモードでも読める（確かめたら light に戻す）

- [ ] **Step 5: Commit**

```bash
git add src/features/life-events/components/CatalogItemSheet.tsx
git commit -m "feat: 項目シートを「分かる」と「操作する」の 2 段に並べ直す"
```
