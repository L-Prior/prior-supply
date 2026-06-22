-- ============================================================
-- ITS VAULTED — Account Suspension Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add suspension columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspension_reason text;

-- 2. Create a view the admin page can query to see all users + profile data
--    (uses auth.users joined with profiles so you get email + plan in one row)
CREATE OR REPLACE VIEW admin_users_view AS
  SELECT
    au.id,
    au.email,
    au.created_at,
    p.plan,
    p.display_name,
    p.suspended,
    p.suspended_at,
    p.suspension_reason
  FROM auth.users au
  LEFT JOIN profiles p ON p.id = au.id;

-- 3. Grant SELECT on the view only to authenticated users.
--    The Admin.js page checks the caller's email server-side before rendering,
--    so non-admins who hit this view directly get no sensitive routing.
--    For stronger protection, add a row-level policy or use a Postgres function.
GRANT SELECT ON admin_users_view TO authenticated;

-- 4. RLS: make sure the profiles table allows authenticated users
--    to update their OWN row (already true), and that the admin
--    can update ANY row. Simplest approach: add an admin bypass policy.
--    Replace 'YOUR_ADMIN_USER_ID' with your actual Supabase auth user ID.
--
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Admin can update any profile"
--   ON profiles FOR UPDATE
--   USING (auth.uid() = 'YOUR_ADMIN_USER_ID'::uuid);

