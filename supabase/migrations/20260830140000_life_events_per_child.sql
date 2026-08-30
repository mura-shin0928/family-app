-- 手続きを「子供単位」にする（P6-4 レビュー反映）。
-- プラン §1 の「コピー先は family 単位で1本のリスト」(2026-08-27 PO確定) を見直し、
-- すべての手続きを特定の子に紐づける。妊活も子供必須にする（子の登録は先に済ませる）。
-- 本番の life_events 行はまだ無い（あっても叩き台）ためデータ移行はしない。

-- 1. children: 日付なしでも登録可に。
--    妊活は子の登録前＝出産予定日も出生日も無いことが多い。
alter table public.children
  drop constraint children_needs_a_date;

-- 2. life_events: child_id を必須化。
--    破壊的: child_id が無い既存行（ローカル共有DBに残った叩き台のみ。CI は空DBなので no-op）
--    を先に掃除する。
delete from public.life_event_procedures
  where life_event_id in (
    select id from public.life_events where child_id is null
  );
delete from public.life_events where child_id is null;

alter table public.life_events
  alter column child_id set not null;
-- started_on は残す（妊活 anchor_event='event_start' の基準日。子に日付が無いため）。
-- child_id の FK は既に on delete cascade。

-- 3. life_event_procedures: 非正規化列 child_id を足す
--    （family_id と同じ方針＝RLSと子ごとクエリを join なしで書くため）。
alter table public.life_event_procedures
  add column child_id uuid references public.children(id) on delete cascade;

update public.life_event_procedures p
  set child_id = e.child_id
  from public.life_events e
  where e.id = p.life_event_id;

alter table public.life_event_procedures
  alter column child_id set not null;

-- 4. sort_order を子スコープに。並び順は「その子の1本のリスト」で持つ
--    （妊娠の項目とお宮参りが時系列で混ざるのは同じ子の中での話）。
drop index public.life_event_procedures_family_idx;
create index life_event_procedures_child_idx
  on public.life_event_procedures (child_id, sort_order)
  where deleted_at is null;

-- 5. RLS: child_id 必須化と非正規化列の一致チェックを policy に反映。
drop policy "life_events_insert_own_family" on public.life_events;
create policy "life_events_insert_own_family" on public.life_events
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = life_events.family_id
    )
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.family_id = life_events.family_id
    )
  );

drop policy "life_events_update_own_family" on public.life_events;
create policy "life_events_update_own_family" on public.life_events
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = life_events.family_id
    )
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.family_id = life_events.family_id
    )
  );

drop policy "life_event_procedures_insert_own_family" on public.life_event_procedures;
create policy "life_event_procedures_insert_own_family" on public.life_event_procedures
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.life_events e
      where e.id = life_event_id
        and e.family_id = life_event_procedures.family_id
        and e.child_id = life_event_procedures.child_id
    )
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.family_id = life_event_procedures.family_id
    )
  );

drop policy "life_event_procedures_update_own_family" on public.life_event_procedures;
create policy "life_event_procedures_update_own_family" on public.life_event_procedures
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.life_events e
      where e.id = life_event_id
        and e.family_id = life_event_procedures.family_id
        and e.child_id = life_event_procedures.child_id
    )
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.family_id = life_event_procedures.family_id
    )
  );
