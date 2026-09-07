/**
 * Comprehensive Unit Test Suite for Financial Calculation Engine
 * 
 * Tests:
 * 1. Instruments:
 *    - EURUSD (Standard FX Major, quote USD)
 *    - GBPUSD (Standard FX Major, quote USD)
 *    - USDCHF (FX Major Cross, quote CHF -> converted to USD)
 *    - GBPJPY (FX Cross, quote JPY, 2/3 decimals -> converted to USD)
 *    - XAUUSD (Gold Metal, 100 oz contract size)
 *    - US30 (Index CFD, 1 contract size, $1/pt)
 *    - SPX500 (Index CFD, 1 contract size, $0.1/pt)
 *    - BTCUSD (Crypto Spot CFD, 1 BTC contract size)
 * 2. Validations:
 *    - Negative prices
 *    - Zero stop distance
 *    - Invalid lot sizes (below min, above max, non-step)
 *    - Invalid contract specifications
 *    - Unsupported symbols
 *    - Impossible risk percentages
 *    - Invalid account balance
 * 3. Engine Functions:
 *    - Price movement (delta, ticks, pips, %)
 *    - Pip / Tick distance
 *    - PnL calculation (BUY / SELL, profit / loss)
 *    - Risk amount
 *    - Position size
 *    - Reward / Risk ratio
 *    - Realized R (+ / -)
 *    - Percentage return (+ / -)
 */

