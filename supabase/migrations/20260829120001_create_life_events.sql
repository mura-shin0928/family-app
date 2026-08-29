-- life_events: 家族が選んで足したライフイベント。種別と基準日だけを持つ薄いレコード。
-- 「どのテンプレを流し込んだか」と「いつを基準に考えるか」以外の情報は持たない
-- （項目そのものは life_event_procedures 側にコピーされ、以後は家族が自由に編集する）。
create table public.life_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  kind text not null check (kind in ('preconception', 'birth', 'nursery', 'school')),
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 50),
  -- 基準日: 出産系は children から、妊活などは started_on から引く。
  -- どちらも未入力でよい（時期は「目安が出せない」だけで、リスト自体は使える）。
  child_id uuid references public.children(id) on delete cascade,
  started_on date,
  created_by uuid not null references public.family_members(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 「1家族1イベント種別」の unique 制約は付けない（第2子・複数イベントのため）。
create index life_events_family_idx on public.life_events (family_id)
  where deleted_at is null;

create trigger life_events_set_updated_at
  before update on public.life_events
  for each row
  execute function public.set_updated_at();

-- life_event_procedures: 家族の手続きリスト。テンプレからコピーされ、以後は家族が
-- 自由に編集する。この「編集済みのリストそのもの」が家族の記録になるため、完了状態も
-- 実施ログも持たない（済んだかどうかは tasks 側の話）。
-- 並び順は family 単位で1本 — 妊活の項目とお宮参りが時系列で混ざるのが自然なため、
-- イベントをまたいで入れ替えられるようにする。
create table public.life_event_procedures (
  id uuid primary key default gen_random_uuid(),
  -- 非正規化: RLSを join なしで書くため（tasks / recipe_ingredients と同じ方針）
  family_id uuid not null references public.families(id) on delete cascade,
  life_event_id uuid not null references public.life_events(id) on delete cascade,
  sort_order integer not null,
  title text not null check (char_length(btrim(title)) > 0 and char_length(title) <= 100),
  note text check (note is null or char_length(note) <= 2000),
  -- 誰が決めたか。procedures.obligation の「必須/任意/条件付き」はここでは使わない
  -- （行政制度の属性としては正しいが、お宮参りを「任意」と呼んでも情報にならないため）。
  decided_by text not null check (decided_by in ('government', 'tradition', 'family')),
  -- 時期の硬さ。表示にだけ効く（「9月2日まで」/「妊娠5か月ごろ」）。
  timing_kind text not null check (timing_kind in ('deadline', 'around')),
  -- 'event_start' は life_events.started_on 基準（妊活など子に紐づかないイベント）。
  anchor_event text check (anchor_event in ('birth', 'expected_birth', 'event_start')),
  -- 符号付き。負=基準日より前。目安であり、procedures.offset_counting のような
  -- 厳密な数え方の区別は持たない（正確な数え方は一致した procedures 側のquoteに委ねる）。
  offset_days smallint,
  -- 行政カタログ(procedures)との突き合わせ用。decided_by='government' の項目のみ持つ。
  -- 慣習・自分たちの項目は null（照合先がそもそも無い）。
  category text check (category is null or category in (
    'maternal_child_health_handbook',
    'pregnancy_checkup_subsidy',
    'pregnancy_birth_support_payment',
    'birth_registration',
    'maternity_lump_sum',
    'newborn_home_visit',
    'infant_medical_subsidy',
    'child_allowance',
    'health_insurance_dependent',
    'nursery_enrollment',
    'health_checkup_18m',
    'health_checkup_3y',
    'preschool_health_checkup',
    'elementary_school_enrollment'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index life_event_procedures_family_idx
  on public.life_event_procedures (family_id, sort_order)
  where deleted_at is null;

create trigger life_event_procedures_set_updated_at
  before update on public.life_event_procedures
  for each row
  execute function public.set_updated_at();
