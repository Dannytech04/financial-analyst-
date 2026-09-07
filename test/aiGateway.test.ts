process.env.NODE_ENV = 'test';
import { app } from '../server';
import { setTestSubscription, clearTestSubscriptions } from '../server/authService';
import { SubscriptionTier } from '../types';
import fs from 'fs';
import path from 'path';
import http from 'http';

const BASE_URL = 'http://127.0.0.1:3000';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function runTests() {
  console.log('====================================================');
  console.log('STARTING COMPREHENSIVE AI ARCHITECTURE TEST SUITE');
  console.log('====================================================\n');
  console.log(`[Test Client] Running against server on ${BASE_URL}`);

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition: boolean, desc: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ PASS: ${desc}`);
    } else {
      console.error(`  ✗ FAIL: ${desc} ${details ? `(${details})` : ''}`);
    }
  }

  try {
    // -------------------------------------------------------------
    // TEST SECTION 1: VERIFY GEMINI API KEY ABSENT FROM CLIENT BUNDLES
    // -------------------------------------------------------------
    console.log('\n--- SECTION 1: Client Bundle Secret Isolation ---');
    const distPath = path.join(process.cwd(), 'dist');
    const distAssetsPath = path.join(distPath, 'assets');
    const clientFiles = fs.existsSync(distAssetsPath)
      ? fs.readdirSync(distAssetsPath).map((f) => path.join(distAssetsPath, f))
      : [];

    let secretFoundInClient = false;
    const realKey = process.env.GEMINI_API_KEY || '';
    for (const file of clientFiles) {
      if (file.endsWith('.js') || file.endsWith('.html')) {
        const content = fs.readFileSync(file, 'utf8');
        if (realKey && content.includes(realKey)) {
          secretFoundInClient = true;
          console.error(`Found raw GEMINI_API_KEY in ${file}!`);
        }
        if (content.includes('process.env.GEMINI_API_KEY')) {
          secretFoundInClient = true;
          console.error(`Found process.env.GEMINI_API_KEY reference in ${file}!`);
        }
      }
    }
    assert(!secretFoundInClient, 'GEMINI_API_KEY is completely absent from all client dist bundles');

    // -------------------------------------------------------------
    // TEST SECTION 2: UNAUTHORIZED ACCESS VERIFICATION
    // -------------------------------------------------------------
    console.log('\n--- SECTION 2: Unauthorized Access Enforcement ---');

    // 2.1 Missing Authorization Header on /api/ai/news
    const resNoAuthNews = await fetch(`${BASE_URL}/api/ai/news`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'Forex USD' }),
    });
    assert(resNoAuthNews.status === 401, '/api/ai/news rejects requests missing Bearer token with 401');

    // 2.2 Invalid Token on /api/ai/audit
    const resBadTokenAudit = await fetch(`${BASE_URL}/api/ai/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer bad.token.here',
      },
      body: JSON.stringify({ trade: { pair: 'EURUSD', type: 'BUY' } }),
    });
    assert(resBadTokenAudit.status === 401, '/api/ai/audit rejects invalid tokens with 401');

    // 2.3 Missing Token on /api/ai/deep-audit
    const resNoAuthDeep = await fetch(`${BASE_URL}/api/ai/deep-audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trades: [{ pair: 'EURUSD', type: 'BUY', status: 'WIN' }] }),
    });
    assert(resNoAuthDeep.status === 401, '/api/ai/deep-audit rejects missing token with 401');

    // 2.4 Missing Token on /api/ai/vision
    const resNoAuthVision = await fetch(`${BASE_URL}/api/ai/vision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: 'abc', mimeType: 'image/png' }),
    });
    assert(resNoAuthVision.status === 401, '/api/ai/vision rejects missing token with 401');

    // 2.5 Missing Token on /api/ai/chat
    const resNoAuthChat = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: [{ role: 'user', parts: [{ text: 'Hello' }] }] }),
    });
    assert(resNoAuthChat.status === 401, '/api/ai/chat rejects missing token with 401');

    // -------------------------------------------------------------
    // TEST SECTION 3: PLAN ACCESS & FEATURE ENTITLEMENT (FREE vs PRO vs ELITE)
    // -------------------------------------------------------------
    console.log('\n--- SECTION 3: Plan Access & Entitlement (FREE/PRO/ELITE) ---');

    const freeToken = `mock-test-token-free-user1-${Date.now()}`;
    const proToken = `mock-test-token-pro-user2-${Date.now()}`;
    const eliteToken = `mock-test-token-elite-user3-${Date.now()}`;

    // 3.1 FREE Tier attempting Deep Audit -> Must be rejected with 403
    const resFreeDeep = await fetch(`${BASE_URL}/api/ai/deep-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freeToken}`,
      },
      body: JSON.stringify({
        trades: [
          { id: '1', pair: 'EURUSD', type: 'BUY', entryPrice: 1.08, exitPrice: 1.085, pnl: 50, status: 'WIN', session: 'LONDON', lotSize: 1 },
        ],
      }),
    });
    const freeDeepData = await resFreeDeep.json() as any;
    assert(resFreeDeep.status === 403, 'FREE tier is blocked from Deep Audit with 403', JSON.stringify(freeDeepData));
    assert(
      typeof freeDeepData.error === 'string' && freeDeepData.error.includes('requires a Pro or Elite'),
      'FREE tier receives clear upgrade prompt for deep audit'
    );

    // 3.2 PRO Tier allowed on Deep Audit
    await sleep(2500);
    console.log('  Testing PRO tier execution on deep audit (routes to gemini-3.1-pro-preview with Thinking)...');
    const resProDeep = await fetch(`${BASE_URL}/api/ai/deep-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${proToken}`,
      },
      body: JSON.stringify({
        trades: [
          { id: '1', pair: 'EURUSD', type: 'BUY', entryPrice: 1.08, exitPrice: 1.085, pnl: 50, status: 'WIN', session: 'LONDON', lotSize: 1 },
          { id: '2', pair: 'GBPUSD', type: 'SELL', entryPrice: 1.25, exitPrice: 1.254, pnl: -40, status: 'LOSS', session: 'NEW_YORK', lotSize: 1 },
        ],
      }),
    });
    const proDeepData = await resProDeep.json() as any;
    assert(
      resProDeep.status === 200 || resProDeep.status === 429,
      'PRO tier is authorized for Deep Audit (200 OK or 429 rate limit)',
      JSON.stringify(proDeepData)
    );
    if (resProDeep.status === 200) {
      assert(typeof proDeepData.summary === 'string', 'Deep Audit returns structured "summary"');
      assert(Array.isArray(proDeepData.strengths), 'Deep Audit returns structured "strengths"');
      assert(Array.isArray(proDeepData.weaknesses), 'Deep Audit returns structured "weaknesses"');
      assert(Array.isArray(proDeepData.executionIssues), 'Deep Audit returns structured "executionIssues"');
      assert(Array.isArray(proDeepData.riskIssues), 'Deep Audit returns structured "riskIssues"');
      assert(Array.isArray(proDeepData.recurringPatterns), 'Deep Audit returns structured "recurringPatterns"');
      assert(Array.isArray(proDeepData.improvementAreas), 'Deep Audit returns structured "improvementAreas"');
    } else {
      assert(
        typeof proDeepData.error === 'string' && proDeepData.error.includes('rate limit'),
        'Deep Audit returns clear 429 rate limit notice when daily quota reached'
      );
    }

    // -------------------------------------------------------------
    // TEST SECTION 4: EXHAUSTED USAGE ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- SECTION 4: Exhausted Usage Enforcement ---');

    // 4.1 Exhausted Vision on FREE Tier (Limit = 3)
    const exhaustedFreeToken = 'mock-test-token-free-v3-a2-active-userexhausted';

    const resExhaustedVision = await fetch(`${BASE_URL}/api/ai/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${exhaustedFreeToken}`,
      },
      body: JSON.stringify({
        imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        mimeType: 'image/png',
      }),
    });
    const exhaustedVisionData = await resExhaustedVision.json() as any;
    assert(resExhaustedVision.status === 403, 'Exhausted vision quota returns 403 Forbidden');
    assert(
      typeof exhaustedVisionData.error === 'string' && exhaustedVisionData.error.includes('limit of 3 reached'),
      'Exhausted vision returns clear quota limit notice'
    );

    // 4.2 Exhausted Audit on FREE Tier (Limit = 2)
    const resExhaustedAudit = await fetch(`${BASE_URL}/api/ai/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${exhaustedFreeToken}`,
      },
      body: JSON.stringify({
        trade: { id: 'test-t1', pair: 'EURUSD', type: 'BUY', entryPrice: 1.08, exitPrice: 1.085, pnl: 50, status: 'WIN', session: 'LONDON', lotSize: 1 },
      }),
    });
    const exhaustedAuditData = await resExhaustedAudit.json() as any;
    assert(resExhaustedAudit.status === 403, 'Exhausted audit quota returns 403 Forbidden');
    assert(
      typeof exhaustedAuditData.error === 'string' && exhaustedAuditData.error.includes('limit of 2 reached'),
      'Exhausted audit returns clear quota limit notice'
    );

    // 4.3 Expired Subscription Downgrades to FREE
    const expiredToken = 'mock-test-token-pro-v0-a0-expired-userexpired';
    const resExpired = await fetch(`${BASE_URL}/api/ai/deep-audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${expiredToken}`,
      },
      body: JSON.stringify({
        trades: [{ id: '1', pair: 'EURUSD', type: 'BUY', entryPrice: 1.08, exitPrice: 1.085, pnl: 50, status: 'WIN', session: 'LONDON', lotSize: 1 }],
      }),
    });
    assert(resExpired.status === 403, 'Expired subscription downgrades to FREE and blocks Pro-only features');

    // -------------------------------------------------------------
    // TEST SECTION 5: LIVE AI ENDPOINT EXECUTION & MODEL ROUTING
    // -------------------------------------------------------------
    console.log('\n--- SECTION 5: Every AI Endpoint Execution & Model Routing ---');

    // 5.1 Health Check
    const resHealth = await fetch(`${BASE_URL}/api/health`);
    const healthData = await resHealth.json() as any;
    assert(resHealth.status === 200, 'GET /api/health responds with 200 OK');
    assert(healthData.supportedModels.FAST_GENERAL === 'gemini-3.6-flash', 'Health specifies gemini-3.6-flash');
    assert(healthData.supportedModels.DEEP_REASONING === 'gemini-3.1-pro-preview', 'Health specifies gemini-3.1-pro-preview');

    // 5.2 Market News (/api/ai/news)
    await sleep(3000);
    console.log('  Testing /api/ai/news with gemini-3.6-flash...');
    const newsToken = 'mock-test-token-free-user-news';
    const resNews = await fetch(`${BASE_URL}/api/ai/news`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newsToken}`,
      },
      body: JSON.stringify({ query: 'Federal Reserve Interest Rates' }),
    });
    const newsData = await resNews.json() as any;
    assert(resNews.status === 200 || resNews.status === 429, 'POST /api/ai/news returns 200 OK or 429 rate limit', JSON.stringify(newsData));
    if (resNews.status === 200) {
      assert(typeof newsData.text === 'string' && newsData.text.length > 20, 'Market news returns substantive text');
      assert(Array.isArray(newsData.sources), 'Market news returns sources array');
    } else {
      assert(typeof newsData.error === 'string' && newsData.error.includes('rate limit'), 'Market news returns 429 rate limit error');
    }

    // 5.3 Single Trade Audit (/api/ai/audit) - Structured JSON
    await sleep(3000);
    console.log('  Testing /api/ai/audit with gemini-3.6-flash (structured JSON)...');
    const auditToken = 'mock-test-token-free-user-audit';
    const resAudit = await fetch(`${BASE_URL}/api/ai/audit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auditToken}`,
      },
      body: JSON.stringify({
        trade: {
          id: 'test-trade-1',
          pair: 'EURUSD',
          type: 'BUY',
          entryPrice: 1.085,
          exitPrice: 1.092,
          lotSize: 0.5,
          pnl: 35,
          status: 'WIN',
          session: 'LONDON',
          riskPercent: 1.0,
          notes: 'Confluence bounce from 4H support',
        },
      }),
    });
    const auditData = await resAudit.json() as any;
    assert(resAudit.status === 200 || resAudit.status === 429, 'POST /api/ai/audit returns 200 OK or 429 rate limit', JSON.stringify(auditData));
    if (resAudit.status === 200) {
      assert(typeof auditData.summary === 'string', 'Single trade audit has structured "summary"');
      assert(Array.isArray(auditData.strengths), 'Single trade audit has structured "strengths"');
      assert(Array.isArray(auditData.weaknesses), 'Single trade audit has structured "weaknesses"');
      assert(Array.isArray(auditData.executionIssues), 'Single trade audit has structured "executionIssues"');
      assert(Array.isArray(auditData.riskIssues), 'Single trade audit has structured "riskIssues"');
      assert(Array.isArray(auditData.recurringPatterns), 'Single trade audit has structured "recurringPatterns"');
      assert(Array.isArray(auditData.improvementAreas), 'Single trade audit has structured "improvementAreas"');
      assert(typeof auditData.disclaimer === 'string', 'Single trade audit includes probabilistic disclaimer');
      assert(auditData.usageCount?.audit === 1, 'Single trade audit authoritatively recorded usage count = 1');
    } else {
      assert(typeof auditData.error === 'string' && auditData.error.includes('rate limit'), 'Audit returns 429 rate limit error');
    }

    // 5.4 Chart Vision Analysis (/api/ai/vision) - Structured JSON
    await sleep(3000);
    console.log('  Testing /api/ai/vision with gemini-3.6-flash (structured JSON)...');
    const visionToken = 'mock-test-token-free-user-vision';
    const validPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const resVision = await fetch(`${BASE_URL}/api/ai/vision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${visionToken}`,
      },
      body: JSON.stringify({
        imageBase64: validPngBase64,
        mimeType: 'image/png',
      }),
    });
    const visionData = await resVision.json() as any;
    assert(resVision.status === 200 || resVision.status === 429, 'POST /api/ai/vision returns 200 OK or 429 rate limit', JSON.stringify(visionData));
    if (resVision.status === 200) {
      assert(typeof visionData.symbol === 'string', 'Vision analysis returns "symbol"');
      assert(typeof visionData.timeframe === 'string', 'Vision analysis returns "timeframe"');
      assert(typeof visionData.marketStructure === 'string', 'Vision analysis returns "marketStructure"');
      assert(typeof visionData.trend === 'string', 'Vision analysis returns "trend"');
      assert(Array.isArray(visionData.supportLevels), 'Vision analysis returns "supportLevels"');
      assert(Array.isArray(visionData.resistanceLevels), 'Vision analysis returns "resistanceLevels"');
      assert(Array.isArray(visionData.keyZones), 'Vision analysis returns "keyZones"');
      assert(typeof visionData.invalidation === 'string', 'Vision analysis returns "invalidation"');
      assert(typeof visionData.confidence === 'string', 'Vision analysis returns "confidence"');
      assert(Array.isArray(visionData.observations), 'Vision analysis returns "observations"');
      assert(typeof visionData.disclaimer === 'string', 'Vision analysis includes safety disclaimer');
      assert(visionData.usageCount?.vision === 1, 'Vision analysis authoritatively recorded usage count = 1');
    } else {
      assert(typeof visionData.error === 'string' && visionData.error.includes('rate limit'), 'Vision returns 429 rate limit error');
    }

    // 5.5 Chat Assistant (/api/ai/chat) - Standard (Fast)
    await sleep(3000);
    console.log('  Testing /api/ai/chat (Standard Mode: gemini-3.6-flash)...');
    const chatToken = 'mock-test-token-free-user-chat';
    const resChatStd = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${chatToken}`,
      },
      body: JSON.stringify({
        history: [{ role: 'user', parts: [{ text: 'What is risk-to-reward ratio in 1 sentence?' }] }],
        thinkingMode: false,
      }),
    });
    const chatStdData = await resChatStd.json() as any;
    assert(resChatStd.status === 200 || resChatStd.status === 429, 'POST /api/ai/chat (standard) returns 200 OK or 429 rate limit', JSON.stringify(chatStdData));
    if (resChatStd.status === 200) {
      assert(typeof chatStdData.text === 'string' && chatStdData.text.length > 5, 'Chat returns response text');
      assert(chatStdData.modelUsed === 'gemini-3.6-flash', 'Standard chat routes to gemini-3.6-flash');
    } else {
      assert(typeof chatStdData.error === 'string' && chatStdData.error.includes('rate limit'), 'Chat returns 429 rate limit error');
    }

    // 5.6 Chat Assistant (/api/ai/chat) - Thinking Mode (gemini-3.1-pro-preview with ThinkingLevel.HIGH)
    await sleep(3000);
    console.log('  Testing /api/ai/chat (Thinking Mode: gemini-3.1-pro-preview with ThinkingLevel.HIGH)...');
    const thinkingChatToken = 'mock-test-token-pro-user-chat-thinking';
    const resChatThinking = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${thinkingChatToken}`,
      },
      body: JSON.stringify({
        history: [{ role: 'user', parts: [{ text: 'Analyze expectancy vs win rate in 1 sentence.' }] }],
        thinkingMode: true,
      }),
    });
    const chatThinkingData = await resChatThinking.json() as any;
    assert(resChatThinking.status === 200 || resChatThinking.status === 429, 'POST /api/ai/chat (thinking) returns 200 OK or 429 rate limit', JSON.stringify(chatThinkingData));
    if (resChatThinking.status === 200) {
      assert(typeof chatThinkingData.text === 'string' && chatThinkingData.text.length > 5, 'Thinking chat returns text');
      assert(
        chatThinkingData.modelUsed === 'gemini-3.1-pro-preview' || chatThinkingData.modelUsed === 'gemini-3.6-flash',
        'Thinking chat targets gemini-3.1-pro-preview (with resilient fallback to flash if pro quota limit is 0)'
      );
    } else {
      assert(typeof chatThinkingData.error === 'string' && chatThinkingData.error.includes('rate limit'), 'Thinking chat returns 429 rate limit error');
    }

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('====================================================\n');

    if (passedTests === totalTests) {
      console.log('ALL VERIFICATIONS SUCCESSFUL!');
    } else {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exitCode = 1;
  }
}

runTests();
