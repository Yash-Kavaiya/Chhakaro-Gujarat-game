import React from 'react';

interface NavBannerProps {
  targetName: string;
  distanceM: number;
  relativeDeg: number; // signed: + = target to the right, - = left
  onCancel: () => void;
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

/**
 * Top-centre turn-by-turn banner, below the notice banner. The big arrow is rotated by
 * `relativeDeg` straight from navigation.relativeHeadingDeg (0 = dead ahead, +90 = hard
 * right). Only the cancel button takes pointer events.
 */
export const NavBanner: React.FC<NavBannerProps> = ({ targetName, distanceM, relativeDeg, onCancel }) => {
  return (
    <div className="absolute top-36 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 border-2 border-emerald-400/70 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 px-4 py-2 pointer-events-none">
      <svg width={34} height={34} viewBox="0 0 34 34" className="shrink-0">
        <g transform={`rotate(${relativeDeg} 17 17)`}>
          <path d="M17 4 L27 26 L17 20 L7 26 Z" className="fill-emerald-400 stroke-white" strokeWidth={1.5} />
        </g>
      </svg>
      <div className="leading-tight">
        <div className="text-[10px] uppercase tracking-wider text-emerald-300/80 font-bold">માર્ગ</div>
        <div className="text-sm font-black text-emerald-200 font-serif">{targetName}</div>
        <div className="text-xs text-slate-300 font-mono">{formatDistance(distanceM)}</div>
      </div>
      <button
        onClick={onCancel}
        className="ml-1 pointer-events-auto bg-slate-800 hover:bg-rose-900/70 text-slate-300 hover:text-rose-200 text-[10px] font-black px-2 py-1 rounded-lg shrink-0 transition-colors"
      >
        ✕ રદ
      </button>
    </div>
  );
};
