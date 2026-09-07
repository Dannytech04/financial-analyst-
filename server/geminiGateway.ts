import { GoogleGenAI, Type, ThinkingLevel, GenerateContentResponse } from '@google/genai';
import { ChartAnalysisResult, TradeAuditResult, Trade } from '../types';

export const GEMINI_MODELS = {
  FAST_GENERAL: 'gemini-3.6-flash',
  DEEP_REASONING: 'gemini-3.1-pro-preview',
} as const;

let aiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured on the server.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
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
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('quota') ||
        msg.includes('rate limit');
      if (isRateLimit && attempt < maxRetries) {
        const waitMs = attempt * 3000;
        console.warn(`[Gemini Gateway] 429 rate limit encountered. Retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})...`);
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

/**
 * Standard uncertainty safety constraint appended to all financial prompts.
 */
const SAFETY_UNCERTAINTY_CONSTRAINTS = `
MANDATORY SAFETY & UNCERTAINTY CONSTRAINTS:
1. Do NOT make unsupported claims of certainty or guarantee price targets, win probabilities, or market direction.
2. Formulate all technical levels, market structures, and patterns as probabilistic hypotheses subject to market risk and volatility.
3. Clearly state invalidation zones or conditions under which technical or strategic theses become void.
4. Maintain an objective, disciplined, institutional trading tone without promotional or exaggerated language.
`;

/**
 * 1. Market/News Summaries
 * Model: gemini-3.6-flash
 */
export async function generateMarketNewsSummary(
  query: string,
  userContext?: { username?: string }
): Promise<{ text: string; sources: Array<{ title: string; uri: string }>; modelUsed: string }> {
  const ai = getGeminiClient();
  const model = GEMINI_MODELS.FAST_GENERAL;

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
    const response = await callWithRetryAndTimeout<GenerateContentResponse>(
      () =>
        ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            tools: [{ googleSearch: {} }],
          },
        }),
      35000
    );

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks
      .map((c: any) => ({
        title: c.web?.title || 'Financial Intelligence Source',
        uri: c.web?.uri || '#',
      }))
      .filter((s: any) => s.uri !== '#');

    return {
      text: response.text || 'Market briefing data unavailable at this moment.',
      sources,
      modelUsed: model,
    };
  } catch (apiErr: any) {
    const msg = apiErr?.message || '';
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('quota')) {
      // Return structured baseline outlook when live search rate limits are reached
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
 * Schema for Single Trade and Deep Trade Audits
 */
const TradeAuditSchema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    weaknesses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    executionIssues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    riskIssues: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    recurringPatterns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    improvementAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    disclaimer: { type: Type.STRING },
  },
  required: [
    'summary',
    'strengths',
    'weaknesses',
    'executionIssues',
    'riskIssues',
    'recurringPatterns',
    'improvementAreas',
  ],
};

/**
 * 2. Single Trade Audit
 * Model: gemini-3.6-flash (Fast structured analysis)
 */
export async function auditSingleTrade(
  trade: Trade,
  userContext?: { username?: string; balance?: number }
): Promise<TradeAuditResult & { modelUsed: string }> {
  const ai = getGeminiClient();
  const model = GEMINI_MODELS.FAST_GENERAL;

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

  const response = await callWithRetryAndTimeout<GenerateContentResponse>(
    () =>
      ai.models.generateContent({
        model,
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: TradeAuditSchema,
        },
      }),
    35000
  );

  const rawJson = response.text || '{}';
  const parsed = JSON.parse(rawJson) as TradeAuditResult;
  return {
    ...parsed,
    disclaimer: parsed.disclaimer || 'Trade audit findings represent probabilistic analysis, not guaranteed outcomes.',
    modelUsed: model,
  };
}

/**
 * 3. Deep Trade Analysis
 * Model: gemini-3.1-pro-preview with ThinkingLevel.HIGH
 * Falls back gracefully to gemini-3.6-flash if Pro quota is unavailable on the key.
 */
export async function auditTradesDeeply(
  trades: Trade[],
  userContext?: { username?: string; balance?: number }
): Promise<TradeAuditResult & { modelUsed: string; thinkingApplied: boolean }> {
  const ai = getGeminiClient();

  // Aggregate structured portfolio metrics
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

  // First attempt: gemini-3.1-pro-preview with real ThinkingLevel.HIGH
  try {
    const response = await callWithRetryAndTimeout<GenerateContentResponse>(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODELS.DEEP_REASONING,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            thinkingConfig: {
              thinkingLevel: ThinkingLevel.HIGH,
            },
            responseSchema: TradeAuditSchema,
          },
        }),
      55000
    );

    const parsed = JSON.parse(response.text || '{}') as TradeAuditResult;
    return {
      ...parsed,
      disclaimer: parsed.disclaimer || 'Deep trade analysis reflects historical sample distributions. Past results do not guarantee future returns.',
      modelUsed: GEMINI_MODELS.DEEP_REASONING,
      thinkingApplied: true,
    };
  } catch (proErr: any) {
    console.warn(`[Deep Reasoning Fallback] gemini-3.1-pro-preview unavailable (${proErr?.message}). Routing to gemini-3.6-flash.`);

    // Graceful fallback to gemini-3.6-flash if pro quota limit is reached on free tier key
    const fallbackResponse = await callWithRetryAndTimeout<GenerateContentResponse>(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODELS.FAST_GENERAL,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: TradeAuditSchema,
          },
        }),
      50000
    );

    const parsed = JSON.parse(fallbackResponse.text || '{}') as TradeAuditResult;
    return {
      ...parsed,
      disclaimer: parsed.disclaimer || 'Analysis generated via high-speed neural model under current quota allocation.',
      modelUsed: GEMINI_MODELS.FAST_GENERAL,
      thinkingApplied: false,
    };
  }
}

