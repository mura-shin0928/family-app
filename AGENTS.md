<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# worktree の切り方

worktree を作る前に、必ず main を最新化してから分岐すること。

```bash
git checkout main && git pull origin main
```

古い main から worktree を切ると、マージ済みの変更を取り込んでいないブランチができて
コンフリクトや作業のやり直しが発生する。すでに worktree を切ってしまった場合は、
その worktree 内で `git merge origin/main` してから作業を続ける。
