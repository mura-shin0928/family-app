-- F1（seido-data-hub の制度一覧）: 家族の自治体と、手続き項目の公式ページURL。
--
-- 1. families.municipality_code / municipality_name を戻す（P6-3 で drop 済み）。
--    今回は seido-data-hub API の自治体（6桁の団体コード）を指す。名前も持つのは、
--    手続き画面の「◯◯市の制度を見る」を API を呼ばずに出すため（自治体名は変わらない前提の
--    コピー。採用した制度の内容を life_event_procedures にコピーするのと同じ流儀）。
alter table public.families
  add column municipality_code text
    check (municipality_code is null or municipality_code ~ '^[0-9]{6}$'),
  add column municipality_name text
    check (municipality_name is null or char_length(municipality_name) <= 50),
  add constraint families_municipality_both_or_neither
    check ((municipality_code is null) = (municipality_name is null));

-- families はこれまで select のみ（名前・メンバー管理は SQL Editor 運用）。
-- 自治体だけは家族が「家族」画面で選ぶので、この2列に限って update を許す
-- （列単位の grant なので name は引き続き書き換えられない）。
grant update (municipality_code, municipality_name) on public.families to authenticated;

create policy "families_update_municipality_own" on public.families
  for update
  to authenticated
  using (public.is_family_member(id))
  with check (public.is_family_member(id));

-- 2. life_event_procedures.url: 制度一覧から足した項目の公式ページ（プランでは F2 だったが、
--    URL が無いと追加後に公式ページへ辿れないため F1 で足す）。上限は tasks.url と揃える。
alter table public.life_event_procedures
  add column url text check (url is null or char_length(url) <= 2000);
