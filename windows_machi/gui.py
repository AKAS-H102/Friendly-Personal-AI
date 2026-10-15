"""
Machi Assistant - Windows Desktop User Interface (PySide6)
Features a futuristic glowing holographic Machi Orb, master ON/OFF toggle,
real-time status indicators, speech transcripts, reminders, notifications, and system tray.
"""

import sys
import math
from datetime import datetime
from typing import Optional

from PySide6.QtCore import Qt, QTimer, QPoint, Signal, QObject
from PySide6.QtGui import QPainter, QColor, QRadialGradient, QBrush, QPen, QFont, QIcon
from PySide6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QPushButton, QScrollArea, QFrame, QCheckBox, QLineEdit,
    QTabWidget, QListWidget, QListWidgetItem, QSystemTrayIcon, QMenu
)

from config import config
from reminders_db import reminders_db

class MachiOrbWidget(QWidget):
    """Futuristic animated holographic orb visualizer showing assistant state and audio intensity."""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setMinimumSize(180, 180)
        self.state = "OFF"  # OFF, STANDBY, LISTENING, THINKING, SPEAKING
        self.phase = 0.0
        self.pulse = 0.0
        self.timer = QTimer(self)
        self.timer.timeout.connect(self._animate)
        self.timer.start(30)  # ~33 fps

    def set_state(self, new_state: str):
        self.state = new_state
        self.update()

    def _animate(self):
        self.phase += 0.06
        self.pulse = math.sin(self.phase) * 0.5 + 0.5
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        width = self.width()
        height = self.height()
        center_x = width / 2
        center_y = height / 2
        base_radius = min(width, height) * 0.32

        # State color selection
        if self.state == "OFF":
            c_core = QColor(40, 45, 55, 120)
            c_glow = QColor(25, 30, 40, 40)
            c_ring = QColor(70, 80, 95, 80)
            r_scale = 0.95
        elif self.state == "STANDBY":
            # Gentle pulsing cyan aura
            c_core = QColor(0, 220, 255, 180)
            c_glow = QColor(0, 180, 255, int(60 + self.pulse * 50))
            c_ring = QColor(0, 230, 255, 160)
            r_scale = 1.0 + self.pulse * 0.08
        elif self.state == "LISTENING":
            # Glowing amber/orange reactive ring
            c_core = QColor(255, 160, 20, 220)
            c_glow = QColor(255, 120, 0, int(100 + self.pulse * 80))
            c_ring = QColor(255, 200, 50, 220)
            r_scale = 1.05 + self.pulse * 0.15
        elif self.state == "THINKING":
            # Rotating iridescent violet / indigo aura
            c_core = QColor(160, 80, 255, 200)
            c_glow = QColor(120, 40, 240, int(80 + self.pulse * 70))
            c_ring = QColor(210, 140, 255, 200)
            r_scale = 1.0 + math.cos(self.phase * 2) * 0.08
        elif self.state == "SPEAKING":
            # Vibrant emerald/cyan sonic waveform
            c_core = QColor(0, 255, 180, 220)
            c_glow = QColor(0, 230, 140, int(90 + self.pulse * 90))
            c_ring = QColor(80, 255, 210, 220)
            r_scale = 1.08 + self.pulse * 0.18
        else:
            c_core = QColor(100, 100, 100)
            c_glow = QColor(50, 50, 50)
            c_ring = QColor(150, 150, 150)
            r_scale = 1.0

        cur_radius = base_radius * r_scale

        # Outer aura glow
        glow_grad = QRadialGradient(center_x, center_y, cur_radius * 1.6)
        glow_grad.setColorAt(0.0, c_glow)
        glow_grad.setColorAt(1.0, QColor(0, 0, 0, 0))
        painter.setBrush(QBrush(glow_grad))
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(QPoint(int(center_x), int(center_y)), int(cur_radius * 1.6), int(cur_radius * 1.6))

        # Concentric particle rings
        for i in range(3):
            ring_pen = QPen(c_ring)
            ring_pen.setWidth(2)
            painter.setPen(ring_pen)
            painter.setBrush(Qt.NoBrush)
            r_offset = (i * 12) + (math.sin(self.phase + i) * 5)
            painter.drawEllipse(QPoint(int(center_x), int(center_y)), int(cur_radius + r_offset), int(cur_radius + r_offset))

        # Core glowing sphere
        core_grad = QRadialGradient(center_x - cur_radius * 0.3, center_y - cur_radius * 0.3, cur_radius)
        core_grad.setColorAt(0.0, QColor(255, 255, 255, 230))
        core_grad.setColorAt(0.4, c_core)
        core_grad.setColorAt(1.0, QColor(10, 15, 25, 220))
        painter.setBrush(QBrush(core_grad))
        painter.setPen(Qt.NoPen)
        painter.drawEllipse(QPoint(int(center_x), int(center_y)), int(cur_radius), int(cur_radius))


