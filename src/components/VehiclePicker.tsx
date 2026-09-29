import React from 'react';
import { VehicleType } from '../types';

export const VEHICLE_OPTIONS: { id: VehicleType; icon: string; name: string; detail: string }[] = [
  { id: 'chhakaro', icon: '🛺', name: 'છકડો', detail: 'કાઠિયાવાડી દેશી સવારી · ૬૮ km/h' },
  { id: 'car', icon: '🚗', name: 'કાર', detail: 'આરામદાયક હેચબેક · ૧૧૨ km/h' },
  { id: 'bike', icon: '🏍️', name: 'બાઇક', detail: 'ઝડપી મોટરસાઇકલ · ૯૬ km/h' },
];

interface VehiclePickerProps {
  value: VehicleType;
  onChange: (v: VehicleType) => void;
}

/** Three-way chhakaro / car / bike selector, shared by the start screen and the garage. */
export const VehiclePicker: React.FC<VehiclePickerProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="વાહન પસંદ કરો">
    {VEHICLE_OPTIONS.map((v) => {
      const selected = v.id === value;
      return (
        <button
          key={v.id}
          id={`vehicle-${v.id}`}
          type="button"
          role="radio"
          aria-checked={selected}
          onClick={() => onChange(v.id)}
          className={`p-3 rounded-2xl border-2 text-center transition-all ${
            selected
              ? 'border-amber-400 bg-amber-950/40 shadow-lg ring-2 ring-amber-400/40'
              : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800'
          }`}
        >
          <div className="text-3xl mb-1">{v.icon}</div>
          <div className="font-bold text-sm text-amber-300">{v.name}</div>
          <div className="text-[10px] text-slate-400 leading-tight">{v.detail}</div>
        </button>
      );
    })}
  </div>
);
