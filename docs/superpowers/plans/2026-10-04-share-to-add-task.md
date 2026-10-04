# 共有からタスクを追加する Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 他アプリの共有シート（Android は share_target、iPhone はショートカット）から `/tasks/share` を開き、リンク付きのやること／買うものを追加できるようにする。

**Architecture:** 受け口は GET の `/tasks/share?title=&text=&url=` 1つ。クエリを純粋関数 `parseShareInput` で確認画面の初期値に変換し、既存の `createTask` を `url` / `note` 対応に広げて保存する。未ログイン時の戻り先は、招待フローが使っている Cookie の仕組みを一般化して運ぶ。

**Tech Stack:** Next.js 16 (App Router) / React / MUI / TanStack Query / Supabase / zod / vitest / biome

**Spec:** `docs/superpowers/specs/2026-10-04-share-to-add-task-design.md`

## Global Constraints

- Next.js は学習データと API が違う可能性がある。ページ・proxy・manifest を触る前に `node_modules/next/dist/docs/` の該当ガイドを読む（`AGENTS.md`）。
- URL は http(s) のみ。判定は `src/lib/url.ts` の `isHttpUrl` / `httpUrlSchema` を使う。上限は URL 2000 文字、メモ 2000 文字、タイトル 200 文字。
- service worker は入れない。画像・動画ファイルの共有、リンク先のタイトル取得、確認画面での期限・買う場所・子の記録は作らない。
- `(app)` 配下の page.tsx は必ず `requireFamilyMember()` を呼ぶ（layout は認証しない）。
- `main`（flex column）直下で `maxWidth` + `mx: "auto"` を使う要素には `width: "100%"` を付ける。
- コードコメントは簡潔に。経緯や不具合の説明は書かず、コミットメッセージに書く。
- 名前は実態に合わせる（招待専用でなくなる Cookie 定数は改名する）。
- 各タスクの最後に `npm run lint` と `npm run typecheck` を通す。
- 実機・ブラウザでの動作確認はエージェントが行わず、手順書（Task 4）で PO に渡す。

## Review Focus

1. **URL の前後に文字が付いた共有テキスト**（`見て！https://x.com/a/status/1。` や `…」`）: URL だけが取り出され、末尾の句読点・閉じ括弧は URL に含まれない。→ Task 1 のテスト
2. **上限を超える長さ**（200 文字超の `title`、2000 文字超の `text`）: 検証エラーで追加不能にならず、切り詰めて確認画面に出る。→ Task 1 のテスト
3. **同じクエリが複数回付く／配列で届く**（`?text=a&text=b`）: 落ちずに最初の値を使う。→ Task 1 のテスト
4. **Cookie に収まらない長さの共有内容を未ログインで開く**: エラーにならず、ログイン後は通常どおり `/tasks` に着く（共有内容は失われてよい）。→ Task 3 のテスト
5. **「追加」の連打／追加直後の一覧**: タスクは1件だけ作られ、遷移先の `/tasks` に即座に見える。→ Task 4 の実装指定と手順書

---

### Task 1: 共有入力の解釈 `parseShareInput`

**Files:**
- Create: `src/features/tasks/share-input.ts`
- Test: `tests/unit/share-input.test.ts`

**Interfaces:**
- Consumes: `isHttpUrl` from `@/lib/url`
- Produces:
  ```ts
  type ShareParam = string | string[] | undefined;
  export type ShareDraft = { title: string; url: string; note: string };
  export function parseShareInput(params: {
    title?: ShareParam;
    text?: ShareParam;
    url?: ShareParam;
  }): ShareDraft;
  export function isEmptyShareDraft(draft: ShareDraft): boolean;
  ```

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { isEmptyShareDraft, parseShareInput } from "@/features/tasks/share-input";

