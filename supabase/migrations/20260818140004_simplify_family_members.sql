-- 招待トークン方式への一本化に伴い、email先行登録方式（claim_membership）を廃止する。
-- 未クレーム（user_id is null）の行が残っている状態でこの移行を適用すると、
-- そのユーザーは以後ログインしても紐付かなくなる（データロス）ため、
-- 事前にゼロであることを確認できない限り適用を止める。
do $$
begin
  if exists (select 1 from public.family_members where user_id is null) then
    raise exception
      'family_members has unclaimed rows (user_id is null); resolve them (invite or delete) before applying this migration';
  end if;
end
$$;

drop function if exists public.claim_membership();

-- user_id が必須になり、かつ1ユーザーは常に高々1つのFamilyにしか属さない
-- （accept_invitation が保証する）ため、(family_id, email) の複合uniqueと
-- (family_id, user_id) の複合uniqueを、user_id単独のuniqueに置き換える。
-- これにより「同じユーザーが2つ目のFamilyに紛れ込む」事故をDB制約でも防げる。
-- user_id の元のFKは on delete set null だったが、NOT NULL化と両立しないため
-- on delete cascade に張り替える（auth.usersが消えたらそのmembership行ごと消える）。
alter table public.family_members
  drop constraint family_members_family_id_email_key,
  drop constraint family_members_family_id_user_id_key,
  drop constraint family_members_user_id_fkey,
  drop column email,
  alter column user_id set not null,
  add constraint family_members_user_id_key unique (user_id),
  add constraint family_members_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- 上のunique制約がuser_idの検索も兼ねるため、非uniqueの重複indexを削除する。
drop index if exists public.family_members_user_id_idx;

-- accept_invitation の冪等insertが依拠するON CONFLICTターゲットを
-- (family_id, user_id) から (user_id) に更新する。
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

  if exists (
    select 1 from public.family_members fm
    where fm.user_id = v_user_id and fm.family_id <> v_inv.family_id
  ) then
    raise exception 'already_in_another_family' using errcode = 'P0001';
  end if;

  insert into public.family_members (family_id, user_id, display_name)
  values (v_inv.family_id, v_user_id, v_inv.display_name)
  on conflict (user_id) do nothing;

  update public.invitations
  set accepted_at = now(), accepted_by = v_user_id
  where id = v_inv.id;

  return v_inv.family_id;
end;
$$;
