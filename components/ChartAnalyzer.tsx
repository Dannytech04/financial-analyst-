
import React, { useState, useRef } from 'react';
import { analyzeTradeChart } from '../services/geminiService';

const ChartAnalyzer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        setSelectedImage(base64String);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !mimeType) return;
    setLoading(true);
    try {
      const result = await analyzeTradeChart(selectedImage, mimeType);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      setAnalysis("Technical analysis failed. Please try a different chart screenshot.");
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-emerald-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-600/20 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1">
          <h3 className="text-2xl font-bold mb-2 flex items-center gap-3">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Alpha Vision
          </h3>
          <p className="opacity-80">Upload a chart screenshot. Gemini 3 Pro will identify trends, patterns, and high-probability zones.</p>
        </div>
        <button 
          onClick={triggerFileInput}
          className="bg-white text-emerald-600 px-8 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition-all flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Upload Chart
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col min-h-[400px]">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-sm uppercase tracking-widest text-slate-400">Target Visual</h4>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 relative">
            {selectedImage ? (
              <div className="relative w-full h-full min-h-[300px] flex flex-col items-center gap-6">
                <img 
                  src={`data:${mimeType};base64,${selectedImage}`} 
                  alt="Trading Chart" 
                  className="max-w-full max-h-[400px] rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 object-contain"
                />
                {!loading && !analysis && (
                  <button 
                    onClick={handleAnalyze}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-10 py-3 rounded-xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                  >
                    Initiate Technical Audit
                  </button>
                )}
              </div>
            ) : (
              <div onClick={triggerFileInput} className="flex flex-col items-center justify-center text-center cursor-pointer group opacity-40 hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="font-bold text-xs uppercase tracking-widest text-slate-500">No Image Detected</p>
                <p className="text-[10px] mt-1">Tap to select chart file</p>
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                <p className="text-sm font-bold animate-pulse">Alpha Vision Scanning Chart...</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-2">Pattern Recognition Active</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-sm uppercase tracking-widest text-slate-400">Technical Briefing</h4>
            {analysis && (
              <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded uppercase tracking-[0.2em]">Validated by Gemini 3 Pro</span>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2">
            {analysis ? (
              <div className="prose prose-slate dark:prose-invert prose-sm max-w-none animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="whitespace-pre-wrap leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                  {analysis}
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="font-bold text-sm uppercase tracking-widest">Awaiting Data Stream</p>
                <p className="text-[10px] mt-2 max-w-[200px]">Upload a chart to receive AI-powered technical analysis.</p>
              </div>
            )}
          </div>
          
          {analysis && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={() => { setSelectedImage(null); setAnalysis(null); }}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 uppercase tracking-widest flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Purge Vision Cache
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartAnalyzer;
