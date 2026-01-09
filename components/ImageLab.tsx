
import React, { useState, useRef } from 'react';
import { editImageWithAi } from '../services/geminiService';

interface ImageLabProps {
  onBack: () => void;
}

export const ImageLab: React.FC<ImageLabProps> = ({ onBack }) => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        setOriginalImage(readerEvent.target?.result as string);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!originalImage || !instruction.trim()) return;
    setIsProcessing(true);
    try {
      const edited = await editImageWithAi(originalImage, instruction);
      if (edited) {
        setResultImage(edited);
      } else {
        alert("The model didn't return an image. Try a different instruction.");
      }
    } catch (error) {
      console.error("Image editing error:", error);
      alert("Failed to edit image. Check your connection and try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          Back
        </button>
        <h2 className="text-2xl font-bold gradient-text">Image Lab</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            className={`glass-card rounded-2xl p-8 border-2 border-dashed transition-all flex flex-col items-center justify-center min-h-[300px] cursor-pointer ${originalImage ? 'border-indigo-500/50' : 'border-slate-700 hover:border-slate-500'}`}
            onClick={() => fileInputRef.current?.click()}
          >
            {originalImage ? (
              <img src={originalImage} alt="Original" className="max-h-[400px] rounded-lg shadow-2xl" />
            ) : (
              <>
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-slate-400">Click or drag to upload an image</p>
                <p className="text-xs text-slate-500 mt-2">JPG, PNG supported</p>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
          </div>

          <div className="glass-card p-6 rounded-2xl space-y-4">
            <label className="block text-sm font-bold uppercase text-slate-400">Editing Instructions</label>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., 'Add a vintage 70s film filter', 'Make the sky purple and add a moon', 'Remove the person in the background'..."
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none"
            />
            <button
              onClick={handleProcess}
              disabled={isProcessing || !originalImage || !instruction.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-500/20"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Processing with Gemini 2.5 Flash...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Generate Edit
                </>
              )}
            </button>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 min-h-[400px] flex flex-col items-center justify-center border border-indigo-500/20">
          <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400 mb-4 self-start">Output Result</h3>
          {resultImage ? (
            <div className="relative group">
              <img src={resultImage} alt="Result" className="max-h-[600px] rounded-lg shadow-2xl animate-in zoom-in-95 duration-500" />
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = resultImage;
                  link.download = 'promptforge-edit.png';
                  link.click();
                }}
                className="absolute top-4 right-4 bg-slate-900/80 p-2 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
            </div>
          ) : (
            <div className="text-center text-slate-600 space-y-4">
              <svg className="w-16 h-16 mx-auto opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="italic">{isProcessing ? "Gemini is reimagining your image..." : "Generated image will appear here"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
