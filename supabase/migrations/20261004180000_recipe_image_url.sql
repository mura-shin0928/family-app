-- recipes.image_url: 取り込み元ページの代表画像のURL。画像そのものは保存しない。
alter table public.recipes
  add column image_url text
  check (image_url is null or (char_length(image_url) <= 2000 and image_url like 'https://%'));

-- create_recipe / update_recipe に p_image_url を足す。引数が増えるので作り直す。
-- default null なので、p_image_url を渡さない呼び出しもそのまま通る。
drop function public.create_recipe(uuid, text, text, text, text, jsonb);
drop function public.update_recipe(uuid, text, text, text, text, jsonb);

-- p_ingredients: [{ "name": text, "quantity": text }, ...]（並び順 = 配列の順）
create function public.create_recipe(
  p_id uuid,
  p_title text,
  p_source_url text,
  p_source_text text,
  p_note text,
  p_ingredients jsonb,
  p_image_url text default null
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

  insert into public.recipes (id, family_id, title, source_url, source_text, note, image_url, created_by)
  values (
    p_id,
    v_family_id,
    p_title,
    nullif(p_source_url, ''),
    nullif(p_source_text, ''),
    nullif(p_note, ''),
    nullif(p_image_url, ''),
    v_member_id
  );

  insert into public.recipe_ingredients (recipe_id, family_id, name, quantity, sort_order)
  select p_id, v_family_id, item ->> 'name', nullif(item ->> 'quantity', ''), (ord - 1)::integer
  from jsonb_array_elements(p_ingredients) with ordinality as t (item, ord);
end;
$$;

revoke all on function public.create_recipe(uuid, text, text, text, text, jsonb, text) from public;
grant execute on function public.create_recipe(uuid, text, text, text, text, jsonb, text) to authenticated;

-- p_ingredients: [{ "id"?: uuid, "name": text, "quantity": text }, ...]
-- id のある行は更新（task_id は触らないので「買うもの」への紐付けが残る）、無い行は追加、
-- 渡されなかった既存の行は削除する。
create function public.update_recipe(
  p_recipe_id uuid,
  p_title text,
  p_source_url text,
  p_source_text text,
  p_note text,
  p_ingredients jsonb,
  p_image_url text default null
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
      note = nullif(p_note, ''),
      image_url = nullif(p_image_url, '')
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

revoke all on function public.update_recipe(uuid, text, text, text, text, jsonb, text) from public;
grant execute on function public.update_recipe(uuid, text, text, text, text, jsonb, text) to authenticated;
