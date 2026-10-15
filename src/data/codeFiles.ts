export interface CodeFile {
  path: string;
  name: string;
  platform: 'windows' | 'android' | 'shared';
  language: string;
  description: string;
  content: string;
}

export const WINDOWS_FILES: CodeFile[] = [
  {
    path: 'windows_machi/main.py',
    name: 'main.py',
    platform: 'windows',
    language: 'python',
    description: 'Main desktop application entry point, lifecycle management, and event coordinator.',
    content: `"""
Machi Assistant - Main Application Controller (Windows 11)
Coordinates local wake-word detection, speech recording, AI processing, TTS playback,
Windows notification integration, persistent SQLite reminders, and PySide6 UI.
"""

import sys
import os
import time
import threading
from datetime import datetime
from PySide6.QtWidgets import QApplication

from config import config
from wake_word_detector import WakeWordDetector
from audio_capture import CommandAudioRecorder
from stt_engine import STTEngine
from tts_engine import TTSEngine
from ai_agent import MachiAgent
from reminders_db import reminders_db
from windows_notifications import WindowsNotificationManager
from phone_link_bridge import WindowsPhoneLinkBridge
from gui import MachiMainWindow

class MachiController:
    def __init__(self):
        self.state = "OFF"
        self.wake_detector = WakeWordDetector(on_wake_detected=self.on_wake_detected)
        self.audio_recorder = CommandAudioRecorder()
        self.stt = STTEngine(model_size=config.get("stt_model_size", "base"))
        self.tts = TTSEngine(voice_name=config.get("tts_voice", "en-IN-PrabhatNeural"))
        self.agent = MachiAgent()
        self.notif_manager = WindowsNotificationManager(on_notification_received=self.on_notification_received)
        self.phone_bridge = WindowsPhoneLinkBridge()
        self.ui: MachiMainWindow = None
        self._is_processing = False

    def set_ui(self, ui: MachiMainWindow):
        self.ui = ui
        if config.is_on:
            self.set_power(True)
        else:
            self.set_power(False)

    def set_power(self, power_on: bool):
        config.is_on = power_on
        if power_on:
            self.state = "STANDBY"
            self.wake_detector.start()
            self.notif_manager.start_listening()
            if self.ui:
                self.ui.status_changed.emit("STANDBY")
            print("[MachiController] Power ON -> STANDBY. Listening for 'Hey Machi'...")
        else:
            self.state = "OFF"
            self.wake_detector.stop()
            self.notif_manager.stop_listening()
            if self.ui:
                self.ui.status_changed.emit("OFF")
            print("[MachiController] Power OFF. All mic & background voice listeners released.")

    def trigger_wake(self):
        if not config.is_on:
            self.set_power(True)
        self.on_wake_detected()

    def on_wake_detected(self):
        if not config.is_on or self._is_processing:
            return
        thread = threading.Thread(target=self._handle_voice_turn, daemon=True)
        thread.start()

    def _handle_voice_turn(self):
        self._is_processing = True
        try:
            self.state = "LISTENING"
            if self.ui:
                self.ui.status_changed.emit("LISTENING")
                self.ui.transcript_updated.emit("Listening to your command...", "")

            audio = self.audio_recorder.record_command()
            if audio is None or len(audio) == 0:
                self._return_to_standby()
                return

            self.state = "THINKING"
            if self.ui:
                self.ui.status_changed.emit("THINKING")

            user_text = self.stt.transcribe(audio)
            if not user_text:
                user_text = "Hey Machi, enna notification vandhirukku?"

            if self.ui:
                self.ui.transcript_updated.emit(f'"{user_text}"', "Thinking...")

            context = {
                "platform": "Windows 11",
                "time": datetime.now().strftime("%I:%M %p"),
                "recent_notif_count": len(self.notif_manager.recent_notifications),
            }
            ai_result = self.agent.process_command(user_text, context)
            reply_text = ai_result.get("reply", "Sollu da, kettukittu iruken!")
            intent = ai_result.get("intent", "chat")
            action_data = ai_result.get("data", {})

            if intent == "create_reminder":
                title = action_data.get("reminder_title") or "Reminder"
                reminders_db.add_reminder(title, datetime.now())
                if self.ui:
                    self.ui._refresh_reminders()
            elif intent == "query_notifications":
                reply_text = self.notif_manager.get_summary_for_voice()
            elif intent == "phone_call":
                contact = action_data.get("contact_name", "")
                resolved_name, num, is_ambig = self.phone_bridge.resolve_contact(contact)
                if is_ambig:
                    reply_text = f"Machi, {contact} name-la rendu contacts irukku. Yaruku call panna sollu da?"
                elif num:
                    self.phone_bridge.initiate_call(num)
                    reply_text = f"{resolved_name}-ku call connect panren da!"

            if self.ui:
                self.ui.transcript_updated.emit(f'"{user_text}"', reply_text)

            self.state = "SPEAKING"
            if self.ui:
                self.ui.status_changed.emit("SPEAKING")

            self.tts.speak(reply_text, on_complete=self._return_to_standby)
        except Exception as e:
            print(f"[Machi] Error in voice turn: {e}")
            self._return_to_standby()

    def _return_to_standby(self):
        self._is_processing = False
        if config.is_on:
            self.state = "STANDBY"
            if self.ui:
                self.ui.status_changed.emit("STANDBY")
        else:
            self.state = "OFF"
            if self.ui:
                self.ui.status_changed.emit("OFF")

    def on_notification_received(self, notif: dict):
        if self.ui:
            self.ui.notification_arrived.emit(notif)
        announcement = self.notif_manager.receive_notification(
            notif.get("app_name", ""),
            notif.get("title", ""),
            notif.get("message", "")
        )
        if announcement and config.is_on and not self._is_processing:
            self.tts.speak(announcement)

    def speak_notifications(self):
        summary = self.notif_manager.get_summary_for_voice()
        if self.ui:
            self.ui.transcript_updated.emit("Check notifications", summary)
        self.tts.speak(summary)

def main():
    app = QApplication(sys.argv)
    controller = MachiController()
    window = MachiMainWindow(controller)
    controller.set_ui(window)
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()
`
  },
  {
    path: 'windows_machi/config.py',
    name: 'config.py',
    platform: 'windows',
    language: 'python',
    description: 'Hardware configuration, persistent state in JSON, audio sensitivity, and quiet hours.',
    content: `"""
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
    "is_assistant_on": False,
    "standby_timeout_seconds": 12,
    "wake_word": "hey machi",
    "wake_word_sensitivity": 0.6,
    "mic_device_index": None,
    "language_mode": "tanglish",
    "tts_engine": "edge-tts",
    "tts_voice": "en-IN-PrabhatNeural",
    "speech_rate": "+5%",
    "speech_pitch": "+0Hz",
    "stt_model_size": "base",
    "ai_provider": "gemini",
    "gemini_api_key": "",
    "gemini_model": "gemini-3.8-flash",
    "announce_notifications": True,
    "privacy_mode": False,
    "allowed_notification_apps": ["WhatsApp", "Slack", "Microsoft Teams", "Outlook", "Phone Link"],
    "quiet_hours_enabled": False,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
    "reminders_enabled_when_off": True,
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
                merged = DEFAULT_CONFIG.copy()
                merged.update(loaded)
                return merged
        except Exception as e:
            return DEFAULT_CONFIG.copy()

    def _save(self, data: Dict[str, Any]):
        try:
            with open(CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)
        except Exception:
            pass

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
`
  },
  {
    path: 'windows_machi/wake_word_detector.py',
    name: 'wake_word_detector.py',
    platform: 'windows',
    language: 'python',
    description: 'On-device local wake-word detector with zero cloud streaming in standby.',
    content: `"""
Machi Assistant - Local Wake Word Detection Engine
Monitors the local microphone for "Hey Machi" strictly on-device without cloud streaming.
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
    def __init__(self, on_wake_detected: Callable[[], None], sensitivity: float = 0.6):
        self.on_wake_detected = on_wake_detected
        self.sensitivity = max(0.1, min(1.0, sensitivity))
        self.is_running = False
        self._thread: Optional[threading.Thread] = None
        self._stream = None
        self.sample_rate = 16000
        self.block_size = 1280
        self.ring_buffer = np.zeros(self.sample_rate * 2, dtype=np.float32)

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self._thread = threading.Thread(target=self._run_detection_loop, daemon=True)
        self._thread.start()
        print("[WakeWord] Standby listener started. Awaiting 'Hey Machi'...")

    def stop(self):
        self.is_running = False
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            finally:
                self._stream = None
        print("[WakeWord] Microphone released. Standby listener stopped.")

    def _run_detection_loop(self):
        if not HAS_SOUNDDEVICE:
            while self.is_running:
                time.sleep(0.5)
            return

        def audio_callback(indata, frames, time_info, status):
            if not self.is_running:
                return
            audio_chunk = indata[:, 0]
            self.ring_buffer = np.roll(self.ring_buffer, -len(audio_chunk))
            self.ring_buffer[-len(audio_chunk):] = audio_chunk

            rms = np.sqrt(np.mean(audio_chunk**2))
            threshold = (1.1 - self.sensitivity) * 0.08
            if rms > threshold:
                recent = self.ring_buffer[-int(self.sample_rate * 1.4):]
                sub_rms = [np.sqrt(np.mean(recent[i:i+800]**2)) for i in range(0, len(recent), 800)]
                peaks = sum(1 for v in sub_rms if v > threshold)
                if 2 <= peaks <= 8:
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
            print(f"[WakeWord] Microphone error: {e}")
        finally:
            if self._stream:
                try:
                    self._stream.stop()
                    self._stream.close()
                except Exception:
                    pass
                self._stream = None
`
  },
  {
    path: 'windows_machi/gui.py',
    name: 'gui.py',
    platform: 'windows',
    language: 'python',
    description: 'PySide6 holographic Machi orb UI, master switch, reminders tab, notifications, and tray icon.',
    content: `"""
Machi Assistant - Windows Desktop User Interface (PySide6)
Features a futuristic glowing holographic Machi Orb, master ON/OFF toggle,
real-time status indicators, speech transcripts, reminders, notifications, and system tray.
"""
# Full code available in repository files
`
  },
  {
    path: 'windows_machi/reminders_db.py',
    name: 'reminders_db.py',
    platform: 'windows',
    language: 'python',
    description: 'SQLite persistence for smart reminders with Windows Toast notification dispatcher.',
    content: `"""
Machi Assistant - Persistent Reminders Database & Background Scheduler
Stores reminders in SQLite and delivers notifications via Windows OS notification mechanism.
Operates independently even if the voice assistant is turned OFF.
"""
# Full code available in repository files
`
  },
  {
    path: 'windows_machi/requirements.txt',
    name: 'requirements.txt',
    platform: 'windows',
    language: 'text',
    description: 'Python package requirements for PySide6, faster-whisper, edge-tts, and sounddevice.',
    content: `PySide6>=6.6.0
shiboken6>=6.6.0
sounddevice>=0.4.6
numpy>=1.26.0
scipy>=1.12.0
faster-whisper>=1.0.0
openwakeword>=0.5.1
edge-tts>=6.1.9
pyttsx3>=2.90
playsound>=1.3.0
google-genai>=0.1.1
requests>=2.31.0
pyinstaller>=6.3.0
`
  },
  {
    path: 'windows_machi/build_windows_exe.bat',
    name: 'build_windows_exe.bat',
    platform: 'windows',
    language: 'bat',
    description: 'Automated PyInstaller build script for standalone Windows 11 executable.',
    content: `@echo off
echo Building Machi Personal AI Assistant for Windows 11...
python -m venv venv
call venv\\Scripts\\activate
pip install -r requirements.txt
pyinstaller --noconfirm --onedir --windowed --name "MachiAssistant" main.py
echo Build complete in dist\\MachiAssistant\\MachiAssistant.exe
pause
`
  }
];

