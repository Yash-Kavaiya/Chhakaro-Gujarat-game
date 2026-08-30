import React from 'react';
import { X, Award, MapPin, Check, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { LocationData } from '../types';
import { GUJARAT_LOCATIONS, ACHIEVEMENTS } from '../data/locations';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitedLocations: string[];
  unlockedAchievements: string[];
  totalDistanceKm: number;
}

export const PassportModal: React.FC<PassportModalProps> = ({
  isOpen,
  onClose,
  visitedLocations,
  unlockedAchievements,
  totalDistanceKm,
}) => {
  if (!isOpen) return null;

  const completionPct = Math.round((visitedLocations.length / GUJARAT_LOCATIONS.length) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Passport Header */}
        <div className="bg-gradient-to-r from-amber-700 via-yellow-600 to-amber-700 p-4 flex items-center justify-between shadow-md border-b-2 border-amber-400">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📘</div>
            <div>
              <div className="text-[10px] text-amber-200 uppercase font-black tracking-widest">
                OFFICIAL VIRTUAL TOUR PASSPORT
              </div>
              <h2 className="text-xl font-extrabold font-serif text-amber-50">
                ગુજરાત પ્રવાસ પાસપોર્ટ
              </h2>
            </div>
          </div>
          <button
            id="passport-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress & Stats Bar */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-400">સ્થળોની મુલાકાત</div>
            <div className="text-lg font-black text-amber-400 font-mono">
              {visitedLocations.length} / {GUJARAT_LOCATIONS.length}
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-400">કુલ સફર (KM)</div>
            <div className="text-lg font-black text-amber-400 font-mono">
              {totalDistanceKm.toFixed(1)} km
            </div>
          </div>

          <div className="bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800">
            <div className="text-xs text-slate-400">ગુજરાત એક્સપ્લોરેશન</div>
            <div className="text-lg font-black text-emerald-400 font-mono">{completionPct}%</div>
          </div>
        </div>

        {/* Passport Content Tabs: Visa Stamps + Achievements */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* 1. Official Visa Location Stamps */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-amber-300 font-serif">
                મુલાકાત લીધેલા સ્થળોના સત્તાવાર વિઝા સ્ટેમ્પ્સ (Visa Stamps)
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {GUJARAT_LOCATIONS.map((loc) => {
                const isVisited = visitedLocations.includes(loc.id);

                return (
                  <div
                    key={loc.id}
                    className={`relative p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all ${
                      isVisited
                        ? 'bg-amber-950/30 border-amber-500/80 text-amber-100 shadow-lg'
                        : 'bg-slate-900/40 border-dashed border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    {isVisited && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </div>
                    )}
                    <div className="text-3xl mb-1">{loc.icon}</div>
                    <div className="font-bold text-xs text-amber-300 truncate w-full">
                      {loc.nameGujarati}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate w-full">
                      {loc.regionNameGujarati}
                    </div>

                    {isVisited ? (
                      <span className="mt-2 text-[9px] uppercase tracking-wider font-extrabold text-amber-400 border border-amber-500/50 px-2 py-0.5 rounded-full">
                        વિઝા સ્વીકૃત
                      </span>
                    ) : (
                      <span className="mt-2 text-[9px] text-slate-500">બાકી</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Achievements Showcase */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-amber-300 font-serif">
                ગૌરવશાળી સિદ્ધિઓ (Tour Achievements)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = unlockedAchievements.includes(ach.id);

                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                      isUnlocked
                        ? 'bg-gradient-to-r from-amber-950/40 to-slate-900 border-amber-500 text-amber-50 shadow-md'
                        : 'bg-slate-900/30 border-slate-800 text-slate-500 opacity-60'
                    }`}
                  >
                    <div className="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                      {ach.icon}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                        <span>{ach.titleGujarati}</span>
                        {isUnlocked && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                        {ach.descriptionGujarati}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
