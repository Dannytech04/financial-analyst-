# FINANCIAL ANALYST | AI Trading Terminal

Financial Analyst combines professional trade logging with real-time journaling, progress tracking, strategic backtesting, and server-side AI market intelligence.

## Key Features

- Real-time trade journaling with PnL and session tracking
- AI trade audits and chart-image analysis with structured results
- Market briefings with live web-search citations
- Monte Carlo strategy simulation
- Performance dashboards and subscription-based AI quotas
- Supabase Auth, PostgreSQL persistence, Row Level Security, and realtime updates
- Paystack checkout with server-authoritative pricing and webhook activation

## Architecture

The React client uses Supabase Auth and the Supabase Data API for user-owned profiles, trades, goals, and subscriptions. PostgreSQL RLS and column-level grants enforce ownership and protect subscription, balance, usage, and timestamp fields.

The Express server verifies Supabase JWTs, reads authoritative subscription state with the Supabase service-role client, enforces quotas, and proxies AI and Paystack operations. The service-role key and third-party provider keys are server-only.

The AI gateway uses OpenAI models: `gpt-4o-mini` for fast operations and vision, and `gpt-4o` for deep analysis with fallback to the fast model. Market briefings use OpenAI web search so citations come from the same hosted provider rather than a separate search service.

## Environment Configuration

Copy the names from `.env.example` into the server environment without committing real values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_DB_URL=
PAYSTACK_SECRET_KEY=
PAYSTACK_PUBLIC_KEY=
AI_PROVIDER_API_KEY=
```

The browser only receives the public Supabase URL and anonymous key through Vite. Service-role, Paystack secret, and AI provider keys remain server-side.

## Build and Checks

- `npm run build`: builds the client and server bundle
- `npm run lint`: performs TypeScript checks
- `npm test`: runs the financial-engine tests

## Migration Notes

Apply the SQL migrations in `supabase/migrations/` before using the application. Existing Firebase users need an explicit identity migration plan because Firebase UIDs and Supabase UUIDs differ, and Firebase password hashes cannot be imported directly through the normal Supabase Auth flow. Use account linking or password resets before switching production traffic.

Paystack webhook processing verifies the raw request body with HMAC-SHA512 and activation is idempotent for an already-active matching subscription. Keep the old payment path available during a staged rollout so failed callbacks can be replayed safely.

## Disclaimer

Trading Forex and leveraged instruments involves substantial risk of capital loss. This application provides analytics and intelligence tools for research and informational purposes only and does not constitute financial advice.
