/*
# Lock client-owned columns and make trade identity unique

1. Security changes
- Clients may only update the editable trade fields; ownership, trade identity,
  and creation timestamps are immutable.
- Clients may only update editable goal fields; ownership and creation timestamps
  are immutable.
- Subscription and profile restrictions from earlier migrations remain intact.

2. Data integrity changes
- Add a unique constraint for each user's trade_id so repeated saves update the
  same journal entry instead of creating duplicate rows.

3. Compatibility
- Existing rows are preserved. No columns are dropped or renamed.
*/

DO $$ BEGIN
  ALTER TABLE trades ADD CONSTRAINT trades_user_trade_id_key UNIQUE (user_id, trade_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

REVOKE INSERT, UPDATE ON trades FROM authenticated;
GRANT INSERT (
  pair, type, entry_price, exit_price, lot_size, pnl, status, session,
  timestamp, notes, risk_percent, ai_feedback, is_analyzing
) ON trades TO authenticated;
GRANT UPDATE (
  pair, type, entry_price, exit_price, lot_size, pnl, status, session,
  timestamp, notes, risk_percent, ai_feedback, is_analyzing, updated_at
) ON trades TO authenticated;

REVOKE INSERT, UPDATE ON user_goals FROM authenticated;
GRANT INSERT (
  monthly_profit_target, win_rate_target, trades_per_month_target
) ON user_goals TO authenticated;
GRANT UPDATE (
  monthly_profit_target, win_rate_target, trades_per_month_target, updated_at
) ON user_goals TO authenticated;

REVOKE INSERT ON user_profiles FROM authenticated;
GRANT INSERT (username, display_name, email) ON user_profiles TO authenticated;

REVOKE INSERT ON user_subscriptions FROM authenticated;
GRANT INSERT (tier, status, subscription_expiry, usage_vision, usage_audit) ON user_subscriptions TO authenticated;
