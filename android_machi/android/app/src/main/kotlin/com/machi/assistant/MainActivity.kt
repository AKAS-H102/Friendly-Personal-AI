package com.machi.assistant

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.telecom.TelecomManager
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val SERVICE_CHANNEL = "com.machi.assistant/service"
    private val CALL_CHANNEL = "com.machi.assistant/calls"
    private val NOTIF_CHANNEL = "com.machi.assistant/notifications"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // 1. Foreground Service Control Channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SERVICE_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startStandbyService" -> {
                    val serviceIntent = Intent(this, MachiForegroundService::class.java)
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(serviceIntent)
                    } else {
                        startService(serviceIntent)
                    }
                    result.success(true)
                }
                "stopStandbyService" -> {
                    val serviceIntent = Intent(this, MachiForegroundService::class.java)
                    stopService(serviceIntent)
                    result.success(true)
                }
                "requestBatteryIgnore" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
                        intent.data = Uri.parse("package:$packageName")
                        startActivity(intent)
                    }
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }

        // 2. Call Control Channel
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CALL_CHANNEL).setMethodCallHandler { call, result ->
            val telecomManager = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            when (call.method) {
                "answerCall" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && telecomManager != null) {
                        try {
                            telecomManager.acceptRingingCall()
                            result.success(true)
                        } catch (e: SecurityException) {
                            result.error("PERMISSION_DENIED", "ANSWER_PHONE_CALLS permission required", e.message)
                        }
                    } else {
                        result.error("UNSUPPORTED_VERSION", "Call answering requires Android 8.0+", null)
                    }
                }
                "rejectCall" -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && telecomManager != null) {
                        try {
                            telecomManager.endCall()
                            result.success(true)
                        } catch (e: SecurityException) {
                            result.error("PERMISSION_DENIED", "ANSWER_PHONE_CALLS permission required", e.message)
                        }
                    } else {
                        result.error("UNSUPPORTED_VERSION", "Call rejection requires Android 9.0+", null)
                    }
                }
                "makeCall" -> {
                    val phoneNumber = call.argument<String>("phoneNumber")
                    if (phoneNumber != null) {
                        val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$phoneNumber"))
                        startActivity(callIntent)
                        result.success(true)
                    } else {
                        result.error("INVALID_NUMBER", "Phone number cannot be null", null)
                    }
                }
                else -> result.notImplemented()
            }
        }

        // 3. Notification Access Status
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, NOTIF_CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "openNotificationSettings" -> {
                    val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                    startActivity(intent)
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }
}
