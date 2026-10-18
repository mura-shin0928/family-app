# 利用計測とエラー監視（PostHog）

PostHog Cloud EU の 1 プロジェクトで、利用計測とエラー監視の両方を行う。プロジェクトの作り方とキーの置き方は [accounts.md](accounts.md) の「3. PostHog のプロジェクトを作る」。

## 送っているもの

キー `NEXT_PUBLIC_POSTHOG_KEY` は Vercel の Production にだけある。ローカル・プレビュー・テストでは何も送らない。

- 識別子: `family_members.id`（distinct id）と、全イベントに付く `family_id`
- イベント名: `src/lib/analytics/events.ts` の 8 種類。プロパティは付けない
- エラー: 名前、メッセージ、スタック、ルート、アクション名、Postgres のエラーコード、digest。リクエストの本文と Postgres の `details` / `hint` は送らない

名前・メール・入力した内容・URL は送らない。ブラウザの自動収集、ページビュー、録画、ヒートマップはすべて切ってある。

| イベント | いつ送るか | 送る場所 |
|---|---|---|
| `app_opened` | 起動時と、30 分以上たって画面に戻ったとき | ブラウザ |
| `task_created` | タスクを作ったとき | サーバー |
| `task_completed` | タスクを完了にしたとき（未完了に戻したときは送らない） | サーバー |
| `recipe_created` | レシピを保存したとき | サーバー |
| `recipe_analyzed` | レシピの解析（URL・文章・画像）に成功したとき | サーバー |
| `ingredients_added` | 材料を買うものに足したとき | サーバー |
| `program_searched` | 自治体の制度の一覧や Web の検索を開いたとき | サーバー |
| `life_event_item_updated` | ライフイベントの項目をタスクにした、記録した、日付やメモを変えたとき | サーバー |

ブラウザからの送信は `/ingest` を経由して PostHog EU に届く（`next.config.ts` の rewrites）。

## エラーのアラート

1. PostHog の Error tracking を開き、Alerts（または Notifications）で「新しい issue が出たとき」の通知を作る
2. 通知先は PO のメールにする
3. 確かめ方: デプロイの後、ブラウザの開発者ツールのコンソールで `throw new Error("posthog alert test")` を実行する。数分のうちに issue が 1 件でき、メールが届く。終わったら issue を Resolved にする

## ダッシュボード

PostHog の SQL insight を 2 つ作り、1 つのダッシュボードに並べる。`<PO 夫婦の family_id>` は PO 夫婦の家族の id（accounts.md で控えた値）に置き換える。

### 週ごとの「使った家族数」と「二人とも使った家族数」

「使った」とは、その週に `app_opened` が 1 回以上あること。週は月曜はじまり。

```sql
with weekly as (
  select toStartOfWeek(timestamp, 1) as week,
         properties.family_id as family_id,
         count(distinct distinct_id) as members
  from events
  where event = 'app_opened'
    and properties.family_id != '<PO 夫婦の family_id>'
  group by week, family_id
)
select week,
       count() as used_families,
       countIf(members >= 2) as both_used_families
from weekly
group by week
order by week
```

### 二人とも使った家族の割合

分母の「参加している家族数」は PostHog では分からないので、`/admin` の家族一覧の件数から PO 夫婦の 1 件を引いた数を使う。上の `both_used_families` をその数で割る。成功の目安は、この割合が半数以上になること。

## 家族が退会したとき

PostHog のデータは消さない。残るのは識別子と操作の種類だけで、DB から家族を消した後は誰のものか辿れない。PostHog の保持期間が過ぎると消える。
