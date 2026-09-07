import React, { useState, useRef } from 'react';
import { analyzeTradeChart } from '@/services/geminiService';
import { ChartAnalysisResult } from '@/types';

const ChartAnalyzer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [analysis, setAnalysis] = useState<ChartAnalysisResult | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setMimeType(file.type);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        setSelectedImage(base64String);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleAnalyze = async (): Promise<void> => {
    if (!selectedImage || !mimeType) return;
    setLoading(true);
    try {
      const result = await analyzeTradeChart(selectedImage, mimeType);
      setAnalysis(result);
    } catch (error: unknown) {
      const err = error as Error;
      setAnalysis(`[PROTOCOL_ERROR] ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isStructuredResult = (res: any): res is ChartAnalysisResult => {
    return typeof res === 'object' && res !== null && 'marketStructure' in res;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex-1">
          <h3 className="text-3xl font-black mb-2 flex items-center gap-4 uppercase tracking-tighter italic">
            Alpha Vision Core
          </h3>
          <p className="opacity-60 text-[10px] font-black uppercase tracking-[0.3em]">
            Institutional Computer Vision Uplink Active (Gemini 3.6 Flash)
          </p>
        </div>
        <button 
          onClick={() => fileInputRef.current?.click()} 
          className="bg-white text-slate-900 px-10 py-5 rounded-3xl font-black text-[11px] uppercase tracking-[0.3em] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 shadow-xl"
        >
          Initialize Scan
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm min-h-[500px]">
          <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
            <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-400 italic">Visual Buffer</h4>
            {selectedImage && (
              <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">Image Loaded</span>
            )}
          </div>
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`p-10 flex flex-col items-center justify-center h-full relative transition-colors ${
              isDragging ? 'bg-violet-500/10 border-2 border-dashed border-violet-500' : ''
            }`}
          >
            {selectedImage ? (
              <div className="w-full flex flex-col items-center gap-8">
                <div className="relative group">
                  <div className="absolute inset-0 bg-violet-600/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>
                  <img src={`data:${mimeType};base64,${selectedImage}`} alt="Scan" className="max-w-full max-h-[350px] rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 object-contain relative z-10" />
                </div>
                {!loading && (
                  <button onClick={handleAnalyze} className="bg-violet-600 hover:bg-violet-500 text-white font-black px-12 py-5 rounded-3xl text-[11px] uppercase tracking-[0.4em] shadow-2xl shadow-violet-600/20 active:scale-95 transition-all">
                    Start AI Diagnostic
                  </button>
                )}
              </div>
            ) : (
              <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer group flex flex-col items-center py-20 px-10">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mb-8 group-hover:bg-violet-500 transition-all group-hover:scale-110">
                   <svg className="w-10 h-10 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 opacity-60">Awaiting Visual Input (Drag & Drop or Click)</p>
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-12 text-center animate-in fade-in">
                <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-8 shadow-2xl shadow-violet-600/20"></div>
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-violet-600 animate-pulse">Running Vision Diagnostic...</p>
                <p className="text-[9px] font-bold uppercase text-slate-400 mt-4 tracking-widest max-w-[240px] leading-relaxed">Extracting market structure, support/resistance, and invalidation...</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-10 shadow-sm min-h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
            <h4 className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-400 italic">Structured Technical Output</h4>
            {isStructuredResult(analysis) && (
              <span className="text-[9px] font-bold px-3 py-1 bg-violet-500/10 text-violet-500 rounded-full uppercase tracking-wider">
                {analysis.symbol || 'Instrument'} · {analysis.timeframe || 'Timeframe'}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {analysis ? (
              typeof analysis === 'string' ? (
                <div className="prose prose-slate dark:prose-invert max-w-none text-sm font-bold tracking-tight leading-relaxed opacity-90 animate-in slide-in-from-bottom-2">
                  {analysis.includes('[PROTOCOL_ERROR]') ? (
                    <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-3xl">
                       <p className="text-rose-500 uppercase tracking-widest text-[11px] mb-2 font-black">Quota / Access Restricted</p>
                       <p className="text-slate-500 dark:text-slate-400 font-medium italic leading-relaxed">{analysis.replace('[PROTOCOL_ERROR] ', '')}</p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{analysis}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 text-slate-800 dark:text-slate-200">
                  {/* Top Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Market Structure</span>
                      <span className="font-extrabold text-xs tracking-tight text-violet-600 dark:text-violet-400">{analysis.marketStructure}</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Trend Direction</span>
                      <span className={`font-extrabold text-xs tracking-tight ${
                        analysis.trend.toLowerCase().includes('bull') ? 'text-emerald-500' :
                        analysis.trend.toLowerCase().includes('bear') ? 'text-rose-500' : 'text-amber-500'
                      }`}>{analysis.trend}</span>
                    </div>
                  </div>

                  {/* Support & Resistance Levels */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Key Support Levels</span>
                      <div className="flex flex-wrap gap-2">
                        {analysis.supportLevels?.map((s, idx) => (
                          <span key={idx} className="text-[11px] font-mono font-bold px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Key Resistance Levels</span>
                      <div className="flex flex-wrap gap-2">
                        {analysis.resistanceLevels?.map((r, idx) => (
                          <span key={idx} className="text-[11px] font-mono font-bold px-3 py-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-500/20">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Key Zones & Invalidation */}
                  <div className="space-y-3">
                    {analysis.keyZones && analysis.keyZones.length > 0 && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-1">Key Order / Liquidity Zones</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {analysis.keyZones.map((zone, idx) => (
                            <span key={idx} className="text-[10px] font-medium px-2.5 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-300 rounded-lg">
                              {zone}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block mb-1">Invalidation Threshold</span>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{analysis.invalidation}</p>
                    </div>
                  </div>

                  {/* Observations */}
                  {analysis.observations && analysis.observations.length > 0 && (
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 block mb-2">Key Technical Observations</span>
                      <ul className="space-y-1.5 pl-2">
                        {analysis.observations.map((obs, idx) => (
                          <li key={idx} className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                            <span className="text-violet-500 font-bold">•</span>
                            <span>{obs}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confidence & Probabilistic Disclaimer */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Confidence Metric</span>
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{analysis.confidence}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 italic leading-relaxed">
                      {analysis.disclaimer || 'Probabilistic assessment only. Technical levels represent historical confluence and do not guarantee future price action.'}
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                <div className="w-16 h-1 border-t-2 border-slate-300 dark:border-slate-700 mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em]">Decryption Buffer Empty</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartAnalyzer;
