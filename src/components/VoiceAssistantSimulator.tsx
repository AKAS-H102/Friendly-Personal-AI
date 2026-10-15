import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MachiOrb, AssistantState } from './MachiOrb';
import { VoiceSettingsModal, VoiceSettings } from './VoiceSettingsModal';
import {
  speakMachiText,
  stopMachiSpeech,
  getSavedVoiceSettings,
  saveVoiceSettings
} from '../utils/machiVoice';
import {
  Mic,
  MicOff,
  Power,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Radio,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Play,
  Zap,
  Globe,
  ExternalLink,
  Square,
  Info
} from 'lucide-react';

interface VoiceAssistantSimulatorProps {
  onReminderCreated?: (reminder: { title: string; time: string; notes?: string }) => void;
  onCallRequested?: (contact: string) => void;
  onQueryNotifications?: () => void;
  onCallAnswered?: () => void;
  onCallRejected?: () => void;
  recentNotificationCount?: number;
  privacyMode?: boolean;
}

export const VoiceAssistantSimulator: React.FC<VoiceAssistantSimulatorProps> = ({
  onReminderCreated,
  onCallRequested,
  onQueryNotifications,
  onCallAnswered,
  onCallRejected,
  recentNotificationCount = 3,
  privacyMode = false,
}) => {
  // Master ON/OFF state (persists across reloads)
  const [isOn, setIsOn] = useState<boolean>(() => {
    return localStorage.getItem('machi_power_state') === 'true';
  });

  const [state, setState] = useState<AssistantState>(() => {
    return localStorage.getItem('machi_power_state') === 'true' ? 'STANDBY' : 'OFF';
  });

  const [userTranscript, setUserTranscript] = useState<string>("Say 'Hey Machi' or tap Wake Word to speak...");
  const [machiReply, setMachiReply] = useState<string>("Hey machi, sollu da. Enna aachu? Naan unakku help panna ready-ah iruken.");
  const [textInput, setTextInput] = useState<string>('');
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState<boolean>(true);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  // Speed, Grounding & Conversational Memory state
  const [lastLatencyMs, setLastLatencyMs] = useState<number>(0);
  const [searchUsed, setSearchUsed] = useState<boolean>(false);
  const [sources, setSources] = useState<Array<{ title: string; url: string }>>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{ user: string; machi: string }>>([]);
  const [isLocalKnowledgeMode, setIsLocalKnowledgeMode] = useState<boolean>(false);

  // Persistent Voice Settings for Natural Male Tone
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    return getSavedVoiceSettings();
  });

  // Speech Recognition and Synthesis refs
  const recognitionRef = useRef<any>(null);
  const isStandbyListeningRef = useRef<boolean>(false);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechRecognitionSupported(false);
    }

    return () => {
      stopAllListening();
      stopAudioPlayback();
    };
  }, []);

  // Update localStorage and standby mode on power change
  const handleTogglePower = (newPowerState: boolean) => {
    setIsOn(newPowerState);
    localStorage.setItem('machi_power_state', String(newPowerState));

    if (newPowerState) {
      setState('STANDBY');
      setUserTranscript("Standby active: Listening for 'Hey Machi'...");
      setMachiReply("Hey machi, online vandhutten da. Standby-la iruken!");
      speakText("Hey machi, online vandhutten da. Standby-la iruken!");
      startWakeWordStandby();
    } else {
      stopAllListening();
      stopAudioPlayback();
      setState('OFF');
      setUserTranscript("Machi is completely OFF. Microphone & AI released.");
      setMachiReply("Machi is resting. Toggle ON to start standby.");
    }
  };

  const stopAllListening = () => {
    isStandbyListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
  };

  // Immediate interruption / barge-in support
  const stopAudioPlayback = () => {
    stopMachiSpeech();
    if (currentAudioElementRef.current) {
      currentAudioElementRef.current.pause();
      currentAudioElementRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    activeUtteranceRef.current = null;
  };

  // Standby Wake Word Listener
  const startWakeWordStandby = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition || !isOn) return;

    stopAllListening();
    isStandbyListeningRef.current = true;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onresult = (event: any) => {
        if (!isStandbyListeningRef.current) return;

        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interim += event.results[i][0].transcript.toLowerCase();
        }

        const wakePatterns = ['hey machi', 'machi', 'hai machi', 'ei machi', 'sollu machi', 'a machi'];
        const matched = wakePatterns.some(pattern => interim.includes(pattern));

        if (matched) {
          stopAllListening();
          triggerWakeSession();
        }
      };

      recognition.onerror = () => {
        if (isStandbyListeningRef.current && isOn) {
          setTimeout(() => {
            if (isStandbyListeningRef.current && isOn) {
              startWakeWordStandby();
            }
          }, 1000);
        }
      };

      recognition.onend = () => {
        if (isStandbyListeningRef.current && isOn) {
          startWakeWordStandby();
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.warn('SpeechRecognition startup notice:', e);
    }
  }, [isOn]);

  // Activate Active Command Capture with fast silence cutoff
  const triggerWakeSession = () => {
    stopAudioPlayback();
    setState('LISTENING');
    setUserTranscript("Listening for your command...");
    setMachiReply("Hey machi, sollu da. Kettu kittu iruken...");
    
    playTone(620, 0.12);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setTimeout(() => {
        handleUserMessage("Tell me about Rohit Sharma, the Indian cricketer.");
      }, 1200);
      return;
    }

    try {
      const cmdRecognition = new SpeechRecognition();
      cmdRecognition.continuous = false;
      cmdRecognition.interimResults = true;
      cmdRecognition.lang = 'en-IN';

      let silenceTimeout: any = null;

      cmdRecognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserTranscript(`"${transcript}"`);

        // Fast silence cutoff: if user stopped speaking for 800ms, finalize immediately!
        clearTimeout(silenceTimeout);
        silenceTimeout = setTimeout(() => {
          try {
            cmdRecognition.stop();
          } catch {}
          handleUserMessage(transcript);
        }, 850);

        if (event.results[0].isFinal) {
          clearTimeout(silenceTimeout);
          handleUserMessage(transcript);
        }
      };

      cmdRecognition.onerror = (e: any) => {
        clearTimeout(silenceTimeout);
        console.warn('Command recognition error:', e);
        returnToStandby();
      };

      cmdRecognition.start();
    } catch {
      returnToStandby();
    }
  };

  // Call Server-side Gemini API with Knowledge, Web Search Grounding & Memory
  const handleUserMessage = async (text: string) => {
    if (!text || !text.trim()) {
      returnToStandby();
      return;
    }

    stopAudioPlayback();
    setState('THINKING');
    setUserTranscript(`"${text}"`);
    setMachiReply("Thinking...");

    const startTime = Date.now();

    try {
      const res = await fetch('/api/machi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: conversationHistory.slice(-4),
          languagePreference: 'tanglish',
          context: {
            platform: 'Personal Assistant Hub',
            recentNotificationCount,
            privacyMode,
            voicePersona: 'Fast, knowledgeable, friendly male companion',
            localTime: new Date().toLocaleTimeString(),
          },
        }),
      });

      const data = await res.json();
      const reply = data.reply || "Hey machi, sollu da. Kettu kittu iruken!";
      const intent = data.intent || "chat";
      const actionData = data.actionData || {};
      const latency = data.latencyMs || (Date.now() - startTime);

      setLastLatencyMs(latency);
      setSearchUsed(!!data.searchUsed);
      setSources(data.sources || []);
      setIsLocalKnowledgeMode(!!data.quotaExhausted);

      // Update conversational context
      setConversationHistory((prev) => [...prev.slice(-5), { user: text, machi: reply }]);

      setState('SPEAKING');
      setMachiReply(reply);

      // Handle action side-effects
      if (intent === 'create_reminder' && onReminderCreated) {
        onReminderCreated({
          title: actionData.reminderTitle || text.replace(/remind me to|remind pannu|reminder/i, '').trim() || 'Scheduled Reminder',
          time: actionData.reminderTime || 'Today, 6:00 PM',
          notes: actionData.extraNotes || 'Created via voice command',
        });
      } else if (intent === 'query_notifications' && onQueryNotifications) {
        onQueryNotifications();
      } else if (intent === 'phone_call' && onCallRequested) {
        onCallRequested(actionData.contactName || 'Sir');
      } else if (intent === 'attend_call' && onCallAnswered) {
        onCallAnswered();
      } else if (intent === 'reject_call' && onCallRejected) {
        onCallRejected();
      }

      speakText(reply, () => {
        returnToStandby();
      });
    } catch (err) {
      console.error('Chat error:', err);
      const fallback = "Chinna network issue da machi. Parava illa, marubadiyum sollu da!";
      setState('SPEAKING');
      setMachiReply(fallback);
      speakText(fallback, () => returnToStandby());
    }
  };

  const returnToStandby = () => {
    setTimeout(() => {
      if (isOn) {
        setState('STANDBY');
        setUserTranscript("Standby active: Say 'Hey Machi'");
        startWakeWordStandby();
      } else {
        setState('OFF');
      }
    }, 1200);
  };

  // High-Fidelity Natural Male Voice Output with immediate interruptibility
  const speakText = async (text: string, onEnd?: () => void) => {
    if (isAudioMuted) {
      if (onEnd) setTimeout(onEnd, 1200);
      return;
    }

    stopAudioPlayback();
    await speakMachiText(text, {
      customSettings: voiceSettings,
      onEnd,
    });
  };

  // Preview Voice Sample
  const handlePreviewVoice = (testSettings: VoiceSettings, customPhrase?: string) => {
    const sample = customPhrase || "Don't worry, machi. We can figure it out together.";
    setMachiReply(sample);
    speakMachiText(sample, {
      customSettings: testSettings,
    });
  };

  const handleSaveVoiceSettings = (newSettings: VoiceSettings) => {
    setVoiceSettings(newSettings);
    saveVoiceSettings(newSettings);
  };

  // Interruption handler when orb or stop button is pressed
  const handleOrbClick = () => {
    if (!isOn) {
      handleTogglePower(true);
      return;
    }

    // Barge-in / Interrupt if speaking
    if (state === 'SPEAKING') {
      stopAudioPlayback();
      setState('STANDBY');
      setMachiReply("Interrupted. Sollu da machi, kettukiren.");
      return;
    }

    triggerWakeSession();
  };

  const playTone = (freq: number, dur: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {}
  };

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-6">
      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={voiceSettings}
        onSave={handleSaveVoiceSettings}
        onPreview={handlePreviewVoice}
      />

      {/* Master ON/OFF Control Header */}
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
              isOn
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-red-500/10 text-red-400 border border-red-500/30'
            }`}
          >
            <Power className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base sm:text-lg font-bold text-white tracking-wide">
                Machi Assistant
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isOn
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                    : 'bg-red-950 text-red-400 border border-red-500/40'
                }`}
              >
                {isOn ? 'Active (ON)' : 'Disabled (OFF)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOn
                ? 'Instant speech pipeline active. Fast intent detection & real-time knowledge.'
                : 'Microphone & background AI listeners completely released.'}
            </p>
          </div>
        </div>

        {/* Big Master Toggle & Voice Settings Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
            title="Configure natural male voice"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Voice Settings</span>
          </button>

          <button
            onClick={() => handleTogglePower(!isOn)}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all shadow-lg active:scale-95 ${
              isOn
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isOn ? 'TURN OFF' : 'TURN ON'}</span>
          </button>
        </div>
      </div>

      {/* Futuristic Holographic Machi Orb */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <MachiOrb
          state={state}
          audioLevel={audioLevel}
          onClick={handleOrbClick}
        />

        {/* State Badges, Latency & Web Search Indicator */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium mt-2">
          {isOn ? (
            <span className="flex items-center text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-3 py-1 rounded-full">
              <Mic className="w-3.5 h-3.5 mr-1.5 animate-pulse text-emerald-400" />
              Mic Standby (Say 'Hey Machi')
            </span>
          ) : (
            <span className="flex items-center text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full">
              <MicOff className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
              Microphone Released
            </span>
          )}

          {lastLatencyMs > 0 && (
            <span className="flex items-center text-amber-300 bg-amber-950/70 border border-amber-800/60 px-3 py-1 rounded-full font-mono text-[11px]">
              <Zap className="w-3 h-3 mr-1 text-amber-400" />
              Latency: {lastLatencyMs}ms
            </span>
          )}

          {searchUsed && (
            <span className="flex items-center text-cyan-300 bg-cyan-950/70 border border-cyan-800/60 px-3 py-1 rounded-full text-[11px] font-semibold">
              <Globe className="w-3 h-3 mr-1 text-cyan-400" />
              Google Search Grounded
            </span>
          )}

          {isLocalKnowledgeMode && (
            <span className="flex items-center text-purple-300 bg-purple-950/70 border border-purple-800/60 px-3 py-1 rounded-full text-[11px] font-semibold">
              <Zap className="w-3 h-3 mr-1 text-purple-400" />
              High-Speed Local Knowledge
            </span>
          )}

          {state === 'SPEAKING' && (
            <button
              onClick={stopAudioPlayback}
              className="flex items-center space-x-1 px-3 py-1 rounded-full bg-red-950/80 text-red-300 border border-red-800/80 hover:bg-red-900 transition-all font-semibold"
              title="Interrupt speech (Barge-in)"
            >
              <Square className="w-3 h-3 fill-current text-red-400" />
              <span>Interrupt</span>
            </button>
          )}

          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className="text-slate-400 hover:text-white p-1 rounded-full bg-slate-900 border border-slate-800"
            title={isAudioMuted ? 'Unmute voice' : 'Mute voice'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* Live Conversation Transcript Display */}
      <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
        {/* User Speech Bubble */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            <span className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block mr-2" />
              You (Spoken Input)
            </span>
            <span className="text-slate-500">Live Transcript</span>
          </div>
          <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-slate-100 text-sm font-medium min-h-[46px] flex items-center">
            {userTranscript}
          </div>
        </div>

        {/* Machi Response Bubble */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
            <span className="flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Machi (Direct Knowledge & Companion Response)
            </span>
            <span className="text-cyan-500/80">Intelligent • Grounded • Male</span>
          </div>
          <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-3.5 text-cyan-200 text-sm font-medium leading-relaxed">
            {machiReply}
          </div>

          {/* Web Search Sources Pill Links */}
          {sources.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">
                Verified Web Sources:
              </span>
              <div className="flex flex-wrap gap-2">
                {sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 text-xs transition-all"
                  >
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                    <span className="truncate max-w-[200px]">{s.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Test Scenarios from User Specification */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
            Test intelligence & real-time knowledge:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              "Tell me about Rohit Sharma, the Indian cricketer.",
              "Who is Virat Kohli?",
              "Explain Python in simple terms.",
              "What is ERPNext?",
              "Tell me today's cricket news.",
              "Remind me to call my friend at 6 PM.",
            ].map((cmd, idx) => (
              <button
                key={idx}
                disabled={!isOn}
                onClick={() => {
                  if (isOn) {
                    handleUserMessage(cmd);
                  }
                }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all text-left ${
                  isOn
                    ? 'bg-slate-800/80 hover:bg-slate-700/90 text-slate-200 border-slate-700 hover:border-cyan-500/50 hover:text-cyan-300'
                    : 'bg-slate-900/50 text-slate-600 border-slate-800 cursor-not-allowed'
                }`}
              >
                "{cmd}"
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar for Typing Fallback */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (textInput.trim() && isOn) {
              handleUserMessage(textInput.trim());
              setTextInput('');
            }
          }}
          className="flex items-center space-x-2 pt-2"
        >
          <input
            type="text"
            disabled={!isOn}
            placeholder={isOn ? "Ask Machi any question, sports news, or coding concept..." : "Turn Machi ON to talk"}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!isOn || !textInput.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white p-2.5 rounded-xl transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!isOn}
            onClick={triggerWakeSession}
            className="bg-slate-800 hover:bg-slate-700 text-cyan-400 p-2.5 rounded-xl border border-slate-700 transition-all"
            title="Click to speak immediately"
          >
            <Mic className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Speed & Intelligence Architecture Callout */}
      <div className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-300">
            Speed Optimization & Grounding Architecture
          </p>
          <p className="leading-relaxed">
            Machi identifies actual intent immediately. Factual questions trigger direct expert explanations. Sports scores and time-sensitive news dynamically trigger Google Search Grounding with source verification. In-flight responses can be instantly interrupted by tapping the orb (barge-in).
          </p>
        </div>
      </div>
    </div>
  );
};
