import { InstrumentSpec, ValidationResult } from './types';

export class FinancialEngineValidationError extends Error {
  public errors: string[];

  constructor(errors: string[]) {
    super(`Financial Calculation Validation Failed: ${errors.join('; ')}`);
    this.name = 'FinancialEngineValidationError';
    this.errors = errors;
  }
}

export const financialValidator = {
  /**
   * Validates pricing (must be strictly positive, finite numbers)
   */
  validatePrice(price: number, fieldName = 'Price'): string | null {
    if (typeof price !== 'number' || isNaN(price) || !isFinite(price)) {
      return `${fieldName} must be a valid finite number.`;
    }
    if (price <= 0) {
      return `${fieldName} must be strictly positive (cannot be zero or negative).`;
    }
    return null;
  },

  /**
   * Validates stop-loss distance (cannot be zero or sub-tick)
   */
  validateStopDistance(entryPrice: number, stopLossPrice: number, tickSize: number): string | null {
    if (entryPrice <= 0 || stopLossPrice <= 0) {
      return 'Entry and stop-loss prices must be positive.';
    }
    const distance = Math.abs(entryPrice - stopLossPrice);
    if (distance === 0) {
      return 'Stop distance cannot be zero (stop loss price equals entry price).';
    }
    if (distance < tickSize * 0.99) {
      return `Stop distance (${distance.toFixed(6)}) is smaller than the minimum instrument tick size (${tickSize}).`;
    }
    return null;
  },

  /**
   * Validates lot size against instrument specifications
   */
  validateLotSize(lotSize: number, spec: InstrumentSpec): string | null {
    if (typeof lotSize !== 'number' || isNaN(lotSize) || !isFinite(lotSize)) {
      return 'Lot size must be a valid number.';
    }
    if (lotSize <= 0) {
      return 'Lot size must be strictly positive.';
    }
    if (lotSize < spec.volumeMin) {
      return `Lot size (${lotSize}) is below minimum allowed volume (${spec.volumeMin}) for ${spec.symbol}.`;
    }
    if (lotSize > spec.volumeMax) {
      return `Lot size (${lotSize}) exceeds maximum allowed volume (${spec.volumeMax}) for ${spec.symbol}.`;
    }
    // Check volume step alignment
    const steps = lotSize / spec.volumeStep;
    const roundedSteps = Math.round(steps);
    if (Math.abs(steps - roundedSteps) > 1e-4) {
      return `Lot size (${lotSize}) must be an increment of step size (${spec.volumeStep}).`;
    }
    return null;
  },

  /**
   * Validates an instrument specification contract
   */
  validateContractSpec(spec: InstrumentSpec | undefined, symbol: string): string | null {
    if (!spec) {
      return `Unsupported instrument symbol: "${symbol}". Please register specification or select a supported instrument.`;
    }
    if (spec.contractSize <= 0 || !isFinite(spec.contractSize)) {
      return `Invalid contract specification: contract size (${spec.contractSize}) must be strictly positive.`;
    }
    if (spec.tickSize <= 0 || !isFinite(spec.tickSize)) {
      return `Invalid contract specification: tick size (${spec.tickSize}) must be strictly positive.`;
    }
    if (spec.pipSize <= 0 || !isFinite(spec.pipSize)) {
      return `Invalid contract specification: pip size (${spec.pipSize}) must be strictly positive.`;
    }
    if (spec.volumeMin <= 0 || spec.volumeMax < spec.volumeMin || spec.volumeStep <= 0) {
      return `Invalid contract specification: volume constraints are malformed (min: ${spec.volumeMin}, max: ${spec.volumeMax}, step: ${spec.volumeStep}).`;
    }
    return null;
  },

  /**
   * Validates risk percentage
   */
  validateRiskPercent(riskPercent: number): string | null {
    if (typeof riskPercent !== 'number' || isNaN(riskPercent) || !isFinite(riskPercent)) {
      return 'Risk percentage must be a valid number.';
    }
    if (riskPercent <= 0) {
      return 'Risk percentage must be strictly greater than 0%.';
    }
    if (riskPercent > 100) {
      return 'Impossible risk percentage: risk cannot exceed 100% of account balance.';
    }
    return null;
  },

  /**
   * Validates account balance
   */
  validateAccountBalance(balance: number): string | null {
    if (typeof balance !== 'number' || isNaN(balance) || !isFinite(balance)) {
      return 'Account balance must be a valid number.';
    }
    if (balance <= 0) {
      return 'Account balance must be strictly positive (cannot be zero or negative).';
    }
    return null;
  },

  /**
   * Comprehensive validation for position sizing calculations
   */
  validatePositionSizeInputs(params: {
    symbol: string;
    spec: InstrumentSpec | undefined;
    balance: number;
    riskPercent: number;
    entryPrice: number;
    stopLossPrice: number;
  }): ValidationResult {
    const errors: string[] = [];

    const specError = this.validateContractSpec(params.spec, params.symbol);
    if (specError) errors.push(specError);

    const balanceError = this.validateAccountBalance(params.balance);
    if (balanceError) errors.push(balanceError);

    const riskError = this.validateRiskPercent(params.riskPercent);
    if (riskError) errors.push(riskError);

    const entryError = this.validatePrice(params.entryPrice, 'Entry Price');
    if (entryError) errors.push(entryError);

    const slError = this.validatePrice(params.stopLossPrice, 'Stop Loss Price');
    if (slError) errors.push(slError);

    if (!entryError && !slError && params.spec) {
      const stopDistanceError = this.validateStopDistance(params.entryPrice, params.stopLossPrice, params.spec.tickSize);
      if (stopDistanceError) errors.push(stopDistanceError);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Comprehensive validation for PnL calculations
   */
  validatePnlInputs(params: {
    symbol: string;
    spec: InstrumentSpec | undefined;
    entryPrice: number;
    exitPrice: number;
    lotSize: number;
  }): ValidationResult {
    const errors: string[] = [];

    const specError = this.validateContractSpec(params.spec, params.symbol);
    if (specError) errors.push(specError);

    const entryError = this.validatePrice(params.entryPrice, 'Entry Price');
    if (entryError) errors.push(entryError);

    const exitError = this.validatePrice(params.exitPrice, 'Exit Price');
    if (exitError) errors.push(exitError);

    if (params.spec) {
      const lotError = this.validateLotSize(params.lotSize, params.spec);
      if (lotError) errors.push(lotError);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};
