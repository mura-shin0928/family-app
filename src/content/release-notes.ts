export type ReleaseNote = { date: string; items: string[] };

/** 新しい順に書く。書き方は同じディレクトリの CLAUDE.md。 */
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    date: "2026-10-18",
    items: ["家族画面のいちばん下から、家族ごと退会できるようになりました。"],
  },
];
