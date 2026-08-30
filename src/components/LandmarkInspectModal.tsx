import React from 'react';
import { X, Volume2, Camera, Compass, Award, Sparkles, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { LocationData } from '../types';
import { soundManager } from '../audio/SoundManager';

interface LandmarkInspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: LocationData;
  isVisited: boolean;
  onMarkVisited: (locId: string) => void;
  onOpenKaka: () => void;
}

export const LandmarkInspectModal: React.FC<LandmarkInspectModalProps> = ({
  isOpen,
  onClose,
  location,
  isVisited,
  onMarkVisited,
  onOpenKaka,
}) => {
  if (!isOpen) return null;

  const handleCapturePostcard = () => {
    onMarkVisited(location.id);
    soundManager.playAchievementSound();
    soundManager.speakGujaratiTextFallback(`અભિનંદન! ${location.nameGujarati} ની યાદગાર તસવીર લેવાઈ ગઈ!`);

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f59e0b', '#dc2626', '#16a34a', '#2563eb'],
    });
  };

  const handlePlayVoiceGuide = () => {
    soundManager.speakGujaratiTextFallback(
      `સ્વાગત છે ${location.nameGujarati} માં! ${location.history} અહીં આવ્યા પછી ${location.famousFood} ખાવાનું ભૂલતા નહીં!`
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{location.icon}</span>
            <div>
              <div className="text-[10px] text-amber-200 uppercase font-black tracking-widest">
                GUJARAT HERITAGE SPOTLIGHT
              </div>
              <h2 className="text-xl font-extrabold font-serif text-amber-50">
                {location.nameGujarati}
              </h2>
            </div>
          </div>
          <button
            id="inspect-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-slate-900 to-slate-950">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-bold bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40">
              📍 {location.regionNameGujarati} | {location.nameEnglish}
            </span>
            {isVisited && (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>પાસપોર્ટમાં નોંધાયેલ</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
            <p className="text-sm italic font-serif text-amber-200">
              "{location.tagline}"
            </p>
          </div>

          {/* History */}
          <div>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
              સ્થળનો પરિચય & ઐતિહાસિક મહત્વ:
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
              {location.history}
            </p>
          </div>

          {/* Highlights */}
          <div>
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
              મુખ્ય દર્શનીય આકર્ષણો:
            </h4>
            <div className="flex flex-wrap gap-2">
              {location.culturalHighlights.map((h, i) => (
                <span
                  key={i}
                  className="bg-slate-800 text-amber-200 text-xs px-3 py-1.5 rounded-xl border border-slate-700 font-medium"
                >
                  ✨ {h}
                </span>
              ))}
            </div>
          </div>

          {/* Famous Food */}
          <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="text-xs text-amber-200">
              <span className="font-bold">🍲 અહીંની સ્પેશિયલ વાનગી:</span> {location.famousFood}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            id="voice-guide-btn"
            onClick={handlePlayVoiceGuide}
            className="bg-slate-800 hover:bg-slate-700 text-amber-300 py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            <span>ઓડિયો ગાઈડ સાંભળો (Voice)</span>
          </button>

          <button
            id="postcard-photo-btn"
            onClick={handleCapturePostcard}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 py-3 rounded-2xl font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <Camera className="w-4 h-4" />
            <span>પોસ્ટકાર્ડ ફોટો લો & પાસપોર્ટ સ્ટેમ્પ કરો!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
