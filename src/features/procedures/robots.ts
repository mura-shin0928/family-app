import "server-only";
import {
  isSafeHost,
  parseHttpsUrl,
} from "@/features/recipes/extraction/fetch-html";

const ROBOTS_TIMEOUT_MS = 3_000;
const ROBOTS_MAX_BYTES = 100_000;
const USER_AGENT =
  "FamilyAppProcedureBot/1.0 (+https://github.com/mura-shin0928/family-app)";

/**
 * User-agent: * ブロックの Disallow だけを拾う簡易パーサ（Allow は見ない。
 * 迷ったら取り込まない側に倒す）。
 */
export function parseDisallowRules(robotsTxt: string): string[] {
  const rules: string[] = [];
  let inWildcardBlock = false;

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.split("#")[0]?.trim() ?? "";
    if (line === "") continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "user-agent") {
      inWildcardBlock = value === "*";
      continue;
    }
    if (inWildcardBlock && key === "disallow" && value !== "") {
      rules.push(value);
    }
  }

  return rules;
}

export function isPathAllowed(rules: string[], path: string): boolean {
  return !rules.some((rule) => path.startsWith(rule));
}

/**
 * robots.txtの取得はベストエフォート。取得できない・空・解釈できない場合は
 * 「制限なし」として扱う（robots.txtが無いサイトへのアクセスを止めないため）。
 * 取得先自体もユーザーが貼ったURLのホストなので、ページ取得と同じSSRFガードを通す。
 */
export async function fetchDisallowRules(origin: string): Promise<string[]> {
  const robotsUrl = parseHttpsUrl(`${origin}/robots.txt`);
  if (!robotsUrl) return [];
  if (!(await isSafeHost(robotsUrl.hostname))) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ROBOTS_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    await response.body?.cancel();
    return [];
  }

  const text = (await response.text()).slice(0, ROBOTS_MAX_BYTES);
  return parseDisallowRules(text);
}
