-- レシピまわりの複数テーブルへの書き込みを、1トランザクションの関数にまとめる。
-- security invoker なので、行へのアクセスは呼び出したユーザーの RLS がそのまま決める。
-- 家族は引数で受け取らず、auth.uid() の所属から引く。
-- 文字列の引数は、空文字列を「未入力」として null で保存する。

-- tasks.sort_order の次の値。同じ家族の同時追加で値が重ならないよう、
-- トランザクションが終わるまで家族単位のロックを取る。
create or replace function public.next_task_sort_order(p_family_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_next integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('tasks.sort_order:' || p_family_id::text, 0));

  select coalesce(max(sort_order), 0) + 1 into v_next
  from public.tasks
  where family_id = p_family_id
    and deleted_at is null;

  return v_next;
end;
$$;

revoke all on function public.next_task_sort_order(uuid) from public;
grant execute on function public.next_task_sort_order(uuid) to authenticated;

-- p_ingredients: [{ "name": text, "quantity": text }, ...]（並び順 = 配列の順）
create or replace function public.create_recipe(
  p_id uuid,
  p_title text,
  p_source_url text,
  p_source_text text,
  p_note text,
  p_ingredients jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
begin
  select id, family_id into v_member_id, v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_member_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  insert into public.recipes (id, family_id, title, source_url, source_text, note, created_by)
  values (
    p_id,
    v_family_id,
    p_title,
    nullif(p_source_url, ''),
    nullif(p_source_text, ''),
    nullif(p_note, ''),
    v_member_id
  );

  insert into public.recipe_ingredients (recipe_id, family_id, name, quantity, sort_order)
  select p_id, v_family_id, item ->> 'name', nullif(item ->> 'quantity', ''), (ord - 1)::integer
  from jsonb_array_elements(p_ingredients) with ordinality as t (item, ord);
end;
$$;

revoke all on function public.create_recipe(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.create_recipe(uuid, text, text, text, text, jsonb) to authenticated;

-- p_ingredients: [{ "id"?: uuid, "name": text, "quantity": text }, ...]
-- id のある行は更新（task_id は触らないので「買うもの」への紐付けが残る）、無い行は追加、
-- 渡されなかった既存の行は削除する。
create or replace function public.update_recipe(
  p_recipe_id uuid,
  p_title text,
  p_source_url text,
  p_source_text text,
  p_note text,
  p_ingredients jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_family_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  update public.recipes
  set title = p_title,
      source_url = nullif(p_source_url, ''),
      source_text = nullif(p_source_text, ''),
      note = nullif(p_note, '')
  where id = p_recipe_id
    and family_id = v_family_id
    and deleted_at is null;

  if not found then
    raise exception 'recipe_not_found' using errcode = 'P0002';
  end if;

  delete from public.recipe_ingredients
  where recipe_id = p_recipe_id
    and family_id = v_family_id
    and id not in (
      select (item ->> 'id')::uuid
      from jsonb_array_elements(p_ingredients) as t (item)
      where item ->> 'id' is not null
    );

  insert into public.recipe_ingredients (id, recipe_id, family_id, name, quantity, sort_order)
  select
    coalesce((item ->> 'id')::uuid, gen_random_uuid()),
    p_recipe_id,
    v_family_id,
    item ->> 'name',
    nullif(item ->> 'quantity', ''),
    (ord - 1)::integer
  from jsonb_array_elements(p_ingredients) with ordinality as t (item, ord)
  on conflict (id) do update
    set name = excluded.name,
        quantity = excluded.quantity,
        sort_order = excluded.sort_order
    where recipe_ingredients.recipe_id = p_recipe_id;
end;
$$;

revoke all on function public.update_recipe(uuid, text, text, text, text, jsonb) from public;
grant execute on function public.update_recipe(uuid, text, text, text, text, jsonb) to authenticated;

-- 選んだ材料を「買うもの」のタスクにし、材料側に task_id を残す。
-- 戻り値は作ったタスクの id（材料の並び順）。取り消しに使う。
create or replace function public.add_ingredients_to_purchases(
  p_recipe_id uuid,
  p_ingredient_ids uuid[]
)
returns uuid[]
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member_id uuid;
  v_family_id uuid;
  v_sort_order integer;
  v_task_id uuid;
  v_task_ids uuid[] := '{}';
  v_ingredient record;
begin
  select id, family_id into v_member_id, v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_member_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  if (
    select count(*)
    from public.recipe_ingredients
    where recipe_id = p_recipe_id
      and family_id = v_family_id
      and id = any (p_ingredient_ids)
  ) <> coalesce(cardinality(p_ingredient_ids), 0) then
    raise exception 'ingredients_not_found' using errcode = 'P0002';
  end if;

  v_sort_order := public.next_task_sort_order(v_family_id);

  for v_ingredient in
    select id, name
    from public.recipe_ingredients
    where recipe_id = p_recipe_id
      and family_id = v_family_id
      and id = any (p_ingredient_ids)
    order by sort_order
  loop
    v_task_id := gen_random_uuid();

    insert into public.tasks (id, family_id, title, due_on, is_purchase, sort_order, created_by)
    values (v_task_id, v_family_id, v_ingredient.name, null, true, v_sort_order, v_member_id);

    update public.recipe_ingredients
    set task_id = v_task_id
    where id = v_ingredient.id;

    v_task_ids := v_task_ids || v_task_id;
    v_sort_order := v_sort_order + 1;
  end loop;

  return v_task_ids;
end;
$$;

revoke all on function public.add_ingredients_to_purchases(uuid, uuid[]) from public;
grant execute on function public.add_ingredients_to_purchases(uuid, uuid[]) to authenticated;

-- add_ingredients_to_purchases の取り消し。タスクを論理削除し、材料側の task_id を外す。
create or replace function public.undo_add_ingredients_to_purchases(p_task_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_family_id uuid;
begin
  select family_id into v_family_id
  from public.family_members
  where user_id = auth.uid();

  if v_family_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  update public.tasks
  set deleted_at = now()
  where id = any (p_task_ids)
    and family_id = v_family_id;

  update public.recipe_ingredients
  set task_id = null
  where task_id = any (p_task_ids)
    and family_id = v_family_id;
end;
$$;

revoke all on function public.undo_add_ingredients_to_purchases(uuid[]) from public;
grant execute on function public.undo_add_ingredients_to_purchases(uuid[]) to authenticated;
