
import React, { useState, useEffect } from 'react';

interface AuthProps {
  onLogin: (email: string, rememberMe: boolean) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authProvider, setAuthProvider] = useState<'form' | 'google' | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('forex_last_email');
    if (saved) setEmail(saved);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.includes('@') && password.length >= 6) {
      setIsAuthenticating(true);
      setAuthProvider('form');
      
      setTimeout(() => {
        if (rememberMe) localStorage.setItem('forex_last_email', email);
        onLogin(email, rememberMe);
        setIsAuthenticating(false);
      }, 1200);
    }
  };

  const handleGoogleLogin = () => {
    setIsAuthenticating(true);
    setAuthProvider('google');

    setTimeout(() => {
      // In a real environment, this would be retrieved from the Google Profile
      // Here, if the user entered an email, we use it, otherwise we use a mock.
      const targetEmail = email || "demo.trader@gmail.com";
      if (rememberMe) localStorage.setItem('forex_last_email', targetEmail);
      onLogin(targetEmail, rememberMe);
      setIsAuthenticating(false);
    }, 1800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 blur-3xl rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>

        {isAuthenticating && authProvider === 'google' && (
          <div className="absolute inset-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Syncing with Google Account...</p>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Secure Verification</p>
          </div>
        )}

        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-2 text-slate-900 dark:text-slate-50">
            {isLogin ? 'Member Login' : 'Alpha Sign-Up'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm px-4">
            {isLogin ? 'Enter your details to access your terminal.' : 'Start tracking with your verified email address.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Your Email</label>
              <input type="email" autoComplete="email" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-400" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Access Code</label>
              <input type="password" autoComplete={isLogin ? "current-password" : "new-password"} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder:text-slate-400" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="sr-only peer" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <div className="w-4 h-4 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded peer-checked:bg-emerald-600 peer-checked:border-emerald-600 transition-all"></div>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight">Stay authenticated</span>
              </label>
            </div>

            <button type="submit" disabled={isAuthenticating} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2">
              {isAuthenticating && authProvider === 'form' ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? 'Open Terminal' : 'Initialize Account')}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4 text-slate-300 dark:text-slate-800">
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800"></div>
            <span className="text-[9px] uppercase font-black tracking-[0.2em] text-slate-400 dark:text-slate-600">OAuth Flow</span>
            <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800"></div>
          </div>

          <div className="mt-6">
            <button onClick={handleGoogleLogin} disabled={isAuthenticating} className="w-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-3 rounded-xl flex items-center justify-center gap-3 border border-slate-200 dark:border-slate-700 shadow-sm disabled:opacity-50">
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
              Google Auth
            </button>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-xs font-bold text-slate-400 dark:text-slate-500 hover:text-emerald-600 transition-colors uppercase tracking-widest">
              {isLogin ? "New here? Sign up" : "Existing member? Log in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
