import React from 'react';
import { Trade } from '@/types';
import JournalForm from './JournalForm';

interface JournalViewProps {
  trades: Trade[];
  onAddTrade: (t: Trade) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ trades, onAddTrade }) => {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-10 pb-32">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-12">
          <JournalForm onAddTrade={onAddTrade} />
        </div>
        
        <div className="xl:col-span-12">
          <div className="neon-border rounded-[2.5rem] bg-white dark:bg-slate-900/40 glass overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
              <h3 className="text-lg font-black uppercase tracking-tighter italic text-slate-800 dark:text-white">Trade History</h3>
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Entries: {trades.length}</span>
                <div className="h-4 w-px bg-slate-200 dark:bg-white/10"></div>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              </div>
            </div>

            {/* Responsive Table/Cards */}
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {/* Desktop View Table */}
                <table className="hidden md:table w-full text-left text-sm whitespace-nowrap">
                  <thead className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 dark:bg-slate-950/30">
                    <tr>
                      <th className="px-8 py-5">Asset</th>
                      <th className="px-8 py-5">Side</th>
                      <th className="px-8 py-5">Entry/Exit</th>
                      <th className="px-8 py-5">Lot Size</th>
                      <th className="px-8 py-5 text-right">Net Profit/Loss</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {trades.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-32 text-center text-slate-400 italic font-bold uppercase text-[10px] tracking-[0.4em] opacity-40">No records found</td>
                      </tr>
                    ) : trades.map(t => (
                      <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-violet-600/5 transition-all">
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black italic text-lg text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors tracking-tighter">{t.pair}</span>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{new Date(t.timestamp).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-4 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${t.type === 'BUY' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 border-rose-200 dark:bg-rose-500/5 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>{t.type}</span>
                        </td>
                        <td className="px-8 py-6 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-2">
                            <span>{t.entryPrice.toFixed(5)}</span>
                            <svg className="w-3 h-3 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                            <span className="text-slate-800 dark:text-white">{t.exitPrice?.toFixed(5)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-400">{t.lotSize}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">{t.session} Session</span>
                          </div>
                        </td>
                        <td className={`px-8 py-6 text-right font-mono font-black italic text-xl ${t.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {t.pnl >= 0 ? '+' : '-'}${Math.abs(t.pnl).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View Cards */}
                <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                  {trades.length === 0 ? (
                    <div className="py-20 text-center text-slate-400 uppercase font-black tracking-widest italic opacity-40 text-[10px]">No records found</div>
                  ) : trades.map(t => (
                    <div key={t.id} className="p-6 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col">
                          <h4 className="text-xl font-black italic text-slate-800 dark:text-white tracking-tighter">{t.pair}</h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{new Date(t.timestamp).toLocaleDateString()}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${t.type === 'BUY' ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/5 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 border-rose-100 dark:bg-rose-500/5 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>{t.type}</span>
                      </div>
                      <div className="flex justify-between items-end border-t border-slate-100 dark:border-white/5 pt-4 mt-2">
                        <div className="flex flex-col gap-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Execution</p>
                          <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400">{t.entryPrice.toFixed(4)} → {t.exitPrice?.toFixed(4)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Result</p>
                          <p className={`font-mono font-black text-xl italic ${t.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {t.pnl >= 0 ? '+' : '-'}${Math.abs(t.pnl).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
