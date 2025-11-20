-- Create test users (handled by Supabase Auth in real scenario, but for local dev we might need to insert into app_user manually if triggers aren't set up, 
-- OR we assume the user signs up via UI. For seed, let's insert some static data if we can, but auth.users is protected.
-- Instead, let's assume we will create users via UI or SQL interface later. 
-- But we can insert some initial rules/settings for a hypothetical user if we knew their ID.
-- Since we don't know IDs yet, we'll leave this empty or add a comment.

-- Example of what we might want to insert once we have users:
/*
INSERT INTO public.child_settings (child_id, yen_per_point, closing_day, base_allowance_yen)
VALUES ('<child-uuid>', 10, 25, 500);

INSERT INTO public.rule_snapshot (child_id, month, label, points, status, created_by)
VALUES ('<child-uuid>', '2023-10', 'Dishwashing', 10, 'active', '<parent-uuid>');
*/
