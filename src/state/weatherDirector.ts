import type { WeatherType } from '../types';

/**
 * WeatherDirector — a pure, deterministic picker for the driving weather.
 *
 * `pickWeather` turns {zone, time-of-day, distance} into a `WeatherType`; `weatherParams`
 * turns that `WeatherType` into the numbers `GameWorld` needs (grip, fog density, a lateral
 * wind push, rain particles). Nothing here touches Three.js, the DOM or `Math.random` — the
 * same input always yields the same output so the behaviour is testable and reproducible.
 */

export interface WeatherInput {
  zoneId: string;
  phase: string; // TimeOfDayState.phase — 'dawn' | 'sunrise' | 'day' | 'sunset' | 'dusk' | 'night'
  distanceDriven: number; // metres — bucketed so weather holds for a stretch, then may change
  manualOverride: WeatherType | null; // a HUD toggle wins outright for one cycle
}

export interface WeatherParams {
  gripMultiplier: number; // multiplies both acceleration & friction (1 = dry tarmac)
  fogDensity: number; // target THREE.FogExp2 density
  windPushX: number; // lateral m/s^2 nudge on the vehicle (Kutch dust storm)
  spray: boolean; // wheel-spray particles (rain only)
  rainOpacity: number; // 0..1 opacity for the existing rain Points
}

/** Distance is bucketed into ~600 m stretches; weather is stable across a bucket. */
const BUCKET_METERS = 600;

/** The three coastal temple/heritage zones that catch sea fog at first light. */
const COASTAL_ZONES = new Set(['dwarka', 'somnath', 'dandi']);

/** FNV-1a string hash → uint32. Cheap, well-spread, and stable across runs. */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — a tiny seeded PRNG. One instance per (zone, bucket) seed; we draw once. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic weather for a zone at a time of day. `distanceDriven` is bucketed into
 * ~600 m stretches and mixed with a hash of the zone id to seed a PRNG, so a given stretch
 * of a given zone always resolves the same way, then the next stretch may roll differently.
 * `manualOverride` short-circuits everything (the HUD button wins).
 */
export function pickWeather(input: WeatherInput): WeatherType {
  if (input.manualOverride) return input.manualOverride;

  const { zoneId, phase, distanceDriven } = input;
  const bucket = Math.floor(Math.max(0, distanceDriven) / BUCKET_METERS);
  // Spread the bucket across all 32 bits (a bare `^ bucket` only flips the low bits between
  // consecutive stretches) by mixing it with the golden-ratio odd constant before the XOR.
  const roll = mulberry32((hashString(zoneId) ^ Math.imul(bucket, 0x9e3779b1)) >>> 0)();

  const lowLight = phase === 'dawn' || phase === 'sunrise' || phase === 'dusk' || phase === 'night';

  // Saputara — the Western Ghats hill station, Gujarat's wettest place. Rain-soaked most of
  // the time, wetter still outside broad daylight; the odd non-rain stretch is hill fog.
  if (zoneId === 'saputara') {
    const rainChance = phase === 'day' ? 0.85 : 0.92;
    return roll < rainChance ? 'rain' : 'fog';
  }

  // Kutch — the Great Rann. Dust haze reads with the fog visuals (+ a sideways wind push
  // supplied by weatherParams); clear stretches are just bright desert sun.
  if (zoneId === 'kutch') {
    return roll < 0.9 ? 'fog' : 'sunny';
  }

  // The coast at first light — sea fog rolls over Dwarka / Somnath / Dandi at dawn & sunrise.
  if (COASTAL_ZONES.has(zoneId)) {
    if (phase === 'dawn' || phase === 'sunrise') {
      return roll < 0.72 ? 'fog' : 'sunny';
    }
    // A coastal night gets the occasional shower; otherwise the coast is mostly clear.
    if (phase === 'night') return roll < 0.28 ? 'rain' : 'sunny';
    return roll < 0.12 ? 'fog' : 'sunny';
  }

  // Everywhere inland — mostly the clear Gujarat sun, with a rare haze and a rarer shower.
  // Low-light hours (dawn/dusk/night) tip a little more toward fog.
  const sunnyChance = lowLight ? 0.84 : 0.9;
  if (roll < sunnyChance) return 'sunny';
  if (roll < sunnyChance + 0.08) return 'fog';
  return 'rain';
}

/**
 * The driving / visibility parameters for a weather. `weatherParams` is pure and
 * zone-agnostic — the caller (GameWorld) decides whether to actually apply `windPushX`.
 *
 * Every number, and why it is that number:
 *
 *   sunny  — the dry baseline.
 *     gripMultiplier 1      full grip.
 *     fogDensity     0.0018 matches the scene's default FogExp2 density (GameWorld ctor).
 *     windPushX      0      no lateral push.
 *     spray          false  no wheel spray.
 *     rainOpacity    0      rain Points fully hidden.
 *
 *   rain   — Saputara downpour. Grip drops hard, spray kicks up, rain is visible.
 *     gripMultiplier 0.68   ~1/3 less accel & braking authority — slippery but still driveable
 *                           (the old hard-coded values were accel*0.75 / friction*0.65; 0.68
 *                           is the honest single-factor middle of those).
 *     fogDensity     0.005  a wet murk, ~2.8x the dry baseline (was TimeOfDaySystem's rain value).
 *     windPushX      0      rain does not shove the vehicle sideways.
 *     spray          true   enable wheel-spray particles.
 *     rainOpacity    0.6    rain Points clearly visible (was hard-coded 0.65).
 *
 *   fog    — coastal sea fog AND the Kutch dust storm (same visuals, reused).
 *     gripMultiplier 0.9    a slight grip loss — damp sea air / dust on the road.
 *     fogDensity     0.011  thick — ~6x the dry baseline (was TimeOfDaySystem's fog value 0.01,
 *                           nudged up so the WeatherDirector reads as denser than time-of-day fog).
 *     windPushX      2.2    m/s^2 of lateral drift — the Kutch dust storm shoving the little
 *                           three-wheeler; GameWorld gates the actual application to the Kutch zone.
 *     spray          false  no spray.
 *     rainOpacity    0      no rain Points.
 *
 *   sunset / night — kept as valid WeatherTypes, but their LOOK is driven by TimeOfDaySystem,
 *                    not here. Treated as sunny for driving physics (full grip, no wind/spray/rain).
 */
export function weatherParams(weather: WeatherType): WeatherParams {
  switch (weather) {
    case 'rain':
      return { gripMultiplier: 0.68, fogDensity: 0.005, windPushX: 0, spray: true, rainOpacity: 0.6 };
    case 'fog':
      return { gripMultiplier: 0.9, fogDensity: 0.011, windPushX: 2.2, spray: false, rainOpacity: 0 };
    case 'sunny':
    case 'sunset':
    case 'night':
    default:
      return { gripMultiplier: 1, fogDensity: 0.0018, windPushX: 0, spray: false, rainOpacity: 0 };
  }
}
