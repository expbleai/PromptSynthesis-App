
import React, { useState, useEffect } from 'react';
import { RiccePrompt, AnalysisResult, SavedPrompt } from '../types';
import { analyzeRicce } from '../services/geminiService';

interface PromptBuilderProps {
  data: RiccePrompt;
  onUpdateField: (field: keyof RiccePrompt, value: string) => void;
  onNext: () => void;
  onBack: () => void;
}

const TEMPLATE_STORAGE_KEY = 'promptforge_user_templates';

export const PromptBuilder: React.FC<PromptBuilderProps> = ({ data, onUpdateField, onNext, onBack }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [appliedImprovements, setAppliedImprovements] = useState<Set<string>>(new Set());
  
  // Template Management State
  const [userTemplates, setUserTemplates] = useState<SavedPrompt[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (stored) {
      try {
        setUserTemplates(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load templates", e);
      }
    }
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAppliedImprovements(new Set());
    try {
      const result = await analyzeRicce(data);
      setAnalysis(result);
    } catch (e) {
      console.error(e);
      alert("Analysis failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAsTemplate = () => {
    const name = window.prompt("Enter a name for this template:");
    if (!name) return;
    
    const newTemplate: SavedPrompt = {
      id: crypto.randomUUID(),
      name,
      data: { ...data },
      timestamp: Date.now()
    };
    
    const updated = [newTemplate, ...userTemplates];
    setUserTemplates(updated);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    alert("Template saved to local library.");
  };

  const handleLoadTemplate = (template: SavedPrompt) => {
    Object.keys(template.data).forEach((key) => {
      onUpdateField(key as keyof RiccePrompt, template.data[key as keyof RiccePrompt]);
    });
    setShowTemplates(false);
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this template?")) return;
    const updated = userTemplates.filter(t => t.id !== id);
    setUserTemplates(updated);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
  };

  const applyImprovement = (field: keyof RiccePrompt) => {
    if (analysis?.improvements[field]) {
      onUpdateField(field, analysis.improvements[field] as string);
      setAppliedImprovements(prev => {
        const next = new Set(prev);
        next.add(field);
        return next;
      });
    }
  };

  const fields: { key: keyof RiccePrompt; label: string; icon: string; description: string; color: string; accent: string }[] = [
    { key: 'role', label: 'Persona & Role', icon: '👤', description: 'Define the character, professional background, or specific level of expertise the AI should adopt to set the correct tone and perspective.', color: 'border-l-indigo-500', accent: 'text-indigo-600 dark:text-indigo-400' },
    { key: 'instruction', label: 'Primary Task', icon: '📝', description: 'The core objective. Provide a specific, measurable description of exactly what you want the AI to do. Use {{variables}} for dynamic inputs.', color: 'border-l-blue-500', accent: 'text-blue-600 dark:text-blue-400' },
    { key: 'context', label: 'Background Context', icon: '🌍', description: 'Offer background information, target audience details, or the "why" behind the request to ensure the output is relevant and nuanced.', color: 'border-l-purple-500', accent: 'text-purple-600 dark:text-purple-400' },
    { key: 'constraints', label: 'Constraints & Rules', icon: '🚫', description: 'Set clear boundaries, limitations, or "negative constraints" (what NOT to do) such as length limits, structural rules, or style requirements.', color: 'border-l-pink-500', accent: 'text-pink-600 dark:text-pink-400' },
    { key: 'evaluation', label: 'Success Criteria', icon: '✅', description: 'Define what a "perfect" result looks like. Provide few-shot examples, a format template, or success metrics for the AI to hit.', color: 'border-l-green-500', accent: 'text-green-600 dark:text-green-400' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white flex items-center gap-1 transition-colors w-fit font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            Dashboard
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowTemplates(!showTemplates)}
              className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all ${showTemplates ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500'}`}
            >
              Templates
            </button>
            <button 
              onClick={handleSaveAsTemplate}
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500 transition-all"
            >
              Save New
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 px-4 py-2 rounded-lg font-bold transition-all text-xs flex items-center gap-2 uppercase tracking-tight shadow-sm">
            {isAnalyzing ? "AI Analyzing..." : "Meta-Analyze"}
          </button>
          <button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-black transition-all text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 uppercase tracking-widest">
            Test Experiment
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5-5 5" /></svg>
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="glass-card p-6 rounded-2xl border-indigo-500/30 animate-in slide-in-from-top-2 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Custom Template Library</h3>
            <button onClick={() => setShowTemplates(false)} className="text-slate-400 hover:text-white transition-colors">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {userTemplates.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic py-2">No custom templates saved. Build a prompt and click "Save New" to store it here.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
              {userTemplates.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleLoadTemplate(t)}
                  className="group relative p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer hover:border-indigo-500 transition-all shadow-sm"
                >
                  <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate pr-6">{t.name}</h4>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{new Date(t.timestamp).toLocaleDateString()}</p>
                  <button 
                    onClick={(e) => handleDeleteTemplate(t.id, e)} 
                    className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div className="glass-card border-amber-500/30 p-6 rounded-2xl animate-in slide-in-from-top-4 shadow-xl shadow-amber-500/5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-amber-700 dark:text-amber-500 font-extrabold flex items-center gap-2 text-sm uppercase tracking-widest">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              AI Critique & Optimization
            </h3>
            <button onClick={() => setAnalysis(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <p className="text-sm text-slate-700 dark:text-indigo-200 mb-6 italic font-medium leading-relaxed">"{analysis.feedback}"</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analysis.improvements).map(([field, text]) => (
              text && (
                <div key={field} className="bg-slate-100 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-amber-500/30 transition-colors">
                  <div>
                    <span className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-500/70 mb-1 block tracking-tighter">Better {field}</span>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 font-medium">{text}</p>
                  </div>
                  <button 
                    onClick={() => applyImprovement(field as keyof RiccePrompt)} 
                    className={`mt-3 text-[10px] font-bold flex items-center gap-1 transition-all ${appliedImprovements.has(field) ? 'text-green-600 dark:text-green-400 cursor-default' : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-2 decoration-indigo-500/30'}`}
                  >
                    {appliedImprovements.has(field) ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                        Improvement Applied
                      </>
                    ) : (
                      <>
                        Apply Improvement
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5-5 5" /></svg>
                      </>
                    )}
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-6">
          {fields.map(field => (
            <div key={field.key} className={`glass-card p-6 rounded-2xl border-l-4 ${field.color} shadow-sm transition-all hover:shadow-md dark:hover:bg-slate-900/40 relative`}>
              <div className="flex items-center justify-between mb-4">
                <div className="group relative">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-help select-none">
                    <span className="text-base">{field.icon}</span> 
                    {field.label}
                    <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </label>
                  
                  {/* High-Fidelity Tooltip */}
                  <div className="absolute bottom-full left-0 mb-3 hidden group-hover:block w-72 p-4 bg-slate-900 dark:bg-slate-800 text-slate-200 text-[11px] leading-relaxed font-medium rounded-2xl shadow-2xl z-[60] border border-slate-700/50 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 pointer-events-none normal-case tracking-normal">
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700/50">
                      <span className="text-indigo-400 font-bold uppercase tracking-tighter">Quick Guidance</span>
                    </div>
                    {field.description}
                    <div className="absolute top-full left-6 -mt-1 border-8 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                  </div>
                </div>
              </div>

              <textarea
                value={data[field.key]}
                onChange={(e) => onUpdateField(field.key, e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/50 outline-none min-h-[120px] transition-all placeholder:text-slate-400 font-medium shadow-inner"
                placeholder={`Formulate the ${field.label.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>

        <div className="hidden lg:block sticky top-8">
          <div className="glass-card rounded-2xl p-6 border border-indigo-500/20 h-fit shadow-2xl dark:shadow-indigo-500/5">
            <h3 className="text-sm font-black mb-6 text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Synthesis Blueprint
            </h3>
            <div className="bg-white dark:bg-slate-950 rounded-xl p-6 font-mono text-xs leading-relaxed border border-slate-200 dark:border-slate-900 whitespace-pre-wrap max-h-[650px] overflow-y-auto custom-scrollbar shadow-inner">
              <div className="mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <span className="text-indigo-600 dark:text-indigo-400 font-black block mb-1">ROLE</span>
                <span className="text-slate-800 dark:text-slate-100 font-medium">{data.role || '...'}</span>
              </div>
              <div className="space-y-6">
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-black block mb-1">INSTRUCTION</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{data.instruction || '...'}</span>
                </div>
                <div>
                  <span className="text-purple-600 dark:text-purple-400 font-black block mb-1">CONTEXT</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{data.context || '...'}</span>
                </div>
                <div>
                  <span className="text-pink-600 dark:text-pink-400 font-black block mb-1">CONSTRAINTS</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{data.constraints || '...'}</span>
                </div>
                <div>
                  <span className="text-green-600 dark:text-green-400 font-black block mb-1">EVALUATION</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">{data.evaluation || '...'}</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-200/50 dark:border-indigo-500/20">
               <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium">This blueprint will be strictly followed during the synthesis phase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
