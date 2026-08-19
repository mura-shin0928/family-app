alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;

grant select on public.recipes to anon;
grant select, insert, update on public.recipes to authenticated;
grant select, insert, update, delete on public.recipes to service_role;

grant select on public.recipe_ingredients to anon;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to service_role;

create policy "recipes_select_own_family" on public.recipes
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "recipes_insert_own_family" on public.recipes
  for insert to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = recipes.family_id
    )
  );

create policy "recipes_update_own_family" on public.recipes
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = recipes.family_id
    )
  );

-- recipe_ingredients は編集のたび行が差し替わる構成要素のため、
-- このプロジェクトで初めて delete ポリシーを持つテーブルになる
-- （レシピ側の deleted_at が復旧の受け皿になるため物理削除を許容する）。
create policy "recipe_ingredients_select_own_family" on public.recipe_ingredients
  for select to authenticated
  using (public.is_family_member(family_id));

create policy "recipe_ingredients_insert_own_family" on public.recipe_ingredients
  for insert to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.family_id = recipe_ingredients.family_id
    )
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.family_id = recipe_ingredients.family_id
      )
    )
  );

create policy "recipe_ingredients_update_own_family" on public.recipe_ingredients
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.family_id = recipe_ingredients.family_id
    )
    and (
      task_id is null
      or exists (
        select 1 from public.tasks t
        where t.id = task_id and t.family_id = recipe_ingredients.family_id
      )
    )
  );

create policy "recipe_ingredients_delete_own_family" on public.recipe_ingredients
  for delete to authenticated
  using (public.is_family_member(family_id));
