-- tasks に purchase_location_id を追加（買う場所 N:1）。
-- 場所を論理削除しても tasks 側の id は消さず、UI で「未知の id = 未設定」として描画する。
-- ハード削除される経路は families/family cascade 経由のみで、そのときは set null で落とす。
-- url/note 追加時と同じく列単位の権限制御は不要（tasks は行単位の RLS のみ）。
alter table public.tasks
  add column purchase_location_id uuid references public.purchase_locations(id) on delete set null;
