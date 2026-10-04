-- create_task に url / note を足す（共有シートからの追加で、リンクとメモ付きのタスクを作る）。
-- 引数を足した create or replace は別の関数（オーバーロード）になり、名前付き引数の
-- 呼び出しが曖昧になるので、古い定義を落としてから作り直す。
-- 本体は 20261004130000_task_write_functions.sql と同じ。

drop function if exists public.create_task(uuid, text, boolean, date, uuid, uuid);

create or replace function public.create_task(
  p_id uuid,
  p_title text,
  p_is_purchase boolean,
  p_due_on date default null,
  p_purchase_location_id uuid default null,
  p_record_child_id uuid default null,
  p_url text default null,
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
    id, family_id, title, due_on, is_purchase, purchase_location_id, url, note,
    sort_order, created_by, life_event_item_id
  )
  values (
    p_id, v_family_id, p_title, p_due_on, p_is_purchase, p_purchase_location_id, p_url, p_note,
    public.next_task_sort_order(v_family_id), v_member_id, v_item_id
  );
end;
$$;
revoke all on function public.create_task(uuid, text, boolean, date, uuid, uuid, text, text) from public;
grant execute on function public.create_task(uuid, text, boolean, date, uuid, uuid, text, text) to authenticated;
