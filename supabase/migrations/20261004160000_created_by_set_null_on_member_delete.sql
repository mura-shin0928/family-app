-- メンバーを削除しても、その人が作成した行は残す。created_by は null になる。

alter table public.tasks
  alter column created_by drop not null,
  drop constraint tasks_created_by_fkey,
  add constraint tasks_created_by_fkey
    foreign key (created_by) references public.family_members(id) on delete set null;

alter table public.recipes
  alter column created_by drop not null,
  drop constraint recipes_created_by_fkey,
  add constraint recipes_created_by_fkey
    foreign key (created_by) references public.family_members(id) on delete set null;

alter table public.children
  alter column created_by drop not null,
  drop constraint children_created_by_fkey,
  add constraint children_created_by_fkey
    foreign key (created_by) references public.family_members(id) on delete set null;

alter table public.purchase_locations
  alter column created_by drop not null,
  drop constraint purchase_locations_created_by_fkey,
  add constraint purchase_locations_created_by_fkey
    foreign key (created_by) references public.family_members(id) on delete set null;

alter table public.life_event_items
  alter column created_by drop not null,
  drop constraint life_event_items_created_by_fkey,
  add constraint life_event_items_created_by_fkey
    foreign key (created_by) references public.family_members(id) on delete set null;

-- update は created_by が null の行（作成者が削除済み）も通す。
-- insert ポリシーは変えないので、新規行は引き続き同じ家族のメンバーが必須。

alter policy "tasks_update_own_family" on public.tasks
  with check (
    public.is_family_member(family_id)
    and (
      created_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = created_by
          and fm.family_id = tasks.family_id
      )
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

alter policy "recipes_update_own_family" on public.recipes
  with check (
    public.is_family_member(family_id)
    and (
      created_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = created_by and fm.family_id = recipes.family_id
      )
    )
  );

alter policy "children_update_own_family" on public.children
  with check (
    public.is_family_member(family_id)
    and (
      created_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = created_by and fm.family_id = children.family_id
      )
    )
  );

alter policy "purchase_locations_update_own_family" on public.purchase_locations
  with check (
    public.is_family_member(family_id)
    and (
      created_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = created_by and fm.family_id = purchase_locations.family_id
      )
    )
  );

alter policy "life_event_items_update_own_family" on public.life_event_items
  with check (
    public.is_family_member(family_id)
    and (
      created_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = created_by and fm.family_id = life_event_items.family_id
      )
    )
  );
