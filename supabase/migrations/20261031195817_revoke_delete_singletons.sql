/*
# Revoke DELETE from authenticated on singleton tables

user_goals and user_subscriptions should never be deleted by clients.
RLS already blocks it (no DELETE policy), but revoke the grant for defense in depth.
*/

REVOKE DELETE ON user_goals FROM authenticated;
REVOKE DELETE ON user_subscriptions FROM authenticated;
REVOKE DELETE ON user_profiles FROM authenticated;
