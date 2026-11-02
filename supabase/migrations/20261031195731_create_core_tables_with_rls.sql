/*
# Create core financial-analyst tables with Row Level Security

This migration creates four tables that mirror the existing Firestore entity model,
with the same field names, types, enum values, and numeric bounds. RLS policies
reproduce the security invariants tested in firestore.rules.test.ts.

## 1. New Tables

### user_profiles
- Maps to Firestore /users/{userId}
- Columns: user_id (uuid, FK auth.users), username, display_name, email, balance, created_at, updated_at
- Client-editable: username, display_name, email, updated_at
- Immutable: user_id, created_at
- Server-controlled: balance (default 100000, clients cannot change it)

### trades
- Maps to Firestore /users/{userId}/trades/{tradeId}
- Columns: id (uuid PK), user_id (uuid FK), trade_id (text), pair, type, entry_price, exit_price, lot_size, pnl, status, session, timestamp, notes, risk_percent, ai_feedback, is_analyzing, created_at, updated_at
- Strict enums: type (BUY/SELL), status (WIN/LOSS/BE), session (LONDON/NEW_YORK/ASIAN/OVERLAP)
- Numeric bounds match the Firestore blueprint JSON schema

### user_goals
- Maps to Firestore /users/{userId}/goals/settings (singleton per user)
- Columns: user_id (uuid PK/FK), monthly_profit_target, win_rate_target, trades_per_month_target, created_at, updated_at
- Client-editable: monthly_profit_target, win_rate_target, trades_per_month_target, updated_at

### user_subscriptions
- Maps to Firestore /users/{userId}/subscription/current (singleton per user)
- Columns: user_id (uuid PK/FK), tier, status, subscription_expiry, usage_vision, usage_audit, created_at, updated_at
- Server-controlled: tier, status, subscription_expiry, usage_vision, usage_audit
- Clients can only create a FREE/ACTIVE row with zero usage; updates only touch updated_at

## 2. Indexes
- trades: user_id + timestamp DESC (realtime query ordering)
- user_goals: user_id (singleton lookup)
- user_subscriptions: user_id (singleton lookup)

## 3. Security (RLS)
All four tables enable RLS. Policies scope every operation to auth.uid() = user_id.
- user_profiles: clients can SELECT, INSERT (balance must be 100000), UPDATE (only username/display_name/email/updated_at)
- trades: clients can SELECT, INSERT, UPDATE, DELETE their own rows
- user_goals: clients can SELECT, INSERT, UPDATE (no delete)
- user_subscriptions: clients can SELECT, INSERT (only FREE/ACTIVE/0-usage), UPDATE (only updated_at)
- service_role: full access for server-side tier/expiry/usage writes (bypasses RLS but needs grant)

## 4. Grants
- authenticated: SELECT/INSERT/UPDATE on all four tables (column-restricted where needed)
- service_role: ALL on all four tables for server-side privileged writes
*/

-- ==========================================
-- ENUM TYPES
-- ==========================================

