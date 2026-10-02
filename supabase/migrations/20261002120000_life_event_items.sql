-- life_event_items: 子ごとに、家族が手を付けたカタログ項目（またはカタログ外の項目）。
-- タスクにある間は in_task、やった日を記録したら done。
create table public.life_event_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  -- カタログ外の項目は null
  catalog_key text check (catalog_key is null or char_length(catalog_key) <= 200),
  -- 作成時点の項目名。カタログ側の言い換えは反映しない
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 100),
  note text check (note is null or char_length(note) <= 2000),
  status text not null check (status in ('in_task', 'done')),
  done_on date,
  created_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint life_event_items_done_on_matches_status
    check ((status = 'done') = (done_on is not null))
);

create unique index life_event_items_child_catalog_key_uniq
  on public.life_event_items (child_id, catalog_key)
  where deleted_at is null and catalog_key is not null;

create index life_event_items_family_idx
  on public.life_event_items (family_id)
  where deleted_at is null;

create trigger life_event_items_set_updated_at
  before update on public.life_event_items
  for each row
  execute function public.set_updated_at();

-- RLS: 削除は論理削除のみ。delete ポリシーは置かない。
alter table public.life_event_items enable row level security;

grant select on public.life_event_items to anon;
grant select, insert, update on public.life_event_items to authenticated;
grant select, insert, update, delete on public.life_event_items to service_role;

create policy "life_event_items_select_own_family" on public.life_event_items
  for select
  to authenticated
  using (public.is_family_member(family_id));

create policy "life_event_items_insert_own_family" on public.life_event_items
  for insert
  to authenticated
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = life_event_items.family_id
    )
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.family_id = life_event_items.family_id
    )
  );

create policy "life_event_items_update_own_family" on public.life_event_items
  for update
  to authenticated
  using (public.is_family_member(family_id))
  with check (
    public.is_family_member(family_id)
    and exists (
      select 1 from public.family_members fm
      where fm.id = created_by and fm.family_id = life_event_items.family_id
    )
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.family_id = life_event_items.family_id
    )
  );

-- タスクから項目への参照。null のタスクは同期しない。
alter table public.tasks
  add column life_event_item_id uuid
    references public.life_event_items(id) on delete set null;

-- タスクの完了・完了解除・削除を項目へ反映する。
-- security invoker なので、操作した人の RLS で他家族の項目には届かない。
create or replace function public.sync_life_event_item_from_task()
returns trigger
language plpgsql
security invoker
as $$
begin
  if old.status = 'open' and new.status = 'done' then
    update public.life_event_items
      set status = 'done',
          done_on = (coalesce(new.completed_at, now()) at time zone 'Asia/Tokyo')::date
      where id = new.life_event_item_id
        and status = 'in_task'
        and deleted_at is null;
  elsif old.status = 'done' and new.status = 'open' then
    update public.life_event_items
      set status = 'in_task',
          done_on = null
      where id = new.life_event_item_id
        and status = 'done'
        and deleted_at is null;
  end if;

  -- done の項目は記録として残す
  if old.deleted_at is null and new.deleted_at is not null then
    update public.life_event_items
      set deleted_at = now()
      where id = new.life_event_item_id
        and status = 'in_task'
        and deleted_at is null;
  end if;

  return null;
end;
$$;

create trigger tasks_sync_life_event_item
  after update on public.tasks
  for each row
  when (new.life_event_item_id is not null)
  execute function public.sync_life_event_item_from_task();

-- 旧 life_event_procedures の済んだ項目だけを記録として移す。
-- catalog_key は (種別, 項目名) でカタログに引く。引けないものは null。
-- 同じ子・同じ key が重なったら、やった日が早い1行だけに key を付ける（部分ユニークのため）。
insert into public.life_event_items
  (family_id, child_id, catalog_key, title, note, status, done_on, created_by)
select
  m.family_id,
  m.child_id,
  case when m.key_rank = 1 then m.catalog_key end,
  m.title,
  m.note,
  'done',
  m.done_on,
  m.created_by
