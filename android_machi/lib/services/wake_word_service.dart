import 'dart:async';
import 'package:flutter/services.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';

class WakeWordService {
  static const MethodChannel _serviceChannel = MethodChannel('com.machi.assistant/service');
  final stt.SpeechToText _speech = stt.SpeechToText();
  
  bool _isListeningStandby = false;
  final Function() onWakeWordDetected;
  Timer? _speechTimeoutTimer;

  WakeWordService({required this.onWakeWordDetected});

  bool get isStandbyActive => _isListeningStandby;

  Future<bool> startStandby() async {
    final micStatus = await Permission.microphone.request();
    if (!micStatus.isGranted) {
      return false;
    }

    final available = await _speech.initialize(
      onError: (val) => print('WakeWord Error: $val'),
      onStatus: (status) {
        if (status == 'done' && _isListeningStandby) {
          _listenCycle();
        }
      },
    );

    if (available) {
      _isListeningStandby = true;
      try {
        await _serviceChannel.invokeMethod('startStandbyService');
      } catch (e) {
        print('Native service error: $e');
      }
      _listenCycle();
      return true;
    }
    return false;
  }

  void _listenCycle() {
    if (!_isListeningStandby) return;

    _speech.listen(
      onResult: (val) {
        final recognized = val.recognizedWords.toLowerCase();
        if (recognized.contains('hey machi') || 
            recognized.contains('machi') || 
            recognized.contains('hai machi') ||
            recognized.contains('sollu machi')) {
          _speech.stop();
          onWakeWordDetected();
        }
      },
      listenFor: const Duration(seconds: 15),
      pauseFor: const Duration(milliseconds: 1200),
      partialResults: true,
      cancelOnError: false,
    );
  }

  Future<void> stopStandby() async {
    _isListeningStandby = false;
    _speechTimeoutTimer?.cancel();
    await _speech.stop();
    await _speech.cancel();
    try {
      await _serviceChannel.invokeMethod('stopStandbyService');
    } catch (e) {
      print('Native stop error: $e');
    }
  }

  /// Fast command recording: completes as soon as user finishes speaking
  /// avoids unnecessary 7-second waiting loops
  Future<String> recordActiveCommand({
    Duration maxTimeout = const Duration(seconds: 6),
    Function(String partial)? onPartialText,
  }) async {
    final completer = Completer<String>();
    String captured = '';
    Timer? silenceDebounceTimer;

    void finishRecording(String text) {
      silenceDebounceTimer?.cancel();
      _speechTimeoutTimer?.cancel();
      if (!completer.isCompleted) {
        _speech.stop();
        completer.complete(text.trim());
      }
    }

    await _speech.listen(
      onResult: (result) {
        captured = result.recognizedWords;
        if (onPartialText != null && captured.isNotEmpty) {
          onPartialText(captured);
        }

        // Reset silence debounce timer: if no new word within 850ms, finish speech immediately!
        silenceDebounceTimer?.cancel();
        silenceDebounceTimer = Timer(const Duration(milliseconds: 850), () {
          if (captured.trim().isNotEmpty) {
            finishRecording(captured);
          }
        });

        if (result.finalResult) {
          finishRecording(captured);
        }
      },
      listenFor: maxTimeout,
      pauseFor: const Duration(milliseconds: 900),
      partialResults: true,
      cancelOnError: true,
    );

    // Hard safeguard timeout
    _speechTimeoutTimer?.cancel();
    _speechTimeoutTimer = Timer(maxTimeout, () {
      finishRecording(captured);
    });

    return completer.future;
  }

  /// Immediately interrupts speech input
  void cancelRecording() {
    _speechTimeoutTimer?.cancel();
    _speech.stop();
    _speech.cancel();
  }
}