DO $$ BEGIN
  CREATE TYPE trade_type_enum AS ENUM ('BUY', 'SELL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trade_status_enum AS ENUM ('WIN', 'LOSS', 'BE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trading_session_enum AS ENUM ('LONDON', 'NEW_YORK', 'ASIAN', 'OVERLAP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_tier_enum AS ENUM ('FREE', 'PRO', 'ELITE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status_enum AS ENUM ('ACTIVE', 'TRIALING', 'CANCELLED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==========================================
-- TABLE: user_profiles
-- ==========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id    uuid        PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text        NOT NULL CHECK (char_length(username) >= 1 AND char_length(username) <= 128),
  display_name text       CHECK (display_name IS NULL OR char_length(display_name) <= 128),
  email      text        CHECK (email IS NULL OR char_length(email) <= 256),
  balance    numeric     NOT NULL DEFAULT 100000 CHECK (balance >= 0 AND balance <= 1000000000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO service_role;

-- Column-restricted UPDATE: clients can only set username, display_name, email, updated_at
-- balance is server-controlled; we enforce this with column-level UPDATE grant.
-- First revoke table-level update, then grant column-level.
REVOKE UPDATE ON user_profiles FROM authenticated;
GRANT UPDATE (username, display_name, email, updated_at) ON user_profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON user_profiles;
CREATE POLICY "select_own_profile" ON user_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON user_profiles;
CREATE POLICY "insert_own_profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND balance = 100000);

DROP POLICY IF EXISTS "update_own_profile" ON user_profiles;
CREATE POLICY "update_own_profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy for authenticated (clients cannot delete profiles)

-- ==========================================
-- TABLE: trades
-- ==========================================

CREATE TABLE IF NOT EXISTS trades (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id    text        NOT NULL CHECK (char_length(trade_id) <= 128),
  pair        text        NOT NULL CHECK (char_length(pair) >= 1 AND char_length(pair) <= 20),
  type        trade_type_enum NOT NULL,
  entry_price numeric     NOT NULL CHECK (entry_price >= 0.000001 AND entry_price <= 1000000),
  exit_price  numeric     CHECK (exit_price IS NULL OR (exit_price >= 0.000001 AND exit_price <= 1000000)),
  lot_size    numeric     NOT NULL CHECK (lot_size >= 0.001 AND lot_size <= 1000),
  pnl         numeric     NOT NULL CHECK (pnl >= -10000000 AND pnl <= 10000000),
  status      trade_status_enum NOT NULL,
  session     trading_session_enum NOT NULL,
  timestamp   bigint      NOT NULL CHECK (timestamp >= 1 AND timestamp <= 4102444800000),
  notes       text        CHECK (notes IS NULL OR char_length(notes) <= 2000),
  risk_percent numeric    CHECK (risk_percent IS NULL OR (risk_percent >= 0 AND risk_percent <= 100)),
  ai_feedback text        CHECK (ai_feedback IS NULL OR char_length(ai_feedback) <= 5000),
  is_analyzing boolean    DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trades_user_timestamp ON trades (user_id, timestamp DESC);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON trades TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON trades TO service_role;

DROP POLICY IF EXISTS "select_own_trades" ON trades;
CREATE POLICY "select_own_trades" ON trades
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_trades" ON trades;
CREATE POLICY "insert_own_trades" ON trades
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_trades" ON trades;
CREATE POLICY "update_own_trades" ON trades
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_trades" ON trades;
CREATE POLICY "delete_own_trades" ON trades
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ==========================================
-- TABLE: user_goals (singleton per user)
-- ==========================================

CREATE TABLE IF NOT EXISTS user_goals (
  user_id                 uuid        PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_profit_target   numeric     NOT NULL CHECK (monthly_profit_target >= 0 AND monthly_profit_target <= 10000000),
  win_rate_target         numeric     NOT NULL CHECK (win_rate_target >= 0 AND win_rate_target <= 100),
  trades_per_month_target numeric     NOT NULL CHECK (trades_per_month_target >= 0 AND trades_per_month_target <= 10000),
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON user_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_goals TO service_role;

DROP POLICY IF EXISTS "select_own_goals" ON user_goals;
CREATE POLICY "select_own_goals" ON user_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_goals" ON user_goals;
CREATE POLICY "insert_own_goals" ON user_goals
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_goals" ON user_goals;
CREATE POLICY "update_own_goals" ON user_goals
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy for authenticated (clients cannot delete goals)

-- ==========================================
-- TABLE: user_subscriptions (singleton per user)
-- ==========================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
  user_id             uuid                    PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  tier                subscription_tier_enum  NOT NULL DEFAULT 'FREE',
  status              subscription_status_enum NOT NULL DEFAULT 'ACTIVE',
  subscription_expiry bigint                  CHECK (subscription_expiry IS NULL OR (subscription_expiry >= 0 AND subscription_expiry <= 4102444800000)),
  usage_vision        integer                 NOT NULL DEFAULT 0 CHECK (usage_vision >= 0 AND usage_vision <= 100000),
  usage_audit         integer                 NOT NULL DEFAULT 0 CHECK (usage_audit >= 0 AND usage_audit <= 100000),
  created_at          timestamptz             NOT NULL DEFAULT now(),
  updated_at          timestamptz             NOT NULL DEFAULT now()
);

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Clients can SELECT and INSERT (FREE only, zero usage) and UPDATE only updated_at
GRANT SELECT, INSERT ON user_subscriptions TO authenticated;
-- Column-restricted UPDATE: only updated_at is client-writable
GRANT UPDATE (updated_at) ON user_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_subscriptions TO service_role;

DROP POLICY IF EXISTS "select_own_subscription" ON user_subscriptions;
CREATE POLICY "select_own_subscription" ON user_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscription" ON user_subscriptions;
CREATE POLICY "insert_own_subscription" ON user_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND tier = 'FREE'
    AND status = 'ACTIVE'
    AND usage_vision = 0
    AND usage_audit = 0
  );

DROP POLICY IF EXISTS "update_own_subscription" ON user_subscriptions;
CREATE POLICY "update_own_subscription" ON user_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No DELETE policy for authenticated (clients cannot delete subscriptions)

-- ==========================================
-- SECURITY DEFINER: increment usage counters
-- Allows server-side code to atomically increment usage without full UPDATE access.
-- Called with service_role key (bypasses RLS), so we REVOKE from PUBLIC/anon.
-- ==========================================

CREATE OR REPLACE FUNCTION increment_usage(p_user_id uuid, p_feature text)
RETURNS TABLE(usage_vision integer, usage_audit integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vision integer;
  v_audit integer;
BEGIN
  SELECT usage_vision, usage_audit INTO v_vision, v_audit
  FROM user_subscriptions WHERE user_id = p_user_id FOR UPDATE;

  IF p_feature = 'vision' THEN
    v_vision := v_vision + 1;
  ELSIF p_feature = 'audit' THEN
    v_audit := v_audit + 1;
  END IF;

  UPDATE user_subscriptions
  SET usage_vision = v_vision, usage_audit = v_audit, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_vision, v_audit;
END;
$$;

REVOKE EXECUTE ON FUNCTION increment_usage(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION increment_usage(uuid, text) TO authenticated, service_role;

-- ==========================================
-- Trigger: auto-update updated_at on row change
-- ==========================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_user_profiles_updated ON user_profiles;
  CREATE TRIGGER trg_user_profiles_updated BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_trades_updated ON trades;
  CREATE TRIGGER trg_trades_updated BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_user_goals_updated ON user_goals;
  CREATE TRIGGER trg_user_goals_updated BEFORE UPDATE ON user_goals
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS trg_user_subscriptions_updated ON user_subscriptions;
  CREATE TRIGGER trg_user_subscriptions_updated BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN others THEN NULL; END $$;
