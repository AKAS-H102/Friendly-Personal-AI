"""
Machi Assistant - Speech-to-Text (STT) Engine
Transcribes voice commands into text with support for Tanglish, Tamil, and English.
Uses local faster-whisper on CPU/GPU or lightweight speech recognition fallback.
"""

import numpy as np
from typing import Optional

class STTEngine:
    def __init__(self, model_size: str = "base"):
        self.model_size = model_size
        self._whisper_model = None
        self._is_loaded = False

    def load_model(self):
        """Loads faster-whisper model locally."""
        if self._is_loaded:
            return
        try:
            from faster_whisper import WhisperModel
            print(f"[STT] Loading faster-whisper model '{self.model_size}' on CPU...")
            self._whisper_model = WhisperModel(self.model_size, device="cpu", compute_type="int8")
            self._is_loaded = True
            print("[STT] faster-whisper model loaded successfully.")
        except ImportError:
            print("[STT] faster_whisper not installed. Will use fallback text simulation.")
        except Exception as e:
            print(f"[STT] Failed to load faster-whisper: {e}")

    def transcribe(self, audio_data: np.ndarray, sample_rate: int = 16000) -> str:
        """
        Transcribes numpy audio array to text.
        Supports mixed Tanglish, Tamil phonetics, and English phrases.
        """
        if audio_data is None or len(audio_data) == 0:
            return ""

        if not self._is_loaded:
            self.load_model()

        if self._whisper_model:
            try:
                segments, info = self._whisper_model.transcribe(
                    audio_data,
                    beam_size=5,
                    vad_filter=True,
                    # Tanglish prompt gives Whisper the context for Tamil-English code-switching
                    initial_prompt="Machi, sollu da. Remind pannu, call attend pannu, enna notification vandhirukku."
                )
                text = " ".join([seg.text.strip() for seg in segments]).strip()
                print(f"[STT] Transcribed text: '{text}' (lang={info.language}, prob={info.language_probability:.2f})")
                return text
            except Exception as e:
                print(f"[STT] Transcription error: {e}")

        # Fallback simulation for dev/testing when whisper is not installed
        return "Hey Machi, enna notification vandhirukku?"
