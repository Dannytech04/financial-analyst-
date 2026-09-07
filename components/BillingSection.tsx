
import React, { useState } from 'react';
import { SubscriptionTier, User, Toast } from '@/types';
import { Gateway } from '@/services/geminiService';

interface PlanDetails {
  id: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  color: string;
}

const PLANS: PlanDetails[] = [
  {
    id: SubscriptionTier.PRO,
    name: "Alpha Pro",
    monthlyPrice: 29,
    yearlyPrice: 280,
    features: [
      "50 AI Chart Visions / mo",
      "20 Advanced Audits / mo",
      "Quant Lab (Backtesting)",
      "Standard Report Export",
      "Priority Gemini Support"
    ],
    color: "violet"
  },
  {
    id: SubscriptionTier.ELITE,
    name: "Elite Institutional",
    monthlyPrice: 99,
    yearlyPrice: 950,
    features: [
      "Unlimited AI Chart Visions",
      "Unlimited Strategic Audits",
      "Proprietary Signal Mapping",
      "Institutional Risk Models",
      "Direct API Channel Access",
      "Custom Macro Intelligence"
    ],
    color: "pink"
  }
];

interface BillingSectionProps {
  user: User;
  onUpdateUser: (user: User) => void;
  addToast: (msg: string, type: Toast['type']) => void;
}

