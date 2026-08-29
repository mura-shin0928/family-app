-- purchase_locations: 「買うもの」に設定する買う場所の候補。家族所有・論理削除。
-- 一覧（/tasks）の設定画面（/tasks/settings）でのみ管理する分類で、children と同じ規約に揃える。
create table public.purchase_locations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0 and char_length(name) <= 30),
  created_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 「スーパー」の二重登録を防ぐ（論理削除済みは除外するので、消してから同名で作り直せる）。
create unique index purchase_locations_family_name_idx
  on public.purchase_locations (family_id, name)
  where deleted_at is null;

create index purchase_locations_family_idx
  on public.purchase_locations (family_id)
  where deleted_at is null;

create trigger purchase_locations_set_updated_at
  before update on public.purchase_locations
  for each row
  execute function public.set_updated_at();
