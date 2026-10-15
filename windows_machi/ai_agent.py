"""
Machi Assistant - AI Brain & Conversational Agent
Processes user voice input, maintains dialogue context, and extracts operational intents.
Communicates with Gemini model with fallback offline logic.
"""

import json
import os
import requests
from typing import Dict, Any, List
from config import config

MACHI_PROMPT = """
You are Machi, a friendly, witty, caring, and capable personal AI companion inspired by JARVIS, operating on Windows 11.
You speak naturally in Tanglish (Tamil spoken with English script, e.g., 'Sollu da, enna help venum?', 'Inniku evening 6 manikku reminder set panniyachu da!'), Tamil, and English.
Keep replies short (1-2 sentences), conversational, warm, and natural for voice synthesis.
Always respond strictly in JSON format:
{
  "reply": "Tanglish or English spoken response",
  "intent": "chat" | "create_reminder" | "query_notifications" | "phone_call" | "cancel_reminder",
  "data": {
    "reminder_title": "string or null",
    "reminder_time": "human or ISO time or null",
    "contact_name": "string or null",
    "search_query": "string or null"
  }
}
"""

class MachiAgent:
    def __init__(self):
        self.conversation_history: List[Dict[str, str]] = []

    def process_command(self, user_text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Sends user command to Gemini API or executes local fallback parser.
        """
        api_key = config.api_key
        if not api_key:
            return self._local_intent_parser(user_text)

        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{config.get('gemini_model', 'gemini-flash-latest')}:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            
            prompt_content = f"Current context: {json.dumps(context or {})}\nUser message: \"{user_text}\""
            
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": prompt_content}]}
                ],
                "systemInstruction": {
                    "parts": [{"text": MACHI_PROMPT}]
                },
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.7
                }
            }

            resp = requests.post(url, headers=headers, json=payload, timeout=8)
            if resp.status_code == 200:
                result = resp.json()
                text = result["candidates"][0]["content"]["parts"][0]["text"]
                data = json.loads(text)
                self.conversation_history.append({"user": user_text, "machi": data.get("reply", "")})
                return data
            else:
                print(f"[Agent] Gemini API returned {resp.status_code}: {resp.text}")
                return self._local_intent_parser(user_text)
        except Exception as e:
            print(f"[Agent] AI request error: {e}")
            return self._local_intent_parser(user_text)

    def _local_intent_parser(self, text: str) -> Dict[str, Any]:
        """Offline heuristic intent parser when network or key is unavailable."""
        lower = text.lower()
        if "remind" in lower or "reminder" in lower:
            title = text.replace("remind me to", "").replace("remind pannu", "").strip()
            return {
                "reply": "Seri da, evening 6 manikku remind panren.",
                "intent": "create_reminder",
                "data": {"reminder_title": title or "Call Sir", "reminder_time": "6:00 PM"}
            }
        elif "notification" in lower or "message" in lower:
            return {
                "reply": "Recent-ah notifications vandhurukku da, screen-la display panren.",
                "intent": "query_notifications",
                "data": {}
            }
        elif "call" in lower:
            name = lower.replace("call", "").replace("phone pannu", "").strip()
            return {
                "reply": f"Seri da, {name or 'contact'}-ku call connect panna va?",
                "intent": "phone_call",
                "data": {"contact_name": name or "Sir"}
            }
        elif "machi" in lower or "hello" in lower or "hey" in lower:
            return {
                "reply": "Sollu da, enna help venum?",
                "intent": "chat",
                "data": {}
            }
        else:
            return {
                "reply": "Kettu kittu iruken da, sollu!",
                "intent": "chat",
                "data": {}
            }
