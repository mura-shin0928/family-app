-- procedure_templates / procedure_template_items: ライフイベント別の「やるべきこと」
-- テンプレート（P1再設計）。familyが直接編集する定義であり、procedures（グローバル
-- カタログ）とは別物。子どもの出産時期からの相対期限は、procedures の取り込みが
-- 1件も無くてもこのテーブルの anchor_event + offset_days だけで計算できる
-- （あくまで目安であり根拠quoteは持たない。正確な期限は一致したprocedures側が持つ）。
create table public.procedure_templates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  life_event_kind text not null check (life_event_kind in ('birth')),
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 50),
  created_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- 1家族1イベント種別につき有効なテンプレートは1つ。nulls not distinctなので
  -- 有効な行(deleted_at is null)同士だけが衝突し、論理削除後は同じ種別を作り直せる。
  unique nulls not distinct (family_id, life_event_kind, deleted_at)
);

create index procedure_templates_family_idx
  on public.procedure_templates (family_id)
  where deleted_at is null;

create trigger procedure_templates_set_updated_at
  before update on public.procedure_templates
  for each row
  execute function public.set_updated_at();

create table public.procedure_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.procedure_templates(id) on delete cascade,
  sort_order integer not null,
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 100),
  note text check (note is null or char_length(note) <= 2000),
  category text check (category is null or category in (
    'maternal_child_health_handbook',
    'pregnancy_checkup_subsidy',
    'pregnancy_birth_support_payment',
    'birth_registration',
    'maternity_lump_sum',
    'newborn_home_visit',
    'infant_medical_subsidy',
    'child_allowance'
  )),
  anchor_event text check (anchor_event in ('birth', 'expected_birth')),
  -- 符号付き。負=起点日より前（母子手帳など）。目安であり、procedures.offset_countingの
  -- ような厳密な数え方の区別は持たない（正確な数え方は一致したprocedures側のquoteに委ねる）。
  offset_days smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index procedure_template_items_template_idx
  on public.procedure_template_items (template_id)
  where deleted_at is null;

create trigger procedure_template_items_set_updated_at
  before update on public.procedure_template_items
  for each row
  execute function public.set_updated_at();
