import React, { useState, useEffect } from 'react';
import {
  X,
  Volume2,
  Check,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  ShieldCheck,
  Info
} from 'lucide-react';

export interface VoiceSettings {
  voiceModel: 'gemini_charon' | 'edge_prabhat' | 'gemini_puck' | 'system_male';
  speechRate: number; // 0.6 to 1.3
  pitch: number;      // 0.7 to 1.3
  preferMale: boolean;
  enableNeuralStreaming: boolean;
}

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onSave: (newSettings: VoiceSettings) => void;
  onPreview: (testSettings: VoiceSettings, customPhrase?: string) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onPreview,
}) => {
  const [current, setCurrent] = useState<VoiceSettings>(settings);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setCurrent(settings);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(current);
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 1200);
  };

  const handleReset = () => {
    setCurrent({
      voiceModel: 'edge_prabhat',
      speechRate: 0.95,
      pitch: 0.98,
      preferMale: true,
      enableNeuralStreaming: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* Fixed Pinned Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 sm:px-6 py-4 shrink-0 bg-slate-900/95 backdrop-blur z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Machi Voice & Tone Settings</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold uppercase">
                  Natural Male
                </span>
              </h3>
              <p className="text-xs text-slate-400">Configure human-like male voice, rate, and pitch</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-all shrink-0 cursor-pointer"
            aria-label="Close voice settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-5 sm:px-6 py-4 space-y-5 overflow-y-auto overscroll-contain flex-1">
          {/* Voice Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider">
              Voice Persona & Sound Profile:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                {
                  id: 'edge_prabhat',
                  title: 'Brian Multilingual (Conversational Male)',
                  desc: 'Warm, relaxed, friendly male friend talking casually. Natural intonation for English & Tanglish (Recommended).',
                  badge: 'Human Conversational',
                },
                {
                  id: 'gemini_charon',
                  title: 'Charon Neural Male (Flagship)',
                  desc: 'Warm, calm, mature friendly male tone. Natural breathing, gentle cadence.',
                  badge: 'Neural High-Fi',
                },
                {
                  id: 'gemini_puck',
                  title: 'Puck Neural Male',
                  desc: 'Bright, cheerful, casual friendly male companion.',
                  badge: 'Casual',
                },
                {
                  id: 'system_male',
                  title: 'Device / System Male Voice',
                  desc: 'Direct device speech synthesis. Zero internet required, 100% offline.',
                  badge: 'Offline',
                },
              ].map((v) => {
                const isSelected = current.voiceModel === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setCurrent({ ...current, voiceModel: v.id as any })}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">{v.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                        {v.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sliders: Speed & Pitch */}
          <div className="space-y-4 pt-1">
            {/* Speaking Speed */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Speaking Speed (Conversational Pace):</span>
                <span className="font-mono text-cyan-400 font-bold">{current.speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.65"
                max="1.3"
                step="0.05"
                value={current.speechRate}
                onChange={(e) => setCurrent({ ...current, speechRate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.65x (Calm & Deliberate)</span>
                <span>0.95x (Natural Relaxed)</span>
                <span>1.30x (Fast)</span>
              </div>
            </div>

            {/* Voice Pitch */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">Voice Pitch (Male Warmth & Resonance):</span>
                <span className="font-mono text-cyan-400 font-bold">{current.pitch.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.25"
                step="0.05"
                value={current.pitch}
                onChange={(e) => setCurrent({ ...current, pitch: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0.75x (Deeper Male)</span>
                <span>0.98x (Natural Companion)</span>
                <span>1.25x (Higher)</span>
              </div>
            </div>
          </div>

          {/* Evaluation Phrases directly from User Specification */}
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wider flex items-center justify-between">
              <span>Test Natural Voice Samples:</span>
              <span className="text-[10px] text-cyan-400 font-normal">Click to listen</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                "Hey machi, sollu da. Enna aachu?",
                "Seri machi, naan help panren.",
                "Don't worry, machi. We can figure it out together.",
                "Okay machi, I'll explain it clearly.",
              ].map((phrase, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onPreview(current, phrase)}
                  className="flex items-center space-x-2 text-left p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-950 text-slate-300 text-xs transition-all group cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 shrink-0 transition-transform" />
                  <span className="truncate">"{phrase}"</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sample Phrasing Note */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <p>
              Machi speaks with a mild, gentle, calm human male tone in a quiet room, with natural sentence pauses in English, Tamil, and Tanglish.
            </p>
          </div>
        </div>

        {/* Pinned Visible Footer - Always Reachable on Small & Large Screens */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 backdrop-blur shrink-0 z-10">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1 px-2.5 py-2 text-xs text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onPreview(current, "Don't worry, machi. We can figure it out together.")}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Preview Voice</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 sm:px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{savedNotice ? 'Saved!' : 'Save Voice Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
