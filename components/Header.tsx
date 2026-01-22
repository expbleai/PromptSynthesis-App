
import React, { useState, useEffect } from 'react';

export const Header: React.FC = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') || 'dark';
    }
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <header className="flex items-center justify-between w-full py-8 border-b border-slate-200 dark:border-slate-800/60 transition-colors">
      <div className="flex items-center gap-5">
        <div className="flex items-center justify-center filter drop-shadow-[0_0_12px_rgba(168,85,247,0.5)] scale-125 origin-left">
          <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M26 32L12 50L26 68" 
              stroke="#8B5CF6" 
              strokeWidth="10" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M74 32L88 50L74 68" 
              stroke="#A855F7" 
              strokeWidth="10" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M33 40H45C49.4183 40 53 43.5817 53 48C53 52.4183 49.4183 56 45 56H33V64" 
              className="stroke-slate-900 dark:stroke-slate-50 transition-colors"
              strokeWidth="9" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
            <path 
              d="M33 40V64" 
              className="stroke-slate-900 dark:stroke-slate-50 transition-colors"
              strokeWidth="9" 
              strokeLinecap="round" 
            />
            <path 
              d="M70 35L60 65" 
              className="stroke-slate-900 dark:stroke-slate-50 transition-colors"
              strokeWidth="6" 
              strokeLinecap="round" 
            />
          </svg>
        </div>
        <span className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-white dark:to-indigo-300 bg-clip-text text-transparent transition-colors">
          PromptSynthesis
        </span>
      </div>
      
      <div className="flex items-center gap-6">
        <button 
          onClick={toggleTheme}
          className="p-3.5 rounded-2xl bg-slate-200/50 dark:bg-slate-800 text-slate-700 dark:text-indigo-200 border border-slate-300 dark:border-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-all group"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <svg className="w-6 h-6 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.95 16.95l.707.707M7.05 7.05l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
          ) : (
            <svg className="w-6 h-6 group-hover:-rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
        <div className="hidden sm:block px-5 py-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-full text-xs font-black text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 tracking-[0.2em] shadow-sm">
          PRO-ENGINEER v1.0.3
        </div>
      </div>
    </header>
  );
};
