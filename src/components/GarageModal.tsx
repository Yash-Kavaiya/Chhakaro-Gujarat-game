import React, { useState } from 'react';
import { X, Wrench, Sparkles, Volume2, Palette, Shield } from 'lucide-react';
import { ChhakaroCustomization } from '../types';
import { soundManager } from '../audio/SoundManager';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  customization: ChhakaroCustomization;
  onUpdateCustomization: (custom: ChhakaroCustomization) => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  customization,
  onUpdateCustomization,
}) => {
  const [bodyColor, setBodyColor] = useState(customization.bodyColor);
  const [stickerText, setStickerText] = useState(customization.stickerText);
  const [hornType, setHornType] = useState(customization.hornType);
  const [flagColor, setFlagColor] = useState(customization.flagColor);

  if (!isOpen) return null;

  const colorOptions = [
    { name: 'કેસરિયો (Kesar Saffron)', color: 0xd9531e, hex: '#d9531e' },
    { name: 'કાઠિયાવાડી મરૂન (Maroon)', color: 0x991b1b, hex: '#991b1b' },
    { name: 'સાગર વાદળી (Ocean Blue)', color: 0x1d4ed8, hex: '#1d4ed8' },
    { name: 'ગીર લીલો (Forest Green)', color: 0x15803d, hex: '#15803d' },
    { name: 'પીળો રંગીલો (Saurashtra Yellow)', color: 0xeab308, hex: '#eab308' },
    { name: 'શ્વેત રણ (Rann White)', color: 0xf8fafc, hex: '#f8fafc' },
  ];

  const slogans = [
    'જય ગરવી ગુજરાત',
    'મોજમાં રહો બાપા!',
    'સાવજ ગીર (સિંહ)',
    'જય દ્વારકાધીશ',
    'જય સોમનાથ મહાદેવ',
    'રામ ભરોસે ચાલતી ગાડી',
    'બુરી નજર વાલે તેરા મોહ કાલા',
  ];

  const handleApply = () => {
    const updated: ChhakaroCustomization = {
      bodyColor,
      stickerText,
      hornType,
      flagColor,
      hasMirrorTassels: true,
      hasCanopy: true,
    };
    onUpdateCustomization(updated);
    soundManager.speakGujaratiTextFallback('વાહ ભાઈ વાહ! આપણો છકડો એકદમ ચમકતો તૈયાર થઈ ગયો!');
    onClose();
  };

  const handleTestHorn = (type: string) => {
    soundManager.startHorn(type);
    setTimeout(() => soundManager.stopHorn(), 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in font-sans select-none">
      <div className="bg-slate-900 border-2 border-amber-500/80 rounded-3xl w-full max-w-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <Wrench className="w-7 h-7 text-amber-200" />
            <div>
              <h2 className="text-xl font-bold font-serif">છકડો શણગાર ગેરેજ (Customization)</h2>
              <p className="text-xs text-amber-100">તમારા છકડાનો રંગ, હોર્ન અને સ્ટીકરો બદલો</p>
            </div>
          </div>
          <button
            id="garage-close-btn"
            onClick={onClose}
            className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gradient-to-b from-slate-900 to-slate-950">
          {/* 1. Body Paint Palette */}
          <div>
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Palette className="w-4 h-4" />
              <span>૧. છકડાનો બોડી કલર પસંદ કરો:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {colorOptions.map((opt) => (
                <button
                  key={opt.color}
                  onClick={() => setBodyColor(opt.color)}
                  className={`p-2.5 rounded-2xl border-2 flex items-center gap-2.5 text-xs font-bold transition-all ${
                    bodyColor === opt.color
                      ? 'border-amber-400 bg-slate-800 shadow-md ring-2 ring-amber-400/40'
                      : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-5 h-5 rounded-full border border-white/50 shadow shrink-0"
                    style={{ backgroundColor: opt.hex }}
                  />
                  <span className="truncate">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Rear Slogan Plate */}
          <div>
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Shield className="w-4 h-4" />
              <span>૨. પાછળની નંબરપ્લેટ / સ્ટીકર લખાણ:</span>
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {slogans.map((s) => (
                <button
                  key={s}
                  onClick={() => setStickerText(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    stickerText === s
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={stickerText}
              onChange={(e) => setStickerText(e.target.value)}
              placeholder="તમારું મનપસંદ લખાણ લખો..."
              className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-amber-300 focus:outline-none focus:border-amber-500 font-bold"
            />
          </div>

          {/* 3. Horn Sound Tone */}
          <div>
            <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <Volume2 className="w-4 h-4" />
              <span>૩. છકડાનું હોર્ન સિલેક્ટ કરો:</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'classic_bulb', name: 'ક્લાસિક રબર બલ્બ હોર્ન (પોં.. પોં..)' },
                { id: 'diesel_air', name: 'ધમાકેદાર ડીઝલ એર હોર્ન' },
                { id: 'musical_saurashtra', name: 'સૌરાષ્ટ્ર મ્યુઝિકલ હોર્ન' },
              ].map((h) => (
                <div
                  key={h.id}
                  className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-2 ${
                    hornType === h.id
                      ? 'border-amber-400 bg-amber-950/30'
                      : 'border-slate-800 bg-slate-950'
                  }`}
                >
                  <div
                    onClick={() => setHornType(h.id)}
                    className="cursor-pointer text-xs font-bold text-slate-200"
                  >
                    {h.name}
                  </div>
                  <button
                    onClick={() => handleTestHorn(h.id)}
                    className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-amber-300 text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-colors"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>વગાડી જુઓ (ટેસ્ટ)</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Apply Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800">
          <button
            id="apply-garage-customization-btn"
            onClick={handleApply}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-98"
          >
            <Sparkles className="w-4 h-4" />
            <span>છકડાનો નવો લુક લાગુ કરો!</span>
          </button>
        </div>
      </div>
    </div>
  );
};
