
import React, { useState } from 'react';
import { TradeType, TradeStatus, Trade, TradingSession } from '../types';
import { getHistoricalContext, simulateBacktestResult } from '../services/geminiService';

interface BacktestSimulatorProps {
  onCommitTrade: (trade: Trade) => void;
}

const BacktestSimulator: React.FC<BacktestSimulatorProps> = ({ onCommitTrade }) => {
  const [pair, setPair] = useState('EURUSD');
  const [date, setDate] = useState('');
  const [type, setType] = useState<TradeType>(TradeType.BUY);
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [lots, setLots] = useState('0.1');

  const [loadingContext, setLoadingContext] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [context, setContext] = useState<string | null>(null);
  const [result, setResult] = useState<{ outcome: string; playByPlay: string; realizedPrice: number } | null>(null);

  const handleFetchContext = async () => {
    if (!pair || !date) return;
    setLoadingContext(true);
    setResult(null);
    try {
      const data = await getHistoricalContext(pair, date);
      setContext(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingContext(false);
    }
  };

  const handleSimulate = async () => {
    if (!context || !entry || !sl || !tp) return;
    setSimulating(true);
    try {
      const simResult = await simulateBacktestResult({
        pair, date, type, 
        entry: parseFloat(entry), 
        sl: parseFloat(sl), 
        tp: parseFloat(tp), 
        context
      });
      setResult(simResult);
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const handleCommit = () => {
    if (!result) return;
    
    const entryPrice = parseFloat(entry);
    const exitPrice = result.realizedPrice;
    const lotSize = parseFloat(lots);
    
    const pnl = type === TradeType.BUY 
      ? (exitPrice - entryPrice) * lotSize * 100000 
      : (entryPrice - exitPrice) * lotSize * 100000;

    const newTrade: Trade = {
      id: crypto.randomUUID(),
      pair: pair.toUpperCase(),
      type,
      entryPrice,
      exitPrice,
      lotSize,
      pnl,
      session: TradingSession.LONDON,
      status: result.outcome as TradeStatus,
      timestamp: new Date(date).getTime(),
      notes: `Backtest Sim: ${result.playByPlay}`
    };

    onCommitTrade(newTrade);
    setResult(null);
    setContext(null);
    setEntry('');
    setSl('');
    setTp('');
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Left: Setup */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm transition-colors duration-300">
          <h3 className="text-sm md:text-base text-slate-800 dark:text-slate-100 font-bold mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            Lab Setup
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pair</label>
                <input 
                  type="text" 
                  value={pair} 
                  onChange={(e) => setPair(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 md:py-2 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Date</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 md:py-2 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all cursor-pointer"
                />
              </div>
            </div>

            <button 
              onClick={handleFetchContext}
              disabled={loadingContext || !date}
              className="w-full py-3 md:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              {loadingContext ? <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Get Historical Snapshot'}
            </button>

            {context && (
              <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Side</label>
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                      <button onClick={() => setType(TradeType.BUY)} className={`flex-1 py-2 text-xs font-bold rounded ${type === TradeType.BUY ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>BUY</button>
                      <button onClick={() => setType(TradeType.SELL)} className={`flex-1 py-2 text-xs font-bold rounded ${type === TradeType.SELL ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400'}`}>SELL</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Entry</label>
                    <input type="number" step="0.0001" value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="0.0000" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-100 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Lots</label>
                    <input type="number" step="0.01" value={lots} onChange={(e) => setLots(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-800 dark:text-slate-100 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-rose-500">Stop Loss</label>
                    <input type="number" step="0.0001" value={sl} onChange={(e) => setSl(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-rose-200 dark:border-rose-900 rounded-lg px-4 py-3 text-sm text-rose-600 dark:text-rose-400 font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-emerald-500">Take Profit</label>
                    <input type="number" step="0.0001" value={tp} onChange={(e) => setTp(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900 rounded-lg px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400 font-mono" />
                  </div>
                </div>
                <button 
                  onClick={handleSimulate}
                  disabled={simulating || !entry || !sl || !tp}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {simulating ? 'Replaying History...' : 'Simulate Results'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Results / Output */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 min-h-[300px] md:min-h-[500px] flex flex-col shadow-sm transition-colors duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm md:text-base text-slate-800 dark:text-slate-100 font-bold flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Replay Monitor
            </h3>
            {context && !result && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 animate-pulse">ENVIRONMENT READY</span>}
          </div>

          <div className="flex-1 space-y-6">
            {!context && !loadingContext && (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 md:p-10 opacity-30">
                <svg className="w-12 h-12 md:w-16 md:h-16 mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400">Reconstruct the environment to begin replay.</p>
              </div>
            )}

            {context && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2">Market Backdrop</p>
                <div className="text-[11px] md:text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-h-[120px] md:max-h-[180px] overflow-y-auto">
                  {context}
                </div>
              </div>
            )}

            {result && (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <div className={`p-6 md:p-8 rounded-xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                  result.outcome === 'WIN' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30' : 
                  result.outcome === 'LOSS' ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' : 
                  'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                }`}>
                  <span className={`text-3xl md:text-4xl font-black mb-1 transition-colors ${
                    result.outcome === 'WIN' ? 'text-emerald-600 dark:text-emerald-400' : 
                    result.outcome === 'LOSS' ? 'text-rose-600 dark:text-rose-400' : 
                    'text-slate-500 dark:text-slate-400'
                  }`}>
                    {result.outcome}
                  </span>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trade Result</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-2 tracking-widest">Narrative</p>
                  <p className="text-xs md:text-sm text-slate-700 dark:text-slate-200 italic leading-relaxed">
                    "{result.playByPlay}"
                  </p>
                </div>

                <button 
                  onClick={handleCommit}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20"
                >
                  Commit to Live Journal
                </button>
              </div>
            )}

            {simulating && (
              <div className="h-full flex flex-col items-center justify-center space-y-4 py-16">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Synthesizing Replay...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BacktestSimulator;
