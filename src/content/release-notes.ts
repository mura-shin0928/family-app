export type ReleaseNote = { date: string; items: string[] };

/** 利用者から見て変わったことだけを、新しい順に書く。 */
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    date: "2026-10-18",
    items: ["家族画面のいちばん下から、家族ごと退会できるようになりました。"],
  },
];
