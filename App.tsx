import React, { useState, useEffect, useCallback } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Navigate,
  Link 
} from 'react-router-dom';

import BacktestSimulator from '@/components/BacktestSimulator';
import BillingSection from '@/components/BillingSection';
import ChartAnalyzer from '@/components/ChartAnalyzer';
import { Dashboard } from '@/components/Dashboard';
import { JournalView } from '@/components/JournalView';
import { StrategicAuditView } from '@/components/StrategicAuditView';
import { Layout, LogoMark } from '@/components/Layout';
import Auth from '@/components/Auth';

import { 
  Trade, TradeStatus, User, UserGoals, 
  WidgetConfig, SubscriptionTier, Toast 
} from '@/types';
import { Gateway } from '@/services/geminiService';
import { defaultGoals, storageService } from '@/services/storageService';
import { 
  auth, 
  testConnection, 
  subscribeToUserTrades, 
  subscribeToUserGoals,
  subscribeToUserSubscription,
  saveTradeToFirestore, 
  getOrCreateAuthoritativeUser,
  logoutUser
} from '@/services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'goals', visible: true, label: 'Monthly Targets' },
  { id: 'equity', visible: true, label: 'Account Growth' },
  { id: 'distribution', visible: true, label: 'Success Rate' },
  { id: 'sessions', visible: true, label: 'Session Performance' },
  { id: 'market', visible: true, label: 'Market News' },
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [goals, setGoals] = useState<UserGoals>(defaultGoals);

  // Non-critical client preferences (theme & widget arrangement)
  const [isDarkMode, setIsDarkMode] = useState<'dark' | 'light'>(() => storageService.getTheme());
  
  const [layout] = useState<WidgetConfig[]>(() => {
    try {
      const saved = localStorage.getItem('fx_layout');
      return saved ? JSON.parse(saved) as WidgetConfig[] : DEFAULT_LAYOUT;
    } catch {
      return DEFAULT_LAYOUT;
    }
  });

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Synchronize Dark/Light Mode Theme (Client UI Preference Only)
  useEffect(() => {
    if (isDarkMode === 'dark') {
      document.documentElement.classList.add('dark');
      storageService.setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      storageService.setTheme('light');
    }
  }, [isDarkMode]);

  // Test Firebase connection on initial boot
  useEffect(() => {
    testConnection();
  }, []);

  // Central Firebase Authentication Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          // Authoritative profile and subscription from Firestore
          const authoritativeUser = await getOrCreateAuthoritativeUser(fbUser);
          setUser(authoritativeUser);
        } catch (err) {
          console.error("Failed to load user profile from Firestore:", err);
          // Fallback profile strictly with FREE tier and authoritative UID
          const fallbackUser: User = {
            id: fbUser.uid,
            userId: fbUser.uid,
            username: fbUser.displayName || fbUser.email?.split('@')[0] || 'TRADER',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'TRADER',
            email: fbUser.email || '',
            balance: 100000,
            tier: SubscriptionTier.FREE,
            usageCount: { vision: 0, audit: 0 }
          };
          setUser(fallbackUser);
        }
      } else {
        // Logged out / unauthenticated
        setUser(null);
        setTrades([]);
        setGoals(defaultGoals);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time authoritative subscription sync from Firestore (/users/{uid}/subscription/current)
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserSubscription(user.id, (sub) => {
      setUser(prev => {
        if (!prev) return null;
        return {
          ...prev,
          tier: sub.tier,
          subscriptionExpiry: sub.subscriptionExpiry || undefined,
          usageCount: sub.usageCount
        };
      });
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.id]);

  // Subscribe to trades from Firestore (/users/{uid}/trades)
  useEffect(() => {
    if (!user?.id) {
      setTrades([]);
      return;
    }

    const unsubscribe = subscribeToUserTrades(user.id, (firestoreTrades) => {
      setTrades(firestoreTrades);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.id]);

  // Subscribe to user goals from Firestore (/users/{uid}/goals/settings)
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToUserGoals(user.id, (firestoreGoals) => {
      setGoals(firestoreGoals);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.id]);

  // Handle Logout
  const handleLogout = async (): Promise<void> => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setUser(null);
      setTrades([]);
      setGoals(defaultGoals);
      addToast("Terminal session closed.", "info");
    }
  };

  const handleAddTrade = async (trade: Trade): Promise<void> => {
    if (!trade || !trade.id || !user?.id) return;
    const tradeWithMeta: Trade = { ...trade, userId: user.id, isAnalyzing: true };

    try {
      await saveTradeToFirestore(user.id, tradeWithMeta);
      addToast('Trade saved. AI analysis is running.', 'success');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Trade could not be saved.';
      addToast(message, 'error');
      return;
    }

    const msg = trade.status === TradeStatus.WIN 
      ? `Trade Won: +$${(trade.pnl || 0).toFixed(2)}` 
      : trade.status === TradeStatus.LOSS 
        ? `Trade Lost: -$${Math.abs(trade.pnl || 0).toFixed(2)}` 
        : `Breakeven: ${trade.pair}`;
    addToast(msg, trade.status === TradeStatus.WIN ? 'success' : trade.status === TradeStatus.LOSS ? 'error' : 'info');

    try {
      const auditRes = await Gateway.auditTrade(trade);
      const feedbackText = typeof auditRes === 'string'
        ? auditRes
        : `${auditRes.summary || ''}\nStrengths: ${auditRes.strengths?.join('; ') || 'None'}\nImprovements: ${auditRes.improvementAreas?.join('; ') || 'None'}`;
      const updatedTrade = { ...tradeWithMeta, aiFeedback: feedbackText || "Analysis incomplete.", isAnalyzing: false };
      setTrades(prev => prev.map(t => t.id === trade.id ? updatedTrade : t));
      try {
        await saveTradeToFirestore(user.id, updatedTrade);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'AI result could not be saved.';
        addToast(message, 'error');
      }
      if (auditRes.usageCount) {
        const newUsage = auditRes.usageCount;
        setUser(prev => prev ? { ...prev, usageCount: newUsage } : prev);
      }
    } catch (e: unknown) {
      const error = e as Error;
      const failedTrade: Trade = {
        ...tradeWithMeta,
        isAnalyzing: false,
        aiFeedback: `Analysis unavailable: ${error.message || 'The AI service did not respond.'}`
      };
      setTrades(prev => prev.map(t => t.id === trade.id ? failedTrade : t));
      try {
        await saveTradeToFirestore(user.id, failedTrade);
      } catch (saveError: unknown) {
        const message = saveError instanceof Error ? saveError.message : 'The failed analysis status could not be saved.';
        addToast(message, 'error');
      }
      addToast(error.message || 'Trade saved, but AI analysis was unavailable.', 'warning');
    }
  };

  // Authentication Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 transition-colors">
        <div className="flex flex-col items-center gap-6">
          <LogoMark className="w-24 h-24 animate-pulse" />
          <div className="flex flex-col items-center">
            <div className="w-48 h-1 bg-slate-200 dark:bg-slate-900 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-violet-600 w-full animate-[loading_2s_infinite_ease-in-out]"></div>
            </div>
            <p className="text-slate-400 dark:text-slate-600 font-mono text-[10px] uppercase tracking-[0.5em] mt-4 animate-pulse">
              Connecting Authoritative Firestore Node...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated Route Guard: Only show Auth component if user is not logged in
  if (!user) {
    return (
      <Auth 
        onLogin={(loggedInUser) => {
          setUser(loggedInUser);
        }} 
      />
    );
  }

  const isTierPro: boolean = user.tier === SubscriptionTier.PRO || user.tier === SubscriptionTier.ELITE;

  return (
    <Router>
      <Layout 
        user={user} 
        toasts={toasts} 
        setToasts={setToasts} 
        trades={trades}
        addToast={addToast}
        isDarkMode={isDarkMode === 'dark'}
        toggleDarkMode={() => setIsDarkMode(prev => prev === 'dark' ? 'light' : 'dark')}
        onLogout={handleLogout}
      >
        <Routes>
          <Route path="/" element={<Dashboard trades={trades} layout={layout} goals={goals} />} />
          <Route path="/journal" element={<JournalView trades={trades} onAddTrade={handleAddTrade} />} />
          <Route path="/vision" element={<ChartAnalyzer user={user} />} />
          <Route path="/simulator" element={
            <div className="relative">
              {!isTierPro && (
                <div className="absolute inset-0 z-20 glass rounded-[2.5rem] flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 border border-violet-500/30 text-violet-500 rounded-2xl flex items-center justify-center mb-6 neon-glow">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter mb-3 italic text-slate-800 dark:text-white">Upgrade Required</h3>
                  <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest max-w-xs mb-8">Simulation tools are available for Pro users.</p>
                  <Link to="/billing" className="px-8 py-3.5 bg-violet-600 hover:bg-violet-500 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-xl transition-all shadow-lg hover:neon-glow">Upgrade Plan</Link>
                </div>
              )}
              <div className={!isTierPro ? 'opacity-10 pointer-events-none blur-sm' : ''}>
                <BacktestSimulator />
              </div>
            </div>
          } />
          <Route path="/analysis" element={<StrategicAuditView user={user} trades={trades} isTierPro={isTierPro} addToast={addToast} setUser={(u) => setUser(u)} />} />
          <Route path="/billing" element={<BillingSection user={user} onUpdateUser={(u) => setUser(u)} addToast={addToast} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
