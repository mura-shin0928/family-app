-- app_admin（is_app_admin()）に、Family/メンバー/招待の管理権限を付与する。
-- tasks/recipes のポリシーは意図的に一切変更しない
-- — admin であっても他家族の家庭内データ（タスク・レシピ）は見えない、という
-- 構造上の境界を保つため。admin権限は「Familyという器とそのメンバー」に限定する。

-- families: 閲覧を全Familyに拡張し、新規作成を許可する。
alter policy "families_select_own" on public.families
  using (public.is_family_member(id) or public.is_app_admin());

grant insert on public.families to authenticated;

create policy "families_insert_admin" on public.families
  for insert
  to authenticated
  with check (public.is_app_admin());

-- family_members: 閲覧・削除を全Familyに拡張する。
-- （insertは既存どおりRPC accept_invitation 経由のみ = admin.mtsのremove-memberと
-- 同じ理由でアプリの通常フローに寄せず、開発者向けの直接操作を増やさない）
alter policy "family_members_select_own_family" on public.family_members
  using (public.is_family_member(family_id) or public.is_app_admin());

alter policy "family_members_delete_own_family" on public.family_members
  using (public.is_family_member(family_id) or public.is_app_admin());

-- invitations: 閲覧・取り消し(update)・削除を全Familyに拡張する。
alter policy "invitations_select_own_family" on public.invitations
  using (public.is_family_member(family_id) or public.is_app_admin());

alter policy "invitations_revoke_own_family" on public.invitations
  using (public.is_family_member(family_id) or public.is_app_admin())
  with check (public.is_family_member(family_id) or public.is_app_admin());

alter policy "invitations_delete_inactive_own_family" on public.invitations
  using (
    (public.is_family_member(family_id) or public.is_app_admin())
    and (revoked_at is not null or expires_at <= now())
  );

-- invitations の発行(insert)はメンバー専用ポリシーとは別に用意する
-- （invited_by が必ず自分の family_members.id を指す既存ポリシーに
-- admin を混ぜると「他Familyのmember_idを騙る」余地ができてしまうため）。
-- admin発行の招待は invited_by を null にする — scripts/admin.mts の
-- createInvitationRow と同じ「管理側発行」のセマンティクス。
create policy "invitations_insert_admin" on public.invitations
  for insert
  to authenticated
  with check (
    public.is_app_admin()
    and invited_by is null
    and accepted_at is null
    and accepted_by is null
    and revoked_at is null
    and expires_at > now()
    and expires_at <= now() + interval '30 days'
  );
