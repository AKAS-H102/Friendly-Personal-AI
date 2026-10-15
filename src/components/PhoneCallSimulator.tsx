import React, { useState } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOff,
  UserCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Volume2
} from 'lucide-react';

interface PhoneCallSimulatorProps {
  onSpeak: (text: string) => void;
}

export const PhoneCallSimulator: React.FC<PhoneCallSimulatorProps> = ({ onSpeak }) => {
  const [activeCall, setActiveCall] = useState<{
    callerName: string;
    phoneNumber: string;
    status: 'idle' | 'ringing' | 'connected' | 'rejected';
  }>({
    callerName: 'Suresh Kumar',
    phoneNumber: '+91 98765 11223',
    status: 'idle',
  });

  const [contactQuery, setContactQuery] = useState('');
  const [callConfirmationRequired, setCallConfirmationRequired] = useState<{
    query: string;
    options: { name: string; number: string }[];
  } | null>(null);

  const sampleContacts = [
    { name: 'Suresh Kumar', number: '+91 98765 11223', role: 'Colleague' },
    { name: 'Suresh Raina', number: '+91 98765 99887', role: 'Cricket Buddy' },
    { name: 'Sir (Office Lead)', number: '+91 98765 43210', role: 'Office' },
    { name: 'Amma (Mom)', number: '+91 98765 00001', role: 'Family' },
    { name: 'Appa (Dad)', number: '+91 98765 00002', role: 'Family' },
  ];

  // Trigger simulated incoming call
  const triggerIncomingCall = (callerName: string, phoneNumber: string) => {
    setActiveCall({
      callerName,
      phoneNumber,
      status: 'ringing',
    });

    const announcement = `Incoming call from ${callerName}. Attend or Reject da?`;
    onSpeak(announcement);
  };

  const handleAttendCall = () => {
    setActiveCall((prev) => ({ ...prev, status: 'connected' }));
    onSpeak("Call attend panren da. Line is connected.");
  };

  const handleRejectCall = () => {
    setActiveCall((prev) => ({ ...prev, status: 'rejected' }));
    onSpeak("Call reject panniyachu da.");
    setTimeout(() => {
      setActiveCall({ callerName: '', phoneNumber: '', status: 'idle' });
    }, 2000);
  };

  const handleInitiateCallSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactQuery.trim()) return;

    const query = contactQuery.toLowerCase().trim();
    const matches = sampleContacts.filter((c) => c.name.toLowerCase().includes(query));

    if (matches.length === 0) {
      onSpeak(`Machi, "${contactQuery}" name-la contact edhuvum illa da. Number sollu call panna.`);
    } else if (matches.length > 1) {
      // Ambiguous! Mandatory confirmation
      setCallConfirmationRequired({ query: contactQuery, options: matches });
      onSpeak(`Machi, "${contactQuery}" name-la rendu contacts irukku da. Yaruku call panna confirmation kudu.`);
    } else {
      // Single match -> Proceed safely
      const target = matches[0];
      setCallConfirmationRequired(null);
      setActiveCall({
        callerName: target.name,
        phoneNumber: target.number,
        status: 'connected',
      });
      onSpeak(`${target.name}-ku call connect panren da!`);
    }

    setContactQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Phone Calling Integration & Simulator</h2>
              <p className="text-xs text-slate-400">Android TelecomManager & Windows Phone Link Bridge</p>
            </div>
          </div>

          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
            Safety Confirmation Enforced
          </span>
        </div>

        {/* Live Incoming Call Simulator Panel */}
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center">
              <PhoneIncoming className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
              Incoming Call Test Trigger:
            </span>
            {activeCall.status === 'ringing' && (
              <span className="text-xs font-bold text-amber-400 animate-pulse flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
                Ringing... Machi is announcing
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { name: 'Suresh Kumar', num: '+91 98765 11223' },
              { name: 'Sir (Office Lead)', num: '+91 98765 43210' },
              { name: 'Amma (Mom)', num: '+91 98765 00001' },
              { name: 'Unknown Caller', num: '+91 91234 56789' },
            ].map((contact, i) => (
              <button
                key={i}
                onClick={() => triggerIncomingCall(contact.name, contact.num)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center space-x-1.5"
              >
                <PhoneIncoming className="w-3 h-3 text-cyan-400" />
                <span>Simulate Call from {contact.name}</span>
              </button>
            ))}
          </div>

          {/* Active Call Status Card */}
          {activeCall.status !== 'idle' && (
            <div className="mt-4 p-4 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    activeCall.status === 'ringing'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-bounce'
                      : activeCall.status === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  }`}
                >
                  <PhoneCall className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">{activeCall.callerName}</h4>
                  <p className="text-xs text-slate-400 font-mono">{activeCall.phoneNumber}</p>
                  <span className="text-[11px] font-semibold text-cyan-300">
                    Status: {activeCall.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {activeCall.status === 'ringing' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAttendCall}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Attend ("Hey Machi, attend the call")</span>
                  </button>
                  <button
                    onClick={handleRejectCall}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Reject ("Hey Machi, reject the call")</span>
                  </button>
                </div>
              )}

              {activeCall.status === 'connected' && (
                <button
                  onClick={handleRejectCall}
                  className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>End Call</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Voice Outgoing Call with Confirmation */}
        <div className="space-y-3 pt-2">
          <label className="text-[11px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            Voice Outgoing Call Initiator:
          </label>
          <form onSubmit={handleInitiateCallSearch} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="e.g. Call Suresh, or Call Sir, or Call Mom..."
              value={contactQuery}
              onChange={(e) => setContactQuery(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
            >
              Call Contact
            </button>
          </form>

          {/* Ambiguous Contact Confirmation Dialog */}
          {callConfirmationRequired && (
            <div className="bg-amber-950/30 border border-amber-600/40 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-start space-x-2 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <p>
                  <strong>Safety Confirmation Enforced:</strong> Multiple contacts found for "{callConfirmationRequired.query}". Machi will not dial without explicit confirmation.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {callConfirmationRequired.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCallConfirmationRequired(null);
                      setActiveCall({
                        callerName: opt.name,
                        phoneNumber: opt.number,
                        status: 'connected',
                      });
                      onSpeak(`Confirmed! ${opt.name}-ku call connect panren da.`);
                    }}
                    className="p-2.5 rounded-lg border border-amber-800/60 bg-amber-950/40 hover:bg-amber-900/40 text-left transition-all"
                  >
                    <div className="text-xs font-bold text-white">{opt.name}</div>
                    <div className="text-[11px] font-mono text-slate-400">{opt.number}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OS Limitations & Role Requirements Notice */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2 text-xs text-slate-400">
        <div className="flex items-center space-x-2 text-slate-300 font-semibold">
          <Info className="w-4 h-4 text-cyan-400" />
          <span>Platform Permissions & Calling Control Restrictions</span>
        </div>
        <p className="leading-relaxed">
          <strong className="text-slate-300">Android (OPPO CPH2527):</strong> Direct answering of incoming calls requires <code className="text-cyan-300">ANSWER_PHONE_CALLS</code> (Android 8.0+) or setting Machi as a companion calling app via <code className="text-cyan-300">TelecomManager</code>. Outgoing calls require runtime <code className="text-cyan-300">CALL_PHONE</code> permission.
        </p>
        <p className="leading-relaxed">
          <strong className="text-slate-300">Windows 11:</strong> Laptop cannot place cellular calls on its own without a paired phone. Machi interfaces with Microsoft Phone Link via the <code className="text-cyan-300">tel:</code> URI and Phone Link Bluetooth handsfree bridge.
        </p>
      </div>
    </div>
  );
};
