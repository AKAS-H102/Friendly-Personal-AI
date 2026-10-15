"""
Machi Assistant - Windows Desktop Configuration & State Persistence
Stores settings, ON/OFF states, API credentials, and preferences.
"""

import json
import os
from pathlib import Path
from typing import Any, Dict

CONFIG_DIR = Path.home() / ".machi"
CONFIG_FILE = CONFIG_DIR / "config.json"
DATABASE_FILE = CONFIG_DIR / "machi_local.db"

DEFAULT_CONFIG: Dict[str, Any] = {
    # Core Assistant State
    "is_assistant_on": False,             # Persists across restarts; OFF by default until user turns ON
    "standby_timeout_seconds": 12,        # Time to return to standby after speaking
    
    # Wake Word Settings
    "wake_word": "hey machi",
    "wake_word_sensitivity": 0.6,
    "mic_device_index": None,             # Default system microphone
    
    # Speech & AI Settings
    "language_mode": "tanglish",          # "tanglish", "tamil", "english"
    "tts_engine": "edge-tts",             # "edge-tts" or "pyttsx3" (offline)
    "tts_voice": "en-IN-PrabhatNeural",   # Natural Indian male voice (Prabhat) or "ta-IN-ValluvarNeural" for Tamil
    "speech_rate": "+5%",
    "speech_pitch": "+0Hz",
    "stt_model_size": "base",             # "tiny", "base", "small" for faster-whisper
    
    # AI Backend
    "ai_provider": "gemini",              # "gemini" or "local_llm"
    "gemini_api_key": "",                 # Read from environment GEMINI_API_KEY if empty
    "gemini_model": "gemini-3.8-flash",
    
    # Notifications & Privacy
    "announce_notifications": True,
    "privacy_mode": False,                # If True, announces app name & sender only, not message content
    "allowed_notification_apps": [
        "WhatsApp", "Slack", "Microsoft Teams", "Outlook", "Phone Link"
    ],
    "quiet_hours_enabled": False,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
    
    # Reminders
    "reminders_enabled_when_off": True,   # Scheduled reminders continue via OS toast even if voice is OFF
    
    # Window UI
    "start_minimized_to_tray": False,
    "window_width": 420,
    "window_height": 680,
}

class MachiConfig:
    def __init__(self):
        CONFIG_DIR.mkdir(parents=True, exist_ok=True)
        self.data: Dict[str, Any] = self._load()

    def _load(self) -> Dict[str, Any]:
        if not CONFIG_FILE.exists():
            self._save(DEFAULT_CONFIG)
            return DEFAULT_CONFIG.copy()
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                loaded = json.load(f)
                # Merge defaults for any missing keys
                merged = DEFAULT_CONFIG.copy()
                merged.update(loaded)
                return merged
        except Exception as e:
            print(f"[Config] Error loading config: {e}. Using defaults.")
            return DEFAULT_CONFIG.copy()

    def _save(self, data: Dict[str, Any]):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception as e:
            print(f"[Config] Error saving config: {e}")

    def get(self, key: str, default: Any = None) -> Any:
        return self.data.get(key, default)

    def set(self, key: str, value: Any):
        self.data[key] = value
        self._save(self.data)

    @property
    def is_on(self) -> bool:
        return bool(self.data.get("is_assistant_on", False))

    @is_on.setter
    def is_on(self, val: bool):
        self.set("is_assistant_on", bool(val))

    @property
    def api_key(self) -> str:
        key = self.data.get("gemini_api_key", "").strip()
        if not key:
            key = os.environ.get("GEMINI_API_KEY", "").strip()
        return key

config = MachiConfig()
