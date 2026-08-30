import React from 'react';
import { X, ShoppingBag, CheckCircle, Sparkles, Award } from 'lucide-react';
import { SouvenirItem } from '../types';
import { soundManager } from '../audio/SoundManager';

interface SouvenirShopModalProps {
  isOpen: boolean;
  onClose: () => void;
  souvenirs: SouvenirItem[];
  coins: number;
  onBuySouvenir: (souvenirId: string) => void;
}

export const SouvenirShopModal: React.FC<SouvenirShopModalProps> = ({
  isOpen,
  onClose,
  souvenirs,
  coins,
  onBuySouvenir,
}) => {
  if (!isOpen) return null;

  const acquiredCount = souvenirs.filter((s) => s.acquired).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border-2 border-emerald-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-950 via-teal-900/60 to-slate-900 border-b border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-inner">
              🛍️
            </div>
            <div>
              <h2 className="text-2xl font-black text-emerald-300 tracking-wide font-sans">
                ગુજરાતી હસ્તકળા અને સ્મૃતિચિહ્નો (Souvenirs)
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium">
                પાટણના પટોળા, કચ્છી બાંધણી અને સંખેડા લાખકામનો અસલ સાંસ્કૃતિક સંગ્રહ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 px-3.5 py-1.5 rounded-xl bg-black/40 border border-emerald-500/30">
              <span className="text-sm font-bold text-amber-400">🪙 ₹{coins}</span>
              <span className="text-slate-600">|</span>
              <span className="text-xs font-bold text-emerald-300">
                સંગ્રહ: {acquiredCount} / {souvenirs.length}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Souvenir Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {souvenirs.map((item) => (
            <div
              key={item.id}
              className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
                item.acquired
                  ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-400/30'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-4xl p-3 bg-white/5 rounded-2xl border border-white/10">
                    {item.iconEmoji}
                  </span>
                  {item.acquired ? (
                    <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                      <CheckCircle size={12} />
                      <span>સંગ્રહિત</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      ₹{item.priceCoins}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-slate-100 text-sm leading-snug">{item.nameGujarati}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{item.nameEnglish}</p>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] bg-slate-800 text-emerald-300 font-semibold">
                    📍 {item.region}
                  </span>
                </div>

                <p className="text-xs text-slate-300/90 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  {item.descriptionGujarati}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                {item.acquired ? (
                  <div className="text-center py-2 text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1">
                    <Sparkles size={14} />
                    <span>તમારા કલ્ચરલ આલ્બમમાં છે!</span>
                  </div>
                ) : (
                  <button
                    disabled={coins < item.priceCoins}
                    onClick={() => {
                      onBuySouvenir(item.id);
                      soundManager.playChime();
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-2 ${
                      coins >= item.priceCoins
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <ShoppingBag size={14} />
                    <span>{coins >= item.priceCoins ? 'ખરીદો (Buy Now)' : 'અપૂરતા સિક્કા'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <span>
            ગુજરાતની હસ્તકળા ખરીદીને ૧૦૦% કલ્ચરલ પ્રવાસ પૂર્ણ કરો!
          </span>
          <button onClick={onClose} className="text-emerald-400 font-bold hover:underline">
            બંધ કરો (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
