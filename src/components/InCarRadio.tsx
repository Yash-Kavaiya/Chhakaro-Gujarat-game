import React, { useState, useEffect, useRef } from 'react';
import {
  Radio as RadioIcon,
  Volume2,
  VolumeX,
  Power,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  X,
  Music,
  Disc,
  Mic,
  Newspaper,
  Flame,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { radioAudioEngine } from '../audio/RadioAudioEngine';
import { GUJARAT_RADIO_STATIONS } from '../data/radioStations';
import { RadioStation, RadioTrack } from '../types';

interface InCarRadioProps {
  onCloseExpanded?: () => void;
}

export const InCarRadio: React.FC<InCarRadioProps> = () => {
  const [isPowered, setIsPowered] = useState(radioAudioEngine.getIsPowered());
  const [isMuted, setIsMuted] = useState(radioAudioEngine.getIsMuted());
  const [volume, setVolume] = useState(radioAudioEngine.getVolume());
  const [currentStationIdx, setCurrentStationIdx] = useState(radioAudioEngine.getCurrentStationIndex());
  const [currentStation, setCurrentStation] = useState<RadioStation>(radioAudioEngine.getCurrentStation());
  const [currentTrack, setCurrentTrack] = useState<RadioTrack>(radioAudioEngine.getCurrentTrack());
  const [isExpanded, setIsExpanded] = useState(false);
  const [vuLeft, setVuLeft] = useState(15);
  const [vuRight, setVuRight] = useState(18);
  const [tuningAngle, setTuningAngle] = useState(0);

  // Equalizer visualizer animation frame
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    // Subscribe to radio audio engine state updates
    const unsubscribe = radioAudioEngine.subscribe(() => {
      setIsPowered(radioAudioEngine.getIsPowered());
      setIsMuted(radioAudioEngine.getIsMuted());
      setVolume(radioAudioEngine.getVolume());
      setCurrentStationIdx(radioAudioEngine.getCurrentStationIndex());
      setCurrentStation(radioAudioEngine.getCurrentStation());
      setCurrentTrack(radioAudioEngine.getCurrentTrack());
    });

    // Real-time VU meter & Visualizer update loop
    const updateMeter = () => {
      if (radioAudioEngine.getIsPowered() && !radioAudioEngine.getIsMuted()) {
        const data = radioAudioEngine.getVisualizerData();
        let sumL = 0;
        let sumR = 0;
        const len = data.length;
        for (let i = 0; i < len / 2; i++) sumL += data[i];
        for (let i = len / 2; i < len; i++) sumR += data[i];

        const avgL = (sumL / (len / 2)) / 255;
        const avgR = (sumR / (len / 2)) / 255;

        setVuLeft(Math.min(95, Math.max(12, avgL * 100 + Math.random() * 8)));
        setVuRight(Math.min(95, Math.max(12, avgR * 100 + Math.random() * 8)));
      } else {
        setVuLeft(8);
        setVuRight(8);
      }
      animRef.current = requestAnimationFrame(updateMeter);
    };
    animRef.current = requestAnimationFrame(updateMeter);

    // Keyboard Hotkeys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setIsExpanded((prev) => !prev);
      } else if (e.key === '[') {
        radioAudioEngine.prevStation();
      } else if (e.key === ']') {
        radioAudioEngine.nextStation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubscribe();
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleTogglePower = () => {
    radioAudioEngine.togglePower();
  };

  const handleSelectStation = (index: number) => {
    radioAudioEngine.selectStation(index);
    setTuningAngle((index / (GUJARAT_RADIO_STATIONS.length - 1)) * 180 - 90);
  };

  const handlePrevStation = () => {
    radioAudioEngine.prevStation();
  };

  const handleNextStation = () => {
    radioAudioEngine.nextStation();
  };

  const handlePrevTrack = () => {
    radioAudioEngine.prevTrack();
  };

  const handleNextTrack = () => {
    radioAudioEngine.nextTrack();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    radioAudioEngine.setVolume(val);
  };

  const handleToggleMute = () => {
    radioAudioEngine.toggleMute();
  };

  return (
    <>
      {/* 1. Compact Dashboard Radio Dock (Always Accessible in Bottom Left of HUD) */}
      <div
        id="in-car-radio-dock"
        className="pointer-events-auto select-none transition-all duration-300 font-sans"
      >
        <div className="bg-gradient-to-r from-stone-900/95 via-neutral-900/95 to-stone-950/95 backdrop-blur-md border-2 border-amber-600/70 hover:border-amber-500 rounded-2xl p-2 sm:p-2.5 shadow-2xl flex items-center gap-2.5 text-amber-50 max-w-sm sm:max-w-md">
          {/* Power Button */}
          <button
            id="radio-power-toggle-btn"
            onClick={handleTogglePower}
            className={`p-2 rounded-xl transition-all active:scale-90 shadow-md ${
              isPowered
                ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40 animate-pulse'
                : 'bg-stone-800 text-stone-400 hover:text-stone-200'
            }`}
            title={isPowered ? 'રેડિયો બંધ કરો (Power Off)' : 'રેડિયો ચાલુ કરો (Turn On Radio) [R]'}
          >
            <Power className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Glowing Retro Frequency LCD Display */}
          <div
            onClick={() => setIsExpanded(true)}
            className="flex-1 cursor-pointer bg-stone-950/90 border border-amber-500/30 rounded-xl px-2.5 py-1.5 overflow-hidden group hover:border-amber-400/80 transition-colors"
          >
            <div className="flex items-center justify-between gap-1 text-[10px] uppercase font-mono text-amber-400 font-bold">
              <span className="flex items-center gap-1">
                <RadioIcon className="w-3 h-3 text-amber-400" />
                <span>{isPowered ? currentStation.frequency : 'OFF'}</span>
              </span>
              <span className="text-stone-400 truncate text-[9px]">
                {isPowered ? currentStation.genre.toUpperCase() : 'PRESS POWER'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-0.5">
              <div className="truncate">
                <p className="text-xs sm:text-sm font-extrabold text-amber-100 truncate font-serif">
                  {isPowered ? currentStation.nameGujarati : 'છકડો FM રેડિયો'}
                </p>
                <p className="text-[10px] text-amber-300/80 truncate">
                  {isPowered ? currentTrack.titleGujarati : 'ગીત, ગરબા અને તાજા સમાચાર માટે [R] દબાવો'}
                </p>
              </div>

              {/* Animated Equalizer Wave Bars */}
              {isPowered && !isMuted ? (
                <div className="flex items-end gap-0.5 h-5 w-7 shrink-0">
                  <span
                    className="w-1 bg-amber-400 rounded-t transition-all duration-75"
                    style={{ height: `${Math.max(15, vuLeft * 0.9)}%` }}
                  />
                  <span
                    className="w-1 bg-orange-400 rounded-t transition-all duration-75"
                    style={{ height: `${Math.max(25, vuRight * 1.1)}%` }}
                  />
                  <span
                    className="w-1 bg-emerald-400 rounded-t transition-all duration-75"
                    style={{ height: `${Math.max(20, vuLeft * 0.75)}%` }}
                  />
                  <span
                    className="w-1 bg-amber-300 rounded-t transition-all duration-75"
                    style={{ height: `${Math.max(10, vuRight * 0.6)}%` }}
                  />
                </div>
              ) : (
                <Disc className="w-4 h-4 text-stone-600 shrink-0" />
              )}
            </div>
          </div>

          {/* Quick Prev / Next Channel Buttons */}
          <div className="flex items-center gap-1">
            <button
              id="radio-prev-station-dock"
              onClick={handlePrevStation}
              disabled={!isPowered}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 transition-colors"
              title="અગાઉનું સ્ટેશન [ [ ]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="radio-next-station-dock"
              onClick={handleNextStation}
              disabled={!isPowered}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 transition-colors"
              title="આગળનું સ્ટેશન [ ] ]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              id="radio-expand-btn"
              onClick={() => setIsExpanded(true)}
              className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 hover:text-stone-950 text-amber-300 transition-all ml-0.5"
              title="વિસ્તૃત ડેશબોર્ડ રેડિયો [R]"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Expanded Retro Dashboard Radio Deck Modal */}
      {isExpanded && (
        <div
          id="in-car-radio-expanded-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in pointer-events-auto select-none"
        >
          {/* Vintage Woodgrain & Chrome Dashboard Chassis */}
          <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#2b1810] via-[#1c120c] to-[#120a07] border-4 border-[#8B5A2B] rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-amber-50">
            {/* Header: Vintage Brand Badge & Close */}
            <div className="flex items-center justify-between border-b border-amber-700/50 pb-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-stone-950 shadow-lg border border-amber-300">
                  <RadioIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-extrabold font-mono">
                      GUJARAT STEREO DELUXE 1984
                    </span>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-500/40">
                      AM / FM HI-FI
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-amber-200 font-serif">
                    કાઠિયાવાડી છકડો ઇન-કાર રેડિયો
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="radio-modal-power-btn"
                  onClick={handleTogglePower}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md ${
                    isPowered
                      ? 'bg-emerald-500 text-stone-950 shadow-emerald-500/30 animate-pulse'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{isPowered ? 'ચાલુ (ON)' : 'બંધ (OFF)'}</span>
                </button>

                <button
                  id="radio-modal-close-btn"
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                  title="બંધ કરો [R / Esc]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Glowing Retro Frequency Tuning Dial Bar */}
            <div className="bg-black/80 border-2 border-amber-600/60 rounded-2xl p-3 sm:p-4 mb-4 shadow-inner">
              {/* Radio Frequency Scale with Needle */}
              <div className="relative mb-3">
                <div className="flex justify-between text-[11px] font-mono font-bold text-amber-400/90 mb-1 px-2">
                  <span>88 MHz</span>
                  <span>93.5 (લોકસંગીત)</span>
                  <span>98.3 (ગરબા)</span>
                  <span>102.5 (સમાચાર)</span>
                  <span>105.4 (ડાયરો)</span>
                  <span>108 MHz (ભક્તિ)</span>
                </div>
                <div className="h-4 bg-stone-900 rounded-full border border-amber-600/40 relative overflow-hidden flex items-center px-1">
                  {/* Graduations */}
                  <div className="absolute inset-0 flex justify-between px-3 items-center opacity-40">
                    {Array.from({ length: 24 }).map((_, i) => (
                      <span key={i} className={`w-0.5 ${i % 4 === 0 ? 'h-3 bg-amber-300' : 'h-1.5 bg-amber-500'}`} />
                    ))}
                  </div>

                  {/* Tuning Needle Indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-[0_0_8px_#ef4444] transition-all duration-300 ease-out z-10"
                    style={{
                      left: `${((currentStationIdx) / (GUJARAT_RADIO_STATIONS.length - 1)) * 96 + 2}%`,
                    }}
                  >
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full -ml-[3px] -mt-0.5 shadow" />
                  </div>
                </div>
              </div>

              {/* Station Presets Buttons 1 - 5 */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {GUJARAT_RADIO_STATIONS.map((station, idx) => {
                  const isActive = currentStationIdx === idx && isPowered;
                  return (
                    <button
                      key={station.id}
                      id={`radio-preset-${station.id}`}
                      onClick={() => handleSelectStation(idx)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all active:scale-95 ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 border-amber-300 font-extrabold shadow-lg shadow-amber-500/30'
                          : 'bg-stone-900/80 hover:bg-stone-800 text-stone-300 border-stone-700 hover:border-amber-500/50 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-1 text-xs mb-0.5">
                        <span className="text-base">{station.icon}</span>
                        <span className="font-mono font-bold text-[11px]">{station.frequency}</span>
                      </div>
                      <span className="text-xs truncate w-full">{station.nameGujarati.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Broadcast Center Display & Dynamic VU Meters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Left 2 Cols: Active Track & Station Live Player */}
              <div className="md:col-span-2 bg-stone-950/85 border border-amber-600/40 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold font-mono border border-amber-500/30">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>{currentStation.frequency} • {currentStation.genre.toUpperCase()} LIVE</span>
                    </span>
                    <span className="text-xs text-stone-400 font-medium">
                      સંચાલક: {currentStation.hostNameGujarati}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-amber-200 font-serif mb-1">
                    {isPowered ? currentTrack.titleGujarati : 'રેડિયો સ્ટેશન પસંદ કરો'}
                  </h3>
                  <p className="text-xs text-amber-400/90 font-medium mb-3">
                    {isPowered ? currentTrack.artistGujarati : 'ગુજરાતનું અસલ લોકસંગીત અને તાજા સમાચાર'}
                  </p>

                  {/* Lyrics / Spoken Bulletin Display */}
                  {isPowered && (
                    <div className="bg-amber-950/30 border-l-4 border-amber-500 rounded-r-xl p-2.5 text-xs text-amber-100/90 italic leading-relaxed">
                      {currentStation.genre === 'news' ? (
                        <div className="flex items-start gap-2 not-italic">
                          <Newspaper className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                          <span>
                            {currentTrack.newsBulletins?.[0] || 'હાઈવે ટ્રાફિક અને હવામાન સમાચાર પ્રસારિત થઈ રહ્યા છે...'}
                          </span>
                        </div>
                      ) : (
                        <span>"{currentTrack.lyricsSnippet || currentStation.taglineGujarati}"</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Track Controls */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-800">
                  <div className="flex items-center gap-2">
                    <button
                      id="radio-prev-track-btn"
                      onClick={handlePrevTrack}
                      disabled={!isPowered}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 transition-colors"
                      title="અગાઉનું ગીત / બુલેટિન"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      id="radio-next-track-btn"
                      onClick={handleNextTrack}
                      disabled={!isPowered}
                      className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-300 transition-colors"
                      title="આગળનું ગીત / બુલેટિન"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-400 font-mono">
                    <span>BPM: {currentTrack.tempoBpm || 100}</span>
                    <span>•</span>
                    <span className="uppercase">રાગ: {currentTrack.scaleType}</span>
                  </div>
                </div>
              </div>

              {/* Right Col: Retro Analog VU Meters & Master Volume Knob */}
              <div className="bg-stone-950/85 border border-amber-600/40 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-mono uppercase text-amber-400 font-bold mb-2 flex items-center justify-between">
                    <span>STEREO VU METERS</span>
                    <Sliders className="w-3.5 h-3.5" />
                  </div>

                  {/* Dual Analog VU Meters */}
                  <div className="space-y-2 mb-4">
                    {/* Left Channel */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-0.5">
                        <span>L -20dB</span>
                        <span>0dB</span>
                        <span>+3dB</span>
                      </div>
                      <div className="h-3 bg-stone-900 rounded-full border border-stone-700 overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75 ease-out rounded-full"
                          style={{ width: `${vuLeft}%` }}
                        />
                      </div>
                    </div>

                    {/* Right Channel */}
                    <div>
                      <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-0.5">
                        <span>R -20dB</span>
                        <span>0dB</span>
                        <span>+3dB</span>
                      </div>
                      <div className="h-3 bg-stone-900 rounded-full border border-stone-700 overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-75 ease-out rounded-full"
                          style={{ width: `${vuRight}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Volume Slider & Mute */}
                <div className="border-t border-stone-800 pt-3">
                  <div className="flex items-center justify-between text-xs text-stone-300 font-medium mb-1.5">
                    <span className="flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>વોલ્યુમ (Volume)</span>
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{Math.round(volume * 100)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      id="radio-mute-btn"
                      onClick={handleToggleMute}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                      title={isMuted ? 'અનમ્યૂટ કરો' : 'મ્યૂટ કરો'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                    <input
                      id="radio-volume-slider"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full accent-amber-500 h-2 bg-stone-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Keyboard Controls Guidance Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-400 bg-stone-950/60 rounded-xl px-3.5 py-2 border border-stone-800/80">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-600 rounded text-[10px] text-amber-300 font-mono">
                    R
                  </kbd>
                  <span>રેડિયો ખોલો/બંધ કરો</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-stone-800 border border-stone-600 rounded text-[10px] text-amber-300 font-mono">
                    [ / ]
                  </kbd>
                  <span>સ્ટેશન બદલો</span>
                </span>
              </div>
              <span className="text-amber-400 font-bold font-serif">
                સૌરાષ્ટ્ર હાઈવે પર સુમધુર સંગીતની સફર 🛺✨
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
