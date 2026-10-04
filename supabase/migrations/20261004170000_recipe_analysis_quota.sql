-- レシピ解析（外部 URL の取得と Gemini の呼び出し）の回数を、家族ごとに1日単位で制限する。

-- 家族ごとに1行。日付が変わったら同じ行を上書きする。
-- authenticated には権限もポリシーも与えないので、下の関数を通してしか読み書きできない。
create table public.recipe_analysis_usage (
  family_id uuid primary key references public.families (id) on delete cascade,
  day date not null,
  count integer not null check (count > 0)
);

alter table public.recipe_analysis_usage enable row level security;

grant select, insert, update, delete on public.recipe_analysis_usage to service_role;

-- 家族ごとの上限。null なら関数内の既定値、0 ならその家族の解析を止める。
-- authenticated には update を与えない（families の update ポリシーは家族のメンバーを通すので、
-- 列の権限を与えるとメンバーが自分の上限を書き換えられる）。変更は下の admin 用の関数で行う。
alter table public.families
  add column recipe_analysis_daily_limit integer
    check (recipe_analysis_daily_limit is null or recipe_analysis_daily_limit >= 0);

-- 今日の枠を1回分使う。使えたら true、上限に達していたら false。
-- security definer にする（呼び出したユーザーに書き込みを許すと、自分で回数を戻せてしまう）。
-- 家族は引数で受け取らず auth.uid() の所属から引き、上限も引数にしない。
-- 日付は日本時間で切り替える。
create or replace function public.consume_recipe_analysis_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_default_daily_limit constant integer := 30;
  v_today date := (now() at time zone 'Asia/Tokyo')::date;
  v_family_id uuid;
  v_daily_limit integer;
begin
  select fm.family_id, coalesce(f.recipe_analysis_daily_limit, v_default_daily_limit)
  into v_family_id, v_daily_limit
  from public.family_members fm
  join public.families f on f.id = fm.family_id
  where fm.user_id = auth.uid();

  if v_family_id is null then
    raise exception 'not_a_family_member' using errcode = '42501';
  end if;

  if v_daily_limit <= 0 then
    return false;
  end if;

  insert into public.recipe_analysis_usage as u (family_id, day, count)
  values (v_family_id, v_today, 1)
  on conflict (family_id) do update
    set day = excluded.day,
        count = case when u.day = excluded.day then u.count + 1 else 1 end
    where u.day <> excluded.day
       or u.count < v_daily_limit;

  return found;
end;
$$;

revoke all on function public.consume_recipe_analysis_quota() from public;
grant execute on function public.consume_recipe_analysis_quota() to authenticated;

-- app_admin が家族ごとの上限を変える。p_daily_limit が null なら既定値に戻す。
create or replace function public.set_family_recipe_analysis_daily_limit(
  p_family_id uuid,
  p_daily_limit integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'not_app_admin' using errcode = '42501';
  end if;

  update public.families
  set recipe_analysis_daily_limit = p_daily_limit
  where id = p_family_id;

  if not found then
    raise exception 'family_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_family_recipe_analysis_daily_limit(uuid, integer) from public;
grant execute on function public.set_family_recipe_analysis_daily_limit(uuid, integer) to authenticated;
