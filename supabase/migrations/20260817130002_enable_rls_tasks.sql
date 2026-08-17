alter table public.tasks enable row level security;

-- families/family_members と同様、anon にも select を明示付与する
-- （Data API自動公開が無効な前提のプロジェクトのため）。実際の行アクセスは
-- 以下のRLSポリシーが authenticated にしか許可しないため、anon は常に0件になる。
-- families/family_members と異なり、tasks はアプリから直接書き込む。
-- 削除は論理削除（update で deleted_at を立てる）のみとし、delete ポリシーは用意しない。
grant select on public.tasks to anon;
grant select, insert, update on public.tasks to authenticated;
grant select, insert, update, delete on public.tasks to service_role;

create policy "tasks_select_own_family" on public.tasks
  for select
  to authenticated
  using (public.is_family_member(family_id));

-- created_by / completed_by は「同じ家族の family_members 行」であることまで検証する。
-- （is_family_member は auth.uid() 本人の所属だけを見るため、created_by ≠ 自分 という
-- なりすましは二人家族では実害が薄いが、他家族の member_id を書き込む事故は防ぐ）
create policy "tasks_insert_own_family" on public.tasks
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by
        and fm.family_id = tasks.family_id
    )
  );

create policy "tasks_update_own_family" on public.tasks
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by
        and fm.family_id = tasks.family_id
    )
    and (
      completed_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = completed_by
          and fm.family_id = tasks.family_id
      )
    )
  );
