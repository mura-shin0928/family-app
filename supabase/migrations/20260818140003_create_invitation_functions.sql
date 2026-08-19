-- invitation_preview: 受諾前にFamily名と招待の状態を確認するための読み取り専用関数。
-- 消費（accepted_at のセット）は行わない。招待テーブル自体はRLSで非メンバーに見せない
-- ため、未所属ユーザーがFamily名を知る唯一の経路をここに閉じ込める。
-- authenticated にしか execute を許可しないため、未ログインではFamily名も見えない。
create or replace function public.invitation_preview(p_token_hash text)
returns table (family_name text, status text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_inv public.invitations;
  v_email text;
begin
  select * into v_inv from public.invitations where token_hash = p_token_hash;

  if not found then
    return query select null::text, 'not_found'::text;
    return;
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();

  return query
    select
      f.name,
      case
        when v_inv.revoked_at is not null then 'revoked'
        when v_inv.accepted_at is not null then 'used'
        when v_inv.expires_at <= now() then 'expired'
        when v_email is distinct from v_inv.invited_email then 'email_mismatch'
        else 'ok'
      end
    from public.families f
    where f.id = v_inv.family_id;
end;
$$;

revoke all on function public.invitation_preview(text) from public;
grant execute on function public.invitation_preview(text) to authenticated;

-- accept_invitation: 招待を受諾し、family_members に追加する。
-- 「誤ったFamilyへの参加防止」を、招待に紐づく invited_email と
-- ログイン中の検証済みメールの一致を必須にすることで保証する
-- （URLを他人に転送されても、そのメールでログインできない限り参加できない）。
-- for update で行ロックすることで同時受諾（1回限り）を直列化する。
create or replace function public.accept_invitation(p_token_hash text)
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

  -- MVPでは1ユーザー1Familyに限定する（Family切替UIがまだ無いため）。
  if exists (
    select 1 from public.family_members fm
    where fm.user_id = v_user_id and fm.family_id <> v_inv.family_id
  ) then
    raise exception 'already_in_another_family' using errcode = 'P0001';
  end if;

  insert into public.family_members (family_id, user_id, display_name)
  values (v_inv.family_id, v_user_id, v_inv.display_name)
  on conflict (family_id, user_id) do nothing;

  update public.invitations
  set accepted_at = now(), accepted_by = v_user_id
  where id = v_inv.id;

  return v_inv.family_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
grant execute on function public.accept_invitation(text) to authenticated;
