-- procedures.category: テンプレート項目との自動マッチに使う共有語彙（P1再設計）。
-- ingestがテンプレート項目から起動されるとき、その項目のcategoryをそのままスタンプする
-- （確認タップ時にカテゴリを選ばせる工程を無くすため）。既存行はnullのまま残る。
alter table public.procedures
  add column category text check (category is null or category in (
    'maternal_child_health_handbook',
    'pregnancy_checkup_subsidy',
    'pregnancy_birth_support_payment',
    'birth_registration',
    'maternity_lump_sum',
    'newborn_home_visit',
    'infant_medical_subsidy',
    'child_allowance'
  ));

create index procedures_category_idx on public.procedures (category)
  where status = 'published';
