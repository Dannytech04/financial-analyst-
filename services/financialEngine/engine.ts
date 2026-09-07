import { 
  CurrencyConversionProvider, 
  InstrumentSpec, 
  PnlCalculationInput, 
  PnlCalculationResult, 
  PositionSizeInput, 
  PositionSizeResult, 
  PriceMovementResult, 
  RealizedRResult, 
  ReturnPercentResult, 
  RiskRewardResult, 
  TradeDirection 
} from './types';
import { getInstrumentSpec } from './instruments';
import { defaultConversionProvider } from './conversion';
import { financialValidator, FinancialEngineValidationError } from './validation';

export class FinancialCalculationEngine {
  private conversionProvider: CurrencyConversionProvider;

  constructor(conversionProvider: CurrencyConversionProvider = defaultConversionProvider) {
    this.conversionProvider = conversionProvider;
  }

  /**
   * Sets or updates the active currency conversion provider
   */
  public setConversionProvider(provider: CurrencyConversionProvider): void {
    this.conversionProvider = provider;
  }

  public getConversionProvider(): CurrencyConversionProvider {
    return this.conversionProvider;
  }

  /**
   * Calculates price movement distance, ticks, pips, and percentage delta
   */
  public calculatePriceMovement(
    entryPrice: number,
    exitPrice: number,
    tradeType: TradeDirection,
    specOrSymbol: InstrumentSpec | string
  ): PriceMovementResult {
    const spec = typeof specOrSymbol === 'string' ? getInstrumentSpec(specOrSymbol) : specOrSymbol;
    if (!spec) {
      throw new FinancialEngineValidationError([`Unsupported symbol for price movement: ${specOrSymbol}`]);
    }

    const priceErr1 = financialValidator.validatePrice(entryPrice, 'Entry Price');
    const priceErr2 = financialValidator.validatePrice(exitPrice, 'Exit Price');
    if (priceErr1 || priceErr2) {
      throw new FinancialEngineValidationError([priceErr1 || '', priceErr2 || ''].filter(Boolean));
    }

    const delta = tradeType === 'BUY' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
    const absDelta = Math.abs(exitPrice - entryPrice);
    const pips = delta / spec.pipSize;
    const ticks = delta / spec.tickSize;
    const percentageChange = (delta / entryPrice) * 100;

    return {
      delta,
      absDelta,
      pips,
      ticks,
      percentageChange
    };
  }

  /**
   * Calculates pip distance between two prices
   */
  public calculatePipDistance(
    price1: number,
    price2: number,
    specOrSymbol: InstrumentSpec | string
  ): number {
    const spec = typeof specOrSymbol === 'string' ? getInstrumentSpec(specOrSymbol) : specOrSymbol;
    if (!spec) {
      throw new FinancialEngineValidationError([`Unsupported symbol: ${specOrSymbol}`]);
    }
    return Math.abs(price1 - price2) / spec.pipSize;
  }

  /**
   * Calculates tick distance between two prices
   */
  public calculateTickDistance(
    price1: number,
    price2: number,
    specOrSymbol: InstrumentSpec | string
  ): number {
    const spec = typeof specOrSymbol === 'string' ? getInstrumentSpec(specOrSymbol) : specOrSymbol;
    if (!spec) {
      throw new FinancialEngineValidationError([`Unsupported symbol: ${specOrSymbol}`]);
    }
    return Math.abs(price1 - price2) / spec.tickSize;
  }

  /**
   * Calculates target monetary risk amount for a given account balance and risk percentage
   */
  public calculateRiskAmount(balance: number, riskPercent: number): number {
    const balErr = financialValidator.validateAccountBalance(balance);
    const riskErr = financialValidator.validateRiskPercent(riskPercent);
    if (balErr || riskErr) {
      throw new FinancialEngineValidationError([balErr || '', riskErr || ''].filter(Boolean));
    }
    return balance * (riskPercent / 100);
  }

