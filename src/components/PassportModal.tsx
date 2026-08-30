import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Trophy, Sparkles } from 'lucide-react';
import { PassportStampRecord } from '../types';
import { GUJARAT_LOCATIONS, ACHIEVEMENTS } from '../data/locations';
import { passportProgress, regionTally } from '../state/exploration';

interface PassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitedLocations: string[];
  unlockedAchievements: string[];
  totalDistanceKm: number;
  stampMeta: Record<string, PassportStampRecord>;
  onResetProgress: () => void;
}

const GU_DIGITS = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
const toGu = (n: number): string => String(n).replace(/\d/g, (d) => GU_DIGITS[+d]);

function shortStampDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${String(d.getFullYear()).slice(2)}`;
}

export const PassportModal: React.FC<PassportModalProps> = ({
  isOpen,
  onClose,
  visitedLocations = [],
  unlockedAchievements = [],
  totalDistanceKm = 0,
  stampMeta = {},
  onResetProgress,
}) => {
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Never leave the modal parked in its "confirm delete" state between openings.
  useEffect(() => {
    if (!isOpen) setConfirmingReset(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const safeVisited = Array.isArray(visitedLocations) ? visitedLocations : [];
  const safeUnlocked = Array.isArray(unlockedAchievements) ? unlockedAchievements : [];
  const allLocations = Array.isArray(GUJARAT_LOCATIONS) ? GUJARAT_LOCATIONS : [];
  const allAchievements = Array.isArray(ACHIEVEMENTS) ? ACHIEVEMENTS : [];
  const progress = passportProgress(allLocations, safeVisited);
  const regions = regionTally(allLocations, safeVisited);

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

        {/* Progress header: a filled bar + per-region tallies + the live odometer */}
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-300">
                ગુજરાત ભ્રમણ: {toGu(progress.visited)} / {toGu(progress.total)} · {toGu(progress.pct)}%
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                કુલ સફર {totalDistanceKm.toFixed(1)} km
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all"
                style={{ width: `${progress.pct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {regions.map((r) => {
              const done = r.visited === r.total;
              return (
                <span
                  key={r.region}
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                    done
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 text-slate-300 border-slate-700'
                  }`}
                >
                  {r.regionNameGujarati} {toGu(r.visited)}/{toGu(r.total)}
                </span>
              );
            })}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {allLocations.map((loc) => {
                const isVisited = safeVisited.includes(loc.id);
                const stamp = stampMeta[loc.id];

                return (
                  <div
                    key={loc.id}
                    className={`relative p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all ${
                      isVisited
                        ? 'bg-amber-950/30 border-amber-500/80 text-amber-100 shadow-lg'
                        : 'bg-slate-900/40 border-dashed border-slate-800 text-slate-600 opacity-70'
                    }`}
                  >
                    {isVisited && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        ✓
                      </div>
                    )}
                    <div
                      className={`text-3xl mb-1 ${
                        isVisited ? '' : 'grayscale opacity-30'
                      }`}
                    >
                      {isVisited ? loc.icon : '❓'}
                    </div>
                    <div
                      className={`font-bold text-xs truncate w-full ${
                        isVisited ? 'text-amber-300' : 'text-slate-500'
                      }`}
                    >
                      {isVisited ? loc.nameGujarati : '???'}
                    </div>

                    {isVisited ? (
                      <>
                        <div className="mt-1.5 text-[9px] text-amber-400/90 font-mono flex items-center gap-2">
                          {stamp && <span>📅 {shortStampDate(stamp.visitedAt)}</span>}
                          {stamp && <span>{stamp.kilometersDriven.toFixed(0)} km</span>}
                        </div>
                        {loc.passportStory && (
                          <p className="mt-1 text-[10px] text-slate-300 leading-snug line-clamp-2">
                            {loc.passportStory}
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="mt-2 text-[9px] text-slate-600">પહેલા જાતે પહોંચો</span>
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
              {allAchievements.map((ach) => {
                const isUnlocked = safeUnlocked.includes(ach.id);

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

        {/* Footer: reset progress with inline confirm */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
          {confirmingReset ? (
            <>
              <span className="text-xs text-rose-300 font-bold mr-auto">
                ખાતરી છે? બધી પ્રગતિ ભૂંસાઈ જશે
              </span>
              <button
                onClick={onResetProgress}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition-colors"
              >
                હા, ભૂંસો
              </button>
              <button
                onClick={() => setConfirmingReset(false)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
              >
                રદ કરો
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmingReset(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-200 text-xs font-bold transition-colors"
            >
              🔄 નવેસરથી શરૂ કરો
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
