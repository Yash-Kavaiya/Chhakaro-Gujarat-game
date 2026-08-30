import React, { useState } from 'react';
import { Play, Compass, Key, Sparkles, Navigation } from 'lucide-react';
import { LocationData } from '../types';
import { GUJARAT_LOCATIONS } from '../data/locations';

interface StartScreenProps {
  onStartGame: (startLoc: LocationData) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const [selectedStart, setSelectedStart] = useState<LocationData>(GUJARAT_LOCATIONS[0]);

  const quickStarts = GUJARAT_LOCATIONS.slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 font-sans select-none text-slate-100">
      {/* Background Graphic Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative bg-slate-900/90 backdrop-blur-xl border-2 border-amber-500/80 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-6">
        {/* Title & Cultural Brand */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black tracking-widest uppercase mb-3">
            <span>🛺</span>
            <span>3D Gujarat Virtual Tour Experience</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-300 font-serif">
            છકડામાં ગુજરાત
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-1.5 font-medium">
            કાઠિયાવાડના દેશી છકડામાં બેસીને આખા ગુજરાતની સંસ્કૃતિ, મંદિરો, રણ અને જંગલનો પ્રવાસ કરો!
          </p>
        </div>

        {/* Start Point Selection */}
        <div className="w-full text-left">
          <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Compass className="w-4 h-4" />
            <span>યાત્રા ક્યાંથી શરૂ કરવી છે? (Starting Point)</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {quickStarts.map((loc) => {
              const isSelected = loc.id === selectedStart.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => setSelectedStart(loc)}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/40 shadow-lg ring-2 ring-amber-400/40'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-2xl mb-1">{loc.icon}</div>
                  <div className="font-bold text-xs text-amber-300 truncate">
                    {loc.nameGujarati}
                  </div>
                  <div className="text-[10px] text-slate-400">{loc.regionNameGujarati}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls Summary */}
        <div className="w-full bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">W / A / S / D</div>
            <div className="text-[10px] text-slate-400">છકડો ચલાવો</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">H (હોર્ન)</div>
            <div className="text-[10px] text-slate-400">દેશી પોં.. પોં..</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">C (કેમેરા)</div>
            <div className="text-[10px] text-slate-400">૫ કેમેરા એન્ગલ</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">👳🏽‍♂️ કાનજી કાકો</div>
            <div className="text-[10px] text-slate-400">AI ઓડિયો ગાઈડ</div>
          </div>
        </div>

        {/* Start Engine Ignition Button */}
        <button
          id="start-engine-btn"
          onClick={() => onStartGame(selectedStart)}
          className="w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 py-4 rounded-2xl font-black text-base shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-98 animate-pulse"
        >
          <Key className="w-5 h-5" />
          <span>🔑 છકડો ચાલુ કરો અને નીકળો સફરે! (Start Engine)</span>
        </button>
      </div>
    </div>
  );
};
