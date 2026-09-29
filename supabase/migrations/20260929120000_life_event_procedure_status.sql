-- 手続きの状態を持たせる。テンプレは「候補」として入り、家族が採用した項目だけが
-- 「これから」に載る。済は完了ではなく「やった日の記録」(done_on)。
alter table public.life_event_procedures
  add column status text not null default 'active'
    check (status in ('candidate', 'active', 'done', 'skipped')),
  add column done_on date,
  add column template_key text
    check (template_key is null or char_length(template_key) <= 200);

-- 既存の項目はすべて「これから」のまま残し、テンプレ由来か不明なので 'legacy' を付ける
-- （null のままだと画面で「自分たち」の項目と誤って区別される）。
update public.life_event_procedures
  set template_key = 'legacy';

alter table public.life_event_procedures
  add constraint life_event_procedures_done_on_matches_status
    check ((status = 'done') = (done_on is not null));
