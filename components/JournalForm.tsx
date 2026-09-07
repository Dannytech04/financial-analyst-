
import React, { useState, useEffect } from 'react';
import { Trade, TradeType, TradeStatus, TradingSession } from '@/types';
import { 
  financialEngine, 
  getInstrumentSpec, 
  financialValidator, 
  normalizeSymbol, 
  InstrumentSpec 
} from '@/services/financialEngine';

interface JournalFormProps {
  onAddTrade: (trade: Trade) => void;
}

interface ValidationErrors {
  pair?: string;
  entry?: string;
  exit?: string;
  lots?: string;
  general?: string;
}

const JournalForm: React.FC<JournalFormProps> = ({ onAddTrade }) => {
  const [pair, setPair] = useState('EURUSD');
  const [type, setType] = useState<TradeType>(TradeType.BUY);
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [lots, setLots] = useState('0.1');
  const [session, setSession] = useState<TradingSession>(TradingSession.LONDON);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  
  // Risk Calculator State
  const [riskPercent, setRiskPercent] = useState('1');
  const [stopLossPips, setStopLossPips] = useState('20');
  const [accountBalance, setAccountBalance] = useState('100000');
  const [calculatedLots, setCalculatedLots] = useState(0);
  const [activeSpec, setActiveSpec] = useState<InstrumentSpec | undefined>(() => getInstrumentSpec('EURUSD'));
  const [engineDisclaimer, setEngineDisclaimer] = useState('');

  useEffect(() => {
    const cleanPair = normalizeSymbol(pair);
    const spec = getInstrumentSpec(cleanPair);
    setActiveSpec(spec);

    const bal = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent);
    const pips = parseFloat(stopLossPips);

    if (!spec) {
      setCalculatedLots(0);
      setEngineDisclaimer(`Unsupported symbol "${pair}". Select Forex, Metals, Indices, or Crypto.`);
      return;
    }

    if (!isNaN(bal) && !isNaN(risk) && !isNaN(pips) && pips > 0 && bal > 0 && risk > 0 && risk <= 100) {
      try {
        const stopDistance = pips * spec.pipSize;
        const refEntry = parseFloat(entry) > 0 ? parseFloat(entry) : 100.0;
        const refStopLoss = refEntry - stopDistance;

        const result = financialEngine.calculatePositionSize({
          symbol: spec.symbol,
          accountBalance: bal,
          riskPercent: risk,
          entryPrice: refEntry,
          stopLossPrice: refStopLoss,
          accountCurrency: 'USD',
          customSpec: spec
        });

        setCalculatedLots(result.recommendedLots);
        setEngineDisclaimer(result.disclaimer);
      } catch (err: unknown) {
        setCalculatedLots(0);
        const errMsg = err instanceof Error ? err.message : 'Error calculating position size';
        setEngineDisclaimer(errMsg);
      }
    } else {
      setCalculatedLots(0);
      setEngineDisclaimer('');
    }
  }, [pair, riskPercent, stopLossPips, accountBalance, entry]);

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {};
    const cleanPair = normalizeSymbol(pair);
    const spec = getInstrumentSpec(cleanPair);
    const entryNum = parseFloat(entry);
    const exitNum = parseFloat(exit);
    const lotNum = parseFloat(lots);

    if (!pair.trim()) {
      newErrors.pair = "Asset name required";
    } else if (!spec) {
      newErrors.pair = `Unsupported symbol "${pair}". Supported: EURUSD, GBPUSD, USDCHF, GBPJPY, XAUUSD, US30, SPX500, BTCUSD, etc.`;
    }

    const entryErr = financialValidator.validatePrice(entryNum, 'Entry price');
    if (entryErr) newErrors.entry = entryErr;

    const exitErr = financialValidator.validatePrice(exitNum, 'Exit price');
    if (exitErr) newErrors.exit = exitErr;

    if (!entryErr && !exitErr && entryNum === exitNum) {
      newErrors.exit = "Exit price must differ from entry price";
    }

    if (spec) {
      const lotErr = financialValidator.validateLotSize(lotNum, spec);
      if (lotErr) newErrors.lots = lotErr;
    } else {
      if (isNaN(lotNum) || lotNum <= 0) newErrors.lots = "Invalid lot size";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!validate()) return;

    const entryPrice = parseFloat(entry);
    const exitPrice = parseFloat(exit);
    const lotSize = parseFloat(lots);
    const cleanPair = normalizeSymbol(pair);

    try {
      const pnlResult = financialEngine.calculatePnL({
        symbol: cleanPair,
        tradeType: type === TradeType.BUY ? 'BUY' : 'SELL',
        entryPrice,
        exitPrice,
        lotSize,
        accountCurrency: 'USD'
      });

      const pnl = Number(pnlResult.pnl.toFixed(2));

      const newTrade: Trade = {
        id: crypto.randomUUID(),
        pair: cleanPair,
        type, 
        entryPrice, 
        exitPrice, 
        lotSize, 
        pnl, 
        session,
        status: pnl > 0 ? TradeStatus.WIN : pnl < 0 ? TradeStatus.LOSS : TradeStatus.BREAK_EVEN,
        timestamp: Date.now(),
        notes: notes.trim(),
        riskPercent: parseFloat(riskPercent) || 1
      };

      onAddTrade(newTrade);
      setEntry(''); 
      setExit(''); 
      setNotes('');
      setErrors({});
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Calculation error occurred';
      setErrors(prev => ({ ...prev, general: errMsg }));
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="neon-border bg-slate-900/40 rounded-[2.5rem] p-8 glass overflow-hidden flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="shrink-0 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center text-violet-400 neon-glow">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <div className="flex flex-col">
              <h4 className="font-black text-sm uppercase tracking-widest text-white">Risk Calculator</h4>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">
                {activeSpec ? `${activeSpec.assetClass} Position Sizing` : 'Position Sizing Tool'}
              </p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Risk (%)</label>
              <input type="number" step="0.1" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:ring-1 focus:ring-violet-500/50 outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Stop Loss (Pips)</label>
              <input type="number" value={stopLossPips} onChange={e => setStopLossPips(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:ring-1 focus:ring-violet-500/50 outline-none transition-all" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Account Balance</label>
              <input type="number" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:ring-1 focus:ring-violet-500/50 outline-none transition-all" />
            </div>
            <div className="flex items-end">
              <div className="w-full bg-violet-600/10 border border-violet-500/30 rounded-xl px-6 py-2.5 text-center flex flex-col group hover:bg-violet-600/20 transition-all">
                 <span className="text-[8px] text-violet-400 font-black uppercase tracking-[0.2em] mb-1">Recommended Lots</span>
                 <span className="text-sm font-mono font-black text-white group-hover:scale-110 transition-transform">{calculatedLots} LOTS</span>
              </div>
            </div>
          </div>
        </div>

        {activeSpec && (
          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
            <div className="flex items-center gap-4">
              <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 font-black uppercase tracking-wider text-[9px] border border-violet-500/20">
                {activeSpec.symbol} ({activeSpec.assetClass})
              </span>
              <span>Contract: {activeSpec.contractSize.toLocaleString()} {activeSpec.baseCurrency}</span>
              <span>Pip: {activeSpec.pipSize}</span>
              <span>Step: {activeSpec.volumeStep} (Min: {activeSpec.volumeMin})</span>
            </div>
            <span className="text-[9px] text-slate-600 italic">
              {engineDisclaimer || 'Standard market specification. Actual broker execution may include spread/rollover.'}
            </span>
          </div>
        )}
      </div>

      <div className="neon-border bg-slate-900/40 rounded-[2.5rem] p-8 md:p-10 glass shadow-sm">
        <h3 className="text-xl font-black text-white italic tracking-tighter uppercase mb-8 flex items-center gap-3">
          <span className="w-6 h-1 bg-violet-500 rounded-full"></span>
          New Journal Entry
        </h3>

        {errors.general && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-mono">
            {errors.general}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trading Pair</label>
              {activeSpec && (
                <span className="text-[8px] font-mono text-violet-400 uppercase tracking-widest">
                  {activeSpec.assetClass}
                </span>
              )}
            </div>
            <input 
              type="text" 
              className={`w-full bg-slate-950 border ${errors.pair ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-5 py-3.5 text-sm font-black text-white tracking-tighter focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-slate-800`} 
              placeholder="e.g. EURUSD, XAUUSD, US30, BTCUSD" 
              value={pair} 
              onChange={(e) => {setPair(e.target.value); if(errors.pair) setErrors({...errors, pair: undefined});}} 
            />
            {errors.pair && <p className="text-[9px] text-rose-500 font-black uppercase tracking-tight ml-1">{errors.pair}</p>}
          </div>
          
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Direction</label>
            <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-white/5">
              <button type="button" onClick={() => setType(TradeType.BUY)} className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] rounded-xl transition-all ${type === TradeType.BUY ? 'bg-emerald-600 text-white shadow-lg neon-glow' : 'text-slate-600 hover:text-slate-400'}`}>BUY</button>
              <button type="button" onClick={() => setType(TradeType.SELL)} className={`flex-1 py-2 text-[10px] font-black tracking-[0.2em] rounded-xl transition-all ${type === TradeType.SELL ? 'bg-rose-600 text-white shadow-lg neon-glow' : 'text-slate-600 hover:text-slate-400'}`}>SELL</button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Entry Price</label>
            <input 
              type="number" 
              step="0.00001" 
              className={`w-full bg-slate-950 border ${errors.entry ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-5 py-3.5 text-sm font-mono text-white focus:ring-1 focus:ring-violet-500/50 transition-all`} 
              placeholder="0.00000"
              value={entry} 
              onChange={(e) => {setEntry(e.target.value); if(errors.entry) setErrors({...errors, entry: undefined});}} 
            />
            {errors.entry && <p className="text-[9px] text-rose-500 font-black uppercase tracking-tight ml-1">{errors.entry}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Exit Price</label>
            <input 
              type="number" 
              step="0.00001" 
              className={`w-full bg-slate-950 border ${errors.exit ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-5 py-3.5 text-sm font-mono text-white focus:ring-1 focus:ring-violet-500/50 transition-all`} 
              placeholder="0.00000"
              value={exit} 
              onChange={(e) => {setExit(e.target.value); if(errors.exit) setErrors({...errors, exit: undefined});}} 
            />
            {errors.exit && <p className="text-[9px] text-rose-500 font-black uppercase tracking-tight ml-1">{errors.exit}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Lots</label>
            <input 
              type="number" 
              step="0.01" 
              className={`w-full bg-slate-950 border ${errors.lots ? 'border-rose-500/50' : 'border-white/5'} rounded-xl px-5 py-3.5 text-sm font-mono text-white focus:ring-1 focus:ring-violet-500/50 transition-all`} 
              value={lots} 
              onChange={(e) => {setLots(e.target.value); if(errors.lots) setErrors({...errors, lots: undefined});}} 
            />
             {errors.lots && <p className="text-[9px] text-rose-500 font-black uppercase tracking-tight ml-1">{errors.lots}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Session</label>
            <select 
              value={session} 
              onChange={(e) => setSession(e.target.value as TradingSession)}
              className="w-full bg-slate-950 border border-white/5 rounded-xl px-5 py-3.5 text-sm font-black text-white tracking-widest focus:ring-1 focus:ring-violet-500/50 outline-none transition-all appearance-none uppercase"
            >
              <option value={TradingSession.LONDON}>London</option>
              <option value={TradingSession.NEW_YORK}>New York</option>
              <option value={TradingSession.ASIAN}>Asian</option>
              <option value={TradingSession.OVERLAP}>Overlap</option>
            </select>
          </div>

          <div className="flex flex-col gap-2 lg:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Trade Notes</label>
            <input type="text" className="w-full bg-slate-950 border border-white/5 rounded-xl px-5 py-3.5 text-sm font-medium text-slate-300 placeholder:text-slate-800 focus:ring-1 focus:ring-violet-500/50 transition-all" placeholder="Reason for entry/exit..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="md:col-span-4 mt-4">
            <button type="submit" className="w-full bg-white text-slate-950 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.6em] hover:scale-[1.01] active:scale-[0.98] transition-all shadow-2xl hover:neon-glow group flex items-center justify-center gap-4">
              Save Trade
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JournalForm;
