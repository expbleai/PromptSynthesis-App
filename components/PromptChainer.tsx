
import React, { useState, useEffect, useRef } from 'react';
import { RiccePrompt, PromptChainStep } from '../types';
import { testPrompt } from '../services/geminiService';

interface PromptChainerProps {
  onBack: () => void;
}

export const PromptChainer: React.FC<PromptChainerProps> = ({ onBack }) => {
  const [steps, setSteps] = useState<PromptChainStep[]>([
    {
      id: crypto.randomUUID(),
      name: 'Stage 1: Foundation',
      promptData: {
        role: 'Expert Researcher',
        instruction: 'Synthesize the core themes of {{topic}}.',
        context: 'Preparing a high-level briefing.',
        constraints: 'Max 3 bullet points.',
        evaluation: 'Clear, concise synthesis.'
      },
      status: 'idle'
    }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [globalVariables, setGlobalVariables] = useState<Record<string, string>>({
    topic: 'Artificial Intelligence and Human Creativity'
  });

  const addStep = () => {
    const prevStepIndex = steps.length;
    setSteps([...steps, {
      id: crypto.randomUUID(),
      name: `Stage ${prevStepIndex + 1}: Expansion`,
      promptData: {
        role: 'Creative Director',
        instruction: `Based on Stage ${prevStepIndex} output, expand on the third theme: {{output_${prevStepIndex}}}.`,
        context: 'Turning research into a creative campaign.',
        constraints: 'Narrative tone.',
        evaluation: 'Compelling storytelling.'
      },
      status: 'idle'
    }]);
  };

  const removeStep = (id: string) => {
    if (steps.length > 1) {
      setSteps(steps.filter(s => s.id !== id));
    }
  };

  const updateStepField = (id: string, field: keyof RiccePrompt, value: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, promptData: { ...s.promptData, [field]: value } } : s));
  };

  const updateStepName = (id: string, name: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, name } : s));
  };

  const substituteAll = (text: string, currentStepIndex: number) => {
    let result = text;
    // Global vars
    Object.entries(globalVariables).forEach(([key, val]) => {
      // Use String() to ensure val is a string and avoid 'unknown' type issues from Object.entries
      result = result.split(`{{${key}}}`).join(String(val));
    });
    // Previous output vars
    steps.forEach((step, idx) => {
      if (idx < currentStepIndex && step.output) {
        result = result.split(`{{output_${idx + 1}}}`).join(step.output);
      }
    });
    return result;
  };

  const runChain = async () => {
    setIsRunning(true);
    const updatedSteps = [...steps];
    
    for (let i = 0; i < updatedSteps.length; i++) {
      updatedSteps[i].status = 'running';
      updatedSteps[i].output = '';
      setSteps([...updatedSteps]);

      const data = updatedSteps[i].promptData;
      const fullPrompt = `Role: ${substituteAll(data.role, i)}\nInstruction: ${substituteAll(data.instruction, i)}\nContext: ${substituteAll(data.context, i)}\nConstraints: ${substituteAll(data.constraints, i)}\nEvaluation: ${substituteAll(data.evaluation, i)}`;

      try {
        await testPrompt(fullPrompt, (chunk) => {
          updatedSteps[i].output = (updatedSteps[i].output || '') + chunk;
          setSteps([...updatedSteps]);
        });
        updatedSteps[i].status = 'completed';
      } catch (err) {
        updatedSteps[i].status = 'error';
        break;
      }
      setSteps([...updatedSteps]);
    }
    setIsRunning(false);
  };

  return (
    <div className="space-y-12 animate-in slide-in-from-bottom-4 duration-500 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-10 gap-8">
        <div className="flex items-center gap-6">
          <button onClick={onBack} className="text-slate-500 hover:text-indigo-600 transition-colors font-bold text-lg flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Dashboard
          </button>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-800"></div>
          <h2 className="text-3xl font-black uppercase tracking-widest gradient-text">Prompt Chain Architect</h2>
        </div>
        <div className="flex flex-wrap gap-5">
          <button 
            onClick={addStep} 
            disabled={isRunning}
            className="px-8 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-xs font-black uppercase tracking-[0.2em] hover:border-indigo-500 transition-all shadow-xl"
          >
            Add Sequence Stage
          </button>
          <button 
            onClick={runChain} 
            disabled={isRunning}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 active:scale-95 disabled:opacity-50 transition-all"
          >
            {isRunning ? 'Synthesizing Full Logic Chain...' : 'Initiate Full Sequence'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-1 space-y-10">
           <div className="glass-card p-8 rounded-[2.5rem] border-indigo-500/20 shadow-2xl sticky top-12">
              <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 mb-8 border-b border-slate-100 dark:border-slate-800 pb-4">Logic Injectors</h3>
              {Object.keys(globalVariables).map(key => (
                <div key={key} className="space-y-3 mb-8">
                  <label className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest pl-1">{key}</label>
                  <input 
                    type="text"
                    value={globalVariables[key]}
                    onChange={(e) => setGlobalVariables({...globalVariables, [key]: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-indigo-500/30 outline-none shadow-inner"
                  />
                </div>
              ))}
              <div className="p-6 bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-500/10 shadow-inner">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 leading-relaxed font-bold italic">
                  "Protocol: Sequence stages inherit neural outputs via <span className="font-black text-indigo-600">{"{{output_N}}"}</span> vectorization."
                </p>
              </div>
           </div>
        </div>

        <div className="md:col-span-3 space-y-20">
          {steps.map((step, index) => (
            <div key={step.id} className="relative">
              {index > 0 && (
                <div className="absolute -top-20 left-16 h-20 w-px bg-gradient-to-b from-indigo-500/60 to-transparent"></div>
              )}
              <div className={`glass-card rounded-[3.5rem] border-2 transition-all ${step.status === 'running' ? 'border-indigo-500 shadow-[0_0_80px_rgba(99,102,241,0.2)]' : 'border-slate-200 dark:border-slate-800 shadow-2xl'}`}>
                <div className="p-10">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-6">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-xl shadow-lg transition-all ${step.status === 'completed' ? 'bg-green-500 text-white' : step.status === 'running' ? 'bg-indigo-600 text-white animate-pulse' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}>
                        {index + 1}
                      </div>
                      <input 
                        type="text" 
                        value={step.name}
                        onChange={(e) => updateStepName(step.id, e.target.value)}
                        className="bg-transparent text-2xl font-black text-slate-800 dark:text-slate-100 focus:outline-none border-b-2 border-transparent focus:border-indigo-500/40 pb-1"
                      />
                    </div>
                    {steps.length > 1 && (
                      <button onClick={() => removeStep(step.id)} className="text-slate-300 hover:text-red-500 transition-colors p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-6">
                      {['role', 'instruction', 'context', 'constraints', 'evaluation'].map((f) => (
                        <div key={f} className="space-y-2">
                          <label className="text-xs font-black uppercase text-slate-400 tracking-[0.3em] pl-2">{f}</label>
                          <textarea 
                            value={step.promptData[f as keyof RiccePrompt]}
                            onChange={(e) => updateStepField(step.id, f as keyof RiccePrompt, e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-base font-bold focus:ring-4 focus:ring-indigo-500/30 outline-none min-h-[100px] transition-all shadow-inner leading-relaxed"
                            placeholder={`Define ${f} configuration...`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col h-full">
                       <label className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-[0.4em] mb-4 pl-2">Neural Output Vector</label>
                       <div className="flex-1 bg-white/60 dark:bg-slate-950/80 rounded-[3rem] p-10 text-lg leading-relaxed border border-slate-200 dark:border-slate-800 shadow-inner overflow-y-auto custom-scrollbar min-h-[400px] max-h-[800px] font-bold text-slate-700 dark:text-slate-300">
                          {step.output ? (
                            <div className="whitespace-pre-wrap animate-in fade-in duration-700">
                              {step.output}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale text-slate-400">
                               <svg className="w-24 h-24 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                               <span className="text-sm font-black uppercase tracking-[0.5em]">Neural Pulse Pending</span>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
