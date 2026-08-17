-- is_family_member: RLS ポリシーの共通判定関数。
-- family_members 自身のポリシーがこの関数を参照しても無限再帰しないよう security definer にする。
create or replace function public.is_family_member(target_family_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.family_members fm
    where fm.family_id = target_family_id
      and fm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_family_member(uuid) from public;
grant execute on function public.is_family_member(uuid) to authenticated;

-- claim_membership: サインイン後に呼び出す。
-- auth.users の検証済みメール（email_confirmed_at）と一致する family_members 行に
-- user_id を紐付ける。事前登録されていないメールは何も起きない（＝未所属のまま）。
create or replace function public.claim_membership()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select lower(email) into v_email
  from auth.users
  where id = v_user_id
    and email_confirmed_at is not null;

  if v_email is null then
    return;
  end if;

  update public.family_members
  set user_id = v_user_id
  where lower(email) = v_email
    and (user_id is null or user_id = v_user_id);
end;
$$;

revoke all on function public.claim_membership() from public;
grant execute on function public.claim_membership() to authenticated;
