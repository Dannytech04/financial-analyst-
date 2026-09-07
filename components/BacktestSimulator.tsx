
import React, { useState, useMemo, useCallback } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { StrategyParams, SimulationResult, SimulationStep } from '@/types';

interface BacktestSimulatorProps {
  onCommitTrade?: (trade: unknown) => void;
}

interface StatMetric {
  label: string;
  value: string;
  color: string;
}

const BacktestSimulator: React.FC<BacktestSimulatorProps> = () => {
  const [params, setParams] = useState<StrategyParams>({
    initialCapital: 10000,
    riskPerTrade: 1,
    winRate: 50,
    rewardToRisk: 2,
    totalTrades: 100
  });

  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const runSimulation = useCallback((): void => {
    setIsSimulating(true);
    
    // Artificial delay to mimic institutional compute
    setTimeout(() => {
      const { initialCapital, riskPerTrade, winRate, rewardToRisk, totalTrades } = params;
      const steps: SimulationStep[] = [];
      let currentEquity = initialCapital;
      let peakEquity = initialCapital;
      let maxDrawdown = 0;
      let wins = 0;
      let totalWinAmt = 0;
      let totalLossAmt = 0;

      // Seed step
      steps.push({ tradeIndex: 0, equity: initialCapital, pnl: 0, isWin: false });

      for (let i = 1; i <= totalTrades; i++) {
        const isWin = Math.random() * 100 < winRate;
        const riskAmount = currentEquity * (riskPerTrade / 100);
        let pnl = 0;

        if (isWin) {
          pnl = riskAmount * rewardToRisk;
          wins++;
          totalWinAmt += pnl;
        } else {
          pnl = -riskAmount;
          totalLossAmt += Math.abs(pnl);
        }

        currentEquity += pnl;
        
        // Track Peak and Drawdown
        if (currentEquity > peakEquity) {
          peakEquity = currentEquity;
        }
        const drawdown = peakEquity === 0 ? 0 : ((peakEquity - currentEquity) / peakEquity) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }

        steps.push({
          tradeIndex: i,
          equity: Number(currentEquity.toFixed(2)),
          pnl: Number(pnl.toFixed(2)),
          isWin
        });
      }

      const winRateActual = (wins / totalTrades) * 100;
      const expectancy = ((winRate / 100) * rewardToRisk) - ((1 - winRate / 100) * 1);
      const profitFactor = totalLossAmt === 0 ? totalWinAmt : totalWinAmt / totalLossAmt;

      setSimulation({
        steps,
        finalEquity: currentEquity,
        totalPnl: currentEquity - initialCapital,
        winRateActual,
        maxDrawdown,
        expectancy,
        profitFactor
      });
      setIsSimulating(false);
    }, 800);
  }, [params]);

  const stats: StatMetric[] | null = useMemo(() => {
    if (!simulation) return null;
    return [
      { label: 'Final Equity', value: `$${simulation.finalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: 'text-violet-600' },
      { label: 'Total Return', value: `${((simulation.totalPnl / params.initialCapital) * 100).toFixed(2)}%`, color: simulation.totalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500' },
      { label: 'Max Drawdown', value: `${simulation.maxDrawdown.toFixed(2)}%`, color: 'text-rose-500' },
      { label: 'Expectancy (R)', value: `${simulation.expectancy.toFixed(2)}R`, color: simulation.expectancy > 0 ? 'text-violet-500' : 'text-slate-400' },
      { label: 'Profit Factor', value: simulation.profitFactor.toFixed(2), color: simulation.profitFactor > 1.5 ? 'text-emerald-500' : 'text-slate-500' },
      { label: 'Actual Win Rate', value: `${simulation.winRateActual.toFixed(1)}%`, color: 'text-slate-600' },
    ];
  }, [simulation, params.initialCapital]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-1">Strategy Lab</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-80">Monte Carlo Simulation & Risk Intelligence</p>
          </div>
          <button 
            onClick={runSimulation}
            disabled={isSimulating}
            className="w-full md:w-auto px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-violet-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSimulating ? 'Computing Iterations...' : 'Initialize Simulation'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mt-10">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Initial Capital</label>
            <input 
              type="number" 
              value={params.initialCapital} 
              onChange={e => setParams({...params, initialCapital: Number(e.target.value)})}
              className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Risk % / Trade</label>
            <input 
              type="number" 
              value={params.riskPerTrade} 
              onChange={e => setParams({...params, riskPerTrade: Number(e.target.value)})}
              className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Win Rate %</label>
            <input 
              type="number" 
              value={params.winRate} 
              onChange={e => setParams({...params, winRate: Number(e.target.value)})}
              className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">R:R Ratio</label>
            <input 
              type="number" 
              step="0.1"
              value={params.rewardToRisk} 
              onChange={e => setParams({...params, rewardToRisk: Number(e.target.value)})}
              className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sample Size</label>
            <input 
              type="number" 
              value={params.totalTrades} 
              onChange={e => setParams({...params, totalTrades: Number(e.target.value)})}
              className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>
      </div>

      {simulation ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8">Equity Projection</h4>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulation.steps}>
                  <defs>
                    <linearGradient id="simPnl" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                  <XAxis dataKey="tradeIndex" hide />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v: number) => `$${(v/1000).toFixed(1)}k`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', color: '#f8fafc' }}
                    itemStyle={{ color: '#8b5cf6' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#8b5cf6" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#simPnl)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm h-full">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-8">Audit Metrics</h4>
              <div className="grid grid-cols-1 gap-6">
                {stats?.map((stat, i) => (
                  <div key={i} className="flex justify-between items-end border-b border-slate-50 dark:border-slate-800 pb-4 last:border-0">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                    <span className={`text-xl font-mono font-black ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
              
              <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                <p className="text-[10px] font-black uppercase text-violet-600 mb-2 tracking-[0.2em]">Alpha Verdict</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium italic">
                  {simulation.expectancy > 0 
                    ? `Positive expectancy detected. This strategy models a sustainable long-term edge with a profit factor of ${simulation.profitFactor.toFixed(2)}.`
                    : "Negative expectancy modeled. Continuing this strategy without refinement may lead to terminal capital depletion."}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-20 flex flex-col items-center justify-center text-center opacity-40">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
          </div>
          <h4 className="text-sm font-black uppercase tracking-widest mb-2">Awaiting Parameters</h4>
          <p className="text-xs font-medium max-w-xs">Define your strategy edge variables to initialize the Monte Carlo projection engine.</p>
        </div>
      )}
    </div>
  );
};

export default BacktestSimulator;
