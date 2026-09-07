
import React, { useEffect, useState, useCallback } from 'react';
import { getMarketNews } from '@/services/geminiService';

const COMMON_PAIRS: string[] = ['Sector Hub', 'EURUSD', 'GBPUSD', 'USDJPY', 'Gold (XAUUSD)', 'Nasdaq (NAS100)', 'Bitcoin (BTC)'];

interface NewsSource {
  title: string;
  uri: string;
}

interface NewsData {
  text: string;
  sources: NewsSource[];
}

const MarketAnalysisView: React.FC = () => {
  const [news, setNews] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPair, setSelectedPair] = useState('Sector Hub');

  const fetchNews = useCallback(async (pair: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const query = pair === 'Sector Hub' 
        ? "Global financial market sentiment today major assets" 
        : `${pair} real-time analysis news technical sentiment today`;
      const data = await getMarketNews(query);
      
      if (!data || typeof data.text !== 'string') {
        throw new Error("Incomplete intelligence stream received.");
      }

      setNews(data);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message || "Intelligence stream failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(selectedPair);
  }, [selectedPair, fetchNews]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col h-full transition-colors duration-300">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/20">
        <h3 className="text-violet-600 dark:text-violet-400 font-bold flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Intelligence Hub
        </h3>
        
        <div className="flex items-center gap-2">
          <select 
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            disabled={loading}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-600 dark:text-slate-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-violet-500/50 transition-all uppercase cursor-pointer disabled:opacity-50"
          >
            {COMMON_PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          
          <button 
            onClick={() => fetchNews(selectedPair)}
            disabled={loading}
            className="text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-500 dark:text-slate-400 flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
          >
            <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357-2H15" />
            </svg>
            Sync
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto min-h-[300px]">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-violet-100 dark:bg-violet-900/20 rounded-full animate-pulse"></div>
              <div className="space-y-2 flex-1">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/4 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-full animate-pulse"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4 animate-pulse"></div>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-2">Relay Interrupted</p>
            <p className="text-[10px] text-slate-500 mb-6 max-w-[200px] leading-relaxed">{error}</p>
            <button 
              onClick={() => fetchNews(selectedPair)}
              className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-lg hover:scale-105 active:scale-95 transition-all"
            >
              Reconnect
            </button>
          </div>
        ) : news ? (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="flex items-center justify-between">
               <p className="text-[10px] uppercase font-black text-violet-600 dark:text-violet-500 tracking-widest bg-violet-500/10 px-2 py-0.5 rounded">
                Briefing: {selectedPair}
              </p>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-bold uppercase">Alpha Verified</span>
            </div>

            <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">
              {news.text || "No briefing notes available for this asset currently."}
            </div>

            {Array.isArray(news.sources) && news.sources.length > 0 && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-3">Verification Stream</p>
                <div className="grid grid-cols-1 gap-2">
                  {news.sources.map((s: NewsSource, idx: number) => (
                    <a key={idx} href={s.uri} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/50 px-3 py-2 rounded-lg transition-all">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate pr-4 transition-colors font-bold">
                        {s.title || "External Source"}
                      </span>
                      <svg className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-violet-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
            <p className="text-xs font-bold uppercase tracking-widest">No Intelligence Found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketAnalysisView;
