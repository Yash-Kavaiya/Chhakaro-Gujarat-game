import React, { useState } from 'react';
import { X, MapPin, Users, Award, Clock, AlertTriangle, CheckCircle, Navigation, Play, UserCheck } from 'lucide-react';
import { MissionData, PassengerData, LocationData } from '../types';
import { GUJARAT_MISSIONS, GUJARATI_PASSENGERS } from '../data/missions';
import { soundManager } from '../audio/SoundManager';

interface PassengerMissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  activeMission: MissionData | null;
  onAcceptMission: (mission: MissionData) => void;
  onCancelMission: () => void;
  coins: number;
  reputationStars: number;
  completedMissionsCount: number;
}

export const PassengerMissionModal: React.FC<PassengerMissionModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  activeMission,
  onAcceptMission,
  onCancelMission,
  coins,
  reputationStars,
  completedMissionsCount,
}) => {
  const [selectedTab, setSelectedTab] = useState<'missions' | 'passengers'>('missions');
  const [selectedMission, setSelectedMission] = useState<MissionData | null>(activeMission || GUJARAT_MISSIONS[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-900/60 via-amber-800/40 to-slate-900 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-2xl shadow-inner">
              🛺
            </div>
            <div>
              <h2 className="text-2xl font-black text-amber-300 tracking-wide font-sans">
                ગુજરાતી સવારી અને મિશન (Missions)
              </h2>
              <p className="text-xs text-amber-200/80 font-medium">
                મુસાફરોને મુકામે પહોંચાડો, સિક્કા (₹) અને પ્રતિષ્ઠા (⭐) કમાઓ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-black/40 border border-amber-500/30">
              <span className="text-sm font-bold text-amber-400">🪙 ₹{coins}</span>
              <span className="text-slate-600">|</span>
              <span className="text-sm font-bold text-yellow-300">⭐ {reputationStars} Stars</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2">
          <button
            onClick={() => setSelectedTab('missions')}
            className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-sm transition ${
              selectedTab === 'missions'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Award size={18} />
            <span>ઉપલબ્ધ મિશન્સ ({GUJARAT_MISSIONS.length})</span>
          </button>
          <button
            onClick={() => setSelectedTab('passengers')}
            className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-sm transition ${
              selectedTab === 'passengers'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10 rounded-t-xl'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={18} />
            <span>ગુજરાતી મુસાફરોની યાદી ({GUJARATI_PASSENGERS.length})</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {selectedTab === 'missions' ? (
            <>
              {/* Mission List (Left Column) */}
              <div className="md:col-span-5 space-y-3 max-h-[58vh] overflow-y-auto pr-2">
                {GUJARAT_MISSIONS.map((mission) => {
                  const isCurrentActive = activeMission?.id === mission.id;
                  const isSelected = selectedMission?.id === mission.id;

                  return (
                    <div
                      key={mission.id}
                      onClick={() => setSelectedMission(mission)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                        isCurrentActive
                          ? 'bg-amber-950/50 border-amber-400 ring-2 ring-amber-400/40'
                          : isSelected
                          ? 'bg-slate-800/80 border-amber-500/60 shadow-lg'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl p-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            {mission.icon}
                          </span>
                          <div>
                            <h3 className="font-bold text-slate-100 text-sm leading-tight">
                              {mission.titleGujarati}
                            </h3>
                            <p className="text-xs text-slate-400">{mission.titleEnglish}</p>
                          </div>
                        </div>
                        {isCurrentActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                            ચાલુ છે
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
                        <span className="text-amber-400 font-bold">🪙 ₹{mission.rewardCoins}</span>
                        <span className="text-yellow-400 font-semibold">⭐ +{mission.rewardReputation} Star</span>
                        {mission.timeLimitSec && (
                          <span className="text-sky-300 flex items-center space-x-1">
                            <Clock size={12} />
                            <span>{mission.timeLimitSec}s</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Mission Detailed Preview (Right Column) */}
              <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between">
                {selectedMission ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                      <div>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">મિશન વિગત</span>
                        <h3 className="text-xl font-black text-slate-100 mt-1">
                          {selectedMission.titleGujarati}
                        </h3>
                        <p className="text-xs text-slate-400">{selectedMission.titleEnglish}</p>
                      </div>
                      <div className="text-3xl p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                        {selectedMission.icon}
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
                      {selectedMission.descriptionGujarati}
                    </p>

                    {/* Passenger Profile if attached */}
                    {selectedMission.passenger && (
                      <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 space-y-2">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{selectedMission.passenger.avatarEmoji}</span>
                          <div>
                            <h4 className="font-bold text-amber-200 text-sm">
                              {selectedMission.passenger.nameGujarati}
                            </h4>
                            <p className="text-xs text-amber-300/70">{selectedMission.passenger.roleGujarati}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 italic pl-2 border-l-2 border-amber-500/50">
                          "{selectedMission.passenger.dialogueGreeting}"
                        </p>
                      </div>
                    )}

                    {/* Mission Requirements / Badges */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center space-x-2">
                        <Navigation className="text-amber-400" size={16} />
                        <div>
                          <div className="text-slate-400">ઉપાડવાનું સ્થળ</div>
                          <div className="font-bold text-slate-200 capitalize">{selectedMission.pickupLocationId}</div>
                        </div>
                      </div>
                      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center space-x-2">
                        <MapPin className="text-red-400" size={16} />
                        <div>
                          <div className="text-slate-400">મુકામ (લક્ષ્ય)</div>
                          <div className="font-bold text-slate-200 capitalize">{selectedMission.dropLocationId}</div>
                        </div>
                      </div>
                    </div>

                    {selectedMission.speedLimitMax && (
                      <div className="flex items-center space-x-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200">
                        <AlertTriangle className="text-amber-400" size={16} />
                        <span>સ્પીડ લિમિટ: વધુમાં વધુ {selectedMission.speedLimitMax} km/h જાળવવી!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500">કોઈ મિશન પસંદ કરો</div>
                )}

                {/* Action Buttons */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  {activeMission?.id === selectedMission?.id ? (
                    <button
                      onClick={() => {
                        onCancelMission();
                        soundManager.playHorn(1);
                      }}
                      className="w-full py-3.5 px-6 rounded-2xl bg-red-600/80 hover:bg-red-600 font-bold text-sm text-white transition flex items-center justify-center space-x-2 shadow-lg"
                    >
                      <X size={18} />
                      <span>મિશન રદ કરો (Cancel Mission)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (selectedMission) {
                          onAcceptMission(selectedMission);
                          soundManager.playHorn(0);
                          onClose();
                        }
                      }}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 font-bold text-sm text-slate-950 transition flex items-center justify-center space-x-2 shadow-xl shadow-amber-500/20"
                    >
                      <Play size={18} />
                      <span>સવારી સ્વીકારો અને નીકળો (Accept Mission)</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Passenger Catalog Tab */
            <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {GUJARATI_PASSENGERS.map((passenger) => (
                <div
                  key={passenger.id}
                  className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-3xl p-2 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                      {passenger.avatarEmoji}
                    </span>
                    <div>
                      <h4 className="font-bold text-amber-200 text-sm">{passenger.nameGujarati}</h4>
                      <p className="text-xs text-slate-400">{passenger.nameEnglish}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-amber-400 font-semibold">
                        {passenger.roleGujarati}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 italic bg-slate-900/50 p-2.5 rounded-xl border border-slate-800">
                    "{passenger.storySnippet}"
                  </p>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-bold">ભાડું: ₹{passenger.fareCoins}</span>
                    <span className="text-yellow-400 font-semibold">⭐ +{passenger.reputationGain} Star</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <div className="flex items-center space-x-4">
            <span>સફળતાપૂર્વક પૂર્ણ થયેલ મિશન્સ: <b className="text-amber-300">{completedMissionsCount}</b></span>
            <span>|</span>
            <span>હાલનું લોકેશન: <b className="text-slate-200">{currentLocation.nameGujarati}</b></span>
          </div>
          <button onClick={onClose} className="text-amber-400 font-bold hover:underline">
            પાછા ફરો (Back to Driving)
          </button>
        </div>
      </div>
    </div>
  );
};
