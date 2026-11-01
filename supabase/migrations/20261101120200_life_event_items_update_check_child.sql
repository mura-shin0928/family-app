-- 20261004160000 で created_by の null許容に対応した際、life_event_items_update_own_family
-- の WITH CHECK から child_id の家族内チェックが抜けていた（他のテーブルの同種ポリシーには
-- 残っている）。これにより自分の行の child_id を他家族の子どもに書き換えられ、
-- (child_id, catalog_key) のユニーク制約を通じて相手のカタログ項目を妨害できる。
-- INSERT 側のチェック（元の UPDATE ポリシーにもあった）を復元する。
alter policy "life_event_items_update_own_family" on public.life_event_items
  with check (
    public.is_family_member(family_id)
    and (
      created_by is null
      or exists (
        select 1 from public.family_members fm
        where fm.id = created_by and fm.family_id = life_event_items.family_id
      )
    )
    and exists (
      select 1 from public.children c
      where c.id = child_id and c.family_id = life_event_items.family_id
    )
  );
