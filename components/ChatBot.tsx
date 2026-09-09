
import React, { useState, useRef, useEffect } from 'react';
import { Gateway } from '@/services/geminiService';
import { ChatMessage, SubscriptionTier, User } from '@/types';

interface ChatBotProps {
  user: User;
}

const ChatBot: React.FC<ChatBotProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (): Promise<void> => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: Date.now() };
    const newHistory = [...messages, userMsg];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const sdkFormattedHistory = newHistory.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const chatRes = await Gateway.chat(sdkFormattedHistory, thinkingMode);
      const responseText = typeof chatRes === 'string' ? chatRes : chatRes.text;
      const aiMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error: unknown) {
      const err = error as Error;
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: err.message || "Data stream interrupted.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-80 md:w-96 shadow-2xl flex flex-col h-[500px] transition-all duration-300">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-[10px] uppercase">Alpha</span>
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Strategic Mentor</h4>
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${thinkingMode ? 'bg-amber-500' : 'bg-violet-500'}`}></span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {thinkingMode ? 'Deep Intelligence' : `${user.tier} plan · Synced`}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-400 dark:text-slate-500 text-sm italic">Connect with Alpha. Ask about market technicals or strategy refinements.</p>
              </div>
            )}
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'bg-violet-600 text-white rounded-tr-none shadow-sm' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-700'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 animate-pulse text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-widest">
                  {thinkingMode ? 'Neural Processing...' : 'Alpha Thinking...'}
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between px-1">
              <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={thinkingMode} 
                  onChange={(e) => setThinkingMode(e.target.checked)} 
                  className="w-3 h-3 accent-violet-600"
                />
                Deep Thinking Mode
              </label>
              <span className="text-[8px] font-bold text-slate-400 uppercase italic">
                {thinkingMode ? 'Gemini 3.1 Pro (Thinking)' : 'Gemini 3.6 Flash'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Query Mentor..."
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none transition-all"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 p-2 rounded-lg text-white transition-all shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-violet-600 hover:bg-violet-500 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-violet-600/30 transition-all hover:scale-110 active:scale-95"
        >
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>
      )}
    </div>
  );
};

export default ChatBot;
