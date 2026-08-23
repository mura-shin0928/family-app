-- 出産テンプレートを「6歳ごろ(小学校入学前)まで」に広げるため、乳幼児健診・
-- 保育所入園・就学時健診など6件のカテゴリを追加する（既存8種は変更しない）。
alter table public.procedures
  drop constraint procedures_category_check;

alter table public.procedures
  add constraint procedures_category_check check (category is null or category in (
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
  ));

alter table public.procedure_template_items
  drop constraint procedure_template_items_category_check;

alter table public.procedure_template_items
  add constraint procedure_template_items_category_check check (category is null or category in (
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
  ));
