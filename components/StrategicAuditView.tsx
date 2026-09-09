import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Trade, Toast, TradeAuditResult } from '@/types';
import { Gateway } from '@/services/geminiService';

interface StrategicAuditViewProps {
  user: User;
  trades: Trade[];
  isTierPro: boolean;
  addToast: (msg: string, type: Toast['type']) => void;
  setUser?: (user: User) => void;
}

export const StrategicAuditView: React.FC<StrategicAuditViewProps> = ({ user, trades, isTierPro, addToast }) => {
  const auditLimit = user.tier === 'ELITE' ? Infinity : user.tier === 'PRO' ? 20 : 2;
  const auditUsed = user.usageCount?.audit ?? 0;
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [auditResult, setAuditResult] = useState<TradeAuditResult | string | null>(null);

  const isStructured = (r: any): r is TradeAuditResult => {
    return typeof r === 'object' && r !== null && 'summary' in r && 'strengths' in r;
  };

  return (
    <div className="space-y-10 pb-32 relative max-w-5xl mx-auto">
      <div className="neon-border bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 rounded-[3rem] p-10 md:p-14 overflow-hidden relative glass shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 dark:bg-violet-600/10 blur-[100px] rounded-full"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-600/10 dark:bg-violet-600/20 border border-violet-500/20 rounded-lg mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-[0.3em]">
                Deep Reasoning (Gemini 3.1 Pro Thinking)
              </span>
            </div>
            <h3 className="text-4xl md:text-5xl font-black mb-6 italic tracking-tighter text-slate-800 dark:text-white leading-tight">
              Performance Audit
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm tracking-tight leading-relaxed max-w-xl opacity-80">
              Analyze your trade history using deep reasoning heuristics to discover recurring psychological patterns, execution leakage, and statistical edge.
            </p>
            <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {user.tier} plan · Audit usage: {auditUsed}/{auditLimit === Infinity ? 'Unlimited' : auditLimit}
            </p>
          </div>
          <button 
            onClick={async () => {
              if (trades.length === 0) return;
              setIsAnalyzing(true);
              addToast('Initiating deep strategy audit...', 'info');
              try {
                const res = await Gateway.deepAudit(trades);
                setAuditResult(res);
                addToast('Strategy audit complete.', 'success');
              } catch (e: unknown) {
                const error = e as Error;
                addToast(error.message, 'error');
              } finally {
                setIsAnalyzing(false);
              }
            }}
            disabled={isAnalyzing || trades.length === 0}
            className={`px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.4em] transition-all relative overflow-hidden group shadow-2xl ${
              isAnalyzing ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 active:scale-95'
            }`}
          >
            {isAnalyzing ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"></div>
                Deep Reasoning...
              </div>
            ) : 'Analyze Data'}
            <div className="absolute inset-0 bg-violet-600 opacity-0 group-hover:opacity-10 transition-opacity"></div>
          </button>
        </div>
      </div>

      <div className={`neon-border rounded-[3rem] bg-white/40 dark:bg-slate-950/40 glass p-10 md:p-14 min-h-[600px] shadow-sm flex flex-col ${
        !isTierPro ? 'opacity-20 pointer-events-none grayscale' : ''
      }`}>
        <div className="flex items-center justify-between mb-10 border-b border-slate-100 dark:border-white/5 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-center text-violet-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <h4 className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-500 italic">Structured Audit Log</h4>
          </div>
          {isStructured(auditResult) && (
            <span className="text-[9px] font-bold px-3 py-1 bg-violet-500/10 text-violet-500 rounded-full uppercase tracking-wider">
              {trades.length} Trades Evaluated
            </span>
          )}
        </div>
        
        {auditResult ? (
          typeof auditResult === 'string' ? (
            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 font-medium text-sm leading-[1.8] tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="whitespace-pre-wrap">{auditResult}</div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 text-slate-800 dark:text-slate-200">
              {/* Executive Summary */}
              <div className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200/80 dark:border-slate-800">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-violet-500 block mb-2">Executive Strategic Synthesis</span>
                <p className="text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-200">{auditResult.summary}</p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-emerald-500/5 rounded-3xl border border-emerald-500/20">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-500 block mb-3">System Strengths</span>
                  <ul className="space-y-2">
                    {auditResult.strengths?.map((s, idx) => (
                      <li key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/20">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-amber-500 block mb-3">System Vulnerabilities</span>
                  <ul className="space-y-2">
                    {auditResult.weaknesses?.map((w, idx) => (
                      <li key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-amber-500 font-bold">•</span>
                        <span>{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Execution & Risk Issues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-rose-500/5 rounded-3xl border border-rose-500/20">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-rose-500 block mb-3">Execution & Timing Issues</span>
                  <ul className="space-y-2">
                    {auditResult.executionIssues?.map((e, idx) => (
                      <li key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-6 bg-purple-500/5 rounded-3xl border border-purple-500/20">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-purple-500 block mb-3">Risk & Exposure Issues</span>
                  <ul className="space-y-2">
                    {auditResult.riskIssues?.map((r, idx) => (
                      <li key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-purple-500 font-bold">•</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recurring Patterns */}
              {auditResult.recurringPatterns && auditResult.recurringPatterns.length > 0 && (
                <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/20">
                  <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-500 block mb-3">Recurring Behavioral Patterns</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {auditResult.recurringPatterns.map((p, idx) => (
                      <div key={idx} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-start gap-2">
                        <span className="text-blue-500 font-bold">↳</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Improvement Areas */}
              <div className="p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/20">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-cyan-500 block mb-3">Actionable Strategic Rules</span>
                <ol className="space-y-2 list-decimal list-inside">
                  {auditResult.improvementAreas?.map((imp, idx) => (
                    <li key={idx} className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <span>{imp}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Uncertainty Disclaimer */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <p className="text-[9px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                  {auditResult.disclaimer || 'Probabilistic diagnosis based on historical trade distribution. Past execution patterns are subject to statistical variance and do not guarantee future performance.'}
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-20 group">
            <div className="w-24 h-24 border border-dashed border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center mb-8 group-hover:border-violet-500/50 transition-colors">
              <svg className="w-10 h-10 text-slate-400 group-hover:text-violet-500/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <p className="font-black text-[10px] uppercase tracking-[0.6em] mb-2 text-slate-600 dark:text-slate-400">Awaiting Deep Audit</p>
            <p className="text-[9px] font-bold text-slate-400 max-w-xs uppercase leading-relaxed">Run the performance audit to compute high-order trade reasoning.</p>
          </div>
        )}
      </div>

      {!isTierPro && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6">
          <div className="glass neon-border p-12 rounded-[3rem] text-center max-w-md shadow-2xl border-white/10 transition-colors">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 border border-violet-500 rounded-3xl flex items-center justify-center mx-auto mb-10 neon-glow">
              <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-3xl font-black text-slate-800 dark:text-white italic tracking-tighter uppercase mb-4">Locked Feature</h3>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed mb-10">Advanced performance audits require a Pro or Elite membership.</p>
            <Link to="/billing" className="block w-full py-5 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-[0.4em] rounded-2xl shadow-xl hover:neon-glow transition-all">Upgrade Plan</Link>
          </div>
        </div>
      )}
    </div>
  );
};
