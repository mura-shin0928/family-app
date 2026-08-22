-- families に対象自治体を追加（P0）。自治体マスタテーブルは作らない
-- （対象は当面1自治体で、コードから名前を引く用途が「familiesに入れた値をそのまま表示する」
-- 以外に無いため）。設定UIはP2で作る。既存のfamiliesは select のみ許可（SQL Editor運用）の
-- ままなので、ここではRLSを変更しない。
alter table public.families
  add column municipality_code text,
  add column municipality_name text;
