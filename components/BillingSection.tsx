
import React from 'react';

const BillingSection: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Elevate Your Edge</h2>
        <p className="text-slate-500 dark:text-slate-400">Unlock advanced AI capabilities and deep backtest replay.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Free Tier */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold">Standard</h3>
            <p className="text-slate-500 text-sm">Basic logging and metrics</p>
          </div>
          <div className="mb-8">
            <span className="text-4xl font-black">$0</span>
            <span className="text-slate-400 text-sm">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            {['Basic Journaling', 'Real-time Stats', 'Market News Grounding', 'Limited AI Chat'].map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {feat}
              </li>
            ))}
          </ul>
          <button className="w-full py-3 rounded-xl font-bold border border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed">
            Current Plan
          </button>
        </div>

        {/* Pro Tier */}
        <div className="relative bg-slate-900 dark:bg-emerald-950 border border-emerald-500/30 rounded-3xl p-8 flex flex-col shadow-2xl shadow-emerald-500/10 overflow-hidden">
          <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
            Recommended
          </div>
          <div className="mb-6 text-white">
            <h3 className="text-lg font-bold">Alpha Pro</h3>
            <p className="opacity-60 text-sm">Full power AI trading stack</p>
          </div>
          <div className="mb-8 text-white">
            <span className="text-4xl font-black">$29</span>
            <span className="opacity-40 text-sm">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1 text-white">
            {['Unlimited AI Deep Audits', 'Historical Replay Simulator', 'Psychology Sentiment Mapping', 'Priority Gemini Pro Access', 'Export to Excel/PDF'].map((feat, i) => (
              <li key={i} className="flex items-center gap-3 text-sm opacity-90">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {feat}
              </li>
            ))}
          </ul>
          <button className="w-full py-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
            Upgrade to Pro
          </button>
        </div>
      </div>

      <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <div>
          <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Billing Documentation</h4>
          <p className="text-xs text-blue-600 dark:text-blue-400">Payments are processed via Stripe secure gateway. View billing docs at <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline font-bold">ai.google.dev/gemini-api/docs/billing</a></p>
        </div>
      </div>
    </div>
  );
};

export default BillingSection;
