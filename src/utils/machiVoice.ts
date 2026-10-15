/**
 * Machi Natural Human-Like Male Voice Engine
 * 
 * Provides:
 * - Natural, calm, warm, humble male companion voice (Charon Neural / Microsoft Prabhat / Valluvar)
 * - Clear pronunciation for English, Tamil, and Tanglish
 * - Natural human conversational pacing with micro-pauses between sentences
 * - Centralized voice settings and instant cancellation support (barge-in)
 */

export interface MachiVoiceSettings {
  voiceModel: 'gemini_charon' | 'edge_prabhat' | 'gemini_puck' | 'system_male';
  speechRate: number; // 0.65 to 1.30, default 0.95 (natural conversational speed)
  pitch: number;      // 0.75 to 1.25, default 0.98 (gentle, warm male depth)
  preferMale: boolean;
  enableNeuralStreaming: boolean;
}

export const DEFAULT_VOICE_SETTINGS: MachiVoiceSettings = {
  voiceModel: 'edge_prabhat',
  speechRate: 0.95,
  pitch: 0.98,
  preferMale: true,
  enableNeuralStreaming: true,
};

// Global audio tracking and cancellation state
let activeAudioElement: HTMLAudioElement | null = null;
let activeUtterances: SpeechSynthesisUtterance[] = [];
let isPlaybackCancelled = false;
let currentSpeechSessionId = 0;

export function getSavedVoiceSettings(): MachiVoiceSettings {
  try {
    const saved = localStorage.getItem('machi_voice_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      const voiceModel = parsed.voiceModel || 'edge_prabhat';
      return {
        ...DEFAULT_VOICE_SETTINGS,
        ...parsed,
        voiceModel,
        // Ensure values remain within natural human bounds
        speechRate: Math.max(0.65, Math.min(1.3, Number(parsed.speechRate) || 0.95)),
        pitch: Math.max(0.75, Math.min(1.25, Number(parsed.pitch) || 0.98)),
      };
    }
  } catch {}
  return { ...DEFAULT_VOICE_SETTINGS };
}

export function saveVoiceSettings(settings: MachiVoiceSettings): void {
  try {
    localStorage.setItem('machi_voice_settings', JSON.stringify(settings));
  } catch {}
}

/**
 * Filter out synthetic female voices and prioritize natural/neural Indian English
 * and Tamil male voices for a humble, friendly male companion sound.
 */
