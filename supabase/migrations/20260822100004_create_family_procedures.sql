-- family_procedures: 行政情報 ⇄ Task のリンク1本。Task化の瞬間に title/due_on/url/note を
-- tasks へコピーする（このテーブル自体はどの制度をTask化したかのリンクのみを持つ）。
create table public.family_procedures (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  procedure_id uuid not null references public.procedures(id) on delete cascade,
  child_id uuid references public.children(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  added_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint family_procedures_unique unique nulls not distinct (family_id, procedure_id, child_id)
);

create index family_procedures_family_idx on public.family_procedures (family_id);
