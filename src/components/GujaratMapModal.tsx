import React, { useState } from 'react';
import { X, Navigation, Compass, MapPin, CheckCircle } from 'lucide-react';
import { LocationData, RegionType } from '../types';
import { GUJARAT_LOCATIONS } from '../data/locations';

interface GujaratMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  visitedLocations: string[];
  onFastTravel: (loc: LocationData) => void;
}

export const GujaratMapModal: React.FC<GujaratMapModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  visitedLocations,
  onFastTravel,
}) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionType | 'all'>('all');
  const [activeLoc, setActiveLoc] = useState<LocationData>(currentLocation);

  if (!isOpen) return null;

  const filteredLocations =
    selectedRegion === 'all'
      ? GUJARAT_LOCATIONS
      : GUJARAT_LOCATIONS.filter((l) => l.region === selectedRegion);

  const regions: { id: RegionType | 'all'; label: string }[] = [
    { id: 'all', label: 'આખું ગુજરાત (All)' },
    { id: 'saurashtra', label: 'સૌરાષ્ટ્ર' },
    { id: 'kutch', label: 'કચ્છ' },
    { id: 'central_gujarat', label: 'મધ્ય ગુજરાત' },
    { id: 'south_gujarat', label: 'દક્ષિણ ગુજરાત' },
    { id: 'north_gujarat', label: 'ઉત્તર ગુજરાત' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Compass className="w-7 h-7 text-amber-200 animate-spin-slow" />
            <div>
              <h2 className="text-xl font-bold font-serif">ગુજરાત ભ્રમણ નકશો (Interactive Map)</h2>
              <p className="text-xs text-amber-100">
                સ્થળ પસંદ કરો અને તમારા છકડાને ત્યાં લઈ જાઓ
              </p>
            </div>
          </div>
          <button
            id="map-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Region Filter Bar */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
          {regions.map((reg) => (
            <button
              key={reg.id}
              onClick={() => setSelectedRegion(reg.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedRegion === reg.id
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {reg.label}
            </button>
          ))}
        </div>

        {/* Content Layout: Location Grid + Active Details */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Left / Top: Location List */}
          <div className="md:col-span-5 border-r border-slate-800 overflow-y-auto p-3 space-y-2 bg-slate-900/50">
            {filteredLocations.map((loc) => {
              const isCurrent = loc.id === currentLocation.id;
              const isVisited = visitedLocations.includes(loc.id);
              const isSelected = loc.id === activeLoc.id;

              return (
                <div
                  key={loc.id}
                  onClick={() => setActiveLoc(loc)}
                  className={`p-3 rounded-2xl cursor-pointer border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow'
                      : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{loc.icon}</span>
                    <div>
                      <div className="font-bold text-sm text-amber-400 flex items-center gap-1.5">
                        <span>{loc.nameGujarati}</span>
                        {isCurrent && (
                          <span className="bg-emerald-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded">
                            અહીં છો
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">{loc.nameEnglish}</div>
                    </div>
                  </div>
                  {isVisited && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                </div>
              );
            })}
          </div>

          {/* Right / Bottom: Landmark Preview & Teleport Action */}
          <div className="md:col-span-7 p-5 overflow-y-auto bg-slate-950 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-4xl">{activeLoc.icon}</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs px-3 py-1 rounded-full font-bold">
                  {activeLoc.regionNameGujarati}
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black text-amber-400 font-serif">
                  {activeLoc.nameGujarati}
                </h3>
                <h4 className="text-sm text-slate-400 font-medium">{activeLoc.nameEnglish}</h4>
                <p className="text-sm text-slate-200 mt-2 font-serif italic">
                  "{activeLoc.tagline}"
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {activeLoc.history}
              </div>

              {/* Highlights & Food */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  મુખ્ય આકર્ષણો:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeLoc.culturalHighlights.map((h, i) => (
                    <span
                      key={i}
                      className="bg-slate-800 text-slate-200 text-[11px] px-2.5 py-1 rounded-lg border border-slate-700"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-amber-950/40 border border-amber-700/50 flex items-center justify-between">
                <div className="text-xs text-amber-200">
                  <span className="font-bold">🍲 પ્રખ્યાત ખાણીપીણી:</span> {activeLoc.famousFood}
                </div>
              </div>
            </div>

            {/* Fast Travel Button */}
            <div className="pt-4 mt-4 border-t border-slate-800">
              <button
                id="teleport-location-btn"
                onClick={() => {
                  onFastTravel(activeLoc);
                  onClose();
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 py-3.5 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-98"
              >
                <Navigation className="w-4 h-4" />
                <span>છકડો {activeLoc.nameGujarati} લઈ જાઓ (ફાસ્ટ ટ્રાવેલ)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
