import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  verifyAuthToken,
  getAuthoritativeSubscription,
  verifyFeatureEntitlement,
  recordServerUsage,
} from './server/authService';
import {
  generateMarketNewsSummary,
  auditSingleTrade,
  auditTradesDeeply,
  analyzeChartImage,
  chatAssistant,
  GEMINI_MODELS,
} from './server/geminiGateway';

const app = express();
const PORT = 3000;

// Support larger payload for chart image uploads
app.use(express.json({ limit: '25mb' }));

// Helper to format error responses
function handleServerError(res: Response, err: unknown, context: string) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[Server Error] @ ${context}:`, message);

  if (message.includes('Authentication required') || message.includes('Invalid') || message.includes('expired')) {
    return res.status(401).json({ error: message });
  }

  if (message.includes('limit reached') || message.includes('requires a Pro') || message.includes('requires')) {
    return res.status(403).json({ error: message });
  }

  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED') || message.includes('quota')) {
    return res.status(429).json({ error: 'AI rate limit reached. Please wait a moment before trying again.' });
  }

  return res.status(500).json({ error: message || 'Internal Server Error' });
}

// --- API Routes ---

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    supportedModels: GEMINI_MODELS,
  });
});

// 1. Market/News Summaries
// Model: gemini-3.6-flash
app.post('/api/ai/news', async (req: Request, res: Response) => {
  try {
    const { user } = await verifyAuthToken(req.headers.authorization);
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid query parameter' });
    }

    const result = await generateMarketNewsSummary(query, {
      username: req.body.username || user.email,
    });
    return res.json(result);
  } catch (error) {
    return handleServerError(res, error, 'MarketNews');
  }
});

// 2. Single Trade Audit
// Model: gemini-3.6-flash (Structured JSON)
app.post('/api/ai/audit', async (req: Request, res: Response) => {
  try {
    const { user, rawToken } = await verifyAuthToken(req.headers.authorization);
    const { trade } = req.body;
    if (!trade || !trade.pair || !trade.type) {
      return res.status(400).json({ error: 'Missing or invalid trade data' });
    }

    // Server-side authoritative subscription and usage check
    const subscription = await getAuthoritativeSubscription(user.uid, rawToken);
    const entitlement = verifyFeatureEntitlement(subscription, 'audit');
    if (!entitlement.allowed) {
      return res.status(403).json({
        error: entitlement.reason,
        tier: subscription.tier,
        usageCount: subscription.usageCount,
      });
    }

    // Execute structured single trade audit via Gemini
    const result = await auditSingleTrade(trade, {
      username: req.body.username || user.email,
      balance: req.body.balance,
    });

    // Authoritatively increment and record usage in Firestore
    const updatedUsage = await recordServerUsage(user.uid, rawToken, 'audit', subscription);

    return res.json({
      ...result,
      tier: subscription.tier,
      usageCount: updatedUsage,
    });
  } catch (error) {
    return handleServerError(res, error, 'TradeAudit');
  }
});

// 3. Deep Trade Analysis
// Model: gemini-3.1-pro-preview with ThinkingLevel.HIGH
app.post('/api/ai/deep-audit', async (req: Request, res: Response) => {
  try {
    const { user, rawToken } = await verifyAuthToken(req.headers.authorization);
    const { trades } = req.body;
    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ error: 'Missing or empty trades array' });
    }

    // Authoritative check: Pro or Elite entitlement
    const subscription = await getAuthoritativeSubscription(user.uid, rawToken);
    const entitlement = verifyFeatureEntitlement(subscription, 'deep-audit');
    if (!entitlement.allowed) {
      return res.status(403).json({
        error: entitlement.reason,
        tier: subscription.tier,
        usageCount: subscription.usageCount,
      });
    }

    // Execute deep reasoning audit with thinking configuration
    const result = await auditTradesDeeply(trades, {
      username: req.body.username || user.email,
      balance: req.body.balance,
    });

    // Record audit usage on the server
    const updatedUsage = await recordServerUsage(user.uid, rawToken, 'audit', subscription);

    return res.json({
      ...result,
      tier: subscription.tier,
      usageCount: updatedUsage,
    });
  } catch (error) {
    return handleServerError(res, error, 'DeepAudit');
  }
});

// 4. Chart Image Analysis
// Model: gemini-3.6-flash (Structured JSON)
app.post('/api/ai/vision', async (req: Request, res: Response) => {
  try {
    const { user, rawToken } = await verifyAuthToken(req.headers.authorization);
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing imageBase64 or mimeType' });
    }

    // Authoritative check: Vision quota
    const subscription = await getAuthoritativeSubscription(user.uid, rawToken);
    const entitlement = verifyFeatureEntitlement(subscription, 'vision');
    if (!entitlement.allowed) {
      return res.status(403).json({
        error: entitlement.reason,
        tier: subscription.tier,
        usageCount: subscription.usageCount,
      });
    }

    // Execute structured vision inspection
    const result = await analyzeChartImage(imageBase64, mimeType, {
      username: req.body.username || user.email,
    });

    // Authoritatively increment and record usage in Firestore
    const updatedUsage = await recordServerUsage(user.uid, rawToken, 'vision', subscription);

    return res.json({
      ...result,
      tier: subscription.tier,
      usageCount: updatedUsage,
    });
  } catch (error) {
    return handleServerError(res, error, 'VisionAnalysis');
  }
});

// 5. General Chat
// Model routing:
// - thinkingMode: true -> gemini-3.1-pro-preview with ThinkingLevel.HIGH
// - thinkingMode: false -> gemini-3.6-flash
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { user } = await verifyAuthToken(req.headers.authorization);
    const { history, thinkingMode } = req.body;
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'Missing or invalid history array' });
    }

    const result = await chatAssistant(history, thinkingMode === true, {
      username: req.body.username || user.email,
    });
    return res.json(result);
  } catch (error) {
    return handleServerError(res, error, 'Chat');
  }
});

// Performance Report Generation
app.post('/api/ai/report', async (req: Request, res: Response) => {
  try {
    const { user } = await verifyAuthToken(req.headers.authorization);
    const { username, stats } = req.body;

    const summary = await chatAssistant(
      [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a concise, professional performance audit report for ${username || user.email || 'Trader'}. Win Rate: ${stats?.winRate ?? 0}%, Total PnL: $${stats?.totalPnl ?? 0}. Emphasize probabilistic risk management and drawdown containment.`,
            },
          ],
        },
      ],
      false
    );

    return res.json({ text: summary.text, modelUsed: summary.modelUsed });
  } catch (error) {
    return handleServerError(res, error, 'GenerateReport');
  }
});

// --- Server Lifecycle & Vite Middleware ---

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Financial Analyst server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app };
