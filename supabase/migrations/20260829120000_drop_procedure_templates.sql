-- ライフイベント再設計(P6)でテンプレ系3テーブルを捨てる。
-- family_procedures（手続き⇄Taskの紐付け）は「やることに追加」を一方向コピーに
-- 変えたため役目ごと無くなる（recipe_ingredients と違い、追加済み表示も再追加の
-- Undoも持たないため参照先が要らない）。
-- procedure_templates / procedure_template_items は life_events /
-- life_event_procedures へ作り直す（PO確定: 本番データは捨ててよい）。
-- family_procedures.template_item_id が procedure_template_items を参照するため、
-- この順に落とす。
drop table if exists public.family_procedures;
drop table if exists public.procedure_template_items;
drop table if exists public.procedure_templates;
