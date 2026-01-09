
import React, { useState, useCallback, useMemo } from 'react';
import { RiccePrompt, AppStep } from './types';
import { Header } from './components/Header';
import { PromptBuilder } from './components/PromptBuilder';
import { PromptTester } from './components/PromptTester';
import { ImageLab } from './components/ImageLab';
import { ChatBot } from './components/ChatBot';
import { refinePrompt } from './services/geminiService';

const TEMPLATES = [
  {
    title: "Senior Code Architect",
    icon: "💻",
    description: "Expert persona for technical reviews and architectural reasoning.",
    data: {
      role: "Senior Software Architect specializing in high-concurrency Node.js systems and distributed databases.",
      instruction: "Review the attached {{code_block}} for potential race conditions and suggest architectural refactors to improve scalability.",
      context: "This system handles 50k requests/second during peak hours and currently experiences occasional deadlocks in the Redis adapter.",
      constraints: "Provide deep technical justification. Use Markdown. Focus on the CAP theorem trade-offs.",
      evaluation: "The output is successful if it identifies the specific lock contention point and provides a working pseudo-code solution."
    }
  },
  {
    title: "Creative Copy Strategist",
    icon: "✍️",
    description: "Specialized in luxury brand storytelling and high-conversion copy.",
    data: {
      role: "Direct Response Copywriter with 20 years of experience in luxury brand storytelling.",
      instruction: "Draft 3 variations of a high-converting email sequence for a new premium product called {{product_name}}.",
      context: "The target audience is HNWIs (High Net Worth Individuals) who value exclusivity and sustainable craftsmanship over price.",
      constraints: "Maintain a sophisticated, understated tone. Do not use 'Buy Now' buttons; use 'Request Invitation'. Max 150 words per email.",
      evaluation: "Success is measured by the use of emotional triggers related to legacy and quality, without sounding 'salesy'."
    }
  },
  {
    title: "Logic & Reasoning Tutor",
    icon: "🧩",
    description: "Deep deconstruction of arguments and formal logic analysis.",
    data: {
      role: "Professor of Formal Logic and Analytical Philosophy.",
      instruction: "Deconstruct the following argument: {{argument_text}}. Identify logical fallacies and hidden premises.",
      context: "This is for a graduate-level seminar on critical thinking. Students have already mastered basic propositional logic.",
      constraints: "Use standard logical notation where applicable. Be rigorous but pedagogical. List fallacies by their Latin names.",
      evaluation: "A perfect response identifies at least two informal fallacies and maps the syllogistic structure correctly."
    }
  }
];

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

  const handleApplyTemplate = (data: RiccePrompt) => {
    setPromptData(data);
    setStep(AppStep.BUILDER);
  };

  const handleUpdateField = (field: keyof RiccePrompt, value: string) => {
    setPromptData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8 bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <div className="w-full max-w-5xl">
        <Header />

        <main className="mt-8 space-y-8">
          {step === AppStep.INITIAL && (
            <div className="flex flex-col items-center justify-center space-y-12 text-center py-8 animate-in fade-in duration-700">
              <div className="space-y-6">
                <h2 className="text-5xl md:text-7xl font-bold max-w-4xl leading-tight">
                  Master the Art of <span className="gradient-text">Precision Prompting</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">
                  Transform vague ideas into professional, high-impact commands using state-of-the-art Gemini intelligence.
                </p>
              </div>

              <div className="w-full max-w-3xl relative mt-8">
                <div className="absolute -top-3 left-6 bg-slate-50 dark:bg-[#0f172a] px-2 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] z-10">
                  Quick Start Refiner
                </div>
                <textarea
                  value={vagueInput}
                  onChange={(e) => setVagueInput(e.target.value)}
                  placeholder="Paste a vague idea here (e.g., 'write a blog post about coffee') to automatically build a professional RICCE prompt..."
                  className="w-full bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl p-8 pr-24 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all outline-none min-h-[180px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] resize-none text-lg leading-relaxed placeholder:text-slate-400 dark:placeholder:text-slate-600"
                />
                <button
                  onClick={handleRefine}
                  disabled={isRefining || !vagueInput.trim()}
                  className="absolute bottom-6 right-6 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-8 py-3 rounded-2xl font-bold transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  {isRefining ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Synthesizing...
                    </>
                  ) : (
                    <>
                      Refine
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5-5 5M6 7l5 5-5 5" /></svg>
                    </>
                  )}
                </button>
              </div>

              <div className="w-full space-y-6 mt-12">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Expert Blueprints</h3>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800 ml-4"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {TEMPLATES.map((t, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleApplyTemplate(t.data)}
                      className="group text-left p-6 bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 rounded-3xl hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all animate-in slide-in-from-bottom-2 duration-500"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-center gap-4 mb-3">
                        <span className="text-3xl group-hover:scale-110 transition-transform">{t.icon}</span>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-500 transition-colors">{t.title}</h4>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{t.description}</p>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-8 opacity-40 grayscale pointer-events-none mt-12">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500">RICCE Framework Enabled</span>
                <span className="text-xs font-mono uppercase tracking-widest text-slate-500">Gemini 3 Pro Powered</span>
              </div>
            </div>
          )}

          {step === AppStep.BUILDER && (
            <PromptBuilder 
              data={promptData} 
              onUpdateField={handleUpdateField} 
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

          {step === AppStep.IMAGE_LAB && (
            <ImageLab 
              onBack={() => setStep(AppStep.INITIAL)} 
            />
          )}
        </main>
      </div>

      <ChatBot />
    </div>
  );
};

export default App;
