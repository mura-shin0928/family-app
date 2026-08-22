alter table public.children enable row level security;

grant select on public.children to anon;
grant select, insert, update on public.children to authenticated;
grant select, insert, update, delete on public.children to service_role;

create policy "children_select_own_family" on public.children
  for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "children_insert_own_family" on public.children
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = children.family_id
    )
  );

create policy "children_update_own_family" on public.children
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = children.family_id
    )
  );

-- delete ポリシーは無い（tasks/recipesと同じく論理削除のみ。deleted_atの更新は上のupdateポリシーで可能）。
