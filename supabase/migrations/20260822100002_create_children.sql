-- children: 相対期限の基準イベント（出産予定日 / 出生日）を持つ、家族所有のテーブル。
-- 転居日・保育園利用開始日は持たない（基準イベントを2つに絞る。将来拡張）。
create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) > 0 and char_length(display_name) <= 50),
  expected_birth_date date,
  birth_date date,
  created_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint children_needs_a_date check (expected_birth_date is not null or birth_date is not null)
);

create index children_family_idx
  on public.children (family_id)
  where deleted_at is null;

create trigger children_set_updated_at
  before update on public.children
  for each row
  execute function public.set_updated_at();
