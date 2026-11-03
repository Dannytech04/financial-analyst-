# Supabase Security Specification & Invariants

## Architecture & Source of Truth
Persistent financial data is authoritative ONLY within Supabase (Postgres). The browser's `localStorage` is strictly restricted to ephemeral non-critical client preferences (such as dark/light UI theme and widget dashboard layout). Trade journals, monthly goals, user accounts, subscription state, and AI usage counts must never be persisted to or trusted from `localStorage`.

### Tables & Column Scope

1. **user_profiles** (`user_id` references `auth.users.id`)
   - *Client-Editable Columns*: `username`, `display_name`, `email`, `updated_at`
   - *Immutable Columns*: `user_id`, `created_at`
   - *Disallowed Columns*: `tier`, `usage_count`, `subscription_expiry` (live in `user_subscriptions`; client has no INSERT/UPDATE on them here)
2. **trades** (`user_id` references `auth.users.id`)
   - *Client-Editable Columns*: `pair`, `type`, `entry_price`, `exit_price`, `lot_size`, `pnl`, `status`, `session`, `timestamp`, `notes`, `risk_percent`, `ai_feedback`, `is_analyzing`, `updated_at`, `trade_id` (client-generated on INSERT, immutable on UPDATE)
   - *Immutable Columns*: `user_id`, `created_at`, `id`
   - *Strict Enums*: `type` ('BUY' | 'SELL'), `status` ('WIN' | 'LOSS' | 'BE'), `session` ('LONDON' | 'NEW_YORK' | 'ASIAN' | 'OVERLAP')
   - *Deduplication*: unique constraint on `(user_id, trade_id)`
3. **user_goals** (`user_id` references `auth.users.id`, one row per user)
   - *Client-Editable Columns*: `monthly_profit_target`, `win_rate_target`, `trades_per_month_target`, `updated_at`
   - *Immutable Columns*: `user_id`, `created_at`, `id`
   - *No DELETE*: authenticated role has DELETE revoked
4. **user_subscriptions** (`user_id` references `auth.users.id`, one row per user)
   - *Server-Controlled Protected Columns*: `tier`, `subscription_expiry`, `user_id`, `balance`
   - *Monotonic Columns*: `usage_count.vision`, `usage_count.audit` (client can only increment via `increment_usage` SECURITY DEFINER function; direct column UPDATE is revoked)
   - *Client-Editable Columns*: none beyond what the server function allows
   - *Initial Creation*: server inserts `tier: 'FREE'` and zeroed counters `{ vision: 0, audit: 0 }`
   - *No DELETE*: authenticated role has DELETE revoked

---

## Core Security Invariants

1. **Authentication Boundary**: Unauthenticated requests are rejected. RLS policies are scoped `TO authenticated`; the `anon` role has no privileges on any table.
2. **User Isolation**: RLS policies enforce `auth.uid() = user_id` on every SELECT, INSERT, UPDATE, and DELETE. Cross-user reads or writes are rejected.
3. **No Collection Listing**: There is no root-level listing surface; Supabase does not expose a "list all users" path to the client.
4. **Column-Level Privilege Separation**: Row policies alone do not restrict which columns can be written. Table-level INSERT/UPDATE grants are revoked and replaced with column-restricted grants on only the client-owned fields. Privileged columns (`tier`, `subscription_expiry`, `balance`, `usage_count`) are writable only by the service-role client (server) or the `increment_usage` SECURITY DEFINER function.
5. **Anti-Ghost Field Defense**: Postgres rejects unknown columns at the database level — inserting a field not defined in the table schema fails with a 42703 error. No extra/ghost fields can be written.
6. **Tier Privilege Escalation Defense**: Clients have no INSERT or UPDATE grant on `tier` or `subscription_expiry` in `user_subscriptions`. Only the service-role client (server) can set these. A client cannot create or upgrade their own tier.
7. **Usage Monotonicity**: Direct UPDATE on `usage_count` is revoked from authenticated. The `increment_usage` SECURITY DEFINER function atomically increments counters and only allows values >= existing. Counters can never decrease through any client path.
8. **Ownership Immutability**: `user_id` has no client INSERT/UPDATE grant on trades, user_goals, or user_subscriptions. On `user_profiles`, `user_id` defaults to `auth.uid()` and is not client-writable. Ownership cannot be transferred or spoofed.
9. **Trade Identity Immutability**: `trade_id` is client-settable on INSERT (client-generated deduplication key) but is excluded from the UPDATE grant, making it immutable after creation.
10. **Singleton Enforcement**: `user_goals` and `user_subscriptions` are one-row-per-user by upsert with `onConflict: 'user_id'`. DELETE is revoked so clients cannot delete and recreate to reset state.
11. **Function Search Path Pinning**: All SECURITY DEFINER functions (`set_updated_at`, `increment_usage`) pin `SET search_path = public` to prevent search_path shadowing attacks.
12. **Function Execute Grants**: `increment_usage` has EXECUTE revoked from PUBLIC/anon/authenticated and granted only to `service_role`. `set_updated_at` is a trigger function granted to the table owner. No privileged function is callable by client roles.

