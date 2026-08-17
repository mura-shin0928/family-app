-- tasks: 家族の「やること」の中核テーブル（M2）。
-- list_id / assignee_id / tags は M3・M4 で列を追加する（先回りしない）。
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  -- 非正規化: family_id を直接持つことで、list なしでも家族が確定し、
  -- RLSポリシーが join なしで書ける。
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 200),
  due_on date,
  is_purchase boolean not null default false,
  -- List内/バケット内の手動順序。新規タスクは末尾（max + 1）に追加する。
  sort_order integer not null,
  status text not null default 'open' check (status in ('open', 'done')),
  completed_at timestamptz,
  completed_by uuid references public.family_members(id) on delete set null,
  created_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 論理削除。1カラムでデータ消失事故を防ぐ。
  deleted_at timestamptz
);

-- 今日画面のクエリ（family_id + 未削除 + open/当日完了 を due_on, sort_order で並べる）を支える。
create index tasks_family_open_idx
  on public.tasks (family_id, due_on, sort_order)
  where deleted_at is null;

create index tasks_family_completed_at_idx
  on public.tasks (family_id, completed_at)
  where deleted_at is null and status = 'done';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row
  execute function public.set_updated_at();
