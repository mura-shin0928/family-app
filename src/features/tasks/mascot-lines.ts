import type { MascotExpression } from "@/components/Mascot";
import type { TodayProgress } from "./buckets";

export type MascotLine = {
  expression: MascotExpression;
  /** 吹き出しの1行ずつ */
  lines: readonly string[];
};

/** 画面を開いたときのひとこと。万歳は全部できたときだけ。 */
export const MASCOT_GREETING: Record<TodayProgress, MascotLine> = {
  overdue: {
    expression: "worried",
    lines: ["期限がすぎたものがあるよ。", "いっしょにかたづけよう！"],
  },
  remaining: {
    expression: "happy",
    lines: ["今日やることがあるよ。", "いっしょにやろう！"],
  },
  todayDone: {
    expression: "smile",
    lines: ["今日のぶんはおしまい〜", "おつかれさま！"],
  },
  nothingToday: {
    expression: "sleepy",
    lines: ["今日やることはありません。", "ゆっくりしてね♪"],
  },
  allDone: { expression: "cheer", lines: ["全部できた！", "おつかれさま。"] },
  nothingToDo: {
    expression: "sleepy",
    lines: ["今やることはありません。", "ゆっくりしてね♪"],
  },
};

/** タップするたびに順に出るおしゃべり。 */
export const MASCOT_CHATTER: readonly MascotLine[] = [
  { expression: "surprised", lines: ["ん？よんだ？"] },
  { expression: "wink", lines: ["いつもありがとう！"] },
  { expression: "happy", lines: ["みんなでやれば、はやいよ"] },
  { expression: "smile", lines: ["むりしないでね"] },
  { expression: "sleepy", lines: ["おちゃ、いれようか？"] },
];

/** タップ0回はあいさつ、以降はおしゃべりを一巡してあいさつに戻る。 */
export function mascotLineAt(
  progress: TodayProgress,
  tapCount: number,
): MascotLine {
  const index = tapCount % (MASCOT_CHATTER.length + 1);
  return index === 0 ? MASCOT_GREETING[progress] : MASCOT_CHATTER[index - 1];
}

/** タップしたときにレアなセリフが出る確率。 */
export const MASCOT_RARE_CHANCE = 1 / 8;

/** たまに出るセリフ。空のあいだは出ない。 */
export const MASCOT_RARE_LINES: readonly MascotLine[] = [];

/** 当たりならレアなセリフをひとつ、外れ・候補なしなら null。random は 0 以上 1 未満を返す。 */
export function pickRareLine(
  random: () => number,
  rareLines: readonly MascotLine[] = MASCOT_RARE_LINES,
): MascotLine | null {
  if (rareLines.length === 0 || random() >= MASCOT_RARE_CHANCE) return null;
  return rareLines[Math.floor(random() * rareLines.length)];
}
