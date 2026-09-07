import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Trade, WidgetConfig, UserGoals, DashboardStats } from '@/types';
import { KPIPulseCard } from './KPIPulseCard';
import MarketAnalysisView from './MarketAnalysisView';
import { analyticsService } from '@/services/analyticsService';

interface DashboardProps {
  trades: Trade[];
  layout: WidgetConfig[];
  goals: UserGoals;
}

export const Dashboard: React.FC<DashboardProps> = ({ trades, layout, goals }) => {
  const stats: DashboardStats = useMemo(() => {
    return analyticsService.calculateStats(trades);
  }, [trades]);

  const chartData = useMemo(() => {
    return analyticsService.calculateEquityCurve(trades);
  }, [trades]);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-1000">
      {layout.filter(w => w.visible).map(widget => (
        <React.Fragment key={widget.id}>
          {widget.id === 'goals' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPIPulseCard 
                label="Monthly Profit" 
                value={`$${stats.totalPnl.toLocaleString()}`} 
                target={`Goal: $${goals.monthlyProfitTarget}`}
                progress={(stats.totalPnl / goals.monthlyProfitTarget) * 100} 
                color="violet"
              />
              <KPIPulseCard 
                label="Win Rate" 
                value={`${stats.winRate.toFixed(1)}%`} 
                target={`Goal: ${goals.winRateTarget}%`}
                progress={(stats.winRate / goals.winRateTarget) * 100} 
                color="emerald"
              />
              <KPIPulseCard 
                label="Activity" 
                value={`${stats.total}`} 
                target={`Target: ${goals.tradesPerMonthTarget}`}
                progress={(stats.total / goals.tradesPerMonthTarget) * 100} 
                color="pink"
              />
            </div>
          )}

          {widget.id === 'equity' && (
            <div className="neon-border rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 glass overflow-hidden shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                  <h3 className="text-xl font-black uppercase tracking-tighter italic text-slate-800 dark:text-white">Equity Curve</h3>
                  <p className="text-[9px] font-black tracking-[0.3em] text-slate-500 uppercase mt-1">Real-time Balance Progress</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 font-mono text-xs">
                  PNL: {stats.totalPnl >= 0 ? '+' : ''}${stats.totalPnl.toFixed(2)}
                </div>
              </div>
              <div className="h-[380px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
                    <XAxis dataKey="trade" hide />
                    <YAxis stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v/1000).toFixed(1)}k`} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', color: '#1e293b' }}
                      itemStyle={{ color: '#8b5cf6', fontSize: '12px', fontWeight: 'bold' }}
                      labelStyle={{ color: '#64748b', fontSize: '10px' }}
                      cursor={{ stroke: '#8b5cf6', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="pnl" stroke="#8b5cf6" fillOpacity={1} fill="url(#pnlGrad)" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4, stroke: '#fff' }} activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2, fill: '#fff' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {widget.id === 'distribution' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="neon-border rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 glass flex flex-col items-center shadow-sm">
                <h3 className="text-lg font-black uppercase tracking-tighter italic text-slate-800 dark:text-white self-start mb-10">Trade Outcomes</h3>
                {stats.total > 0 ? (
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={stats.distributionData as any[]} 
                          cx="50%" cy="50%" 
                          innerRadius={70} outerRadius={105} 
                          paddingAngle={10} dataKey="value" stroke="none"
                          className="drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                        >
                          {stats.distributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em]">Awaiting Data</p>
                  </div>
                )}
              </div>

              <div className="neon-border rounded-[2.5rem] bg-white dark:bg-slate-900/40 p-8 glass overflow-hidden shadow-sm">
                <h3 className="text-lg font-black uppercase tracking-tighter italic text-slate-800 dark:text-white mb-10">Timezone Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  {stats.sessionPerformance.map((s, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 p-6 rounded-3xl flex flex-col hover:border-violet-500/30 transition-all group">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3 group-hover:text-violet-500 transition-colors">{s.name}</p>
                      <div className="flex items-end justify-between">
                        <span className={`text-xl font-mono font-bold ${parseFloat(s.pnl + '') >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {parseFloat(s.pnl + '') >= 0 ? '+' : ''}${parseFloat(s.pnl + '').toFixed(0)}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase italic">{s.winRate}% Win</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {widget.id === 'market' && (
            <div className="animate-in fade-in duration-700">
              <MarketAnalysisView />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
