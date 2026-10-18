# バックアップから戻す

Supabase Pro の日次バックアップ（7 日保持）だけを使う。PITR と自前の定期 `pg_dump` は使わない。最悪で 1 日分の変更を失う。

- バックアップに Storage は含まれない。このアプリは画像を URL で持つだけで Storage を使っていない。Storage を使い始めたらこの手順書を見直す
- 自分で退会した家族は戻さない（利用規約に書く）

## どちらの場面かを決める

| 場面 | 例 | 方法 |
|---|---|---|
| A. 全体が壊れた | 破壊的な migration を当てた、全家族のデータを壊すバグ | プロジェクト全体をバックアップに戻す |
| B. 一つの家族だけを戻したい | バグで一家族のデータが壊れた | バックアップを一時プロジェクトに戻し、その家族の行だけを本番に書き戻す |

迷ったら B。A は他の家族の変更も巻き戻す。

## 準備: psql

手元に psql がなければ Docker で動かす。以下の `psql` はこれに読み替える。

```bash
docker run --rm -it -v "$PWD":/work -w /work postgres:17 psql "<接続文字列>"
```

接続文字列は、各プロジェクトの「Connect」ボタン > Session pooler から取る。パスワードは Database Settings で確かめる（リセットすると本番アプリには影響しないが、CI の `SUPABASE_DB_PASSWORD` を更新し直す必要がある）。

## 場面 A: プロジェクト全体を戻す

1. 利用者に知らせる（問い合わせ用の Gmail から、各家族の代表にメール）。「〜時から最大〜分アプリが使えない」「〜日〜時の状態に戻る」
2. Supabase のダッシュボードで family-app の Database > Backups を開き、壊れる前で最も新しいバックアップを選んで Restore する。戻している間、プロジェクトには接続できない
3. 終わったら次を確かめる
   - 本番のアプリでタスクの一覧とレシピの一覧が開ける
   - 二人の端末でタスクを 1 件作り、もう一方に即時に反映される（Realtime。Supabase が自動で作り直す）
   - CI の `migrate` ジョブ: 戻した時点より後の migration は、もう一度当たる。壊れた原因の migration を直してから main に入れる
4. 利用者に、戻した時点を知らせる

## 場面 B: 一つの家族だけを戻す

`<FID>` は戻す家族の `families.id`。

### 1. バックアップを一時プロジェクトに戻す

1. family-app の Database > Backups で、壊れる前のバックアップを選び、新しいプロジェクトへ戻す（「Restore to a new project」）。リージョンは東京
2. 一時プロジェクトの接続文字列を控える

### 2. 一時プロジェクトから、その家族の行を書き出す

作業用の空のディレクトリで、一時プロジェクトに接続して次を流す。

```sql
\copy (select * from public.families where id = '<FID>') to 'families.csv' csv header
\copy (select * from public.family_members where family_id = '<FID>') to 'family_members.csv' csv header
\copy (select * from public.children where family_id = '<FID>') to 'children.csv' csv header
\copy (select * from public.purchase_locations where family_id = '<FID>') to 'purchase_locations.csv' csv header
\copy (select * from public.life_event_items where family_id = '<FID>') to 'life_event_items.csv' csv header
\copy (select * from public.tasks where family_id = '<FID>') to 'tasks.csv' csv header
\copy (select * from public.recipes where family_id = '<FID>') to 'recipes.csv' csv header
\copy (select * from public.recipe_ingredients where family_id = '<FID>') to 'recipe_ingredients.csv' csv header
\copy (select * from public.invitations where family_id = '<FID>') to 'invitations.csv' csv header
\copy (select * from public.recipe_analysis_usage where family_id = '<FID>') to 'recipe_analysis_usage.csv' csv header
\copy (select * from public.web_search_usage where family_id = '<FID>') to 'web_search_usage.csv' csv header
```

書き出したファイルには利用者のデータが入っている。作業が終わったらディレクトリごと消す。

### 3. 本番に書き戻す

次を `restore.sql` として同じディレクトリに置き、本番に `psql -1 -v ON_ERROR_STOP=1 -f restore.sql` で流す。`-1` で全体が 1 トランザクションになり、途中で失敗したら何も変わらない。

```sql
-- 今の（壊れた）行を消す。families から cascade で全部消える。auth.users は消えない
delete from public.families where id = '<FID>';

-- 外部キーの向きに合わせて親から入れる
\copy public.families from 'families.csv' csv header
\copy public.family_members from 'family_members.csv' csv header
\copy public.children from 'children.csv' csv header
\copy public.purchase_locations from 'purchase_locations.csv' csv header
\copy public.life_event_items from 'life_event_items.csv' csv header
\copy public.tasks from 'tasks.csv' csv header
\copy public.recipes from 'recipes.csv' csv header
\copy public.recipe_ingredients from 'recipe_ingredients.csv' csv header
\copy public.invitations from 'invitations.csv' csv header
\copy public.recipe_analysis_usage from 'recipe_analysis_usage.csv' csv header
\copy public.web_search_usage from 'web_search_usage.csv' csv header
```

- トリガー（`tasks_sync_life_event_item` と `set_updated_at`）は update のときだけ動くので、insert では動かない
- `family_members.user_id` は `auth.users` を参照している。バックアップの後にメンバーがログインごと消えていると、ここで失敗する。その場合は、その人の行を `family_members.csv` から外してからやり直す
- テーブルを足したときは、`select conrelid::regclass, confrelid::regclass from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace` で外部キーの向きを確かめ、上の 2 つの一覧に足す

### 4. 片付け

1. 本番のアプリで、その家族のタスクとレシピが戻っていることを確かめる（下の「行数を比べる」も使える）
2. 一時プロジェクトを削除する（Settings > General > Delete project）
3. 作業用のディレクトリを消す
4. その家族に、戻した時点と、それより後の変更は消えたことを知らせる

## 行数を比べる

本番と一時プロジェクトの両方で流して比べる。家族を絞らずに全体を数える。

```sql
select 'families' as t, count(*) from public.families
union all select 'family_members', count(*) from public.family_members
union all select 'children', count(*) from public.children
union all select 'purchase_locations', count(*) from public.purchase_locations
union all select 'life_event_items', count(*) from public.life_event_items
union all select 'tasks', count(*) from public.tasks
union all select 'recipes', count(*) from public.recipes
union all select 'recipe_ingredients', count(*) from public.recipe_ingredients
union all select 'invitations', count(*) from public.invitations
union all select 'recipe_analysis_usage', count(*) from public.recipe_analysis_usage
union all select 'web_search_usage', count(*) from public.web_search_usage
order by t;
```

差は、バックアップの時点より後に作ったり消したりした分だけのはず。

## リハーサルの記録

ベータの前に 1 回、場面 B の「1. 一時プロジェクトに戻す」と「行数を比べる」を行い、一時プロジェクトを消すまでを通す。

2026-10-18 に、場面 B の 2 と 3（書き出しと書き戻し）をローカルの DB で通した。使い捨ての家族（子ども、ライフイベント項目、それに紐づくタスク、レシピと材料）を書き出し、タスクを書き換えてから書き戻すと、元の内容に戻り、全テーブルの行数も一致した。

- 実施日:
- 使ったバックアップの日時:
- 一時プロジェクトに戻すのにかかった時間:
- 行数の差と、その理由:
- 引っかかった点:
