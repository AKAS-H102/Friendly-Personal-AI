import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/tts_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  static const MethodChannel _serviceChannel = MethodChannel('com.machi.assistant/service');
  static const MethodChannel _notifChannel = MethodChannel('com.machi.assistant/notifications');

  // Existing settings
  bool _privacyMode = false;
  bool _remindersWhenOff = true;
  String _apiKey = '';

  // Upgraded Natural Male Voice Settings
  String _selectedVoicePreset = 'neural_prabhat';
  double _speechRate = 0.48;
  double _pitch = 0.95;
  bool _preferMale = true;
  bool _isSavingVoice = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _privacyMode = prefs.getBool('privacy_mode') ?? false;
      _remindersWhenOff = prefs.getBool('reminders_when_off') ?? true;
      _apiKey = prefs.getString('gemini_api_key') ?? '';

      // Voice settings
      _selectedVoicePreset = prefs.getString('tts_voice_preset') ?? 'neural_prabhat';
      _speechRate = prefs.getDouble('tts_speech_rate') ?? 0.48;
      _pitch = prefs.getDouble('tts_pitch') ?? 0.95;
      _preferMale = prefs.getBool('tts_prefer_male') ?? true;
    });
  }

  Future<void> _saveSetting(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is bool) {
      await prefs.setBool(key, value);
    } else if (value is String) {
      await prefs.setString(key, value);
    }
  }

  Future<void> _saveVoiceSettings() async {
    setState(() => _isSavingVoice = true);
    await TTSService.instance.saveSettings(
      voicePreset: _selectedVoicePreset,
      speechRate: _speechRate,
      pitch: _pitch,
      preferMale: _preferMale,
    );
    setState(() => _isSavingVoice = false);

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Machi Voice Settings Saved Successfully!"),
          backgroundColor: Color(0xFF10B981),
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  void _previewVoice() {
    TTSService.instance.previewSample(
      voicePreset: _selectedVoicePreset,
      speechRate: _speechRate,
      pitch: _pitch,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      resizeToAvoidBottomInset: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text("Settings & Voice Configuration", style: TextStyle(color: Colors.white, fontSize: 18)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            border: Border(top: BorderSide(color: const Color(0xFF1E293B))),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 10,
                offset: const Offset(0, -2),
              ),
            ],
          ),
          child: Row(
            children: [
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: const Border.all(color: Color(0xFF0284C7)),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.volume_up, color: Color(0xFF38BDF8), size: 18),
                label: const Text("Preview", style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                onPressed: _previewVoice,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0284C7),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    elevation: 4,
                  ),
                  icon: const Icon(Icons.check, color: Colors.white, size: 18),
                  label: Text(
                    _isSavingVoice ? "Saving..." : "Save Voice Settings",
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  onPressed: _saveVoiceSettings,
                ),
              ),
            ],
          ),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          // 1. Natural Male Voice Settings Section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF0284C7).withOpacity(0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.record_voice_over, color: Color(0xFF38BDF8), size: 20),
                        SizedBox(width: 8),
                        Text(
                          "NATURAL MALE VOICE ENGINE",
                          style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text("Human Male Tone", style: TextStyle(color: Color(0xFF38BDF8), fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  "Choose a natural male companion voice for Machi. Warm, calm, mature, and friendly tone.",
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                ),
                const SizedBox(height: 16),

                // Voice Preset Dropdown
                const Text("Voice Profile & Personality:", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF090D16),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: DropdownButton<String>(
                    value: _selectedVoicePreset,
                    isExpanded: true,
                    dropdownColor: const Color(0xFF0F172A),
                    underline: const SizedBox(),
                    items: const [
                      DropdownMenuItem(
                        value: 'neural_prabhat',
                        child: Text("Prabhat Neural — Warm Mature Male (Tanglish & English)", style: TextStyle(color: Colors.white, fontSize: 13)),
                      ),
                      DropdownMenuItem(
                        value: 'neural_valluvar',
                        child: Text("Valluvar Neural — Natural Tamil Male (Tamil & Tanglish)", style: TextStyle(color: Colors.white, fontSize: 13)),
                      ),
                      DropdownMenuItem(
                        value: 'device_male',
                        child: Text("Android Device Male Engine (100% Offline Google TTS)", style: TextStyle(color: Colors.white, fontSize: 13)),
                      ),
                    ],
                    onChanged: (val) {
                      if (val != null) setState(() => _selectedVoicePreset = val);
                    },
                  ),
                ),
                const SizedBox(height: 14),

                // Speaking Speed Slider
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Speaking Speed (Conversational Pace):", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                    Text("${(_speechRate * 2).toStringAsFixed(2)}x", style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                Slider(
                  value: _speechRate,
                  min: 0.35,
                  max: 0.65,
                  activeColor: const Color(0xFF0284C7),
                  inactiveColor: const Color(0xFF1E293B),
                  onChanged: (val) => setState(() => _speechRate = val),
                ),

                // Pitch Slider
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text("Voice Pitch (Male Depth & Resonance):", style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                    Text("${_pitch.toStringAsFixed(2)}x", style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.bold)),
                  ],
                ),
                Slider(
                  value: _pitch,
                  min: 0.75,
                  max: 1.25,
                  activeColor: const Color(0xFF0284C7),
                  inactiveColor: const Color(0xFF1E293B),
                  onChanged: (val) => setState(() => _pitch = val),
                ),

                const SizedBox(height: 8),

                // Action Buttons: Preview & Save
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const Border.all(color: Color(0xFF0284C7)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.volume_up, color: Color(0xFF38BDF8), size: 18),
                        label: const Text("Preview Voice", style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                        onPressed: _previewVoice,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0284C7),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.check, color: Colors.white, size: 18),
                        label: Text(_isSavingVoice ? "Saving..." : "Save Voice Settings", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        onPressed: _saveVoiceSettings,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  "ℹ️ Note: Neural male voices stream naturally when internet is connected; if offline, Machi seamlessly falls back to your phone's installed Google TTS male voice.",
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          const Text("DEVICE PERMISSIONS (OPPO CPH2527 / ColorOS)", style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 10),
          ListTile(
            tileColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            leading: const Icon(Icons.notifications, color: Color(0xFF38BDF8)),
            title: const Text("Notification Access Service", style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text("Required for WhatsApp & SMS announcements", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFF64748B), size: 14),
            onTap: () async {
              try {
                await _notifChannel.invokeMethod('openNotificationSettings');
              } catch (_) {}
            },
          ),
          const SizedBox(height: 8),
          ListTile(
            tileColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            leading: const Icon(Icons.battery_charging_full, color: Color(0xFF10B981)),
            title: const Text("Battery Optimization Whitelist", style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text("ColorOS restricts background mic unless whitelisted", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            trailing: const Icon(Icons.arrow_forward_ios, color: Color(0xFF64748B), size: 14),
            onTap: () async {
              try {
                await _serviceChannel.invokeMethod('requestBatteryIgnore');
              } catch (_) {}
            },
          ),

          const SizedBox(height: 24),
          const Text("PRIVACY & ANNOUNCEMENTS", style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 10),
          SwitchListTile(
            tileColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            title: const Text("Privacy Mode", style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text("Announce app & sender only. Do NOT read private message text aloud.", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            value: _privacyMode,
            activeColor: const Color(0xFF0284C7),
            onChanged: (val) {
              setState(() => _privacyMode = val);
              _saveSetting('privacy_mode', val);
            },
          ),
          const SizedBox(height: 8),
          SwitchListTile(
            tileColor: const Color(0xFF0F172A),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            title: const Text("Keep Reminders Active When OFF", style: TextStyle(color: Colors.white, fontSize: 14)),
            subtitle: const Text("Scheduled alarms continue to fire even if voice assistant is OFF", style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
            value: _remindersWhenOff,
            activeColor: const Color(0xFF0284C7),
            onChanged: (val) {
              setState(() => _remindersWhenOff = val);
              _saveSetting('reminders_when_off', val);
            },
          ),

          const SizedBox(height: 24),
          const Text("GEMINI AI CONFIGURATION", style: TextStyle(color: Color(0xFF38BDF8), fontWeight: FontWeight.bold, fontSize: 12)),
          const SizedBox(height: 10),
          TextField(
            obscureText: true,
            style: const TextStyle(color: Colors.white),
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFF0F172A),
              labelText: "Gemini API Key (Optional / Pre-injected)",
              labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF1E293B))),
            ),
            controller: TextEditingController(text: _apiKey),
            onChanged: (val) => _saveSetting('gemini_api_key', val),
          ),
        ],
      ),
    );
  }
}
