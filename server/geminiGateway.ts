/**
 * AI Gateway — OpenAI-based replacement for the former Gemini gateway.
 *
 * Replacement choice: OpenAI. It is the most widely used hosted model API,
 * has a single well-known SDK (@openai/openai), supports JSON-schema
 * structured output (response_format: json_schema), multimodal vision
 * (GPT-4o-mini), and a built-in web search tool for grounded news.
 *
 * Model mapping (preserves the fast/deep two-tier routing):
 *   FAST_GENERAL  → 'gpt-4o-mini'         (was gemini-3.6-flash)
 *   DEEP_REASONING → 'gpt-4o'             (was gemini-3.1-pro-preview)
 *
 * The "thinking mode" concept maps to model selection: thinkingMode = true
 * uses the deep reasoning model, false uses the fast model. Both models
 * support structured output and multimodal input.
 *
 * Web-grounded news: OpenAI's built-in web_search tool is used instead of
 * Google Search grounding. This keeps it a single API call with no separate
 * search step, matching the original Gemini approach.
 */
import OpenAI from 'openai';
import { ChartAnalysisResult, TradeAuditResult, Trade } from '../types';

export const AI_MODELS = {
  FAST_GENERAL: 'gpt-4o-mini',
  DEEP_REASONING: 'gpt-4o',
} as const;

let aiClient: OpenAI | null = null;

export function getAIClient(): OpenAI {
  if (!aiClient) {
    const apiKey = process.env.AI_PROVIDER_API_KEY;
    if (!apiKey) {
      throw new Error('AI_PROVIDER_API_KEY environment variable is not configured on the server.');
    }
    aiClient = new OpenAI({ apiKey });
  }
  return aiClient;
}

// Timeout & retry wrapper for resilient handling of transient 429/quota/rate limits
export async function callWithRetryAndTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs = 50000,
  maxRetries = 3
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`AI service request timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    } catch (err: any) {
      attempt++;
      const msg = err?.message || '';
      const isRateLimit =
        err?.status === 429 ||
        msg.includes('429') ||
        msg.includes('rate limit') ||
        msg.includes('quota');
      if (isRateLimit && attempt < maxRetries) {
        const waitMs = attempt * 3000;
        console.warn(`[AI Gateway] 429 rate limit encountered. Retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Maximum retries exceeded');
}

// Timeout wrapper for backwards compatibility
export async function callWithTimeout<T>(promise: Promise<T>, timeoutMs = 50000): Promise<T> {
  return callWithRetryAndTimeout(() => promise, timeoutMs, 1);
}

const SAFETY_UNCERTAINTY_CONSTRAINTS = `
MANDATORY SAFETY & UNCERTAINTY CONSTRAINTS:
1. Do NOT make unsupported claims of certainty or guarantee price targets, win probabilities, or market direction.
2. Formulate all technical levels, market structures, and patterns as probabilistic hypotheses subject to market risk and volatility.
3. Clearly state invalidation zones or conditions under which technical or strategic theses become void.
4. Maintain an objective, disciplined, institutional trading tone without promotional or exaggerated language.
`;

/**
 * 1. Market/News Summaries
 * Model: gpt-4o-mini with web_search tool
 *
 * Web-grounded news replacement: OpenAI's built-in web_search tool provides
 * real-time web results within the same API call, replacing Gemini's Google
 * Search grounding. This keeps it a single-step approach with no separate
 * search service needed.
 */
export async function generateMarketNewsSummary(
  query: string,
  userContext?: { username?: string }
): Promise<{ text: string; sources: Array<{ title: string; uri: string }>; modelUsed: string }> {
  const client = getAIClient();
  const model = AI_MODELS.FAST_GENERAL;

  const prompt = `
TASK TYPE: Macroeconomic & Geopolitical Market Intelligence Briefing
USER CONTEXT: Financial terminal briefing for ${userContext?.username || 'Institutional Trader'}
QUERY TOPIC: "${query}"

EXPLICIT OUTPUT REQUIREMENTS:
Provide a structured, institutional-grade market briefing covering:
1. Primary Macro Drivers & Sentiment (Catalysts, central bank expectations, monetary stance)
2. Technical Inflection Zones & Price Action Context (Key support/resistance levels and market structure)
3. Catalysts & Scheduled Risk Events to Monitor
4. Risk Management Guidance & Volatility Outlook

${SAFETY_UNCERTAINTY_CONSTRAINTS}
`;

  try {
    const response = await callWithRetryAndTimeout(
      () =>
        client.responses.create({
          model,
          instructions: prompt,
          tools: [{ type: 'web_search' }],
        }),
      35000
    );

    // Extract sources from the response annotations
    const sources: Array<{ title: string; uri: string }> = [];
    for (const item of response.output) {
      if (item.type === 'web_search_call' && item.results) {
        for (const result of item.results) {
          sources.push({ title: result.title, uri: result.url });
        }
      }
    }

    return {
      text: response.output_text || 'Market briefing data unavailable at this moment.',
      sources,
      modelUsed: model,
    };
  } catch (apiErr: any) {
    const msg = apiErr?.message || '';
    if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
      return {
        text: `Market Intelligence Briefing (${query}):\n\nMacroeconomic conditions remain dictated by central bank policy expectations and interest rate differentials. Major asset classes are testing significant multi-timeframe structural zones. Traders should exercise strict position sizing around scheduled high-impact economic data releases.\n\n(Baseline briefing active: Search tool quota currently reached.)`,
        sources: [],
        modelUsed: model,
      };
    }
    throw apiErr;
  }
}

