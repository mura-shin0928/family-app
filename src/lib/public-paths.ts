// /invite: 未ログインでも「このFamilyへの招待です」という文脈を見せてから
// ログインへ誘導したいため、force-redirectの対象から外す
// （ページ自体は authenticated 前提のRPCしか呼ばないので、Family名等は漏れない）。
export const PUBLIC_PATHS: readonly string[] = [
  "/login",
  "/no-access",
  "/auth/callback",
  "/invite",
  "/release-notes",
  "/terms",
  "/privacy",
];

/** ログインしていなくても見られるパスか。 */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}
