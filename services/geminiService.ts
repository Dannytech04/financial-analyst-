
import { GoogleGenAI, Type } from "@google/genai";
import { Trade, TradeType } from "../types";

// Always use process.env.API_KEY directly for initialization as per guidelines
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketNews = async (query: string = "Forex market sentiment today major pairs") => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Analyze current market sentiment and news for: ${query}. 
      Focus on providing high-impact macro trends, central bank comments, and key technical support/resistance levels.
      Keep the output professional, concise, and formatted for a professional trading dashboard. 
      Bullet points are preferred for technical levels.
    `,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || "Unable to fetch news.";
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || "Source",
    uri: chunk.web?.uri || "#"
  })) || [];

  return { text, sources };
};

export const generateEmailReport = async (email: string, trades: Trade[], stats: any) => {
  const ai = getAI();
  const tradeSummary = trades.slice(0, 10).map(t => 
    `${t.pair} (${t.type}): ${t.status} | PnL: $${t.pnl.toFixed(2)}`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Generate a professional "Weekly Trading Performance Report" for a user with the email ${email}.
      
      STATS:
      - Total Trades: ${stats.total}
      - Win Rate: ${stats.winRate}%
      - Total PnL: $${stats.totalPnl}
      
      RECENT TRADES:
      ${tradeSummary}
      
      Format the response as a clear, encouraging, and professional email body. 
      Include a section on 'Strategic Advice' based on the win rate and PnL.
      Do not include the 'Subject:' line in the text, just the body.
    `,
    config: {
      temperature: 0.7,
    }
  });

  return response.text || "Report generation failed.";
};

export const getHistoricalContext = async (pair: string, date: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `What were the key technical levels, high/low prices, and major economic news for ${pair} on ${date}? Provide a concise technical summary for a trader wanting to backtest that day.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text || "Historical context unavailable.";
};

export const simulateBacktestResult = async (params: {
  pair: string;
  date: string;
  type: TradeType;
  entry: number;
  sl: number;
  tp: number;
  context: string;
}) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Act as a rigorous Backtest Simulator.
      Scenario Context: ${params.context}
      Trade Details:
      Pair: ${params.pair} on ${params.date}
      Direction: ${params.type}
      Entry: ${params.entry}
      Stop Loss: ${params.sl}
      Take Profit: ${params.tp}

      Using the known historical price action of that day, determine the outcome:
      1. Did price hit TP first, SL first, or neither (closed at EOD)?
      2. Provide a 2-sentence play-by-play of the price movement.
      
      Response Format (Strict JSON):
      {
        "outcome": "WIN" | "LOSS" | "BE",
        "playByPlay": "string",
        "realizedPrice": number
      }
    `,
    config: {
      responseMimeType: "application/json",
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (e) {
    return { outcome: 'BE', playByPlay: 'Simulation failed to parse.', realizedPrice: params.entry };
  }
};

export const analyzeIndividualTrade = async (trade: Trade) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `
      Act as a high-performance Forex Performance Coach. Analyze this specific trade and provide actionable advice on improving risk management or strategy adherence:
      Pair: ${trade.pair}
      Type: ${trade.type}
      Entry: ${trade.entryPrice}
      Exit: ${trade.exitPrice}
      Lot Size: ${trade.lotSize}
      PnL: ${trade.pnl}
      Notes: ${trade.notes || 'No notes provided'}

      Evaluate if the risk/reward or the logic in the notes sounds professional. 
      Specifically point out:
      1. One risk management adjustment.
      2. One strategic adherence critique.
      Keep it professional and concise.
    `,
    config: {
      temperature: 0.7,
      maxOutputTokens: 300,
    }
  });

  return response.text || "Analysis unavailable.";
};

export const analyzeTradesDeeply = async (trades: Trade[]) => {
  const ai = getAI();
  const tradeData = trades.map(t => 
    `Pair: ${t.pair}, Type: ${t.type}, PnL: ${t.pnl}, Result: ${t.status}, Note: ${t.notes || 'N/A'}`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      Analyze the following Forex trading journal and provide a deep strategic review. 
      Identify psychological patterns, risk management flaws, and winning streaks. 
      Suggest specific improvements to the trading strategy.

      TRADING DATA:
      ${tradeData}
    `,
    config: {
      thinkingConfig: { thinkingBudget: 32768 }
    },
  });

  return response.text || "Analysis could not be generated.";
};

export const analyzeTradeChart = async (imageBase64: string, mimeType: string) => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageBase64,
            mimeType: mimeType,
          },
        },
        {
          text: "Analyze this Forex trading chart image. Identify the market structure (trend), key technical levels (support, resistance, supply/demand zones), and any visible candle patterns. Provide a professional assessment and suggest a potential trade setup or caution based on the visual data. Point out specific chart flaws or strengths.",
        },
      ],
    },
  });
  return response.text || "Chart analysis failed.";
};

export const getChatResponse = async (history: { role: string; text: string }[], message: string) => {
  const ai = getAI();
  const chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: 'You are an expert Forex trading mentor named Alpha. You provide professional, data-driven advice on technical analysis, risk management, and trading psychology. Keep responses concise and insightful.',
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text;
};
