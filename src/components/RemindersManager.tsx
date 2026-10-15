import React, { useState, useEffect } from 'react';
import {
  Bell,
  Clock,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Sparkles,
  Info,
  Check,
  Volume2
} from 'lucide-react';

export interface ReminderItem {
  id: string;
  title: string;
  timeString: string;
  dueDate: string; // ISO string
  notes?: string;
  isCompleted: boolean;
  isDelivered?: boolean;
}

interface RemindersManagerProps {
  reminders: ReminderItem[];
  onAddReminder: (reminder: Omit<ReminderItem, 'id' | 'isCompleted'>) => void;
  onToggleComplete: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  remindersActiveWhenOff: boolean;
  onToggleRemindersActiveWhenOff: (active: boolean) => void;
}

export const RemindersManager: React.FC<RemindersManagerProps> = ({
  reminders,
  onAddReminder,
  onToggleComplete,
  onDeleteReminder,
  remindersActiveWhenOff,
  onToggleRemindersActiveWhenOff,
}) => {
  const [naturalInput, setNaturalInput] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  // Parse natural language (e.g. "Call sir at 6 PM", "Meeting tomorrow at 9 AM")
  const handleNaturalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!naturalInput.trim()) return;

    const input = naturalInput.trim();
    let parsedTitle = input;
    let scheduledDate = new Date();

    // Check for "at X PM / AM"
    const timeMatch = input.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const ampm = timeMatch[3].toLowerCase();

      if (ampm === 'pm' && hours < 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      scheduledDate.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (scheduledDate.getTime() <= Date.now()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      parsedTitle = input
        .replace(/remind me to|remind me about|remind pannu/i, '')
        .replace(timeMatch[0], '')
        .replace(/at|on|for/gi, '')
        .trim();
    } else if (input.includes('tomorrow')) {
      scheduledDate.setDate(scheduledDate.getDate() + 1);
      scheduledDate.setHours(9, 0, 0, 0);
      parsedTitle = input.replace(/tomorrow/i, '').replace(/remind me to|remind me about/i, '').trim();
    } else {
      // Default: 30 minutes from now
      scheduledDate = new Date(Date.now() + 30 * 60 * 1000);
      parsedTitle = input.replace(/remind me to|remind me about|remind pannu/i, '').trim();
    }

    onAddReminder({
      title: parsedTitle || input,
      timeString: scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dueDate: scheduledDate.toISOString(),
      notes: 'Added via voice/natural language input',
    });

    setNaturalInput('');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const [hours, minutes] = time.split(':').map(Number);
    const scheduledDate = new Date(date);
    scheduledDate.setHours(hours, minutes, 0, 0);

    onAddReminder({
      title: title.trim(),
      timeString: scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dueDate: scheduledDate.toISOString(),
      notes: notes.trim(),
    });

    setTitle('');
    setNotes('');
    setShowManualForm(false);
  };

  const filteredReminders = reminders.filter((r) => {
    if (filter === 'pending') return !r.isCompleted;
    if (filter === 'completed') return r.isCompleted;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Natural Language Input Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Smart Reminders</h2>
              <p className="text-xs text-slate-400">Natural language voice scheduling & local persistence</p>
            </div>
          </div>

          <button
            onClick={() => setShowManualForm(!showManualForm)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{showManualForm ? 'Close Custom Form' : 'New Custom'}</span>
          </button>
        </div>

        {/* Natural Language Prompt Box */}
        <form onSubmit={handleNaturalSubmit} className="space-y-2">
          <label className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
            Quick Natural Language Scheduler:
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="e.g. Call sir at 6 PM, or Meeting tomorrow at 8 AM..."
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!naturalInput.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] text-slate-500">Examples:</span>
            {[
              "Inniku evening 6 manikku sir-ku call panna remind pannu",
              "Remind me about tomorrow's meeting at 8 AM",
              "Set a reminder for 30 minutes from now",
            ].map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setNaturalInput(sample)}
                className="text-[11px] text-slate-400 hover:text-cyan-300 underline underline-offset-2 decoration-slate-700"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </form>

        {/* Manual Custom Form (Collapsible) */}
        {showManualForm && (
          <form onSubmit={handleManualSubmit} className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-3 mt-3 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1 space-y-1">
                <label className="text-xs text-slate-400">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Notes (Optional)</label>
              <input
                type="text"
                placeholder="Additional context or phone number..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 rounded-lg text-xs transition-all"
            >
              Save Custom Reminder
            </button>
          </form>
        )}
      </div>

      {/* Reminder Delivery Configuration Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-3">
          <Clock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-semibold text-slate-200">
              Deliver Reminders When Voice Assistant is OFF
            </span>
            <p className="text-slate-400">
              When enabled, scheduled OS toast and alarm notifications still fire at the designated time even if Machi's wake-word listener is OFF.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={remindersActiveWhenOff}
            onChange={(e) => onToggleRemindersActiveWhenOff(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
        </label>
      </div>

      {/* Reminders List & Filter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilter('pending')}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                filter === 'pending'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({reminders.filter((r) => !r.isCompleted).length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                filter === 'completed'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Completed ({reminders.filter((r) => r.isCompleted).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`text-xs px-3 py-1 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({reminders.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-mono">
            Persistent SQLite Schema Active
          </span>
        </div>

        {filteredReminders.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-8 text-center text-slate-500 text-sm space-y-1">
            <Clock className="w-8 h-8 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="font-semibold text-slate-400">No reminders found in this category.</p>
            <p className="text-xs">Say "Hey Machi, remind me to call sir at 6 PM" to create one.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReminders.map((rem) => {
              const isPast = new Date(rem.dueDate).getTime() < Date.now();
              return (
                <div
                  key={rem.id}
                  className={`bg-slate-900/80 border rounded-xl p-4 flex items-center justify-between gap-3 transition-all ${
                    rem.isCompleted
                      ? 'border-slate-800 opacity-60'
                      : isPast
                      ? 'border-amber-500/40 bg-amber-950/10'
                      : 'border-slate-800 hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      onClick={() => onToggleComplete(rem.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 transition-all ${
                        rem.isCompleted
                          ? 'bg-emerald-600 border-emerald-500 text-white'
                          : 'border-slate-700 hover:border-cyan-400 text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <h4
                        className={`text-sm font-semibold text-white ${
                          rem.isCompleted ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {rem.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                        <span className="flex items-center text-cyan-400 font-mono font-medium">
                          <Clock className="w-3 h-3 mr-1" />
                          {rem.timeString}
                        </span>
                        <span>•</span>
                        <span>{new Date(rem.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        {rem.notes && (
                          <>
                            <span>•</span>
                            <span className="text-slate-500 truncate max-w-xs">{rem.notes}</span>
                          </>
                        )}
                        {isPast && !rem.isCompleted && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                            Due now
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onDeleteReminder(rem.id)}
                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800 transition-all"
                    title="Delete reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Platform Limitations & Battery Optimization Guide */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Operating System Scheduling & Battery Optimization Limitations</span>
        </div>
        <p className="leading-relaxed">
          <strong className="text-slate-300">Android (OPPO CPH2527 / ColorOS):</strong> Standard Doze mode delays alarms by up to 15 minutes unless <code className="text-cyan-300">setExactAndAllowWhileIdle()</code> or <code className="text-cyan-300">SCHEDULE_EXACT_ALARM</code> is granted. In ColorOS, users must add Machi to "Don't optimize" in Battery Settings.
        </p>
        <p className="leading-relaxed">
          <strong className="text-slate-300">Windows 11:</strong> Scheduled reminders trigger native Windows Toast notifications via PowerShell / WinRT. Reminders continue in the background via Windows Task Scheduler or the SQLite daemon even when the main GUI is closed to the system tray.
        </p>
      </div>
    </div>
  );
};
