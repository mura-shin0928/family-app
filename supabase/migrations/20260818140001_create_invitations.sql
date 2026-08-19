-- invitations: Familyへの招待。
-- 生トークンは保存しない（DB流出時に再利用可能な鍵を残さないため）。
-- token_hash は sha256(token) の hex（アプリ側で計算して渡す。node:crypto と
-- 同じアルゴリズムをSQL側で再実装しない）。
create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  token_hash text not null unique,
  invited_email text not null check (invited_email = lower(invited_email)),
  display_name text not null
    check (char_length(btrim(display_name)) > 0 and char_length(display_name) <= 50),
  -- null = 管理側（service_role）が発行した招待。
  invited_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null check (expires_at > created_at),
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);

-- /family 画面の「招待中一覧」を支える。
create index invitations_family_id_idx on public.invitations (family_id, created_at desc);
