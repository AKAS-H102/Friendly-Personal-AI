import React, { useState } from 'react';
import {
  MessageSquare,
  Shield,
  ShieldAlert,
  Moon,
  Volume2,
  CheckCircle,
  Clock,
  Sparkles,
  Send,
  AlertTriangle,
  Radio,
  Filter
} from 'lucide-react';

export interface AppNotification {
  id: string;
  appName: 'WhatsApp' | 'SMS' | 'Slack' | 'Gmail' | 'Outlook' | 'System';
  sender: string;
  body: string;
  timestamp: string;
  announced: boolean;
}

interface NotificationCenterProps {
  notifications: AppNotification[];
  onAddNotification: (notif: Omit<AppNotification, 'id' | 'announced'>) => void;
  privacyMode: boolean;
  onTogglePrivacyMode: (enabled: boolean) => void;
  quietHoursEnabled: boolean;
  onToggleQuietHours: (enabled: boolean) => void;
  allowedApps: string[];
  onToggleAllowedApp: (app: string) => void;
  onAnnounceSummary: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onAddNotification,
  privacyMode,
  onTogglePrivacyMode,
  quietHoursEnabled,
  onToggleQuietHours,
  allowedApps,
  onToggleAllowedApp,
  onAnnounceSummary,
}) => {
  const [selectedApp, setSelectedApp] = useState<'WhatsApp' | 'SMS' | 'Slack' | 'Gmail'>('WhatsApp');
  const [senderInput, setSenderInput] = useState('Suresh');
  const [messageInput, setMessageInput] = useState('Machi, meeting rescheduled to 7 PM. Check panra.');

  const handleSimulateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderInput.trim() || !messageInput.trim()) return;

    onAddNotification({
      appName: selectedApp,
      sender: senderInput.trim(),
      body: messageInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    setMessageInput('');
  };

  const getAppBadgeColor = (app: string) => {
    switch (app) {
      case 'WhatsApp':
        return 'bg-emerald-950 text-emerald-400 border-emerald-800';
      case 'SMS':
        return 'bg-blue-950 text-blue-400 border-blue-800';
      case 'Slack':
        return 'bg-amber-950 text-amber-400 border-amber-800';
      case 'Gmail':
        return 'bg-red-950 text-red-400 border-red-800';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Notification Announcements</h2>
              <p className="text-xs text-slate-400">Android Listener Service & Windows Toast Integration</p>
            </div>
          </div>

          <button
            onClick={onAnnounceSummary}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs tracking-wide shadow-md transition-all active:scale-95"
          >
            <Volume2 className="w-4 h-4" />
            <span>"Hey Machi, enna notification vandhirukku?"</span>
          </button>
        </div>

        {/* Privacy Mode & Quiet Hours Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Privacy Mode Toggle */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-xs text-white">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Privacy Mode (Hide Body Aloud)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                When enabled, Machi will announce who sent the message but will NOT read the private message text out loud.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={privacyMode}
                onChange={(e) => onTogglePrivacyMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Quiet Hours Toggle */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 font-semibold text-xs text-white">
                <Moon className="w-4 h-4 text-purple-400" />
                <span>Quiet Hours (10:00 PM - 07:00 AM)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Mutes automatic voice announcements during night hours while continuing to log them on screen.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={quietHoursEnabled}
                onChange={(e) => onToggleQuietHours(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Allowed Apps Filter Chips */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <label className="text-[11px] font-mono text-slate-400 uppercase font-semibold flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Allowed Notification Sources (User Controlled):
          </label>
          <div className="flex flex-wrap gap-2">
            {['WhatsApp', 'SMS', 'Slack', 'Gmail', 'Outlook'].map((app) => {
              const isAllowed = allowedApps.includes(app);
              return (
                <button
                  key={app}
                  onClick={() => onToggleAllowedApp(app)}
                  className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                    isAllowed
                      ? 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-400'
                  }`}
                >
                  {isAllowed ? '✓ ' : '+ '}
                  {app}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Simulator Event Dispatcher */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          <h3 className="text-sm font-bold text-white">Live Notification Dispatcher (Test Generator)</h3>
        </div>
        <p className="text-xs text-slate-400">
          Simulate an incoming notification from WhatsApp, SMS, or Slack to hear Machi announce it in real time.
        </p>

        <form onSubmit={handleSimulateDispatch} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1">
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs outline-none"
          >
            <option value="WhatsApp">WhatsApp</option>
            <option value="SMS">SMS Message</option>
            <option value="Slack">Slack</option>
            <option value="Gmail">Gmail</option>
          </select>

          <input
            type="text"
            placeholder="Sender (e.g. Suresh, Bank, Boss)..."
            value={senderInput}
            onChange={(e) => setSenderInput(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs outline-none"
          />

          <input
            type="text"
            placeholder="Message body..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="sm:col-span-2 bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs outline-none"
          />

          <div className="sm:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={!senderInput.trim() || !messageInput.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition-all shadow-md"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Notification to Machi</span>
            </button>
          </div>
        </form>
      </div>

      {/* Recent Notifications Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Recent Notifications Stream</h3>
          <span className="text-xs text-slate-500 font-mono">
            {notifications.length} captured
          </span>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-8 text-center text-slate-500 text-sm space-y-1">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="font-semibold text-slate-400">No notifications captured yet.</p>
            <p className="text-xs">Dispatch a simulated notification above to test Machi's voice announcement.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-3 hover:border-slate-700 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${getAppBadgeColor(
                        n.appName
                      )}`}
                    >
                      {n.appName}
                    </span>
                    <span className="text-xs font-bold text-white">{n.sender}</span>
                    <span className="text-[11px] text-slate-500">• {n.timestamp}</span>
                  </div>

                  {privacyMode ? (
                    <p className="text-xs text-slate-400 italic">
                      [Private message content hidden by Privacy Mode]
                    </p>
                  ) : (
                    <p className="text-xs text-slate-300 leading-relaxed">{n.body}</p>
                  )}
                </div>

                <div className="shrink-0 text-[10px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md">
                  Announced
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
