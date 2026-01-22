
import React, { useState, useRef, useEffect } from 'react';
import { createChat } from '../services/geminiService';
import { ChatMessage } from '../types';
import { GenerateContentResponse } from '@google/genai';

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    if (!chatRef.current) {
      chatRef.current = createChat();
    }

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const stream = await chatRef.current.sendMessageStream({ message: input });
      let fullResponse = '';
      
      for await (const chunk of stream) {
        const c = chunk as GenerateContentResponse;
        fullResponse += c.text || '';
        setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: fullResponse } : msg));
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => prev.map(msg => msg.id === assistantId ? { ...msg, content: "Error: Protocol failure. Neural connection lost." } : msg));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-10 right-10 w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center shadow-[0_30px_60px_-15px_rgba(99,102,241,0.5)] hover:scale-110 active:scale-95 transition-all z-50 border-4 border-white dark:border-indigo-400/50"
      >
        {isOpen ? (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-36 right-10 w-[95vw] md:w-[500px] h-[750px] glass-card rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border-2 border-indigo-500/40 flex flex-col z-50 animate-in slide-in-from-bottom-8 duration-500 overflow-hidden">
          <div className="p-8 bg-indigo-600/30 border-b-2 border-indigo-500/20 flex items-center gap-5">
            <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-lg font-black text-white shadow-lg">PS</div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-widest">PromptSynthesis AI</h3>
              <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest">Powered by Gemini 3 Pro</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-900/50 custom-scrollbar">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-base space-y-4 opacity-30 text-center px-10">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <p className="font-bold uppercase tracking-widest">Inquire about neural synthesis protocols or visual transformations</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-6 rounded-[2rem] text-base font-bold leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border-2 border-slate-700'}`}>
                  {msg.content || <div className="flex gap-2 py-2"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-8 bg-slate-900/90 border-t-2 border-slate-800 flex gap-4">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Inject neural query..."
              className="flex-1 bg-slate-800 border-2 border-slate-700 rounded-2xl px-6 py-4 text-base text-white focus:ring-4 focus:ring-indigo-500/30 outline-none transition-all font-bold"
            />
            <button type="submit" disabled={isTyping || !input.trim()} className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-2xl flex items-center justify-center transition-all disabled:bg-slate-700 shadow-xl active:scale-95">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
};
