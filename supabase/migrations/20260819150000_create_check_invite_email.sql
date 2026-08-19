-- check_invite_email: 未ログインの訪問者が /invite/<token> でメールアドレスを
-- 入力した際に使う、anon実行可能な事前確認関数。invitation_preview と違い
-- auth.uid() ではなくクライアントが入力したメールをそのまま照合する。
-- この関数自体は本人確認にはならない（実際の所有証明はこのあとの
-- マジックリンク認証が担う）。あくまで「別画面に飛ばされずに、送信前に
-- 招待と合っているか確認できる」ためのUX上のショートカット。
create or replace function public.check_invite_email(p_token_hash text, p_email text)
returns table (family_name text, status text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_inv public.invitations;
begin
  select * into v_inv from public.invitations where token_hash = p_token_hash;

  if not found then
    return query select null::text, 'not_found'::text;
    return;
  end if;

  return query
    select
      f.name,
      case
        when v_inv.revoked_at is not null then 'revoked'
        when v_inv.accepted_at is not null then 'used'
        when v_inv.expires_at <= now() then 'expired'
        when lower(p_email) is distinct from v_inv.invited_email then 'email_mismatch'
        else 'ok'
      end
    from public.families f
    where f.id = v_inv.family_id;
end;
$$;

revoke all on function public.check_invite_email(text, text) from public;
grant execute on function public.check_invite_email(text, text) to anon, authenticated;
