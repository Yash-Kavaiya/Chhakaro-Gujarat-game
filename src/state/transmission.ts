import type { TransmissionMode } from '../types';

export type Gear = 'R' | 'N' | '1' | '2' | '3' | '4';

/** Forward gears in order; N and R handled separately. */
export const FORWARD_GEARS: Gear[] = ['1', '2', '3', '4'];

/** Speed band (km/h) each forward gear is happy in. Upper bound doubles as that gear's cap. */
export const GEAR_BANDS: Record<'1' | '2' | '3' | '4', { min: number; max: number }> = {
  '1': { min: 0, max: 18 },
  '2': { min: 12, max: 34 },
  '3': { min: 26, max: 52 },
  '4': { min: 44, max: 70 },
};

/** The full shift ladder, low to high. */
const LADDER: Gear[] = ['R', 'N', '1', '2', '3', '4'];

/** Torque multiplier applied to base acceleration for the engaged gear. */
const ACCEL_BASE: Record<Gear, number> = {
  R: 1.2,
  N: 0,
  '1': 1.6,
  '2': 1.15,
  '3': 0.85,
  '4': 0.6,
};

/** A far-too-high gear at low speed makes a manual box bog down to this multiplier. */
const BOG_MULTIPLIER = 0.28;

/** Automatic: pick the gear whose band contains the speed (hysteresis via currentGear). */
export function autoGear(speedKmh: number, currentGear: Gear): Gear {
  if (speedKmh < 0) return 'R';
  // An automatic is always "in drive" once stopped or rolling forward.
  if (currentGear === 'N' || currentGear === 'R') return '1';

  const idx = FORWARD_GEARS.indexOf(currentGear);
  const band = GEAR_BANDS[currentGear];
  // One-step hysteresis: a speed exactly on a band edge keeps the current gear.
  if (speedKmh > band.max && idx < FORWARD_GEARS.length - 1) return FORWARD_GEARS[idx + 1];
  if (speedKmh < band.min && idx > 0) return FORWARD_GEARS[idx - 1];
  return currentGear;
}

/** Torque multiplier applied to base acceleration for the engaged gear.
 *  Lower gears pull harder; 'N'/'R' return their own values. Manual mismatch (too-high gear
 *  at low rpm) returns a "bogging" multiplier < 0.35 so the player feels the wrong gear. */
export function accelMultiplier(gear: Gear, speedKmh: number, mode: TransmissionMode): number {
  if (gear === 'N') return 0;
  if (mode === 'manual' && gear !== 'R') {
    if (speedKmh < GEAR_BANDS[gear].min - 6) return BOG_MULTIPLIER;
  }
  return ACCEL_BASE[gear];
}

/** That gear's contribution to the speed ceiling (min of this and the physics cap). */
export function gearMaxSpeed(gear: Gear): number {
  if (gear === 'N') return 0;
  if (gear === 'R') return 16;
  return GEAR_BANDS[gear].max;
}

/** Manual shift up, clamped to the R..4 ladder. No-op past the top. */
export function shiftUp(gear: Gear): Gear {
  const idx = LADDER.indexOf(gear);
  return idx < LADDER.length - 1 ? LADDER[idx + 1] : gear;
}

/** Manual shift down, clamped to the R..4 ladder. No-op past the bottom. */
export function shiftDown(gear: Gear): Gear {
  const idx = LADDER.indexOf(gear);
  return idx > 0 ? LADDER[idx - 1] : gear;
}

/** Engine may start only from a standstill in N or R (or always in auto). */
export function canStartEngine(mode: TransmissionMode, gear: Gear, speedKmh: number): boolean {
  const atRest = Math.abs(speedKmh) < 1;
  if (mode === 'auto') return atRest;
  return atRest && (gear === 'N' || gear === 'R');
}
