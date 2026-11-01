-- メンバーが削除されても、その人が発行した招待や、その人のログインメール宛の招待が
-- 残っていると、本人（やその人が用意した別アドレス）が招待を受け入れて復帰できてしまう。
-- family_members 行が消える全ての経路（アプリの削除操作、管理者削除、
-- auth.users 削除によるカスケード）で保留中の招待を取り消す。
-- auth.users からのカスケードで削除された場合、この時点では該当ユーザーの
-- auth.users 行は見えない（email 側の条件は効かない）ため、invited_by 側だけが効く。
create function public.revoke_invitations_of_removed_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invitations
  set revoked_at = now()
  where family_id = old.family_id
    and accepted_at is null
    and revoked_at is null
    and (
      invited_by = old.id
      or invited_email = (select lower(email) from auth.users where id = old.user_id)
    );
  return old;
end;
$$;

revoke all on function public.revoke_invitations_of_removed_member() from public;

create trigger family_members_revoke_invitations
  before delete on public.family_members
  for each row
  execute function public.revoke_invitations_of_removed_member();

-- invitations_insert_own_family は「invited_by が同じFamilyのmember_id」までしか
-- 見ておらず、発行者本人のmember_idである保証がない。別のメンバーのidを invited_by
-- として記録できてしまうと、その人が削除されたとき上のトリガーが発行者違いの招待を
-- 取り消せない。invited_by を呼び出し元（auth.uid()）のmember_idに固定する。
alter policy "invitations_insert_own_family" on public.invitations
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = invited_by
        and fm.family_id = invitations.family_id
        and fm.user_id = auth.uid()
    )
    and accepted_at is null
    and accepted_by is null
    and revoked_at is null
    and expires_at > now()
    and expires_at <= now() + interval '30 days'
  );
