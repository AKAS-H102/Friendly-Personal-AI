package com.machi.assistant

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.telephony.TelephonyManager
import android.util.Log

class CallReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_INCOMING_CALL = "com.machi.assistant.INCOMING_CALL"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == TelephonyManager.ACTION_PHONE_STATE_CHANGED) {
            val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)
            val incomingNumber = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER)

            Log.d("CallReceiver", "Phone state changed: $state, number: $incomingNumber")

            if (state == TelephonyManager.EXTRA_STATE_RINGING) {
                val broadcastIntent = Intent(ACTION_INCOMING_CALL).apply {
                    putExtra("incoming_number", incomingNumber ?: "Unknown Caller")
                    setPackage(context.packageName)
                }
                context.sendBroadcast(broadcastIntent)
            }
        }
    }
}
