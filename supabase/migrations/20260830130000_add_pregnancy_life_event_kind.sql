-- 「妊娠・出産」を「妊娠」と「出産」の2つのライフイベントに分ける（P6-4）。
-- 予定日基準の項目（母子手帳・妊婦健診・戌の日など）と出生日基準の項目
-- （出生届・児童手当・お宮参りなど）は必要になる時期がまるで違うので、
-- 家族がそれぞれ別に足せるようにする。既存の 'birth' は「出産」として残し、
-- 妊娠中のイベント用に 'pregnancy' を足すだけ（データ移行は不要 — 本番の
-- life_events 行はまだ無く、あっても家族が編集する叩き台のため）。
alter table public.life_events
  drop constraint life_events_kind_check;

alter table public.life_events
  add constraint life_events_kind_check
  check (kind in ('preconception', 'pregnancy', 'birth', 'nursery', 'school'));
