-- タスクとライフイベント項目にまたがる書き込みを、1トランザクションの関数にまとめる。
-- 20261004120000_recipe_write_functions.sql と同じ方針（security invoker、家族は auth.uid() から引く）。
-- 省略できる引数は default null にしている。

-- p_record_child_id を渡すと、その子の記録（life_event_items）を in_task で作ってタスクに繋ぐ。
create or replace function public.create_task(
  p_id uuid,
  p_title text,
  p_is_purchase boolean,
  p_due_on date default null,
  p_purchase_location_id uuid default null,
  p_record_child_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
  v_item_id uuid;
begin
  select id, family_id into v_member_id, v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_member_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  if p_purchase_location_id is not null and not exists (
    select 1 from public.purchase_locations
    where id = p_purchase_location_id
      and family_id = v_family_id
      and deleted_at is null
  ) then
    raise exception 'purchase_location_not_found' using errcode = 'P0002';
  end if;

  if p_record_child_id is not null then
    if not exists (
      select 1 from public.children
      where id = p_record_child_id
        and family_id = v_family_id
        and deleted_at is null
    ) then
      raise exception 'child_not_found' using errcode = 'P0002';
    end if;

    -- 項目名の上限（100字）はタスク名（200字）より短い
    insert into public.life_event_items (family_id, child_id, catalog_key, title, status, created_by)
    values (v_family_id, p_record_child_id, null, left(p_title, 100), 'in_task', v_member_id)
    returning id into v_item_id;
  end if;

  insert into public.tasks (
    id, family_id, title, due_on, is_purchase, purchase_location_id,
    sort_order, created_by, life_event_item_id
  )
  values (
    p_id, v_family_id, p_title, p_due_on, p_is_purchase, p_purchase_location_id,
    public.next_task_sort_order(v_family_id), v_member_id, v_item_id
  );
end;
$$;

revoke all on function public.create_task(uuid, text, boolean, date, uuid, uuid) from public;
grant execute on function public.create_task(uuid, text, boolean, date, uuid, uuid) to authenticated;

-- カタログ項目をタスクにする。同じ項目がすでに in_task ならその項目に繋ぎ、done なら断る。
-- 戻り値は作ったタスクの id。
create or replace function public.add_life_event_item_to_task(
  p_child_id uuid,
  p_catalog_key text,
  p_item_title text,
  p_task_title text,
  p_item_note text default null,
  p_task_note text default null,
  p_url text default null,
  p_due_on date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
  v_item_id uuid;
  v_item_status text;
  v_task_id uuid := gen_random_uuid();
begin
  select id, family_id into v_member_id, v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_member_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.children
    where id = p_child_id
      and family_id = v_family_id
      and deleted_at is null
  ) then
    raise exception 'child_not_found' using errcode = 'P0002';
  end if;

  insert into public.life_event_items (family_id, child_id, catalog_key, title, note, status, created_by)
  values (v_family_id, p_child_id, p_catalog_key, p_item_title, p_item_note, 'in_task', v_member_id)
  on conflict (child_id, catalog_key) where deleted_at is null and catalog_key is not null
    do nothing
  returning id into v_item_id;

  if v_item_id is null then
    select id, status into v_item_id, v_item_status
    from public.life_event_items
    where child_id = p_child_id
      and catalog_key = p_catalog_key
      and deleted_at is null;

    if v_item_id is null then
      raise exception 'life_event_item_not_found' using errcode = 'P0002';
    end if;
    if v_item_status = 'done' then
      raise exception 'already_recorded' using errcode = 'P0001';
    end if;
  end if;

  insert into public.tasks (
    id, family_id, title, note, url, due_on, is_purchase,
    sort_order, created_by, life_event_item_id
  )
  values (
    v_task_id, v_family_id, p_task_title, p_task_note, p_url, p_due_on, false,
    public.next_task_sort_order(v_family_id), v_member_id, v_item_id
  );

  return v_task_id;
end;
$$;

revoke all on function public.add_life_event_item_to_task(uuid, text, text, text, text, text, text, date) from public;
grant execute on function public.add_life_event_item_to_task(uuid, text, text, text, text, text, text, date) to authenticated;

-- カタログ項目を「やった」として記録する。同じ項目が in_task で残っていれば done に変え、
-- あとのタスク操作で記録が巻き戻らないよう、タスクからの参照を外す。
create or replace function public.record_life_event_item_done(
  p_child_id uuid,
  p_catalog_key text,
  p_title text,
  p_done_on date,
  p_note text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
  v_item_id uuid;
  v_item_status text;
begin
  select id, family_id into v_member_id, v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_member_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.children
    where id = p_child_id
      and family_id = v_family_id
      and deleted_at is null
  ) then
    raise exception 'child_not_found' using errcode = 'P0002';
  end if;

  insert into public.life_event_items (
    family_id, child_id, catalog_key, title, note, status, done_on, created_by
  )
  values (v_family_id, p_child_id, p_catalog_key, p_title, p_note, 'done', p_done_on, v_member_id)
  on conflict (child_id, catalog_key) where deleted_at is null and catalog_key is not null
    do nothing
  returning id into v_item_id;

  if v_item_id is not null then
    return;
  end if;

  select id, status into v_item_id, v_item_status
  from public.life_event_items
  where child_id = p_child_id
    and catalog_key = p_catalog_key
    and deleted_at is null;

  if v_item_id is null then
    raise exception 'life_event_item_not_found' using errcode = 'P0002';
  end if;
  if v_item_status = 'done' then
    raise exception 'already_recorded' using errcode = 'P0001';
  end if;

  update public.life_event_items
  set status = 'done',
      done_on = p_done_on
  where id = v_item_id
    and status = 'in_task'
    and deleted_at is null;

  if not found then
    raise exception 'item_state_changed' using errcode = 'P0001';
  end if;

  update public.tasks
  set life_event_item_id = null
  where life_event_item_id = v_item_id;
end;
$$;

revoke all on function public.record_life_event_item_done(uuid, text, text, date, text) from public;
grant execute on function public.record_life_event_item_done(uuid, text, text, date, text) to authenticated;
