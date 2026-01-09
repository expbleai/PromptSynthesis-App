
import React, { useState, useEffect, useRef } from 'react';
import { testPrompt, evaluateOutput } from '../services/geminiService';
import { RiccePrompt, EvaluationResult, SavedPrompt, VariableScenario, PromptHistoryItem } from '../types';

interface PromptTesterProps {
  promptData: RiccePrompt;
  onUpdatePrompt: (data: RiccePrompt) => void;
  onBack: () => void;
}

const STORAGE_KEY = 'promptforge_saved_prompts';
const SCENARIO_KEY = 'promptforge_scenarios';
const HISTORY_KEY = 'promptforge_history';

// Pre-defined presets that align with standard Blueprint variables
const PRESET_SCENARIOS: VariableScenario[] = [
  {
    id: 'preset-code-debug',
    name: 'Buggy Logic (Code)',
    values: { code_block: 'function calculateTotal(price, tax) {\n  // Logical error: adding string tax to number price\n  return price + " tax";\n}' }
  },
  {
    id: 'preset-product-luxury',
    name: 'Luxury Product',
    values: { product_name: 'Aethelgard - Hand-stitched organic silk travel trunks with biometric locks' }
  },
  {
    id: 'preset-logic-paradox',
    name: 'Classical Paradox',
    values: { argument_text: 'This statement is false. If it is true, it must be false; if it is false, it must be true. Therefore, the universe is fundamentally inconsistent.' }
  },
  {
    id: 'preset-code-refactor',
    name: 'Complex Class',
    values: { code_block: 'class UserManager { constructor() { this.users = []; } addUser(u) { if (u) this.users.push(u); } getUsers() { return this.users; } }' }
  }
];

