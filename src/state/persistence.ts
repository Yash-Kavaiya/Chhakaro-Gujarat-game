import { GameProgress, PassportStampRecord } from '../types';

export const SAVE_KEY = 'chhakaro-gujarat-save-v1';
export const SCHEMA_VERSION = 4;

export const DEFAULT_PROGRESS: GameProgress = {
  coins: 1200,
  reputationStars: 5.0,
  visitedLocations: ['rajkot'],
  discoveredFoods: ['gathiya'],
  unlockedAchievements: ['ach_starter'],
  collectedSouvenirs: [],
  completedMissions: [],
  quizScore: { correct: 0, totalAnswered: 0 },
  customization: {
    bodyColor: 0xd9531e,
    stickerText: 'જય ગરવી ગુજરાત',
    hornType: 'classic_bulb',
    flagColor: 0xf97316,
    hasMirrorTassels: true,
    hasCanopy: true,
  },
  totalKm: 0,
  lastLocationId: 'rajkot',
  stampMeta: {},
  kakaMuted: false,
  transmissionMode: 'auto',
  expertMode: false,
};

interface StoredSave {
  version: number;
  progress: GameProgress;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isStampRecord(v: unknown): v is PassportStampRecord {
  return isPlainObject(v) && typeof v.visitedAt === 'string' && typeof v.kilometersDriven === 'number';
}

/** Keep only well-formed stamp records; drop any malformed entry. */
function sanitizeStampMeta(v: unknown): Record<string, PassportStampRecord> {
  if (!isPlainObject(v)) return {};
  const out: Record<string, PassportStampRecord> = {};
  for (const [id, rec] of Object.entries(v)) {
    if (isStampRecord(rec)) out[id] = { visitedAt: rec.visitedAt, kilometersDriven: rec.kilometersDriven };
  }
  return out;
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
    // crash the app or poison a field downstream (undefined subfields → NaN). quizScore /
    // customization are deep-merged onto defaults so a partial one keeps its sibling
    // subfields; stampMeta is sanitized entry-by-entry (malformed records dropped).
    const p = parsed.progress as Partial<GameProgress>;
    return {
      coins: typeof p.coins === 'number' && Number.isFinite(p.coins) ? p.coins : DEFAULT_PROGRESS.coins,
      reputationStars: typeof p.reputationStars === 'number' && Number.isFinite(p.reputationStars) ? p.reputationStars : DEFAULT_PROGRESS.reputationStars,
      visitedLocations: Array.isArray(p.visitedLocations) ? p.visitedLocations.filter((x): x is string => typeof x === 'string') : DEFAULT_PROGRESS.visitedLocations,
      discoveredFoods: Array.isArray(p.discoveredFoods) ? p.discoveredFoods.filter((x): x is string => typeof x === 'string') : DEFAULT_PROGRESS.discoveredFoods,
      unlockedAchievements: Array.isArray(p.unlockedAchievements) ? p.unlockedAchievements.filter((x): x is string => typeof x === 'string') : DEFAULT_PROGRESS.unlockedAchievements,
      collectedSouvenirs: Array.isArray(p.collectedSouvenirs) ? p.collectedSouvenirs.filter((x): x is string => typeof x === 'string') : DEFAULT_PROGRESS.collectedSouvenirs,
      completedMissions: Array.isArray(p.completedMissions) ? p.completedMissions.filter((x): x is string => typeof x === 'string') : DEFAULT_PROGRESS.completedMissions,
      quizScore: isPlainObject(p.quizScore)
        ? {
            correct: typeof p.quizScore.correct === 'number' ? p.quizScore.correct : 0,
            totalAnswered: typeof p.quizScore.totalAnswered === 'number' ? p.quizScore.totalAnswered : 0,
          }
        : DEFAULT_PROGRESS.quizScore,
      customization: isPlainObject(p.customization)
        ? { ...DEFAULT_PROGRESS.customization, ...p.customization }
        : DEFAULT_PROGRESS.customization,
      totalKm: typeof p.totalKm === 'number' && Number.isFinite(p.totalKm) ? p.totalKm : DEFAULT_PROGRESS.totalKm,
      lastLocationId: typeof p.lastLocationId === 'string' ? p.lastLocationId : DEFAULT_PROGRESS.lastLocationId,
      stampMeta: sanitizeStampMeta(p.stampMeta),
      kakaMuted: typeof p.kakaMuted === 'boolean' ? p.kakaMuted : DEFAULT_PROGRESS.kakaMuted,
      transmissionMode: p.transmissionMode === 'manual' ? 'manual' : DEFAULT_PROGRESS.transmissionMode,
      expertMode: typeof p.expertMode === 'boolean' ? p.expertMode : DEFAULT_PROGRESS.expertMode,
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
