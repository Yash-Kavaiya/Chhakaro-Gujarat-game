import React from 'react';
import { Compass, Zap } from 'lucide-react';
import { LocationData } from '../types';

interface SpeedometerGaugeProps {
  speed: number;
  rpm: number;
  totalKm: number;
  currentLocation: LocationData;
  isHeadlightOn?: boolean;
}

export const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  speed,
  rpm,
  totalKm,
  currentLocation,
  isHeadlightOn = true,
}) => {
  const currentSpeed = Math.abs(speed);
  const maxSpeed = 80;
  const maxRpm = 3500;

  // Speed angle calculation (-135deg to +135deg -> 270 degree sweep)
  const clampedSpeed = Math.min(Math.max(currentSpeed, 0), maxSpeed);
  const speedPercentage = clampedSpeed / maxSpeed;
  const speedAngle = -135 + speedPercentage * 270;

  // RPM percentage & angle (-135deg to +135deg)
  const clampedRpm = Math.min(Math.max(rpm, 0), maxRpm);
  const rpmPercentage = clampedRpm / maxRpm;
  
  // Calculate SVG arc parameters for RPM outer track
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  // 270 degrees sweep = 0.75 of circle
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * rpmPercentage);

  // Determine current gear
  let gear = 'N';
  if (speed > 45) gear = '3';
  else if (speed > 20) gear = '2';
  else if (speed > 2) gear = '1';
  else if (speed < -0.5) gear = 'R';
  else gear = rpm > 900 ? '1' : 'N';

  const isWildlifeLimited = currentLocation.id === 'gir' && currentSpeed >= 24;

  // Generate tick marks (0, 10, 20, 30, 40, 50, 60, 70, 80)
  const ticks = [0, 10, 20, 30, 40, 50, 60, 70, 80];

  return (
    <div
      id="circular-speedometer-gauge"
      className="relative flex items-center gap-3 p-3 sm:p-3.5 rounded-3xl bg-slate-950/92 backdrop-blur-xl border-2 border-amber-500/70 shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.2)] select-none pointer-events-auto transition-all"
    >
      {/* Circular Dial Container */}
      <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
        {/* Outer Brass/Chrome Bezel with Radial Depth */}
        <div className="absolute inset-0 rounded-full border-[3px] border-amber-500/80 bg-gradient-to-br from-amber-600/40 via-slate-900 to-black shadow-inner" />

        {/* Outer Glow Ring */}
        <div className="absolute inset-1 rounded-full bg-slate-950/90 shadow-[inset_0_2px_10px_rgba(0,0,0,0.9)]" />

        {/* SVG Dial Elements (Arcs & Ticks) */}
        <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 160 160">
          <defs>
            <linearGradient id="rpmGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="60%" stopColor="#f59e0b" />
              <stop offset="85%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* RPM Arc Background Track (270 degrees sweep) */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(135 80 80)"
          />

          {/* Dynamic RPM Arc Fill */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#rpmGrad)"
            strokeWidth="6"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(135 80 80)"
            filter="url(#gaugeGlow)"
            className="transition-all duration-100 ease-out"
          />
        </svg>

        {/* Speedometer Radial Tick Marks & Numbers */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {ticks.map((val) => {
            const angle = -135 + (val / maxSpeed) * 270;
            const isMajor = val % 20 === 0;
            return (
              <div
                key={val}
                className="absolute w-full h-full flex flex-col items-center justify-start pt-2"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <div
                  className={`w-0.5 rounded-full ${
                    isMajor ? 'h-3 bg-amber-400 font-bold' : 'h-1.5 bg-amber-300/40'
                  }`}
                />
                {isMajor && (
                  <span
                    className="text-[8px] sm:text-[9px] font-bold text-amber-200/90 font-mono mt-0.5"
                    style={{ transform: `rotate(${-angle}deg)` }}
                  >
                    {val}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Inner Hub Background with subtle vintage texture */}
        <div className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-b from-slate-900 via-slate-950 to-black border border-amber-500/30 flex flex-col items-center justify-center shadow-inner">
          <span className="text-[7px] tracking-widest text-amber-400/80 font-black uppercase">CHHAKDO</span>
          <span className="text-[9px] sm:text-[10px] font-black text-amber-300 font-mono">
            {Math.round(currentSpeed)}
          </span>
          <span className="text-[6px] font-bold text-slate-400">KM/H</span>
        </div>

        {/* Animated Needle */}
        <div
          className="absolute w-full h-full flex items-center justify-center pointer-events-none transition-transform duration-100 ease-out"
          style={{ transform: `rotate(${speedAngle}deg)` }}
        >
          {/* Needle Stem */}
          <div className="relative w-1 sm:w-1.5 h-12 sm:h-14 -top-6 sm:-top-7 flex flex-col items-center">
            {/* Pointer tip */}
            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[8px] border-b-red-500" />
            <div className="w-1 sm:w-1.5 h-full bg-gradient-to-t from-red-600 via-red-500 to-amber-400 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          </div>
        </div>

        {/* Center Chrome Cap */}
        <div className="absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-to-tr from-amber-600 via-amber-300 to-yellow-100 border border-slate-900 shadow-md flex items-center justify-center z-10">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
        </div>
      </div>

      {/* Speedometer Info & Odometer Panel */}
      <div className="flex flex-col justify-center space-y-1">
        {/* Digital Speed and Gear */}
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight drop-shadow-[0_2px_10px_rgba(245,158,11,0.4)]">
              {Math.round(currentSpeed)}
            </span>
            <span className="text-xs text-amber-300/80 font-bold">km/h</span>
          </div>

          {/* Gear Indicator Badge */}
          <div className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/60 text-amber-300 text-[10px] sm:text-xs font-black font-mono shadow-sm">
            GEAR <span className="text-white text-xs">{gear}</span>
          </div>
        </div>

        {/* Live Engine RPM Display with animated power dot */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
          <Zap className={`w-3 h-3 ${rpm > 2200 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
          <span className="font-bold text-slate-200">{rpm}</span>
          <span className="text-[10px] text-slate-400">RPM</span>
          {rpm > 2800 && (
            <span className="text-[9px] px-1 py-0.2 rounded bg-rose-950 border border-rose-500/60 text-rose-300 font-bold">
              રેડલાઇન
            </span>
          )}
        </div>

        {/* Digital Odometer (Distance Travelled) */}
        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-800">
          <Compass className="w-3 h-3 text-amber-500 shrink-0" />
          <span className="text-amber-200 font-bold">{totalKm.toFixed(1)}</span>
          <span className="text-[10px] text-slate-400">KM મુસાફરી</span>
        </div>

        {/* Wildlife Speed Limit Notice if in Gir Forest */}
        {isWildlifeLimited && (
          <div className="text-[9px] text-rose-400 font-bold flex items-center gap-1 animate-pulse">
            <span>⚠️ ગીર વન્યજીવ લિમિટ (25)</span>
          </div>
        )}
      </div>
    </div>
  );
};
