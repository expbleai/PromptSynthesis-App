
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', desc: 'Balanced Speed/IQ', color: 'text-blue-500' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', desc: 'Advanced Reasoning', color: 'text-purple-500' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite', desc: 'Ultra-Fast/Efficient', color: 'text-emerald-500' }
];

const EXTERNAL_PROVIDERS = [
  { name: 'ChatGPT', url: 'https://chatgpt.com', color: 'bg-[#10a37f]', icon: '🤖' },
  { name: 'Claude', url: 'https://claude.ai', color: 'bg-[#d97757]', icon: '📜' },
  { name: 'Perplexity', url: 'https://perplexity.ai', color: 'bg-[#22c55e]', icon: '🔍' }
];

/**
 * SyntaxHighlighting function using regex
 */
const highlightCode = (code: string, lang: string = '') => {
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '<span class="token-string">$&</span>');
  html = html.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, '<span class="token-comment">$&</span>');
  html = html.replace(/\b\d+(\.\d+)?\b/g, '<span class="token-number">$&</span>');
  const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|new|true|false|null|async|await|def|import|as|in|is|None|try|except|finally|public|private|static)\b/g;
  html = html.replace(keywords, '<span class="token-keyword">$&</span>');
  html = html.replace(/[+\-*\/%=&|^<>!]=?/g, '<span class="token-operator">$&</span>');
  return html;
};

const HighFidelityMarkdown: React.FC<{ content: string }> = ({ content }) => {
  const renderedParts = useMemo(() => {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
        const lang = match?.[1] || '';
        const code = match?.[2] || '';
        return (
          <div key={index} className="my-10 group relative">
            <div className="absolute top-0 right-0 px-5 py-2 bg-slate-800/80 rounded-bl-[1.5rem] rounded-tr-[1.5rem] text-xs font-black uppercase text-slate-400 tracking-widest z-10">
              {lang || 'source code'}
            </div>
            <pre className="bg-slate-900/90 dark:bg-black/40 border border-slate-800/50 rounded-[2rem] p-10 overflow-x-auto custom-scrollbar font-mono text-base leading-relaxed shadow-2xl">
              <code dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
            </pre>
          </div>
        );
      }
      let text = part
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>')
        .replace(/^\d\. (.*$)/gim, '<ol><li>$1</li></ol>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n\n/g, '<p></p>')
        .replace(/\n/g, '<br />');
      text = text.replace(/<\/ul><ul>/g, '').replace(/<\/ol><ol>/g, '');
      return (
        <div key={index} className="markdown-content" dangerouslySetInnerHTML={{ __html: text }} />
      );
    });
  }, [content]);
  return <div className="animate-in fade-in slide-in-from-bottom-3 duration-700">{renderedParts}</div>;
};

const WordDiff: React.FC<{ baseline: string; challenger: string; active: boolean }> = ({ baseline, challenger, active }) => {
  const baselineWords = useMemo(() => {
    if (!active) return new Set();
    return new Set(baseline.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:]/g, '')).filter(w => w.length > 1));
  }, [baseline, active]);
  const words = useMemo(() => challenger.split(/(\s+)/), [challenger]);
  if (!active) return <HighFidelityMarkdown content={challenger} />;
  return (
    <div className="whitespace-pre-wrap leading-relaxed text-xl">
      {words.map((part, i) => {
        const cleanWord = part.toLowerCase().replace(/[.,!?;:]/g, '').trim();
        const isSignificant = cleanWord.length > 1;
        const isNew = isSignificant && !baselineWords.has(cleanWord);
        return (
          <span key={i} className={isNew ? "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-200 font-bold px-1 rounded border-b-4 border-indigo-500/50" : ""}>
            {part}
          </span>
        );
      })}
    </div>
  );
};

