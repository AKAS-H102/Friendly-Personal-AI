import React, { useEffect, useRef } from 'react';

export type AssistantState = 'OFF' | 'STANDBY' | 'LISTENING' | 'THINKING' | 'SPEAKING';

interface MachiOrbProps {
  state: AssistantState;
  audioLevel?: number;
  onClick?: () => void;
}

export const MachiOrb: React.FC<MachiOrbProps> = ({ state, audioLevel = 0, onClick }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      phase += 0.04;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = width * 0.3;

      ctx.clearRect(0, 0, width, height);

      // Color palettes by state
      let coreColor = 'rgba(71, 85, 105, 0.4)';
      let glowColor = 'rgba(30, 41, 59, 0.2)';
      let ringColor = 'rgba(100, 116, 139, 0.5)';
      let pulseMagnitude = 0;

      if (state === 'STANDBY') {
        // Cyan / Electric Blue JARVIS glow
        pulseMagnitude = Math.sin(phase) * 6;
        coreColor = 'rgba(6, 182, 212, 0.85)';
        glowColor = 'rgba(14, 165, 233, 0.35)';
        ringColor = 'rgba(56, 189, 248, 0.7)';
      } else if (state === 'LISTENING') {
        // Amber / Orange reactive pulse
        pulseMagnitude = Math.sin(phase * 2) * 10 + audioLevel * 15;
        coreColor = 'rgba(245, 158, 11, 0.95)';
        glowColor = 'rgba(217, 119, 6, 0.5)';
        ringColor = 'rgba(251, 191, 36, 0.9)';
      } else if (state === 'THINKING') {
        // Violet / Magenta spinning rings
        pulseMagnitude = Math.sin(phase * 3) * 8;
        coreColor = 'rgba(168, 85, 247, 0.9)';
        glowColor = 'rgba(147, 51, 234, 0.45)';
        ringColor = 'rgba(192, 132, 252, 0.8)';
      } else if (state === 'SPEAKING') {
        // Emerald / Turquoise sonic waves
        pulseMagnitude = Math.sin(phase * 2.5) * 12 + audioLevel * 20;
        coreColor = 'rgba(16, 185, 129, 0.95)';
        glowColor = 'rgba(5, 150, 105, 0.5)';
        ringColor = 'rgba(52, 211, 153, 0.85)';
      }

      const radius = Math.max(20, baseRadius + pulseMagnitude);

      // 1. Diffuse outer ambient aura
      const auraGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.8);
      auraGradient.addColorStop(0, glowColor);
      auraGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // 2. Concentric geometric holographic rings
      if (state !== 'OFF') {
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate((phase * (i % 2 === 0 ? 0.6 : -0.8)) + (i * Math.PI) / 3);
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 12, 4, 12]);
          ctx.beginPath();
          ctx.ellipse(0, 0, radius + i * 14, radius + i * 14 + Math.sin(phase + i) * 6, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // 3. Glowing Core Sphere
      const coreGradient = ctx.createRadialGradient(
        centerX - radius * 0.25,
        centerY - radius * 0.25,
        radius * 0.1,
        centerX,
        centerY,
        radius
      );
      if (state === 'OFF') {
        coreGradient.addColorStop(0, 'rgba(51, 65, 85, 0.6)');
        coreGradient.addColorStop(1, 'rgba(15, 23, 42, 0.9)');
      } else {
        coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        coreGradient.addColorStop(0.35, coreColor);
        coreGradient.addColorStop(1, 'rgba(3, 7, 18, 0.85)');
      }

      ctx.fillStyle = coreGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Subtle inner particle accents
      if (state !== 'OFF') {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX - radius * 0.3, centerY - radius * 0.3, radius * 0.25, -Math.PI / 3, Math.PI / 4);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, audioLevel]);

  return (
    <div
      onClick={onClick}
      className="relative flex items-center justify-center cursor-pointer select-none group"
      title={state === 'OFF' ? 'Machi is OFF. Turn ON to activate.' : 'Machi is active. Click to trigger.'}
    >
      <canvas
        ref={canvasRef}
        width={240}
        height={240}
        className="w-52 h-52 sm:w-60 sm:h-60 transition-transform duration-300 group-hover:scale-105"
      />
      
      {/* State Badge in center bottom */}
      <div className="absolute bottom-2 flex flex-col items-center">
        <span
          className={`text-[11px] font-mono tracking-widest font-extrabold px-3 py-0.5 rounded-full border shadow-lg backdrop-blur-md transition-all ${
            state === 'OFF'
              ? 'bg-slate-900/90 text-slate-400 border-slate-700/60'
              : state === 'STANDBY'
              ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50 shadow-cyan-500/20'
              : state === 'LISTENING'
              ? 'bg-amber-950/90 text-amber-300 border-amber-500/50 shadow-amber-500/20'
              : state === 'THINKING'
              ? 'bg-purple-950/90 text-purple-300 border-purple-500/50 shadow-purple-500/20'
              : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-emerald-500/20'
          }`}
        >
          {state}
        </span>
      </div>
    </div>
  );
};
