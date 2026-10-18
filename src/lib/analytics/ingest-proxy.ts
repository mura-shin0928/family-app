import "server-only";

import { POSTHOG_HOST } from "./config";

const POSTHOG_ASSETS_HOST = "https://eu-assets.i.posthog.com";
const INGEST_PREFIX = "/ingest";

// 同じオリジンの /ingest には Supabase のセッション Cookie やページの URL（Referer）が
// 付いてくるので、PostHog には決めたヘッダーだけを渡す。
const FORWARDED_REQUEST_HEADERS = [
  "accept",
  "content-encoding",
  "content-type",
  "user-agent",
];
const FORWARDED_RESPONSE_HEADERS = ["cache-control", "content-type"];

function pickHeaders(source: Headers, names: string[]): Headers {
  const headers = new Headers();
  for (const name of names) {
    const value = source.get(name);
    if (value !== null) headers.set(name, value);
  }
  return headers;
}

export function upstreamUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  const path = url.pathname.slice(INGEST_PREFIX.length);
  const host = path.startsWith("/static/") ? POSTHOG_ASSETS_HOST : POSTHOG_HOST;
  return `${host}${path}${url.search}`;
}

export function upstreamHeaders(headers: Headers): Headers {
  return pickHeaders(headers, FORWARDED_REQUEST_HEADERS);
}

export async function forwardToPosthog(request: Request): Promise<Response> {
  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(upstreamUrl(request.url), {
    method: request.method,
    headers: upstreamHeaders(request.headers),
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
  });
  return new Response(upstream.body, {
    status: upstream.status,
    headers: pickHeaders(upstream.headers, FORWARDED_RESPONSE_HEADERS),
  });
}