/**
 * JSON schema for single/deep trade audits. Used as response_format.
 */
const TradeAuditSchema = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    executionIssues: { type: 'array', items: { type: 'string' } },
    riskIssues: { type: 'array', items: { type: 'string' } },
    recurringPatterns: { type: 'array', items: { type: 'string' } },
    improvementAreas: { type: 'array', items: { type: 'string' } },
    disclaimer: { type: 'string' },
  },
  required: ['summary', 'strengths', 'weaknesses', 'executionIssues', 'riskIssues', 'recurringPatterns', 'improvementAreas'],
  additionalProperties: false,
} as const;

/**
 * 2. Single Trade Audit
 * Model: gpt-4o-mini (Fast structured analysis)
 */
export async function auditSingleTrade(
  trade: Trade,
  userContext?: { username?: string; balance?: number }
): Promise<TradeAuditResult & { modelUsed: string }> {
  const client = getAIClient();
  const model = AI_MODELS.FAST_GENERAL;

  const prompt = `
TASK TYPE: Single Trade Execution & Risk Audit
USER CONTEXT: Trader ${userContext?.username || 'Anonymous'}, Portfolio Balance: $${userContext?.balance ?? 'N/A'}

RELEVANT STRUCTURED TRADE DATA:
- Trade ID: ${trade.id}
- Instrument Pair: ${trade.pair}
- Direction: ${trade.type}
- Entry Price: ${trade.entryPrice}
- Exit Price: ${trade.exitPrice ?? 'Unclosed/Market'}
- Position Size (Lots): ${trade.lotSize}
- Realized PnL: $${trade.pnl} (${trade.status})
- Trading Session: ${trade.session}
- Risk Percentage: ${trade.riskPercent ? `${trade.riskPercent}%` : 'Unspecified'}
- Execution Notes: "${trade.notes || 'None logged by trader'}"

EXPLICIT OUTPUT REQUIREMENTS:
Return an objective, structured audit of this trade execution evaluating:
- summary: High-level executive synthesis of the trade execution quality.
- strengths: Positive execution habits demonstrated (e.g. session alignment, disciplined sizing).
- weaknesses: Observable flaws or inconsistencies in entry/exit or timing.
- executionIssues: Concrete issues regarding slippage, session timing, or trade entry confirmation.
- riskIssues: Capital exposure, R:R asymmetry, or potential over-leverage.
- recurringPatterns: Emotional or mechanical habits indicated (e.g., chasing price, wide stops).
- improvementAreas: Specific, actionable procedural rules for the next execution.
- disclaimer: Formal probabilistic disclaimer.

${SAFETY_UNCERTAINTY_CONSTRAINTS}
`;

  const response = await callWithRetryAndTimeout(
    () =>
      client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_schema', json_schema: { name: 'trade_audit', schema: TradeAuditSchema, strict: true } },
      }),
    35000
  );

  const rawJson = response.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(rawJson) as TradeAuditResult;
  return {
    ...parsed,
    disclaimer: parsed.disclaimer || 'Trade audit findings represent probabilistic analysis, not guaranteed outcomes.',
    modelUsed: model,
  };
}

/**
 * 3. Deep Trade Analysis
 * Model: gpt-4o (deep reasoning), falls back to gpt-4o-mini if quota is unavailable.
 */
