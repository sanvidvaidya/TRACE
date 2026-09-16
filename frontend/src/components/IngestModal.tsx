import React, { useState } from 'react';
import { UploadCloud, X, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (text: string, title: string) => void;
  onResetPhoenix: () => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  onClose,
  onIngest,
  onResetPhoenix,
}) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('Custom Enterprise Initiative');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setText(content);
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
      toast.success(`Loaded file: ${file.name}`);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('Please enter or upload specification text');
      return;
    }
    onIngest(text, title);
    onClose();
    toast.success('Specification parsed into graph entities!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl apple-card p-6 md:p-8 rounded-3xl space-y-6 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="text-xl font-display font-bold text-white">
              Ingest Specification
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Upload PRD, CSV requirements, or paste unstructured executive briefs.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benchmark Reset Option */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
          <span className="text-xs text-zinc-300">Restore Phoenix Benchmark brief?</span>
          <button
            type="button"
            onClick={() => {
              onResetPhoenix();
              onClose();
            }}
            className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-lime-400 text-xs font-mono font-semibold"
          >
            Reset Benchmark
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase">Initiative Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/10 text-xs text-white focus:outline-none focus:border-lime-400 font-semibold"
            />
          </div>

          <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:border-lime-400/40 transition-colors relative cursor-pointer group">
            <input
              type="file"
              accept=".txt,.csv,.json,.md"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-lime-400 transition-colors" />
              <span className="text-xs text-zinc-300">
                Drop file here or click to browse (.csv, .json, .txt, .md)
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-zinc-400 uppercase">Or Paste Brief Text</label>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste requirements, user stories, or PRD narrative here..."
              className="w-full p-4 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-zinc-200 focus:outline-none focus:border-lime-400 placeholder-zinc-600"
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-lime-400 text-black font-semibold text-xs font-mono flex items-center gap-2 hover:bg-lime-400 spring-press shadow-[0_0_15px_rgba(190,242,100,0.3)]"
            >
              <FileText className="w-4 h-4" />
              <span>Ingest & Generate Topology</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
