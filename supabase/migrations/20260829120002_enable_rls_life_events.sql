alter table public.life_events enable row level security;
alter table public.life_event_procedures enable row level security;

-- 他テーブルと同様、anon にも select を明示付与する（Data API自動公開が無効な前提の
-- プロジェクトのため）。行アクセスは authenticated 向けポリシーだけなので anon は常に0件。
-- 削除は論理削除（deleted_at）のみとし、delete ポリシーは用意しない。
grant select on public.life_events to anon;
grant select, insert, update on public.life_events to authenticated;
grant select, insert, update, delete on public.life_events to service_role;

grant select on public.life_event_procedures to anon;
grant select, insert, update on public.life_event_procedures to authenticated;
grant select, insert, update, delete on public.life_event_procedures to service_role;

create policy "life_events_select_own_family" on public.life_events
  for select
  to authenticated
  using (public.is_family_member(family_id));

-- created_by / child_id は「同じ家族の行」であることまで検証する
-- （is_family_member は auth.uid() 本人の所属しか見ないため、他家族のidを
-- 書き込む事故はここで止める）。
create policy "life_events_insert_own_family" on public.life_events
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = life_events.family_id
    )
    and (
      child_id is null
      or exists (
        select 1 from public.children c
        where c.id = child_id and c.family_id = life_events.family_id
      )
    )
  );

create policy "life_events_update_own_family" on public.life_events
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = life_events.family_id
    )
    and (
      child_id is null
      or exists (
        select 1 from public.children c
        where c.id = child_id and c.family_id = life_events.family_id
      )
    )
  );

create policy "life_event_procedures_select_own_family" on public.life_event_procedures
  for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "life_event_procedures_insert_own_family" on public.life_event_procedures
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.life_events e
      where e.id = life_event_id and e.family_id = life_event_procedures.family_id
    )
  );

create policy "life_event_procedures_update_own_family" on public.life_event_procedures
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.life_events e
      where e.id = life_event_id and e.family_id = life_event_procedures.family_id
    )
  );