const BillingSection: React.FC<BillingSectionProps> = ({ user, onUpdateUser, addToast }) => {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCheckout, setShowCheckout] = useState<PlanDetails | null>(null);

  const handleInitializePayment = (plan: PlanDetails): void => {
    setShowCheckout(plan);
  };

  const handleSimulatePayment = async (): Promise<void> => {
    if (!showCheckout) return;
    setIsProcessing(true);
    try {
      const updatedUser = await Gateway.verifyPayment("SIM_SESSION_123", showCheckout.id);
      onUpdateUser(updatedUser);
      addToast(`${showCheckout.name} Activation Successful!`, 'success');
      setShowCheckout(null);
    } catch (e: unknown) {
      const err = e as Error;
      addToast(err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter uppercase italic">Institutional Access</h2>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Protocol:</p>
          <span className={`text-[10px] font-black uppercase tracking-widest ${user.tier === SubscriptionTier.FREE ? 'text-slate-400' : 'text-violet-500'}`}>
            {user.tier} ACCESS
          </span>
        </div>

        <div className="mt-10 flex items-center justify-center gap-4">
          <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${cycle === 'monthly' ? 'text-violet-600' : 'text-slate-400'}`}>Monthly</span>
          <button 
            onClick={() => setCycle(cycle === 'monthly' ? 'yearly' : 'monthly')}
            className="w-14 h-7 bg-slate-200 dark:bg-slate-800 rounded-full p-1 transition-all relative ring-1 ring-slate-300 dark:ring-slate-700"
          >
            <div className={`w-5 h-5 bg-violet-600 rounded-full transition-transform duration-300 transform ${cycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'} shadow-lg shadow-violet-600/20`}></div>
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-black uppercase tracking-widest transition-colors ${cycle === 'yearly' ? 'text-violet-600' : 'text-slate-400'}`}>Yearly</span>
            <span className="bg-emerald-500/10 text-emerald-500 text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border border-emerald-500/20">-20%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 flex flex-col shadow-sm opacity-60">
          <div className="mb-6">
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Analyst Basic</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Core Functionality</p>
          </div>
          <div className="mb-10">
            <span className="text-5xl font-black italic tracking-tighter text-slate-400">$0</span>
          </div>
          <ul className="space-y-4 mb-12 flex-1">
            {["3 AI Chart Visions", "2 Trade Audits", "Global Hub Access"].map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                {f}
              </li>
            ))}
          </ul>
          <button disabled className="w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] border border-slate-200 dark:border-slate-800 text-slate-300">
            {user.tier === SubscriptionTier.FREE ? 'Current Access' : 'Inactive'}
          </button>
        </div>

        {PLANS.map((plan) => (
          <div key={plan.id} className={`relative rounded-[2.5rem] p-10 flex flex-col transition-all duration-500 hover:scale-[1.02] border-2 group ${plan.id === SubscriptionTier.ELITE ? 'bg-slate-950 border-pink-500 shadow-2xl shadow-pink-500/10 text-white' : 'bg-white dark:bg-slate-900 border-violet-500 dark:border-violet-500 shadow-xl'}`}>
            {user.tier === plan.id && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-emerald-500 text-white text-[9px] font-black px-5 py-2 rounded-full uppercase tracking-[0.3em] shadow-xl z-10">Active Tier</div>
            )}
            <div className="mb-6">
              <h3 className={`text-xl font-black uppercase tracking-tighter italic ${plan.id === SubscriptionTier.ELITE ? 'text-pink-500' : 'text-violet-600'}`}>{plan.name}</h3>
              <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-1">Institutional Protocol</p>
            </div>
            <div className="mb-10">
              <span className="text-6xl font-black tracking-tighter italic">${cycle === 'monthly' ? plan.monthlyPrice : Math.round(plan.yearlyPrice / 12)}</span>
              <span className="opacity-40 text-sm ml-2 font-bold uppercase tracking-widest">/mo</span>
              {cycle === 'yearly' && <p className="text-[10px] opacity-40 mt-2 font-bold">Billed annually (${plan.yearlyPrice})</p>}
            </div>
            <ul className="space-y-4 mb-12 flex-1">
              {plan.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-xs font-bold">
                  <svg className={`w-4 h-4 mt-0.5 shrink-0 ${plan.id === SubscriptionTier.ELITE ? 'text-pink-400' : 'text-violet-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span className="opacity-80 leading-relaxed uppercase tracking-tighter">{feat}</span>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleInitializePayment(plan)}
              disabled={user.tier === plan.id}
              className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.4em] transition-all transform active:scale-95 shadow-xl disabled:opacity-30 ${plan.id === SubscriptionTier.ELITE ? 'bg-pink-600 hover:bg-pink-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}
            >
              {user.tier === plan.id ? 'Active' : 'Initialize Upgrade'}
            </button>
          </div>
        ))}
      </div>

      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => !isProcessing && setShowCheckout(null)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] p-12 w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-500 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-violet-600 via-pink-500 to-violet-600"></div>
            
            <button 
              onClick={() => setShowCheckout(null)} 
              disabled={isProcessing}
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors disabled:opacity-20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <div className="text-center mb-10">
              <div className="w-20 h-20 bg-violet-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 ring-1 ring-violet-500/20">
                <svg className="w-10 h-10 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <h3 className="text-3xl font-black uppercase tracking-tighter mb-2 italic">Secure Terminal Link</h3>
              <p className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest opacity-60 leading-relaxed max-w-xs mx-auto">
                Authorized access for {showCheckout.name}. <br/> {cycle === 'monthly' ? `$${showCheckout.monthlyPrice}/month` : `$${showCheckout.yearlyPrice}/year`}
              </p>
            </div>

            <div className="space-y-6 mb-10">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/50">
                <div className="flex justify-between items-end pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Protocol Activation</span>
                  <span className="text-2xl font-mono font-black text-violet-600">${cycle === 'monthly' ? showCheckout.monthlyPrice : showCheckout.yearlyPrice}</span>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Provider</label>
                    <div className="flex gap-2">
                      <div className="flex-1 p-3 bg-white dark:bg-slate-950 border border-violet-500 rounded-xl flex items-center justify-center gap-2">
                        <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase italic tracking-widest">STRIPE-GATEWAY</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex gap-4">
                <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-relaxed uppercase tracking-tight">
                  Subscription will automatically renew. You can revoke access at any time from your Alpha Terminal dashboard.
                </p>
              </div>
            </div>

            <button 
              onClick={handleSimulatePayment} 
              disabled={isProcessing}
              className={`w-full py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-4 shadow-2xl ${isProcessing ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-[1.02] active:scale-95'}`}
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-400 rounded-full animate-spin"></div>
                  Validating Transfer...
                </>
              ) : 'Confirm and Link Terminal'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingSection;
