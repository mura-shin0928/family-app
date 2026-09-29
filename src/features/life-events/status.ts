import type {
  LifeEventTemplate,
  LifeEventTemplateItem,
} from "./default-templates";
import type {
  LifeEvent,
  LifeEventKind,
  LifeEventProcedure,
  ProcedureStatus,
} from "./types";

/** 状態列を足す前からあった項目に付ける印。「自分たち」の項目と区別するために使う。 */
export const LEGACY_TEMPLATE_KEY = "legacy";

export type StatusAction = "adopt" | "skip" | "record" | "reopen";

const TRANSITIONS: Record<
  StatusAction,
  { from: readonly ProcedureStatus[]; to: ProcedureStatus }
> = {
  adopt: { from: ["candidate", "skipped"], to: "active" },
  skip: { from: ["candidate"], to: "skipped" },
  record: { from: ["active"], to: "done" },
  reopen: { from: ["done"], to: "active" },
};

export function transitionFor(action: StatusAction) {
  return TRANSITIONS[action];
}

/** テンプレ項目の識別子。同じ種別の再追加で候補が重複しないようにするために使う。 */
export function templateKeyFor(kind: LifeEventKind, title: string): string {
  return `${kind}:${title}`;
}

/**
 * その種別のイベントに入っている項目から、コピー済みのテンプレ項目の key を集める。
 * 状態列を足す前からある項目（'legacy'）は key を持たないので、項目名で数える。
 */
export function existingTemplateKeys(
  kind: LifeEventKind,
  rows: { title: string; templateKey: string | null }[],
): Set<string> {
  const keys = new Set<string>();
  for (const row of rows) {
    if (row.templateKey === LEGACY_TEMPLATE_KEY) {
      keys.add(templateKeyFor(kind, row.title));
    } else if (row.templateKey) {
      keys.add(row.templateKey);
    }
  }
  return keys;
}

export function templateItemsToCopy(
  template: LifeEventTemplate,
  existingKeys: ReadonlySet<string>,
): LifeEventTemplateItem[] {
  return template.items.filter(
    (item) => !existingKeys.has(templateKeyFor(template.kind, item.title)),
  );
}

/**
 * その子にテンプレを追加したとき、実際に候補へ入る項目。addLifeEvent と同じく
 * その子の同じ種別のうち直近のイベントを再利用し、コピー済みの項目を除く。
 */
export function pendingTemplateItems(
  template: LifeEventTemplate,
  childId: string,
  lifeEvents: LifeEvent[],
  procedures: LifeEventProcedure[],
): LifeEventTemplateItem[] {
  const event = [...lifeEvents]
    .reverse()
    .find((e) => e.childId === childId && e.kind === template.kind);
  if (!event) return [...template.items];
  const keys = existingTemplateKeys(
    template.kind,
    procedures.filter((p) => p.lifeEventId === event.id),
  );
  return templateItemsToCopy(template, keys);
}
