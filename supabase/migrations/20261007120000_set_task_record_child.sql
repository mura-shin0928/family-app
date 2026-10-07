-- 既存タスクの「どの子の記録に残すか」を付ける・外す・付け替える。
-- 項目の作成とタスクからの参照の更新を1トランザクションにまとめる（create_task と同じ理由）。
-- p_child_id が null なら外す。

create or replace function public.set_task_record_child(
  p_task_id uuid,
  p_child_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
  v_task public.tasks%rowtype;
  v_current_child_id uuid;
  v_item_id uuid;
begin
  select id, family_id into v_member_id, v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_member_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id
    and family_id = v_family_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'task_not_found' using errcode = 'P0002';
  end if;

  if p_child_id is not null and not exists (
    select 1 from public.children
    where id = p_child_id
      and family_id = v_family_id
      and deleted_at is null
  ) then
    raise exception 'child_not_found' using errcode = 'P0002';
  end if;

  -- 論理削除済みの項目を指しているタスクは、付いていないものとして扱う
  select child_id into v_current_child_id
  from public.life_event_items
  where id = v_task.life_event_item_id
    and deleted_at is null;

  if v_current_child_id is not distinct from p_child_id then
    return;
  end if;

  if p_child_id is not null then
    -- 完了済みのタスクに付けるときは、項目も済みで作る（完了時のトリガーと同じ日付の決め方）
    insert into public.life_event_items
      (family_id, child_id, catalog_key, title, status, done_on, created_by)
    values (
      v_family_id,
      p_child_id,
      null,
      left(v_task.title, 100),
      case when v_task.status = 'done' then 'done' else 'in_task' end,
      case when v_task.status = 'done'
        then (coalesce(v_task.completed_at, now()) at time zone 'Asia/Tokyo')::date
      end,
      v_member_id
    )
    returning id into v_item_id;
  end if;

  update public.tasks
    set life_event_item_id = v_item_id
    where id = p_task_id;

  -- 同じ項目を指すタスクがほかに残っていれば、項目は消さない
  if v_current_child_id is not null then
    update public.life_event_items li
      set deleted_at = now()
      where li.id = v_task.life_event_item_id
        and not exists (
          select 1 from public.tasks t
          where t.life_event_item_id = li.id
            and t.deleted_at is null
        );
  end if;
end;
$$;
revoke all on function public.set_task_record_child(uuid, uuid) from public;
grant execute on function public.set_task_record_child(uuid, uuid) to authenticated;
