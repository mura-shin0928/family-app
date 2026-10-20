import { type DateString, todayInJst } from "@/lib/date";
import type { Program } from "./types";

/**
 * 一覧の行にも出す注記。日付は文言と分けて持ち、画面では日付の途中で折り返さないように出す
 * （狭い画面で「10」「月18日」に割れるため。LinkNoticeText）。
 */
export type LinkNotice = {
  message: string;
  /** 「最終確認: 9月21日」。日付を添えない注記・一度も確かめていなければ null。 */
  checkedOn: string | null;
};

/** 家族に見せる、公式ページについての注記。 */
export type ProgramLinkNotice = {
  /** 生きている・まだ確かめていない制度では null。 */
  notice: LinkNotice | null;
  /** 「最終確認: 9月21日」。一度も確かめていなければ null。 */
  checkedOn: string | null;
  /** 公式ページが消えた（か消えた疑いがある）ときだけ、生きている関連リンクを順位どおりに。 */
  relatedUrls: string[];
};

/**
 * 消えたかもしれないページと消えたページは、家族にとってはどちらも「当てにならないリンク」
 * なので同じ文言にする（区別は seido-data-hub の内部で、確定までの回数の違い）。
 */
const DEAD_STATES = new Set(["deleted", "deletion_candidate"]);

/**
 * 公式ページの状態と日付から文言を作る。こちらが観測した事実だけを書き、断定しない。
 * changedAt は使わない（null でも「最新」とは言えず、変化の日付は家族の判断に効かないため）。
 */
export function describeProgramLink(
  program: Program,
  today: DateString,
): ProgramLinkNotice {
  const checkedOn = program.checkedAt
    ? `最終確認: ${formatMonthDay(todayInJst(new Date(program.checkedAt)), today)}`
    : null;
  const isDead = program.state !== null && DEAD_STATES.has(program.state);

  let notice: LinkNotice | null = null;
  if (isDead) {
    notice = { message: "公式ページを開けませんでした", checkedOn };
  } else if (!program.autoUpdate) {
    notice = { message: "自動で更新を確認できません", checkedOn: null };
  }

  return {
    notice,
    checkedOn,
    relatedUrls: isDead
      ? program.relatedLinks
          .filter((link) => link.state === "active")
          .map((link) => link.url)
      : [],
  };
}

/** 「9月21日」。今年でなければ「2025年12月29日」。 */
function formatMonthDay(date: DateString, today: DateString): string {
  const [year, month, day] = date.split("-");
  const monthDay = `${Number(month)}月${Number(day)}日`;
  return year === today.slice(0, 4) ? monthDay : `${year}年${monthDay}`;
}
