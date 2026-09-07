# FINANCIAL ANALYST | AI Trading Terminal

A high-performance Forex tracking and analysis application designed for real-time journaling, progress tracking, strategic backtesting, and AI-driven market intelligence.

## 🚀 Overview

Financial Analyst combines professional trade logging with server-side AI assistance. It provides trade execution audits, market structure visual analysis, and real-time market sentiment grounded in Google Search.

### Key Features
- **Real-time Journaling:** Track currency trades with automated PnL calculation and session tracking.
- **AI Trade Auditing:** Automated risk/reward review and execution feedback.
- **Chart Vision:** Upload chart screenshots for AI-driven technical analysis, trend assessment, and support/resistance detection.
- **Market Intelligence:** Live financial news briefings grounded in Google Search with source citations.
- **Strategy Lab:** Monte Carlo simulation engine for testing expectancy and drawdown probability.
- **Performance Dashboard:** Visual tracking of monthly profit targets, win rates, and session performance.
- **Firebase Firestore Integration:** Cloud persistence for authenticated users with real-time sync and client caching.

---

## 🏗️ Architecture

The application uses a secure full-stack architecture with clear separation of concerns:

### 1. Server Layer (`server.ts` & `server/`)
- **Runtime:** Node.js with Express v5.
- **Secure Server-Side AI Gateway:** All interactions with `@google/genai` are executed exclusively server-side via `/api/ai/*`.
- **API Secret Security:** `GEMINI_API_KEY` is loaded strictly on the server; the frontend client bundles never contain or expose the API secret.
- **Server-Side Entitlement & Quotas:**
  - Authenticates Firebase ID tokens via Bearer authorization headers.
  - Verifies subscription status and plan tiers directly against Firestore records (browser-submitted tier and usage parameters are not trusted).
  - Enforces quota limits: Free tier (3 vision scans, 2 audits, no deep audit); Pro tier (50 vision scans, 20 audits, deep audit enabled); Elite tier (unlimited).
  - Server-side increment and storage of usage metrics.
- **Model Routing Architecture:**
  - **`gemini-3.6-flash`**: Powers fast, general operations including Market/News summaries (with Google Search grounding), single Trade Audits, Multimodal Chart Vision analysis, and standard conversational chat.
  - **`gemini-3.1-pro-preview`**: Dedicated advanced reasoning engine utilized for Deep Strategy Audits and Deep Thinking mentor sessions.
- **Thinking Configuration:** Employs Gemini 3's high-order thinking configuration (`ThinkingLevel.HIGH`) for complex multi-trade behavioral audits.
- **Structured Schema Enforcement:** Uses `responseSchema` with `@google/genai` Type definitions to guarantee structured JSON outputs for chart vision inspections (support/resistance, market structure, invalidation) and trade audits (strengths, vulnerabilities, execution/risk issues).
- **Safety & Uncertainty Constraints:** Strictly enforces probabilistic framing and invalidation criteria, avoiding unsupported claims of certainty.

### 2. Client Layer (`src/`)
- **Framework:** React 18 with TypeScript.
- **Build Tool:** Vite 6 with Tailwind CSS.
- **Data Visualization:** Recharts for responsive equity curves and outcome distributions.
- **Routing:** React Router 6 (`HashRouter`).
- **State & Storage Architecture:**
  - `services/geminiService.ts`: Pure client-side API gateway making HTTP requests to `/api/ai/*`.
  - `services/firebase.ts`: Authentication (Google Auth) and Firestore document subscriptions.
  - `services/storageService.ts`: Local storage caching and guest session persistence.
  - `services/billingService.ts`: Subscription tier gating and simulation.
  - `services/analyticsService.ts`: Financial metrics, win-rate calculations, and equity series generation.

---

## 🛠️ Development & Build

### Environment Configuration
Configure `GEMINI_API_KEY` in your server environment:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Scripts

- `npm run dev`: Boots the full-stack Express server with Vite middleware via `tsx`.
- `npm run build`: Builds the client SPA using `vite build` and bundles the server entry point using `esbuild`.
- `npm run start`: Starts the compiled production server on port 3000.
- `npm run lint`: Performs static TypeScript type checking (`tsc --noEmit`).

---

## ⚖️ Disclaimer
Trading Forex and leveraged instruments involves substantial risk of capital loss. This application provides analytics and intelligence tools for research and informational purposes only and does not constitute financial advice.
