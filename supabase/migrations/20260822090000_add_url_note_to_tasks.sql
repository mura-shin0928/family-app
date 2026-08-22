-- tasks に url / note を追加（T1）。行政手続きの自治体ページや持ち物メモを保持する用途。
-- recipes.source_url / recipes.note と同じ形（NULL許容 + 文字数上限のみのCHECK）。
-- 列単位の権限制御は不要 — tasks は行単位のRLSのみで、既存の update ポリシーに乗る。
alter table public.tasks
  add column url text check (url is null or char_length(url) <= 2000),
  add column note text check (note is null or char_length(note) <= 2000);
