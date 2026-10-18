-- 家族ごと退会する。家族のデータは families からの on delete cascade で消え、
-- メンバーのログイン（auth.users）もここで消す。
-- family_members.user_id は一意なので、メンバーは他の家族に属していない。
create function public.delete_my_family(p_family_id uuid, p_confirm_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.family_members
    where family_id = p_family_id and user_id = v_user_id
  ) then
    raise exception 'not_family_member' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.families
    where id = p_family_id
      and btrim(name, E' \t\r\n') = btrim(p_confirm_name, E' \t\r\n')
  ) then
    raise exception 'family_name_mismatch' using errcode = 'P0001';
  end if;

  select array_agg(user_id) into v_user_ids
  from public.family_members
  where family_id = p_family_id and user_id is not null;

  if exists (
    select 1 from public.admin_users where user_id = any (v_user_ids)
  ) then
    raise exception 'family_has_app_admin' using errcode = 'P0001';
  end if;

  delete from public.families where id = p_family_id;
  delete from auth.users where id = any (v_user_ids);
end;
$$;

revoke all on function public.delete_my_family(uuid, text) from public;
grant execute on function public.delete_my_family(uuid, text) to authenticated;
