alter table public.family_procedures enable row level security;

grant select on public.family_procedures to anon;
grant select, insert, update on public.family_procedures to authenticated;
grant select, insert, update, delete on public.family_procedures to service_role;

create policy "family_procedures_select_own_family" on public.family_procedures
  for select
  to authenticated
  using (public.is_family_member(family_id));

-- 「やることに追加」は insert ではなく (family_id, procedure_id, child_id) の upsert
-- （既存行の task_id を差し替える）にするため、insert/update の両方にポリシーが要る。
create policy "family_procedures_insert_own_family" on public.family_procedures
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = added_by and fm.family_id = family_procedures.family_id
    )
    and exists (
      select 1 from public.procedures p
      where p.id = procedure_id and p.status in ('draft', 'published')
    )
    and (
      child_id is null
      or exists (
        select 1 from public.children c
        where c.id = child_id and c.family_id = family_procedures.family_id
      )
    )
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.family_id = family_procedures.family_id
      )
    )
  );

create policy "family_procedures_update_own_family" on public.family_procedures
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = added_by and fm.family_id = family_procedures.family_id
    )
    and (
      child_id is null
      or exists (
        select 1 from public.children c
        where c.id = child_id and c.family_id = family_procedures.family_id
      )
    )
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.family_id = family_procedures.family_id
      )
    )
  );

-- delete のポリシーは無い（「非表示にする」機能は要件に無い。Taskを消せばtask_idがsetnullで消え、
-- 追加済みバッジは自然に消える。再追加はupsertが受け止める）。
