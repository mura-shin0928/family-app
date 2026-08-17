-- Family: 家族の共有単位。
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- family_members: email を先に登録し、初回サインイン時に user_id を紐付ける（招待フローなしの参加方式）。
-- 多対多のまま保つ（1ユーザー1家族に短絡しない）。
create table public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (family_id, email),
  unique (family_id, user_id)
);

create index family_members_user_id_idx on public.family_members (user_id);
