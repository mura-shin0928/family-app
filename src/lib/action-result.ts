/** Server Action の戻り値。error はそのまま画面に出す文言。 */
export type ActionResult = { ok: true } | { ok: false; error: string };
