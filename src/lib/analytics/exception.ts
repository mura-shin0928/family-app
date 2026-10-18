import "server-only";

import { getServerPosthog } from "./server";

/** サーバーのエラーとして送る項目。リクエストの本文や Postgres の details / hint は含めない。 */
export type ServerExceptionInput = {
  name: string;
  message: string;
  stack?: string;
  route?: string;
  action?: string;
  code?: string;
  digest?: string;
};

export function toServerExceptionInput(source: {
  action: string;
  error: { code?: string; message: string };
}): ServerExceptionInput {
  return {
    name: "ActionError",
    action: source.action,
    ...(source.error.code ? { code: source.error.code } : {}),
    message: source.error.message,
  };
}

/** 送信が終わるまで待つ。送信の失敗は呼び出し元に伝えない。 */
export async function captureServerException(
  input: ServerExceptionInput,
): Promise<void> {
  const posthog = getServerPosthog();
  if (!posthog) return;

  const { name, message, stack, ...context } = input;
  const error = new Error(message);
  error.name = name;
  if (stack) error.stack = stack;

  const properties = Object.fromEntries(
    Object.entries(context).filter(([, value]) => value !== undefined),
  );
  await posthog
    .captureExceptionImmediate(error, undefined, properties)
    .catch(() => {});
}
