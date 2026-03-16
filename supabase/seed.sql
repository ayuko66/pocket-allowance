-- MVP では Magic Link で作成される実ユーザー ID と紐づくため、
-- 汎用 seed は固定値で投入しにくい。
-- 必要な場合は Supabase Auth でユーザー作成後、発行された UUID を使って
-- 下記テンプレートを編集して実行する。

-- insert into public.household (id, name, invite_code, created_by)
-- values ('00000000-0000-0000-0000-000000000001', 'デモ世帯', 'DEMO2026', '親ユーザーUUID');

-- insert into public.app_user (id, household_id, role, display_name)
-- values
--   ('親ユーザーUUID', '00000000-0000-0000-0000-000000000001', 'parent', '親'),
--   ('子ユーザーUUID', '00000000-0000-0000-0000-000000000001', 'child', '子');

-- insert into public.link_parent_child (household_id, parent_id, child_id)
-- values ('00000000-0000-0000-0000-000000000001', '親ユーザーUUID', '子ユーザーUUID');

-- insert into public.child_settings (child_id, yen_per_point)
-- values ('子ユーザーUUID', 100);