from (
  select
    p.family_id,
    p.child_id,
    k.catalog_key,
    p.title,
    p.note,
    p.done_on,
    e.created_by,
    row_number() over (
      partition by p.child_id, k.catalog_key
      order by p.done_on, p.created_at, p.id
    ) as key_rank
  from public.life_event_procedures p
  join public.life_events e on e.id = p.life_event_id
  left join (
    values
    ('preconception', '基礎体温の記録をつけ始める', 'preconception:start-basal-body-temperature'),
    ('preconception', 'パートナーと妊活の進め方を話す', 'preconception:discuss-conception-plan'),
    ('preconception', '風しんの抗体検査を受ける(必要ならワクチン接種)', 'preconception:rubella-antibody-test'),
    ('preconception', 'ブライダルチェック(妊娠に向けた基礎的な検査)を受ける', 'preconception:bridal-check'),
    ('preconception', '不妊検査・不妊治療の助成制度を確認する', 'preconception:check-infertility-subsidy'),
    ('preconception', '半年〜1年で授からなければクリニックを受診する', 'preconception:visit-clinic-if-not-conceived'),
    ('pregnancy', '産院を決める・分娩予約をする', 'pregnancy:choose-maternity-clinic'),
    ('pregnancy', '母子健康手帳をもらう', 'pregnancy:get-maternal-health-handbook'),
    ('pregnancy', '里帰り出産をするか検討する', 'pregnancy:consider-satogaeri-birth'),
    ('pregnancy', '戌の日の安産祈願(帯祝い)をする', 'pregnancy:inu-no-hi-prayer'),
    ('pregnancy', '産休・育休の取得について会社と相談する', 'pregnancy:talk-leave-with-employer'),
    ('pregnancy', '妊婦のための支援給付を確認する', 'pregnancy:check-pregnancy-support-benefit'),
    ('pregnancy', '名前の候補を考える', 'pregnancy:consider-baby-names'),
    ('pregnancy', 'ベビー用品・チャイルドシートを準備する', 'pregnancy:prepare-baby-goods-car-seat'),
    ('pregnancy', '妊婦健診を受ける', 'pregnancy:prenatal-checkups'),
    ('birth', '出生届を出す', 'birth:birth-registration'),
    ('birth', '健康保険の加入手続きをする', 'birth:enroll-health-insurance'),
    ('birth', '出産育児一時金を申請する', 'birth:apply-childbirth-lump-sum'),
    ('birth', '乳幼児医療証を申請する', 'birth:apply-infant-medical-certificate'),
    ('birth', '児童手当を申請する', 'birth:apply-child-allowance'),
    ('birth', '新生児訪問を受ける', 'birth:newborn-home-visit'),
    ('birth', 'お宮参りに行く', 'birth:omiyamairi'),
    ('birth', '予防接種のスケジュールを確認する', 'birth:check-vaccination-schedule'),
    ('birth', 'お食い初め(百日祝い)をする', 'birth:okuizome'),
    ('birth', '初節句を祝う', 'birth:first-sekku'),
    ('birth', '乳児健診(3〜4か月児健診)を受ける', 'birth:infant-checkup-3-4-months'),
    ('birth', '復職のタイミングを考える', 'birth:consider-return-to-work'),
    ('birth', '学資保険・教育費の準備を検討する', 'birth:consider-education-savings'),
    ('birth', '初誕生(1歳の誕生日)を祝う', 'birth:first-birthday'),
    ('birth', '児童手当の現況届が必要か確認する', 'birth:check-child-allowance-status-report'),
    ('birth', '1歳6か月児健診を受ける', 'birth:checkup-18-months'),
    ('birth', '3歳児健診を受ける', 'birth:checkup-3-years'),
    ('nursery', '保活の方針を考える(認可保育園・幼稚園など)', 'nursery:consider-nursery-strategy'),
    ('nursery', '保育所等の入園を検討・申し込む', 'nursery:apply-nursery'),
    ('school', '小学校の就学先(学区・区域外就学・受験など)を検討する', 'school:consider-elementary-school'),
    ('school', '学童保育(放課後児童クラブ)を利用するか検討する', 'school:consider-after-school-care'),
    ('school', '就学時健康診断を受ける', 'school:school-entrance-health-check'),
    ('school', '小学校入学の準備をする', 'school:prepare-elementary-entry')
  ) as k (kind, title, catalog_key)
    on k.kind = e.kind and k.title = p.title
  where p.status = 'done'
    and p.deleted_at is null
) as m;

drop table public.life_event_procedures;
drop table public.life_events;