export async function auditTradesDeeply(
  trades: Trade[],
  userContext?: { username?: string; balance?: number }
): Promise<TradeAuditResult & { modelUsed: string; thinkingApplied: boolean }> {
  const client = getAIClient();

  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.status === 'WIN').length;
  const losses = trades.filter((t) => t.status === 'LOSS').length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0';
  const totalPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0).toFixed(2);

  const tradeRecords = trades
    .map(
      (t, idx) =>
        `#${idx + 1}: ${t.pair} | ${t.type} | Session: ${t.session} | Lots: ${t.lotSize} | Entry: ${t.entryPrice} | Exit: ${t.exitPrice ?? 'N/A'} | PnL: $${t.pnl} (${t.status}) | Notes: ${t.notes || '-'}`
    )
    .join('\n');

  const prompt = `
TASK TYPE: Deep Multi-Trade Behavioral & Strategic Portfolio Audit
USER CONTEXT: Trader ${userContext?.username || 'Trader'}, Portfolio Balance: $${userContext?.balance ?? 'N/A'}

RELEVANT STRUCTURED DATA:
- Sample Size: ${totalTrades} trades
- Win Rate: ${winRate}% (${wins} Wins / ${losses} Losses)
- Aggregate Net PnL: $${totalPnl}

DETAILED TRADE LEDGER:
${tradeRecords}

EXPLICIT OUTPUT REQUIREMENTS:
Conduct an exhaustive, quantitative deep reasoning review of the trader's behavioral edge and risk vulnerabilities:
- summary: Comprehensive strategic diagnosis of the trader's methodology and statistical edge.
- strengths: Proven institutional strengths demonstrated across the trade sample.
- weaknesses: Core systemic vulnerabilities (e.g. drawdown clustering, loss aversion).
- executionIssues: Discrepancies across trading sessions, instrument selection, and trade durations.
- riskIssues: Sizing inconsistencies, negative expectancy patterns, and capital preservation gaps.
- recurringPatterns: Psychological triggers, overtrading, revenge trading, or session drift.
- improvementAreas: Strict, measurable trading protocol rules for immediate implementation.
- disclaimer: Statistical uncertainty notice.

${SAFETY_UNCERTAINTY_CONSTRAINTS}
`;

  // First attempt: gpt-4o (deep reasoning)
  try {
    const response = await callWithRetryAndTimeout(
      () =>
        client.chat.completions.create({
          model: AI_MODELS.DEEP_REASONING,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_schema', json_schema: { name: 'trade_audit', schema: TradeAuditSchema, strict: true } },
        }),
      55000
    );

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}') as TradeAuditResult;
    return {
      ...parsed,
      disclaimer: parsed.disclaimer || 'Deep trade analysis reflects historical sample distributions. Past results do not guarantee future returns.',
      modelUsed: AI_MODELS.DEEP_REASONING,
      thinkingApplied: true,
    };
  } catch (proErr: any) {
    console.warn(`[Deep Reasoning Fallback] ${AI_MODELS.DEEP_REASONING} unavailable (${proErr?.message}). Routing to ${AI_MODELS.FAST_GENERAL}.`);

    const fallbackResponse = await callWithRetryAndTimeout(
      () =>
        client.chat.completions.create({
          model: AI_MODELS.FAST_GENERAL,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_schema', json_schema: { name: 'trade_audit', schema: TradeAuditSchema, strict: true } },
        }),
      50000
    );

    const parsed = JSON.parse(fallbackResponse.choices[0]?.message?.content || '{}') as TradeAuditResult;
    return {
      ...parsed,
      disclaimer: parsed.disclaimer || 'Analysis generated via high-speed neural model under current quota allocation.',
      modelUsed: AI_MODELS.FAST_GENERAL,
      thinkingApplied: false,
    };
  }
}

/**
 * JSON schema for chart analysis.
 */
const ChartAnalysisSchema = {
  type: 'object',
  properties: {
    symbol: { type: 'string' },
    timeframe: { type: 'string' },
    marketStructure: { type: 'string' },
    trend: { type: 'string' },
    supportLevels: { type: 'array', items: { type: 'string' } },
    resistanceLevels: { type: 'array', items: { type: 'string' } },
    keyZones: { type: 'array', items: { type: 'string' } },
    invalidation: { type: 'string' },
    confidence: { type: 'string' },
    observations: { type: 'array', items: { type: 'string' } },
    disclaimer: { type: 'string' },
  },
  required: ['symbol', 'timeframe', 'marketStructure', 'trend', 'supportLevels', 'resistanceLevels', 'keyZones', 'invalidation', 'confidence', 'observations'],
  additionalProperties: false,
} as const;

/**
 * 4. Chart Image Analysis
 * Model: gpt-4o-mini (multimodal vision)
 */
