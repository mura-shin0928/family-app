alter table public.families enable row level security;
alter table public.family_members enable row level security;

-- Data API ロールへの新規テーブル自動公開が無効化された前提のプロジェクトのため、
-- テーブル権限を明示的に付与する。authenticated/anon には select のみ、
-- 書き込みは service_role（管理・migration専用、RLSをbypassする）のみに絞る。
grant usage on schema public to anon, authenticated, service_role;

grant select on public.families to anon, authenticated;
grant select, insert, update, delete on public.families to service_role;

grant select on public.family_members to anon, authenticated;
grant select, insert, update, delete on public.family_members to service_role;

-- select のみ許可。insert/update/delete のポリシーは用意しない
-- （MVP では Family/メンバー管理は SQL Editor 経由の運用で、アプリからは書き込ませない）。
create policy "families_select_own" on public.families
  for select
  to authenticated
  using (public.is_family_member(id));

create policy "family_members_select_own_family" on public.family_members
  for select
  to authenticated
  using (public.is_family_member(family_id));
