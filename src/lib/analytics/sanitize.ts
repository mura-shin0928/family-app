import type { CaptureResult, Properties } from "posthog-js";

// posthog-js は全イベントに URL・パス・参照元を自動で付け、人のプロパティにも
// $initial_* として残す。共有メニューから開いた /tasks/share は本文がクエリに入るので、
// 名前に url / pathname / host / referr を含むものと $initial_* はすべて落とす。
const PAGE_CONTEXT_KEY = /url|pathname|host|referr/i;

function isPageContextKey(key: string): boolean {
  return key.startsWith("$initial_") || PAGE_CONTEXT_KEY.test(key);
}

function stripKeys(properties: Properties | undefined): Properties | undefined {
  if (!properties) return properties;
  const result: Properties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (isPageContextKey(key)) continue;
    result[key] =
      (key === "$set" || key === "$set_once") &&
      value !== null &&
      typeof value === "object"
        ? stripKeys(value as Properties)
        : value;
  }
  return result;
}

/** posthog-js の before_send。ページの URL に関わる値を送る前に消す。 */
export function stripPageContext(
  event: CaptureResult | null,
): CaptureResult | null {
  if (!event) return event;
  return {
    ...event,
    properties: stripKeys(event.properties) ?? {},
    ...(event.$set ? { $set: stripKeys(event.$set) } : {}),
    ...(event.$set_once ? { $set_once: stripKeys(event.$set_once) } : {}),
  };
}
