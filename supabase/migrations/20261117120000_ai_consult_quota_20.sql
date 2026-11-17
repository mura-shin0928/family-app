-- AI への相談の1日の上限を 10 回から 20 回にする。
-- 1回の相談は、質問（proposeQuestions）と提案（proposePlan）でそれぞれ枠を使うので 2 回と数える。
-- 10 回のままだと 1 日 5 相談しかできなかった。数え方は変えず、上限を倍にして 1 日 10 相談にする。
-- 本体は 20261112120000_ai_consult_quota.sql と同じで、v_daily_limit だけを変える。
create or replace function public.consume_ai_consult_quota()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  -- 1 相談 = 2 回（質問と提案）なので、20 回で 1 日 10 相談
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

  insert into public.ai_consult_usage as u (family_id, day, count)
  values (v_family_id, v_today, 1)
  on conflict (family_id) do update
    set day = excluded.day,
        count = case when u.day = excluded.day then u.count + 1 else 1 end
    where u.day <> excluded.day
       or u.count < v_daily_limit;

  return found;
end;
$$;

revoke all on function public.consume_ai_consult_quota() from public;
grant execute on function public.consume_ai_consult_quota() to authenticated;
