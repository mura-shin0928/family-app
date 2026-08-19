-- メンバー管理画面からメンバーを削除できるようにする。
-- select と同じ信頼境界（同じFamilyのメンバー同士）で delete も許可する。
-- auth.users 側の削除は service_role でしか行えない（scripts/admin.mts 経由）ため、
-- ここで許可するのは family_members 行の削除まで
-- （FKは on delete cascade なので、逆に auth.users を消せばこの行は自動で消える）。
grant delete on public.family_members to authenticated;

create policy "family_members_delete_own_family" on public.family_members
  for delete
  to authenticated
  using (public.is_family_member(family_id));
