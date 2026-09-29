import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  SAVE_KEY, SCHEMA_VERSION, DEFAULT_PROGRESS,
  loadProgress, saveProgress, clearProgress, flushProgress,
} from './persistence';

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.useRealTimers();
  clearProgress();
});

describe('persistence', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS);
  });

  it('round-trips a saved progress object', () => {
    const p = { ...DEFAULT_PROGRESS, coins: 999, visitedLocations: ['rajkot', 'dwarka'] };
    saveProgress(p);
    flushProgress();
    expect(loadProgress()).toEqual(p);
  });

  it('deep-merges partial nested objects onto defaults', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: SCHEMA_VERSION,
      progress: { coins: 50, customization: { bodyColor: 123 } },
    }));
    const p = loadProgress();
    expect(p.customization.stickerText).toBe(DEFAULT_PROGRESS.customization.stickerText);
    expect(p.customization.bodyColor).toBe(123);
  });

  it('is on schema version 5', () => {
    expect(SCHEMA_VERSION).toBe(5);
  });

  it('round-trips vehicleType and rejects unknown vehicles', () => {
    expect(loadProgress().vehicleType).toBe('chhakaro');
    saveProgress({ ...DEFAULT_PROGRESS, vehicleType: 'bike' });
    flushProgress();
    expect(loadProgress().vehicleType).toBe('bike');
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SCHEMA_VERSION, progress: { vehicleType: 'jet' } }));
    expect(loadProgress().vehicleType).toBe('chhakaro');
  });

  it('drops fields from removed features (stamps, foods, quiz, Kaka)', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 4,
      progress: { coins: 9, stampMeta: { dwarka: {} }, discoveredFoods: ['x'], quizScore: {}, kakaMuted: true },
    }));
    const p = loadProgress() as unknown as Record<string, unknown>;
    expect(p.coins).toBe(9);
    for (const k of ['stampMeta', 'discoveredFoods', 'quizScore', 'kakaMuted']) expect(p[k]).toBeUndefined();
  });

  it('round-trips transmissionMode and expertMode with safe defaults', () => {
    expect(loadProgress().transmissionMode).toBe('auto');
    expect(loadProgress().expertMode).toBe(false);
    const p = { ...DEFAULT_PROGRESS, transmissionMode: 'manual' as const, expertMode: true };
    saveProgress(p); flushProgress();
    expect(loadProgress().transmissionMode).toBe('manual');
    expect(loadProgress().expertMode).toBe(true);
  });

  it('rejects a garbage transmissionMode', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SCHEMA_VERSION, progress: { transmissionMode: 'turbo' } }));
    expect(loadProgress().transmissionMode).toBe('auto');
  });

  it('resets to defaults on schema version mismatch', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SCHEMA_VERSION + 1, progress: { coins: 5 } }));
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS);
  });

  it('migrates a v3 save forward, back-filling newer fields', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 3,
      progress: { coins: 777, visitedLocations: ['rajkot', 'dwarka'] },
    }));
    const p = loadProgress();
    expect(p.coins).toBe(777);
    expect(p.visitedLocations).toEqual(['rajkot', 'dwarka']);
    expect(p.transmissionMode).toBe('auto');
    expect(p.expertMode).toBe(false);
  });

  it('still resets a pre-v3 (v2) save to defaults', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: 2,
      progress: { coins: 777, visitedLocations: ['rajkot', 'dwarka'] },
    }));
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS);
  });

  it('resets to defaults on corrupt JSON', () => {
    localStorage.setItem(SAVE_KEY, '{not json');
    expect(loadProgress()).toEqual(DEFAULT_PROGRESS);
  });

  it('clearProgress wipes the stored save', () => {
    saveProgress({ ...DEFAULT_PROGRESS, coins: 10 });
    flushProgress();
    clearProgress();
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('debounces writes but flush forces them', () => {
    vi.useFakeTimers();
    saveProgress({ ...DEFAULT_PROGRESS, coins: 1 });
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    flushProgress();
    expect(localStorage.getItem(SAVE_KEY)).not.toBeNull();
    vi.useRealTimers();
  });
});
