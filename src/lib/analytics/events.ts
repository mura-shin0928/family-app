/** 利用計測に送るイベント。送るのはこの名前と識別子だけで、プロパティは足さない。 */
export const ANALYTICS_EVENTS = [
  "app_opened",
  "task_created",
  "task_completed",
  "recipe_created",
  "recipe_analyzed",
  "ingredients_added",
  "program_searched",
  "life_event_item_updated",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
