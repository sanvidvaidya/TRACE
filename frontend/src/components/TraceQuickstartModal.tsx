import React, { useState } from 'react';
import { 
  X, 
  ArrowRight, 
  Check, 
  Layers, 
  AlertCircle, 
  Network, 
  CheckSquare, 
  FileText,
  HelpCircle,
  Database
} from 'lucide-react';

interface TraceQuickstartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: any) => void;
  onOpenIngest?: () => void;
}

export const TraceQuickstartModal: React.FC<TraceQuickstartModalProps> = ({
  isOpen,
  onClose,
  onSelectMode,
  onOpenIngest,
}) => {
  const [step, setStep] = useState<number>(0);

  if (!isOpen) return null;

  const slides = [
    {
      title: 'What does TRACE do?',
      badge: 'Simple Explanation',
      description: 'When you change one part of an app, it should not break another part without anyone noticing. TRACE maps how your software connects, tests what happens when a database or payment tool goes offline, and helps your team fix problems before real users get stuck.',
      icon: Network,
      highlight: 'See what breaks before your customers do.',
    },
    {
      title: 'How to Navigate TRACE',
      badge: 'Four Clear Tools',
      description: 'Everything in TRACE is organized into four practical tools:',
      bullets: [
        { label: 'System Map', desc: 'Interactive map of all your web apps, databases, and message queues.' },
        { label: 'Conflict Checker', desc: 'Spots mismatched rules and timeout differences between engineering teams.' },
        { label: 'Downtime Impact', desc: 'Simulates what happens when a server goes down to test customer impact.' },
        { label: 'Launch Checklist', desc: 'A one-page readiness report and test checklist before going live.' },
      ],
      icon: Layers,
    },
    {
      title: 'How to Test Your Own Software',
      badge: 'Getting Started',
      description: 'You can explore right now with our pre-loaded sample system (Project Phoenix), or click Import Spec at any time to test your own APIs and database files.',
      icon: FileText,
      highlight: 'Test the live sample or import your own spec in seconds.',
    },
  ];

  const currentSlide = slides[step];
  const Icon = currentSlide.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-sans">
      <div className="w-full max-w-lg rounded-[4px] border border-slate-800 bg-[#070b16] p-6 shadow-2xl space-y-5 relative text-slate-100">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-[2px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Indicator (Crisp rectangles, no bubbles) */}
        <div className="flex items-center gap-1.5">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-1 transition-all ${
                step === i ? 'w-8 bg-sky-400' : 'w-3 bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[3px] bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                {currentSlide.badge}
              </span>
              <h3 className="text-lg font-bold text-white">{currentSlide.title}</h3>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentSlide.description}
          </p>

          {currentSlide.highlight && (
            <div className="p-2.5 rounded-[3px] bg-sky-950/40 border border-sky-500/30 text-xs text-sky-200 font-medium">
              💡 {currentSlide.highlight}
            </div>
          )}

          {currentSlide.bullets && (
            <div className="space-y-1.5 pt-1">
              {currentSlide.bullets.map((b, idx) => (
                <div key={idx} className="p-2 rounded-[3px] bg-slate-900 border border-slate-800 text-xs flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 bg-sky-400 mt-1.5 shrink-0" />
                  <div>
                    <strong className="text-white">{b.label}:</strong>{' '}
                    <span className="text-slate-400">{b.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={step === 0}
            className={`text-xs text-slate-400 hover:text-white font-medium cursor-pointer ${
              step === 0 ? 'opacity-0 pointer-events-none' : ''
            }`}
          >
            ← Previous
          </button>

          {step < slides.length - 1 ? (
            <button
              onClick={() => setStep((prev) => prev + 1)}
              className="px-4 py-2 rounded-[3px] bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {onOpenIngest && (
                <button
                  onClick={onOpenIngest}
                  className="px-3 py-2 rounded-[3px] bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Import Spec
                </button>
              )}
              <button
                onClick={() => {
                  onClose();
                  onSelectMode('CANVAS');
                }}
                className="px-4 py-2 rounded-[3px] bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open System Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