  /**
   * Calculates Realized or Unrealized PnL taking into account instrument contract size,
   * quote currency, and cross-currency conversion to account currency.
   */
  public calculatePnL(
    input: PnlCalculationInput,
    customProvider?: CurrencyConversionProvider
  ): PnlCalculationResult {
    const spec = input.customSpec || getInstrumentSpec(input.symbol);
    const validation = financialValidator.validatePnlInputs({
      symbol: input.symbol,
      spec,
      entryPrice: input.entryPrice,
      exitPrice: input.exitPrice,
      lotSize: input.lotSize
    });

    if (!validation.isValid) {
      throw new FinancialEngineValidationError(validation.errors);
    }

    const activeSpec = spec!;
    const accountCurrency = (input.accountCurrency || 'USD').toUpperCase();
    const quoteCurrency = activeSpec.quoteCurrency.toUpperCase();
    const provider = customProvider || this.conversionProvider;

    // Price delta signed by direction
    const priceDelta = input.tradeType === 'BUY' 
      ? (input.exitPrice - input.entryPrice) 
      : (input.entryPrice - input.exitPrice);

    // Gross PnL in instrument quote currency
    const pnlQuoteCurrency = priceDelta * activeSpec.contractSize * input.lotSize;
    const pips = priceDelta / activeSpec.pipSize;
    const ticks = priceDelta / activeSpec.tickSize;

    // Currency conversion to account currency
    let pnl = pnlQuoteCurrency;
    let conversionRateUsed = 1.0;
    let isBrokerAccurate = true;
    let disclaimer = `PnL calculated using standard contract size (${activeSpec.contractSize} ${activeSpec.baseCurrency}). Spreads, commissions, and financing fees are not included.`;

    if (quoteCurrency !== accountCurrency) {
      const conversion = provider.convert(pnlQuoteCurrency, quoteCurrency, accountCurrency);
      if (!conversion) {
        throw new FinancialEngineValidationError([
          `Conversion rate from quote currency "${quoteCurrency}" to account currency "${accountCurrency}" is unavailable. Cannot guarantee broker-accurate PnL.`
        ]);
      }
      pnl = conversion.amount;
      conversionRateUsed = conversion.rate;
      isBrokerAccurate = conversion.isExact;
      disclaimer = `PnL converted from ${quoteCurrency} to ${accountCurrency} at rate ${conversionRateUsed.toFixed(5)}. Note: Real broker execution may apply live FX spreads or conversion markups.`;
    }

    return {
      pnl,
      pnlQuoteCurrency,
      pips,
      ticks,
      priceDelta,
      quoteCurrency,
      accountCurrency,
      conversionRateUsed,
      isBrokerAccurate,
      disclaimer
    };
  }

  /**
   * Calculates Position Size (recommended lots) taking into account account balance,
   * risk percentage, entry/stop-loss distance, instrument contract specification, and currency conversion.
   */
  public calculatePositionSize(
    input: PositionSizeInput,
    customProvider?: CurrencyConversionProvider
  ): PositionSizeResult {
    const spec = input.customSpec || getInstrumentSpec(input.symbol);
    const validation = financialValidator.validatePositionSizeInputs({
      symbol: input.symbol,
      spec,
      balance: input.accountBalance,
      riskPercent: input.riskPercent,
      entryPrice: input.entryPrice,
      stopLossPrice: input.stopLossPrice
    });

    if (!validation.isValid) {
      throw new FinancialEngineValidationError(validation.errors);
    }

    const activeSpec = spec!;
    const accountCurrency = (input.accountCurrency || 'USD').toUpperCase();
    const quoteCurrency = activeSpec.quoteCurrency.toUpperCase();
    const provider = customProvider || this.conversionProvider;

    const targetRiskAmount = input.accountBalance * (input.riskPercent / 100);
    const stopLossDistance = Math.abs(input.entryPrice - input.stopLossPrice);
    const stopLossPips = stopLossDistance / activeSpec.pipSize;
    const stopLossTicks = stopLossDistance / activeSpec.tickSize;

    // Monetary loss per 1.0 lot in quote currency
    const lossPerLotQuote = stopLossDistance * activeSpec.contractSize;

    // Monetary loss per 1.0 lot in account currency
    let lossPerLotAccount = lossPerLotQuote;
    let conversionRateUsed = 1.0;
    let isBrokerAccurate = true;
    let disclaimer = `Position sizing based on contract size (${activeSpec.contractSize} ${activeSpec.baseCurrency}). Slippage and spreads are excluded.`;

    if (quoteCurrency !== accountCurrency) {
      const conversion = provider.convert(lossPerLotQuote, quoteCurrency, accountCurrency);
      if (!conversion) {
        throw new FinancialEngineValidationError([
          `Conversion rate from quote currency "${quoteCurrency}" to account currency "${accountCurrency}" is unavailable. Cannot calculate accurate position sizing.`
        ]);
      }
      lossPerLotAccount = conversion.amount;
      conversionRateUsed = conversion.rate;
      isBrokerAccurate = conversion.isExact;
      disclaimer = `Loss per lot converted from ${quoteCurrency} to ${accountCurrency} at rate ${conversionRateUsed.toFixed(5)}. Actual broker margins and conversion spreads may vary.`;
    }

    if (lossPerLotAccount <= 0) {
      throw new FinancialEngineValidationError(['Calculated loss per lot is non-positive. Verify stop-loss distance.']);
    }

    // Exact raw lot calculation
    const rawLots = targetRiskAmount / lossPerLotAccount;

    // Align with volumeStep and clamp between volumeMin and volumeMax
    const step = activeSpec.volumeStep;
    const stepPrecision = step.toString().includes('.') ? step.toString().split('.')[1].length : 0;
    
    // Round to step
    const steppedLots = Math.round(rawLots / step) * step;
    const clampedLots = Math.max(activeSpec.volumeMin, Math.min(activeSpec.volumeMax, steppedLots));
    const recommendedLots = Number(clampedLots.toFixed(stepPrecision));

    const actualRiskAtLots = recommendedLots * lossPerLotAccount;

    return {
      recommendedLots,
      rawLots,
      targetRiskAmount,
      actualRiskAtLots,
      stopLossPips,
      stopLossTicks,
      stopLossDistance,
      lossPerLotAccount,
      quoteCurrency,
      accountCurrency,
      conversionRateUsed,
      isBrokerAccurate,
      disclaimer
    };
  }

