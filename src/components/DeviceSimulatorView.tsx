import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Battery,
  Wifi,
  Signal,
  Power,
  Volume2,
  Bell,
  Clock,
  Mic,
  MicOff,
  Sparkles,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface DeviceSimulatorViewProps {
  onSpeak: (text: string) => void;
}

export const DeviceSimulatorView: React.FC<DeviceSimulatorViewProps> = ({ onSpeak }) => {
  // Independent device states
  const [windowsState, setWindowsState] = useState<{
    isOn: boolean;
    status: 'OFF' | 'STANDBY' | 'LISTENING' | 'SPEAKING';
    remindersCount: number;
    notificationsCount: number;
    battery: number;
  }>({
    isOn: false,
    status: 'OFF',
    remindersCount: 2,
    notificationsCount: 4,
    battery: 92,
  });

  const [androidState, setAndroidState] = useState<{
    isOn: boolean;
    status: 'OFF' | 'STANDBY' | 'LISTENING' | 'SPEAKING';
    remindersCount: number;
    notificationsCount: number;
    battery: number;
  }>({
    isOn: true,
    status: 'STANDBY',
    remindersCount: 1,
    notificationsCount: 6,
    battery: 84,
  });

  const [activeDevice, setActiveDevice] = useState<'windows' | 'android'>('windows');

  const toggleWindowsPower = () => {
    const next = !windowsState.isOn;
    setWindowsState((prev) => ({
      ...prev,
      isOn: next,
      status: next ? 'STANDBY' : 'OFF',
    }));
    if (next) {
      onSpeak("Windows Machi online vandhutten da!");
    }
  };

  const toggleAndroidPower = () => {
    const next = !androidState.isOn;
    setAndroidState((prev) => ({
      ...prev,
      isOn: next,
      status: next ? 'STANDBY' : 'OFF',
    }));
    if (next) {
      onSpeak("Android Machi is now on standby on your OPPO phone!");
    }
  };

  return (
    <div className="space-y-6">
      {/* Device Tab Selector */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">Independent Device Control & Multi-Platform Hub</h2>
            <p className="text-xs text-slate-400">
              Each device operates 100% standalone with its own local wake-word, microphone, and SQLite database.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveDevice('windows')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeDevice === 'windows'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Windows 11 Laptop</span>
            </button>
            <button
              onClick={() => setActiveDevice('android')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeDevice === 'android'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>OPPO CPH2527 (Android)</span>
            </button>
          </div>
        </div>

        {/* Dual Device Quick Status Compare */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Windows Status Pill */}
          <div
            onClick={() => setActiveDevice('windows')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              activeDevice === 'windows'
                ? 'border-cyan-500/60 bg-cyan-950/20 shadow-lg'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-xs text-white">
                <Monitor className="w-4 h-4 text-cyan-400" />
                <span>Windows 11 Laptop</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  windowsState.isOn
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {windowsState.isOn ? 'STANDBY (ON)' : 'STOPPED (OFF)'}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-400">
              <span>🎤 Mic: {windowsState.isOn ? 'Listening' : 'Released'}</span>
              <span>⏰ Reminders: {windowsState.remindersCount}</span>
              <span>🔋 {windowsState.battery}%</span>
            </div>
          </div>

          {/* Android Status Pill */}
          <div
            onClick={() => setActiveDevice('android')}
            className={`cursor-pointer p-4 rounded-xl border transition-all ${
              activeDevice === 'android'
                ? 'border-cyan-500/60 bg-cyan-950/20 shadow-lg'
                : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-bold text-xs text-white">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>OPPO CPH2527 (ColorOS)</span>
              </div>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  androidState.isOn
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {androidState.isOn ? 'STANDBY (ON)' : 'STOPPED (OFF)'}
              </span>
            </div>
            <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-400">
              <span>🎤 Foreground Svc: {androidState.isOn ? 'Active' : 'Stopped'}</span>
              <span>📩 Notifs: {androidState.notificationsCount}</span>
              <span>🔋 {androidState.battery}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Device Bezel Frame */}
      {activeDevice === 'windows' ? (
        /* Windows 11 Laptop Mock Window */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-w-xl mx-auto">
          {/* Windows Title Bar */}
          <div className="bg-slate-900 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 select-none">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">Machi Assistant • Windows 11 (PySide6)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 font-mono">Tray Active</span>
              <div className="flex space-x-1.5 ml-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-700 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-red-600/70 inline-block" />
              </div>
            </div>
          </div>

          {/* Windows Machi Compact UI Body */}
          <div className="p-6 space-y-5 bg-gradient-to-b from-slate-900 to-slate-950">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white tracking-wide">MACHI</h3>
                <p className="text-[11px] text-slate-400">Windows Personal Companion • Local Wake Word</p>
              </div>

              <button
                onClick={toggleWindowsPower}
                className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all ${
                  windowsState.isOn
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-red-600 hover:bg-red-500 text-white'
                }`}
              >
                {windowsState.isOn ? 'POWER ON' : 'POWER OFF'}
              </button>
            </div>

            {/* Simulated Desktop Orb */}
            <div className="flex flex-col items-center justify-center py-4">
              <div
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all ${
                  windowsState.isOn
                    ? 'bg-cyan-500/20 border-2 border-cyan-400 shadow-xl shadow-cyan-500/20 animate-pulse'
                    : 'bg-slate-800/40 border border-slate-700'
                }`}
              >
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    windowsState.isOn ? 'bg-cyan-400/90 shadow-inner' : 'bg-slate-700'
                  }`}
                >
                  <Sparkles className={`w-8 h-8 ${windowsState.isOn ? 'text-slate-950' : 'text-slate-500'}`} />
                </div>
              </div>

              <span className="mt-3 text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                {windowsState.status}
              </span>
            </div>

            {/* Quick Transcript Box */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-1 text-xs">
              <div className="text-[10px] text-slate-500 font-mono font-semibold uppercase">Assistant Feed:</div>
              <p className="text-slate-200">
                {windowsState.isOn
                  ? "Standby active. Say 'Hey Machi' or 'Inniku evening 6 manikku sir-ku call panna remind pannu'."
                  : "Machi is OFF. Wake-word listener completely stopped."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* OPPO CPH2527 Android Phone Mock Window */
        <div className="w-[320px] mx-auto bg-slate-950 border-4 border-slate-800 rounded-[36px] shadow-2xl overflow-hidden p-2">
          {/* Phone Status Bar */}
          <div className="bg-slate-900 px-5 pt-3 pb-2 flex items-center justify-between text-[11px] text-slate-300 rounded-t-[28px]">
            <span className="font-semibold">06:00 PM</span>
            <div className="w-12 h-3.5 rounded-full bg-slate-950 mx-auto" />
            <div className="flex items-center space-x-1.5 text-slate-400">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3 h-3 text-emerald-400" />
            </div>
          </div>

          {/* Android Mobile App UI */}
          <div className="bg-slate-900 px-4 py-5 space-y-4 rounded-b-[28px] min-h-[460px]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-white">MACHI</h4>
                <p className="text-[10px] text-slate-400">OPPO CPH2527 • ColorOS 14</p>
              </div>

              <button
                onClick={toggleAndroidPower}
                className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                  androidState.isOn
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {androidState.isOn ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Foreground Service Notification Card */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 flex items-center space-x-2.5 text-[11px]">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Mic className="w-3.5 h-3.5" />
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-white truncate">Machi is listening</div>
                <div className="text-[10px] text-slate-400 truncate">Standby: Say 'Hey Machi'</div>
              </div>
            </div>

            {/* Mobile Orb */}
            <div className="flex flex-col items-center justify-center py-2">
              <div
                className={`w-24 h-24 rounded-full flex items-center justify-center ${
                  androidState.isOn
                    ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-slate-950" />
                </div>
              </div>
              <span className="mt-2 text-[10px] font-mono font-bold text-emerald-400 uppercase">
                {androidState.status}
              </span>
            </div>

            {/* Tanglish Speech Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold">MACHI VOICE:</span>
              <p className="text-slate-200 text-[11px] leading-relaxed">
                "Sollu da, enna help venum? Call panna va, illa notification check pannalaama?"
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
