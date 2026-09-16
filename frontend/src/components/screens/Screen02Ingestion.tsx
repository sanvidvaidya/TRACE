import React, { useState } from 'react';
import { TraceNode, TraceEdge } from '../../types/trace';
import { FileSpreadsheet, UploadCloud, CheckCircle2, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Screen02IngestionProps {
  onIngestText: (text: string, title: string) => void;
  onResetPhoenix: () => void;
}

export const Screen02Ingestion: React.FC<Screen02IngestionProps> = ({
  onIngestText,
  onResetPhoenix,
}) => {
  const [briefText, setBriefText] = useState('');
  const [projectTitle, setProjectTitle] = useState('Custom Enterprise Initiative');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBriefText(content);
      setProjectTitle(file.name.replace(/\.[^/.]+$/, ''));
      toast.success(`Loaded '${file.name}' (${file.size} bytes)`);
    };
    reader.readAsText(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefText.trim()) {
      toast.error('Please enter or upload a specification document');
      return;
    }
    onIngestText(briefText, projectTitle);
    toast.success('Document parsed into traceable entities & relations!');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-lime-400/10 text-lime-300 font-mono-code text-[11px] mb-2 border border-lime-400/20">
          <span>02 // DOCUMENT INGESTION & DATA HUB</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-100">
          Specification Ingestion & Multi-Format Parser
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Ingest unstructured requirements, PRDs, or CSV tables to populate the deterministic traceability graph.
        </p>
      </div>

      {/* Preset Benchmarks */}
      <div className="p-4 rounded-xl bg-[#0f1013] border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-zinc-200">Load Benchmark Dataset</h4>
          <p className="text-[11px] text-zinc-400">
            Restore the canonical Project Phoenix Renewal Intelligence dataset.
          </p>
        </div>
        <button
          onClick={onResetPhoenix}
          className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-lime-400 border border-zinc-700 text-xs font-mono-code flex items-center gap-1.5 pressable transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Phoenix Baseline</span>
        </button>
      </div>

      {/* Upload and Input Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-[#0f1013] border border-zinc-800 space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Initiative / Project Title</label>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => setProjectTitle(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 px-3.5 py-2 rounded-lg text-xs text-zinc-100 focus:outline-none focus:border-lime-500"
          />
        </div>

        {/* File Drag and Drop / Select Zone */}
        <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-lime-400/40 transition-colors relative group">
          <input
            type="file"
            accept=".txt,.csv,.json,.md"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center space-y-2 pointer-events-none">
            <UploadCloud className="w-8 h-8 text-zinc-500 group-hover:text-lime-400 transition-colors" />
            <div className="text-xs text-zinc-300 font-medium">
              Drop specification file here or <span className="text-lime-400 underline">browse</span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono-code">Supports .CSV, .JSON, .MD, .TXT</p>
          </div>
        </div>

        {/* Or Text Area */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300">Or Paste Requirement Brief Directly</label>
          <textarea
            rows={8}
            placeholder="Paste your executive brief, PRD, or user stories here..."
            value={briefText}
            onChange={(e) => setBriefText(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 p-3.5 rounded-lg text-xs text-zinc-100 font-mono-code focus:outline-none focus:border-lime-500 placeholder-zinc-600"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-lg bg-lime-400 text-black font-semibold text-xs font-mono-code flex items-center justify-center gap-2 hover:bg-lime-400 pressable transition-all shadow-[0_0_20px_rgba(190,242,100,0.3)]"
        >
          <FileText className="w-4 h-4" />
          <span>Ingest & Parse Into Traceability Graph</span>
        </button>
      </form>
    </div>
  );
};
