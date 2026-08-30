import { describe, it, expect } from 'vitest';
import { regionTally, passportProgress } from './exploration';
import { GUJARAT_LOCATIONS } from '../data/locations';

describe('passportProgress', () => {
  it('is 0/16 · 0% for no visits', () => {
    expect(passportProgress(GUJARAT_LOCATIONS, [])).toEqual({ visited: 0, total: 16, pct: 0 });
  });
  it('rounds pct', () => {
    const three = GUJARAT_LOCATIONS.slice(0, 3).map((l) => l.id);
    expect(passportProgress(GUJARAT_LOCATIONS, three)).toEqual({ visited: 3, total: 16, pct: 19 });
  });
  it('ignores ids not in the location list', () => {
    expect(passportProgress(GUJARAT_LOCATIONS, ['not_a_place']).visited).toBe(0);
  });
});

describe('regionTally', () => {
  it('covers every region and sums to the location count', () => {
    const t = regionTally(GUJARAT_LOCATIONS, ['rajkot']);
    expect(t.reduce((n, r) => n + r.total, 0)).toBe(GUJARAT_LOCATIONS.length);
    const saur = t.find((r) => r.region === 'saurashtra');
    expect(saur?.visited).toBe(1);
  });
});
