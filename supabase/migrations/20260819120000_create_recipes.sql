-- recipes: 「作りたい料理」の参照ストック（R0）。期限・完了は持たない。
create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 200),
  source_url text check (source_url is null or char_length(source_url) <= 2000),
  source_text text check (source_text is null or char_length(source_text) <= 20000),
  note text check (note is null or char_length(note) <= 2000),
  created_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index recipes_family_created_idx
  on public.recipes (family_id, created_at desc)
  where deleted_at is null;

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row
  execute function public.set_updated_at();

-- recipe_ingredients: レシピの構成要素かつ買い物候補。task_id で「買うもの」への追加済みを追跡する。
create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  -- tasks と同じ方針で family_id を非正規化する（RLSを join なしで書ける）
  family_id uuid not null references public.families(id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0 and char_length(name) <= 100),
  quantity text check (quantity is null or char_length(quantity) <= 50),
  sort_order integer not null,
  task_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipe_ingredients_recipe_idx
  on public.recipe_ingredients (recipe_id, sort_order);

create trigger recipe_ingredients_set_updated_at
  before update on public.recipe_ingredients
  for each row
  execute function public.set_updated_at();
