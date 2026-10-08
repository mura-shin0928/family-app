-- Web 検索（Tavily の呼び出し）の回数を、家族ごとに1日単位で制限する。

-- 家族ごとに1行。日付が変わったら同じ行を上書きする。
-- authenticated には権限もポリシーも与えないので、下の関数を通してしか読み書きできない。
create table public.web_search_usage (
  family_id uuid primary key references public.families (id) on delete cascade,
  day date not null,
  count integer not null check (count > 0)
);

alter table public.web_search_usage enable row level security;

grant select, insert, update, delete on public.web_search_usage to service_role;

-- 今日の枠を1回分使う。使えたら true、上限に達していたら false。
-- security definer にする（呼び出したユーザーに書き込みを許すと、自分で回数を戻せてしまう）。
-- 家族は引数で受け取らず auth.uid() の所属から引き、上限も引数にしない。
-- 日付は日本時間で切り替える。
create or replace function public.consume_web_search_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_daily_limit constant integer := 20;
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_family_id uuid;
begin
  select fm.family_id
  into v_family_id
  from public.family_members fm
  where fm.user_id = auth.uid();

  if v_family_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  insert into public.web_search_usage as u (family_id, day, count)
  values (v_family_id, v_today, 1)
  on conflict (family_id) do update
    set day = excluded.day,
        count = case when u.day = excluded.day then u.count + 1 else 1 end
    where u.day <> excluded.day
       or u.count < v_daily_limit;

  return found;
end;
$$;

revoke all on function public.consume_web_search_quota() from public;
grant execute on function public.consume_web_search_quota() to authenticated;
