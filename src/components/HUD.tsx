import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Map as MapIcon,
  BookOpen,
  Utensils,
  Wrench,
  Camera,
  Volume2,
  VolumeX,
  Sun,
  Sunset,
  Moon,
  CloudRain,
  Eye,
  Sparkles,
  Zap,
  Clock,
  Info,
  Award,
  Users,
  ShoppingBag,
  HelpCircle,
  AlertTriangle,
  Flame,
  Fuel,
  Lock,
  Unlock,
  RefreshCw,
  ChevronDown,
  Check,
} from 'lucide-react';
import { LocationData, CameraMode, WeatherType, TimeOfDayState, VehicleHealthState, PassengerData, MissionData, TimeFreezeMode, RoadsideEncounter, TransmissionMode } from '../types';
import { GameWorld } from '../world/GameWorld';
import { GUJARAT_LOCATIONS } from '../data/locations';
import { SpeedometerGauge } from './SpeedometerGauge';
import { InCarRadio } from './InCarRadio';
import { MiniMap } from './MiniMap';
import { KakaStrip } from './KakaStrip';

interface HUDProps {
  speed: number;
  rpm: number;
  gear: string;
  transmissionMode: TransmissionMode;
  currentLocation: LocationData;
  nearbyLandmark: LocationData | null;
  visitedLocations: string[];
  worldRef: React.RefObject<GameWorld | null>;
  navTargetId: string | null;
  isEngineOn: boolean;
  isHeadlightOn: boolean;
  isHazardOn?: boolean;
  cameraMode: CameraMode;
  weather: WeatherType;
  timeOfDay?: TimeOfDayState | null;
  healthState?: VehicleHealthState;
  activePassenger?: PassengerData | null;
  activeMission?: MissionData | null;
  nearbyFacility?: { type: 'petrol' | 'garage' | 'toll'; name: string; distance: number } | null;
  nearbyEncounter?: RoadsideEncounter | null;
  coins: number;
  reputationStars: number;
  isMuted: boolean;
  totalKm: number;
  onToggleMute: () => void;
  onToggleHeadlight: () => void;
  onToggleHazard?: () => void;
  onChangeCamera: () => void;
  onChangeWeather: () => void;
  onToggleFreezeDay?: () => void;
  onSetTimeFreezeMode?: (mode: TimeFreezeMode) => void;
  onRest?: () => void;
  onOpenMap: () => void;
  onOpenPassport: () => void;
  onOpenFood: () => void;
  onOpenGarage: () => void;
  onOpenKaka: () => void;
  lastKakaLine: string;
  kakaMuted: boolean;
  kakaMicActive: boolean;
  onToggleKakaMuted: () => void;
  onKakaMic: () => void;
  onOpenMissions: () => void;
  onOpenSouvenirs: () => void;
  onOpenQuiz?: () => void;
  onInspectLandmark: (loc: LocationData) => void;
  onCapturePhoto: () => void;
  onRefuel?: () => void;
  onRepair?: () => void;
  onInteractEncounter?: (encounter: RoadsideEncounter) => void;
  expertMode?: boolean;
  onShiftUp?: () => void;
  onShiftDown?: () => void;
  onToggleEngine?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  speed,
  rpm,
  gear,
  transmissionMode,
  currentLocation,
  nearbyLandmark,
  visitedLocations,
  worldRef,
  navTargetId,
  isHeadlightOn,
  isHazardOn,
  cameraMode,
  weather,
  timeOfDay,
  healthState,
  activePassenger,
  activeMission,
  nearbyFacility,
  nearbyEncounter,
  coins,
  reputationStars,
  isMuted,
  totalKm,
  onToggleMute,
  onToggleHeadlight,
  onToggleHazard,
  onChangeCamera,
  onChangeWeather,
  onToggleFreezeDay,
  onSetTimeFreezeMode,
  onRest,
  onOpenMap,
  onOpenPassport,
  onOpenFood,
  onOpenGarage,
  onOpenKaka,
  lastKakaLine,
  kakaMuted,
  kakaMicActive,
  onToggleKakaMuted,
  onKakaMic,
  onOpenMissions,
  onOpenSouvenirs,
  onOpenQuiz,
  onInspectLandmark,
  onCapturePhoto,
  onRefuel,
  onRepair,
  onInteractEncounter,
  expertMode,
  onShiftUp,
  onShiftDown,
  onToggleEngine,
}) => {
  const [isTimeMenuOpen, setIsTimeMenuOpen] = useState(false);
  const timeMenuRef = useRef<HTMLDivElement>(null);

  // Close time menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (timeMenuRef.current && !timeMenuRef.current.contains(e.target as Node)) {
        setIsTimeMenuOpen(false);
      }
    };
    if (isTimeMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTimeMenuOpen]);

  const isDayFrozen = timeOfDay?.isFrozen && timeOfDay?.freezeMode === 'day';
  const isAnyTimeFrozen = timeOfDay?.isFrozen;
  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 select-none font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-start justify-between gap-3 pointer-events-auto w-full">
        {/* Current Location Badge & Highway Time of Day */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5">
          <div className="bg-slate-900/85 backdrop-blur-md border-2 border-amber-500/80 rounded-2xl p-3 sm:px-4 shadow-xl text-amber-50 flex items-center gap-3">
            <div className="text-3xl sm:text-4xl animate-bounce">{currentLocation.icon}</div>
            <div>
              <div className="text-xs uppercase tracking-widest text-amber-300 font-bold flex items-center gap-1.5">
                <span>📍 {currentLocation.regionNameGujarati}</span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-300">{currentLocation.nameEnglish}</span>
              </div>
              <h1 className="text-lg sm:text-xl font-extrabold text-amber-400 tracking-wide font-serif">
                {currentLocation.nameGujarati}
              </h1>
              <p className="text-xs text-slate-300 hidden sm:block max-w-sm truncate">
                {currentLocation.tagline}
              </p>
            </div>
          </div>

          {/* Player Wallet & Reputation Coins */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-amber-400/40 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-3 text-xs text-amber-50">
            <div className="flex items-center gap-1 font-black text-amber-400">
              <span className="text-base">🪙</span>
              <span>₹{coins}</span>
            </div>
            <div className="text-slate-600">|</div>
            <div className="flex items-center gap-1 font-bold text-yellow-300">
              <span className="text-base">⭐</span>
              <span>{reputationStars}</span>
            </div>
          </div>

          {/* Dynamic Highway Time of Day Clock with Freeze Day option */}
          {timeOfDay && (
            <div className="relative pointer-events-auto" ref={timeMenuRef}>
              <button
                id="hud-time-of-day-badge"
                onClick={() => setIsTimeMenuOpen((prev) => !prev)}
                className={`bg-slate-900/90 backdrop-blur-md border rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-2.5 text-xs text-amber-50 transition-all cursor-pointer select-none text-left ${
                  isDayFrozen
                    ? 'border-amber-400 bg-amber-950/40 ring-2 ring-amber-400/30'
                    : isAnyTimeFrozen
                    ? 'border-indigo-400 bg-indigo-950/40'
                    : 'border-amber-400/40 hover:border-amber-400'
                }`}
                title="દિવસ ફ્રીઝ કરવા અથવા સમય બદલવા ક્લિક કરો (Shortcut: T)"
              >
                <div className="text-2xl animate-pulse">
                  {timeOfDay.phase === 'sunrise' && '🌅'}
                  {timeOfDay.phase === 'day' && '☀️'}
                  {timeOfDay.phase === 'sunset' && '🌇'}
                  {timeOfDay.phase === 'dusk' && '🌆'}
                  {timeOfDay.phase === 'night' && '🌌'}
                  {timeOfDay.phase === 'dawn' && '✨'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-extrabold text-amber-300 text-xs">
                    <span>{timeOfDay.formattedTime}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-amber-100 font-serif">{timeOfDay.phaseGujarati}</span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mt-0.5">
                    {isDayFrozen ? (
                      <span className="flex items-center gap-1 text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-400/40">
                        <Lock className="w-2.5 h-2.5 text-amber-400" />
                        <span>દિવસ ફ્રીઝ (Day Locked)</span>
                      </span>
                    ) : isAnyTimeFrozen ? (
                      <span className="flex items-center gap-1 text-indigo-300 font-bold bg-indigo-500/20 px-1.5 py-0.2 rounded border border-indigo-400/40">
                        <Lock className="w-2.5 h-2.5 text-indigo-400" />
                        <span>સમય ફ્રીઝ (Locked)</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin text-emerald-400" style={{ animationDuration: '6s' }} />
                        <span>ગતિશીલ ૨૪ કલાક ચક્ર</span>
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-amber-400/70 transition-transform ${isTimeMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Quick Time Preset Selector Dropdown */}
              {isTimeMenuOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 w-72 bg-slate-950/95 backdrop-blur-xl border-2 border-amber-500/70 rounded-2xl shadow-2xl p-2.5 flex flex-col gap-1 text-xs text-white animate-fadeIn">
                  <div className="px-2.5 py-1 text-[11px] font-black text-amber-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>સમય અને પ્રકાશ મોડ (Lighting)</span>
                    <span className="text-[9px] text-slate-400">કીબોર્ડ: T</span>
                  </div>

                  {/* Freeze Day Option - High Priority */}
                  <button
                    id="time-opt-freeze-day"
                    onClick={() => {
                      onSetTimeFreezeMode?.('day');
                      setIsTimeMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      isDayFrozen
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                        : 'hover:bg-amber-500/20 text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">☀️</span>
                      <div className="text-left">
                        <div className="font-bold flex items-center gap-1">
                          <span>દિવસ ફ્રીઝ (Freeze Day)</span>
                          <span className="text-[10px] px-1 rounded bg-amber-400/30 text-amber-900 font-extrabold">લોકપ્રિય</span>
                        </div>
                        <div className={`text-[10px] ${isDayFrozen ? 'text-slate-900' : 'text-slate-400'}`}>
                          બપોરનો તેજસ્વી તડકો (12:30 PM)
                        </div>
                      </div>
                    </div>
                    {isDayFrozen && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                  </button>

                  {/* Dynamic 24h cycle */}
                  <button
                    id="time-opt-dynamic"
                    onClick={() => {
                      onSetTimeFreezeMode?.('dynamic');
                      setIsTimeMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      !isAnyTimeFrozen
                        ? 'bg-emerald-600 text-white font-black shadow-md'
                        : 'hover:bg-emerald-500/20 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔄</span>
                      <div className="text-left">
                        <div className="font-bold">ગતિશીલ ૨૪ કલાક ચક્ર (Dynamic)</div>
                        <div className={`text-[10px] ${!isAnyTimeFrozen ? 'text-emerald-100' : 'text-slate-400'}`}>
                          ગાડી ચલાવવાથી સમય બદલાય
                        </div>
                      </div>
                    </div>
                    {!isAnyTimeFrozen && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>

                  {/* Sunrise */}
                  <button
                    id="time-opt-sunrise"
                    onClick={() => {
                      onSetTimeFreezeMode?.('sunrise');
                      setIsTimeMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      timeOfDay.freezeMode === 'sunrise' && isAnyTimeFrozen
                        ? 'bg-orange-500 text-slate-950 font-black'
                        : 'hover:bg-orange-500/20 text-orange-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌅</span>
                      <div className="text-left">
                        <div className="font-bold">સૂર્યોદય ફ્રીઝ (Sunrise / Dawn)</div>
                        <div className="text-[10px] text-slate-400">સોનેરી સવાર (06:00 AM)</div>
                      </div>
                    </div>
                    {timeOfDay.freezeMode === 'sunrise' && isAnyTimeFrozen && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  {/* Sunset */}
                  <button
                    id="time-opt-sunset"
                    onClick={() => {
                      onSetTimeFreezeMode?.('sunset');
                      setIsTimeMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      timeOfDay.freezeMode === 'sunset' && isAnyTimeFrozen
                        ? 'bg-rose-600 text-white font-black'
                        : 'hover:bg-rose-500/20 text-rose-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌇</span>
                      <div className="text-left">
                        <div className="font-bold">સંધ્યાકાળ ફ્રીઝ (Golden Sunset)</div>
                        <div className="text-[10px] text-slate-400">લાલચોળ સાંજ (07:15 PM)</div>
                      </div>
                    </div>
                    {timeOfDay.freezeMode === 'sunset' && isAnyTimeFrozen && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  {/* Night */}
                  <button
                    id="time-opt-night"
                    onClick={() => {
                      onSetTimeFreezeMode?.('night');
                      setIsTimeMenuOpen(false);
                    }}
                    className={`flex items-center justify-between p-2 rounded-xl transition-all ${
                      timeOfDay.freezeMode === 'night' && isAnyTimeFrozen
                        ? 'bg-indigo-600 text-white font-black'
                        : 'hover:bg-indigo-500/20 text-indigo-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🌌</span>
                      <div className="text-left">
                        <div className="font-bold">ચાંદની રાત ફ્રીઝ (Night)</div>
                        <div className="text-[10px] text-slate-400">તારા જડિત રાત્રિ (10:30 PM)</div>
                      </div>
                    </div>
                    {timeOfDay.freezeMode === 'night' && isAnyTimeFrozen && <Check className="w-4 h-4 stroke-[3]" />}
                  </button>

                  {/* Rest till morning — only offered once it's actually getting dark */}
                  {onRest && (timeOfDay.phase === 'sunset' || timeOfDay.phase === 'dusk' || timeOfDay.phase === 'night') && (
                    <button
                      id="time-opt-rest"
                      onClick={() => {
                        onRest();
                        setIsTimeMenuOpen(false);
                      }}
                      className="flex items-center gap-2 p-2 rounded-xl transition-all mt-1 border-t border-slate-800 pt-2.5 hover:bg-sky-500/20 text-sky-200"
                    >
                      <span className="text-lg">🛌</span>
                      <div className="text-left">
                        <div className="font-bold">વિશ્રામ કરો (Rest till morning)</div>
                        <div className="text-[10px] text-slate-400">રાત વિતાવીને સીધા સવારે ૦૬:૦૦ વાગ્યે</div>
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top-Right Corner Section: Speedometer Gauge, Vehicle Health & Action Controls */}
        <div className="flex flex-col items-end gap-2 ml-auto">
          {/* Speedometer Gauge & Vehicle Health Indicator */}
          <div className="flex items-center gap-2">
            {healthState && (
              <div className="bg-slate-900/90 backdrop-blur-md border border-amber-500/40 rounded-2xl p-2.5 shadow-xl flex flex-col gap-1.5 text-xs">
                {/* Fuel Meter */}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 font-bold text-amber-400 text-[11px]">
                    <Fuel className="w-3.5 h-3.5" />
                    <span>ડીઝલ:</span>
                  </span>
                  <span className={`font-black ${healthState.fuelPercent < 20 ? 'text-red-400 animate-pulse' : 'text-slate-200'}`}>
                    {healthState.fuelPercent}%
                  </span>
                </div>
                <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      healthState.fuelPercent < 20 ? 'bg-red-500' : healthState.fuelPercent < 50 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${healthState.fuelPercent}%` }}
                  />
                </div>

                {/* Engine Temp & Puncture Status */}
                <div className="flex items-center justify-between gap-2 text-[10px] pt-1 border-t border-slate-800">
                  <span className={`flex items-center gap-0.5 font-bold ${healthState.isOverheating ? 'text-red-400 animate-pulse' : 'text-slate-400'}`}>
                    <Flame className="w-3 h-3" />
                    <span>{Math.round(healthState.engineTempCelsius)}°C</span>
                  </span>
                  {healthState.hasPuncture && (
                    <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-black animate-bounce text-[9px]">
                      પંચર!
                    </span>
                  )}
                </div>
              </div>
            )}

            <SpeedometerGauge
              speed={speed}
              rpm={rpm}
              gear={gear}
              transmissionMode={transmissionMode}
              totalKm={totalKm}
              currentLocation={currentLocation}
              isHeadlightOn={isHeadlightOn}
            />
          </div>

          {/* Expert-mode manual shift + engine start/stop controls */}
          {expertMode && (
            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-amber-500/40 shadow-lg">
              <button
                id="hud-shift-down-btn"
                onClick={onShiftDown}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 text-xs font-black transition-all active:scale-95"
                title="ગિયર ડાઉન (Q key)"
              >
                <span>▼</span>
                <span>ગિયર</span>
              </button>
              <button
                id="hud-shift-up-btn"
                onClick={onShiftUp}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-300 text-xs font-black transition-all active:scale-95"
                title="ગિયર અપ (E key)"
              >
                <span>▲</span>
                <span>ગિયર</span>
              </button>
              <button
                id="hud-engine-btn"
                onClick={onToggleEngine}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-emerald-300 text-xs font-black transition-all active:scale-95"
                title="એન્જિન ચાલુ / બંધ (I key)"
              >
                <span>🔑</span>
                <span>ચાલુ/બંધ</span>
              </button>
            </div>
          )}

          {/* Top Control Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 shadow-lg">
            {/* Kanji Kaka Guide */}
            <button
              id="hud-kaka-btn"
              onClick={onOpenKaka}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 px-3 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
              title="કાનજી કાકો AI ટૂર ગાઈડ"
            >
              <span className="text-base">👳🏽‍♂️</span>
              <span>કાનજી કાકો</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </button>

            {/* Quick Freeze Day Toggle Button */}
            <button
              id="hud-freeze-day-btn"
              onClick={onToggleFreezeDay}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                isDayFrozen
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 border border-amber-300 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-amber-400 border border-amber-500/30'
              }`}
              title={isDayFrozen ? 'દિવસ ફ્રીઝ ચાલુ છે - ક્લિક કરી ગતિશીલ ચક્ર શરૂ કરો (T key)' : 'દિવસ ફ્રીઝ કરો (Freeze Day - T key)'}
            >
              {isDayFrozen ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-950" />
                  <span className="text-xs">☀️ દિવસ ફ્રીઝ</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs hidden sm:inline">દિવસ ફ્રીઝ</span>
                </>
              )}
            </button>

            {/* Weather Toggle */}
            <button
              id="hud-weather-btn"
              onClick={onChangeWeather}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-amber-400 transition-colors"
              title={`હવામાન: ${weather}`}
            >
              {weather === 'sunny' && <Sun className="w-4 h-4" />}
              {weather === 'sunset' && <Sunset className="w-4 h-4 text-orange-400" />}
              {weather === 'night' && <Moon className="w-4 h-4 text-indigo-300" />}
              {weather === 'rain' && <CloudRain className="w-4 h-4 text-cyan-400" />}
              {weather === 'fog' && <Sparkles className="w-4 h-4 text-slate-300" />}
            </button>

            {/* Camera Mode Toggle */}
            <button
              id="hud-camera-btn"
              onClick={onChangeCamera}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              title="કેમેરા બદલો (C key)"
            >
              <Eye className="w-4 h-4 text-sky-400" />
              <span className="uppercase text-[10px] hidden md:inline">{cameraMode}</span>
            </button>

            {/* Headlight Toggle */}
            <button
              id="hud-light-btn"
              onClick={onToggleHeadlight}
              className={`p-2 rounded-xl transition-colors ${
                isHeadlightOn ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50' : 'bg-slate-800 text-slate-400'
              }`}
              title="હેડલાઇટ (L key)"
            >
              <Zap className="w-4 h-4" />
            </button>

            {/* Sound Mute Toggle */}
            <button
              id="hud-sound-btn"
              onClick={onToggleMute}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200"
              title="અવાજ ચાલુ/બંધ"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Photo Mode */}
            <button
              id="hud-photo-btn"
              onClick={onCapturePhoto}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-cyan-400"
              title="ફોટો લો (Photo Mode)"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Middle Interactive Alerts: Facility Action (Petrol/Garage) & Active Passenger Dialogue */}
      <div className="flex flex-col items-center justify-center gap-3 pointer-events-auto my-auto max-w-xl mx-auto w-full">
        {/* Nearby Petrol Pump or Repair Garage Prompt */}
        {nearbyFacility && (
          <div className="bg-slate-950/90 border-2 border-amber-400 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 animate-bounce w-full">
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {nearbyFacility.type === 'petrol' ? '⛽' : nearbyFacility.type === 'garage' ? '🔧' : '🛣️'}
              </span>
              <div>
                <h4 className="font-black text-amber-300 text-sm">{nearbyFacility.name}</h4>
                <p className="text-xs text-slate-300">
                  {nearbyFacility.type === 'petrol'
                    ? 'ડીઝલ પુરાવો અને આગળની મુસાફરી ચાલુ રાખો'
                    : 'પંચર રીપેર અને એન્જિન સર્વિસ ઉપલબ્ધ'}
                </p>
              </div>
            </div>

            {nearbyFacility.type === 'petrol' && onRefuel && (
              <button
                onClick={onRefuel}
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-950 whitespace-nowrap shadow-lg"
              >
                ₹૫૦૦ ડીઝલ પુરાવો
              </button>
            )}

            {nearbyFacility.type === 'garage' && onRepair && (
              <button
                onClick={onRepair}
                className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-xs text-slate-950 whitespace-nowrap shadow-lg"
              >
                પંચર રિપેર (₹૨૦૦)
              </button>
            )}
          </div>
        )}

        {/* Roadside Encounter Prompt (Ganthiya / Tea Stall) */}
        {nearbyEncounter && (
          <div className="bg-slate-950/95 border-2 border-amber-400 p-3.5 sm:p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-3 animate-pulse w-full">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl sm:text-4xl shrink-0">{nearbyEncounter.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[10px] uppercase tracking-wider border border-amber-400/40 shrink-0">
                    {nearbyEncounter.type === 'tea_stall' ? '🫖 કડક ચા સ્ટોપ' : '🥨 કાઠિયાવાડી વાનગી'}
                  </span>
                  <h4 className="font-black text-amber-200 text-sm truncate">{nearbyEncounter.nameGujarati}</h4>
                </div>
                <p className="text-xs text-slate-300 truncate mt-0.5 italic">"{nearbyEncounter.kakaDialogue}"</p>
              </div>
            </div>

            <button
              onClick={() => onInteractEncounter?.(nearbyEncounter)}
              className="py-2 px-3.5 sm:py-2.5 sm:px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 font-black text-xs text-slate-950 whitespace-nowrap shadow-lg flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
            >
              <span>ઉભા રહો & ચાખો (E)</span>
            </button>
          </div>
        )}

        {/* Landmark-approach prompt — lighter than the facility CTA; the whole pill is the
            action so it works for touch as well as the E key. */}
        {nearbyLandmark && (() => {
          const seen = visitedLocations.includes(nearbyLandmark.id);
          return (
            <button
              onClick={() => onInspectLandmark(nearbyLandmark)}
              className="bg-slate-900/80 border border-amber-500/50 hover:border-amber-400 px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2.5 text-xs w-full pointer-events-auto transition-colors active:scale-[0.99]"
            >
              <span className="text-xl shrink-0">{seen ? '✓' : '⛳'}</span>
              <span className="font-black text-amber-200 truncate">{nearbyLandmark.nameGujarati}</span>
              <span className="text-slate-400 shrink-0">—</span>
              <span className="text-slate-300 shrink-0">
                {/* Expert mode rebinds E to shift-up, so only show the key hint outside Expert.
                    The whole pill is still tappable/clickable either way. */}
                {!expertMode && (
                  <>
                    <span className="font-bold text-amber-300">E</span> દબાવો ·{' '}
                  </>
                )}
                {seen ? 'વિગતો જુઓ' : 'વધુ જાણો'}
              </span>
            </button>
          );
        })()}

        {/* Active Passenger In Chhakaro Info Card */}
        {activePassenger && (
          <div className="bg-slate-950/85 border border-amber-500/40 p-3 rounded-2xl shadow-xl flex items-center gap-3 text-xs w-full">
            <span className="text-2xl">{activePassenger.avatarEmoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-200">{activePassenger.nameGujarati}</span>
                <span className="text-[10px] text-slate-400 font-medium">લક્ષ્ય: {activeMission?.dropLocationId || 'મુકામ'}</span>
              </div>
              <p className="text-slate-300 italic truncate text-[11px]">"{activePassenger.storySnippet}"</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD: MiniMap + In-Car Radio (Left) & Menu Navigation Dock (Right) */}
      <div className="flex flex-col sm:flex-row items-end sm:items-end justify-between gap-3 pointer-events-none w-full">
        {/* Left Side: Kaka strip + MiniMap above the In-Car Radio */}
        <div className="flex flex-col gap-2 items-start">
          <KakaStrip
            lastLine={lastKakaLine}
            kakaMuted={kakaMuted}
            micActive={kakaMicActive}
            onToggleMuted={onToggleKakaMuted}
            onOpen={onOpenKaka}
            onMic={onKakaMic}
          />
          <MiniMap
            worldRef={worldRef}
            locations={GUJARAT_LOCATIONS}
            visitedLocations={visitedLocations}
            currentLocationId={currentLocation.id}
            navTargetId={navTargetId}
            activeMission={activeMission ?? null}
          />
          <InCarRadio />
        </div>

        {/* Right Side: Bottom Menu Navigation Dock */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-slate-950/85 backdrop-blur-md p-2 rounded-2xl border border-amber-600/60 shadow-2xl pointer-events-auto">
          {/* Passenger Missions */}
          <button
            id="hud-missions-btn"
            onClick={onOpenMissions}
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-gradient-to-t from-amber-600/30 to-amber-500/20 border border-amber-500/40 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow"
            title="સવારી અને મિશન્સ (Missions)"
          >
            <Users className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px]">સવારી & મિશન</span>
          </button>

          {/* Souvenirs / Handicrafts */}
          <button
            id="hud-souvenirs-btn"
            onClick={onOpenSouvenirs}
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 text-xs font-bold transition-all active:scale-95 shadow"
            title="ગુજરાતી હસ્તકળા અને સ્મૃતિચિહ્નો"
          >
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px]">સ્મૃતિચિહ્નો</span>
          </button>

          {/* Cultural Quiz */}
          <button
            id="hud-quiz-btn"
            onClick={onOpenQuiz}
            disabled={!onOpenQuiz}
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-indigo-500 hover:text-slate-950 text-indigo-300 text-xs font-bold transition-all active:scale-95 shadow disabled:opacity-50 disabled:cursor-not-allowed"
            title={onOpenQuiz ? 'ગુજરાત ક્વિઝ' : 'આ સ્થળે ક્વિઝ ઉપલબ્ધ નથી'}
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px]">ક્વિઝ</span>
          </button>

          {/* Map */}
          <button
            id="hud-map-btn"
            onClick={onOpenMap}
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow"
            title="ગુજરાતનો નકશો (M key)"
          >
            <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px]">નકશો</span>
          </button>

          {/* Passport */}
          <button
            id="hud-passport-btn"
            onClick={onOpenPassport}
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow"
            title="ગુજરાત પ્રવાસ પાસપોર્ટ"
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px]">પાસપોર્ટ</span>
          </button>

          {/* Kathiyawadi Foods */}
          <button
            id="hud-food-btn"
            onClick={onOpenFood}
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow"
            title="કાઠિયાવાડી & ગુજરાતી વાનગીઓ"
          >
            <Utensils className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px]">વાનગીઓ</span>
          </button>

          {/* Chhakaro Garage */}
          <button
            id="hud-garage-btn"
            onClick={onOpenGarage}
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-xs font-bold transition-all active:scale-95 shadow"
            title="મારું છકડું (કસ્ટમાઇઝેશન)"
          >
            <Wrench className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" />
            <span className="text-[10px] sm:text-[11px]">ગેરેજ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
