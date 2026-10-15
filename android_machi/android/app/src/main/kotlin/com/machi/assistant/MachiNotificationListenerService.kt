package com.machi.assistant

import android.app.Notification
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class MachiNotificationListenerService : NotificationListenerService() {

    companion object {
        private const val TAG = "MachiNotificationListener"
        const val ACTION_NOTIFICATION_POSTED = "com.machi.assistant.NOTIFICATION_POSTED"
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        super.onNotificationPosted(sbn)
        if (sbn == null) return

        val packageName = sbn.packageName
        // Ignore internal assistant or ongoing status bar notifications
        if (packageName == this.packageName || sbn.isOngoing) return

        val extras = sbn.notification.extras
        val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""

        if (title.isEmpty() && text.isEmpty()) return

        Log.d(TAG, "Notification received from $packageName: $title - $text")

        // Broadcast to Machi Flutter UI & Speech Engine
        val broadcastIntent = Intent(ACTION_NOTIFICATION_POSTED).apply {
            putExtra("package_name", packageName)
            putExtra("title", title)
            putExtra("text", text)
            putExtra("timestamp", sbn.postTime)
            setPackage(this@MachiNotificationListenerService.packageName)
        }
        sendBroadcast(broadcastIntent)
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        super.onNotificationRemoved(sbn)
    }
}