/**
 * Schema for Chart Analysis Result
 */
const ChartAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    symbol: { type: Type.STRING },
    timeframe: { type: Type.STRING },
    marketStructure: { type: Type.STRING },
    trend: { type: Type.STRING },
    supportLevels: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    resistanceLevels: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    keyZones: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    invalidation: { type: Type.STRING },
    confidence: { type: Type.STRING },
    observations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    disclaimer: { type: Type.STRING },
  },
  required: [
    'symbol',
    'timeframe',
    'marketStructure',
    'trend',
    'supportLevels',
    'resistanceLevels',
    'keyZones',
    'invalidation',
    'confidence',
    'observations',
  ],
};

/**
 * 4. Chart Image Analysis
 * Model: gemini-3.6-flash (Fast multimodal vision)
 */
export async function analyzeChartImage(
  imageBase64: string,
  mimeType: string,
  userContext?: { username?: string }
): Promise<ChartAnalysisResult & { modelUsed: string }> {
  const ai = getGeminiClient();
  const model = GEMINI_MODELS.FAST_GENERAL;

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

  const response = await callWithRetryAndTimeout<GenerateContentResponse>(
    () =>
      ai.models.generateContent({
        model,
        contents: {
          parts: [
            { inlineData: { data: imageBase64, mimeType } },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: ChartAnalysisSchema,
        },
      }),
    40000
  );

  const parsed = JSON.parse(response.text || '{}') as ChartAnalysisResult;
  return {
    ...parsed,
    disclaimer: parsed.disclaimer || 'Technical chart levels and patterns represent probabilistic scenarios and not guaranteed price forecasts.',
    modelUsed: model,
  };
}

/**
 * 5. General Chat
 * Model Routing:
 * - gemini-3.1-pro-preview with ThinkingLevel.HIGH when thinkingMode is true
 * - gemini-3.6-flash when thinkingMode is false
 */
export async function chatAssistant(
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  thinkingMode = false,
  userContext?: { username?: string }
): Promise<{ text: string; modelUsed: string; thinkingApplied: boolean }> {
  const ai = getGeminiClient();

  const systemInstruction = `
You are Alpha, an institutional financial analyst and quantitative trading mentor assisting ${userContext?.username || 'the trader'}.
Provide disciplined, data-driven answers on technical analysis, macroeconomics, position sizing, and psychological discipline.

${SAFETY_UNCERTAINTY_CONSTRAINTS}
`;

  if (thinkingMode) {
    try {
      const response = await callWithRetryAndTimeout<GenerateContentResponse>(
        () =>
          ai.models.generateContent({
            model: GEMINI_MODELS.DEEP_REASONING,
            contents: history,
            config: {
              systemInstruction,
              thinkingConfig: {
                thinkingLevel: ThinkingLevel.HIGH,
              },
            },
          }),
        50000
      );

      return {
        text: response.text || 'Mentor intelligence stream finished without output.',
        modelUsed: GEMINI_MODELS.DEEP_REASONING,
        thinkingApplied: true,
      };
    } catch (proErr: any) {
      console.warn(`[Chat Thinking Fallback] gemini-3.1-pro-preview unavailable (${proErr?.message}). Routing to gemini-3.6-flash.`);

      // Fallback to flash if pro quota limit is reached on free tier key
      const fallbackResponse = await callWithRetryAndTimeout<GenerateContentResponse>(
        () =>
          ai.models.generateContent({
            model: GEMINI_MODELS.FAST_GENERAL,
            contents: history,
            config: { systemInstruction },
          }),
        30000
      );

      return {
        text: fallbackResponse.text || 'Mentor intelligence stream active.',
        modelUsed: GEMINI_MODELS.FAST_GENERAL,
        thinkingApplied: false,
      };
    }
  }

  // Standard fast chat
  const response = await callWithRetryAndTimeout<GenerateContentResponse>(
    () =>
      ai.models.generateContent({
        model: GEMINI_MODELS.FAST_GENERAL,
        contents: history,
        config: { systemInstruction },
      }),
    30000
  );

  return {
    text: response.text || 'Mentor intelligence stream active.',
    modelUsed: GEMINI_MODELS.FAST_GENERAL,
    thinkingApplied: false,
  };
}
