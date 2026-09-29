import React from 'react';
import { Play, Key, MapPin } from 'lucide-react';
import { VehicleType } from '../types';
import { START_LOCATION } from '../data/locations';
import { VehiclePicker } from './VehiclePicker';

interface StartScreenProps {
  /** Every trip — new or resumed — starts from Gandhinagar. */
  onStartGame: () => void;
  hasSave: boolean;
  onResume: () => void;
  vehicleType: VehicleType;
  onChangeVehicle: (v: VehicleType) => void;
  expertMode: boolean;
  onToggleExpertMode: () => void;
  onResetProgress: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  onStartGame,
  hasSave,
  onResume,
  vehicleType,
  onChangeVehicle,
  expertMode,
  onToggleExpertMode,
  onResetProgress,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 font-sans select-none text-slate-100 overflow-y-auto">
      {/* Background Graphic Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-600/20 via-transparent to-transparent pointer-events-none" />

      <div className="relative bg-slate-900/90 backdrop-blur-xl border-2 border-amber-500/80 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center space-y-5 my-auto">
        {/* Title & Cultural Brand */}
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold tracking-wide mb-3">
            <span>🛺🚗🏍️</span>
            <span>3D ગુજરાત પ્રવાસ</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-300">
            છકડામાં ગુજરાત
          </h1>
          <p className="text-sm sm:text-base text-slate-300 mt-1.5">
            છકડો, કાર કે બાઇક લઈને અસલ ગુજરાતના રસ્તે નીકળો — હાઈવે, રેલ્વે, એરપોર્ટ, ધોલેરા સ્માર્ટ સિટી, મંદિરો, રણ અને દરિયાકિનારો!
          </p>
        </div>

        {/* Fixed start point */}
        <div className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 border-emerald-500/60 bg-emerald-950/30 text-left">
          <span className="text-3xl">{START_LOCATION.icon}</span>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>સફરની શરૂઆત — ગુજરાતની રાજધાની</span>
            </div>
            <div className="font-bold text-amber-300 truncate">{START_LOCATION.nameGujarati}</div>
            <div className="text-[11px] text-slate-400 truncate">{START_LOCATION.tagline}</div>
          </div>
        </div>

        {/* Vehicle choice */}
        <div className="w-full text-left">
          <div className="text-xs font-bold text-amber-400 mb-2.5">તમારું વાહન પસંદ કરો</div>
          <VehiclePicker value={vehicleType} onChange={onChangeVehicle} />
        </div>

        {/* Controls Summary */}
        <div className="w-full bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-300 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">W / A / S / D</div>
            <div className="text-[10px] text-slate-400">વાહન ચલાવો</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">M (નકશો)</div>
            <div className="text-[10px] text-slate-400">ગુજરાતનો નકશો</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">H (હોર્ન)</div>
            <div className="text-[10px] text-slate-400">પોં.. પોં..</div>
          </div>
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="font-bold text-amber-400">C (કેમેરા)</div>
            <div className="text-[10px] text-slate-400">૫ કેમેરા એન્ગલ</div>
          </div>
        </div>

        {/* Expert Mode opt-in — manual gearbox + engine start/stop */}
        <button
          id="expert-mode-toggle"
          type="button"
          role="switch"
          aria-checked={expertMode}
          onClick={onToggleExpertMode}
          className={`w-full flex items-center justify-between gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
            expertMode
              ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/30'
              : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <div className="font-bold text-sm text-amber-300">નિષ્ણાત મોડ (Expert driving)</div>
              <div className="text-[11px] text-slate-400">
                {expertMode ? 'મેન્યુઅલ ગિયર + એન્જિન ચાલુ/બંધ' : 'ઓટોમેટિક — સૌ માટે સરળ'}
              </div>
            </div>
          </div>
          <div className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${expertMode ? 'bg-amber-400' : 'bg-slate-700'}`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${expertMode ? 'translate-x-5' : ''}`} />
          </div>
        </button>

        {/* Resume path — only when a save exists (still starts from Gandhinagar) */}
        {hasSave && (
          <button
            id="resume-trip-btn"
            onClick={onResume}
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 py-4 rounded-2xl font-bold text-base shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-98"
          >
            <Play className="w-5 h-5" />
            <span>▶ સફર ચાલુ રાખો (પ્રગતિ સાચવેલી છે)</span>
          </button>
        )}

        {/* Start Engine Ignition Button */}
        <button
          id="start-engine-btn"
          onClick={onStartGame}
          className={`w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 py-4 rounded-2xl font-bold text-base shadow-2xl flex items-center justify-center gap-3 transition-transform active:scale-98 ${
            hasSave ? '' : 'animate-pulse'
          }`}
        >
          <Key className="w-5 h-5" />
          <span>{hasSave ? '✦ નવી સફર શરૂ કરો (ગાંધીનગરથી)' : '🔑 ગાંધીનગરથી સફર શરૂ કરો!'}</span>
        </button>

        {hasSave && (
          <button
            id="reset-progress-btn"
            type="button"
            onClick={() => {
              if (window.confirm('બધી પ્રગતિ ભૂંસી નાખવી છે? (Reset all progress)')) onResetProgress();
            }}
            className="text-[11px] text-slate-500 hover:text-rose-400 underline underline-offset-2"
          >
            પ્રગતિ ભૂંસી નાખો (Reset progress)
          </button>
        )}
      </div>
    </div>
  );
};
