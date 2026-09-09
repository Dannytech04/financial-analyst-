import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { User, Toast, Trade } from '@/types';
import ChatBot from './ChatBot';

interface LayoutProps {
  user: User;
  toasts: Toast[];
  setToasts: React.Dispatch<React.SetStateAction<Toast[]>>;
  trades: Trade[];
  addToast: (msg: string, type: Toast['type']) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}

export const LogoMark: React.FC<{ className?: string }> = ({ className = "w-10 h-10" }) => (
  <div className={`${className} relative flex items-center justify-center`}>
    <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]">
      <defs>
        <linearGradient id="fxGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#ec4899', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M20 25h35v10H32v15h20v10H32v25H20V25z" fill="url(#fxGradient)" />
      <path d="M55 25h12l13 25-13 25h-12l13-25-13-25z" fill="url(#fxGradient)" />
      <path d="M85 25h-12l-13 25 13 25h12l-13-25 13-25z" fill="url(#fxGradient)" />
      <circle cx="50" cy="50" r="48" fill="none" stroke="url(#fxGradient)" strokeWidth="1" strokeDasharray="4 4" className="animate-[spin_20s_linear_infinite]" />
    </svg>
  </div>
);

export const Layout: React.FC<LayoutProps> = ({ 
  user, 
  toasts, 
  isDarkMode, 
  toggleDarkMode, 
  onLogout,
  children 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/journal', label: 'Trade Journal', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { path: '/vision', label: 'Chart Scan', icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
    { path: '/simulator', label: 'Strategy Lab', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
    { path: '/analysis', label: 'Strategy Audit', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
    { path: '/billing', label: 'Account Plans', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row relative transition-colors duration-300">
      {/* Toast Overlay */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-[340px] pointer-events-none p-4">
        {toasts.map(toast => (
          <div key={toast.id} className={`pointer-events-auto flex items-center gap-4 px-5 py-4 rounded-2xl border glass shadow-2xl animate-in slide-in-from-right-full duration-500 transition-all ${toast.type === 'success' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-100' : toast.type === 'error' ? 'border-rose-500/50 text-rose-600 dark:text-rose-100' : 'border-violet-500/50 text-violet-600 dark:text-violet-100'}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : toast.type === 'error' ? 'bg-rose-500/10 text-rose-500' : 'bg-violet-500/10 text-violet-500'}`}>
              {toast.type === 'success' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
              {toast.type === 'error' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>}
              {toast.type === 'info' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            </div>
            <p className="flex-1 text-[11px] font-bold uppercase tracking-tight">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col transition-all duration-500 border-r border-slate-200 dark:border-slate-900 bg-white/50 dark:bg-slate-950/50 backdrop-blur-xl z-50 sticky top-0 h-screen ${isSidebarOpen ? 'w-72' : 'w-24'}`}>
        <div className="p-8 flex items-center gap-4 overflow-hidden h-24 shrink-0">
          <LogoMark className="w-10 h-10 shrink-0" />
          {isSidebarOpen && (
            <div className="flex flex-col animate-in fade-in duration-700">
              <h1 className="text-sm font-black tracking-tight leading-none text-slate-800 dark:text-white">TRADE_PRO</h1>
              <p className="text-[9px] font-black tracking-[0.4em] text-violet-500 mt-1 uppercase">Manager v4.0</p>
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map(item => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all relative overflow-hidden ${isActive ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20 neon-glow' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900/50'}`}
            >
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
              {isSidebarOpen && <span className="text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-left-2">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-900 bg-white/80 dark:bg-slate-950/80 space-y-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className={`w-full h-11 flex items-center justify-center gap-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-black text-[10px] uppercase tracking-widest transition-all ${isSidebarOpen ? 'px-4' : 'px-0'}`}
              title="Sign Out"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isSidebarOpen && <span>Sign Out</span>}
            </button>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full h-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 transition-all"
          >
            <svg className={`w-5 h-5 transition-transform duration-500 ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
          </button>
        </div>
      </aside>

      {/* Main Execution Unit */}
      <main className="flex-1 min-h-screen pb-24 md:pb-12 overflow-x-hidden relative">
        <header className="px-6 py-6 md:px-12 md:py-8 sticky top-0 z-40 glass border-b border-slate-200 dark:border-white/5 flex items-center justify-between transition-colors duration-300">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white italic tracking-tighter truncate uppercase">
              {user.username}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Online</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {/* Theme Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-violet-500 transition-all shadow-sm"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>

            {/* Sign Out Button in Header */}
            {onLogout && (
              <button 
                onClick={onLogout}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:border-rose-500/30 transition-all shadow-sm group"
                title="Sign Out"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}

            <div className="hidden lg:flex flex-col items-end pr-6 border-r border-slate-200 dark:border-white/10 h-10 justify-center">
              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Balance</p>
              <p className="font-mono font-black text-violet-600 dark:text-violet-400 text-lg tracking-tighter">${user.balance.toLocaleString()}</p>
            </div>
            
            <div className="px-4 py-2.5 rounded-xl border border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10 flex items-center gap-3 neon-glow">
              <div className="text-right">
                <p className="text-[8px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">{user.tier} Access</p>
                <p className="text-[9px] font-bold text-slate-800 dark:text-white uppercase italic tracking-tighter">Sync Active</p>
              </div>
              <div className="w-1.5 h-6 bg-violet-600 rounded-full animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-12">
          {children}
        </div>
      </main>

      {/* Mobile Interaction Hub (Bottom Nav) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-t border-slate-200 dark:border-white/5">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {navItems.slice(0, 5).map(item => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-violet-500 scale-110 drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]' : 'text-slate-400 dark:text-slate-500'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
            </NavLink>
          ))}
        </div>
      </nav>

      <ChatBot user={user} />
    </div>
  );
};
