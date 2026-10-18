# 運営に使う外部サービスの設定

招待制ベータの前に一度だけ行う作業。どれもダッシュボードでの手作業で、終わったら各節の「確かめ方」で確認する。画面の名前は 2026-10 時点のもの。

## 月額の目安

1 ドル 150 円で換算。

| サービス | 用途 | 月額の目安 | 予算の守り方 |
|---|---|---|---|
| Supabase Pro | 日次バックアップ（7 日保持） | $25（約 3,750 円） | Spend cap を ON（既定値のまま） |
| Gemini API 有料枠 | レシピ解析 | 通常は数百円、理論上の最大で約 5,000 円 | Cloud Billing の予算アラート（1,000 円と 3,000 円で通知）。実際の上限はアプリ側の 30 回/日/家族 |
| PostHog Cloud EU（無料） | 利用計測とエラー監視 | 0 円 | カードを登録しない（無料枠を超えたら取り込みが止まるだけ） |
| Vercel Hobby | ホスティング | 0 円 | 課金を始める段階（ストア公開）で Pro（$20）に移る |
| Tavily（無料） | 制度の Web 検索 | 0 円（1,000 クレジット/月） | カードを登録しない。使い切ったら検索が失敗し、今の失敗表示で受ける |
| Gmail | 問い合わせ窓口 | 0 円 | — |

合計はベータ中で月 4,000〜5,000 円、最悪でも 1 万円以内。

## 1. Supabase を Pro にする

Supabase のプランは org 単位で決まり、Pro の org では org 内の各プロジェクトに compute が課金される。seido-data-hub は Pro にしないので、先に org を分ける。

1. Supabase のダッシュボードで、family-app（ref `pesxoohkdnbrlwzsnrnn`）と seido-data-hub が同じ org にあるかを見る
2. 同じ org にある場合は、無料プランの org を新しく作り、seido-data-hub をそこへ移す（プロジェクトの Settings > General の「Transfer project」）。移したあと、seido-data-hub の API URL とキーが変わっていないことを確かめる
3. family-app の org の Billing で、プランを Pro にする
4. 同じ Billing 画面で、Spend cap が ON になっていることを確かめる。OFF だと、使用量が Pro の枠を超えた分が従量で課金される

確かめ方:

- 翌日、family-app の Database > Backups に、日次バックアップが 1 件出ている
- seido-data-hub の org のプランが Free のまま
- 本番のアプリで、タスクの一覧とレシピの一覧が開ける

## 2. Gemini API を有料枠にする

無料枠では、送った内容が Google の製品改善に使われ、人間のレビュアーが読むことがある。また、個人情報の送信が禁じられている。他人がレシピの画像や本文を送るので、有料枠に切り替える。

1. Google AI Studio で、請求先アカウントを紐づけた Cloud プロジェクトを用意する（AI Studio の「Set up billing」から作れる）
2. そのプロジェクトで API キーを新しく発行する
3. Vercel の family-app の Settings > Environment Variables で、`GEMINI_API_KEY`（Production）を新しいキーに差し替え、最新のデプロイを Redeploy する
4. Google Cloud コンソールの Billing > Budgets & alerts で、そのプロジェクトに予算を作る。金額は月 3,000 円、通知のしきい値は 1,000 円（約 33%）と 3,000 円（100%）。通知先は請求先の管理者（PO）のメール
5. 本番のアプリで、レシピを 1 件解析して成功することを確かめる
6. AI Studio で、古い無料枠のキーを削除する

予算アラートは通知だけで、課金を止めない。実際に支払いを抑えているのは、アプリ側の解析回数の上限（30 回/日/家族）。

確かめ方:

- AI Studio のキーの一覧で、使っているキーのプロジェクトに請求先が付いている（Paid と表示される）
- Budgets & alerts に、上の予算が 1 件ある

## 3. PostHog のプロジェクトを作る

1. PostHog Cloud **EU**（`eu.posthog.com`）でアカウントとプロジェクトを作る。US で作るとデータの置き場所が変わり、プライバシーポリシーの記載と食い違う
2. プロジェクトの設定で次を変える
   - 「Discard client IP data」を ON
   - Session replay を OFF
   - Autocapture と Heatmaps を OFF（アプリ側でも切るが、プロジェクト側でも切っておく）
3. カードは登録しない
4. プロジェクトの API キー（`phc_` で始まる）を、Vercel の `NEXT_PUBLIC_POSTHOG_KEY` に **Production だけ** で登録する。Preview と Development には入れない
5. PO 夫婦の家族の `family_id` を控えておく（Supabase の Table Editor で `families` を見る）。ダッシュボードで PO 夫婦を除外するのに使う

アプリ側の組み込みは別の PR で入る。キーは先に登録しておいてよい。キーがあるだけでは何も送られない。

確かめ方:

- PostHog のプロジェクトの設定で、上の項目が意図したとおりになっている
- Vercel の環境変数で、`NEXT_PUBLIC_POSTHOG_KEY` の対象が Production だけになっている

## 4. Tavily

1. Tavily のダッシュボードで、プランが無料（月 1,000 クレジット）のままで、カードが登録されていないことを確かめる
2. 設定の「Allow Use of Query Data」を OFF にする（検索の言葉を Tavily のサービス改善に使わせない）

## 5. 問い合わせ用の Gmail

1. 問い合わせ専用の Gmail アドレスを作る。PO の個人のアドレスは使わない
2. PO のスマホの Gmail アプリにアカウントを追加し、通知が届くようにする
3. アドレスを開発側に伝える（アプリ内の「お問い合わせ」のリンク先になる）

確かめ方:

- 別のアドレスから送ったメールが、PO のスマホに通知される

## 開発側に渡す値

作業が終わったら、次の値を開発側（Claude）に伝える。キーそのものはチャットに貼らない（Vercel に入れたことだけ伝える）。

- 問い合わせ用の Gmail アドレス
- PO 夫婦の家族の `family_id`
- `GEMINI_API_KEY` を有料枠のキーに差し替えたこと
- `NEXT_PUBLIC_POSTHOG_KEY` を Production に入れたこと