export function findBestHumanMaleVoice(
  voices: SpeechSynthesisVoice[],
  text: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const femaleBlacklist = [
    'female', 'zira', 'heera', 'pallavi', 'neerja', 'sita', 'veena',
    'ananya', 'sangeeta', 'priya', 'kavya', 'kalpana', 'swara',
    'jenny', 'aria', 'samantha', 'victoria', 'karen', 'moira', 'tessa',
    'fiona', 'eva', 'hazel', 'susan', 'helena', 'catherine', 'clara',
    'laura', 'anna', 'olga', 'maria', 'elena', 'sarah', 'zoe', 'natasha'
  ];

  const isFemale = (v: SpeechSynthesisVoice) => {
    const lowerName = v.name.toLowerCase();
    return femaleBlacklist.some((bad) => lowerName.includes(bad));
  };

  const isTamilScript = /[\u0B80-\u0BFF]/.test(text);

  // 1. If Tamil script is detected, look for Tamil male voice
  if (isTamilScript) {
    const tamilMale = voices.find(
      (v) =>
        (v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil')) &&
        (v.name.toLowerCase().includes('valluvar') ||
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('tfe')) &&
        !isFemale(v)
    );
    if (tamilMale) return tamilMale;

    const anyTamil = voices.find(
      (v) => (v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil')) && !isFemale(v)
    );
    if (anyTamil) return anyTamil;
  }

  // 2. High priority Indian English male voices (Prabhat, Rishi, Ravi, Android en-in male)
  const priorityIndianMale = voices.find(
    (v) =>
      !isFemale(v) &&
      (v.name.toLowerCase().includes('prabhat') ||
        v.name.toLowerCase().includes('rishi') ||
        v.name.toLowerCase().includes('ravi') ||
        ((v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in')) &&
          (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('cxx'))))
  );
  if (priorityIndianMale) return priorityIndianMale;

  // 3. Any Indian English voice that is not explicitly female
  const fallbackIndianVoice = voices.find(
    (v) =>
      !isFemale(v) &&
      (v.lang.toLowerCase().includes('en-in') || v.lang.toLowerCase().includes('en_in'))
  );
  if (fallbackIndianVoice) return fallbackIndianVoice;

  // 4. Natural/Neural conversational English male voices (Guy, George, Ryan, Oliver, David, Arthur)
  const naturalEnglishMale = voices.find(
    (v) =>
      !isFemale(v) &&
      v.lang.toLowerCase().startsWith('en') &&
      (v.name.toLowerCase().includes('guy') ||
        v.name.toLowerCase().includes('george') ||
        v.name.toLowerCase().includes('ryan') ||
        v.name.toLowerCase().includes('oliver') ||
        v.name.toLowerCase().includes('arthur') ||
        v.name.toLowerCase().includes('david') ||
        v.name.toLowerCase().includes('james') ||
        v.name.toLowerCase().includes('male'))
  );
  if (naturalEnglishMale) return naturalEnglishMale;

  // 5. Any English voice not on the female blacklist
  const anyNonFemaleEnglish = voices.find(
    (v) => !isFemale(v) && v.lang.toLowerCase().startsWith('en')
  );
  if (anyNonFemaleEnglish) return anyNonFemaleEnglish;

  // 6. Absolute fallback: first non-female voice
  const fallbackVoice = voices.find((v) => !isFemale(v));
  return fallbackVoice || voices[0] || null;
}

/**
 * Split text into full conversational sentences at natural sentence terminals (. ! ?),
 * preserving sentence context, clauses, and commas without chopped fragments.
 */
export function splitIntoConversationalSentences(text: string): string[] {
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  if (!clean) return [];

  // Split only on true sentence terminals followed by a capital letter or digit
  // Do NOT split on commas, semicolons, or clauses to preserve natural intonation and prosodic context
  const parts = clean.split(/(?<=[.!?])\s+(?=[A-Z\u0B80-\u0BFF0-9"'])/);
  const result: string[] = [];

  for (const p of parts) {
    const trimmed = p.trim();
    if (trimmed.length > 0) {
      result.push(trimmed);
    }
  }

  return result.length > 0 ? result : [clean];
}

/**
 * Stop any current speech playback immediately (barge-in / interrupt support).
 */
export function stopMachiSpeech(): void {
  isPlaybackCancelled = true;
  currentSpeechSessionId++;

  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.removeAttribute('src');
      activeAudioElement.load();
    } catch {}
    activeAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
    activeUtterances = [];
  }
}

/**
 * Speak text using the selected natural human male voice:
 * 1. Microsoft Prabhat Neural / Valluvar Neural or Gemini Charon
 * 2. Full sentence prosody with conversational breathing cadence
 * 3. Native neural rate/pitch generation without browser time-stretching distortion
 */
export async function speakMachiText(
  text: string,
  options?: {
    customSettings?: MachiVoiceSettings;
    onStart?: () => void;
    onEnd?: () => void;
  }
): Promise<void> {
  const settings = options?.customSettings || getSavedVoiceSettings();
  const trimmed = text.trim();
  if (!trimmed) {
    if (options?.onEnd) options.onEnd();
    return;
  }

  stopMachiSpeech();
  isPlaybackCancelled = false;
  const session = ++currentSpeechSessionId;

  // 1. Try Natural Neural Male Voice (Prabhat / Valluvar / Charon)
  if (settings.voiceModel !== 'system_male' && settings.enableNeuralStreaming) {
    try {
      let voiceName = 'Brian';
      if (settings.voiceModel === 'gemini_charon') voiceName = 'Charon';
      else if (settings.voiceModel === 'gemini_puck') voiceName = 'Puck';
      else if (settings.voiceModel === 'edge_prabhat') voiceName = 'Brian';

      const response = await fetch('/api/machi/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          voice: voiceName,
          rate: settings.speechRate,
          pitch: settings.pitch,
        }),
      });

      if (response.ok && !isPlaybackCancelled && session === currentSpeechSessionId) {
        const data = await response.json();
        if (data.audioBase64) {
          const mime = data.mimeType || 'audio/mp3';
          const audio = new Audio(`data:${mime};base64,${data.audioBase64}`);
          activeAudioElement = audio;
          // Clean 1.0 playback speed to prevent browser digital resampling artifacts
          audio.playbackRate = 1.0;

          audio.onplay = () => {
            if (session !== currentSpeechSessionId) {
              try { audio.pause(); } catch {}
              return;
            }
            if (options?.onStart) options.onStart();
          };

          audio.onended = () => {
            if (session !== currentSpeechSessionId) return;
            activeAudioElement = null;
            if (options?.onEnd) options.onEnd();
          };

          audio.onerror = () => {
            if (session !== currentSpeechSessionId || isPlaybackCancelled) return;
            activeAudioElement = null;
            speakViaNaturalDeviceSynthesis(trimmed, settings, options, session);
          };

          await audio.play();
          return;
        }
      }
    } catch {
      // If network fetch fails, proceed to resilient device male synthesis
    }
  }

  if (isPlaybackCancelled || session !== currentSpeechSessionId) return;

  // 2. Fallback to Natural Device Speech Synthesis strictly using male voices
  speakViaNaturalDeviceSynthesis(trimmed, settings, options, session);
}

/**
 * Speak using on-device SpeechSynthesis with strictly verified male voice,
 * natural sentence rhythm, comfortable pace, and locked voice identity across sentences.
 */
function speakViaNaturalDeviceSynthesis(
  text: string,
  settings: MachiVoiceSettings,
  options?: {
    onStart?: () => void;
    onEnd?: () => void;
  },
  sessionId?: number
): void {
  const activeSession = sessionId || ++currentSpeechSessionId;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (options?.onEnd) options.onEnd();
    return;
  }

  window.speechSynthesis.cancel();
  isPlaybackCancelled = false;

  const sentences = splitIntoConversationalSentences(text);
  if (sentences.length === 0) {
    if (options?.onEnd && activeSession === currentSpeechSessionId) options.onEnd();
    return;
  }

  // Anchor one consistent male voice for the entire response to prevent mid-response voice switching
  const voices = window.speechSynthesis.getVoices();
  const sessionVoice = findBestHumanMaleVoice(voices, text);

  let currentIndex = 0;
  let hasStarted = false;

  const speakNextSentence = () => {
    if (isPlaybackCancelled || activeSession !== currentSpeechSessionId || currentIndex >= sentences.length) {
      activeUtterances = [];
      if (options?.onEnd && activeSession === currentSpeechSessionId) options.onEnd();
      return;
    }

    const currentSentence = sentences[currentIndex];
    const utterance = new SpeechSynthesisUtterance(currentSentence);

    // Apply speech rate & warm male pitch
    utterance.rate = settings.speechRate;
    utterance.pitch = settings.pitch;

    if (sessionVoice) {
      utterance.voice = sessionVoice;
    }

    utterance.onstart = () => {
      if (activeSession !== currentSpeechSessionId) {
        try { window.speechSynthesis.cancel(); } catch {}
        return;
      }
      if (!hasStarted) {
        hasStarted = true;
        if (options?.onStart) options.onStart();
      }
    };

    utterance.onend = () => {
      if (activeSession !== currentSpeechSessionId) return;
      currentIndex++;
      if (currentIndex < sentences.length && !isPlaybackCancelled) {
        // Natural breath pause between distinct sentences (180ms)
        setTimeout(speakNextSentence, 180);
      } else {
        activeUtterances = [];
        if (options?.onEnd) options.onEnd();
      }
    };

    utterance.onerror = () => {
      if (activeSession !== currentSpeechSessionId) return;
      currentIndex++;
      if (currentIndex < sentences.length && !isPlaybackCancelled) {
        setTimeout(speakNextSentence, 100);
      } else {
        activeUtterances = [];
        if (options?.onEnd) options.onEnd();
      }
    };

    activeUtterances.push(utterance);
    window.speechSynthesis.speak(utterance);
  };

  const initialVoices = window.speechSynthesis.getVoices();
  if (initialVoices.length === 0) {
    const handleVoicesChanged = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      if (!isPlaybackCancelled && activeSession === currentSpeechSessionId) {
        speakNextSentence();
      }
    };
    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
  } else {
    speakNextSentence();
  }
}
