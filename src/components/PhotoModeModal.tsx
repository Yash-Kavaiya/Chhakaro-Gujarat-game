import React, { useState, useRef } from 'react';
import { X, Camera, Download, Sparkles, Filter, Check } from 'lucide-react';
import { LocationData, PhotoFilterPreset } from '../types';
import { soundManager } from '../audio/SoundManager';

interface PhotoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: LocationData;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

const PHOTO_FILTERS: { id: PhotoFilterPreset; name: string; cssFilter: string }[] = [
  { id: 'normal', name: 'અસલ (Natural)', cssFilter: 'none' },
  { id: 'kathiyawad_warm', name: 'કાઠિયાવાડી ગોલ્ડન (Warm)', cssFilter: 'sepia(0.3) saturate(1.4) brightness(1.05)' },
  { id: 'rann_sunset', name: 'રણ સનસેટ (Sunset Glow)', cssFilter: 'contrast(1.1) brightness(0.95) hue-rotate(-15deg) saturate(1.5)' },
  { id: 'vintage_postcard', name: 'વિન્ટેજ પોસ્ટકાર્ડ (Vintage)', cssFilter: 'sepia(0.55) contrast(0.95) brightness(1.02)' },
  { id: 'navratri_vibrant', name: 'નવરાત્રિ કલર્સ (Vibrant)', cssFilter: 'saturate(1.8) contrast(1.15)' },
  { id: 'monochrome_heritage', name: 'હેરિટેજ મોનોક્રોમ (B&W)', cssFilter: 'grayscale(1) contrast(1.2)' },
];

export const PhotoModeModal: React.FC<PhotoModeModalProps> = ({
  isOpen,
  onClose,
  currentLocation,
  canvasRef,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<PhotoFilterPreset>('kathiyawad_warm');
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [includeStamp, setIncludeStamp] = useState(true);

  if (!isOpen) return null;

  const currentCssFilter = PHOTO_FILTERS.find((f) => f.id === selectedFilter)?.cssFilter || 'none';

  const takeSnapshot = () => {
    soundManager.playChime();
    if (canvasRef.current) {
      try {
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
        setSnapshotUrl(dataUrl);
      } catch (e) {
        console.error('Snapshot capture error:', e);
      }
    }
  };

  const downloadPhoto = () => {
    if (!snapshotUrl) return;

    // Create a temporary canvas to composite filter & Gujarati stamp
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = snapshotUrl;
    img.onload = () => {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = img.width;
      exportCanvas.height = img.height;
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      // Apply CSS filter
      ctx.filter = currentCssFilter;
      ctx.drawImage(img, 0, 0);

      // Reset filter for stamp overlay
      ctx.filter = 'none';

      if (includeStamp) {
        // Stamp border badge at bottom right
        const stampW = Math.max(340, img.width * 0.28);
        const stampH = 75;
        const stampX = img.width - stampW - 30;
        const stampY = img.height - stampH - 30;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(stampX, stampY, stampW, stampH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 22px system-ui, sans-serif';
        ctx.fillText(`📍 ${currentLocation.nameGujarati}`, stampX + 16, stampY + 32);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px system-ui, sans-serif';
        ctx.fillText('છકડામાં ગુજરાત 🛺 સૌરાષ્ટ્ર સફારી', stampX + 16, stampY + 56);
      }

      const finalUrl = exportCanvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `Chhakada-Gujarat-${currentLocation.id}-${Date.now()}.jpg`;
      link.href = finalUrl;
      link.click();
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border-2 border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shadow-inner">
              📸
            </div>
            <div>
              <h3 className="text-lg font-black text-amber-300">
                ગુજરાતી ફોટો મોડ અને પોસ્ટકાર્ડ (Photo Mode)
              </h3>
              <p className="text-xs text-amber-200/70">સૌરાષ્ટ્ર સફારીની યાદગાર ક્ષણો કેમેરામાં કેપ્ચર કરો</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewfinder Preview */}
        <div className="p-6 space-y-4">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 flex items-center justify-center shadow-2xl">
            {snapshotUrl ? (
              <img
                src={snapshotUrl}
                alt="Chhakada Snapshot"
                className="w-full h-full object-cover transition-all duration-300"
                style={{ filter: currentCssFilter }}
              />
            ) : (
              <div className="text-center space-y-3">
                <Camera size={48} className="mx-auto text-amber-400/60 animate-pulse" />
                <p className="text-sm font-bold text-slate-300">
                  નીચેના બટન પર ક્લિક કરીને ફોટો કેપ્ચર કરો
                </p>
                <button
                  onClick={takeSnapshot}
                  className="py-2.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl transition"
                >
                  📸 ફોટો ક્લિક કરો (Capture)
                </button>
              </div>
            )}

            {/* In-Preview Postcard Stamp */}
            {snapshotUrl && includeStamp && (
              <div className="absolute bottom-4 right-4 bg-slate-950/90 border-2 border-amber-400/80 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-sm">
                <div className="text-sm font-black text-amber-300">📍 {currentLocation.nameGujarati}</div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  છકડામાં ગુજરાત 🛺 સૌરાષ્ટ્ર સફારી
                </div>
              </div>
            )}
          </div>

          {/* Filter Presets Selection */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 flex items-center space-x-1.5">
              <Filter size={14} className="text-amber-400" />
              <span>ગુજરાતી કલર ફિલ્ટર્સ (Filters):</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PHOTO_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-left transition flex items-center justify-between ${
                    selectedFilter === filter.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{filter.name}</span>
                  {selectedFilter === filter.id && <Check size={14} className="text-amber-400" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeStamp}
                onChange={(e) => setIncludeStamp(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400"
              />
              <span>📍 ગુજરાતી લોકેશન સ્ટેમ્પ ઉમેરો</span>
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between px-6">
          <button
            onClick={takeSnapshot}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs text-slate-200 transition flex items-center space-x-2"
          >
            <Camera size={16} />
            <span>નવો ફોટો લો (Retake)</span>
          </button>

          <button
            disabled={!snapshotUrl}
            onClick={downloadPhoto}
            className={`py-2.5 px-6 rounded-xl font-black text-xs transition flex items-center space-x-2 ${
              snapshotUrl
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-xl shadow-amber-500/20'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
            }`}
          >
            <Download size={16} />
            <span>પોસ્ટકાર્ડ ડાઉનલોડ કરો (Save)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