export const PromptTester: React.FC<PromptTesterProps> = ({ promptData, onUpdatePrompt, onBack }) => {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [scenarios, setScenarios] = useState<VariableScenario[]>([]);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');
  const [evalA, setEvalA] = useState<EvaluationResult | null>(null);
  const [evalB, setEvalB] = useState<EvaluationResult | null>(null);
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(0);

  // Panel States
  const [showLibrary, setShowLibrary] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try { setSavedPrompts(JSON.parse(stored)); } catch (e) { console.error(e); }
    }
    const storedScenarios = localStorage.getItem(SCENARIO_KEY);
    if (storedScenarios) {
      try { setScenarios(JSON.parse(storedScenarios)); } catch (e) { console.error(e); }
    }
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      try { setHistory(JSON.parse(storedHistory)); } catch (e) { console.error(e); }
    }
  }, []);

  const detectedVars = Array.from(new Set(
    Object.values(promptData).join(' ').match(/{{(.*?)}}/g)?.map(v => v.replace(/[{}]/g, '')) || []
  ));

  const substituteVars = (text: string) => {
    let result = text;
    Object.entries(variables).forEach(([key, val]) => {
      result = result.split(`{{${key}}}`).join(String(val));
    });
    return result;
  };

  const getFullPrompt = (data: RiccePrompt) => {
    return `Role: ${substituteVars(data.role)}\nInstruction: ${substituteVars(data.instruction)}\nContext: ${substituteVars(data.context)}\nConstraints: ${substituteVars(data.constraints)}\nEvaluation: ${substituteVars(data.evaluation)}`;
  };

  const saveToHistory = (outA: string, outB?: string) => {
    const newItem: PromptHistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      promptData: { ...promptData },
      variables: { ...variables },
      outputA: outA,
      outputB: outB,
      isComparison: isComparisonMode,
    };
    const updated = [newItem, ...history].slice(0, 30); // Keep last 30 runs
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const runTest = async () => {
    setOutputA('');
    setOutputB('');
    setEvalA(null);
    setEvalB(null);
    setIsLoadingA(true);
    if (isComparisonMode) setIsLoadingB(true);

    let finalA = "";
    let finalB = "";

    const full = getFullPrompt(promptData);
    const promptToRun = thinkingBudget > 0 ? `${full}\nThink step-by-step.` : full;

    try {
      const promiseA = testPrompt(promptToRun, (chunk) => {
        finalA += chunk;
        setOutputA(prev => prev + chunk);
      }, thinkingBudget);

      let promiseB = Promise.resolve();
      if (isComparisonMode) {
        promiseB = testPrompt(promptToRun, (chunk) => {
          finalB += chunk;
          setOutputB(prev => prev + chunk);
        }, thinkingBudget);
      }

      await Promise.all([promiseA, promiseB]);
      saveToHistory(finalA, isComparisonMode ? finalB : undefined);
    } catch (err: any) {
      console.error(err);
      alert("Error during execution.");
    } finally {
      setIsLoadingA(false);
      setIsLoadingB(false);
    }
  };

  const handleEvaluateAll = async () => {
    setIsEvaluating(true);
    try {
      if (outputA) {
        const resA = await evaluateOutput(promptData, outputA);
        setEvalA(resA);
      }
      if (isComparisonMode && outputB) {
        const resB = await evaluateOutput(promptData, outputB);
        setEvalB(resB);
      }
    } catch (e) {
      console.error(e);
      alert("Evaluation failed.");
    } finally {
      setIsEvaluating(false);
    }
  };

  // Logic Matrix Management
  const handleSaveScenario = () => {
    const name = window.prompt("Enter name for this Variable Scenario:");
    if (!name) return;
    const newScenario: VariableScenario = { id: crypto.randomUUID(), name, values: { ...variables } };
    const updated = [newScenario, ...scenarios];
    setScenarios(updated);
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(updated));
  };

  const handleLoadScenario = (scenario: VariableScenario) => {
    // Only load variables that are actually present in the current prompt to avoid state pollution
    const relevantValues = Object.fromEntries(
      Object.entries(scenario.values).filter(([k]) => detectedVars.includes(k))
    );
    setVariables(prev => ({ ...prev, ...relevantValues }));
  };

  const handleDeleteScenario = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = scenarios.filter(s => s.id !== id);
    setScenarios(updated);
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(updated));
  };

  const handleSave = () => {
    const name = window.prompt("Enter a name for this synthesis:");
    if (!name) return;
    const newSaved = { id: crypto.randomUUID(), name, data: { ...promptData }, timestamp: Date.now() };
    const updated = [newSaved, ...savedPrompts];
    setSavedPrompts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleLoad = (data: RiccePrompt) => {
    onUpdatePrompt(data);
    setShowLibrary(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedPrompts.filter(p => p.id !== id);
    setSavedPrompts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleReloadHistory = (item: PromptHistoryItem) => {
    onUpdatePrompt(item.promptData);
    setVariables(item.variables);
    setOutputA(item.outputA);
    setOutputB(item.outputB || '');
    setIsComparisonMode(item.isComparison);
    setEvalA(null);
    setEvalB(null);
    setShowHistory(false);
  };

  const clearHistory = () => {
    if (window.confirm("Clear all experiment history?")) {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-6">
          {/* Management Actions */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white flex items-center gap-1 transition-colors font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              Blueprint
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setShowLibrary(!showLibrary); setShowHistory(false); }} className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm border ${showLibrary ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500'}`}>
                Library
              </button>
              <button onClick={() => { setShowHistory(!showHistory); setShowLibrary(false); }} className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all shadow-sm border ${showHistory ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500'}`}>
                History
              </button>
              <button onClick={handleSave} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-bold transition-all text-[10px] uppercase tracking-widest shadow-sm hover:border-indigo-500">
                Save
              </button>
            </div>
          </div>

          {/* Test & Execution Controls (Separated) */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-end bg-slate-100 dark:bg-slate-900/50 p-2 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <label className="text-[9px] uppercase font-black text-slate-400 px-2">Thinking</label>
              <select 
                value={thinkingBudget}
                onChange={(e) => setThinkingBudget(Number(e.target.value))}
                className="bg-transparent text-[10px] font-black text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-4 uppercase tracking-widest"
              >
                <option value={0}>OFF</option>
                <option value={5000}>5K</option>
                <option value={15000}>15K</option>
                <option value={24576}>MAX</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsComparisonMode(!isComparisonMode)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all ${isComparisonMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                Contrast
              </button>
              <button 
                onClick={runTest}
                disabled={isLoadingA || isLoadingB}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoadingA || isLoadingB ? "Processing..." : "Run Experiment"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showLibrary && (
        <div className="glass-card p-6 rounded-3xl border-indigo-500/30 animate-in slide-in-from-top-2 shadow-2xl">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Saved Syntheses</h3>
             <button onClick={() => setShowLibrary(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
           </div>
           {savedPrompts.length === 0 ? (
             <p className="text-slate-500 text-xs italic py-4">No syntheses saved yet.</p>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {savedPrompts.map(p => (
                 <div key={p.id} onClick={() => handleLoad(p.data)} className="relative group p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all shadow-sm">
                   <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate pr-6">{p.name}</h4>
                   <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">{new Date(p.timestamp).toLocaleDateString()}</p>
                   <button onClick={(e) => handleDelete(p.id, e)} className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                 </div>
               ))}
             </div>
           )}
        </div>
      )}

      {showHistory && (
        <div className="glass-card p-6 rounded-3xl border-indigo-500/30 animate-in slide-in-from-top-2 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Recent Experiments</h3>
            <div className="flex items-center gap-3">
              <button onClick={clearHistory} className="text-[10px] font-bold text-red-500 hover:text-red-600 uppercase tracking-widest">Clear History</button>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          </div>
          {history.length === 0 ? (
            <p className="text-slate-500 text-xs italic py-4">No experiments logged yet.</p>
          ) : (
            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {history.map(item => (
                <div key={item.id} onClick={() => handleReloadHistory(item)} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:border-indigo-500 transition-all flex items-center justify-between group shadow-sm">
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{new Date(item.timestamp).toLocaleString()}</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium max-w-md">Prompt: {item.promptData.role} - {item.promptData.instruction}</p>
                    <div className="flex gap-2">
                       {Object.keys(item.variables).length > 0 && (
                         <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold">VARS: {Object.keys(item.variables).join(', ')}</span>
                       )}
                       {item.isComparison && (
                         <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded font-bold uppercase tracking-widest">Contrast Run</span>
                       )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest">Reload</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5-5 5" /></svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Blueprint Preview - Always Visible in Tester */}
      <div className="space-y-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">Active Synthesis Blueprint</h3>
        <div className={`grid gap-8 ${isComparisonMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} animate-in fade-in duration-500`}>
           <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 relative group shadow-sm">
             <span className="text-[10px] font-black uppercase text-indigo-500 mb-3 block tracking-widest">{isComparisonMode ? 'Baseline Blueprint' : 'Full Synthesis Blueprint'}</span>
             <button onClick={() => copyToClipboard(getFullPrompt(promptData))} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-500 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
             </button>
             <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto custom-scrollbar pr-4">
               {getFullPrompt(promptData)}
             </div>
           </div>
           {isComparisonMode && (
             <div className="glass-card p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 relative group shadow-sm">
               <span className="text-[10px] font-black uppercase text-indigo-500 mb-3 block tracking-widest">Challenger Blueprint</span>
               <button onClick={() => copyToClipboard(getFullPrompt(promptData))} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-500 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
               </button>
               <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[180px] overflow-y-auto custom-scrollbar pr-4">
                 {getFullPrompt(promptData)}
                 {thinkingBudget > 0 && <span className="text-indigo-500 font-bold block mt-3 opacity-80 italic tracking-widest uppercase text-[9px]">Thinking Enabled: {thinkingBudget} tokens</span>}
               </div>
             </div>
           )}
        </div>
      </div>

      {detectedVars.length > 0 && (
        <div className="glass-card p-8 rounded-[2.5rem] border-indigo-500/20 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-700 dark:text-indigo-400">Variable Matrix</h3>
            
            <div className="flex flex-col items-end gap-3">
               <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_SCENARIOS.filter(p => Object.keys(p.values).some(v => detectedVars.includes(v))).map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleLoadScenario(p)}
                        className="bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-full px-3 py-1 text-[10px] font-bold border border-amber-100 dark:border-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all flex items-center gap-1.5"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        {p.name}
                      </button>
                    ))}
                  </div>
               </div>

               <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custom:</span>
                  <div className="flex flex-wrap gap-2">
                    {scenarios.map(s => (
                      <div key={s.id} className="group relative flex items-center bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full px-3 py-1 text-[10px] font-bold border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 transition-all cursor-pointer" onClick={() => handleLoadScenario(s)}>
                        {s.name}
                        <button onClick={(e) => handleDeleteScenario(s.id, e)} className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500 text-sm">×</button>
                      </div>
                    ))}
                    <button onClick={handleSaveScenario} className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full px-4 py-1 text-[10px] font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition-all">+ New Scenario</button>
                  </div>
               </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {detectedVars.map(v => (
              <div key={v} className="space-y-2">
                <label className="text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest pl-1">{v}</label>
                <textarea 
                  value={variables[v] || ''}
                  onChange={(e) => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-indigo-500/50 outline-none font-medium transition-all shadow-inner min-h-[100px] resize-none"
                  placeholder={`Value for {{${v}}}...`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-8 ${isComparisonMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        <OutputPane label={isComparisonMode ? "Baseline Synthesis" : "Result Engine"} output={outputA} isLoading={isLoadingA} evalResult={evalA} onCopy={() => copyToClipboard(outputA)} />
        {isComparisonMode && <OutputPane label="Challenger Synthesis" output={outputB} isLoading={isLoadingB} evalResult={evalB} onCopy={() => copyToClipboard(outputB)} />}
      </div>

      {(outputA || outputB) && !isEvaluating && !evalA && !evalB && (
        <div className="flex justify-center pt-8">
          <button onClick={handleEvaluateAll} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-indigo-600 dark:text-indigo-400 px-10 py-5 rounded-[2rem] border-2 border-indigo-500/30 dark:border-indigo-500/40 font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-500/10 flex items-center gap-4 active:scale-95 group">
            <svg className="w-6 h-6 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Trigger Logic Audit
          </button>
        </div>
      )}
      {isEvaluating && (
         <div className="flex flex-col items-center gap-4 py-12">
            <div className="flex gap-3"><div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce"></div><div className="w-4 h-4 bg-purple-500 rounded-full animate-bounce [animation-delay:0.1s]"></div><div className="w-4 h-4 bg-pink-500 rounded-full animate-bounce [animation-delay:0.2s]"></div></div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Auditing Synthesis Logic...</p>
         </div>
      )}
    </div>
  );
};

const OutputPane = ({ label, output, isLoading, evalResult, onCopy }: { label: string, output: string, isLoading: boolean, evalResult: EvaluationResult | null, onCopy: () => void }) => {
  const downloadOutput = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `experiment-result-${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-card p-8 rounded-[2.5rem] flex flex-col min-h-[550px] border border-slate-200 dark:border-slate-800 shadow-2xl relative transition-all hover:border-indigo-500/30">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800/60">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{label}</h3>
        <div className="flex items-center gap-2">
          {output && !isLoading && (
            <><button onClick={onCopy} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></button>
            <button onClick={downloadOutput} className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-xl transition-all"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button></>
          )}
          {evalResult && (
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border ${evalResult.score >= 80 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400' : evalResult.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400'}`}>SCORE: {evalResult.score}/100</div>
          )}
        </div>
      </div>
      <div className="flex-1 bg-white/50 dark:bg-slate-950/80 rounded-3xl p-8 text-slate-800 dark:text-slate-200 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed border border-slate-100 dark:border-slate-900 shadow-inner font-medium custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-6 py-24">
             <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
             <div className="space-y-2 text-center"><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Processing Vectors</p><p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Synthesizing intelligence...</p></div>
          </div>
        ) : output ? ( output ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 italic text-center px-12 py-24"><svg className="w-16 h-16 mb-6 opacity-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg><p className="text-sm font-bold uppercase tracking-widest opacity-20">Awaiting Signal</p></div>
        )}
      </div>
      {evalResult && (
        <div className="mt-6 p-6 bg-white dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-500/20 space-y-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl"><svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg></div>
            <div className="space-y-1"><span className="text-[9px] font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-[0.2em]">Audit Summary</span><p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-semibold italic">"{evalResult.critique}"</p></div>
          </div>
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-5">
             <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">Strategic Refinements</span>
             <div className="space-y-2">{evalResult.suggestions.map((s, idx) => (<div key={idx} className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-medium bg-slate-50 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800/40"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>{s}</div>))}</div>
          </div>
        </div>
      )}
    </div>
  );
};