export async function analyzeChartImage(
  imageBase64: string,
  mimeType: string,
  userContext?: { username?: string }
): Promise<ChartAnalysisResult & { modelUsed: string }> {
  const client = getAIClient();
  const model = AI_MODELS.FAST_GENERAL;

  const prompt = `
TASK TYPE: Technical Chart Pattern & Market Structure Computer Vision Inspection
USER CONTEXT: Analysis for Trader ${userContext?.username || 'Trader'}

EXPLICIT OUTPUT REQUIREMENTS:
Examine the supplied chart image in detail and extract the following structured parameters in strict JSON format:
- symbol: The financial instrument identified on the chart (e.g. "EURUSD", "XAUUSD", "BTCUSD", "US30", "SPX500", or "Unknown").
- timeframe: The primary timeframe displayed on the chart (e.g. "1M", "5M", "15M", "1H", "4H", "Daily", or "Unknown").
- marketStructure: Current market structure assessment (e.g. "Bullish Continuation", "Bearish Break of Structure", "Rangebound Equilibrium", "Liquidity Sweep").
- trend: Primary trend direction ("Bullish", "Bearish", or "Neutral / Consolidating").
- supportLevels: List of key horizontal price support levels visible on the chart.
- resistanceLevels: List of key horizontal price resistance levels visible on the chart.
- keyZones: List of notable supply/demand zones, fair value gaps, or order blocks.
- invalidation: The critical price level or market event that completely invalidates this technical structure.
- confidence: Probabilistic confidence evaluation with supporting rationale (e.g., "Moderate (65% probabilistic confluence; waiting for candle confirmation)").
- observations: 3 to 5 clear, objective technical bullet points noting candle patterns, indicator readings, or momentum shifts.
- disclaimer: Formal risk and uncertainty disclaimer.

${SAFETY_UNCERTAINTY_CONSTRAINTS}
`;

  const response = await callWithRetryAndTimeout(
    () =>
      client.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'chart_analysis', schema: ChartAnalysisSchema, strict: true } },
      }),
    40000
  );

  const parsed = JSON.parse(response.choices[0]?.message?.content || '{}') as ChartAnalysisResult;
  return {
    ...parsed,
    disclaimer: parsed.disclaimer || 'Technical chart levels and patterns represent probabilistic scenarios and not guaranteed price forecasts.',
    modelUsed: model,
  };
}

/**
 * 5. General Chat
 * Model routing:
 * - thinkingMode true → gpt-4o (deep reasoning)
 * - thinkingMode false → gpt-4o-mini (fast)
 */
export async function chatAssistant(
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  thinkingMode = false,
  userContext?: { username?: string }
): Promise<{ text: string; modelUsed: string; thinkingApplied: boolean }> {
  const client = getAIClient();

  const systemInstruction = `
You are Alpha, an institutional financial analyst and quantitative trading mentor assisting ${userContext?.username || 'the trader'}.
Provide disciplined, data-driven answers on technical analysis, macroeconomics, position sizing, and psychological discipline.

${SAFETY_UNCERTAINTY_CONSTRAINTS}
`;

  // Map Gemini-style history to OpenAI messages
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemInstruction },
    ...history.map((msg) => ({
      role: (msg.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: msg.parts.map((p) => p.text).join('\n'),
    })),
  ];

  if (thinkingMode) {
    try {
      const response = await callWithRetryAndTimeout(
        () =>
          client.chat.completions.create({
            model: AI_MODELS.DEEP_REASONING,
            messages,
          }),
        50000
      );

      return {
        text: response.choices[0]?.message?.content || 'Mentor intelligence stream finished without output.',
        modelUsed: AI_MODELS.DEEP_REASONING,
        thinkingApplied: true,
      };
    } catch (proErr: any) {
      console.warn(`[Chat Thinking Fallback] ${AI_MODELS.DEEP_REASONING} unavailable (${proErr?.message}). Routing to ${AI_MODELS.FAST_GENERAL}.`);

      const fallbackResponse = await callWithRetryAndTimeout(
        () =>
          client.chat.completions.create({
            model: AI_MODELS.FAST_GENERAL,
            messages,
          }),
        30000
      );

      return {
        text: fallbackResponse.choices[0]?.message?.content || 'Mentor intelligence stream active.',
        modelUsed: AI_MODELS.FAST_GENERAL,
        thinkingApplied: false,
      };
    }
  }

  const response = await callWithRetryAndTimeout(
    () =>
      client.chat.completions.create({
        model: AI_MODELS.FAST_GENERAL,
        messages,
      }),
    30000
  );

  return {
    text: response.choices[0]?.message?.content || 'Mentor intelligence stream active.',
    modelUsed: AI_MODELS.FAST_GENERAL,
    thinkingApplied: false,
  };
}
