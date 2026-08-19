alter table public.invitations enable row level security;

-- families/family_members と異なり、招待は一般公開の読み取り対象ではないため
-- anon には一切 grant しない。
grant select, insert on public.invitations to authenticated;
-- 取り消しのみ許可する（列単位）。expires_at 等の改ざんは列権限レベルで拒否される。
grant update (revoked_at) on public.invitations to authenticated;
grant select, insert, update, delete on public.invitations to service_role;

create policy "invitations_select_own_family" on public.invitations
  for select
  to authenticated
  using (public.is_family_member(family_id));

-- 「自分が所属するFamilyにのみ招待を発行できる」の最終防衛線。
-- invited_by が null（管理側名義のなりすまし）や他家族のmember_idだと通らない。
-- expires_at の上限（30日）もここでDB側から強制する。
create policy "invitations_insert_own_family" on public.invitations
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = invited_by
        and fm.family_id = invitations.family_id
    )
    and accepted_at is null
    and accepted_by is null
    and revoked_at is null
    and expires_at > now()
    and expires_at <= now() + interval '30 days'
  );

-- 取り消し（revoked_at のセット）は自分のFamilyの招待に対してのみ。
-- 実際に更新できる列は上記の column grant で revoked_at のみに絞られている。
create policy "invitations_revoke_own_family" on public.invitations
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));
