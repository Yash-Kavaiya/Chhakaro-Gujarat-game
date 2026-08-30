import React, { useState } from 'react';
import { X, HelpCircle, CheckCircle2, XCircle, Award, ArrowRight } from 'lucide-react';
import { CulturalQuiz } from '../types';
import { soundManager } from '../audio/SoundManager';

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  quiz: CulturalQuiz | null;
  onAnswerCorrect: (rewardCoins: number) => void;
}

export const QuizModal: React.FC<QuizModalProps> = ({
  isOpen,
  onClose,
  quiz,
  onAnswerCorrect,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !quiz) return null;

  const handleSelect = (idx: number) => {
    if (isSubmitted) return;
    setSelectedAnswer(idx);
    setIsSubmitted(true);

    if (idx === quiz.correctAnswerIdx) {
      soundManager.playChime();
      onAnswerCorrect(quiz.coinReward);
    } else {
      soundManager.playHorn(1);
    }
  };

  const isCorrect = selectedAnswer === quiz.correctAnswerIdx;
  const options = Array.isArray(quiz.optionsGujarati) ? quiz.optionsGujarati : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-indigo-500/50 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-950 via-purple-900/50 to-slate-900 border-b border-indigo-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-xl shadow-inner">
              ❓
            </div>
            <div>
              <h3 className="text-lg font-black text-indigo-300">
                ગુજરાતી હેરિટેજ ક્વિઝ ({quiz.locationNameGujarati})
              </h3>
              <p className="text-xs text-indigo-200/70">સાચો જવાબ આપો અને ₹{quiz.coinReward} સિક્કા જીતો</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Question & Options */}
        <div className="p-6 space-y-5">
          <p className="text-base font-bold text-slate-100 leading-snug bg-slate-950/70 p-4 rounded-2xl border border-slate-800">
            {quiz.questionGujarati}
          </p>

          <div className="space-y-2.5">
            {options.map((option, idx) => {
              let btnStyle = 'bg-slate-950/80 border-slate-800 hover:border-indigo-500/60 text-slate-200';

              if (isSubmitted) {
                if (idx === quiz.correctAnswerIdx) {
                  btnStyle = 'bg-emerald-950/70 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/40';
                } else if (idx === selectedAnswer) {
                  btnStyle = 'bg-red-950/70 border-red-500 text-red-200 ring-2 ring-red-500/40';
                } else {
                  btnStyle = 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-60';
                }
              }

              return (
                <button
                  key={idx}
                  disabled={isSubmitted}
                  onClick={() => handleSelect(idx)}
                  className={`w-full p-3.5 rounded-2xl border font-bold text-sm text-left transition flex items-center justify-between ${btnStyle}`}
                >
                  <span>{option}</span>
                  {isSubmitted && idx === quiz.correctAnswerIdx && (
                    <CheckCircle2 className="text-emerald-400" size={18} />
                  )}
                  {isSubmitted && idx === selectedAnswer && idx !== quiz.correctAnswerIdx && (
                    <XCircle className="text-red-400" size={18} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation Fact Box */}
          {isSubmitted && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-1 animate-fadeIn ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="font-bold flex items-center space-x-1">
                <Award size={14} className={isCorrect ? 'text-emerald-400' : 'text-amber-400'} />
                <span>{isCorrect ? `વાહ! સાચો જવાબ (+₹${quiz.coinReward})` : 'સાચી હકીકત:'}</span>
              </div>
              <p>{quiz.factExplanationGujarati}</p>
            </div>
          )}
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold text-sm text-white transition flex items-center space-x-2"
          >
            <span>{isSubmitted ? 'આગળ વધો' : 'બંધ કરો'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