  /**
   * Calculates Reward-to-Risk ratio from Entry, Stop Loss, and Take Profit
   */
  public calculateRewardRisk(
    entryPrice: number,
    stopLossPrice: number,
    takeProfitPrice: number,
    tradeType: TradeDirection
  ): RiskRewardResult {
    const p1 = financialValidator.validatePrice(entryPrice, 'Entry Price');
    const p2 = financialValidator.validatePrice(stopLossPrice, 'Stop Loss Price');
    const p3 = financialValidator.validatePrice(takeProfitPrice, 'Take Profit Price');
    if (p1 || p2 || p3) {
      throw new FinancialEngineValidationError([p1 || '', p2 || '', p3 || ''].filter(Boolean));
    }

    const riskDistance = Math.abs(entryPrice - stopLossPrice);
    const rewardDistance = tradeType === 'BUY'
      ? (takeProfitPrice - entryPrice)
      : (entryPrice - takeProfitPrice);

    if (riskDistance === 0) {
      return {
        riskDistance: 0,
        rewardDistance,
        riskRewardRatio: 0,
        ratioFormatted: 'N/A',
        isValid: false
      };
    }

    const ratio = rewardDistance / riskDistance;
    return {
      riskDistance,
      rewardDistance,
      riskRewardRatio: ratio,
      ratioFormatted: `1:${ratio.toFixed(2)}`,
      isValid: ratio > 0
    };
  }

  /**
   * Calculates Realized Multiple of Risk (R)
   */
  public calculateRealizedR(pnl: number, initialRiskAmount: number): RealizedRResult {
    if (initialRiskAmount <= 0) {
      throw new FinancialEngineValidationError(['Initial risk amount must be strictly positive to calculate realized R.']);
    }
    const r = pnl / initialRiskAmount;
    return {
      realizedR: r,
      formatted: `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`
    };
  }

  /**
   * Calculates Return percentage on account balance
   */
  public calculatePercentageReturn(pnl: number, initialBalance: number): ReturnPercentResult {
    const balErr = financialValidator.validateAccountBalance(initialBalance);
    if (balErr) {
      throw new FinancialEngineValidationError([balErr]);
    }
    const pct = (pnl / initialBalance) * 100;
    return {
      returnPercent: pct,
      formatted: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
    };
  }
}

/**
 * Default global financial calculation engine instance
 */
export const financialEngine = new FinancialCalculationEngine();
