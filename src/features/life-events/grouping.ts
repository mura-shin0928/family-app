import type { LifeEvent, LifeEventProcedure } from "./types";

const bySortOrder = (a: LifeEventProcedure, b: LifeEventProcedure) =>
  a.sortOrder - b.sortOrder;

/** 記録は新しい日付が上。同じ日は並び順で安定させる。 */
const byDoneOnDescending = (a: LifeEventProcedure, b: LifeEventProcedure) =>
  (b.doneOn ?? "").localeCompare(a.doneOn ?? "") || bySortOrder(a, b);

export function groupProceduresByStatus(procedures: LifeEventProcedure[]) {
  const pick = (status: LifeEventProcedure["status"]) =>
    procedures.filter((procedure) => procedure.status === status);
  return {
    active: pick("active").sort(bySortOrder),
    done: pick("done").sort(byDoneOnDescending),
    candidates: pick("candidate").sort(bySortOrder),
    skipped: pick("skipped").sort(bySortOrder),
  };
}

/** ライフイベントの並び順のまま、項目のあるイベントだけを返す。 */
export function groupByLifeEvent(
  procedures: LifeEventProcedure[],
  lifeEvents: LifeEvent[],
): { lifeEvent: LifeEvent; items: LifeEventProcedure[] }[] {
  return lifeEvents
    .map((lifeEvent) => ({
      lifeEvent,
      items: procedures.filter(
        (procedure) => procedure.lifeEventId === lifeEvent.id,
      ),
    }))
    .filter((group) => group.items.length > 0);
}
