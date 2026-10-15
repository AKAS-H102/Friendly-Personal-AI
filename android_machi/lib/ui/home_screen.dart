import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/ai_service.dart';
import '../services/wake_word_service.dart';
import '../services/reminder_service.dart';
import '../services/tts_service.dart';
import '../services/call_service.dart';
import '../models/reminder.dart';
import 'settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with SingleTickerProviderStateMixin {
  bool _isAssistantOn = false;
  String _assistantState = "OFF"; // OFF, STANDBY, LISTENING, THINKING, SPEAKING
  String _userSpeech = "Say 'Hey Machi' to begin...";
  String _machiSpeech = "Hey machi, sollu da. Enna aachu?";
  List<Reminder> _reminders = [];

  // Speed, Intelligence & Grounding metrics
  int _lastLatencyMs = 0;
  bool _searchUsed = false;
  List<Map<String, String>> _lastSources = [];

  late final AnimationController _pulseController;
  late final AIService _aiService;
  late final TTSService _ttsService;
  late final CallService _callService;
  late final WakeWordService _wakeWordService;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _aiService = AIService.instance;
    _ttsService = TTSService.instance;
    _callService = CallService();
    _wakeWordService = WakeWordService(onWakeWordDetected: _onWakeDetected);

    _loadState();
    _ttsService.init();
    _refreshReminders();
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _isAssistantOn = prefs.getBool('is_assistant_on') ?? false;
      _assistantState = _isAssistantOn ? "STANDBY" : "OFF";
    });
    if (_isAssistantOn) {
      _wakeWordService.startStandby();
    }
  }

  Future<void> _togglePower(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('is_assistant_on', value);

    setState(() {
      _isAssistantOn = value;
      _assistantState = value ? "STANDBY" : "OFF";
      if (!value) {
        _userSpeech = "Assistant is OFF. Mic released.";
        _machiSpeech = "Machi is resting.";
      }
    });

    if (value) {
      await _wakeWordService.startStandby();
    } else {
      await _wakeWordService.stopStandby();
      await _ttsService.stop();
    }
  }

  Future<void> _refreshReminders() async {
    final list = await ReminderService.instance.getPendingReminders();
    setState(() {
      _reminders = list;
    });
  }

  /// Interrupt speech or trigger wake
  void _handleOrbTap() async {
    if (!_isAssistantOn) {
      await _togglePower(true);
      return;
    }

    // If currently speaking, interrupt immediately (barge-in capability)
    if (_assistantState == "SPEAKING") {
      await _ttsService.stop();
      setState(() {
        _assistantState = "STANDBY";
        _machiSpeech = "Interrupted. Sollu da, kettukiren.";
      });
      return;
    }

    _onWakeDetected();
  }

  void _onWakeDetected() async {
    if (!_isAssistantOn) return;

    // Interrupt any active speech first
    await _ttsService.stop();

    setState(() {
      _assistantState = "LISTENING";
      _userSpeech = "Listening to your voice...";
    });

    // Fast command recording with live partial results and 850ms silence detection
    final command = await _wakeWordService.recordActiveCommand(
      maxTimeout: const Duration(seconds: 5),
      onPartialText: (partial) {
        if (mounted && _assistantState == "LISTENING") {
          setState(() {
            _userSpeech = partial;
          });
        }
      },
    );

    if (command.trim().isEmpty) {
      setState(() {
        _assistantState = _isAssistantOn ? "STANDBY" : "OFF";
        _userSpeech = "No speech detected. Say 'Hey Machi'!";
      });
      return;
    }

    await _processUserCommand(command);
  }

  Future<void> _processUserCommand(String command) async {
    setState(() {
      _assistantState = "THINKING";
      _userSpeech = "\"$command\"";
      _machiSpeech = "Thinking...";
    });

    final aiResult = await _aiService.processVoiceCommand(command);
    final reply = aiResult['reply'] as String? ?? "Hey machi, sollu da. Kettu kittu iruken!";
    final intent = aiResult['intent'] as String? ?? "chat";
    final data = aiResult['data'] as Map<String, dynamic>? ?? {};
    final latency = aiResult['latencyMs'] as int? ?? 0;
    final searchUsed = aiResult['searchUsed'] as bool? ?? false;
    final sources = (aiResult['sources'] as List?)?.cast<Map<String, String>>() ?? [];

    // Execute side-effect intents
    if (intent == 'create_reminder') {
      final title = data['reminder_title'] as String? ?? 'Reminder';
      await ReminderService.instance.addReminder(title, DateTime.now().add(const Duration(minutes: 30)));
      _refreshReminders();
    } else if (intent == 'attend_call') {
      await _callService.answerIncomingCall();
    } else if (intent == 'reject_call') {
      await _callService.rejectIncomingCall();
    } else if (intent == 'phone_call') {
      final contact = data['contact_name'] as String? ?? 'Sir';
      await _callService.initiateCall(contact);
    }

    if (!mounted) return;

    setState(() {
      _assistantState = "SPEAKING";
      _machiSpeech = reply;
      _lastLatencyMs = latency;
      _searchUsed = searchUsed;
      _lastSources = sources;
    });

    // Speak sentence immediately
    await _ttsService.speak(reply, onComplete: () {
      if (mounted && _assistantState == "SPEAKING") {
        setState(() {
          _assistantState = _isAssistantOn ? "STANDBY" : "OFF";
        });
      }
    });
  }

  Color _getOrbColor() {
    switch (_assistantState) {
      case "STANDBY":
        return const Color(0xFF00E5FF);
      case "LISTENING":
        return const Color(0xFFFF9100);
      case "THINKING":
        return const Color(0xFFA855F7);
      case "SPEAKING":
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF475569);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Row(
          children: [
            Text(
              "MACHI",
              style: TextStyle(
                color: Color(0xFF38BDF8),
                fontWeight: FontWeight.w900,
                letterSpacing: 2.0,
                fontSize: 22,
              ),
            ),
            SizedBox(width: 8),
            Text(
              "Fast & Grounded • OPPO CPH2527",
              style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings, color: Color(0xFF94A3B8)),
            onPressed: () async {
              await Navigator.push(
                context,
                MaterialPageRoute(builder: (c) => const SettingsScreen()),
              );
              await _ttsService.loadSettings();
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Column(
          children: [
            // Master ON/OFF Switch Card
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isAssistantOn ? "ASSISTANT ACTIVE" : "ASSISTANT OFF",
                        style: TextStyle(
                          color: _isAssistantOn ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _isAssistantOn ? "🎤 Fast Standby: Say 'Hey Machi'" : "🔇 Mic & background released",
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                      ),
                    ],
                  ),
                  Switch(
                    value: _isAssistantOn,
                    activeColor: const Color(0xFF10B981),
                    onChanged: _togglePower,
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Animated Machi Holographic Orb (Tappable to speak or interrupt)
            GestureDetector(
              onTap: _handleOrbTap,
              child: AnimatedBuilder(
                animation: _pulseController,
                builder: (context, child) {
                  final pulse = _pulseController.value;
                  final orbColor = _getOrbColor();
                  return Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        width: 190 + (pulse * 25),
                        height: 190 + (pulse * 25),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: orbColor.withOpacity(0.12),
                        ),
                      ),
                      Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          gradient: RadialGradient(
                            colors: [
                              Colors.white.withOpacity(0.9),
                              orbColor,
                              orbColor.withOpacity(0.2),
                            ],
                            stops: const [0.0, 0.5, 1.0],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: orbColor.withOpacity(0.6),
                              blurRadius: 30,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: Center(
                          child: Icon(
                            _assistantState == "SPEAKING"
                                ? Icons.stop
                                : _assistantState == "LISTENING"
                                ? Icons.mic
                                : Icons.bolt,
                            color: Colors.white.withOpacity(0.9),
                            size: 34,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),

            const SizedBox(height: 16),

            // State & Latency Badge Row
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _getOrbColor().withOpacity(0.5)),
                  ),
                  child: Text(
                    _assistantState,
                    style: TextStyle(
                      color: _getOrbColor(),
                      fontWeight: FontWeight.w800,
                      fontSize: 11,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
                if (_lastLatencyMs > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF334155)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.flash_on, color: Color(0xFFFBBF24), size: 12),
                        const SizedBox(width: 3),
                        Text(
                          "${_lastLatencyMs}ms",
                          style: const TextStyle(color: Color(0xFFFBBF24), fontSize: 10, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                ],
                if (_searchUsed) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0C4A6E),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF0284C7)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.travel_explore, color: Color(0xFF38BDF8), size: 12),
                        SizedBox(width: 3),
                        Text(
                          "Google Search Grounded",
                          style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),

            const SizedBox(height: 20),

            // Speech Transcript & Answer Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF1E293B)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("USER (SPOKEN)", style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(_userSpeech, style: const TextStyle(color: Colors.white, fontSize: 14)),
                  const Divider(color: Color(0xFF1E293B), height: 20),
                  const Text("MACHI (KNOWLEDGE & RESPONSE)", style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(_machiSpeech, style: const TextStyle(color: Color(0xFF7DD3FC), fontSize: 15, fontWeight: FontWeight.w600)),
                  if (_lastSources.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    const Text("VERIFIED WEB SOURCES:", style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      children: _lastSources.map((s) => Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF090D16),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Text(
                          s['title'] ?? 'Source',
                          style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 10),
                        ),
                      )).toList(),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Quick Knowledge & Speed Test Chips
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("TEST KNOWLEDGE, NEWS & SPEED:", style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _buildTestChip("Rohit Sharma", "Tell me about Rohit Sharma, the Indian cricketer."),
                    _buildTestChip("Virat Kohli", "Who is Virat Kohli?"),
                    _buildTestChip("Explain Python", "Explain Python programming language in simple terms."),
                    _buildTestChip("What is ERPNext?", "What is ERPNext?"),
                    _buildTestChip("Today's Cricket News", "Tell me today's cricket news."),
                    _buildTestChip("6 PM Reminder", "Remind me to call my friend at 6 PM."),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Reminders Section
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text("Pending Reminders", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                Text("${_reminders.length} Active", style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
              ],
            ),
            const SizedBox(height: 10),
            if (_reminders.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0B1120),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Text(
                  "No pending reminders. Say 'Hey Machi, remind me to call my friend at 6 PM'",
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              )
            else
              ..._reminders.map((r) => Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.alarm, color: Color(0xFF38BDF8), size: 20),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(r.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
                          Text("${r.scheduledTime.hour}:${r.scheduledTime.minute.toString().padLeft(2, '0')}", style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.check_circle_outline, color: Color(0xFF10B981)),
                      onPressed: () async {
                        if (r.id != null) {
                          await ReminderService.instance.markCompleted(r.id!);
                          _refreshReminders();
                        }
                      },
                    ),
                  ],
                ),
              )),
          ],
        ),
      ),
    );
  }

  Widget _buildTestChip(String label, String fullPrompt) {
    return ActionChip(
      backgroundColor: const Color(0xFF0F172A),
      side: const BorderSide(color: Color(0xFF1E293B)),
      label: Text(label, style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.w600)),
      onPressed: () => _processUserCommand(fullPrompt),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }
}
