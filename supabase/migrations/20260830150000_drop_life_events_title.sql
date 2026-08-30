-- life_events.title（家族が付ける「呼び方」）を廃止する。
-- 追加ダイアログで「このリストでの呼び方」を入力させていたが、種別（テンプレ名:
-- 妊活 / 妊娠 / 出産 / 保育園入園 / 小学校入学）で十分と PO が確定。チップ等の表示は
-- kind から引く。本番の life_events 行はまだ無い（あっても叩き台）ためデータ移行はしない。
alter table public.life_events
  drop column title;
