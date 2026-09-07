
import React, { useState, useEffect } from 'react';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail, 
  getOrCreateUserProfile 
} from '@/services/firebase';
import { User } from '@/types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const LogoMark: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => (
  <div className={`${className} relative`}>
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        <linearGradient id="fxGradientAuth" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#db2777', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <path d="M20 25h35v10H32v15h20v10H32v25H20V25z" fill="url(#fxGradientAuth)" />
      <path d="M55 25h12l13 25-13 25h-12l13-25-13-25z" fill="url(#fxGradientAuth)" />
      <path d="M85 25h-12l-13 25 13 25h12l-13-25 13-25z" fill="url(#fxGradientAuth)" />
      <path d="M15 85 L90 10" stroke="url(#fxGradientAuth)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </div>
);

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('forex_last_email');
    if (saved) setEmail(saved);
  }, []);

  const handleGoogleLogin = async (): Promise<void> => {
    setError(null);
    setIsAuthenticating(true);
    try {
      const fbUser = await loginWithGoogle();
      if (fbUser) {
        const user = await getOrCreateUserProfile(fbUser);
        onLogin(user);
      }
    } catch (e: unknown) {
      const err = e as Error;
      if (err.message && err.message.includes('popup-closed-by-user')) {
        setError("Sign-in window closed before completion.");
      } else {
        setError(err.message || "Google Sign-In failed.");
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!isLogin && password.length < 6) {
      setError("Access Code must be at least 6 characters for protocol safety.");
      return;
    }

    setIsAuthenticating(true);

    try {
      const fbUser = isLogin 
        ? await loginWithEmail(email, password) 
        : await registerWithEmail(email, password);
      
      const user = await getOrCreateUserProfile(fbUser);
      localStorage.setItem('forex_last_email', email);
      onLogin(user);
    } catch (e: unknown) {
      const err = e as Error;
      let msg = err.message || "";
      let userFriendlyError = "Authentication signal interrupted.";
      
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        userFriendlyError = "Invalid Terminal ID or Access Code.";
      } else if (msg.includes('auth/email-already-in-use')) {
        userFriendlyError = "This Terminal ID is already registered. Please sign in.";
      } else if (msg.includes('auth/weak-password')) {
        userFriendlyError = "Access Code is too weak. Minimum 6 characters required.";
      } else if (msg.includes('auth/invalid-email')) {
        userFriendlyError = "Please enter a valid email address.";
      } else if (msg.includes('auth/too-many-requests')) {
        userFriendlyError = "Access temporarily throttled. Please wait a moment and try again.";
      } else if (msg) {
        userFriendlyError = msg;
      }
      
      setError(userFriendlyError);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden">
        
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/10 blur-3xl rounded-full animate-pulse"></div>
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <LogoMark className="w-20 h-20" />
          </div>
          
          <h2 className="text-2xl font-black text-center mb-1 text-slate-900 dark:text-slate-50 tracking-tighter">
            {isLogin ? 'FINANCIAL ANALYST' : 'INITIALIZE PROFILE'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-6 text-[10px] uppercase font-bold tracking-[0.2em] px-4 opacity-60">
            {isLogin ? 'Access your algorithmic workspace.' : 'Create your decentralized node.'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in slide-in-from-top-2">
              <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Auth Error</p>
              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-bold">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isAuthenticating}
            className="w-full mb-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold py-3 px-4 rounded-xl shadow border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            Sign in with Google
          </button>

          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="px-3 text-[10px] uppercase tracking-widest text-slate-400 font-bold">or</span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Terminal ID</label>
              <input 
                type="email" 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" 
                placeholder="analyst@terminal.net" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1.5 tracking-wider">Access Code</label>
              <input 
                type="password" 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
              {!isLogin && (
                <p className="mt-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-tight">Minimum 6 characters for protocol safety.</p>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isAuthenticating} 
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isAuthenticating ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                isLogin ? 'Initialize Session' : 'Provision Terminal'
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-violet-600 transition-colors uppercase tracking-[0.2em]">
              {isLogin ? "Join the Network" : "Return to Terminal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
