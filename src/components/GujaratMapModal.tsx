import React, { useMemo, useState } from 'react';
import { X, Navigation, Compass, CheckCircle } from 'lucide-react';
import { LocationData, RegionType } from '../types';
import { GUJARAT_LOCATIONS, START_LOCATION_ID } from '../data/locations';
import { GUJARAT_RAIL_LINES } from '../data/railwayNetwork';
import { GujaratMapSvg, MapLegend } from './GujaratMapSvg';

interface GujaratMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  visitedLocations: string[];
  onFastTravel: (loc: LocationData) => void;
  /** Set the nav target and drive there — does NOT teleport. */
  onSetDestination: (loc: LocationData) => void;
}

export const GujaratMapModal: React.FC<GujaratMapModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  visitedLocations,
  onFastTravel,
  onSetDestination,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionType | 'all'>('all');
  const [activeLoc, setActiveLoc] = useState<LocationData>(currentLocation);
  const visited = useMemo(() => new Set(visitedLocations), [visitedLocations]);

  if (!isOpen) return null;

  const filteredLocations =
    selectedRegion === 'all' ? GUJARAT_LOCATIONS : GUJARAT_LOCATIONS.filter((l) => l.region === selectedRegion);

  // Fast travel only to places already reached by road (Gandhinagar, the start, always).
  const canFastTravel = visited.has(activeLoc.id) || activeLoc.id === START_LOCATION_ID;
  const stations = GUJARAT_RAIL_LINES.flatMap((l) => [l.fromStationGujarati, l.toStationGujarati]);
  const stationCount = new Set(stations).size;

  const regions: { id: RegionType | 'all'; label: string }[] = [
    { id: 'all', label: 'આખું ગુજરાત' },
    { id: 'saurashtra', label: 'સૌરાષ્ટ્ર' },
    { id: 'kutch', label: 'કચ્છ' },
    { id: 'north_gujarat', label: 'ઉત્તર ગુજરાત' },
    { id: 'central_gujarat', label: 'મધ્ય ગુજરાત' },
    { id: 'south_gujarat', label: 'દક્ષિણ ગુજરાત' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/75 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 px-4 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Compass className="w-7 h-7 text-amber-200" />
            <div>
              <h2 className="text-xl font-bold">ગુજરાતનો નકશો</h2>
              <p className="text-xs text-amber-100">
                {GUJARAT_LOCATIONS.length} સ્થળો · {GUJARAT_RAIL_LINES.length} રેલ્વે લાઇન · {stationCount} સ્ટેશન · ૨ એરપોર્ટ
              </p>
            </div>
          </div>
          <button
            id="map-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
            aria-label="બંધ કરો"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Region Filter Bar */}
        <div className="p-2.5 bg-slate-950 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
          {regions.map((reg) => (
            <button
              key={reg.id}
              onClick={() => setSelectedRegion(reg.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedRegion === reg.id ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {reg.label}
            </button>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Map */}
          <div className="lg:col-span-7 bg-slate-950 p-3 flex flex-col gap-2 min-h-[42vh] overflow-hidden">
            <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border border-slate-800">
              <GujaratMapSvg
                locations={GUJARAT_LOCATIONS}
                detail="full"
                className="w-full h-full block"
                visited={visited}
                currentId={currentLocation.id}
                selectedId={activeLoc.id}
                onSelect={setActiveLoc}
              />
            </div>
            <MapLegend />
          </div>

          {/* List + details */}
          <div className="lg:col-span-5 border-l border-slate-800 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900/50">
              {filteredLocations.map((loc) => {
                const isCurrent = loc.id === currentLocation.id;
                const isSelected = loc.id === activeLoc.id;
                return (
                  <button
                    key={loc.id}
                    onClick={() => setActiveLoc(loc)}
                    className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow'
                        : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{loc.icon}</span>
                      <span className="min-w-0">
                        <span className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                          <span className="truncate">{loc.nameGujarati}</span>
                          {isCurrent && (
                            <span className="bg-emerald-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
                              અહીં છો
                            </span>
                          )}
                        </span>
                        <span className="block text-xs text-slate-400 truncate">{loc.nameEnglish}</span>
                      </span>
                    </span>
                    {visited.has(loc.id) && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2.5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{activeLoc.icon}</span>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-amber-400 truncate">{activeLoc.nameGujarati}</h3>
                  <p className="text-xs text-slate-300 line-clamp-2">{activeLoc.tagline}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeLoc.culturalHighlights.slice(0, 4).map((h) => (
                  <span key={h} className="bg-slate-800 text-amber-200 text-[11px] px-2 py-1 rounded-lg border border-slate-700">
                    {h}
                  </span>
                ))}
              </div>
              {canFastTravel ? (
                <button
                  id="teleport-location-btn"
                  onClick={() => {
                    onFastTravel(activeLoc);
                    onClose();
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>{activeLoc.nameGujarati} પહોંચો (ફાસ્ટ ટ્રાવેલ)</span>
                </button>
              ) : (
                <button
                  id="set-destination-btn"
                  onClick={() => {
                    onSetDestination(activeLoc);
                    onClose();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 py-3 rounded-2xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-98"
                >
                  <Navigation className="w-4 h-4" />
                  <span>🧭 માર્ગ બતાવો ({activeLoc.nameGujarati} તરફ)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
