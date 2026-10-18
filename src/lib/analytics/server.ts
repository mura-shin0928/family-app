import "server-only";

import { after } from "next/server";
import { PostHog } from "posthog-node";
import { getPosthogKey, POSTHOG_HOST } from "./config";
import type { AnalyticsEvent } from "./events";

type MemberIdentity = { id: string; familyId: string };

let client: PostHog | null = null;

/** キーがなければ null。クライアントはプロセスで 1 つだけ作る。 */
export function getServerPosthog(): PostHog | null {
  const key = getPosthogKey();
  if (!key) return null;
  client ??= new PostHog(key, { host: POSTHOG_HOST });
  return client;
}

export function buildEventPayload(
  member: MemberIdentity,
  event: AnalyticsEvent,
): {
  distinctId: string;
  event: AnalyticsEvent;
  properties: { family_id: string };
} {
  return {
    distinctId: member.id,
    event,
    properties: { family_id: member.familyId },
  };
}

/** レスポンスを返した後に送る。送信の失敗は操作の結果に影響させない。 */
export function captureEvent(
  member: MemberIdentity,
  event: AnalyticsEvent,
): void {
  const posthog = getServerPosthog();
  if (!posthog) return;
  const payload = buildEventPayload(member, event);
  after(() => posthog.captureImmediate(payload).catch(() => {}));
}
