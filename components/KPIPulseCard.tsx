import React from 'react';

interface KPIPulseCardProps {
  label: string;
  value: string;
  target: string;
  progress: number;
  color: 'violet' | 'emerald' | 'pink';
}

export const KPIPulseCard: React.FC<KPIPulseCardProps> = ({ label, value, target, progress, color }) => {
  const colorMap = {
    violet: 'from-violet-600 to-indigo-600 border-violet-500/30 text-violet-600 dark:text-violet-400',
    emerald: 'from-emerald-600 to-teal-600 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    pink: 'from-pink-600 to-rose-600 border-pink-500/30 text-pink-600 dark:text-pink-400'
  };

  return (
    <div className="neon-border bg-white dark:bg-slate-900/40 rounded-[2rem] p-8 glass flex flex-col justify-between h-48 group hover:scale-[1.02] transition-all duration-500 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{label}</p>
          <h4 className="text-3xl font-black italic tracking-tighter text-slate-800 dark:text-white mt-1">{value}</h4>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center justify-center ${colorMap[color].split(' ')[2]}`}>
          <svg className="w-5 h-5 animate-pulse-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
          <span>{target}</span>
          <span className="text-slate-800 dark:text-white">{Math.min(100, Math.max(0, progress)).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200 dark:border-white/5">
          <div 
            className={`h-full bg-gradient-to-r ${colorMap[color].split(' ').slice(0, 2).join(' ')} shadow-[0_0_10px_rgba(139,92,246,0.2)] transition-all duration-1000`} 
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      </div>
    </div>
  );
};
