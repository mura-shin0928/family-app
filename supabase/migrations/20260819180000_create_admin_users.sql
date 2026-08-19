-- admin_users: 特定ユーザーにアプリ全体の管理権限を与えるための第二の信頼境界。
-- families/family_members/invitations のRLSに `or is_app_admin()` を足す形で
-- 権限を拡張する（既存のFamily内権限モデルは一切変更しない）。
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- ポリシーを一切作らない = authenticated からは直接select/insertできない。
-- 付与・剥奪・一覧は scripts/admin.mts（service_role）経由でのみ行う。
grant select, insert, update, delete on public.admin_users to service_role;

-- is_app_admin: RLSポリシーの共通判定関数。is_family_member と同じ作法で
-- security definer にする（admin_users自身にポリシーが無いため、これが無いと
-- 誰も自分がadminかどうかをアプリから判定できない）。
create or replace function public.is_app_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;
