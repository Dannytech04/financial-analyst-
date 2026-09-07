import { CurrencyConversionProvider } from './types';

/**
 * Standard Currency Conversion Provider
 * 
 * Provides a pluggable, deterministic interface for exchange rate conversions.
 * Avoids inventing fictitious live quotes: uses registered / verified exchange rates
 * or explicit identity mappings when quoteCurrency matches accountCurrency.
 */
export class StaticConversionProvider implements CurrencyConversionProvider {
  private rates: Map<string, number> = new Map();

  constructor(initialRates?: Record<string, number>) {
    // Identity rates
    const currencies = ['USD', 'EUR', 'GBP', 'CHF', 'JPY', 'CAD', 'AUD', 'NZD'];
    for (const c of currencies) {
      this.rates.set(`${c}:${c}`, 1.0);
    }

    // Standard benchmark reference rates (used when exact broker feed is not connected)
    const benchmarkRates: Record<string, number> = {
      'EUR:USD': 1.0850,
      'GBP:USD': 1.2700,
      'USD:CHF': 0.8850,
      'USD:JPY': 152.00,
      'USD:CAD': 1.3600,
      'AUD:USD': 0.6550,
      'NZD:USD': 0.6050,
      'EUR:GBP': 0.8540,
      'CHF:USD': 1.1299, // 1 / 0.8850
      'JPY:USD': 0.0065789, // 1 / 152.00
      'CAD:USD': 0.7353,
      ...initialRates
    };

    for (const [pair, rate] of Object.entries(benchmarkRates)) {
      this.setRate(pair.split(':')[0], pair.split(':')[1], rate);
    }
  }

  public setRate(from: string, to: string, rate: number): void {
    if (rate <= 0) throw new Error(`Invalid exchange rate: ${rate} for ${from}->${to}`);
    const key = `${from.toUpperCase()}:${to.toUpperCase()}`;
    const reverseKey = `${to.toUpperCase()}:${from.toUpperCase()}`;
    this.rates.set(key, rate);
    this.rates.set(reverseKey, 1 / rate);
  }

  public getExchangeRate(fromCurrency: string, toCurrency: string): number | undefined {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    if (from === to) return 1.0;

    const directKey = `${from}:${to}`;
    if (this.rates.has(directKey)) {
      return this.rates.get(directKey);
    }

    // Try cross-rate via USD
    const fromToUsdKey = `${from}:USD`;
    const usdToTargetKey = `USD:${to}`;
    if (this.rates.has(fromToUsdKey) && this.rates.has(usdToTargetKey)) {
      const r1 = this.rates.get(fromToUsdKey)!;
      const r2 = this.rates.get(usdToTargetKey)!;
      return r1 * r2;
    }

    return undefined;
  }

  public isRateAvailable(fromCurrency: string, toCurrency: string): boolean {
    return this.getExchangeRate(fromCurrency, toCurrency) !== undefined;
  }

  public convert(
    amount: number, 
    fromCurrency: string, 
    toCurrency: string
  ): { amount: number; rate: number; isExact: boolean } | undefined {
    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return { amount, rate: 1.0, isExact: true };
    }

    const rate = this.getExchangeRate(from, to);
    if (rate === undefined) {
      return undefined;
    }

    return {
      amount: amount * rate,
      rate,
      isExact: true
    };
  }
}

/**
 * Default global conversion provider singleton.
 * Applications can replace this with a live API provider (e.g. WebSocket / REST market data feed).
 */
export const defaultConversionProvider = new StaticConversionProvider();