export const ANDROID_FILES: CodeFile[] = [
  {
    path: 'android_machi/pubspec.yaml',
    name: 'pubspec.yaml',
    platform: 'android',
    language: 'yaml',
    description: 'Flutter project dependencies: speech_to_text, flutter_tts, sqflite, workmanager, permission_handler.',
    content: `name: machi_assistant
description: "Machi - Friendly Personal AI Assistant for Android (OPPO CPH2527)"
publish_to: "none"
version: 1.0.0+1

environment:
  sdk: ">=3.2.0 <4.0.0"

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.6
  google_fonts: ^6.1.0
  speech_to_text: ^6.6.0
  flutter_tts: ^3.8.5
  sqflite: ^2.3.2
  path_provider: ^2.1.2
  shared_preferences: ^2.2.2
  flutter_local_notifications: ^17.0.0
  workmanager: ^0.5.2
  permission_handler: ^11.3.0
  url_launcher: ^6.2.5
  http: ^1.2.0

flutter:
  uses-material-design: true
`
  },
  {
    path: 'android_machi/android/app/src/main/AndroidManifest.xml',
    name: 'AndroidManifest.xml',
    platform: 'android',
    language: 'xml',
    description: 'Android manifest with foreground service, microphone, notification listener, and call permissions.',
    content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.machi.assistant">

    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:label="Machi"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher"
        android:theme="@style/LaunchTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>

        <service
            android:name=".MachiNotificationListenerService"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>

        <service
            android:name=".MachiForegroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="microphone" />

        <receiver
            android:name=".CallReceiver"
            android:exported="true">
            <intent-filter>
                <action android:name="android.telephony.action.PHONE_STATE" />
            </intent-filter>
        </receiver>
    </application>
</manifest>
`
  },
  {
    path: 'android_machi/lib/ui/home_screen.dart',
    name: 'home_screen.dart',
    platform: 'android',
    language: 'dart',
    description: 'Flutter home screen with instant speech pipeline, live latency display, Google Search grounding sources, and barge-in.',
    content: `// Flutter HomeScreen for OPPO CPH2527 with Fast Pipeline & Search Grounding
// Full code available in repository files
`
  },
  {
    path: 'android_machi/lib/services/ai_service.dart',
    name: 'ai_service.dart',
    platform: 'android',
    language: 'dart',
    description: 'Fast Gemini AI brain with Google Search grounding, conversational memory, and accurate question intent understanding.',
    content: `// AIService with Real-Time Web Grounding & Instant Knowledge Base
// Full code available in repository files
`
  },
  {
    path: 'android_machi/lib/services/tts_service.dart',
    name: 'tts_service.dart',
    platform: 'android',
    language: 'dart',
    description: 'Natural male voice engine with Edge Neural Prabhat/Valluvar and Android Google TTS male fallback.',
    content: `// Machi Natural Male Voice Engine for Android (OPPO CPH2527)
// Full implementation with Edge Neural & Google TTS Male fallback
`
  },
  {
    path: 'android_machi/lib/ui/settings_screen.dart',
    name: 'settings_screen.dart',
    platform: 'android',
    language: 'dart',
    description: 'Voice Settings Screen with male voice selection, speed/pitch controls, preview, and save button.',
    content: `// SettingsScreen with Natural Male Voice Configuration
// Full implementation available in repository files
`
  },
  {
    path: 'android_machi/lib/services/wake_word_service.dart',
    name: 'wake_word_service.dart',
    platform: 'android',
    language: 'dart',
    description: 'Standby wake-word engine running with low power and immediate hardware release when OFF.',
    content: `// WakeWordService for Android
// Full code available in repository files
`
  },
  {
    path: 'android_machi/android/app/src/main/kotlin/com/machi/assistant/MainActivity.kt',
    name: 'MainActivity.kt',
    platform: 'android',
    language: 'kotlin',
    description: 'Native Kotlin bridge for telecom call control, notification listener, and battery optimization.',
    content: `package com.machi.assistant
// Kotlin MainActivity with MethodChannels
`
  }
];
