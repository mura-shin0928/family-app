import type { Instrumentation } from "next";

// request（ヘッダーや本文）は送らない。送るのはエラー自体と、どのルートで起きたかだけ。
export const onRequestError: Instrumentation.onRequestError = async (
  err,
  _request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { captureServerException } = await import("@/lib/analytics/exception");
  const error = err instanceof Error ? err : new Error(String(err));
  const digest =
    typeof err === "object" && err !== null && "digest" in err
      ? String(err.digest)
      : undefined;
  await captureServerException({
    name: error.name,
    message: error.message,
    stack: error.stack,
    route: context.routePath,
    digest,
  });
};
