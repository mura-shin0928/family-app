import { forwardToPosthog } from "@/lib/analytics/ingest-proxy";

// ブラウザの posthog-js は同じオリジンの /ingest に送り、ここから PostHog EU へ中継する
export async function GET(request: Request): Promise<Response> {
  return forwardToPosthog(request);
}

export async function POST(request: Request): Promise<Response> {
  return forwardToPosthog(request);
}
