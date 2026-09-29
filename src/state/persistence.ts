import { GameProgress, VehicleType } from '../types';

export const SAVE_KEY = 'chhakaro-gujarat-save-v1';
export const SCHEMA_VERSION = 5;

const VEHICLE_TYPES: VehicleType[] = ['chhakaro', 'car', 'bike'];

export const DEFAULT_PROGRESS: GameProgress = {
  coins: 1200,
  reputationStars: 5.0,
  visitedLocations: ['gandhinagar'],
  completedMissions: [],
  customization: {
    bodyColor: 0xd9531e,
    stickerText: 'જય ગરવી ગુજરાત',
    hornType: 'classic_bulb',
    flagColor: 0xf97316,
    hasMirrorTassels: true,
    hasCanopy: true,
  },
  totalKm: 0,
  lastLocationId: 'gandhinagar',
  transmissionMode: 'auto',
  expertMode: false,
  vehicleType: 'chhakaro',
};

interface StoredSave {
  version: number;
  progress: GameProgress;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function loadProgress(): GameProgress {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { ...DEFAULT_PROGRESS };
    const parsed = JSON.parse(raw) as unknown;
    // loadProgress is a total field-by-field validator that back-fills every field from
    // DEFAULT_PROGRESS, so any save from v3 onward is forward-compatible and loses nothing
    // (transmissionMode / expertMode already have their own safe-default validation below).
    // Only a genuinely older (< 3), newer (> SCHEMA_VERSION), or absent version resets.
    if (
      !isPlainObject(parsed) ||
      typeof parsed.version !== 'number' ||
      parsed.version < 3 ||
      parsed.version > SCHEMA_VERSION ||
      !isPlainObject(parsed.progress)
    ) {
      return { ...DEFAULT_PROGRESS };
    }
    // Validate every field against its default. A partial or type-mangled save must never
    // crash the app or poison a field downstream (undefined subfields → NaN). customization
    // is deep-merged onto defaults so a partial one keeps its sibling subfields. Fields from
    // removed features (passport stamps, foods, souvenirs, quiz, Kaka) are simply dropped.
    const p = parsed.progress as Partial<GameProgress>;
    return {
      coins: typeof p.coins === 'number' && Number.isFinite(p.coins) ? p.coins : DEFAULT_PROGRESS.coins,
      reputationStars: typeof p.reputationStars === 'number' && Number.isFinite(p.reputationStars) ? p.reputationStars : DEFAULT_PROGRESS.reputationStars,
      visitedLocations: Array.isArray(p.visitedLocations) ? p.visitedLocations.filter((x): x is string => typeof x === 'string') : DEFAULT_PROGRESS.visitedLocations,
      completedMissions: Array.isArray(p.completedMissions) ? p.completedMissions.filter((x): x is string => typeof x === 'string') : DEFAULT_PROGRESS.completedMissions,
      customization: isPlainObject(p.customization)
        ? { ...DEFAULT_PROGRESS.customization, ...p.customization }
        : DEFAULT_PROGRESS.customization,
      totalKm: typeof p.totalKm === 'number' && Number.isFinite(p.totalKm) ? p.totalKm : DEFAULT_PROGRESS.totalKm,
      lastLocationId: typeof p.lastLocationId === 'string' ? p.lastLocationId : DEFAULT_PROGRESS.lastLocationId,
      transmissionMode: p.transmissionMode === 'manual' ? 'manual' : DEFAULT_PROGRESS.transmissionMode,
      expertMode: typeof p.expertMode === 'boolean' ? p.expertMode : DEFAULT_PROGRESS.expertMode,
      vehicleType: VEHICLE_TYPES.includes(p.vehicleType as VehicleType)
        ? (p.vehicleType as VehicleType)
        : DEFAULT_PROGRESS.vehicleType,
    };
  } catch {
    return { ...DEFAULT_PROGRESS };
  }
}

let pending: GameProgress | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

function write(progress: GameProgress) {
  try {
    const payload: StoredSave = { version: SCHEMA_VERSION, progress };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / disabled storage — non-fatal */
  }
}

export function saveProgress(progress: GameProgress): void {
  pending = progress;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    if (pending) write(pending);
    pending = null;
    timer = null;
  }, 500);
}

export function flushProgress(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) {
    write(pending);
    pending = null;
  }
}

export function clearProgress(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  pending = null;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
