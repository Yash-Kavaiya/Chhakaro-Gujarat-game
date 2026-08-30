import { GameProgress } from '../types';

export const SAVE_KEY = 'chhakaro-gujarat-save-v1';
export const SCHEMA_VERSION = 1;

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
    if (!isPlainObject(parsed) || parsed.version !== SCHEMA_VERSION || !isPlainObject(parsed.progress)) {
      return { ...DEFAULT_PROGRESS };
    }
    // shallow-merge onto defaults so a missing key never crashes the app
    return { ...DEFAULT_PROGRESS, ...(parsed.progress as Partial<GameProgress>) } as GameProgress;
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
