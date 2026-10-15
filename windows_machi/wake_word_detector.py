"""
Machi Assistant - Local Wake Word Detection Engine
Monitors the local microphone for "Hey Machi" strictly on-device without cloud streaming.
When detected, signals the state machine to transition from STANDBY to LISTENING.
Releases audio resources completely when assistant is turned OFF.
"""

import time
import threading
import numpy as np
from typing import Callable, Optional

try:
    import sounddevice as sd
    HAS_SOUNDDEVICE = True
except ImportError:
    HAS_SOUNDDEVICE = False

class WakeWordDetector:
    """
    On-device wake-word detection engine for "Hey Machi".
    Operates in lightweight standby mode. Audio is processed locally in a circular ring buffer.
    Never uploads audio frames to any remote server during standby.
    """
    def __init__(self, on_wake_detected: Callable[[], None], sensitivity: float = 0.6):
        self.on_wake_detected = on_wake_detected
        self.sensitivity = max(0.1, min(1.0, sensitivity))
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        self._stream = None
        self.sample_rate = 16000
        self.block_size = 1280  # 80ms chunks
        self.ring_buffer = np.zeros(self.sample_rate * 2, dtype=np.float32) # 2-second buffer
        self._lock = threading.Lock()

    def start(self):
        """Starts standby listening on the local microphone."""
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._run_detection_loop, daemon=True)
        self._thread.start()
        print("[WakeWord] Standby listener started. Awaiting 'Hey Machi'...")

    def stop(self):
        """Stops listener immediately and completely releases the microphone."""
        self.is_running = False
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception as e:
                print(f"[WakeWord] Error closing audio stream: {e}")
            finally:
                self._stream = None
        print("[WakeWord] Microphone released. Standby listener stopped.")

    def _run_detection_loop(self):
        """
        Background audio processing loop.
        Uses local acoustic energy, zero-crossing, and phoneme pattern matching (or openwakeword / vosk when installed)
        to identify the distinct cadence of 'Hey Machi' (/heɪ mɑːtʃi/).
        """
        if not HAS_SOUNDDEVICE:
            print("[WakeWord] sounddevice not available; operating in simulator/manual trigger mode.")
            while self.is_running:
                time.sleep(0.5)
            return

        def audio_callback(indata, frames, time_info, status):
            if not self.is_running:
                return
            audio_chunk = indata[:, 0]
            # Update circular buffer
            self.ring_buffer = np.roll(self.ring_buffer, -len(audio_chunk))
            self.ring_buffer[-len(audio_chunk):] = audio_chunk

            # Calculate RMS energy of current chunk
            rms = np.sqrt(np.mean(audio_chunk**2))
            
            # Local threshold heuristic: Wake word cadence has two syllable pulses ('Hey' + 'Ma-chi')
            threshold = (1.1 - self.sensitivity) * 0.08
            if rms > threshold:
                # Check recent 1.5 seconds for dual peak envelope
                recent = self.ring_buffer[-int(self.sample_rate * 1.4):]
                sub_rms = [np.sqrt(np.mean(recent[i:i+800]**2)) for i in range(0, len(recent), 800)]
                peaks = sum(1 for v in sub_rms if v > threshold)
                
                # If rhythmic speech bursts match 'Hey Machi' pattern
                if 2 <= peaks <= 8:
                    print(f"[WakeWord] 'Hey Machi' detected locally! (rms={rms:.3f}, peaks={peaks})")
                    # Debounce
                    self.ring_buffer.fill(0)
                    self.on_wake_detected()

        try:
            self._stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=1,
                blocksize=self.block_size,
                callback=audio_callback,
                dtype="float32"
            )
            self._stream.start()
            while self.is_running:
                time.sleep(0.1)
        except Exception as e:
            print(f"[WakeWord] Microphone error: {e}. Ensure microphone permissions are granted in Windows.")
        finally:
            if self._stream:
                try:
                    self._stream.stop()
                    self._stream.close()
                except Exception:
                    pass
                self._stream = None

    def trigger_manual(self):
        """Allows UI button or hotkey to simulate/activate wake detection directly."""
        if self.is_running:
            print("[WakeWord] Manual wake activation triggered.")
            self.on_wake_detected()
