
import React, { useState, useCallback, useMemo } from 'react';
import { RiccePrompt, AppStep } from './types';
import { Header } from './components/Header';
import { PromptBuilder } from './components/PromptBuilder';
import { PromptTester } from './components/PromptTester';
import { ImageLab } from './components/ImageLab';
import { ChatBot } from './components/ChatBot';
import { PromptChainer } from './components/PromptChainer';
import { refinePrompt } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.INITIAL);
  const [promptData, setPromptData] = useState<RiccePrompt>({
    role: '',
    instruction: '',
    context: '',
    constraints: '',
    evaluation: ''
  });
  const [isRefining, setIsRefining] = useState(false);
  const [vagueInput, setVagueInput] = useState('');

  const handleRefine = async () => {
    if (!vagueInput.trim()) return;
    setIsRefining(true);
    try {
      const refined = await refinePrompt(vagueInput);
      setPromptData(refined);
      setStep(AppStep.BUILDER);
    } catch (error) {
      console.error("Refinement error:", error);
      alert("Something went wrong refining your prompt. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  const handleUpdateField = (field: keyof RiccePrompt, value: string) => {
    setPromptData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 md:p-12 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="w-full max-w-6xl">
        <Header />

        <main className="mt-12 space-y-12">
          {step === AppStep.INITIAL && (
            <div className="flex flex-col items-center justify-center space-y-16 text-center py-8 animate-in fade-in duration-700">
              <div className="space-y-8">
                <h2 className="text-6xl md:text-8xl font-black max-w-5xl leading-tight tracking-tight">
                  LLM <span className="gradient-text">System Synthesis</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
                  Transform vague ideas into high-fidelity <strong>System Instructions</strong> ready to upload to ChatGPT, Claude, or Gemini.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-6">
                 <button 
                  onClick={() => setStep(AppStep.CHAINER)}
                  className="bg-purple-600 hover:bg-purple-500 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-purple-600/20 transition-all flex items-center gap-4 active:scale-95"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                   Chain Architect
                 </button>
                 <button 
                  onClick={() => setStep(AppStep.IMAGE_LAB)}
                  className="bg-amber-600 hover:bg-amber-500 text-white px-10 py-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-amber-600/20 transition-all flex items-center gap-4 active:scale-95"
                 >
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                   Vision Lab
                 </button>
              </div>

              <div className="w-full max-w-4xl relative mt-8">
                <div className="absolute -top-4 left-8 bg-slate-50 dark:bg-[#0f172a] px-3 text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.25em] z-10">
                  Instruction Generator
                </div>
                <textarea
                  value={vagueInput}
                  onChange={(e) => setVagueInput(e.target.value)}
                  placeholder="Paste a vague idea (e.g., 'help me write a Python script for web scraping') to generate a professional system instruction..."
                  className="w-full bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-[2.5rem] p-10 pr-32 text-slate-900 dark:text-white focus:ring-4 focus:ring-indigo-500/30 focus:border-transparent transition-all outline-none min-h-[220px] shadow-[0_20px_60px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.4)] resize-none text-xl leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
                <button
                  onClick={handleRefine}
                  disabled={isRefining || !vagueInput.trim()}
                  className="absolute bottom-8 right-8 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-10 py-4 rounded-2xl font-black text-sm transition-all flex items-center gap-4 shadow-2xl shadow-indigo-600/20 active:scale-95"
                >
                  {isRefining ? (
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <>
                      Synthesize
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-12 opacity-50 grayscale pointer-events-none mt-20">
                <span className="text-sm font-mono font-bold uppercase tracking-[0.3em] text-slate-500">RICCE Framework Enabled</span>
                <span className="text-sm font-mono font-bold uppercase tracking-[0.3em] text-slate-500">Gemini 3 Pro Powered</span>
              </div>
            </div>
          )}

          {step === AppStep.BUILDER && (
            <PromptBuilder 
              data={promptData} 
              onUpdateField={handleUpdateField} 
              onUpdatePrompt={(data) => setPromptData(data)}
              onNext={() => setStep(AppStep.TESTING)}
              onBack={() => setStep(AppStep.INITIAL)}
            />
          )}

          {step === AppStep.TESTING && (
            <PromptTester 
              promptData={promptData} 
              onUpdatePrompt={setPromptData}
              onBack={() => setStep(AppStep.BUILDER)} 
            />
          )}

          {step === AppStep.IMAGE_LAB && <ImageLab onBack={() => setStep(AppStep.INITIAL)} />}
          {step === AppStep.CHAINER && <PromptChainer onBack={() => setStep(AppStep.INITIAL)} />}
        </main>
      </div>
      <ChatBot />
    </div>
  );
};

export default App;
