"""
Machi Assistant - Persistent Reminders Database & Background Scheduler
Stores reminders in SQLite and delivers notifications via Windows OS notification mechanism.
Operates independently even if the voice assistant is turned OFF.
"""

import sqlite3
import threading
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from config import DATABASE_FILE, config

class ReminderDatabase:
    def __init__(self):
        self.db_path = str(DATABASE_FILE)
        self._init_db()
        self._scheduler_running = False
        self._scheduler_thread: Optional[threading.Thread] = None
        self.start_scheduler()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    notes TEXT DEFAULT '',
                    scheduled_time TIMESTAMP NOT NULL,
                    is_completed INTEGER DEFAULT 0,
                    is_delivered INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def add_reminder(self, title: str, scheduled_time: datetime, notes: str = "") -> int:
        """Adds a new persistent reminder."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO reminders (title, notes, scheduled_time) VALUES (?, ?, ?)",
                (title, notes, scheduled_time.isoformat())
            )
            conn.commit()
            return cursor.lastrowid

    def get_pending_reminders(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM reminders WHERE is_completed = 0 ORDER BY scheduled_time ASC"
            )
            return [dict(row) for row in cursor.fetchall()]

    def mark_completed(self, reminder_id: int):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE reminders SET is_completed = 1 WHERE id = ?", (reminder_id,))
            conn.commit()

    def delete_reminder(self, reminder_id: int):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM reminders WHERE id = ?", (reminder_id,))
            conn.commit()

    def start_scheduler(self):
        """Starts background timer thread that checks due reminders every 10 seconds."""
        if self._scheduler_running:
            return
        self._scheduler_running = True
        self._scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self._scheduler_thread.start()

    def _scheduler_loop(self):
        while self._scheduler_running:
            try:
                # Check if reminders are enabled even when assistant is OFF
                if not config.get("reminders_enabled_when_off", True) and not config.is_on:
                    time.sleep(10)
                    continue

                now_iso = datetime.now().isoformat()
                with self._get_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "SELECT * FROM reminders WHERE is_completed = 0 AND is_delivered = 0 AND scheduled_time <= ?",
                        (now_iso,)
                    )
                    due = cursor.fetchall()
                    for row in due:
                        self._trigger_os_notification(row["title"], row["notes"])
                        cursor.execute("UPDATE reminders SET is_delivered = 1 WHERE id = ?", (row["id"],))
                    conn.commit()
            except Exception as e:
                print(f"[Reminders] Scheduler error: {e}")
            time.sleep(10)

    def _trigger_os_notification(self, title: str, notes: str):
        """Delivers a native Windows toast notification."""
        print(f"[Windows Toast] REMINDER ALERT: {title} ({notes})")
        try:
            # Native Windows Toast via PowerShell BurntToast or script
            safe_title = title.replace('"', '`"')
            safe_notes = (notes or "Machi Reminder Alert!").replace('"', '`"')
            ps_cmd = f'''
            powershell -Command "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null;
            $template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
            $texts = $template.GetElementsByTagName('text');
            $texts.Item(0).AppendChild($template.CreateTextNode('Machi Reminder: {safe_title}')) > $null;
            $texts.Item(1).AppendChild($template.CreateTextNode('{safe_notes}')) > $null;
            $toast = [Windows.UI.Notifications.ToastNotification]::new($template);
            [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Machi Assistant').Show($toast);"
            '''
            threading.Thread(target=lambda: os.system(ps_cmd), daemon=True).start()
        except Exception as e:
            print(f"[Reminders] Toast trigger error: {e}")

reminders_db = ReminderDatabase()
