import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Volume2, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { VehicleControls } from '../types';

interface MobileControlsProps {
  onControlChange: (key: keyof VehicleControls, state: boolean) => void;
  onChangeCamera: () => void;
  expertMode?: boolean;
  onShift?: (dir: 'up' | 'down') => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onControlChange,
  onChangeCamera,
  expertMode = false,
  onShift,
}) => {
  return (
    <div className="absolute inset-x-0 bottom-24 p-3 flex justify-between items-end pointer-events-none sm:hidden select-none z-20">
      {/* Left / Right Steering Buttons */}
      <div className="flex gap-2 pointer-events-auto">
        <button
          id="mobile-steer-left"
          onTouchStart={() => onControlChange('left', true)}
          onTouchEnd={() => onControlChange('left', false)}
          onMouseDown={() => onControlChange('left', true)}
          onMouseUp={() => onControlChange('left', false)}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border-2 border-amber-500/80 active:bg-amber-500 active:text-slate-950 text-amber-400 flex items-center justify-center shadow-2xl backdrop-blur-md"
        >
          <ArrowLeft className="w-7 h-7" />
        </button>

        <button
          id="mobile-steer-right"
          onTouchStart={() => onControlChange('right', true)}
          onTouchEnd={() => onControlChange('right', false)}
          onMouseDown={() => onControlChange('right', true)}
          onMouseUp={() => onControlChange('right', false)}
          className="w-14 h-14 rounded-2xl bg-slate-900/80 border-2 border-amber-500/80 active:bg-amber-500 active:text-slate-950 text-amber-400 flex items-center justify-center shadow-2xl backdrop-blur-md"
        >
          <ArrowRight className="w-7 h-7" />
        </button>
      </div>

      {/* Center Horn & Camera Action */}
      <div className="flex flex-col gap-2 pointer-events-auto items-center">
        <button
          id="mobile-camera-btn"
          onClick={onChangeCamera}
          className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 active:bg-sky-500 text-sky-300 flex items-center justify-center shadow"
        >
          <Eye className="w-5 h-5" />
        </button>

        <button
          id="mobile-horn-btn"
          onTouchStart={() => onControlChange('horn', true)}
          onTouchEnd={() => onControlChange('horn', false)}
          onMouseDown={() => onControlChange('horn', true)}
          onMouseUp={() => onControlChange('horn', false)}
          className="w-12 h-12 rounded-full bg-amber-600/90 border-2 border-amber-300 active:scale-95 text-white flex items-center justify-center shadow-lg"
        >
          <Volume2 className="w-6 h-6" />
        </button>
      </div>

      {/* Accelerator & Brake Pedals (+ manual shift buttons in Expert mode) */}
      <div className="flex gap-2 pointer-events-auto items-end">
        {expertMode && (
          <div className="flex flex-col gap-2">
            <button
              id="mobile-shift-up-btn"
              onClick={() => onShift?.('up')}
              className="w-12 h-12 rounded-2xl bg-slate-900/80 border-2 border-amber-500/80 active:bg-amber-500 active:text-slate-950 text-amber-400 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md font-black"
            >
              <ChevronUp className="w-5 h-5" />
              <span className="text-[8px]">ગિયર</span>
            </button>
            <button
              id="mobile-shift-down-btn"
              onClick={() => onShift?.('down')}
              className="w-12 h-12 rounded-2xl bg-slate-900/80 border-2 border-amber-500/80 active:bg-amber-500 active:text-slate-950 text-amber-400 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md font-black"
            >
              <ChevronDown className="w-5 h-5" />
              <span className="text-[8px]">ગિયર</span>
            </button>
          </div>
        )}
        <button
          id="mobile-brake-btn"
          onTouchStart={() => onControlChange('backward', true)}
          onTouchEnd={() => onControlChange('backward', false)}
          onMouseDown={() => onControlChange('backward', true)}
          onMouseUp={() => onControlChange('backward', false)}
          className="w-14 h-14 rounded-2xl bg-rose-950/80 border-2 border-rose-500/80 active:bg-rose-600 active:text-white text-rose-400 flex items-center justify-center shadow-2xl backdrop-blur-md font-bold text-xs"
        >
          <ArrowDown className="w-6 h-6" />
        </button>

        <button
          id="mobile-gas-btn"
          onTouchStart={() => onControlChange('forward', true)}
          onTouchEnd={() => onControlChange('forward', false)}
          onMouseDown={() => onControlChange('forward', true)}
          onMouseUp={() => onControlChange('forward', false)}
          className="w-16 h-16 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500/80 active:bg-emerald-500 active:text-slate-950 text-emerald-400 flex flex-col items-center justify-center shadow-2xl backdrop-blur-md font-black text-xs"
        >
          <ArrowUp className="w-7 h-7 mb-0.5" />
          <span className="text-[9px]">રેસ</span>
        </button>
      </div>
    </div>
  );
};
