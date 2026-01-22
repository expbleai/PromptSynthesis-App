
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RiccePrompt, AnalysisResult, SavedPrompt } from '../types';
import { analyzeRicce } from '../services/geminiService';

interface PromptBuilderProps {
  data: RiccePrompt;
  onUpdateField: (field: keyof RiccePrompt, value: string) => void;
  onUpdatePrompt?: (data: RiccePrompt) => void;
  onNext: () => void;
  onBack: () => void;
}

const TEMPLATE_STORAGE_KEY = 'promptforge_user_templates';
const MAX_HISTORY = 50;

export const PromptBuilder: React.FC<PromptBuilderProps> = ({ data, onUpdateField, onUpdatePrompt, onNext, onBack }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [appliedImprovements, setAppliedImprovements] = useState<Set<string>>(new Set());
  
  // Template Management State
  const [userTemplates, setUserTemplates] = useState<SavedPrompt[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  // Undo/Redo History State
  const [history, setHistory] = useState<RiccePrompt[]>([data]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isInternalChange = useRef(false);
  const debounceTimer = useRef<number | null>(null);

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

  // Sync prop changes to history with debouncing
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    const currentSnapshot = history[historyIndex];
    if (JSON.stringify(data) === JSON.stringify(currentSnapshot)) return;

    if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(data)));
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        return newHistory;
      });
      setHistoryIndex(prev => Math.min(prev + 1, MAX_HISTORY - 1));
    }, 800);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [data]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetState = history[targetIndex];
      isInternalChange.current = true;
      setHistoryIndex(targetIndex);
      if (onUpdatePrompt) onUpdatePrompt(targetState);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetState = history[targetIndex];
      isInternalChange.current = true;
      setHistoryIndex(targetIndex);
      if (onUpdatePrompt) onUpdatePrompt(targetState);
    }
  };

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

  const confirmSaveTemplate = () => {
    if (!newTemplateName.trim()) return;
    
    const newTemplate: SavedPrompt = {
      id: crypto.randomUUID(),
      name: newTemplateName,
      description: newTemplateDesc,
      data: JSON.parse(JSON.stringify(data)),
      timestamp: Date.now()
    };
    
    const updated = [newTemplate, ...userTemplates];
    setUserTemplates(updated);
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    
    // Reset modal
    setIsSaveModalOpen(false);
    setNewTemplateName('');
    setNewTemplateDesc('');
    setShowTemplates(true); // Open library to show the new item
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return userTemplates;
    const q = searchQuery.toLowerCase();
    return userTemplates.filter(t => 
      t.name.toLowerCase().includes(q) || 
      (t.description && t.description.toLowerCase().includes(q))
    );
  }, [userTemplates, searchQuery]);

  const handleLoadTemplate = (template: SavedPrompt) => {
    if (onUpdatePrompt) {
      onUpdatePrompt(template.data);
    } else {
      Object.keys(template.data).forEach((key) => {
        onUpdateField(key as keyof RiccePrompt, template.data[key as keyof RiccePrompt]);
      });
    }
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

  const applyAllImprovements = () => {
    if (!analysis?.improvements) return;
    
    const newApplied = new Set(appliedImprovements);
    Object.entries(analysis.improvements).forEach(([field, text]) => {
      if (text) {
        onUpdateField(field as keyof RiccePrompt, text);
        newApplied.add(field);
      }
    });
    setAppliedImprovements(newApplied);
  };

  const fields: { key: keyof RiccePrompt; label: string; icon: string; description: string; color: string; accent: string }[] = [
    { key: 'role', label: 'Persona & Role', icon: '👤', description: 'Define the character, professional background, or specific level of expertise the AI should adopt to set the correct tone and perspective.', color: 'border-l-indigo-500', accent: 'text-indigo-600 dark:text-indigo-400' },
    { key: 'instruction', label: 'Primary Task', icon: '📝', description: 'The core objective. Provide a specific, measurable description of exactly what you want the AI to do. Use {{variables}} for dynamic inputs.', color: 'border-l-blue-500', accent: 'text-blue-600 dark:text-blue-400' },
    { key: 'context', label: 'Background Context', icon: '🌍', description: 'Offer background information, target audience details, or the "why" behind the request to ensure the output is relevant and nuanced.', color: 'border-l-purple-500', accent: 'text-purple-600 dark:text-purple-400' },
    { key: 'constraints', label: 'Constraints & Rules', icon: '🚫', description: 'Set clear boundaries, limitations, or "negative constraints" (what NOT to do) such as length limits, structural rules, or style requirements.', color: 'border-l-pink-500', accent: 'text-pink-600 dark:text-pink-400' },
    { key: 'evaluation', label: 'Success Criteria', icon: '✅', description: 'Define what a "perfect" result looks like. Provide few-shot examples, a format template, or success metrics for the AI to hit.', color: 'border-l-green-500', accent: 'text-green-600 dark:text-green-400' },
  ];

  const hasAnyImprovements = analysis && Object.values(analysis.improvements).some(val => !!val);
  const allImprovementsApplied = hasAnyImprovements && Object.keys(analysis!.improvements).filter(k => !!analysis!.improvements[k as keyof RiccePrompt]).every(k => appliedImprovements.has(k));

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white flex items-center gap-2 transition-colors w-fit font-bold text-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
            Dashboard
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setShowTemplates(!showTemplates); setIsSaveModalOpen(false); }}
              className={`text-xs font-black uppercase tracking-[0.25em] px-5 py-2.5 rounded-xl border transition-all ${showTemplates ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500'}`}
            >
              Templates
            </button>
            <button 
              onClick={() => { setIsSaveModalOpen(true); setShowTemplates(false); }}
              className="text-xs font-black uppercase tracking-[0.25em] px-5 py-2.5 rounded-xl bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
            >
              Save New
            </button>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleUndo}
                disabled={historyIndex === 0}
                className="p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 disabled:pointer-events-none transition-all bg-slate-100 dark:bg-slate-800/50"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l5-5m-5 5l5 5" /></svg>
              </button>
              <button 
                onClick={handleRedo}
                disabled={historyIndex === history.length - 1}
                className="p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 disabled:pointer-events-none transition-all bg-slate-100 dark:bg-slate-800/50"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 10H11a8 8 0 00-8 8v2M21 10l-5-5m5 5l-5 5" /></svg>
              </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 px-6 py-3 rounded-xl font-black transition-all text-sm flex items-center gap-3 uppercase tracking-widest shadow-lg shadow-amber-500/5">
            {isAnalyzing ? "AI Analyzing..." : "Meta-Analyze"}
          </button>
          <button onClick={onNext} className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-black transition-all text-sm flex items-center gap-3 shadow-2xl shadow-indigo-600/20 uppercase tracking-widest">
            Test Experiment
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5-5 5" /></svg>
          </button>
        </div>
      </div>

      {/* Save Template Modal */}
      {isSaveModalOpen && (
        <div className="glass-card p-10 rounded-[2.5rem] border-indigo-500 animate-in zoom-in-95 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6)] z-50 relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Save Synthesis Blueprint</h3>
            <button onClick={() => setIsSaveModalOpen(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Template Name</label>
              <input 
                type="text" 
                autoFocus
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Creative Blog Writer v1"
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-lg text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/30 outline-none"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Description (Optional)</label>
              <textarea 
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                placeholder="Briefly describe what this prompt is optimized for..."
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-lg text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/30 outline-none min-h-[120px] resize-none"
              />
            </div>
            <button 
              onClick={confirmSaveTemplate}
              disabled={!newTemplateName.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 disabled:opacity-50 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-[0.3em] transition-all shadow-2xl shadow-indigo-600/30"
            >
              Commit to Library
            </button>
          </div>
        </div>
      )}

      {showTemplates && (
        <div className="glass-card p-8 rounded-[2.5rem] border-indigo-500/40 animate-in slide-in-from-top-4 shadow-2xl relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-6">
            <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Synthesis Library</h3>
            <div className="relative w-full sm:w-96">
              <input 
                type="text" 
                placeholder="Search blueprints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-3.5 text-base text-slate-700 dark:text-slate-200 focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all"
              />
              <svg className="w-6 h-6 absolute left-4 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-slate-400 hover:text-indigo-500">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-20 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem]">
              <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-700 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <p className="text-lg text-slate-500 italic font-medium">
                {searchQuery ? "No matching blueprints found." : "Library is empty. Build a prompt and click 'Save New'."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
              {filteredTemplates.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleLoadTemplate(t)}
                  className="group relative p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] cursor-pointer hover:border-indigo-500 hover:shadow-2xl transition-all shadow-md"
                >
                  <div className="flex flex-col h-full">
                    <h4 className="font-black text-base text-slate-800 dark:text-slate-200 truncate pr-8 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{t.name}</h4>
                    {t.description && (
                      <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed font-semibold flex-1">{t.description}</p>
                    )}
                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-5">
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(t.timestamp).toLocaleDateString()}</span>
                      <button 
                        onClick={(e) => handleDeleteTemplate(t.id, e)} 
                        className="text-slate-300 hover:text-red-500 transition-colors p-1.5"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {analysis && (
        <div className="glass-card border-amber-500/40 p-8 rounded-[2.5rem] animate-in slide-in-from-top-6 shadow-2xl shadow-amber-500/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-amber-700 dark:text-amber-500 font-black flex items-center gap-3 text-lg uppercase tracking-[0.25em]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              AI Critique & Optimization
            </h3>
            <div className="flex items-center gap-5">
              {hasAnyImprovements && !allImprovementsApplied && (
                <button 
                  onClick={applyAllImprovements}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20"
                >
                  Apply All Improvements
                </button>
              )}
              <button onClick={() => setAnalysis(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
          <p className="text-xl text-slate-700 dark:text-indigo-100 mb-10 italic font-semibold leading-relaxed px-4 border-l-4 border-amber-500">"{analysis.feedback}"</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(analysis.improvements).map(([field, text]) => (
              text && (
                <div key={field} className="bg-slate-100 dark:bg-slate-900/60 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-amber-500/50 transition-all hover:shadow-lg">
                  <div>
                    <span className="text-xs font-black uppercase text-amber-600 dark:text-amber-500/70 mb-3 block tracking-widest">Enhanced {field}</span>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-4 font-bold leading-relaxed">{text}</p>
                  </div>
                  <button 
                    onClick={() => applyImprovement(field as keyof RiccePrompt)} 
                    className={`mt-6 text-xs font-black flex items-center gap-2 transition-all uppercase tracking-widest ${appliedImprovements.has(field) ? 'text-green-600 dark:text-green-400 cursor-default' : 'text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/40'}`}
                  >
                    {appliedImprovements.has(field) ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        Applied
                      </>
                    ) : (
                      <>
                        Apply Patch
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7l5 5-5 5" /></svg>
                      </>
                    )}
                  </button>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
        <div className="space-y-10">
          {fields.map(field => (
            <div key={field.key} className={`glass-card p-8 rounded-[2rem] border-l-8 ${field.color} shadow-lg transition-all hover:shadow-xl dark:hover:bg-slate-900/40 relative group`}>
              <div className="flex items-center justify-between mb-6">
                <div className="relative">
                  <label className="text-sm font-black uppercase tracking-[0.3em] text-slate-800 dark:text-slate-200 flex items-center gap-3 cursor-help select-none">
                    <span className="text-2xl">{field.icon}</span> 
                    {field.label}
                    <svg className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </label>
                  
                  {/* High-Fidelity Tooltip - Enlarged */}
                  <div className="absolute bottom-full left-0 mb-5 hidden group-hover:block w-96 p-6 bg-slate-900 dark:bg-slate-800 text-slate-200 text-sm leading-relaxed font-semibold rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] z-[60] border border-slate-700/60 animate-in fade-in zoom-in-95 slide-in-from-bottom-3 pointer-events-none normal-case tracking-normal">
                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-700/60">
                      <span className="text-indigo-400 font-black uppercase tracking-[0.2em] text-xs">Blueprint Guidance</span>
                    </div>
                    {field.description}
                    <div className="absolute top-full left-8 -mt-2 border-[12px] border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                  </div>
                </div>
              </div>

              <textarea
                value={data[field.key]}
                onChange={(e) => onUpdateField(field.key, e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-lg text-slate-900 dark:text-slate-50 focus:ring-4 focus:ring-indigo-500/30 outline-none min-h-[160px] transition-all placeholder:text-slate-400 font-semibold shadow-inner leading-relaxed"
                placeholder={`Formulate the ${field.label.toLowerCase()}...`}
              />
            </div>
          ))}
        </div>

        <div className="hidden lg:block sticky top-12">
          <div className="glass-card rounded-[2.5rem] p-10 border border-indigo-500/30 h-fit shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] dark:shadow-indigo-500/5">
            <h3 className="text-lg font-black mb-10 text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.4em] flex items-center gap-4">
              <span className="w-3 h-3 rounded-full bg-indigo-500 animate-pulse"></span>
              Live Synthesis Preview
            </h3>
            <div className="bg-white dark:bg-slate-950 rounded-[2rem] p-10 font-mono text-sm leading-relaxed border border-slate-200 dark:border-slate-900 whitespace-pre-wrap max-h-[800px] overflow-y-auto custom-scrollbar shadow-inner">
              <div className="mb-10 pb-6 border-b border-slate-100 dark:border-slate-800/80">
                <span className="text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-widest text-xs block mb-3">ROLE persona</span>
                <span className="text-slate-800 dark:text-slate-100 font-bold text-base leading-relaxed">{data.role || '... awaiting input'}</span>
              </div>
              <div className="space-y-10">
                <div>
                  <span className="text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest text-xs block mb-3">core INSTRUCTION</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold text-base leading-relaxed">{data.instruction || '... awaiting input'}</span>
                </div>
                <div>
                  <span className="text-purple-600 dark:text-purple-400 font-black uppercase tracking-widest text-xs block mb-3">global CONTEXT</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold text-base leading-relaxed">{data.context || '... awaiting input'}</span>
                </div>
                <div>
                  <span className="text-pink-600 dark:text-pink-400 font-black uppercase tracking-widest text-xs block mb-3">safety CONSTRAINTS</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold text-base leading-relaxed">{data.constraints || '... awaiting input'}</span>
                </div>
                <div>
                  <span className="text-green-600 dark:text-green-400 font-black uppercase tracking-widest text-xs block mb-3">synthesis EVALUATION</span>
                  <span className="text-slate-800 dark:text-slate-200 font-bold text-base leading-relaxed">{data.evaluation || '... awaiting input'}</span>
                </div>
              </div>
            </div>
            <div className="mt-10 flex items-center gap-5 p-6 bg-indigo-50 dark:bg-indigo-500/10 rounded-[2rem] border border-indigo-200/50 dark:border-indigo-500/20 shadow-sm">
               <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               <p className="text-sm text-indigo-700 dark:text-indigo-300 font-bold leading-relaxed">This architectural blueprint will be strictly followed during the neural synthesis phase.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
