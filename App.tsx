
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import Auth from './components/Auth';
import JournalForm from './components/JournalForm';
import ChatBot from './components/ChatBot';
import MarketAnalysisView from './components/MarketAnalysisView';
import BacktestSimulator from './components/BacktestSimulator';
import BillingSection from './components/BillingSection';
import ChartAnalyzer from './components/ChartAnalyzer';
import { Trade, TradeStatus, User, TradingSession, UserGoals, DashboardWidgetId, WidgetConfig } from './types';
import { analyzeTradesDeeply, generateEmailReport, analyzeIndividualTrade } from './services/geminiService';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'goals', visible: true, label: 'Performance Milestones' },
  { id: 'equity', visible: true, label: 'Equity Curve' },
  { id: 'distribution', visible: true, label: 'Outcome Analysis' },
  { id: 'sessions', visible: true, label: 'Session Alpha' },
  { id: 'market', visible: true, label: 'Market Intelligence' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'journal' | 'analysis' | 'simulator' | 'vision' | 'billing'>('dashboard');
  const [deepAnalysis, setDeepAnalysis] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const [layout, setLayout] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('forex_layout');
    return saved ? JSON.parse(saved) : DEFAULT_LAYOUT;
  });

  const [goals, setGoals] = useState<UserGoals>(() => {
    const saved = localStorage.getItem('forex_goals');
    return saved ? JSON.parse(saved) : {
      monthlyProfitTarget: 2000,
      winRateTarget: 60,
      tradesPerMonthTarget: 20
    };
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('forex_theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('forex_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    addToast(`Switched to ${newTheme} mode`, 'info');
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('forex_user') || sessionStorage.getItem('forex_user');
    const savedTrades = localStorage.getItem('forex_trades');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedTrades) setTrades(JSON.parse(savedTrades));
  }, []);

  useEffect(() => {
    localStorage.setItem('forex_trades', JSON.stringify(trades));
    localStorage.setItem('forex_goals', JSON.stringify(goals));
    localStorage.setItem('forex_layout', JSON.stringify(layout));
  }, [trades, goals, layout]);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const handleLogin = (email: string, rememberMe: boolean) => {
    const userData: User = { username: email, balance: 10000 };
    setUser(userData);
    if (rememberMe) localStorage.setItem('forex_user', JSON.stringify(userData));
    else sessionStorage.setItem('forex_user', JSON.stringify(userData));
    addToast(`Terminal access granted: ${email}`, 'success');
  };

  const handleLogout = () => {
    addToast('Securing terminal assets...', 'info');
    setUser(null);
    localStorage.removeItem('forex_user');
    sessionStorage.removeItem('forex_user');
  };

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => t.status === TradeStatus.WIN).length;
    const losses = trades.filter(t => t.status === TradeStatus.LOSS).length;
    const be = trades.filter(t => t.status === TradeStatus.BREAK_EVEN).length;
    const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const winRate = total > 0 ? (wins / total) * 100 : 0;
    
    const distributionData = [
      { name: 'Wins', value: wins, color: '#10b981' },
      { name: 'Losses', value: losses, color: '#ef4444' },
      { name: 'Break Even', value: be, color: '#94a3b8' }
    ].filter(d => d.value > 0);

    const sessions = [TradingSession.LONDON, TradingSession.NEW_YORK, TradingSession.ASIAN, TradingSession.OVERLAP];
    const sessionPerformance = sessions.map(session => {
      const sessionTrades = trades.filter(t => t.session === session);
      const sTotal = sessionTrades.length;
      const sWins = sessionTrades.filter(t => t.status === TradeStatus.WIN).length;
      const sPnl = sessionTrades.reduce((sum, t) => sum + t.pnl, 0);
      const sWinRate = sTotal > 0 ? (sWins / sTotal) * 100 : 0;
      return { 
        name: session.replace('_', ' '), 
        total: sTotal, 
        pnl: sPnl, 
        winRate: sWinRate.toFixed(1) 
      };
    });

    return { total, wins, totalPnl, winRate, distributionData, sessionPerformance };
  }, [trades]);

  const handleSendEmailReport = async () => {
    if (!user || trades.length === 0) {
      addToast('Log at least one trade to generate a report!', 'warning');
      return;
    }
    setIsEmailing(true);
    addToast('Gemini is generating your Alpha Report...', 'info');
    try {
      const emailBody = await generateEmailReport(user.username, trades, stats);
      const subject = encodeURIComponent("Trading Performance Audit - ForexPro AI");
      const body = encodeURIComponent(emailBody);
      window.open(`mailto:${user.username}?subject=${subject}&body=${body}`);
      addToast('Report generated and ready to send!', 'success');
    } catch (e) {
      addToast('Report generation interrupted.', 'error');
    } finally {
      setIsEmailing(false);
    }
  };

  const handleAddTrade = async (trade: Trade) => {
    const tradeWithMeta = { ...trade, isAnalyzing: true };
    setTrades(prev => [tradeWithMeta, ...prev]);

    const msg = trade.status === TradeStatus.WIN 
      ? `Trade Won: +$${trade.pnl.toFixed(2)} on ${trade.pair}` 
      : trade.status === TradeStatus.LOSS 
        ? `Trade Lost: -$${Math.abs(trade.pnl).toFixed(2)} on ${trade.pair}` 
        : `Trade Breakeven on ${trade.pair}`;
    addToast(msg, trade.status === TradeStatus.WIN ? 'success' : trade.status === TradeStatus.LOSS ? 'error' : 'info');

    try {
      const feedback = await analyzeIndividualTrade(trade);
      setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, aiFeedback: feedback, isAnalyzing: false } : t));
    } catch (e) {
      setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, isAnalyzing: false, aiFeedback: "Analysis unavailable." } : t));
    }
  };

  const chartData = useMemo(() => {
    let runningPnl = 0;
    return [...trades].reverse().map((t, i) => {
      runningPnl += t.pnl;
      return { trade: i + 1, pnl: runningPnl, date: new Date(t.timestamp).toLocaleDateString() };
    });
  }, [trades]);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'journal', label: 'Journal', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'vision', label: 'Vision', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'simulator', label: 'Lab', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { id: 'analysis', label: 'Strategy', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { id: 'billing', label: 'Pro', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
  ];

  const moveWidget = (id: DashboardWidgetId, direction: 'up' | 'down') => {
    const index = layout.findIndex(w => w.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === layout.length - 1)) return;
    const newLayout = [...layout];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newLayout[index], newLayout[targetIndex]] = [newLayout[targetIndex], newLayout[index]];
    setLayout(newLayout);
  };

  const toggleWidgetVisibility = (id: DashboardWidgetId) => {
    setLayout(layout.map(w => w.id === id ? { ...w, visible: !w.visible } : w));
  };

  if (!user) return <Auth onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex flex-col md:flex-row transition-colors duration-500 pb-20 md:pb-0 relative">
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-[320px] pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium animate-in slide-in-from-right-full duration-300 transition-all ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : toast.type === 'error' ? 'bg-rose-600 border-rose-500 text-white' : toast.type === 'warning' ? 'bg-amber-500 border-amber-400 text-white' : 'bg-slate-900 border-slate-700 text-white'}`}>
            <div className="shrink-0">
              {toast.type === 'success' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'error' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              {toast.type === 'info' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </div>
            <p className="flex-1 text-xs">{toast.message}</p>
            <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="opacity-60 hover:opacity-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        ))}
      </div>

      <aside className="hidden md:flex w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-6 sticky top-0 h-screen z-40 transition-colors">
        <div className="flex items-center gap-3 mb-10">
          <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-xl shadow-emerald-600/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight">ForexPro</h1>
        </div>
        <nav className="space-y-1.5 flex-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === item.id ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800">
           <button onClick={handleSendEmailReport} disabled={isEmailing} className="w-full flex items-center gap-3 px-4 py-3 text-emerald-600 dark:text-emerald-500 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/20 mb-2 transition-all font-bold text-xs uppercase tracking-wider">
             {isEmailing ? 'Building...' : 'Email My Stats'}
           </button>
           <button onClick={toggleTheme} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
             <span className="text-sm font-medium">{theme === 'dark' ? 'Light' : 'Dark'}</span>
             <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
           </button>
           <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all font-medium text-sm">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             Sign Out
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-4 py-6 md:p-10 max-w-full">
        <header className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-4">
             <div className="md:hidden h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
             </div>
             <div>
               <h2 className="text-2xl font-bold text-slate-900 dark:text-white truncate max-w-[200px] md:max-w-none">
                 {user.username.split('@')[0]}
               </h2>
               <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Active Terminal: <span className="text-emerald-500">{user.username}</span></p>
             </div>
           </div>
           <div className="flex gap-2">
              <button onClick={toggleTheme} className="md:hidden h-10 w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center rounded-xl text-lg shadow-sm">
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              {activeTab === 'dashboard' && (
                <button onClick={() => setShowLayoutModal(true)} className="h-10 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">Customize</button>
              )}
              <button onClick={handleSendEmailReport} className="h-10 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase rounded-xl shadow-lg transition-all active:scale-95">Report</button>
              <div className="hidden md:flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Balance</p>
                <p className="font-mono font-bold text-emerald-600 transition-all duration-300" key={stats.totalPnl}>${user.balance.toLocaleString()}</p>
              </div>
           </div>
        </header>

        <div className="space-y-6">
          {activeTab === 'dashboard' && (
            <div className="flex flex-col gap-6 pb-12">
              {layout.filter(w => w.visible).map(widget => (
                <React.Fragment key={widget.id}>
                  {widget.id === 'goals' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="flex justify-between items-center mb-6">
                        <div>
                          <h3 className="text-lg font-bold">Performance Milestones</h3>
                          <p className="text-xs text-slate-500">Tracking against monthly targets</p>
                        </div>
                        <button onClick={() => setShowGoalModal(true)} className="text-xs font-bold text-emerald-600 hover:text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Set Goals
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight"><span className="text-slate-400">Monthly Profit</span><span className={stats.totalPnl >= goals.monthlyProfitTarget ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}>${stats.totalPnl.toFixed(0)} / ${goals.monthlyProfitTarget}</span></div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${stats.totalPnl >= goals.monthlyProfitTarget ? 'bg-emerald-500' : stats.totalPnl < 0 ? 'bg-rose-500' : 'bg-emerald-600/60'}`} style={{ width: `${Math.min(100, Math.max(0, (stats.totalPnl / goals.monthlyProfitTarget) * 100))}%` }}></div></div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight"><span className="text-slate-400">Win Rate</span><span className={stats.winRate >= goals.winRateTarget ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}>{stats.winRate.toFixed(1)}% / {goals.winRateTarget}%</span></div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className={`h-full transition-all duration-1000 ${stats.winRate >= goals.winRateTarget ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, (stats.winRate / goals.winRateTarget) * 100)}%` }}></div></div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-xs font-bold uppercase tracking-tight"><span className="text-slate-400">Trade Volume</span><span className={stats.total >= goals.tradesPerMonthTarget ? 'text-emerald-500' : 'text-slate-600 dark:text-slate-300'}>{stats.total} / {goals.tradesPerMonthTarget}</span></div>
                          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${Math.min(100, (stats.total / goals.tradesPerMonthTarget) * 100)}%` }}></div></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {widget.id === 'equity' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm min-h-[400px] animate-in fade-in slide-in-from-top-4 duration-300">
                      <h3 className="text-lg font-bold mb-6">Equity Curve</h3>
                      <div className="h-full min-h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs><linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
                            <XAxis dataKey="trade" hide />
                            <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="pnl" stroke="#10b981" fillOpacity={1} fill="url(#pnlGrad)" strokeWidth={3} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {widget.id === 'distribution' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm min-h-[400px] animate-in fade-in slide-in-from-top-4 duration-300">
                      <h3 className="text-lg font-bold mb-6">Outcome Analysis</h3>
                      {stats.total > 0 ? (
                        <div className="h-full min-h-[300px] flex flex-col items-center">
                          <div className="w-full h-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart><Pie data={stats.distributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">{stats.distributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip /></PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full space-y-2 mt-4">{stats.distributionData.map((d, i) => (<div key={i} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div><span className="text-slate-500">{d.name}</span></div><span className="font-bold">{d.value} ({((d.value/stats.total)*100).toFixed(0)}%)</span></div>))}</div>
                        </div>
                      ) : (<div className="h-full flex flex-col items-center justify-center opacity-30 text-center"><svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg><p className="text-xs font-bold uppercase">No data yet</p></div>)}
                    </div>
                  )}

                  {widget.id === 'sessions' && (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Session Alpha</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{stats.sessionPerformance.map((s, idx) => (<div key={idx} className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50 p-4 rounded-2xl flex flex-col transition-all hover:scale-[1.02]"><p className="text-[10px] uppercase font-bold text-slate-400 mb-3">{s.name}</p><div className="flex items-end justify-between mb-1"><span className={`text-xl font-mono font-bold ${s.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(0)}</span><span className="text-xs font-bold text-slate-500 dark:text-slate-400">{s.total} Trades</span></div><div className="flex items-center gap-2 mt-2"><div className="h-1.5 flex-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-blue-500 transition-all duration-700" style={{ width: `${s.winRate}%` }}></div></div><span className="text-[10px] font-bold text-slate-500">{s.winRate}% WR</span></div></div>))}</div>
                    </div>
                  )}

                  {widget.id === 'market' && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <MarketAnalysisView />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}

          {activeTab === 'journal' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <JournalForm onAddTrade={handleAddTrade} />
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                  <h3 className="font-bold">Execution History</h3>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total: {trades.length} Positions</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Asset</th>
                        <th className="px-6 py-4">Direction</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Session</th>
                        <th className="px-6 py-4 text-right">Net PnL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {trades.map(t => (
                        <React.Fragment key={t.id}>
                          <tr className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <span className="font-bold">{t.pair}</span>
                              <p className="text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleDateString()}</p>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'BUY' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>{t.type}</span>
                            </td>
                            <td className="px-6 py-4 font-semibold text-xs">{t.status}</td>
                            <td className="px-6 py-4 font-bold text-[10px] opacity-60 uppercase">{t.session.replace('_', ' ')}</td>
                            <td className={`px-6 py-4 text-right font-mono font-bold ${t.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={5} className="px-6 py-2 bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-50 dark:border-slate-800/50">
                              <div className="flex items-start gap-3">
                                <div className="mt-1 flex-shrink-0">
                                  <div className={`h-1.5 w-1.5 rounded-full ${t.isAnalyzing ? 'bg-emerald-500 animate-ping' : 'bg-emerald-600'}`}></div>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black text-emerald-600/80 uppercase tracking-[0.1em] mb-0.5">Alpha Mentor Insights</p>
                                  <p className="text-[11px] italic text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                                    {t.isAnalyzing ? "Processing execution data..." : t.aiFeedback || "Awaiting audit..."}
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  {trades.length === 0 && (
                    <div className="p-12 text-center text-slate-400 opacity-50 flex flex-col items-center">
                      <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                      <p className="text-xs font-bold uppercase tracking-widest">No terminal records found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vision' && <ChartAnalyzer />}
          {activeTab === 'simulator' && <BacktestSimulator onCommitTrade={handleAddTrade} />}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-600/20 flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Alpha Strategic Audit</h3>
                  <p className="opacity-80 max-w-md">Gemini Pro will analyze your last {trades.length} trades for cognitive bias and leakage.</p>
                </div>
                <button 
                  onClick={async () => {
                    setIsAnalyzing(true);
                    addToast('Starting deep strategic audit...', 'info');
                    try {
                      const res = await analyzeTradesDeeply(trades);
                      setDeepAnalysis(res);
                      addToast('Audit completed successfully', 'success');
                    } catch (e) {
                      addToast('Failed to generate audit', 'error');
                    } finally {
                      setIsAnalyzing(false);
                    }
                  }}
                  disabled={isAnalyzing || trades.length === 0}
                  className="bg-white text-emerald-600 px-8 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  {isAnalyzing ? 'Processing...' : 'Start Audit'}
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 min-h-[400px]">
                {deepAnalysis ? (
                   <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">{deepAnalysis}</div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 py-20 text-center">
                    <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    <p className="font-bold text-sm uppercase tracking-widest">No Audit Generated</p>
                    <p className="text-xs mt-2">Log trades and click "Start Audit" for AI feedback.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'billing' && <BillingSection />}
        </div>
      </main>

      {/* Layout Manager Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowLayoutModal(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xl font-bold mb-2">Terminal Layout</h3>
            <p className="text-xs text-slate-500 mb-6 uppercase font-bold tracking-wider">Drag to reorder widgets</p>
            <div className="space-y-3 mb-8">
              {layout.map((widget, i) => (
                <div key={widget.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                  <button onClick={() => toggleWidgetVisibility(widget.id)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${widget.visible ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={widget.visible ? "M15 12a3 3 0 11-6 0 3 3 0 016 0z" : "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={widget.visible ? "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" : ""} /></svg>
                  </button>
                  <span className={`flex-1 text-sm font-bold ${!widget.visible && 'opacity-40'}`}>{widget.label}</span>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveWidget(widget.id, 'up')} className="p-1 hover:text-emerald-500 transition-colors opacity-60"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg></button>
                    <button onClick={() => moveWidget(widget.id, 'down')} className="p-1 hover:text-emerald-500 transition-colors opacity-60"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setLayout(DEFAULT_LAYOUT)} className="flex-1 py-3 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-all uppercase tracking-widest">Reset Default</button>
              <button onClick={() => setShowLayoutModal(false)} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-600/20 uppercase text-xs tracking-widest">Done</button>
            </div>
          </div>
        </div>
      )}

      {showGoalModal && (<div className="fixed inset-0 z-[60] flex items-center justify-center p-4"><div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setShowGoalModal(false)}></div><div className="relative bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800"><h3 className="text-xl font-bold mb-6">Set Performance Targets</h3><div className="space-y-4"><div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Monthly Profit Target ($)</label><input type="number" value={goals.monthlyProfitTarget} onChange={(e) => setGoals({...goals, monthlyProfitTarget: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" /></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Target Win Rate (%)</label><input type="number" value={goals.winRateTarget} onChange={(e) => setGoals({...goals, winRateTarget: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" /></div><div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Minimum Trades / Month</label><input type="number" value={goals.tradesPerMonthTarget} onChange={(e) => setGoals({...goals, tradesPerMonthTarget: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500" /></div><button onClick={() => { setShowGoalModal(false); addToast('Performance targets updated', 'success'); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl mt-4 transition-all">Save Targets</button></div></div></div>)}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex items-center justify-around px-2 py-3 z-50">{navItems.map(item => (<button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex flex-col items-center gap-1 transition-all ${activeTab === item.id ? 'text-emerald-600 scale-110' : 'text-slate-400'}`}><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg><span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span></button>))}</nav>
      <ChatBot />
    </div>
  );
};

export default App;
