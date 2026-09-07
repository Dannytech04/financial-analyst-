import { InstrumentSpec } from './types';

/**
 * Standard Instrument Specification Registry
 * Covers Forex, Metals, Indices, and Crypto.
 * Note: While these specifications represent standard institutional / retail CFD conventions,
 * individual brokers may configure custom contract sizes or point values.
 */
const DEFAULT_INSTRUMENTS: Record<string, InstrumentSpec> = {
  // --- FOREX MAJORS & CROSSES ---
  'EURUSD': {
    symbol: 'EURUSD',
    name: 'Euro / US Dollar',
    assetClass: 'FOREX',
    baseCurrency: 'EUR',
    quoteCurrency: 'USD',
    contractSize: 100000,
    tickSize: 0.00001,
    tickValue: 1.0,
    pipSize: 0.0001,
    pipValue: 10.0,
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 5,
    description: 'Standard FX contract of 100,000 EUR with 5-digit quoting'
  },
  'GBPUSD': {
    symbol: 'GBPUSD',
    name: 'British Pound / US Dollar',
    assetClass: 'FOREX',
    baseCurrency: 'GBP',
    quoteCurrency: 'USD',
    contractSize: 100000,
    tickSize: 0.00001,
    tickValue: 1.0,
    pipSize: 0.0001,
    pipValue: 10.0,
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 5,
    description: 'Standard FX contract of 100,000 GBP with 5-digit quoting'
  },
  'USDCHF': {
    symbol: 'USDCHF',
    name: 'US Dollar / Swiss Franc',
    assetClass: 'FOREX',
    baseCurrency: 'USD',
    quoteCurrency: 'CHF',
    contractSize: 100000,
    tickSize: 0.00001,
    tickValue: 1.0, // in CHF
    pipSize: 0.0001,
    pipValue: 10.0, // in CHF
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 5,
    description: 'Standard FX contract of 100,000 USD, quoted in CHF'
  },
  'GBPJPY': {
    symbol: 'GBPJPY',
    name: 'British Pound / Japanese Yen',
    assetClass: 'FOREX',
    baseCurrency: 'GBP',
    quoteCurrency: 'JPY',
    contractSize: 100000,
    tickSize: 0.001,
    tickValue: 100.0, // in JPY
    pipSize: 0.01,
    pipValue: 1000.0, // in JPY
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 3,
    description: 'Standard FX contract of 100,000 GBP, quoted in JPY (2nd/3rd decimal pip)'
  },
  'USDJPY': {
    symbol: 'USDJPY',
    name: 'US Dollar / Japanese Yen',
    assetClass: 'FOREX',
    baseCurrency: 'USD',
    quoteCurrency: 'JPY',
    contractSize: 100000,
    tickSize: 0.001,
    tickValue: 100.0, // in JPY
    pipSize: 0.01,
    pipValue: 1000.0, // in JPY
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 3,
    description: 'Standard FX contract of 100,000 USD, quoted in JPY'
  },
  'AUDUSD': {
    symbol: 'AUDUSD',
    name: 'Australian Dollar / US Dollar',
    assetClass: 'FOREX',
    baseCurrency: 'AUD',
    quoteCurrency: 'USD',
    contractSize: 100000,
    tickSize: 0.00001,
    tickValue: 1.0,
    pipSize: 0.0001,
    pipValue: 10.0,
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 5
  },
  'USDCAD': {
    symbol: 'USDCAD',
    name: 'US Dollar / Canadian Dollar',
    assetClass: 'FOREX',
    baseCurrency: 'USD',
    quoteCurrency: 'CAD',
    contractSize: 100000,
    tickSize: 0.00001,
    tickValue: 1.0,
    pipSize: 0.0001,
    pipValue: 10.0,
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 5
  },
  'EURGBP': {
    symbol: 'EURGBP',
    name: 'Euro / British Pound',
    assetClass: 'FOREX',
    baseCurrency: 'EUR',
    quoteCurrency: 'GBP',
    contractSize: 100000,
    tickSize: 0.00001,
    tickValue: 1.0, // in GBP
    pipSize: 0.0001,
    pipValue: 10.0, // in GBP
    volumeMin: 0.01,
    volumeMax: 100.0,
    volumeStep: 0.01,
    pricePrecision: 5
  },

  // --- PRECIOUS METALS ---
  'XAUUSD': {
    symbol: 'XAUUSD',
    name: 'Gold / US Dollar',
    assetClass: 'METALS',
    baseCurrency: 'XAU',
    quoteCurrency: 'USD',
    contractSize: 100, // 100 troy ounces per standard lot
    tickSize: 0.01,
    tickValue: 1.0,    // 100 oz * $0.01 = $1.00
    pipSize: 0.10,     // 10 cents = 1 pip
    pipValue: 10.0,    // 100 oz * $0.10 = $10.00
    volumeMin: 0.01,
    volumeMax: 50.0,
    volumeStep: 0.01,
    pricePrecision: 2,
    description: '1 standard lot equals 100 troy ounces of Gold'
  },
  'XAGUSD': {
    symbol: 'XAGUSD',
    name: 'Silver / US Dollar',
    assetClass: 'METALS',
    baseCurrency: 'XAG',
    quoteCurrency: 'USD',
    contractSize: 5000, // 5,000 troy ounces per lot
    tickSize: 0.001,
    tickValue: 5.0,
    pipSize: 0.01,
    pipValue: 50.0,
    volumeMin: 0.01,
    volumeMax: 25.0,
    volumeStep: 0.01,
    pricePrecision: 3,
    description: '1 standard lot equals 5,000 troy ounces of Silver'
  },

  // --- EQUITY INDICES ---
  'US30': {
    symbol: 'US30',
    name: 'Dow Jones Industrial Average CFD',
    assetClass: 'INDICES',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    contractSize: 1, // $1 per index point per lot
    tickSize: 0.1,
    tickValue: 0.1,
    pipSize: 1.0,    // 1 index point = 1 pip
    pipValue: 1.0,   // $1.00 per full point per lot
    volumeMin: 0.1,
    volumeMax: 100.0,
    volumeStep: 0.1,
    pricePrecision: 1,
    description: 'Cash CFD tracking the Dow Jones Industrial Average (1 pt = $1)'
  },
  'SPX500': {
    symbol: 'SPX500',
    name: 'S&P 500 CFD',
    assetClass: 'INDICES',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    contractSize: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    pipSize: 0.1,    // 0.1 index point
    pipValue: 0.1,
    volumeMin: 0.1,
    volumeMax: 100.0,
    volumeStep: 0.1,
    pricePrecision: 2,
    description: 'Cash CFD tracking the Standard & Poor 500 index'
  },
  'NAS100': {
    symbol: 'NAS100',
    name: 'Nasdaq 100 CFD',
    assetClass: 'INDICES',
    baseCurrency: 'USD',
    quoteCurrency: 'USD',
    contractSize: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    pipSize: 1.0,
    pipValue: 1.0,
    volumeMin: 0.1,
    volumeMax: 100.0,
    volumeStep: 0.1,
    pricePrecision: 2,
    description: 'Cash CFD tracking the Nasdaq 100 technology index'
  },
  'GER40': {
    symbol: 'GER40',
    name: 'DAX 40 CFD',
    assetClass: 'INDICES',
    baseCurrency: 'EUR',
    quoteCurrency: 'EUR',
    contractSize: 1,
    tickSize: 0.1,
    tickValue: 0.1, // in EUR
    pipSize: 1.0,
    pipValue: 1.0,  // in EUR
    volumeMin: 0.1,
    volumeMax: 100.0,
    volumeStep: 0.1,
    pricePrecision: 1,
    description: 'Cash CFD tracking the German DAX 40 index in EUR'
  },

  // --- CRYPTO ASSETS ---
  'BTCUSD': {
    symbol: 'BTCUSD',
    name: 'Bitcoin / US Dollar',
    assetClass: 'CRYPTO',
    baseCurrency: 'BTC',
    quoteCurrency: 'USD',
    contractSize: 1, // 1 Bitcoin per lot
    tickSize: 0.01,
    tickValue: 0.01,
    pipSize: 1.0,    // $1.00 move = 1 pip
    pipValue: 1.0,   // $1.00 per $1 move per 1 BTC
    volumeMin: 0.01,
    volumeMax: 20.0,
    volumeStep: 0.01,
    pricePrecision: 2,
    description: 'Crypto spot CFD of 1.0 BTC contract size'
  },
  'ETHUSD': {
    symbol: 'ETHUSD',
    name: 'Ethereum / US Dollar',
    assetClass: 'CRYPTO',
    baseCurrency: 'ETH',
    quoteCurrency: 'USD',
    contractSize: 1, // 1 Ether per lot
    tickSize: 0.01,
    tickValue: 0.01,
    pipSize: 0.1,
    pipValue: 0.1,
    volumeMin: 0.01,
    volumeMax: 50.0,
    volumeStep: 0.01,
    pricePrecision: 2,
    description: 'Crypto spot CFD of 1.0 ETH contract size'
  },
  'SOLUSD': {
    symbol: 'SOLUSD',
    name: 'Solana / US Dollar',
    assetClass: 'CRYPTO',
    baseCurrency: 'SOL',
    quoteCurrency: 'USD',
    contractSize: 1,
    tickSize: 0.01,
    tickValue: 0.01,
    pipSize: 0.1,
    pipValue: 0.1,
    volumeMin: 0.1,
    volumeMax: 250.0,
    volumeStep: 0.1,
    pricePrecision: 2,
    description: 'Crypto spot CFD of 1.0 SOL contract size'
  }
};

