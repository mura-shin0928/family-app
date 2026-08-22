import "server-only";
import { lookup } from "node:dns/promises";

const MAX_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 5_000;
const USER_AGENT =
  "FamilyAppRecipeBot/1.0 (+https://github.com/mura-shin0928/family-app)";

export type FetchHtmlResult = { ok: true; html: string } | { ok: false };

function isDisallowedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true;
  }
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local
  if (a === 0) return true; // "this network"
  return false;
}

function isDisallowedIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1") return true; // loopback
  if (lower.startsWith("fe80:")) return true; // link-local
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // fc00::/7 unique local
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isDisallowedIPv4(mapped[1]);
  return false;
}

// procedures/robots.ts でもrobots.txt取得先のSSRFガードに再利用する。
export async function isSafeHost(hostname: string): Promise<boolean> {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".local")) return false;

  let addresses: { address: string; family: number }[];
  try {
    // ホスト名が内部IPに解決される場合（DNS rebinding含む）をここで弾く。
    addresses = await lookup(hostname, { all: true });
  } catch {
    return false;
  }
  if (addresses.length === 0) return false;

  return addresses.every((entry) =>
    entry.family === 6
      ? !isDisallowedIPv6(entry.address)
      : !isDisallowedIPv4(entry.address),
  );
}

export function parseHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

/**
 * SSRFガード付きのHTML取得。https限定・プライベート/ループバックIP拒否
 * （DNS解決結果まで検証）・手動リダイレクト（最大3回、各ホップ再検証）・
 * 5秒タイムアウト・1MB上限・content-type検証。生HTML以外は返さない。
 */
export async function fetchHtml(
  urlString: string,
  options: { deadlineAt: number },
): Promise<FetchHtmlResult> {
  let current = parseHttpsUrl(urlString);
  if (!current) return { ok: false };

  let redirects = 0;

  while (true) {
    const timeoutMs = Math.min(
      FETCH_TIMEOUT_MS,
      options.deadlineAt - Date.now(),
    );
    if (timeoutMs <= 0) return { ok: false };

    if (!(await isSafeHost(current.hostname))) return { ok: false };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      });
    } catch {
      return { ok: false };
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      // ここで消費しないとNodeのfetch実装がコネクションを解放せず、
      // リダイレクトを重ねるたびに未消費のbodyが溜まる。
      await response.body?.cancel();

      if (redirects >= MAX_REDIRECTS) return { ok: false };
      const location = response.headers.get("location");
      if (!location) return { ok: false };

      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        return { ok: false };
      }
      if (next.protocol !== "https:") return { ok: false };

      current = next;
      redirects += 1;
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      return { ok: false };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      await response.body?.cancel();
      return { ok: false };
    }

    const body = response.body;
    if (!body) return { ok: false };

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let html = "";
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          await reader.cancel();
          return { ok: false };
        }
        html += decoder.decode(value, { stream: true });
      }
    } catch {
      return { ok: false };
    }
    html += decoder.decode();

    return { ok: true, html };
  }
}
