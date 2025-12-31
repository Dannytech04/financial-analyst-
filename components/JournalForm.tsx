
import React, { useState, useEffect } from 'react';
import { Trade, TradeType, TradeStatus, TradingSession } from '../types';

interface JournalFormProps {
  onAddTrade: (trade: Trade) => void;
}

const JournalForm: React.FC<JournalFormProps> = ({ onAddTrade }) => {
  const [pair, setPair] = useState('EURUSD');
  const [type, setType] = useState<TradeType>(TradeType.BUY);
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [lots, setLots] = useState('0.1');
  const [session, setSession] = useState<TradingSession>(TradingSession.LONDON);
  const [notes, setNotes] = useState('');
  
  // Risk Calculator State
  const [riskPercent, setRiskPercent] = useState('1');
  const [stopLossPips, setStopLossPips] = useState('20');
  const [accountBalance, setAccountBalance] = useState('10000');
  const [calculatedLots, setCalculatedLots] = useState(0);

  useEffect(() => {
    const bal = parseFloat(accountBalance);
    const risk = parseFloat(riskPercent) / 100;
    const pips = parseFloat(stopLossPips);
    if (bal && risk && pips) {
      // Standard calculation: (Balance * Risk%) / (Pips * PipValueFor1Lot)
      // Assuming standard lot pip value is $10 for majors
      const lotSize = (bal * risk) / (pips * 10);
      setCalculatedLots(Number(lotSize.toFixed(2)));
    }
  }, [riskPercent, stopLossPips, accountBalance]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entryPrice = parseFloat(entry);
    const exitPrice = parseFloat(exit);
    const lotSize = parseFloat(lots);

    const pnl = type === TradeType.BUY 
      ? (exitPrice - entryPrice) * lotSize * 100000 
      : (entryPrice - exitPrice) * lotSize * 100000;

    const newTrade: Trade = {
      id: crypto.randomUUID(),
      pair: pair.toUpperCase(),
      type, entryPrice, exitPrice, lotSize, pnl, session,
      status: pnl > 0 ? TradeStatus.WIN : pnl < 0 ? TradeStatus.LOSS : TradeStatus.BREAK_EVEN,
      timestamp: Date.now(),
      notes,
      riskPercent: parseFloat(riskPercent)
    };

    onAddTrade(newTrade);
    setEntry(''); setExit(''); setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
          <h4 className="font-bold text-sm uppercase tracking-widest">Risk Calculator</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Risk %</label>
            <input type="number" value={riskPercent} onChange={e => setRiskPercent(e.target.value)} className="w-full bg-slate-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">SL Pips</label>
            <input type="number" value={stopLossPips} onChange={e => setStopLossPips(e.target.value)} className="w-full bg-slate-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase">Balance</label>
            <input type="number" value={accountBalance} onChange={e => setAccountBalance(e.target.value)} className="w-full bg-slate-800 border-none rounded-lg p-2 text-sm focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div className="flex flex-col justify-end">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-2 text-center">
               <p className="text-[8px] text-emerald-500 font-bold uppercase">Recommended Lots</p>
               <p className="text-emerald-400 font-mono font-bold">{calculatedLots}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <h3 className="text-lg font-bold mb-6">Log Closed Trade</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pair</label>
            <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20" placeholder="EURUSD" value={pair} onChange={(e) => setPair(e.target.value)} required />
          </div>
          
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Side</label>
            <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setType(TradeType.BUY)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${type === TradeType.BUY ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>BUY</button>
              <button type="button" onClick={() => setType(TradeType.SELL)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${type === TradeType.SELL ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}>SELL</button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Entry Price</label>
            <input type="number" step="0.00001" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20" value={entry} onChange={(e) => setEntry(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Exit Price</label>
            <input type="number" step="0.00001" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500/20" value={exit} onChange={(e) => setExit(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lots Used</label>
            <input type="number" step="0.01" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm font-mono" value={lots} onChange={(e) => setLots(e.target.value)} required />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Trading Session</label>
            <select 
              value={session} 
              onChange={(e) => setSession(e.target.value as TradingSession)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
            >
              <option value={TradingSession.LONDON}>London</option>
              <option value={TradingSession.NEW_YORK}>New York</option>
              <option value={TradingSession.ASIAN}>Asian</option>
              <option value={TradingSession.OVERLAP}>Overlap</option>
            </select>
          </div>

          <div className="space-y-1.5 lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Psychology & Notes</label>
            <input type="text" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm" placeholder="Fear of missing out? Following plan?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="md:col-span-4">
            <button type="submit" className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-2xl font-bold hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5">
              Confirm & Save Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JournalForm;
