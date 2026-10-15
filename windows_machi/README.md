# Machi - Personal AI Assistant (Windows 11 Desktop)

Machi is a voice-controlled personal AI companion inspired by JARVIS with native support for Tamil, Tanglish, and English voice interactions, local wake-word standby detection ("Hey Machi"), persistent reminders, and notification announcements.

---

## Key Features

1. **Local "Hey Machi" Wake Word Detection**:
   - In standby mode, the local acoustic detector listens strictly on-device. Zero audio is streamed to any cloud provider while waiting for the wake word.
2. **Prominent Master ON/OFF Switch**:
   - Turning the switch **OFF** immediately stops all microphone capture, kills background voice threads, and completely releases the microphone hardware.
   - The OFF state persists in `~/.machi/config.json` across app reboots.
3. **Conversational Tanglish / Tamil / English Brain**:
   - Powered by Google Gemini (`gemini-3.8-flash`) with natural Tamil & Tanglish phonetics.
   - Example: *"Hey Machi"* -> *"Sollu da, enna help venum?"* -> *"Inniku evening 6 manikku sir-ku call panna remind pannu"* -> *"Seri da, evening 6 manikku remind panren."*
4. **Persistent Smart Reminders**:
   - Stored locally in SQLite (`~/.machi/machi_local.db`).
   - Windows Toast notifications are delivered via native Windows Notification Manager even if the assistant's voice mode is OFF.
5. **Windows Notification Announcements**:
   - Reads incoming toast notifications from WhatsApp, Slack, Outlook, or Microsoft Teams.
   - **Privacy Mode**: When enabled, Machi will announce who messaged you without reading sensitive message content aloud.
6. **Phone Link Integration**:
   - Launches outgoing calls via Windows `tel:` and Phone Link protocol handlers with safety confirmation for ambiguous names.

---

## Installation & Setup

### Prerequisites
- Windows 11 (or Windows 10 build 19041+)
- Python 3.10, 3.11, or 3.12
- Working microphone and audio output

### Steps

```powershell
# 1. Clone or extract windows_machi folder
cd windows_machi

# 2. Create and activate a virtual environment
python -m venv venv
.\venv\Scripts\activate

# 3. Install required dependencies
pip install -r requirements.txt

# 4. (Optional) Set your Gemini API key in environment
setx GEMINI_API_KEY "your_gemini_api_key_here"

# 5. Run Machi Desktop
python main.py
```

### Packaging as Standalone Windows Executable (.exe)

Run the included automated build script:
```powershell
.\build_windows_exe.bat
```
The compiled, distributable Windows application will be in `dist\MachiAssistant\MachiAssistant.exe`.

---

## Windows Notification Permissions Guide

To allow Machi to access Windows toast notifications:
1. Open Windows **Settings** (`Win + I`).
2. Go to **Privacy & security** > **Notifications**.
3. Ensure **Notification access** is toggled **ON**.
4. Allow desktop apps to access your notifications.
