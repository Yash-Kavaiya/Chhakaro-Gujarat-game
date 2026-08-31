import React, { useState } from 'react';
import { Mic, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';

interface KakaStripProps {
  /** The last line Kaka spoke — chat reply or proactive narration. */
  lastLine: string;
  kakaMuted: boolean;
  micActive: boolean;
  onToggleMuted: () => void;
  onOpen: () => void;
  onMic: () => void;
}

/**
 * Collapsible HUD strip near the MiniMap: avatar + last line + mic + "કાકા શાંત".
 * Tapping the avatar or the line opens the full chat modal.
 */
export const KakaStrip: React.FC<KakaStripProps> = ({
  lastLine,
  kakaMuted,
  micActive,
  onToggleMuted,
  onOpen,
  onMic,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="pointer-events-auto flex items-center gap-1 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-amber-600/60 shadow-2xl px-1.5 py-1.5">
        <button
          onClick={onOpen}
          className="w-8 h-8 rounded-full bg-amber-500/25 border border-amber-400 flex items-center justify-center text-base"
          title="કાનજી કાકો ખોલો"
        >
          👳🏽‍♂️
        </button>
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 text-amber-400/80 hover:text-amber-300"
          title="કાકા સ્ટ્રિપ ખોલો"
          aria-label="કાકા સ્ટ્રિપ ખોલો"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2 bg-slate-950/85 backdrop-blur-md rounded-2xl border border-amber-600/60 shadow-2xl px-2 py-1.5 max-w-[230px] sm:max-w-[270px]">
      <button
        onClick={onOpen}
        className="shrink-0 w-8 h-8 rounded-full bg-amber-500/25 border border-amber-400 flex items-center justify-center text-base"
        title="કાનજી કાકો ખોલો"
      >
        👳🏽‍♂️
      </button>

      <button onClick={onOpen} className="flex-1 min-w-0 text-left" title="કાનજી કાકો ખોલો">
        <div className="text-[9px] font-black uppercase tracking-wide text-amber-400/80">કાનજી કાકો</div>
        <div className="text-[11px] leading-tight text-amber-50 truncate">
          {lastLine || 'રામ રામ બાપા! કંઈ પૂછવું હોય તો કહો.'}
        </div>
      </button>

      <button
        onClick={onMic}
        className={`shrink-0 p-1.5 rounded-lg transition-colors ${
          micActive ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
        }`}
        title="બોલીને પૂછો"
        aria-label="બોલીને પૂછો"
      >
        <Mic className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onToggleMuted}
        className={`shrink-0 p-1.5 rounded-lg transition-colors hover:bg-slate-700 ${
          kakaMuted ? 'bg-slate-800 text-slate-500' : 'bg-slate-800 text-amber-300'
        }`}
        title={kakaMuted ? 'કાકા ચાલુ કરો' : 'કાકા શાંત કરો'}
        aria-label={kakaMuted ? 'કાકા ચાલુ કરો' : 'કાકા શાંત કરો'}
      >
        {kakaMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      </button>

      <button
        onClick={() => setCollapsed(true)}
        className="shrink-0 p-1 text-amber-400/70 hover:text-amber-300"
        title="કાકા સ્ટ્રિપ સંકેલો"
        aria-label="કાકા સ્ટ્રિપ સંકેલો"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
    </div>
  );
};
