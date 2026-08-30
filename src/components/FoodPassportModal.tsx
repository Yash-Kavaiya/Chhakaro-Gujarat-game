import React from 'react';
import { X, Utensils, Star, CheckCircle, Sparkles } from 'lucide-react';
import { FoodItem } from '../types';
import { GUJARAT_FOODS } from '../data/locations';
import { soundManager } from '../audio/SoundManager';

interface FoodPassportModalProps {
  isOpen: boolean;
  onClose: () => void;
  discoveredFoods: string[];
  onDiscoverFood: (foodId: string) => void;
}

export const FoodPassportModal: React.FC<FoodPassportModalProps> = ({
  isOpen,
  onClose,
  discoveredFoods,
  onDiscoverFood,
}) => {
  if (!isOpen) return null;

  const handleTasteFood = (food: FoodItem) => {
    onDiscoverFood(food.id);
    soundManager.playFoodDiscoverSound();
    soundManager.speakGujaratiTextFallback(`વાહ ભાઈ વાહ! ${food.nameGujarati} નો સ્વાદ તો દાઢે વળગી જાય એવો છે!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🍲</div>
            <div>
              <h2 className="text-xl font-bold font-serif">કાઠિયાવાડી & ગુજરાતી સ્વાદ સંગ્રહ</h2>
              <p className="text-xs text-amber-100">
                ગુજરાતના અલગ-અલગ વિસ્તારોની પ્રખ્યાત વાનગીઓ ચાખો અને સંગ્રહ કરો
              </p>
            </div>
          </div>
          <button
            id="food-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Food Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUJARAT_FOODS.map((food) => {
            const isDiscovered = discoveredFoods.includes(food.id);

            return (
              <div
                key={food.id}
                className={`p-4 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  isDiscovered
                    ? 'bg-amber-950/30 border-amber-500 text-amber-50 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-3xl">{food.imageEmoji}</span>
                      <div>
                        <h3 className="font-extrabold text-base text-amber-400 font-serif">
                          {food.nameGujarati}
                        </h3>
                        <span className="text-xs text-slate-400">{food.nameEnglish}</span>
                      </div>
                    </div>
                    <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/40">
                      {food.region}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {food.description}
                  </p>

                  <div className="mt-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-200/90 italic font-serif flex items-center gap-1.5">
                    <span>👳🏽‍♂️ કાકા:</span>
                    <span>"{food.kakaReview}"</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>સ્વાદ રેટિંગ: {food.tasteRating} / 5.0</span>
                  </div>

                  {isDiscovered ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-600 px-3 py-1 rounded-xl">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>સ્વાદ ચાખ્યો!</span>
                    </div>
                  ) : (
                    <button
                      id={`taste-btn-${food.id}`}
                      onClick={() => handleTasteFood(food)}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ગરમાગરમ ચાખો!</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
