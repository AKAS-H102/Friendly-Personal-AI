import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

class CallService {
  static const MethodChannel _callChannel = MethodChannel('com.machi.assistant/calls');

  // Cached sample contacts for quick lookup on OPPO CPH2527
  final Map<String, String> _sampleContacts = {
    'sir': '+91 98765 43210',
    'mom': '+91 98765 00001',
    'dad': '+91 98765 00002',
    'suresh': '+91 98765 11223',
    'ramesh': '+91 98765 44556',
    'office': '+91 44 2828 0000',
  };

  Future<bool> answerIncomingCall() async {
    try {
      final res = await _callChannel.invokeMethod<bool>('answerCall');
      return res ?? false;
    } catch (e) {
      print('Call Answer Error: $e');
      return false;
    }
  }

  Future<bool> rejectIncomingCall() async {
    try {
      final res = await _callChannel.invokeMethod<bool>('rejectCall');
      return res ?? false;
    } catch (e) {
      print('Call Reject Error: $e');
      return false;
    }
  }

  Future<bool> initiateCall(String query) async {
    final status = await Permission.phone.request();
    if (!status.isGranted) {
      return false;
    }

    final cleanQuery = query.toLowerCase().trim();
    String? targetNumber;

    // Check contact directory
    for (final entry in _sampleContacts.entries) {
      if (entry.key.contains(cleanQuery)) {
        targetNumber = entry.value;
        break;
      }
    }

    if (targetNumber == null && cleanQuery.replaceAll(RegExp(r'\D'), '').length >= 10) {
      targetNumber = cleanQuery;
    }

    if (targetNumber != null) {
      try {
        await _callChannel.invokeMethod('makeCall', {'phoneNumber': targetNumber});
        return true;
      } catch (e) {
        print('Error initiating call: $e');
        return false;
      }
    }
    return false;
  }
}
