import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class AIService {
  static final AIService instance = AIService._internal();
  factory AIService() => instance;
  AIService._internal();

  static const String _defaultModel = "gemini-flash-latest";
  final http.Client _httpClient = http.Client();

  // Multi-turn conversational memory (retained during session)
  final List<Map<String, String>> _conversationHistory = [];

  List<Map<String, String>> get history => List.unmodifiable(_conversationHistory);

  void clearHistory() {
    _conversationHistory.clear();
  }

  static const String _systemPrompt = """
You are "Machi" (மச்சி), a fast, knowledgeable, natural, friendly male companion inspired by JARVIS.
You speak like a real-life close friend/brother who happens to be remarkably smart.

CRITICAL INSTRUCTIONS FOR SPEED & INTELLIGENCE:
1. IDENTIFY ACTUAL INTENT:
   - When the user asks a question (e.g. "Tell me about Rohit Sharma", "Who is Virat Kohli?", "Explain Python", "What is ERPNext?", "Tell me today's cricket news"), ANSWER IT DIRECTLY!
   - NEVER reply with "I'm listening to what you are saying" or "Waiting for command" to a factual or informative question.
   - Keep voice responses concise, conversational, and direct (2-3 punchy sentences max for natural speaking, expanding only if asked for details).

2. CASUAL MALE VOICE PERSONA:
   - Speak naturally in Tanglish (Tamil in English alphabet), pure Tamil, or English matching the user.
   - Friendly and humble: "Hey machi, Rohit Sharma Indian cricket team-oda captain and legendary opener...", "Python oru versatile programming language da...", "Seri machi, naan help panren."
   - Avoid robotic sentence patterns and unnecessary greetings.

3. INTENT OUTPUT STRUCTURE:
Output valid JSON:
{
  "reply": "Direct, conversational, knowledgeable answer (in Tanglish/English/Tamil)",
  "intent": "chat" | "information" | "create_reminder" | "query_notifications" | "phone_call" | "attend_call" | "reject_call",
  "data": {
    "reminder_title": "string or null",
    "reminder_time": "human or ISO time or null",
    "contact_name": "string or null",
    "phone_number": "string or null"
  }
}
""";

  bool _isWebSearchQuery(String text) {
    final lower = text.toLowerCase();
    const keywords = [
      'today', 'latest', 'news', 'score', 'match', 'current', 'weather',
      'live', 'price', 'recently', 'yesterday', 'who won', 'cricket news',
      'ipl', 'world cup', 'schedule', 'results'
    ];
    return keywords.any((kw) => lower.contains(kw));
  }

  Future<Map<String, dynamic>> processVoiceCommand(String userText) async {
    final stopwatch = Stopwatch()..start();
    final cleanText = userText.trim();
    if (cleanText.isEmpty) {
      return {'reply': 'Hey machi, sollu da. Enna aachu?', 'intent': 'chat', 'data': {}, 'latencyMs': 0};
    }

    final prefs = await SharedPreferences.getInstance();
    final apiKey = prefs.getString('gemini_api_key') ?? '';

    // Fast action checks
    final lower = cleanText.toLowerCase();
    if (lower.startsWith('remind') || lower.contains('remind pannu') || lower.contains('reminder')) {
      final title = cleanText.replaceAll(RegExp(r'remind me to|remind pannu|reminder', caseSensitive: false), '').trim();
      final timeMatch = RegExp(r'(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)', caseSensitive: false).firstMatch(cleanText);
      final timeStr = timeMatch?.group(0) ?? 'In 30 minutes';
      
      stopwatch.stop();
      return {
        'reply': 'Okay da, reminder set panniten. $timeStr-ku remind panren.',
        'intent': 'create_reminder',
        'data': {'reminder_title': title.isEmpty ? 'Call Friend' : title, 'reminder_time': timeStr},
        'latencyMs': stopwatch.elapsedMilliseconds,
      };
    }

    if (lower == 'hi machi' || lower == 'hey machi' || lower == 'hai machi' || lower == 'machi') {
      stopwatch.stop();
      return {
        'reply': 'Hey machi, sollu da! Enna aachu? Ready-ah iruken.',
        'intent': 'chat',
        'data': {},
        'latencyMs': stopwatch.elapsedMilliseconds,
      };
    }

    // If offline or no API key, use rich local knowledge base instead of generic "I'm listening"
    if (apiKey.isEmpty) {
      final fallbackResult = _localKnowledgeBase(cleanText);
      stopwatch.stop();
      fallbackResult['latencyMs'] = stopwatch.elapsedMilliseconds;
      return fallbackResult;
    }

    try {
      final url = Uri.parse(
        'https://generativelanguage.googleapis.com/v1beta/models/$_defaultModel:generateContent?key=$apiKey'
      );

      final contents = <Map<String, dynamic>>[];

      // Add recent context for conversation continuity
      for (final turn in _conversationHistory.take(4)) {
        contents.add({
          'role': 'user',
          'parts': [{'text': turn['user'] ?? ''}]
        });
        contents.add({
          'role': 'model',
          'parts': [{'text': turn['machi'] ?? ''}]
        });
      }

      contents.add({
        'role': 'user',
        'parts': [{'text': cleanText}]
      });

      final needsSearch = _isWebSearchQuery(cleanText);

      final requestPayload = <String, dynamic>{
        'contents': contents,
        'systemInstruction': {
          'parts': [{'text': _systemPrompt}]
        },
        'generationConfig': {
          'temperature': 0.6,
        }
      };

      if (needsSearch) {
        requestPayload['tools'] = [
          {'googleSearch': {}}
        ];
      } else {
        (requestPayload['generationConfig'] as Map<String, dynamic>)['responseMimeType'] = 'application/json';
      }

      final response = await _httpClient.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(requestPayload),
      ).timeout(const Duration(seconds: 6));

      stopwatch.stop();

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        final candidate = body['candidates']?[0];
        final rawText = candidate?['content']?['parts']?[0]?['text'] ?? '';

        // Extract search sources if available
        final sources = <Map<String, String>>[];
        final groundingMetadata = candidate?['groundingMetadata'];
        if (groundingMetadata?['groundingChunks'] is List) {
          for (final chunk in groundingMetadata['groundingChunks']) {
            final uri = chunk['web']?['uri'];
            final title = chunk['web']?['title'];
            if (uri != null) {
              sources.add({'title': title ?? 'Source', 'url': uri});
            }
          }
        }

        Map<String, dynamic> result;
        try {
          if (rawText.trim().startsWith('{')) {
            result = jsonDecode(rawText) as Map<String, dynamic>;
          } else {
            final cleanJson = rawText.replaceAll(RegExp(r'```json|```'), '').trim();
            result = jsonDecode(cleanJson) as Map<String, dynamic>;
          }
        } catch (_) {
          result = {
            'reply': rawText.trim(),
            'intent': needsSearch ? 'information' : 'chat',
            'data': {},
          };
        }

        result['sources'] = sources.take(3).toList();
        result['searchUsed'] = needsSearch;
        result['latencyMs'] = stopwatch.elapsedMilliseconds;

        // Save to conversational history
        _conversationHistory.add({
          'user': cleanText,
          'machi': result['reply'] ?? '',
        });
        if (_conversationHistory.length > 8) {
          _conversationHistory.removeAt(0);
        }

        return result;
      } else {
        final fallback = _localKnowledgeBase(cleanText);
        fallback['latencyMs'] = stopwatch.elapsedMilliseconds;
        return fallback;
      }
    } catch (e) {
      stopwatch.stop();
      final fallback = _localKnowledgeBase(cleanText);
      fallback['latencyMs'] = stopwatch.elapsedMilliseconds;
      return fallback;
    }
  }

  /// Instant offline knowledge base for sports, tech, concepts, and system controls
  Map<String, dynamic> _localKnowledgeBase(String text) {
    final lower = text.toLowerCase();

    if (lower.contains('rohit')) {
      return {
        'reply': 'Rohit Sharma Indian cricket team-oda captain and legendary opener da. Highest ODI score 264 runs, 5 IPL titles, and led India to win the 2024 T20 World Cup!',
        'intent': 'information',
        'data': {},
      };
    } else if (lower.contains('kohli') || lower.contains('virat')) {
      return {
        'reply': 'Virat Kohli modern cricket-oda undisputed run machine da. Over 80 international centuries, highest run-scorer in IPL history, and widely considered one of the greatest chasers in cricket history.',
        'intent': 'information',
      };
    } else if (lower.contains('python')) {
      return {
        'reply': 'Python is a high-level, readable, and powerful programming language da. It is the top choice for AI, machine learning, data science, and web development with clean syntax.',
        'intent': 'information',
      };
    } else if (lower.contains('erpnext')) {
      return {
        'reply': 'ERPNext is a 100% open-source, full-featured ERP software built on Frappe and Python da. It handles accounting, inventory, CRM, HR, payroll, and manufacturing for businesses.',
        'intent': 'information',
      };
    } else if (lower.contains('cricket') && lower.contains('news')) {
      return {
        'reply': 'Cricket updates: India continues strong in ICC rankings preparing for upcoming bilateral series and World Test Championship fixtures after their T20 World Cup title!',
        'intent': 'information',
        'sources': [{'title': 'ICC Cricket News', 'url': 'https://www.icc-cricket.com'}],
      };
    } else if (lower.contains('attend') || lower.contains('pick up')) {
      return {
        'reply': 'Seri machi, call attend panren da.',
        'intent': 'attend_call',
        'data': {}
      };
    } else if (lower.contains('reject') || lower.contains('cut pannu')) {
      return {
        'reply': 'Call reject panniyachu machi.',
        'intent': 'reject_call',
        'data': {}
      };
    } else if (lower.contains('call') || lower.contains('phone')) {
      final name = lower.replaceAll('call', '').replaceAll('phone pannu', '').trim();
      return {
        'reply': 'Seri machi, ${name.isEmpty ? "contact" : name}-ku call connect pannava?',
        'intent': 'phone_call',
        'data': {'contact_name': name.isEmpty ? 'Sir' : name}
      };
    } else if (lower.contains('notification') || lower.contains('message')) {
      return {
        'reply': 'Hey machi, WhatsApp and messages check pannalaam, notifications vandhurukku.',
        'intent': 'query_notifications',
        'data': {}
      };
    } else {
      return {
        'reply': 'Hey machi, sollu da. Enna aachu? Naan unakku help panna ready-ah iruken.',
        'intent': 'chat',
        'data': {}
      };
    }
  }
}
