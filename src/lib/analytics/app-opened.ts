export const APP_OPENED_INTERVAL_MS = 30 * 60 * 1000;

/** 起動時と、前回の送信から 30 分以上たって画面に戻ったときだけ送る。 */
export function shouldCaptureAppOpened(
  lastCapturedAt: number | null,
  now: number,
): boolean {
  return (
    lastCapturedAt === null || now - lastCapturedAt >= APP_OPENED_INTERVAL_MS
  );
}
