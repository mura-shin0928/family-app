# 共有からタスクを追加する — 設計

2026-10-04

## 目的

Instagram や X などで見かけたものを、忘れる前にリンク付きで家族の「やること／買うもの」に入れられるようにする。
他アプリの共有シートから Family App を選ぶと確認画面が開き、タイトルを打って追加する。

成功の状態: 共有シートを開いてから、タイトルを打って「追加」を押すだけでタスクができ、一覧からそのリンクを開ける。

## スコープ

含む

- 共有されたリンクとテキストを受け取る画面 `/tasks/share`
- Android: manifest の `share_target` で共有シートに Family App を出す
- iPhone: ショートカットから同じ画面を開く（ショートカットの作り方は手順書）
- 未ログインで開かれたとき、ログイン後に受け取り画面へ戻す

含まない

- 画像・動画ファイルそのものの共有（リンクとテキストのみ）
- リンク先からのタイトル自動取得
- 確認画面での期限・買う場所・子の記録の指定（追加後に編集シートで行う）
- service worker の導入

## 前提と制約

- Web Share Target は Android の Chrome でインストールした PWA でのみ動く。iOS は非対応。
- iOS のショートカットが開く URL は、ホーム画面のアプリではなく Safari で開く。
  Safari とホーム画面アプリはログイン状態を共有しないため、Safari 側でも一度ログインが要る。
- Instagram が共有するのは投稿の URL だけ。X は本文の一部と URL。
  Android では多くのアプリが URL を `url` ではなく `text` に入れてくる。
- 受け口が GET なので、共有された URL はクエリ文字列に載り、サーバーのアクセスログに残る。
  iOS のショートカットから渡す手段が URL しかないため受け入れる。

## 全体の流れ

```
Android: 共有シート → Family App ─┐
                                   ├→ /tasks/share?title=&text=&url= → 確認画面 → 追加 → /tasks
iPhone : 共有シート → ショートカット ┘        （未ログインなら /login を挟んで戻る）
```

## 構成要素

### 1. 共有入力の解釈 `src/features/tasks/share-input.ts`

クエリの `title` / `text` / `url` から、確認画面の初期値を作る純粋関数。

```ts
parseShareInput({ title, text, url }): { title: string; url: string; note: string }
```

- `url`: `url` パラメータが http(s) ならそれ。なければ `text` の中で最初に見つかった http(s) の URL。
  判定は既存の `isHttpUrl`。2000 文字を超えるものは採らない。
- `note`: `text` から採用した URL を取り除いた残り。前後の空白を落とし、2000 文字で切る。
- `title`: `title` パラメータがあれば 200 文字で切って入れる。なければ空。
  （Chrome からページを共有したときはページ名が来る。Instagram / X では来ない。）

iPhone のショートカットは共有内容をすべて `text` に入れて渡す。URL の取り出しはこの関数が担うので、ショートカット側に分岐を持たせない。

### 2. 受け取りページ `src/app/(app)/tasks/share/page.tsx`

- `requireFamilyMember()` で所属を確かめる（他のページと同じ）。
- `searchParams` を `parseShareInput` に通す。`url` も `note` も `title` も空なら `/tasks` へリダイレクト。
- `ShareCaptureScreen` に初期値を渡して描画する。

### 3. 確認画面 `src/features/tasks/components/ShareCaptureScreen.tsx`

- タイトル入力（必須、初期フォーカス）
- やること／買うもの の切り替え（初期値: やること）
- 共有されたリンクの表示（読み取り専用。長い URL は省略表示）
- メモ（共有テキストの残り。編集可。空なら欄を出さない）
- 「追加」ボタンと「キャンセル」
- 追加に成功したら `/tasks` へ `router.replace`。キャンセルも `/tasks` へ。
- 失敗時は画面内にエラー文言を出し、入力は保持する。

### 4. `createTask` の拡張

`createTaskSchema` と `createTask` の入力に `url` と `note` を足す（どちらも省略可、空文字列 = 未設定）。
検証は `updateTaskSchema` で使っている `urlSchema` / `noteSchema` をそのまま使う。
既存の呼び出し元（`QuickCaptureBar` など）は変更不要。

### 5. manifest の `share_target`

```ts
share_target: {
  action: "/tasks/share",
  method: "GET",
  params: { title: "title", text: "text", url: "url" },
}
```

Next の `MetadataRoute.Manifest` 型が `share_target` を受けるかは実装時に `node_modules/next/dist/docs/` で確認する。
manifest の変更はインストール済みの PWA に自動で反映されるが、反映まで時間がかかることがある。

### 6. ログイン後に受け取り画面へ戻す

今は招待 URL だけが、Cookie（`INVITE_REDIRECT_COOKIE`）経由でログイン後の戻り先を運んでいる。これを共有にも使う。

- `proxy.ts`: 未ログインで `/tasks/share` に来たら、パスとクエリを Cookie に入れてから `/login` へ飛ばす。
- `sanitizeNextPath`: `/invite/<token>` に加えて `/tasks/share?<query>` の形を許可する。
- `auth/callback`: 既存の処理のまま、Cookie の値が許可された形ならそこへ戻す。
  所属の確認は受け取りページ自身の `requireFamilyMember()` が行う。
- Cookie と定数の名前は招待専用ではなくなるので、実態に合わせて改名する（例: `LOGIN_REDIRECT_COOKIE`、置き場所も `features/invitations` から `lib` へ）。

### 7. iPhone のショートカット（手順書）

`docs/ios-share-shortcut.md` に作り方を書く。

1. ショートカットを新規作成し、「共有シートに表示」をオン、受け取る種類は URL とテキスト
2. 「ショートカットの入力」を URL エンコード
3. `https://<本番ドメイン>/tasks/share?text=<エンコード結果>` を開く

PO が1つ作り、iCloud リンクで家族に配る。初回は Safari でログインが必要なことも手順書に書く。

## エラーと端の場合

| 状況 | 振る舞い |
|---|---|
| クエリが空で直接開かれた | `/tasks` へリダイレクト |
| テキストはあるが URL が無い | URL なしのタスクとして追加できる。テキストはメモへ |
| `url` が http(s) でない | 採らない。`text` 側の URL を探す |
| 未ログイン | `/login` → ログイン → 受け取り画面へ戻る |
| どの Family にも属していない | 既存どおり `/no-access` |
| 追加に失敗 | 画面内にエラー表示、入力は保持 |

## テスト

単体（`tests/unit`）

- `parseShareInput`: `url` のみ／`text` に URL が埋まっている／URL が複数／URL なし／`javascript:` などの非 http(s)／長さの上限／`title` あり
- `sanitizeNextPath`: `/tasks/share?...` を通す、他のパスや外部 URL は通さない
- `createTaskSchema`: `url` / `note` の検証

手動（手順書で渡す）

- Android: インストール済み PWA で、Instagram と X の共有シートから追加できる
- iPhone: ショートカット経由で追加できる。未ログインの Safari からログインを挟んでも受け取り画面に戻る
