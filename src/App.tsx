import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Power,
  Mic,
  MicOff,
  Bell,
  MessageSquare,
  Phone,
  Monitor,
  FolderArchive,
  CheckCircle2,
  FileCheck,
  Shield,
  Clock,
  Layers,
  Smartphone
} from 'lucide-react';

import { VoiceAssistantSimulator } from './components/VoiceAssistantSimulator';
import { RemindersManager, ReminderItem } from './components/RemindersManager';
import { NotificationCenter, AppNotification } from './components/NotificationCenter';
import { PhoneCallSimulator } from './components/PhoneCallSimulator';
import { CodeHub } from './components/CodeHub';
import { AcceptanceTestGuide } from './components/AcceptanceTestGuide';
import { DeviceSimulatorView } from './components/DeviceSimulatorView';
import { speakMachiText } from './utils/machiVoice';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'assistant' | 'reminders' | 'notifications' | 'calls' | 'devices' | 'code' | 'acceptance'
  >('assistant');

  // Reminders state
  const [reminders, setReminders] = useState<ReminderItem[]>(() => {
    const saved = localStorage.getItem('machi_reminders');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [
      {
        id: '1',
        title: 'Call Sir regarding project deployment',
        timeString: '06:00 PM',
        dueDate: new Date(Date.now() + 3600 * 1000).toISOString(),
        notes: 'Inniku evening 6 manikku sir-ku call panna remind pannu',
        isCompleted: false,
      },
      {
        id: '2',
        title: 'Team Sync Meeting',
        timeString: '08:00 AM',
        dueDate: new Date(Date.now() + 86400 * 1000).toISOString(),
        notes: 'Tomorrow morning standup',
        isCompleted: false,
      },
    ];
  });

  const [remindersActiveWhenOff, setRemindersActiveWhenOff] = useState<boolean>(() => {
    return localStorage.getItem('machi_reminders_when_off') !== 'false';
  });

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: 'notif-1',
      appName: 'WhatsApp',
      sender: 'Suresh Kumar',
      body: 'Machi, evening 6 manikku call pannu da, urgent.',
      timestamp: '05:45 PM',
      announced: true,
    },
    {
      id: 'notif-2',
      appName: 'SMS',
      sender: 'HDFC Bank',
      body: 'Your OTP for verification is 482910. Do not share.',
      timestamp: '05:20 PM',
      announced: true,
    },
    {
      id: 'notif-3',
      appName: 'Slack',
      sender: 'Lead Architect',
      body: 'Windows 11 and Android APK build verification completed.',
      timestamp: '04:50 PM',
      announced: true,
    },
  ]);

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('machi_privacy_mode') === 'true';
  });

  const [quietHoursEnabled, setQuietHoursEnabled] = useState<boolean>(false);
  const [allowedApps, setAllowedApps] = useState<string[]>([
    'WhatsApp',
    'SMS',
    'Slack',
    'Gmail',
  ]);

  // Save reminders to localStorage
  useEffect(() => {
    localStorage.setItem('machi_reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem('machi_reminders_when_off', String(remindersActiveWhenOff));
  }, [remindersActiveWhenOff]);

  useEffect(() => {
    localStorage.setItem('machi_privacy_mode', String(privacyMode));
  }, [privacyMode]);

  // Audio speech synthesis helper using Machi's natural human-like male voice
  const speakVoice = (text: string) => {
    speakMachiText(text);
  };

  const handleAddReminder = (item: Omit<ReminderItem, 'id' | 'isCompleted'>) => {
    const newItem: ReminderItem = {
      ...item,
      id: `rem-${Date.now()}`,
      isCompleted: false,
    };
    setReminders((prev) => [newItem, ...prev]);
    speakVoice(`Seri da, ${newItem.timeString}-ku "${newItem.title}" remind panren.`);
  };

  const handleToggleCompleteReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isCompleted: !r.isCompleted } : r))
    );
  };

  const handleDeleteReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  };

  const handleAddNotification = (notif: Omit<AppNotification, 'id' | 'announced'>) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      announced: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Announce aloud respecting privacy mode
    if (privacyMode) {
      speakVoice(`Machi, ${newNotif.appName}-la irundhu pudhu notification vandhurukku.`);
    } else {
      speakVoice(`Machi, ${newNotif.appName}-la irundhu message: ${newNotif.sender} says ${newNotif.body}`);
    }
  };

  const handleToggleAllowedApp = (app: string) => {
    setAllowedApps((prev) =>
      prev.includes(app) ? prev.filter((a) => a !== app) : [...prev, app]
    );
  };

  const handleAnnounceNotificationSummary = () => {
    if (notifications.length === 0) {
      speakVoice("Pudhu notifications edhuvum illa da machi, ellam clear!");
      return;
    }
    const latest = notifications[0];
    if (privacyMode) {
      speakVoice(`Machi, ${notifications.length} notifications irukku. Latest ${latest.appName}-la irundhu.`);
    } else {
      speakVoice(`Machi, latest-ah ${latest.appName}-la ${latest.sender} message anupirukanga: "${latest.body}"`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-cyan-500 selection:text-white">
      {/* Top Futuristic Navigation Bar */}
      <header className="sticky top-0 z-50 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Assistant Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-sky-200">
                  MACHI
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 border border-cyan-800/70 font-bold uppercase tracking-wider">
                  v1.2.0 • JARVIS
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Personal AI Companion • Windows 11 & Android APK
              </p>
            </div>
          </div>

          {/* Quick Platform Badges */}
          <div className="hidden md:flex items-center space-x-3 text-xs">
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Monitor className="w-3.5 h-3.5 text-cyan-400" />
              <span>Windows 11 (PySide6)</span>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>OPPO CPH2527 (Android)</span>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto no-scrollbar border-t border-slate-900">
          {[
            { id: 'assistant', label: 'Voice Assistant & Orb', icon: Mic },
            { id: 'reminders', label: 'Smart Reminders', icon: Bell, count: reminders.filter((r) => !r.isCompleted).length },
            { id: 'notifications', label: 'Notifications Feed', icon: MessageSquare, count: notifications.length },
            { id: 'calls', label: 'Phone Call Controls', icon: Phone },
            { id: 'devices', label: 'Multi-Device Hub', icon: Layers },
            { id: 'code', label: 'Code Hub & Downloads', icon: FolderArchive },
            { id: 'acceptance', label: 'Acceptance Matrix', icon: FileCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-3 px-4 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === 'assistant' && (
          <VoiceAssistantSimulator
            onReminderCreated={(rem) => {
              handleAddReminder({
                title: rem.title,
                timeString: rem.time,
                dueDate: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                notes: rem.notes,
              });
            }}
            onQueryNotifications={handleAnnounceNotificationSummary}
            onCallRequested={(contact) => {
              setActiveTab('calls');
              speakVoice(`${contact}-ku call connect panna confirmation screen open panren da!`);
            }}
            onCallAnswered={() => {
              speakVoice("Call attend panren da!");
            }}
            onCallRejected={() => {
              speakVoice("Call reject panniyachu da.");
            }}
            recentNotificationCount={notifications.length}
            privacyMode={privacyMode}
          />
        )}

        {activeTab === 'reminders' && (
          <RemindersManager
            reminders={reminders}
            onAddReminder={handleAddReminder}
            onToggleComplete={handleToggleCompleteReminder}
            onDeleteReminder={handleDeleteReminder}
            remindersActiveWhenOff={remindersActiveWhenOff}
            onToggleRemindersActiveWhenOff={setRemindersActiveWhenOff}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationCenter
            notifications={notifications}
            onAddNotification={handleAddNotification}
            privacyMode={privacyMode}
            onTogglePrivacyMode={setPrivacyMode}
            quietHoursEnabled={quietHoursEnabled}
            onToggleQuietHours={setQuietHoursEnabled}
            allowedApps={allowedApps}
            onToggleAllowedApp={handleToggleAllowedApp}
            onAnnounceSummary={handleAnnounceNotificationSummary}
          />
        )}

        {activeTab === 'calls' && (
          <PhoneCallSimulator onSpeak={speakVoice} />
        )}

        {activeTab === 'devices' && (
          <DeviceSimulatorView onSpeak={speakVoice} />
        )}

        {activeTab === 'code' && <CodeHub />}

        {activeTab === 'acceptance' && <AcceptanceTestGuide />}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-medium text-slate-400">
            Machi Personal AI Assistant • Built with Gemini 3.8 Flash, PySide6 & Flutter
          </p>
          <p className="text-[11px] text-slate-600">
            Independent Windows 11 Desktop Application & Android APK for OPPO CPH2527 • Local "Hey Machi" Wake Word Standby
          </p>
        </div>
      </footer>
    </div>
  );
}
