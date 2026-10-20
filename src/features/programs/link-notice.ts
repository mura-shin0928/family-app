import type { Program } from "./types";

/** 家族に見せる、公式ページについての注記。 */
export type ProgramLinkNotice = {
  /** 一覧の行にも出す注記。生きている・まだ確かめていない制度では null。 */
  notice: string | null;
  /** 公式ページが消えた（か消えた疑いがある）ときだけ、生きている関連リンクを順位どおりに。 */
  relatedUrls: string[];
};

/**
 * 消えたかもしれないページと消えたページは、家族にとってはどちらも「当てにならないリンク」
 * なので同じ文言にする（区別は seido-data-hub の内部で、確定までの回数の違い）。
 */
const DEAD_STATES = new Set(["deleted", "deletion_candidate"]);

/**
 * 公式ページの状態から文言を作る。こちらが観測した事実だけを書き、断定しない。
 * 日付は出さない。「最終確認: 9月21日」では誰が何を確かめた日か家族に伝わらず、
 * 家族の判断にも効かないため（checkedAt・changedAt は使わない）。
 */
export function describeProgramLink(program: Program): ProgramLinkNotice {
  const isDead = program.state !== null && DEAD_STATES.has(program.state);

  let notice: string | null = null;
  if (isDead) {
    notice = "公式ページを開けませんでした";
  } else if (!program.autoUpdate) {
    notice = "自動で更新を確認できません";
  }

  return {
    notice,
    relatedUrls: isDead
      ? program.relatedLinks
          .filter((link) => link.state === "active")
          .map((link) => link.url)
      : [],
  };
}