describe("parseShareInput", () => {
  it("url パラメータをそのまま使う", () => {
    expect(parseShareInput({ url: "https://www.instagram.com/p/abc/" })).toEqual({
      title: "",
      url: "https://www.instagram.com/p/abc/",
      note: "",
    });
  });

  it("text に埋まった URL を取り出し、残りをメモにする", () => {
    expect(
      parseShareInput({ text: "このレシピ良さそう https://x.com/a/status/1" }),
    ).toEqual({ title: "", url: "https://x.com/a/status/1", note: "このレシピ良さそう" });
  });

  it("text が URL だけならメモは空", () => {
    expect(parseShareInput({ text: "https://example.com/a" }).note).toBe("");
  });

  it.each([
    ["見て！https://x.com/a/status/1。", "https://x.com/a/status/1"],
    ["「https://example.com/a」", "https://example.com/a"],
    ["(https://example.com/a)", "https://example.com/a"],
    ["https://example.com/a?b=1&c=2 です", "https://example.com/a?b=1&c=2"],
  ])("URL の前後の文字を含めない: %s", (text, expected) => {
    expect(parseShareInput({ text }).url).toBe(expected);
  });

  it("URL が複数あれば最初の1つを使い、残りはメモに残す", () => {
    const draft = parseShareInput({ text: "https://a.example/1 と https://b.example/2" });
    expect(draft.url).toBe("https://a.example/1");
    expect(draft.note).toBe("と https://b.example/2");
  });

  it("url が http(s) でなければ text 側を探す", () => {
    expect(
      parseShareInput({ url: "javascript:alert(1)", text: "https://example.com/a" }).url,
    ).toBe("https://example.com/a");
  });

  it("url パラメータがあるとき text は丸ごとメモ", () => {
    expect(
      parseShareInput({ url: "https://example.com/a", text: "メモ本文" }).note,
    ).toBe("メモ本文");
  });

  it("URL が無ければ url は空、text はメモ", () => {
    expect(parseShareInput({ text: "牛乳を買う" })).toEqual({
      title: "",
      url: "",
      note: "牛乳を買う",
    });
  });

  it("2000文字を超える URL は採らない", () => {
    const long = `https://example.com/${"a".repeat(2000)}`;
    expect(parseShareInput({ url: long }).url).toBe("");
  });

  it("title は200文字、note は2000文字で切る", () => {
    const draft = parseShareInput({ title: "あ".repeat(300), text: "い".repeat(3000) });
    expect(draft.title).toHaveLength(200);
    expect(draft.note).toHaveLength(2000);
  });

  it("配列で届いたら最初の値を使う", () => {
    expect(parseShareInput({ text: ["https://example.com/a", "x"] }).url).toBe(
      "https://example.com/a",
    );
  });

  it("前後の空白を落とす", () => {
    expect(parseShareInput({ title: "  ページ名  " }).title).toBe("ページ名");
  });
});

