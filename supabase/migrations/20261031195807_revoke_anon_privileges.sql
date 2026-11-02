/*
# Revoke anon role privileges on all core tables

The default Supabase schema grants CRUD to anon on public tables.
RLS already blocks anon (no policies for that role), but we revoke
the grants for defense in depth — anon should never reach these tables.
*/

REVOKE ALL PRIVILEGES ON user_profiles FROM anon;
REVOKE ALL PRIVILEGES ON trades FROM anon;
REVOKE ALL PRIVILEGES ON user_goals FROM anon;
REVOKE ALL PRIVILEGES ON user_subscriptions FROM anon;

-- Re-grant column-restricted UPDATE for authenticated on user_profiles
REVOKE UPDATE ON user_profiles FROM authenticated;
GRANT UPDATE (username, display_name, email, updated_at) ON user_profiles TO authenticated;

-- Re-grant column-restricted UPDATE for authenticated on user_subscriptions
REVOKE UPDATE ON user_subscriptions FROM authenticated;
GRANT UPDATE (updated_at) ON user_subscriptions TO authenticated;
