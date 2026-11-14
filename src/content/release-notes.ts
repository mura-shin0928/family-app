export type ReleaseNote = { date: string; items: string[] };

/** 新しい順に書く。書き方は同じディレクトリの CLAUDE.md。 */
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    date: "2026-11-15",
    items: [
      "ライフイベントにおけるやることをAIに相談できるようになりました。",
    ],
  },
  {
    date: "2026-11-01",
    items: [
      "タスクの編集画面で、完了時にメモとURLを子供の記録に残せるようになりました。",
      "ライフイベントの記録タブの＋から、記録を追加できるようになりました。",
      "家族のデータをより安全に守れるよう、内部の仕組みを強化しました。",
    ],
  },
  {
    date: "2026-10-18",
    items: ["家族画面のいちばん下から、家族ごと退会できるようになりました。"],
  },
];