export const PromptTester: React.FC<PromptTesterProps> = ({ promptData, onUpdatePrompt, onBack }) => {
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [outputA, setOutputA] = useState('');
  const [outputB, setOutputB] = useState('');
  const [modelA, setModelA] = useState(MODELS[0].id);
  const [modelB, setModelB] = useState(MODELS[1].id);
  const [evalA, setEvalA] = useState<EvaluationResult | null>(null);
  const [evalB, setEvalB] = useState<EvaluationResult | null>(null);
  const [isLoadingA, setIsLoadingA] = useState(false);
  const [isLoadingB, setIsLoadingB] = useState(false);
  const [isComparisonMode, setIsComparisonMode] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  const paneARef = useRef<HTMLDivElement>(null);
  const paneBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to load history", e);
      }
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

  const getSystemInstruction = (data: RiccePrompt) => {
    return `# SYSTEM INSTRUCTION
## ROLE
${substituteVars(data.role)}

## PRIMARY TASK
${substituteVars(data.instruction)}

## CONTEXT
${substituteVars(data.context)}

## CONSTRAINTS & RULES
${substituteVars(data.constraints)}

## SUCCESS CRITERIA
${substituteVars(data.evaluation)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 3000);
  };

  const handleExternalTest = (url: string) => {
    window.open(url, '_blank');
  };

  const handleSyncScroll = (e: React.UIEvent<HTMLDivElement>, otherRef: React.RefObject<HTMLDivElement>) => {
    if (!otherRef.current) return;
    otherRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  const saveToHistory = (finalA: string, finalB?: string) => {
    const historyItem: PromptHistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      promptData: JSON.parse(JSON.stringify(promptData)),
      variables: { ...variables },
      outputA: finalA,
      outputB: finalB,
      isComparison: isComparisonMode,
    };
    
    setHistory(prev => {
      const updated = [historyItem, ...prev].slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const runTest = async () => {
    setOutputA('');
    setOutputB('');
    setEvalA(null);
    setEvalB(null);
    setIsLoadingA(true);
    if (isComparisonMode) setIsLoadingB(true);

    const full = getSystemInstruction(promptData);
    
    let currentA = '';
    let currentB = '';

    try {
      const promiseA = testPrompt(full, (chunk) => {
        currentA += chunk;
        setOutputA(currentA);
      }, thinkingBudget, modelA);

      let promiseB = Promise.resolve();
      if (isComparisonMode) {
        promiseB = testPrompt(full, (chunk) => {
          currentB += chunk;
          setOutputB(currentB);
        }, thinkingBudget, modelB);
      }
      
      await Promise.all([promiseA, promiseB]);
      saveToHistory(currentA, isComparisonMode ? currentB : undefined);
    } catch (err: any) {
      console.error(err);
      alert("Error during execution. Check your API key.");
    } finally {
      setIsLoadingA(false);
      setIsLoadingB(false);
    }
  };

  const loadHistoryItem = (item: PromptHistoryItem) => {
    onUpdatePrompt(item.promptData);
    setVariables(item.variables);
    setOutputA(item.outputA);
    setOutputB(item.outputB || '');
    setIsComparisonMode(item.isComparison);
    setShowHistory(false);
  };

  const deleteHistoryItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    if (window.confirm("Permanently clear all synthesis logs?")) {
      setHistory([]);
      localStorage.removeItem(HISTORY_KEY);
    }
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-slate-200 dark:border-slate-800 pb-8">
          <div className="flex items-center gap-6 w-full md:w-auto">
            <button onClick={onBack} className="text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white flex items-center gap-2 transition-colors font-bold text-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              Blueprint
            </button>
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
            <div className="flex items-center gap-3">
               <button 
                onClick={() => copyToClipboard(getSystemInstruction(promptData))}
                className="bg-indigo-600/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"
               >
                 Copy System Instruction
               </button>
               <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm border ${showHistory ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500'}`}
               >
                 History
               </button>
            </div>
          </div>

          <div className="flex items-center gap-6 w-full md:w-auto justify-end bg-slate-100 dark:bg-slate-900/50 p-3 rounded-[2rem] border border-slate-200 dark:border-slate-800">
             <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsComparisonMode(!isComparisonMode)} 
                className={`px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.25em] border transition-all ${isComparisonMode ? 'bg-indigo-600 border-indigo-500 text-white shadow-2xl' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                Model Battle
              </button>
              <button 
                onClick={runTest} 
                disabled={isLoadingA || isLoadingB} 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3 rounded-2xl font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isLoadingA || isLoadingB ? "Synthesizing..." : "Initiate System Pulse"}
              </button>
            </div>
          </div>
        </div>

        {showHistory && (
          <div className="glass-card p-10 rounded-[3rem] border-indigo-500 animate-in slide-in-from-top-6 shadow-2xl relative z-40 overflow-hidden">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-white flex items-center gap-4">
                <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Synthesis Logs
              </h3>
              <div className="flex items-center gap-4">
                <button 
                  onClick={clearHistory}
                  className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 transition-colors"
                >
                  Clear All
                </button>
                <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <p className="text-lg font-black uppercase tracking-[0.3em]">No synthesis cycles recorded.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
                {history.map(item => (
                  <div 
                    key={item.id}
                    onClick={() => loadHistoryItem(item)}
                    className="group relative p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] cursor-pointer hover:border-indigo-500 hover:shadow-2xl transition-all shadow-md flex flex-col h-full"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        <div className="flex items-center gap-2">
                          {item.isComparison && <span className="w-2 h-2 rounded-full bg-purple-500" title="Comparison Mode"></span>}
                          <button 
                            onClick={(e) => deleteHistoryItem(e, item.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                      <h4 className="font-black text-slate-800 dark:text-slate-200 line-clamp-1 mb-2">{item.promptData.role}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed font-bold italic">"{item.promptData.instruction}"</p>
                    </div>
                    <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</span>
                       <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest group-hover:underline">Restore Protocol</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="glass-card p-10 rounded-[3rem] border-indigo-500/20 shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
             <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <h3 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-100">LLM System Protocol</h3>
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">Synthesize and deploy to any LLM environment</p>
              </div>
              
              <div className="p-6 bg-indigo-50 dark:bg-indigo-950/30 rounded-[2rem] border border-indigo-100 dark:border-indigo-500/20 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-700 dark:text-indigo-400 mb-4 flex items-center gap-3">
                   Strategic Protocol
                </h4>
                <ol className="text-sm space-y-3 text-slate-600 dark:text-slate-300 font-bold list-decimal list-inside leading-relaxed">
                  <li>Click "Copy System Instruction".</li>
                  <li>Go to your desired LLM (ChatGPT, Claude, Gemini).</li>
                  <li>Paste into the <span className="text-indigo-600 dark:text-indigo-400">"System Instruction"</span> or "Custom Instructions" field.</li>
                  <li>Initiate your user prompt to see the expert persona in action.</li>
                </ol>
              </div>
            </div>

            <div className="lg:col-span-6 flex flex-col items-center lg:items-end gap-6">
               <div className="flex flex-wrap justify-center lg:justify-end gap-5 w-full">
                  {EXTERNAL_PROVIDERS.map(provider => (
                    <button 
                      key={provider.name}
                      onClick={() => handleExternalTest(provider.url)}
                      className={`${provider.color} hover:brightness-110 text-white px-8 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.25em] flex items-center gap-4 shadow-2xl transition-all active:scale-95 group/btn`}
                    >
                      <span className="text-3xl group-hover/btn:scale-125 transition-transform">{provider.icon}</span>
                      {provider.name}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>

      {detectedVars.length > 0 && (
        <div className="glass-card p-10 rounded-[3rem] border-indigo-500/20 shadow-2xl">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-700 dark:text-indigo-400 mb-8">Variable Injection matrix</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {detectedVars.map(v => (
              <div key={v} className="space-y-3">
                <label className="text-xs text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.3em] pl-2">{v}</label>
                <textarea 
                  value={variables[v] || ''}
                  onChange={(e) => setVariables(prev => ({ ...prev, [v]: e.target.value }))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 text-lg text-slate-900 dark:text-slate-50 focus:ring-4 focus:ring-indigo-500/30 outline-none font-bold transition-all shadow-inner min-h-[140px] resize-none leading-relaxed"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`grid gap-10 ${isComparisonMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} animate-in fade-in duration-500`}>
        <OutputPane 
          label={isComparisonMode ? "Engine Alpha" : "Synthesis Output"} 
          output={outputA} 
          isLoading={isLoadingA} 
          evalResult={evalA} 
          modelId={modelA}
          onModelChange={setModelA}
          onCopy={() => copyToClipboard(outputA)} 
          scrollRef={paneARef}
          onScroll={(e) => isComparisonMode && handleSyncScroll(e, paneBRef)}
        />
        {isComparisonMode && (
          <OutputPane 
            label="Engine Beta" 
            output={outputB} 
            isLoading={isLoadingB} 
            evalResult={evalB} 
            modelId={modelB}
            onModelChange={setModelB}
            onCopy={() => copyToClipboard(outputB)} 
            diffBaseline={outputA}
            showDiff={showDiff}
            scrollRef={paneBRef}
            onScroll={(e) => handleSyncScroll(e, paneARef)}
          />
        )}
      </div>
    </div>
  );
};

const OutputPane = ({ label, output, isLoading, evalResult, onCopy, modelId, onModelChange, diffBaseline, showDiff, scrollRef, onScroll }: any) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="glass-card p-10 rounded-[3rem] flex flex-col min-h-[700px] border border-slate-200 dark:border-slate-800 shadow-2xl transition-all">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">{label}</h3>
          <select 
            disabled={isLoading}
            value={modelId}
            onChange={(e) => onModelChange(e.target.value)}
            className="mt-2 bg-transparent text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 outline-none border-b border-indigo-500/20"
          >
            {MODELS.map(m => <option key={m.id} value={m.id} className="bg-slate-900 text-white">{m.name}</option>)}
          </select>
        </div>
      </div>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 bg-white/50 dark:bg-slate-950/80 rounded-[2.5rem] p-10 text-slate-800 dark:text-slate-200 overflow-y-auto text-lg border border-slate-100 dark:border-slate-900 shadow-inner font-bold custom-scrollbar">
        {isLoading ? (
          <div className="h-full flex flex-col items-center justify-center gap-10 py-32">
             <div className="w-20 h-20 border-8 border-indigo-500/10 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
        ) : output ? ( 
          diffBaseline ? <WordDiff baseline={diffBaseline} challenger={output} active={!!showDiff} /> : <HighFidelityMarkdown content={output} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-slate-400 italic py-32">
            <p className="text-lg font-black uppercase tracking-[0.4em]">Awaiting Vector Impulse</p>
          </div>
        )}
      </div>

      {output && !isLoading && (
        <button onClick={handleCopy} className={`mt-8 w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 border shadow-md ${copied ? 'bg-green-600 border-green-500 text-white shadow-2xl' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-500'}`}>
          {copied ? "Vector Cached" : "Copy Synthesis Result"}
        </button>
      )}
    </div>
  );
};
