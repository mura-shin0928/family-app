alter table public.procedure_templates enable row level security;
alter table public.procedure_template_items enable row level security;

grant select on public.procedure_templates to anon;
grant select, insert, update on public.procedure_templates to authenticated;
grant select, insert, update, delete on public.procedure_templates to service_role;

grant select on public.procedure_template_items to anon;
grant select, insert, update on public.procedure_template_items to authenticated;
grant select, insert, update, delete on public.procedure_template_items to service_role;

create policy "procedure_templates_select_own_family" on public.procedure_templates
  for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "procedure_templates_insert_own_family" on public.procedure_templates
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = procedure_templates.family_id
    )
  );

create policy "procedure_templates_update_own_family" on public.procedure_templates
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = procedure_templates.family_id
    )
  );

-- procedure_template_items は family_id を直接持たず、template_id 経由で家族に属する。
create policy "procedure_template_items_select_own_family" on public.procedure_template_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.procedure_templates t
      where t.id = template_id and public.is_family_member(t.family_id)
    )
  );

create policy "procedure_template_items_insert_own_family" on public.procedure_template_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.procedure_templates t
      where t.id = template_id and public.is_family_member(t.family_id)
    )
  );

create policy "procedure_template_items_update_own_family" on public.procedure_template_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.procedure_templates t
      where t.id = template_id and public.is_family_member(t.family_id)
    )
  )
  with check (
    exists (
      select 1 from public.procedure_templates t
      where t.id = template_id and public.is_family_member(t.family_id)
    )
  );

-- delete ポリシーは無い（children/tasksと同じく論理削除のみ）。
