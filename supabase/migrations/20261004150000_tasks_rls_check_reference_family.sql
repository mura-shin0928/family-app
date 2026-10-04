-- tasks の purchase_location_id / life_event_item_id も、created_by / completed_by と同じく
-- 「同じ家族の行」であることを検証する。
-- 論理削除済みの行を指したままのタスクも更新できるよう、deleted_at は条件に入れない。
alter policy "tasks_insert_own_family" on public.tasks
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by
        and fm.family_id = tasks.family_id
    )
    and (
      purchase_location_id is null
      or exists (
        select 1 from public.purchase_locations pl
        where pl.id = purchase_location_id
          and pl.family_id = tasks.family_id
      )
    )
    and (
      life_event_item_id is null
      or exists (
        select 1 from public.life_event_items li
        where li.id = life_event_item_id
          and li.family_id = tasks.family_id
      )
    )
  );

alter policy "tasks_update_own_family" on public.tasks
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by
        and fm.family_id = tasks.family_id
    )
    and (
      completed_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = completed_by
          and fm.family_id = tasks.family_id
      )
    )
    and (
      purchase_location_id is null
      or exists (
        select 1 from public.purchase_locations pl
        where pl.id = purchase_location_id
          and pl.family_id = tasks.family_id
      )
    )
    and (
      life_event_item_id is null
      or exists (
        select 1 from public.life_event_items li
        where li.id = life_event_item_id
          and li.family_id = tasks.family_id
      )
    )
  );
