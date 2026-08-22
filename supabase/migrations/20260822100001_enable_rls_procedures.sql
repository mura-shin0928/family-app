-- procedures: このプロジェクト初の「行は誰でも読めるが、書けるのは特定の列だけ」テーブル。
alter table public.procedures enable row level security;

-- families/tasks/recipes と同様、Data API自動公開が無効な前提のプロジェクトのため
-- テーブル権限を明示的に付与する。
grant select on public.procedures to anon;
grant select on public.procedures to authenticated;
grant insert on public.procedures to authenticated;
-- 確認操作で触る列だけを許可する。本文・期限・引用・source_url は後から書き換えられない。
grant update (status, verified_at, verified_by, obligation) on public.procedures to authenticated;
grant select, insert, update, delete on public.procedures to service_role;

-- draft も家族に見せる（「未確認」セクションに出すため）。archived だけ隠す。
create policy "procedures_select" on public.procedures
  for select
  to authenticated
  using (status in ('draft', 'published'));

-- 取り込みは家族の誰でも。ただし入るのは必ず未確認の draft
-- （published は確認ポリシー経由のみ、下の procedures_verify を参照）。
create policy "procedures_insert_draft" on public.procedures
  for insert
  to authenticated
  with check (
    status = 'draft'
    and verified_at is null
    and verified_by is null
    and exists (select 1 from public.family_members fm where fm.user_id = auth.uid())
  );

-- 確認できるのは app_admin ではなく、どこかのFamilyに所属している人なら誰でも
-- （担当者を持たず「気づいた人がその場で押す」運用と一貫）。
-- verified_by を他人にすり替えられないことだけ with check で縛る。
create policy "procedures_verify" on public.procedures
  for update
  to authenticated
  using (exists (select 1 from public.family_members fm where fm.user_id = auth.uid()))
  with check (verified_by = auth.uid());

-- delete のポリシーは無い = アプリからは行を消せない（間違いは archived にする）。
-- service_role はアプリランタイム・取り込みのいずれでも使わない。
