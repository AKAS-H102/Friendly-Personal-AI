"""
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
        # If user previously left assistant ON, restart standby
        if config.is_on:
            self.set_power(True)
        else:
            self.set_power(False)

    def set_power(self, power_on: bool):
        """Turns the assistant ON or OFF with complete hardware release."""
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
        """Simulate or trigger wake word."""
        if not config.is_on:
            self.set_power(True)
        self.on_wake_detected()

    def on_wake_detected(self):
        """Called when 'Hey Machi' wake-word is detected locally."""
        if not config.is_on or self._is_processing:
            return
        
        thread = threading.Thread(target=self._handle_voice_turn, daemon=True)
        thread.start()

    def _handle_voice_turn(self):
        self._is_processing = True
        try:
            # 1. State -> LISTENING
            self.state = "LISTENING"
            if self.ui:
                self.ui.status_changed.emit("LISTENING")
                self.ui.transcript_updated.emit("Listening to your command...", "")

            # 2. Capture user command until silence
            audio = self.audio_recorder.record_command()
            if audio is None or len(audio) == 0:
                print("[Machi] No audio captured. Returning to standby.")
                self._return_to_standby()
                return

            # 3. State -> THINKING
            self.state = "THINKING"
            if self.ui:
                self.ui.status_changed.emit("THINKING")

            user_text = self.stt.transcribe(audio)
            if not user_text:
                user_text = "Hey Machi, enna notification vandhirukku?"

            if self.ui:
                self.ui.transcript_updated.emit(f"\"{user_text}\"", "Thinking...")

            # 4. AI reasoning with Gemini / Tanglish brain
            context = {
                "platform": "Windows 11",
                "time": datetime.now().strftime("%I:%M %p"),
                "recent_notif_count": len(self.notif_manager.recent_notifications),
            }
            ai_result = self.agent.process_command(user_text, context)
            reply_text = ai_result.get("reply", "Sollu da, kettukittu iruken!")
            intent = ai_result.get("intent", "chat")
            action_data = ai_result.get("data", {})

            # 5. Handle intent side-effects
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
                self.ui.transcript_updated.emit(f"\"{user_text}\"", reply_text)

            # 6. State -> SPEAKING
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
