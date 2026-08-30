import React from 'react';
import { RoadsideEncounter } from '../types';
import { Utensils, X, Sparkles } from 'lucide-react';

interface RoadsideEncounterModalProps {
  encounter: RoadsideEncounter;
  isFoodAlreadyDiscovered: boolean;
  onTasteAndCollect: (encounter: RoadsideEncounter) => void;
  onClose: () => void;
}

export const RoadsideEncounterModal: React.FC<RoadsideEncounterModalProps> = ({
  encounter,
  isFoodAlreadyDiscovered,
  onTasteAndCollect,
  onClose,
}) => {
  const isTea = encounter.type === 'tea_stall';
  const rewardCoins = encounter.rewardCoins ?? 35;
  const foodName = encounter.foodNameGujarati || encounter.foodNameEnglish || 'ગુજરાતી વાનગી';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950 border-2 border-amber-500/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100 flex flex-col gap-5 overflow-hidden">
        {/* Decorative Background Pattern */}
        <div className="absolute top-0 right-0 translate-x-8 -translate-y-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-3xl shadow-inner">
              {encounter.emoji}
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black text-[11px] uppercase tracking-wider border border-amber-400/30 inline-block mb-1">
                {isTea ? '🫖 કડક હાઇવે ચા સ્ટોલ' : '🥨 કાઠિયાવાડી વાનગી & સ્વાદ'}
              </span>
              <h3 className="text-xl font-black text-amber-200">{encounter.nameGujarati}</h3>
              <p className="text-xs text-slate-400 font-medium">{encounter.nameEnglish}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vendor Dialogue Box */}
        <div className="bg-slate-950/70 border border-amber-500/30 p-4 rounded-2xl relative z-10 flex gap-3.5 items-start">
          <div className="text-3xl shrink-0">👨🏽‍🍳</div>
          <div className="flex-1">
            <div className="font-bold text-amber-400 text-xs mb-1">કાકા અને દુકાનદાર (Dialogue):</div>
            <p className="text-sm text-slate-200 font-medium italic leading-relaxed">
              "{encounter.kakaDialogue}"
            </p>
          </div>
        </div>

        {/* Food Discovery Card */}
        {foodName && (
          <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/40 p-4 rounded-2xl flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-500/20 flex items-center justify-center text-2xl">
                {isTea ? '☕' : '🥨'}
              </div>
              <div>
                <div className="text-xs text-amber-400 font-bold">વાનગી (Food Item):</div>
                <div className="font-black text-slate-100 text-base">{foodName}</div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold mt-0.5">
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {isFoodAlreadyDiscovered
                      ? 'ફૂડ પાસપોર્ટમાં પહેલેથી અનલૉક છે'
                      : 'નવી વાનગી! પાસપોર્ટમાં ઉમેરાશે'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-amber-400 block">+₹{rewardCoins}</span>
              <span className="text-[10px] text-slate-400">+1 ★ Rep</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800 relative z-10">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
          >
            આગળ વધો (Skip)
          </button>
          <button
            onClick={() => onTasteAndCollect(encounter)}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center gap-2"
          >
            <Utensils className="w-4 h-4" />
            <span>સ્વાદ માણો & પાસપોર્ટમાં ઉમેરો</span>
          </button>
        </div>
      </div>
    </div>
  );
};
