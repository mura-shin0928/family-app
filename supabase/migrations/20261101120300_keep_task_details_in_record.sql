-- 子の記録に残すタスクについて、完了時にメモと URL も記録へ写すかどうか。
alter table public.tasks
  add column keep_details_in_record boolean not null default true,
  -- 完了時に記録へ写した文。完了を取り消すときに取り除くため持つ
  add column note_copied_to_record text;

-- 記録のメモ（制度の公式ページなど）は消さず後ろに足す。
create or replace function public.sync_life_event_item_from_task()
returns trigger
language plpgsql
security invoker
as $$
declare
  v_item_note text;
  v_url text;
  v_note text;
  v_copied text;
begin
  if old.status = 'open' and new.status = 'done' then
    update public.life_event_items
      set status = 'done',
          done_on = (coalesce(new.completed_at, now()) at time zone 'Asia/Tokyo')::date
      where id = new.life_event_item_id
        and status = 'in_task'
        and deleted_at is null;

    if new.keep_details_in_record then
      select note into v_item_note
        from public.life_event_items
        where id = new.life_event_item_id
          and status = 'done'
          and deleted_at is null;

      -- 制度の公式ページなど、同じ文がすでにあれば足さない
      v_url := nullif(btrim(new.url), '');
      if position(v_url in coalesce(v_item_note, '')) > 0 then
        v_url := null;
      end if;
      v_note := nullif(btrim(new.note), '');
      if position(v_note in coalesce(v_item_note, '')) > 0 then
        v_note := null;
      end if;

      v_copied := concat_ws(E'\n\n', v_url, v_note);
      if v_item_note is not null then
        v_copied := left(v_copied, greatest(2000 - char_length(v_item_note) - 2, 0));
      end if;

      if found and v_copied <> '' then
        update public.life_event_items
          set note = case
            when v_item_note is null then v_copied
            else v_item_note || E'\n\n' || v_copied
          end
          where id = new.life_event_item_id;
        update public.tasks
          set note_copied_to_record = v_copied
          where id = new.id;
      end if;
    end if;
  elsif old.status = 'done' and new.status = 'open' then
    -- 記録側で直された文には手を付けない
    update public.life_event_items
      set status = 'in_task',
          done_on = null,
          note = case
            when note = new.note_copied_to_record then null
            when right(note, char_length(new.note_copied_to_record) + 2)
              = E'\n\n' || new.note_copied_to_record
              then left(note, -(char_length(new.note_copied_to_record) + 2))
            else note
          end
      where id = new.life_event_item_id
        and status = 'done'
        and deleted_at is null;

    if new.note_copied_to_record is not null then
      update public.tasks
        set note_copied_to_record = null
        where id = new.id;
    end if;
  end if;

  -- done の項目は記録として残す
  if old.deleted_at is null and new.deleted_at is not null then
    update public.life_event_items
      set deleted_at = now()
      where id = new.life_event_item_id
        and status = 'in_task'
        and deleted_at is null;
  end if;

  return null;
end;
$$;
