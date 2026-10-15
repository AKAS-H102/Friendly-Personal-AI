"""
Machi Assistant - Text-to-Speech (TTS) Engine
Speaks assistant responses with natural conversational flow in Tanglish, Tamil, and English.
Uses Microsoft Edge-TTS for neural natural voices, with pyttsx3 offline fallback.
"""

import asyncio
import os
import tempfile
import threading
from typing import Optional

try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    HAS_PYTTSX3 = False

try:
    import playsound
    HAS_PLAYSOUND = True
except ImportError:
    HAS_PLAYSOUND = False

# Voice options - Prioritizing gentle natural human male voices
VOICE_MAP = {
    "conversational_male": "en-US-BrianMultilingualNeural",  # Warm, natural conversational male companion
    "tamil_male": "ta-IN-ValluvarNeural",                   # Gentle, natural Tamil male companion
    "english_us_male": "en-US-BrianMultilingualNeural",      # Conversational relaxed male voice
}

class TTSEngine:
    def __init__(self, voice_name: str = "en-US-BrianMultilingualNeural", rate: str = "+0%", pitch: str = "+0Hz"):
        self.voice_name = voice_name
        self.rate = rate
        self.pitch = pitch
        self._is_speaking = False
        self._offline_engine = None
        if HAS_PYTTSX3:
            try:
                self._offline_engine = pyttsx3.init()
                # Find offline male voice
                voices = self._offline_engine.getProperty('voices')
                for v in voices:
                    if "male" in v.name.lower() or "david" in v.name.lower() or "ravi" in v.name.lower():
                        self._offline_engine.setProperty('voice', v.id)
                        break
                self._offline_engine.setProperty('rate', 160)
            except Exception:
                self._offline_engine = None

    @property
    def is_speaking(self) -> bool:
        return self._is_speaking

    def speak(self, text: str, on_complete: Optional[callable] = None):
        """Speaks text in a non-blocking background thread."""
        if not text or not text.strip():
            if on_complete:
                on_complete()
            return

        thread = threading.Thread(target=self._speak_sync, args=(text, on_complete), daemon=True)
        thread.start()

    def _speak_sync(self, text: str, on_complete: Optional[callable] = None):
        self._is_speaking = True
        print(f"[TTS] Machi speaking: \"{text}\"")

        # Dynamically select natural male voice matching text language
        has_tamil = any('\u0b80' <= char <= '\u0bff' for char in text)
        target_voice = "ta-IN-ValluvarNeural" if has_tamil else self.voice_name

        # Try Edge-TTS first for natural neural voice
        spoken = False
        if HAS_EDGE_TTS:
            try:
                temp_wav = os.path.join(tempfile.gettempdir(), f"machi_voice_{os.getpid()}.mp3")
                asyncio.run(self._generate_edge_tts(text, temp_wav, target_voice))
                if os.path.exists(temp_wav):
                    if HAS_PLAYSOUND:
                        playsound.playsound(temp_wav, block=True)
                    else:
                        # Fallback to system command (Windows media player / PowerShell sound player)
                        os.system(f'powershell -c "(New-Object Media.SoundPlayer \'{temp_wav}\').PlaySync()"')
                    try:
                        os.remove(temp_wav)
                    except Exception:
                        pass
                    spoken = True
            except Exception as e:
                print(f"[TTS] Edge-TTS error: {e}. Attempting offline fallback.")

        # Offline fallback via pyttsx3
        if not spoken and self._offline_engine:
            try:
                self._offline_engine.say(text)
                self._offline_engine.runAndWait()
                spoken = True
            except Exception as e:
                print(f"[TTS] Offline pyttsx3 error: {e}")

        if not spoken:
            print(f"[TTS Audio Output (Simulated)]: {text}")

        self._is_speaking = False
        if on_complete:
            on_complete()

    async def _generate_edge_tts(self, text: str, output_path: str, voice_name: Optional[str] = None):
        selected_voice = voice_name or self.voice_name
        communicate = edge_tts.Communicate(text, selected_voice, rate=self.rate, pitch=self.pitch)
        await communicate.save(output_path)
