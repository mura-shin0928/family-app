import "server-only";

import { createHash, randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;

/** URLに載せる生トークン。DBには保存しない（保存するのは hashInvitationToken の結果のみ）。 */
export function generateInvitationToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/** DB保存・照合用のsha256(hex)。DB流出時にトークンを再利用可能にしないための一方向変換。 */
export function hashInvitationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
