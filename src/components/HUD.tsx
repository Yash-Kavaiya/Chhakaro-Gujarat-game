import React from 'react';
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
} from 'lucide-react';
import { LocationData, CameraMode, WeatherType, TimeOfDayState, VehicleHealthState, PassengerData, MissionData } from '../types';
import { SpeedometerGauge } from './SpeedometerGauge';
import { InCarRadio } from './InCarRadio';

interface HUDProps {
  speed: number;
  rpm: number;
  currentLocation: LocationData;
  nearbyLandmark: LocationData | null;
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
  coins: number;
  reputationStars: number;
  isMuted: boolean;
  totalKm: number;
  onToggleMute: () => void;
  onToggleHeadlight: () => void;
  onToggleHazard?: () => void;
  onChangeCamera: () => void;
  onChangeWeather: () => void;
  onOpenMap: () => void;
  onOpenPassport: () => void;
  onOpenFood: () => void;
  onOpenGarage: () => void;
  onOpenKaka: () => void;
  onOpenMissions: () => void;
  onOpenSouvenirs: () => void;
  onOpenQuiz: () => void;
  onInspectLandmark: (loc: LocationData) => void;
  onCapturePhoto: () => void;
  onRefuel?: () => void;
  onRepair?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  speed,
  rpm,
  currentLocation,
  nearbyLandmark,
  isHeadlightOn,
  isHazardOn,
  cameraMode,
  weather,
  timeOfDay,
  healthState,
  activePassenger,
  activeMission,
  nearbyFacility,
  coins,
  reputationStars,
  isMuted,
  totalKm,
  onToggleMute,
  onToggleHeadlight,
  onToggleHazard,
  onChangeCamera,
  onChangeWeather,
  onOpenMap,
  onOpenPassport,
  onOpenFood,
  onOpenGarage,
  onOpenKaka,
  onOpenMissions,
  onOpenSouvenirs,
  onOpenQuiz,
  onInspectLandmark,
  onCapturePhoto,
  onRefuel,
  onRepair,
}) => {
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

          {/* Dynamic Highway Time of Day Clock */}
          {timeOfDay && (
            <div
              id="hud-time-of-day-badge"
              className="bg-slate-900/85 backdrop-blur-md border border-amber-400/40 hover:border-amber-400 rounded-2xl px-3.5 py-2 shadow-xl flex items-center gap-2.5 text-xs text-amber-50 transition-all"
              title="પ્રવાસ અંતર અનુસાર બદલાતો વાસ્તવિક સમય"
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
                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400/70" />
                  <span>પ્રવાસ આધારીત સૂર્ય ચક્ર</span>
                </div>
              </div>
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
              totalKm={totalKm}
              currentLocation={currentLocation}
              isHeadlightOn={isHeadlightOn}
            />
          </div>

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

      {/* Bottom HUD: In-Car Radio (Left) & Menu Navigation Dock (Right) */}
      <div className="flex flex-col sm:flex-row items-end sm:items-end justify-between gap-3 pointer-events-none w-full">
        {/* Left Side: In-Car Radio Component */}
        <InCarRadio />

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
            className="flex flex-col items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/90 hover:bg-indigo-500 hover:text-slate-950 text-indigo-300 text-xs font-bold transition-all active:scale-95 shadow"
            title="ગુજરાત ક્વિઝ (Heritage Quiz)"
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


function distCapActive(loc: LocationData) {
  return loc.id === 'gir';
}
