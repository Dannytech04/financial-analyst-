
import React, { useEffect, useState } from 'react';
import { getMarketNews } from '../services/geminiService';

const COMMON_PAIRS = ['Major Pairs', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'GBPJPY', 'EURJPY', 'Gold (XAUUSD)'];

const MarketAnalysisView: React.FC = () => {
  const [news, setNews] = useState<{ text: string; sources: { title: string; uri: string }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPair, setSelectedPair] = useState('Major Pairs');

  const fetchNews = async (pair: string) => {
    setLoading(true);
    try {
      const query = pair === 'Major Pairs' 
        ? "Forex market sentiment today major pairs" 
        : `${pair} real-time market analysis news technical sentiment today`;
      const data = await getMarketNews(query);
      setNews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(selectedPair);
  }, [selectedPair]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-full transition-colors duration-300">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/20">
        <h3 className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 2v6h6" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 13H8m8 4H8m0-8h1" />
          </svg>
          Market Intelligence
        </h3>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all uppercase cursor-pointer"
          >
            {COMMON_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          
          <button 
            onClick={() => fetchNews(selectedPair)}
            disabled={loading}
            className="text-[10px] bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse"></div>
            </div>
            <div className="h-32 bg-slate-50 dark:bg-slate-800/50 rounded-xl w-full animate-pulse"></div>
          </div>
        ) : news ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
               <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-500 tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded transition-colors duration-300">
                Live Briefing: {selectedPair}
              </p>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">Verified Analysis</span>
            </div>

            <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {news.text}
            </div>

            {news.sources.length > 0 && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">Grounding Sources</p>
                  <svg className="w-3 h-3 text-slate-300 dark:text-slate-600" fill="currentColor" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {news.sources.map((s, idx) => (
                    <a 
                      key={idx} 
                      href={s.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 px-3 py-2 rounded-lg transition-all shadow-xs"
                    >
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200 truncate pr-4 transition-colors">
                        {s.title}
                      </span>
                      <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
            <svg className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-slate-400">Intelligence report unavailable for this sector.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketAnalysisView;
