/**
 * Financial Calculation Engine Types
 * Provides typed specifications for diverse asset classes (Forex, Metals, Indices, Crypto)
 * and standardized calculation models.
 */

export type AssetClass = 'FOREX' | 'METALS' | 'INDICES' | 'CRYPTO' | 'COMMODITIES';

export type TradeDirection = 'BUY' | 'SELL';

/**
 * Reusable instrument specification defining contract and pricing behavior.
 * Replaces hard-coded assumptions of 100,000 contract sizes or fixed 10 $/pip rules.
 */
export interface InstrumentSpec {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  baseCurrency: string;
  quoteCurrency: string;
  contractSize: number; // e.g. 100000 for standard FX, 100 for XAUUSD (100 oz), 1 for US30/BTC
  tickSize: number;     // Minimum price movement (e.g. 0.00001, 0.01, 0.1, 1.0)
  tickValue: number;    // Monetary value of 1 tick per 1.0 lot in quote currency (= contractSize * tickSize)
  pipSize: number;      // Pip increment (e.g. 0.0001 for FX, 0.01 for JPY pairs, 0.1 for Gold, 1.0 for Indices)
  pipValue: number;     // Monetary value of 1 pip per 1.0 lot in quote currency (= contractSize * pipSize)
  volumeMin: number;    // Minimum order size in lots (e.g. 0.01)
  volumeMax: number;    // Maximum order size in lots (e.g. 100.0)
  volumeStep: number;   // Lot increment step (e.g. 0.01)
  pricePrecision: number; // Decimal places for price formatting (e.g. 5, 3, 2, 1)
  description?: string;
}

/**
 * Currency Conversion Provider Interface
 * Supports injecting real-time market data or custom rates without inventing fake quotes.
 */
export interface CurrencyConversionProvider {
  getExchangeRate(fromCurrency: string, toCurrency: string): number | undefined;
  convert(amount: number, fromCurrency: string, toCurrency: string): { amount: number; rate: number; isExact: boolean } | undefined;
  isRateAvailable(fromCurrency: string, toCurrency: string): boolean;
}

export interface PnlCalculationInput {
  symbol: string;
  tradeType: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  accountCurrency?: string;
  customSpec?: InstrumentSpec;
}

export interface PnlCalculationResult {
  pnl: number;                  // PnL in account currency
  pnlQuoteCurrency: number;     // Gross PnL in instrument quote currency
  pips: number;                 // Pips moved (signed: positive if profitable)
  ticks: number;                // Ticks moved (signed)
  priceDelta: number;           // Absolute price difference (exit - entry for BUY)
  quoteCurrency: string;
  accountCurrency: string;
  conversionRateUsed: number;
  isBrokerAccurate: boolean;
  disclaimer: string;
}

export interface PositionSizeInput {
  symbol: string;
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLossPrice: number;
  accountCurrency?: string;
  customSpec?: InstrumentSpec;
}

export interface PositionSizeResult {
  recommendedLots: number;      // Step-rounded and min/max clamped lot size
  rawLots: number;              // Exact unrounded mathematical lot size
  targetRiskAmount: number;     // Target monetary risk = balance * riskPercent / 100
  actualRiskAtLots: number;     // Actual monetary loss incurred at recommendedLots
  stopLossPips: number;         // Distance to SL in pips
  stopLossTicks: number;        // Distance to SL in ticks
  stopLossDistance: number;     // Raw price distance |entry - stopLoss|
  lossPerLotAccount: number;    // Loss incurred per 1.0 standard lot in account currency
  quoteCurrency: string;
  accountCurrency: string;
  conversionRateUsed: number;
  isBrokerAccurate: boolean;
  disclaimer: string;
}

export interface PriceMovementResult {
  delta: number;                // Signed price movement
  absDelta: number;             // Unsigned price distance
  pips: number;                 // Movement in pips
  ticks: number;                // Movement in ticks
  percentageChange: number;     // (delta / entryPrice) * 100
}

export interface RiskRewardResult {
  riskDistance: number;
  rewardDistance: number;
  riskRewardRatio: number;      // e.g. 2.5 indicates 1:2.5 R:R
  ratioFormatted: string;       // e.g. "1:2.50"
  isValid: boolean;
}

export interface RealizedRResult {
  realizedR: number;            // PnL / initial risk amount (e.g. +2.5R or -1.0R)
  formatted: string;            // e.g. "+2.50R" or "-1.00R"
}

export interface ReturnPercentResult {
  returnPercent: number;        // (pnl / initialBalance) * 100
  formatted: string;            // e.g. "+2.50%" or "-1.20%"
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