---

## RLS Policy Summary

Every table has RLS enabled with four policies (SELECT, INSERT, UPDATE, DELETE), each scoped `TO authenticated` with `auth.uid() = user_id`:

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| user_profiles | own row | own row | own row (column-restricted) | revoked |
| trades | own rows | own rows (column-restricted) | own rows (column-restricted) | own rows |
| user_goals | own row | own row (column-restricted) | own row (column-restricted) | revoked |
| user_subscriptions | own row | none (server-only) | own row (column-restricted) | revoked |

### Column-Restricted Grants

**user_profiles** — UPDATE (`username`, `display_name`, `email`)
**trades** — INSERT (`trade_id`, `pair`, `type`, `entry_price`, `exit_price`, `lot_size`, `pnl`, `status`, `session`, `timestamp`, `notes`, `risk_percent`, `ai_feedback`, `is_analyzing`); UPDATE (`pair`, `type`, `entry_price`, `exit_price`, `lot_size`, `pnl`, `status`, `session`, `timestamp`, `notes`, `risk_percent`, `ai_feedback`, `is_analyzing`)
**user_goals** — INSERT (`monthly_profit_target`, `win_rate_target`, `trades_per_month_target`); UPDATE (`monthly_profit_target`, `win_rate_target`, `trades_per_month_target`)
**user_subscriptions** — UPDATE: none client-writable beyond what the server function controls

---

## Server-Side Enforcement

The Express server uses a Supabase service-role client (bypasses RLS) for all privileged writes:

- **Auth verification**: `verifyAuthToken` decodes the JWT, checks `exp` and `iss`, then calls `supabaseAdmin.auth.getUser(token)` to confirm validity with Supabase Auth.
- **Subscription authority**: `getAuthoritativeSubscription` reads `user_subscriptions` via the service-role client. Missing or error returns FREE tier. Expired subscriptions are downgraded to FREE in-memory (and the row is updated).
- **Usage recording**: `recordServerUsage` calls the `increment_usage` SECURITY DEFINER function via the service-role client.
- **Payment activation**: `activateSubscriptionFromPayment` writes `tier` and `subscription_expiry` via the service-role client. Includes idempotency check: if an ACTIVE subscription with matching tier and future expiry already exists, the existing state is returned without re-writing.
- **Webhook idempotency**: Paystack webhook verifies HMAC-SHA512 signature using `timingSafeEqual` on the raw body. Duplicate `charge.success` events for the same reference are idempotent because `activateSubscriptionFromPayment` checks for existing ACTIVE state first.

---

## Test Invariants (Supabase RLS)

The following invariants, previously enforced by `firestore.rules.test.ts`, are now enforced by Supabase RLS + column grants + CHECK constraints. A replacement test suite should verify:

1. **Unauthenticated Read/Write**: anon-key client cannot SELECT, INSERT, UPDATE, or DELETE on any table.
2. **Cross-User Access**: authenticated user B cannot read or write user A's rows in trades, user_goals, or user_subscriptions.
3. **Spoofed User ID**: client cannot set `user_id` on INSERT (no grant on the column; defaults to `auth.uid()` on user_profiles).
4. **Spoofed Tier on Create/Update**: client cannot INSERT or UPDATE `tier` on `user_subscriptions` (column not in any client grant).
5. **Spoofed Usage Decrease**: client cannot directly UPDATE `usage_count`; only `increment_usage` (service-role only) can modify it, and only upward.
6. **Ghost Fields Injection**: inserting a column not in the schema fails with a Postgres error.
7. **Invalid Data Types**: CHECK constraints reject non-numeric `balance`, `pnl`, `entry_price`, etc. (columns are typed numeric).
8. **Invalid Enum Values**: Postgres enum types reject values outside the allowed set (`type`, `status`, `session`, `tier`, `subscription_status`).
9. **Oversized Strings**: CHECK constraints enforce `pair` length <= 10, `notes` length <= 2000.
10. **Numeric Bounds**: CHECK constraints enforce `lot_size` > 0, `risk_percent` between 0 and 100, `pnl` bounds, `balance` >= 0, `monthly_profit_target` >= 0, `win_rate_target` between 0 and 100, `trades_per_month_target` >= 0.
11. **Singleton Immutability**: DELETE on `user_goals` and `user_subscriptions` is revoked; clients cannot delete and recreate to reset state.
12. **Trade Deduplication**: unique constraint on `(user_id, trade_id)` prevents duplicate trade entries per user.