import { 
  FinancialCalculationEngine,
  getInstrumentSpec,
  normalizeSymbol,
  StaticConversionProvider,
  financialValidator,
  FinancialEngineValidationError
} from '../services/financialEngine';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${details ? ` - ${details}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function assertThrows(fn: () => void, testName: string, expectedMsgSubstr?: string) {
  totalTests++;
  try {
    fn();
    console.error(`  ✗ [FAIL] ${testName} - Expected error was not thrown`);
    throw new Error(`Test failed: ${testName} (did not throw)`);
  } catch (err: any) {
    if (expectedMsgSubstr && !err.message.toLowerCase().includes(expectedMsgSubstr.toLowerCase())) {
      console.error(`  ✗ [FAIL] ${testName} - Error "${err.message}" did not contain "${expectedMsgSubstr}"`);
      throw err;
    }
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('========================================================');
  console.log('   FINANCIAL CALCULATION ENGINE - COMPREHENSIVE TESTS   ');
  console.log('========================================================\n');

  const customConversion = new StaticConversionProvider({
    'USD:CHF': 0.8850,
    'USD:JPY': 150.00,
    'EUR:USD': 1.0800,
    'GBP:USD': 1.2500,
    'CHF:USD': 1.12994,
    'JPY:USD': 0.0066667
  });

  const engine = new FinancialCalculationEngine(customConversion);

  // ==========================================
  // 1. INSTRUMENT SPECIFICATIONS & NORMALIZATION
  // ==========================================
  console.log('--- Suite 1: Instrument Specification Coverage ---');
  
  // EURUSD
  const eurusd = getInstrumentSpec('EURUSD');
  assert(eurusd !== undefined, 'EURUSD is registered');
  assert(eurusd?.assetClass === 'FOREX', 'EURUSD assetClass is FOREX');
  assert(eurusd?.contractSize === 100000, 'EURUSD contractSize is 100,000');
  assert(eurusd?.pipSize === 0.0001, 'EURUSD pipSize is 0.0001');
  assert(eurusd?.quoteCurrency === 'USD', 'EURUSD quote is USD');

  // GBPUSD
  const gbpusd = getInstrumentSpec('GBPUSD');
  assert(gbpusd !== undefined, 'GBPUSD is registered');
  assert(gbpusd?.contractSize === 100000, 'GBPUSD contractSize is 100,000');
  assert(gbpusd?.pipSize === 0.0001, 'GBPUSD pipSize is 0.0001');

  // USDCHF
  const usdchf = getInstrumentSpec('USDCHF');
  assert(usdchf !== undefined, 'USDCHF is registered');
  assert(usdchf?.quoteCurrency === 'CHF', 'USDCHF quoteCurrency is CHF');
  assert(usdchf?.pipSize === 0.0001, 'USDCHF pipSize is 0.0001');

  // GBPJPY
  const gbpjpy = getInstrumentSpec('GBPJPY');
  assert(gbpjpy !== undefined, 'GBPJPY is registered');
  assert(gbpjpy?.quoteCurrency === 'JPY', 'GBPJPY quoteCurrency is JPY');
  assert(gbpjpy?.pipSize === 0.01, 'GBPJPY pipSize is 0.01 (JPY pairs)');

  // XAUUSD (Gold)
  const xauusd = getInstrumentSpec('XAUUSD');
  assert(xauusd !== undefined, 'XAUUSD is registered');
  assert(xauusd?.assetClass === 'METALS', 'XAUUSD assetClass is METALS');
  assert(xauusd?.contractSize === 100, 'XAUUSD contractSize is 100 troy ounces (NOT 100,000)');
  assert(xauusd?.pipSize === 0.10, 'XAUUSD pipSize is 0.10 ($0.10 per pip)');

  // US30 (Index)
  const us30 = getInstrumentSpec('US30');
  assert(us30 !== undefined, 'US30 is registered');
  assert(us30?.assetClass === 'INDICES', 'US30 assetClass is INDICES');
  assert(us30?.contractSize === 1, 'US30 contractSize is 1.0 (NOT 100,000)');
  assert(us30?.pipSize === 1.0, 'US30 pipSize is 1.0 pt');

  // SPX500 (Index)
  const spx = getInstrumentSpec('SPX500');
  assert(spx !== undefined, 'SPX500 is registered');
  assert(spx?.contractSize === 1, 'SPX500 contractSize is 1.0');

  // BTCUSD (Crypto)
  const btcusd = getInstrumentSpec('BTCUSD');
  assert(btcusd !== undefined, 'BTCUSD is registered');
  assert(btcusd?.assetClass === 'CRYPTO', 'BTCUSD assetClass is CRYPTO');
  assert(btcusd?.contractSize === 1, 'BTCUSD contractSize is 1.0 (1 BTC)');
  assert(btcusd?.pipSize === 1.0, 'BTCUSD pipSize is 1.0');

  // Normalization aliases
  assert(normalizeSymbol('eur/usd') === 'EURUSD', 'normalizeSymbol handles slashes');
  assert(normalizeSymbol('xau/usd') === 'XAUUSD', 'normalizeSymbol handles XAU/USD');
  assert(normalizeSymbol('gold') === 'XAUUSD', 'normalizeSymbol aliases GOLD to XAUUSD');
  assert(normalizeSymbol('btc/usd') === 'BTCUSD', 'normalizeSymbol handles BTC/USD');
  assert(normalizeSymbol('dow') === 'US30', 'normalizeSymbol aliases DOW to US30');

  console.log('\n--- Suite 2: Negative Prices & Zero Stop Distance Validation ---');
  
  // Negative prices
  assertThrows(() => {
    engine.calculatePnL({
      symbol: 'EURUSD',
      tradeType: 'BUY',
      entryPrice: -1.0500,
      exitPrice: 1.0600,
      lotSize: 1.0
    });
  }, 'Reject negative entry price on PnL', 'positive');

  assertThrows(() => {
    engine.calculatePnL({
      symbol: 'EURUSD',
      tradeType: 'BUY',
      entryPrice: 1.0500,
      exitPrice: -1.0600,
      lotSize: 1.0
    });
  }, 'Reject negative exit price on PnL', 'positive');

  assertThrows(() => {
    engine.calculatePositionSize({
      symbol: 'EURUSD',
      accountBalance: 10000,
      riskPercent: 1,
      entryPrice: -1.05,
      stopLossPrice: 1.04
    });
  }, 'Reject negative entry price on position sizing', 'positive');

  assertThrows(() => {
    engine.calculatePositionSize({
      symbol: 'EURUSD',
      accountBalance: 10000,
      riskPercent: 1,
      entryPrice: 1.05,
      stopLossPrice: -1.04
    });
  }, 'Reject negative stop-loss price on position sizing', 'positive');

  // Zero stop distance
  assertThrows(() => {
    engine.calculatePositionSize({
      symbol: 'EURUSD',
      accountBalance: 10000,
      riskPercent: 1,
      entryPrice: 1.08500,
      stopLossPrice: 1.08500
    });
  }, 'Reject zero stop distance', 'zero');

  // Stop distance smaller than tickSize
  assertThrows(() => {
    engine.calculatePositionSize({
      symbol: 'EURUSD',
      accountBalance: 10000,
      riskPercent: 1,
      entryPrice: 1.085000,
      stopLossPrice: 1.085002 // 0.000002 is less than 0.00001 tick
    });
  }, 'Reject sub-tick stop distance', 'tick');

  console.log('\n--- Suite 3: Lot Size & Contract Spec Validation ---');

  // Below volumeMin
  assertThrows(() => {
    engine.calculatePnL({
      symbol: 'EURUSD',
      tradeType: 'BUY',
      entryPrice: 1.0850,
      exitPrice: 1.0900,
      lotSize: 0.001 // EURUSD volumeMin is 0.01
    });
  }, 'Reject lot size below volumeMin', 'minimum allowed volume');

  // Above volumeMax
  assertThrows(() => {
    engine.calculatePnL({
      symbol: 'EURUSD',
      tradeType: 'BUY',
      entryPrice: 1.0850,
      exitPrice: 1.0900,
      lotSize: 105.0 // EURUSD volumeMax is 100.0
    });
  }, 'Reject lot size above volumeMax', 'maximum allowed volume');

  // Non-step multiple
  assertThrows(() => {
    engine.calculatePnL({
      symbol: 'US30',
      tradeType: 'BUY',
      entryPrice: 38000,
      exitPrice: 38100,
      lotSize: 0.15 // US30 volumeStep is 0.1
    });
  }, 'Reject lot size not matching volumeStep', 'increment of step size');

  // Invalid contract spec (non-positive contract size)
  const invalidContractErr = financialValidator.validateContractSpec({
    symbol: 'BAD',
    name: 'Bad Spec',
    assetClass: 'FOREX',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    contractSize: 0, // INVALID
    tickSize: 0.01,
    tickValue: 0.01,
    pipSize: 0.1,
    pipValue: 0.1,
    volumeMin: 0.01,
    volumeMax: 10,
    volumeStep: 0.01,
    pricePrecision: 2
  }, 'BAD');
  assert(invalidContractErr !== null, 'financialValidator flags non-positive contractSize');

  console.log('\n--- Suite 4: Unsupported Symbols & Impossible Parameters ---');

  // Unsupported symbol
  assertThrows(() => {
    engine.calculatePnL({
      symbol: 'RANDOMUNKNOWNCOIN999',
      tradeType: 'BUY',
      entryPrice: 10,
      exitPrice: 12,
      lotSize: 1.0
    });
  }, 'Reject unsupported symbol', 'unsupported');

  // Impossible risk percentages
  assertThrows(() => {
    engine.calculateRiskAmount(10000, 0);
  }, 'Reject 0% risk', 'greater than 0%');

  assertThrows(() => {
    engine.calculateRiskAmount(10000, -5);
  }, 'Reject negative risk', 'greater than 0%');

  assertThrows(() => {
    engine.calculateRiskAmount(10000, 105);
  }, 'Reject risk percentage > 100%', 'cannot exceed 100%');

  // Invalid account balance
  assertThrows(() => {
    engine.calculateRiskAmount(0, 1);
  }, 'Reject zero account balance', 'positive');

  assertThrows(() => {
    engine.calculateRiskAmount(-5000, 1);
  }, 'Reject negative account balance', 'positive');

  console.log('\n--- Suite 5: PnL Calculation Across Instruments ---');

  // 1. EURUSD: 1.08500 -> 1.08600 (+10 pips), 1.0 lot, account USD
  // Gross quote = 0.00100 * 100,000 * 1.0 = $100.00
  const pnlEurUsd = engine.calculatePnL({
    symbol: 'EURUSD',
    tradeType: 'BUY',
    entryPrice: 1.08500,
    exitPrice: 1.08600,
    lotSize: 1.0,
    accountCurrency: 'USD'
  });
  assert(Math.abs(pnlEurUsd.pnl - 100.0) < 1e-4, 'EURUSD BUY +10 pips with 1.0 lot = +$100.00', `Got ${pnlEurUsd.pnl}`);
  assert(Math.abs(pnlEurUsd.pips - 10.0) < 1e-4, 'EURUSD pips moved = 10.0');

  // EURUSD SELL: 1.08600 -> 1.08500 (+10 pips profit)
  const pnlEurUsdSell = engine.calculatePnL({
    symbol: 'EURUSD',
    tradeType: 'SELL',
    entryPrice: 1.08600,
    exitPrice: 1.08500,
    lotSize: 1.0,
    accountCurrency: 'USD'
  });
  assert(Math.abs(pnlEurUsdSell.pnl - 100.0) < 1e-4, 'EURUSD SELL +10 pips with 1.0 lot = +$100.00');

  // EURUSD LOSS: 1.08500 -> 1.08300 (-20 pips loss)
  const pnlEurUsdLoss = engine.calculatePnL({
    symbol: 'EURUSD',
    tradeType: 'BUY',
    entryPrice: 1.08500,
    exitPrice: 1.08300,
    lotSize: 0.5,
    accountCurrency: 'USD'
  });
  assert(Math.abs(pnlEurUsdLoss.pnl - (-100.0)) < 1e-4, 'EURUSD BUY -20 pips with 0.5 lot = -$100.00');

  // 2. GBPUSD: 1.25000 -> 1.25500 (+50 pips), 0.2 lots
  // Gross quote = 0.00500 * 100,000 * 0.2 = $100.00
  const pnlGbpUsd = engine.calculatePnL({
    symbol: 'GBPUSD',
    tradeType: 'BUY',
    entryPrice: 1.25000,
    exitPrice: 1.25500,
    lotSize: 0.2,
    accountCurrency: 'USD'
  });
  assert(Math.abs(pnlGbpUsd.pnl - 100.0) < 1e-4, 'GBPUSD BUY +50 pips with 0.2 lot = +$100.00');

  // 3. USDCHF (Cross Currency Conversion):
  // Buy 1.0 lot at 0.8800, sell at 0.8850 (+50 pips = 0.0050 CHF).
  // Gross in CHF = 0.0050 * 100,000 * 1.0 = 500 CHF.
  // Converted to USD at CHF:USD (1 / 0.8850 = 1.12994):
  // 500 CHF * 1.12994 = $564.97
  const pnlUsdChf = engine.calculatePnL({
    symbol: 'USDCHF',
    tradeType: 'BUY',
    entryPrice: 0.88000,
    exitPrice: 0.88500,
    lotSize: 1.0,
    accountCurrency: 'USD'
  });
  assert(pnlUsdChf.quoteCurrency === 'CHF', 'USDCHF quote currency is CHF');
  assert(Math.abs(pnlUsdChf.pnlQuoteCurrency - 500.0) < 1e-4, 'USDCHF gross is 500 CHF');
  assert(Math.abs(pnlUsdChf.pnl - (500 * 1.12994)) < 0.1, 'USDCHF converted to USD accurately via provider');

  // 4. GBPJPY (JPY Cross Conversion):
  // Buy 1.0 lot at 190.00, sell at 191.00 (+100 pips = +1.00 JPY).
  // Gross in JPY = 1.00 * 100,000 * 1.0 = 100,000 JPY.
  // Converted to USD at JPY:USD (0.0066667):
  // 100,000 * 0.0066667 = $666.67
  const pnlGbpJpy = engine.calculatePnL({
    symbol: 'GBPJPY',
    tradeType: 'BUY',
    entryPrice: 190.00,
    exitPrice: 191.00,
    lotSize: 1.0,
    accountCurrency: 'USD'
  });
  assert(pnlGbpJpy.quoteCurrency === 'JPY', 'GBPJPY quote currency is JPY');
  assert(Math.abs(pnlGbpJpy.pnlQuoteCurrency - 100000.0) < 1e-4, 'GBPJPY gross is 100,000 JPY');
  assert(Math.abs(pnlGbpJpy.pnl - (100000 * 0.0066667)) < 0.1, 'GBPJPY converted to USD accurately');

  // 5. XAUUSD (Gold - Contract size 100 oz):
  // Buy 1.0 lot at 2300.00, sell at 2310.00 (+$10.00 / oz = 100 pips).
  // PnL = 10.00 * 100 * 1.0 = $1,000.00 (NOT $1,000,000 as 100,000 formula would wrongly compute!)
  const pnlGold = engine.calculatePnL({
    symbol: 'XAUUSD',
    tradeType: 'BUY',
    entryPrice: 2300.00,
    exitPrice: 2310.00,
    lotSize: 1.0,
    accountCurrency: 'USD'
  });
  assert(Math.abs(pnlGold.pnl - 1000.0) < 1e-4, 'XAUUSD 1.0 lot +$10 gold move = $1,000 (respects 100 contract size)');

  // 6. US30 (Index - Contract size 1):
  // Buy 5.0 lots at 39000, exit at 39100 (+100 index points).
  // PnL = 100 * 1 * 5.0 = $500.00
  const pnlUs30 = engine.calculatePnL({
    symbol: 'US30',
    tradeType: 'BUY',
    entryPrice: 39000,
    exitPrice: 39100,
    lotSize: 5.0,
    accountCurrency: 'USD'
  });
  assert(Math.abs(pnlUs30.pnl - 500.0) < 1e-4, 'US30 5.0 lots +100 pts = $500.00 (respects 1 contract size)');

  // 7. BTCUSD (Crypto - Contract size 1 BTC):
  // Buy 0.5 lots at 60000, exit at 62000 (+$2,000 move).
  // PnL = 2000 * 1 * 0.5 = $1,000.00
  const pnlBtc = engine.calculatePnL({
    symbol: 'BTCUSD',
    tradeType: 'BUY',
    entryPrice: 60000,
    exitPrice: 62000,
    lotSize: 0.5,
    accountCurrency: 'USD'
  });
  assert(Math.abs(pnlBtc.pnl - 1000.0) < 1e-4, 'BTCUSD 0.5 lot +$2000 move = $1,000.00 (respects 1 BTC contract size)');

  console.log('\n--- Suite 6: Position Sizing Engine ---');

  // 1. EURUSD: Balance $100,000, Risk 1% = $1,000
  // Entry 1.08500, Stop Loss 1.08300 (20 pips distance = 0.00200)
  // Loss per 1 lot = 0.00200 * 100,000 = $200.00
  // Position size = $1000 / $200 = 5.0 lots
  const posEurUsd = engine.calculatePositionSize({
    symbol: 'EURUSD',
    accountBalance: 100000,
    riskPercent: 1,
    entryPrice: 1.08500,
    stopLossPrice: 1.08300,
    accountCurrency: 'USD'
  });
  assert(posEurUsd.targetRiskAmount === 1000, 'EURUSD target risk is $1000 (1% of 100k)');
  assert(posEurUsd.recommendedLots === 5.0, `EURUSD 20 pips SL at 1% of 100k = 5.0 lots (got ${posEurUsd.recommendedLots})`);
  assert(Math.abs(posEurUsd.actualRiskAtLots - 1000) < 1e-4, 'Actual risk matches target risk at 5.0 lots');

  // 2. XAUUSD: Balance $10,000, Risk 2% = $200
  // Entry 2350.00, SL 2345.00 ($5.00 distance = 50 pips)
  // Loss per 1 lot = $5.00 * 100 = $500.00
  // Lots = $200 / $500 = 0.40 lots
  const posXau = engine.calculatePositionSize({
    symbol: 'XAUUSD',
    accountBalance: 10000,
    riskPercent: 2,
    entryPrice: 2350.00,
    stopLossPrice: 2345.00,
    accountCurrency: 'USD'
  });
  assert(posXau.targetRiskAmount === 200, 'XAUUSD target risk is $200 (2% of 10k)');
  assert(posXau.recommendedLots === 0.4, `XAUUSD $5 SL at $200 risk = 0.4 lots (got ${posXau.recommendedLots})`);

  // 3. US30: Balance $50,000, Risk 1% = $500
  // Entry 39000, SL 38900 (100 points distance)
  // Loss per 1 lot = 100 * 1 = $100.00
  // Lots = $500 / $100 = 5.0 lots
  const posUs30 = engine.calculatePositionSize({
    symbol: 'US30',
    accountBalance: 50000,
    riskPercent: 1,
    entryPrice: 39000,
    stopLossPrice: 38900,
    accountCurrency: 'USD'
  });
  assert(posUs30.recommendedLots === 5.0, `US30 100 pts SL at $500 risk = 5.0 lots (got ${posUs30.recommendedLots})`);

  // 4. BTCUSD: Balance $20,000, Risk 2.5% = $500
  // Entry 60000, SL 59000 ($1000 distance)
  // Loss per 1 lot = $1000 * 1 = $1000.00
  // Lots = $500 / $1000 = 0.50 lots
  const posBtc = engine.calculatePositionSize({
    symbol: 'BTCUSD',
    accountBalance: 20000,
    riskPercent: 2.5,
    entryPrice: 60000,
    stopLossPrice: 59000,
    accountCurrency: 'USD'
  });
  assert(posBtc.recommendedLots === 0.5, `BTCUSD $1000 SL at $500 risk = 0.5 lots (got ${posBtc.recommendedLots})`);

  // 5. USDCHF Position Sizing (Currency Conversion test):
  // Balance $10,000, Risk 1% = $100 USD.
  // Entry 0.88500, SL 0.88000 (50 pips = 0.00500 CHF).
  // Loss per 1 lot in CHF = 0.00500 * 100,000 = 500 CHF.
  // Converted to USD: 500 CHF * 1.12994 = $564.97 USD.
  // Raw lots = $100 / 564.97 = 0.177 -> 0.18 lots
  const posUsdChf = engine.calculatePositionSize({
    symbol: 'USDCHF',
    accountBalance: 10000,
    riskPercent: 1,
    entryPrice: 0.88500,
    stopLossPrice: 0.88000,
    accountCurrency: 'USD'
  });
  assert(posUsdChf.recommendedLots === 0.18, `USDCHF position size accounts for CHF->USD conversion (got ${posUsdChf.recommendedLots})`);

  // 6. GBPJPY Position Sizing:
  // Balance $10,000, Risk 1% = $100 USD.
  // Entry 190.00, SL 189.50 (50 pips = 0.50 JPY).
  // Loss per 1 lot in JPY = 0.50 * 100,000 = 50,000 JPY.
  // Converted to USD: 50,000 * 0.0066667 = $333.33 USD.
  // Raw lots = $100 / 333.33 = 0.30 lots
  const posGbpJpy = engine.calculatePositionSize({
    symbol: 'GBPJPY',
    accountBalance: 10000,
    riskPercent: 1,
    entryPrice: 190.00,
    stopLossPrice: 189.50,
    accountCurrency: 'USD'
  });
  assert(posGbpJpy.recommendedLots === 0.3, `GBPJPY position size accounts for JPY->USD conversion (got ${posGbpJpy.recommendedLots})`);

  console.log('\n--- Suite 7: Additional Financial Engine Metrics ---');

  // Reward / Risk
  const rrBuy = engine.calculateRewardRisk(1.0850, 1.0800, 1.0950, 'BUY');
  assert(Math.abs(rrBuy.riskRewardRatio - 2.0) < 1e-4, 'R:R for BUY 50 pips risk / 100 pips reward = 1:2.0');
  assert(rrBuy.ratioFormatted === '1:2.00', 'R:R formatted is 1:2.00');

  const rrSell = engine.calculateRewardRisk(1.0850, 1.0900, 1.0700, 'SELL');
  assert(Math.abs(rrSell.riskRewardRatio - 3.0) < 1e-4, 'R:R for SELL 50 pips risk / 150 pips reward = 1:3.0');

  // Realized R
  const rWin = engine.calculateRealizedR(500, 200);
  assert(rWin.realizedR === 2.5, 'Realized R for +$500 win on $200 risk is +2.5R');
  assert(rWin.formatted === '+2.50R', 'Formatted Realized R is +2.50R');

  const rLoss = engine.calculateRealizedR(-200, 200);
  assert(rLoss.realizedR === -1.0, 'Realized R for -$200 loss on $200 risk is -1.0R');
  assert(rLoss.formatted === '-1.00R', 'Formatted Realized R is -1.00R');

  // Percentage Return
  const retWin = engine.calculatePercentageReturn(2500, 100000);
  assert(retWin.returnPercent === 2.5, 'Percentage return on $2500 win on 100k balance is 2.5%');
  assert(retWin.formatted === '+2.50%', 'Formatted return is +2.50%');

  const retLoss = engine.calculatePercentageReturn(-1500, 100000);
  assert(retLoss.returnPercent === -1.5, 'Percentage return on -$1500 loss on 100k balance is -1.5%');
  assert(retLoss.formatted === '-1.50%', 'Formatted return is -1.50%');

  // Price movement helper
  const movement = engine.calculatePriceMovement(1.0800, 1.0850, 'BUY', 'EURUSD');
  assert(Math.abs(movement.pips - 50) < 1e-4, 'Price movement pips = 50');
  assert(Math.abs(movement.ticks - 500) < 1e-4, 'Price movement ticks = 500');

  console.log('\n========================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
  console.log('ALL FINANCIAL ENGINE INVARIANTS & INSTRUMENTS VERIFIED!');
  console.log('========================================================');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
