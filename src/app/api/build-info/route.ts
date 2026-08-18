import { NextResponse } from "next/server";

/**
 * デプロイ検知用の軽量エンドポイント。Vercelはランタイムにも
 * VERCEL_GIT_COMMIT_SHA を自動注入するため、追加設定なしでビルドを識別できる。
 * ローカル開発では存在しないため "dev" 固定になり、常に不一致なしとして扱われる。
 */
export async function GET() {
  return NextResponse.json(
    { buildId: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
