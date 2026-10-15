"""
Machi Assistant - Command Audio Capture
Records user speech after wake word activation until speech pause / silence cutoff.
"""

import time
import numpy as np
from typing import Optional

try:
    import sounddevice as sd
    HAS_SD = True
except ImportError:
    HAS_SD = False

class CommandAudioRecorder:
    def __init__(self, sample_rate: int = 16000):
        self.sample_rate = sample_rate
        self.silence_threshold = 0.015
        self.max_duration_seconds = 12.0
        self.silence_cutoff_seconds = 1.4

    def record_command(self, on_audio_chunk: Optional[callable] = None) -> Optional[np.ndarray]:
        """
        Records the user's voice command until pause or maximum duration.
        Returns float32 audio array normalized for Whisper / STT.
        """
        if not HAS_SD:
            print("[AudioCapture] sounddevice not available. Using simulated recording.")
            time.sleep(1.5)
            return np.zeros(self.sample_rate * 2, dtype=np.float32)

        frames = []
        silence_start = None
        has_spoken = False
        start_time = time.time()
        chunk_size = 1024

        try:
            with sd.InputStream(samplerate=self.sample_rate, channels=1, blocksize=chunk_size, dtype="float32") as stream:
                print("[AudioCapture] Listening for user command...")
                while True:
                    data, _ = stream.read(chunk_size)
                    chunk = data[:, 0]
                    frames.append(chunk)

                    if on_audio_chunk:
                        on_audio_chunk(chunk)

                    # Compute volume / energy
                    rms = np.sqrt(np.mean(chunk**2))
                    
                    if rms > self.silence_threshold:
                        has_spoken = True
                        silence_start = None
                    elif has_spoken:
                        if silence_start is None:
                            silence_start = time.time()
                        elif time.time() - silence_start >= self.silence_cutoff_seconds:
                            print(f"[AudioCapture] Speech ended after pause ({self.silence_cutoff_seconds}s silence).")
                            break

                    # Check max duration
                    if time.time() - start_time >= self.max_duration_seconds:
                        print("[AudioCapture] Reached maximum recording window.")
                        break

            if not frames:
                return None

            audio_data = np.concatenate(frames, axis=0)
            return audio_data

        except Exception as e:
            print(f"[AudioCapture] Error capturing command: {e}")
            return None