/**
 * Normalizes user input symbols (removes delimiters, handles aliases)
 * Examples:
 *  "EUR/USD" -> "EURUSD"
 *  "gold" -> "XAUUSD"
 *  "btc" -> "BTCUSD"
 *  "us30.cash" -> "US30"
 *  "spx" -> "SPX500"
 */
export function normalizeSymbol(rawSymbol: string): string {
  if (!rawSymbol) return '';
  const clean = rawSymbol
    .trim()
    .toUpperCase()
    .replace(/[/_\-\s.]/g, '');

  // Common market aliases
  if (clean === 'GOLD' || clean === 'XAU') return 'XAUUSD';
  if (clean === 'SILVER' || clean === 'XAG') return 'XAGUSD';
  if (clean === 'DOW' || clean === 'DJ30' || clean === 'DJIA' || clean === 'US30CASH') return 'US30';
  if (clean === 'SPX' || clean === 'US500' || clean === 'SP500') return 'SPX500';
  if (clean === 'NDX' || clean === 'USTEC' || clean === 'NAS') return 'NAS100';
  if (clean === 'DAX' || clean === 'DAX40' || clean === 'DE40') return 'GER40';
  if (clean === 'BTC' || clean === 'BITCOIN') return 'BTCUSD';
  if (clean === 'ETH' || clean === 'ETHEREUM') return 'ETHUSD';
  if (clean === 'SOL' || clean === 'SOLANA') return 'SOLUSD';

  return clean;
}

const customRegistry: Map<string, InstrumentSpec> = new Map();

/**
 * Retrieves the instrument specification for a given symbol.
 * Checks custom overrides first, then standard catalog, with alias normalization.
 */
export function getInstrumentSpec(rawSymbol: string): InstrumentSpec | undefined {
  const normalized = normalizeSymbol(rawSymbol);
  if (customRegistry.has(normalized)) {
    return customRegistry.get(normalized);
  }
  return DEFAULT_INSTRUMENTS[normalized];
}

/**
 * Registers or overrides an instrument specification dynamically.
 */
export function registerInstrumentSpec(spec: InstrumentSpec): void {
  const normalized = normalizeSymbol(spec.symbol);
  customRegistry.set(normalized, { ...spec, symbol: normalized });
}

/**
 * Returns a list of all recognized instruments.
 */
export function getAllInstrumentSpecs(): InstrumentSpec[] {
  const merged = new Map<string, InstrumentSpec>();
  for (const [key, spec] of Object.entries(DEFAULT_INSTRUMENTS)) {
    merged.set(key, spec);
  }
  for (const [key, spec] of customRegistry.entries()) {
    merged.set(key, spec);
  }
  return Array.from(merged.values());
}
