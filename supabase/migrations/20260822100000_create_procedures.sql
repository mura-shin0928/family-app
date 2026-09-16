-- procedures: 行政手続きのグローバルな参照カタログ（P0）。family_id を持たない
-- （「うちの家族のデータ」と「行政の事実」を混ぜない）。
-- 断定しない、はデータの作法: obligation/deadline/benefits には公式ページからの
-- 引用（*_quote）を持たせ、published になるにはDBのcheck制約でそれが必須。
create table public.procedures (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,

  -- 公開状態。家族が見られるのは draft（未確認セクション）/ published のみ
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),

  -- 必須性。根拠が取れないものは 'unknown'（要確認）に落ちる
  obligation text not null check (obligation in ('required', 'benefit', 'conditional', 'unknown')),
  obligation_quote text,

  -- 対象地域。全国地方公共団体コードの前方一致1本で 国 / 都道府県 / 市区町村 を表す。
  -- null = 全国 / 2桁 = 都道府県（例: '13' = 東京都） / 5桁 = 市区町村
  area_code text check (area_code is null or area_code ~ '^[0-9]{2}$' or area_code ~ '^[0-9]{5}$'),

  -- 期限。原文の数値と数え方を分けて保存する（日付への変換は純関数が行う）。
  deadline_kind text not null check (deadline_kind in ('fixed', 'relative', 'recommended', 'none', 'unknown')),
  deadline_on date,
  anchor_event text check (anchor_event in ('birth', 'expected_birth')),
  offset_count smallint,
  offset_counting text check (offset_counting in ('inclusive', 'exclusive', 'unknown')),
  window_from_days smallint,
  window_to_days smallint,
  deadline_quote text,
  deadline_note text,

  eligibility text,
  benefits jsonb not null default '[]'::jsonb,
  where_to_apply text,
  documents text,

  -- 情報源と鮮度。source_url が再取り込み時の同一性キー。
  source_url text not null unique,
  source_title text not null,
  fetched_at timestamptz not null,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint procedures_deadline_shape check (
    case deadline_kind
      when 'fixed'       then deadline_on is not null
      when 'relative'    then anchor_event is not null and offset_count is not null
      when 'recommended' then anchor_event is not null and window_from_days is not null and window_to_days is not null
      else true
    end),
  -- 公開の条件を制約にする: 人の承認が無いもの・引用の無い主張は published になれない
  constraint procedures_published_needs_verification check (
    status <> 'published' or (
      verified_at is not null
      and (obligation = 'unknown' or obligation_quote is not null)
      and (deadline_kind in ('none', 'unknown') or deadline_quote is not null)
    ))
);

create index procedures_area_idx on public.procedures (area_code)
  where status in ('draft', 'published');

create trigger procedures_set_updated_at
  before update on public.procedures
  for each row
  execute function public.set_updated_at();
