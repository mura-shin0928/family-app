-- 招待を受け入れたときに、同意した利用規約・プライバシーポリシーの版と日時を残す。
alter table public.family_members
  add column terms_version text,
  add column terms_accepted_at timestamptz;

-- 引数が増えるので作り直す。p_terms_version は default null なので、渡さない呼び出しも通る。
drop function public.accept_invitation(text);

create function public.accept_invitation(
  p_token_hash text,
  p_terms_version text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_inv public.invitations;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select lower(email) into v_email
  from auth.users
  where id = v_user_id and email_confirmed_at is not null;

  if v_email is null then
    raise exception 'email_not_confirmed' using errcode = '28000';
  end if;

  select * into v_inv
  from public.invitations
  where token_hash = p_token_hash
  for update;

  if not found then
    raise exception 'invitation_not_found' using errcode = 'P0002';
  end if;
  if v_inv.revoked_at is not null then
    raise exception 'invitation_revoked' using errcode = 'P0001';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'invitation_already_used' using errcode = 'P0001';
  end if;
  if v_inv.expires_at <= now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;
  if v_inv.invited_email <> v_email then
    raise exception 'invitation_email_mismatch' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.family_members fm
    where fm.user_id = v_user_id and fm.family_id <> v_inv.family_id
  ) then
    raise exception 'already_in_another_family' using errcode = 'P0001';
  end if;

  insert into public.family_members (
    family_id, user_id, display_name, terms_version, terms_accepted_at
  )
  values (
    v_inv.family_id,
    v_user_id,
    v_inv.display_name,
    p_terms_version,
    case when p_terms_version is not null then now() end
  )
  on conflict (user_id) do nothing;

  update public.invitations
  set accepted_at = now(), accepted_by = v_user_id
  where id = v_inv.id;

  return v_inv.family_id;
end;
$$;

revoke all on function public.accept_invitation(text, text) from public;
grant execute on function public.accept_invitation(text, text) to authenticated;
