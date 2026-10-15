import 'dart:async';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Machi Natural Male Voice Engine (Low-Latency & Interruptible)
/// - Zero-latency on-device speech synthesis via Android Google Speech Services
/// - Natural sentence-by-sentence queue with micro-pauses
/// - Immediate cancellation support when user interrupts or taps screen
class TTSService {
  static final TTSService instance = TTSService._internal();
  factory TTSService() => instance;
  TTSService._internal();

  final FlutterTts _flutterTts = FlutterTts();
  bool _isSpeaking = false;
  bool get isSpeaking => _isSpeaking;

  // Voice Settings (Saved in SharedPreferences)
  String _voicePreset = 'neural_prabhat';
  double _speechRate = 0.48; // Gentle, moderate conversational speed
  double _pitch = 0.98;      // Natural, warm male companion depth
  bool _preferMale = true;

  String get voicePreset => _voicePreset;
  double get speechRate => _speechRate;
  double get pitch => _pitch;
  bool get preferMale => _preferMale;

  // Sentence queue for streaming playback
  final List<String> _sentenceQueue = [];
  bool _isProcessingQueue = false;
  Function? _currentCompletionCallback;
  Map<String, String>? _selectedMaleVoice;

  Future<void> init() async {
    await loadSettings();

    await _flutterTts.setLanguage("en-IN");
    await _flutterTts.setPitch(_pitch);
    await _flutterTts.setSpeechRate(_speechRate);

    // Auto-bind to male voice
    await _configureDeviceMaleVoice("en-IN");

    _flutterTts.setStartHandler(() {
      _isSpeaking = true;
    });

    _flutterTts.setCompletionHandler(() {
      _isSpeaking = false;
      _processNextQueueSentence();
    });

    _flutterTts.setErrorHandler((msg) {
      _isSpeaking = false;
      _sentenceQueue.clear();
      _isProcessingQueue = false;
      final callback = _currentCompletionCallback;
      _currentCompletionCallback = null;
      if (callback != null) callback();
    });
  }

