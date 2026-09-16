-- 行政カタログ(procedures)との突き合わせを白紙化する(P6-3で方針変更)。
--
-- 経緯: procedures カタログ + discover/ingest 一式は取り込みUIが無いまま
-- どこからも使われておらず、life_event_procedures.category はその突き合わせの
-- 結合キーとしてだけ存在していた。「行政手続きかどうか」が分かれば十分で、
-- 地方自治体の手続きとの照合はまた必要になったときに作り直す、とPOが確定。
-- (自治体・都道府県の実測は git 履歴に残る)
--
-- あわせて life_event_procedures.decided_by(government/tradition/family の3値)を
-- is_government(boolean)に畳む。tradition と family は表示にも挙動にも差が無く、
-- 時期の硬さは timing_kind が別に持っているため。

drop table if exists public.procedures cascade;

-- families の対象自治体列。procedures の area_code 前方一致のためだけに足したが、
-- 設定UIも無いまま使われていない。
alter table public.families
  drop column if exists municipality_code,
  drop column if exists municipality_name;

alter table public.life_event_procedures
  add column is_government boolean not null default false;

update public.life_event_procedures
  set is_government = (decided_by = 'government');

alter table public.life_event_procedures
  drop column decided_by,
  drop column category;
