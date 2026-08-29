alter table public.purchase_locations enable row level security;

grant select on public.purchase_locations to anon;
grant select, insert, update on public.purchase_locations to authenticated;
grant select, insert, update, delete on public.purchase_locations to service_role;

create policy "purchase_locations_select_own_family" on public.purchase_locations
  for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "purchase_locations_insert_own_family" on public.purchase_locations
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = purchase_locations.family_id
    )
  );

create policy "purchase_locations_update_own_family" on public.purchase_locations
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = purchase_locations.family_id
    )
  );

-- delete ポリシーは無い（children/tasks/recipes と同じく論理削除のみ。deleted_at の更新は上の update ポリシーで可能）。
