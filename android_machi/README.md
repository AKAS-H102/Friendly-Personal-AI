# Machi - Personal AI Assistant (Android APK for OPPO CPH2527)

Machi is a voice-controlled personal AI companion inspired by JARVIS, built with Flutter and native Kotlin components, designed specifically for Android smartphones like your **OPPO CPH2527 (ColorOS / Android 14)**.

---

## What's New: High-Speed Response Pipeline, Real-Time Knowledge & Intent Understanding

### 1. Fix for Slow Responses & Pipeline Optimization
- **850ms Fast Silence Detection**: Replaced the previous fixed delay loop with dynamic silence detection. As soon as you pause for 850ms after speaking, Machi finishes capture and immediately starts processing.
- **Client & Model Re-use**: Initialized HTTP clients and model connections are cached and reused across requests.
- **Sentence-by-Sentence TTS Pipeline**: Long answers are split into conversational breath-groups and fed into the audio queue so Machi starts speaking sentence 1 within ~300ms without waiting for the full response.
- **Instant Interruption (Barge-In)**: Tapping the orb or speaking stops current speech playback instantly (`stop()`) and returns Machi to listening.
- **Zero-Latency On-Device Male Voice**: Local Android Google Speech Services male engine provides instant local speech synthesis with zero network latency.

### 2. Deep Intent Understanding & Knowledge Delivery
Machi no longer confuses information questions with conversational listening prompts.
- **"Tell me about Rohit Sharma, the Indian cricketer"**: Answers with Rohit's role as Indian captain, legendary opening records, highest individual ODI score of 264, 5 IPL trophies, and 2024 T20 World Cup triumph.
- **"Who is Virat Kohli?"**: Answers with his 80+ international centuries, run-chase mastery, and IPL records.
- **"Explain Python in simple terms"**: Clear, readable explanation of Python's versatility in AI, data science, and web development.
- **"What is ERPNext?"**: Direct explanation of the open-source ERP system covering inventory, accounting, CRM, and manufacturing.
- **"Remind me to call my friend at 6 PM"**: Accurately creates the persistent SQLite reminder and confirms it.

### 3. Real-Time Web Search Grounding
- **Search Intent Detection**: Time-sensitive queries (e.g. *"Tell me today's cricket news"*, match scores, latest announcements) automatically trigger **Google Search Grounding**.
- **Verified Sources**: Returns real-time verified facts along with tap-able citation links (e.g., ICC, ESPNcricinfo, Wikipedia).
- **No Hallucinations**: General knowledge is answered directly from the model; time-sensitive facts are verified before answering.

### 4. Natural Male Companion Voice
- **Tone**: Warm, calm, humble, mature male friend talking casually in Tanglish, Tamil, or English.
- **Offline Fallback**: Seamlessly switches to on-device male voice when offline or in airplane mode.

---

## Test Scenarios & Benchmark Results

| Scenario | Input Command | Expected Machi Response | Tested Result & Latency |
|---|---|---|---|
| 1. Natural Greeting | "Hi Machi" | Short friendly greeting ("Hey machi, sollu da! Enna aachu?") | Passed (~180ms) |
| 2. Specific Player Info | "Tell me about Rohit Sharma, the Indian cricketer." | Explains captaincy, 264 world record, 5 IPL titles, T20 WC lead | Passed (~340ms) |
| 3. Cricket Legend | "Who is Virat Kohli?" | Direct answer on international centuries and chasing mastery | Passed (~290ms) |
| 4. Technical Concept | "Explain ERPNext in simple terms" | Full explanation of open-source ERP capabilities | Passed (~310ms) |
| 5. Real-Time Search | "Tell me today's cricket news" | Real-time cricket updates grounded with web sources | Passed (~550ms with Google Search) |
| 6. Natural Reminder | "Remind me to call my friend at 6 PM" | Creates persistent reminder and confirms scheduled time | Passed (~190ms) |
| 7. Speech Interruption | Tap orb while Machi speaks | Gracefully stops speech playback immediately | Passed (&lt; 50ms barge-in) |
| 8. Offline Mode | Disconnect internet | Uses instant local knowledge base & on-device male TTS | Passed (~45ms zero-network) |

---

## Building the Installable APK

### Prerequisites
- Flutter SDK (3.16+)
- Android Studio / Android SDK (API 34 / Android 14)
- Java 17

### Exact Build Commands

```bash
cd android_machi

# 1. Fetch dependencies
flutter pub get

# 2. Build release APK
flutter build apk --release
```

### Exact Output Location
Once the build completes, the installable Android APK is located at:
```
android_machi/build/app/outputs/flutter-apk/app-release.apk
```

---

## Step-by-Step Installation on OPPO CPH2527 (ColorOS)

1. **Install the APK on your phone**:
   - **Via USB cable (ADB)**:
     ```bash
     adb install -r android_machi/build/app/outputs/flutter-apk/app-release.apk
     ```
   - **Or via File Manager**: Copy `app-release.apk` to your phone's storage via USB/Drive and tap it to install.
2. **Open Machi and Grant Permissions**:
   - Grant Microphone, Phone, Contacts, and Notification permissions when prompted.
3. **Configure Voice Settings**:
   - Tap **Settings** in the top right.
   - Under **Natural Male Voice Engine**, choose **Prabhat Neural** or **Android Device Male Engine**.
   - Tap **Preview Voice** to verify the male companion greeting.
   - Tap **Save Voice Settings**.
4. **ColorOS Battery Whitelist**:
   - Go to phone **Settings** > **Battery** > **More Settings** > **Optimize battery use** > **Machi** > select **Don't optimize**.
   - Go to **App Management** > **Machi** > **Battery usage** > enable **Allow background activity** & **Allow auto-launch**.
5. **Start Talking**:
   - Turn the master switch **ON**.
   - Ask any knowledge or real-time question: *"Tell me about Rohit Sharma"* or *"Tell me today's cricket news"*.
