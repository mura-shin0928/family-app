-- family_procedures をテンプレート項目起点に対応させる（P1再設計）。procedure_id は
-- 取り込み前（未マッチ）でもTask化できるようnullableにし、template_item_idを追加。
-- 一意制約は procedure_id ではなく template_item_id 基準に差し替える（同じ項目の
-- 一致先procedureが後から変わっても重複行を作らないため）。実データは0件
-- （家族向けの「やることに追加」画面が今回まで存在しなかった）なので破壊的ALTERで問題ない。
alter table public.family_procedures
  add column template_item_id uuid references public.procedure_template_items(id) on delete cascade,
  alter column procedure_id drop not null;

alter table public.family_procedures
  drop constraint family_procedures_unique;

alter table public.family_procedures
  add constraint family_procedures_unique
  unique nulls not distinct (family_id, template_item_id, child_id);

alter table public.family_procedures
  add constraint family_procedures_needs_a_link
  check (procedure_id is not null or template_item_id is not null);