class MachiMainWindow(QMainWindow):
    # Signals for thread-safe UI updates
    status_changed = Signal(str)
    transcript_updated = Signal(str, str)
    notification_arrived = Signal(dict)

    def __init__(self, controller):
        super().__init__()
        self.controller = controller
        self.setWindowTitle("Machi - Personal AI Assistant (Windows 11)")
        self.resize(config.get("window_width", 440), config.get("window_height", 720))
        self.setStyleSheet("""
            QMainWindow { background-color: #0B0F19; }
            QLabel { color: #E2E8F0; font-family: 'Segoe UI', sans-serif; }
            QFrame { border: none; }
            QTabWidget::pane { border: 1px solid #1E293B; background: #0F172A; border-radius: 8px; }
            QTabBar::tab { background: #1E293B; color: #94A3B8; padding: 8px 16px; border-top-left-radius: 6px; border-top-right-radius: 6px; font-weight: 600; }
            QTabBar::tab:selected { background: #0EA5E9; color: #FFFFFF; }
            QPushButton { background-color: #1E293B; color: #F8FAFC; border-radius: 6px; padding: 8px 14px; font-weight: bold; border: 1px solid #334155; }
            QPushButton:hover { background-color: #334155; }
            QLineEdit { background-color: #090D16; color: #F8FAFC; border: 1px solid #334155; border-radius: 6px; padding: 6px 10px; }
            QListWidget { background-color: #090D16; border: 1px solid #1E293B; border-radius: 6px; color: #CBD5E1; }
        """)

        self._init_ui()
        self._init_tray()
        self._connect_signals()
        self._refresh_reminders()

    def _init_ui(self):
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(12)

        # Header with Name & Master Switch
        header_layout = QHBoxLayout()
        title_box = QVBoxLayout()
        title_lbl = QLabel("MACHI")
        title_lbl.setStyleSheet("font-size: 22px; font-weight: 800; color: #38BDF8; letter-spacing: 2px;")
        subtitle_lbl = QLabel("Personal Companion • JARVIS Edition")
        subtitle_lbl.setStyleSheet("font-size: 11px; color: #64748B; font-weight: 500;")
        title_box.addWidget(title_lbl)
        title_box.addWidget(subtitle_lbl)
        header_layout.addLayout(title_box)

        header_layout.addStretch()

        # Master ON/OFF Switch
        self.power_btn = QPushButton("OFF")
        self.power_btn.setCheckable(True)
        self.power_btn.setChecked(config.is_on)
        self._update_power_button_style()
        self.power_btn.clicked.connect(self._on_power_toggle)
        header_layout.addWidget(self.power_btn)
        layout.addLayout(header_layout)

        # Holographic Orb Visualizer
        orb_container = QHBoxLayout()
        orb_container.addStretch()
        self.orb = MachiOrbWidget()
        orb_container.addWidget(self.orb)
        orb_container.addStretch()
        layout.addLayout(orb_container)

        # Status & Microphone Badge
        status_box = QHBoxLayout()
        self.status_lbl = QLabel("STANDBY" if config.is_on else "OFF")
        self.status_lbl.setStyleSheet(self._get_status_style())
        status_box.addWidget(self.status_lbl)

        status_box.addStretch()

        self.mic_badge = QLabel("🎤 Mic Active" if config.is_on else "🔇 Mic Released")
        self.mic_badge.setStyleSheet("color: #10B981; font-size: 12px; font-weight: 600;" if config.is_on else "color: #64748B; font-size: 12px; font-weight: 600;")
        status_box.addWidget(self.mic_badge)
        layout.addLayout(status_box)

        # Live Conversation Bubble
        conv_frame = QFrame()
        conv_frame.setStyleSheet("background-color: #111827; border-radius: 8px; border: 1px solid #1F2937; padding: 10px;")
        conv_layout = QVBoxLayout(conv_frame)
        conv_layout.setSpacing(6)

        user_tag = QLabel("YOU (Spoken)")
        user_tag.setStyleSheet("font-size: 10px; color: #94A3B8; font-weight: 700;")
        self.user_transcript_lbl = QLabel("Say 'Hey Machi' to wake up...")
        self.user_transcript_lbl.setWordWrap(True)
        self.user_transcript_lbl.setStyleSheet("font-size: 13px; color: #F1F5F9;")

        machi_tag = QLabel("MACHI (Response)")
        machi_tag.setStyleSheet("font-size: 10px; color: #38BDF8; font-weight: 700; margin-top: 4px;")
        self.machi_response_lbl = QLabel("Vanakkam da! Ready to help you.")
        self.machi_response_lbl.setWordWrap(True)
        self.machi_response_lbl.setStyleSheet("font-size: 13px; color: #7DD3FC; font-weight: 500;")

        conv_layout.addWidget(user_tag)
        conv_layout.addWidget(self.user_transcript_lbl)
        conv_layout.addWidget(machi_tag)
        conv_layout.addWidget(self.machi_response_lbl)
        layout.addWidget(conv_frame)

        # Quick Voice Action Buttons (for manual testing / simulation)
        actions_layout = QHBoxLayout()
        self.wake_simulate_btn = QPushButton("⚡ Wake ('Hey Machi')")
        self.wake_simulate_btn.setStyleSheet("background-color: #0284C7; color: white;")
        self.wake_simulate_btn.clicked.connect(lambda: self.controller.trigger_wake())
        actions_layout.addWidget(self.wake_simulate_btn)

        self.notif_btn = QPushButton("🔔 Check Notifications")
        self.notif_btn.clicked.connect(lambda: self.controller.speak_notifications())
        actions_layout.addWidget(self.notif_btn)
        layout.addLayout(actions_layout)

        # Tabs: Reminders, Notifications, Settings
        self.tabs = QTabWidget()
        
        # Tab 1: Reminders
        rem_tab = QWidget()
        rem_layout = QVBoxLayout(rem_tab)
        rem_input_layout = QHBoxLayout()
        self.rem_input = QLineEdit()
        self.rem_input.setPlaceholderText("e.g. Call sir at 6 PM")
        rem_add_btn = QPushButton("+ Add")
        rem_add_btn.clicked.connect(self._add_reminder_manual)
        rem_input_layout.addWidget(self.rem_input)
        rem_input_layout.addWidget(rem_add_btn)
        rem_layout.addLayout(rem_input_layout)

        self.rem_list = QListWidget()
        rem_layout.addWidget(self.rem_list)
        self.tabs.addTab(rem_tab, "⏰ Reminders")

        # Tab 2: Notifications
        notif_tab = QWidget()
        notif_layout = QVBoxLayout(notif_tab)
        self.notif_list = QListWidget()
        notif_layout.addWidget(self.notif_list)
        self.tabs.addTab(notif_tab, "📩 Notifications")

        # Tab 3: Settings
        settings_tab = QWidget()
        set_layout = QVBoxLayout(settings_tab)
        self.privacy_check = QCheckBox("Privacy Mode (Do not speak private message body)")
        self.privacy_check.setChecked(config.get("privacy_mode", False))
        self.privacy_check.stateChanged.connect(lambda state: config.set("privacy_mode", bool(state)))
        set_layout.addWidget(self.privacy_check)

        self.rem_off_check = QCheckBox("Deliver reminders via Toast even when assistant is OFF")
        self.rem_off_check.setChecked(config.get("reminders_enabled_when_off", True))
        self.rem_off_check.stateChanged.connect(lambda state: config.set("reminders_enabled_when_off", bool(state)))
        set_layout.addWidget(self.rem_off_check)

        set_layout.addStretch()
        self.tabs.addTab(settings_tab, "⚙️ Settings")

        layout.addWidget(self.tabs)

    def _init_tray(self):
        """Creates system tray icon for background operation."""
        self.tray = QSystemTrayIcon(self)
        self.tray.setToolTip("Machi - Personal AI Assistant")
        menu = QMenu()
        show_action = menu.addAction("Open Machi")
        show_action.triggered.connect(self.showNormal)
        toggle_action = menu.addAction("Toggle ON/OFF")
        toggle_action.triggered.connect(self.power_btn.click)
        quit_action = menu.addAction("Exit Completely")
        quit_action.triggered.connect(QApplication.instance().quit)
        self.tray.setContextMenu(menu)
        self.tray.show()

    def _connect_signals(self):
        self.status_changed.connect(self._on_status_change)
        self.transcript_updated.connect(self._on_transcript_update)
        self.notification_arrived.connect(self._on_notification_arrived)

    def _on_power_toggle(self):
        new_state = self.power_btn.isChecked()
        config.is_on = new_state
        self._update_power_button_style()
        self.controller.set_power(new_state)

    def _update_power_button_style(self):
        if self.power_btn.isChecked():
            self.power_btn.setText("ON")
            self.power_btn.setStyleSheet("background-color: #10B981; color: white; font-size: 14px; font-weight: 800; padding: 8px 24px; border-radius: 8px;")
            self.mic_badge.setText("🎤 Mic Active (Standby)")
            self.mic_badge.setStyleSheet("color: #10B981; font-size: 12px; font-weight: 600;")
        else:
            self.power_btn.setText("OFF")
            self.power_btn.setStyleSheet("background-color: #EF4444; color: white; font-size: 14px; font-weight: 800; padding: 8px 24px; border-radius: 8px;")
            self.mic_badge.setText("🔇 Mic Released (Completely Stopped)")
            self.mic_badge.setStyleSheet("color: #64748B; font-size: 12px; font-weight: 600;")

    def _get_status_style(self) -> str:
        return "background-color: #1E293B; color: #38BDF8; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px;"

    def _on_status_change(self, state: str):
        self.status_lbl.setText(state)
        self.orb.set_state(state)
        if state == "OFF":
            self.status_lbl.setStyleSheet("background-color: #450A0A; color: #F87171; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px;")
        elif state == "STANDBY":
            self.status_lbl.setStyleSheet("background-color: #082F49; color: #38BDF8; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px;")
        elif state == "LISTENING":
            self.status_lbl.setStyleSheet("background-color: #451A03; color: #FB923C; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px;")
        elif state == "THINKING":
            self.status_lbl.setStyleSheet("background-color: #2E1065; color: #C084FC; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px;")
        elif state == "SPEAKING":
            self.status_lbl.setStyleSheet("background-color: #064E3B; color: #34D399; font-weight: 700; padding: 4px 12px; border-radius: 12px; font-size: 11px;")

    def _on_transcript_update(self, user_text: str, machi_text: str):
        if user_text:
            self.user_transcript_lbl.setText(user_text)
        if machi_text:
            self.machi_response_lbl.setText(machi_text)

    def _on_notification_arrived(self, notif: dict):
        item = QListWidgetItem(f"[{notif['timestamp']}] {notif['app_name']}: {notif['title']}")
        self.notif_list.insertItem(0, item)

    def _refresh_reminders(self):
        self.rem_list.clear()
        for rem in reminders_db.get_pending_reminders():
            item = QListWidgetItem(f"⏰ {rem['scheduled_time'][11:16]} - {rem['title']}")
            self.rem_list.addItem(item)

    def _add_reminder_manual(self):
        txt = self.rem_input.text().strip()
        if txt:
            due = datetime.now()
            reminders_db.add_reminder(txt, due)
            self.rem_input.clear()
            self._refresh_reminders()