describe("isEmptyShareDraft", () => {
  it("すべて空なら true", () => {
    expect(isEmptyShareDraft(parseShareInput({}))).toBe(true);
  });
  it("どれか入っていれば false", () => {
    expect(isEmptyShareDraft(parseShareInput({ text: "a" }))).toBe(false);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/unit/share-input.test.ts`
Expected: FAIL（モジュールが無い）

- [ ] **Step 3: `src/features/tasks/share-input.ts` を実装**

- text 内の URL 候補は `/https?:\/\/\S+/i` で拾い、末尾の `.,!?)]}」』】）。、！？` を取り除いてから `isHttpUrl` と 2000 文字以内を確かめる。
- `url` パラメータを採用した場合、`text` からは何も取り除かない。`text` から採用した場合は、その URL 文字列（末尾を落とした後のもの）だけを取り除く。
- メモは取り除いた後に trim し、2000 文字で切る。

- [ ] **Step 4: 通ることを確認**

Run: `npx vitest run tests/unit/share-input.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/share-input.ts tests/unit/share-input.test.ts
git commit -m "feat: 共有されたテキストからタスクの初期値を作る"
```

---

### Task 2: `createTask` が `url` / `note` を受ける

**Files:**
- Modify: `src/features/tasks/schema.ts`（`createTaskSchema`）
- Modify: `src/features/tasks/actions.ts`（`createTask` の入力型と insert）
- Test: `tests/unit/task-create-schema.test.ts`（新規）

**Interfaces:**
- Produces: `createTask(input)` の入力に `url?: string` と `note?: string` が加わる（省略可、空文字列 = 未設定）。既存の呼び出し元（`TaskListScreen.tsx`）は変更しない。

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { createTaskSchema } from "@/features/tasks/schema";

const base = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "買う",
  dueOn: "",
  isPurchase: true,
  purchaseLocationId: "",
  recordChildId: "",
};

describe("createTaskSchema の url / note", () => {
  it("省略できる", () => {
    expect(createTaskSchema.safeParse(base).success).toBe(true);
  });
  it("http(s) の url とメモを通す", () => {
    const parsed = createTaskSchema.safeParse({
      ...base,
      url: "https://www.instagram.com/p/abc/",
      note: "メモ",
    });
    expect(parsed.success).toBe(true);
  });
  it("空文字列を通す", () => {
    expect(createTaskSchema.safeParse({ ...base, url: "", note: "" }).success).toBe(true);
  });
  it("http(s) 以外の url を弾く", () => {
    expect(
      createTaskSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
  it("2000文字を超えるメモを弾く", () => {
    expect(
      createTaskSchema.safeParse({ ...base, note: "あ".repeat(2001) }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/unit/task-create-schema.test.ts`
Expected: FAIL（`javascript:` と長いメモが通ってしまう）

- [ ] **Step 3: 実装**

- `createTaskSchema` に `url: urlSchema.optional()` と `note: noteSchema.optional()` を足す（同ファイルの既存スキーマ。`updateTaskSchema` と同じもの）。
- `createTask` の入力型に `url?: string; note?: string` を足し、insert に `url` / `note` を加える。未指定と空文字列は `null` で保存する。

- [ ] **Step 4: 通ることを確認**

Run: `npx vitest run tests/unit/task-create-schema.test.ts tests/unit/http-url.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/tasks/schema.ts src/features/tasks/actions.ts tests/unit/task-create-schema.test.ts
git commit -m "feat: タスク作成時に URL とメモを保存できるようにする"
```

---

### Task 3: ログイン後に受け取り画面へ戻す

**Files:**
- Modify: `src/lib/next-path.ts`
- Modify: `src/proxy.ts`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/features/invitations/actions.ts`（import 元と定数名のみ）
- Modify: `src/features/invitations/constants.ts`（`INVITE_REDIRECT_COOKIE` を削除。他に定数が残らなければファイルごと削除）
- Test: `tests/unit/next-path.test.ts`（新規）

**Interfaces:**
- Produces（すべて `@/lib/next-path`）:
  ```ts
  export const LOGIN_REDIRECT_COOKIE = "login_redirect";
  export const LOGIN_REDIRECT_COOKIE_OPTIONS: {
    httpOnly: true; sameSite: "lax"; path: "/"; maxAge: number; // 60 * 60
  };
  export function sanitizeNextPath(value: string | null | undefined): string | null;
  /** 未ログインで来たリクエストの、ログイン後に戻すパス。戻さないなら null。 */
  export function loginReturnPath(pathname: string, search: string): string | null;
  ```

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { loginReturnPath, sanitizeNextPath } from "@/lib/next-path";

describe("sanitizeNextPath", () => {
  it.each([
    "/invite/abc_DEF-123",
    "/tasks/share?text=https%3A%2F%2Fx.com%2Fa",
    "/tasks/share?title=a&text=b&url=https%3A%2F%2Fexample.com",
  ])("通す: %s", (value) => {
    expect(sanitizeNextPath(value)).toBe(value);
  });

  it.each([
    "/tasks",
    "/tasks/share",
    "/tasks/share/x?text=a",
    "/tasks/shared?text=a",
    "//evil.example/tasks/share?text=a",
    "https://evil.example/tasks/share?text=a",
    "/tasks/share?text=a#frag",
    "/tasks/share?text=a b",
    "",
    null,
    undefined,
  ])("通さない: %s", (value) => {
    expect(sanitizeNextPath(value)).toBeNull();
  });
});

describe("loginReturnPath", () => {
  it("共有の受け取り画面はクエリごと返す", () => {
    expect(loginReturnPath("/tasks/share", "?text=abc")).toBe("/tasks/share?text=abc");
  });
  it("他のパスは null", () => {
    expect(loginReturnPath("/tasks", "")).toBeNull();
    expect(loginReturnPath("/recipes", "?x=1")).toBeNull();
  });
  it("クエリが無ければ null", () => {
    expect(loginReturnPath("/tasks/share", "")).toBeNull();
  });
  it("3000文字を超えるなら null（Cookie に収まらない）", () => {
    expect(loginReturnPath("/tasks/share", `?text=${"a".repeat(3000)}`)).toBeNull();
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npx vitest run tests/unit/next-path.test.ts`
Expected: FAIL

- [ ] **Step 3: `src/lib/next-path.ts` を実装**

- 許可パターンは `/^\/invite\/[A-Za-z0-9_-]+$/` と `/^\/tasks\/share\?[^#\s]+$/` の2つ。
- `loginReturnPath` は `pathname + search` を `sanitizeNextPath` に通し、`/tasks/share` 以外と 3000 文字超は null。
- `LOGIN_REDIRECT_COOKIE` と `LOGIN_REDIRECT_COOKIE_OPTIONS`（`httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60`）をここに置く。`constants.ts` にあった「クエリではなく Cookie で運ぶ理由」のコメントは定数に付けて移す。

- [ ] **Step 4: 呼び出し側を差し替える**

- `invitations/actions.ts`: `INVITE_REDIRECT_COOKIE` → `LOGIN_REDIRECT_COOKIE`、オプションのリテラル → `LOGIN_REDIRECT_COOKIE_OPTIONS`。
- `auth/callback/route.ts`: 定数名と import 元を差し替える。コメントの「招待URL経由のログインは」を、共有も含む表現に直す。処理は変えない。
- `proxy.ts`: 未ログインかつ非公開パスの分岐で、`loginReturnPath(request.nextUrl.pathname, request.nextUrl.search)` が値を返したら、`/login` へのリダイレクトレスポンスに `LOGIN_REDIRECT_COOKIE` をセットしてから返す。null なら今までどおり。
- `grep -rn INVITE_REDIRECT_COOKIE src tests` が0件になること。

- [ ] **Step 5: 通ることを確認**

Run: `npx vitest run tests/unit/next-path.test.ts && npm run typecheck && npm run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A src/lib/next-path.ts src/proxy.ts src/app/auth/callback/route.ts src/features/invitations tests/unit/next-path.test.ts
git commit -m "feat: 未ログインで共有を開いたとき、ログイン後に受け取り画面へ戻す"
```

---

### Task 4: 受け取りページ・確認画面・share_target・手順書

**Files:**
- Create: `src/app/(app)/tasks/share/page.tsx`
- Create: `src/features/tasks/components/ShareCaptureScreen.tsx`
- Modify: `src/app/manifest.ts`
- Create: `docs/ios-share-shortcut.md`
- Create: `docs/share-to-add-task-verification.md`

**Interfaces:**
- Consumes:
  - `parseShareInput`, `isEmptyShareDraft`, `ShareDraft`（Task 1）
  - `createTask({ id, title, dueOn, isPurchase, purchaseLocationId, recordChildId, url?, note? }): Promise<ActionResult>`（Task 2）
  - `fetchTasks` from `@/features/tasks/query-actions`、`TASKS_QUERY_KEY` from `@/features/tasks/types`
  - `requireFamilyMember`, `getIsAppAdmin` from `@/features/auth/guard`、`AppHeader` from `src/app/(app)/AppHeader`
- Produces: `ShareCaptureScreen({ initial }: { initial: ShareDraft })`（client component）

- [ ] **Step 1: Next のドキュメントを読む**

`node_modules/next/dist/docs/` で page の `searchParams`（型と await の要否）、`redirect`、manifest を確認する。`share_target` は `MetadataRoute.Manifest` 型にある（`node_modules/next/dist/lib/metadata/types/manifest-types.d.ts`）。

- [ ] **Step 2: `page.tsx` を実装**

- `requireFamilyMember()` と `getIsAppAdmin()` を呼ぶ（`tasks/page.tsx` と同じ形）。
- `searchParams` の `title` / `text` / `url` を `parseShareInput` に渡す。`isEmptyShareDraft` なら `redirect("/tasks")`。
- `main` は `tasks/page.tsx` と同じ `Box`（`minHeight: "100dvh"`, flex column）。`AppHeader` の `title` は `共有から追加`。その下に `<ShareCaptureScreen initial={draft} />`。

- [ ] **Step 3: `ShareCaptureScreen.tsx` を実装**

要素（MUI。文言は以下のとおり）:

| 要素 | 仕様 |
|---|---|
| タイトル | `TextField`、label `タイトル`、必須、`autoFocus`、初期値 `initial.title`、`maxLength` 200 |
| 種類 | `ToggleButtonGroup`（exclusive）: `やること` / `買うもの`。初期値 `やること`。未選択にはできない |
| リンク | `initial.url` が空でなければ、label `リンク` の下に URL を1行・省略表示（読み取り専用） |
| メモ | `initial.note` が空でなければ `TextField` multiline、label `メモ`、編集可、`maxLength` 2000 |
| ボタン | `追加`（contained、タイトルが空白のみ・送信中は disabled）と `キャンセル`（text） |
| エラー | `createTask` が `ok: false` を返したら `Alert severity="error"` に `error` を出す。入力は保持 |

振る舞い:

- タスクの `id` はマウント時に1度だけ `crypto.randomUUID()` で作り、再送でも同じ id を使う（連打で2件できない）。
- 追加: `createTask({ id, title, dueOn: "", isPurchase, purchaseLocationId: "", recordChildId: "", url: initial.url, note })`。
- 成功したら `await queryClient.fetchQuery({ queryKey: TASKS_QUERY_KEY, queryFn: fetchTasks, staleTime: 0 })` で一覧のキャッシュを最新にしてから `router.replace("/tasks")`。`TaskListScreen` はキャッシュがあれば `initialData` より優先するので、先読み済みの古い `/tasks` が使われても新しいタスクが見える。
- キャンセルは `router.replace("/tasks")`。
- レイアウトは `Stack`（`maxWidth: 480, width: "100%", mx: "auto", p: 2, gap: 2`）。下部ナビに隠れないよう `pb` に `BOTTOM_NAV_CLEARANCE`（`@/lib/layout`）。

- [ ] **Step 4: manifest に `share_target` を足す**

```ts
share_target: {
  action: "/tasks/share",
  method: "GET",
  params: { title: "title", text: "text", url: "url" },
},
```

- [ ] **Step 5: `docs/ios-share-shortcut.md` を書く**

内容: (1) ショートカットアプリで新規作成、名前は `Family App に追加` (2) 詳細で「共有シートに表示」をオン、受け取る種類を URL とテキストだけにする (3) アクション「URL エンコード」に「ショートカットの入力」を渡す (4) アクション「URL を開く」に `https://<本番ドメイン>/tasks/share?text=` + エンコード結果 (5) iCloud リンクで共有して家族に配る (6) 注意: Safari で開くので、初回は Safari 側でログインが必要。ログイン後は受け取り画面に戻る。

本番ドメインは `README.md` か memory の `project_family_app_infra.md` に実値があれば使い、無ければ `<本番ドメイン>` のままにして PO に埋めてもらう旨を書く。

- [ ] **Step 6: `docs/share-to-add-task-verification.md`（手動確認の手順書）を書く**

確認項目:

1. ローカル: ログイン済みで `/tasks/share?text=テスト%20https%3A%2F%2Fexample.com%2Fa` を開く → リンクとメモ「テスト」が出る → タイトルを入れて追加 → `/tasks` に遷移し、追加したタスクが即座に見え、リンクアイコンから開ける
2. 「買うもの」を選んで追加 → 買うものとして一覧に出る
3. 「追加」を素早く2回押す → 1件だけできる
4. `/tasks/share` をクエリなしで開く → `/tasks` に移る
5. 未ログイン（シークレットウィンドウ）で 1 の URL を開く → ログイン → 受け取り画面に戻り、内容が残っている
6. Android 実機: PWA を入れ直す（または manifest の反映を待つ）→ Instagram と X の共有シートに Family App が出る → 追加できる
7. iPhone 実機: 手順書どおりショートカットを作る → Instagram と X の共有シートから追加できる

- [ ] **Step 7: 検証**

Run: `npm run lint && npm run typecheck && npm test && npm run build`
Expected: すべて成功。build 出力に `/tasks/share` のルートがある。

- [ ] **Step 8: Commit**

```bash
git add "src/app/(app)/tasks/share" src/features/tasks/components/ShareCaptureScreen.tsx src/app/manifest.ts docs/ios-share-shortcut.md docs/share-to-add-task-verification.md
git commit -m "feat: 共有シートからやること・買うものを追加できるようにする"
```
