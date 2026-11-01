# リリースする

`main` にマージしただけでは本番は変わらない。`release` に push したときに、本番のアプリと DB が変わる。

| ブランチ | 意味 | push で起きること |
|---|---|---|
| `main` | 次のリリース候補 | CI の `check`、Vercel の Preview |
| `release` | 本番の実体 | CI の `check` と `migrate`、Vercel の本番デプロイ |

検証はローカルで行う。Preview は本番 DB を見ていて、未リリースの migration は当たっていないので、検証には使わない。

## リリースの手順

1. 未リリース分を見る。

   ```bash
   git fetch origin && git log origin/release..origin/main --oneline
   ```

2. 利用者に見える変更があれば、`src/content/release-notes.ts` にリリース日の項目を足して PR を出し、`main` にマージする。同じ日に 2 回リリースするときは、同じ項目に追記する。
3. リリースする。ステップ 2 のマージを取り込むため、push の前にもう一度 fetch する。

   ```bash
   git fetch origin && git push origin origin/main:refs/heads/release
   ```

4. CI の `migrate` と Vercel のデプロイの成功を見てから、実機で確認する。

利用者に見える変更がないときはノートなしでリリースできる。ただし更新通知は出るので、内部の修正だけなら次の機能リリースにまとめて出すことを優先する。

手元の `main` は古いことがあるので、ステップ 3 は `origin/main` を指定する。`origin/main` はリモート追跡ブランチなので、宛先は `refs/heads/release` と完全な形で書く。`--force` は使わない。

## 例外のとき

### 急ぎの修正

原則は `main` に入れて、未リリース分ごとリリースする。`main` に出せない変更が残っているときだけ、次の手順にする。

1. `release` からブランチを切り、PR を `release` にマージする。これがリリースになる。
2. `release` を `main` にマージする。これをしないと次のリリースが fast-forward できない。GitHub の PR は "Create a merge commit" でマージする。Squash や Rebase だと `release` の先頭が `main` に入らず、次の push も拒否される。

### `check` か `migrate` が失敗した

Vercel は CI を待たずにデプロイするので、アプリだけが DB より先に進んでいることがある。Vercel の Instant Rollback で本番を戻してから、原因を `main` で直してリリースし直す。

### push が拒否された

`release` に `main` にないコミットがある。`release` を "Create a merge commit" で `main` にマージしてから、もう一度リリースする。

### 切り戻し

Vercel の Instant Rollback を使う。DB は戻らない。

### Vercel のデプロイが発火しない

`vercel ls family-app` と `gh api repos/mura-shin0928/family-app/deployments` で、`release` のコミットのデプロイがあるかを見る。なければ `release` の Preview ビルドを Vercel のダッシュボードで Promote to Production する。Preview ビルドもなければ `vercel deploy --prod` でデプロイする。
