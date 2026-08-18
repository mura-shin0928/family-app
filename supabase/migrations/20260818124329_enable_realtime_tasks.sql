-- tasksテーブルの変更をSupabase Realtime（postgres_changes）で配信できるようにする。
-- 配信される行はRLSのSELECTポリシー（tasks_select_own_family）でfamily単位に絞られる。
alter publication supabase_realtime add table public.tasks;