  Future<void> loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _voicePreset = prefs.getString('tts_voice_preset') ?? 'neural_prabhat';
    _speechRate = prefs.getDouble('tts_speech_rate') ?? 0.48;
    _pitch = prefs.getDouble('tts_pitch') ?? 0.98;
    _preferMale = prefs.getBool('tts_prefer_male') ?? true;
  }

  Future<void> saveSettings({
    required String voicePreset,
    required double speechRate,
    required double pitch,
    required bool preferMale,
  }) async {
    _voicePreset = voicePreset;
    _speechRate = speechRate;
    _pitch = pitch;
    _preferMale = preferMale;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tts_voice_preset', voicePreset);
    await prefs.setDouble('tts_speech_rate', speechRate);
    await prefs.setDouble('tts_pitch', pitch);
    await prefs.setBool('tts_prefer_male', preferMale);

    await _flutterTts.setPitch(_pitch);
    await _flutterTts.setSpeechRate(_speechRate);
  }

  /// Automatically inspects Android TTS voices and selects a mature male voice
  Future<void> _configureDeviceMaleVoice(String locale) async {
    try {
      final voices = await _flutterTts.getVoices;
      if (voices is List) {
        for (final voice in voices) {
          if (voice is Map) {
            final name = (voice['name'] ?? '').toString().toLowerCase();
            final voiceLocale = (voice['locale'] ?? '').toString().toLowerCase();

            // Exclude female voices explicitly
            final isFemale = name.contains('female') ||
                name.contains('#female') ||
                name.contains('zira') ||
                name.contains('heera') ||
                name.contains('pallavi') ||
                name.contains('neerja') ||
                name.contains('sita') ||
                name.contains('ananya') ||
                name.contains('sangeeta');
            if (isFemale) continue;

            if (voiceLocale.contains(locale.toLowerCase().replaceAll('-', '_')) ||
                voiceLocale.contains(locale.toLowerCase())) {
              if (name.contains('male') ||
                  name.contains('#male') ||
                  name.contains('cxx') ||
                  name.contains('tfe') ||
                  name.contains('prabhat') ||
                  name.contains('valluvar') ||
                  name.contains('rishi')) {
                _selectedMaleVoice = {
                  'name': voice['name'].toString(),
                  'locale': voice['locale'].toString(),
                };
                await _flutterTts.setVoice(_selectedMaleVoice!);
                return;
              }
            }
          }
        }

        // Secondary search: Any non-female male voice for this locale
        for (final voice in voices) {
          if (voice is Map) {
            final name = (voice['name'] ?? '').toString().toLowerCase();
            final isFemale = name.contains('female') || name.contains('#female');
            if (!isFemale && (name.contains('male') || name.contains('cxx') || name.contains('tfe'))) {
              _selectedMaleVoice = {
                'name': voice['name'].toString(),
                'locale': (voice['locale'] ?? locale).toString(),
              };
              await _flutterTts.setVoice(_selectedMaleVoice!);
              return;
            }
          }
        }
      }

      // If no locale-specific male voice was found, preserve existing selected male voice
      if (_selectedMaleVoice != null) {
        await _flutterTts.setVoice(_selectedMaleVoice!);
      }
    } catch (_) {}
  }

  /// Speaks text immediately with natural sentence breath-groups
  Future<void> speak(String text, {Function? onComplete}) async {
    if (text.trim().isEmpty) {
      if (onComplete != null) onComplete();
      return;
    }
    await stop();

    _currentCompletionCallback = onComplete;

    final hasTamil = RegExp(r'[\u0B80-\u0BFF]').hasMatch(text);
    final locale = hasTamil ? 'ta-IN' : 'en-IN';

    await _flutterTts.setLanguage(locale);
    await _flutterTts.setPitch(_pitch);
    await _flutterTts.setSpeechRate(_speechRate);
    await _configureDeviceMaleVoice(locale);

    final sentences = _splitIntoNaturalSentences(text);
    _sentenceQueue.clear();
    _sentenceQueue.addAll(sentences);

    _isProcessingQueue = true;
    _processNextQueueSentence();
  }

  void _processNextQueueSentence() async {
    if (!_isProcessingQueue || _sentenceQueue.isEmpty) {
      _isProcessingQueue = false;
      _isSpeaking = false;
      final callback = _currentCompletionCallback;
      _currentCompletionCallback = null;
      if (callback != null) callback();
      return;
    }

    final nextSentence = _sentenceQueue.removeAt(0);
    _isSpeaking = true;

    // Ensure parameters and selected male voice are maintained for each sentence
    await _flutterTts.setPitch(_pitch);
    await _flutterTts.setSpeechRate(_speechRate);
    if (_selectedMaleVoice != null) {
      try {
        await _flutterTts.setVoice(_selectedMaleVoice!);
      } catch (_) {}
    }

    await _flutterTts.speak(nextSentence);
  }

  /// Splits long text into natural breath-groups for fluent speech
  List<String> _splitIntoNaturalSentences(String text) {
    final clean = text.replaceAll('\n', ' ').trim();
    final parts = clean.split(RegExp(r'(?<=[.!?,\-])\s+'));
    final result = <String>[];
    for (final part in parts) {
      final trimmed = part.trim();
      if (trimmed.isNotEmpty) {
        result.add(trimmed);
      }
    }
    return result.isEmpty ? [clean] : result;
  }

  /// Immediately interrupts speech output (barge-in capability)
  Future<void> stop() async {
    _sentenceQueue.clear();
    _isProcessingQueue = false;
    _isSpeaking = false;
    await _flutterTts.stop();
  }

  /// Preview voice sample
  Future<void> previewSample({
    required String voicePreset,
    required double speechRate,
    required double pitch,
  }) async {
    await stop();
    final sample = (voicePreset == 'neural_valluvar')
        ? 'ஹே மச்சி, சொல்லு டா. என்ன ஆச்சு? நான் உனக்கு உதவி பண்ண ரெடியா இருக்கேன்.'
        : 'Hey machi, sollu da. Enna aachu? Parava illa, namma calm-ah figure out pannalaam.';
    await speak(sample);
  }
}
