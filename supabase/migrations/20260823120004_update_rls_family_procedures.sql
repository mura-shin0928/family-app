-- family_procedures.procedure_id/template_item_id の変更に合わせてinsert/updateポリシーを
-- 差し替える（procedure_idはnull許容になったため必須チェックを外し、template_item_idが
-- 自分の家族のテンプレートに属することを検証する）。selectポリシーは変更なし。
drop policy "family_procedures_insert_own_family" on public.family_procedures;
drop policy "family_procedures_update_own_family" on public.family_procedures;

create policy "family_procedures_insert_own_family" on public.family_procedures
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = added_by and fm.family_id = family_procedures.family_id
    )
    and (
      procedure_id is null
      or exists (
        select 1 from public.procedures p
        where p.id = procedure_id and p.status in ('draft', 'published')
      )
    )
    and (
      template_item_id is null
      or exists (
        select 1 from public.procedure_template_items pti
        join public.procedure_templates pt on pt.id = pti.template_id
        where pti.id = template_item_id and pt.family_id = family_procedures.family_id
      )
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
        select 1 from public.tasks tk
        where tk.id = task_id and tk.family_id = family_procedures.family_id
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
      template_item_id is null
      or exists (
        select 1 from public.procedure_template_items pti
        join public.procedure_templates pt on pt.id = pti.template_id
        where pti.id = template_item_id and pt.family_id = family_procedures.family_id
      )
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
        select 1 from public.tasks tk
        where tk.id = task_id and tk.family_id = family_procedures.family_id
      )
    )
  );
