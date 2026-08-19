-- 取り消し済み・期限切れの招待は「取り消す」操作ができないため、一覧から
-- 削除できるようにする。まだ有効な招待（pending）はここでは対象外
-- （誤って生きているリンクを消させないよう、先に取り消しを経由させる）。
grant delete on public.invitations to authenticated;

create policy "invitations_delete_inactive_own_family" on public.invitations
  for delete
  to authenticated
  using (
    public.is_family_member(family_id)
    and (revoked_at is not null or expires_at <= now())
  );
