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
      progress: { coins: 50, quizScore: { correct: 2 }, customization: { bodyColor: 123 } },
    }));
    const p = loadProgress();
    expect(p.quizScore).toEqual({ correct: 2, totalAnswered: 0 });
    expect(p.customization.stickerText).toBe(DEFAULT_PROGRESS.customization.stickerText);
    expect(p.customization.bodyColor).toBe(123);
  });

  it('round-trips stampMeta', () => {
    const p = {
      ...DEFAULT_PROGRESS,
      visitedLocations: ['rajkot', 'dwarka'],
      stampMeta: {
        dwarka: { visitedAt: '2026-08-30T10:00:00.000Z', kilometersDriven: 42.5 },
      },
    };
    saveProgress(p);
    flushProgress();
    expect(loadProgress()).toEqual(p);
  });

  it('defaults stampMeta to an empty object', () => {
    expect(loadProgress().stampMeta).toEqual({});
  });

  it('is on schema version 3', () => {
    expect(SCHEMA_VERSION).toBe(3);
  });

  it('round-trips kakaMuted and defaults it to false', () => {
    expect(loadProgress().kakaMuted).toBe(false);
    const p = { ...DEFAULT_PROGRESS, kakaMuted: true };
    saveProgress(p);
    flushProgress();
    expect(loadProgress().kakaMuted).toBe(true);
  });

  it('ignores a non-boolean kakaMuted', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version: SCHEMA_VERSION,
      progress: { kakaMuted: 'yes' },
    }));
    expect(loadProgress().kakaMuted).toBe(false);
  });

  it('resets to defaults on schema version mismatch', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SCHEMA_VERSION + 1, progress: { coins: 5 } }));
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
