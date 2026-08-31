import { describe, it, expect } from 'vitest';
import { regionTally, passportProgress, nearestUnvisited } from './exploration';
import { GUJARAT_LOCATIONS } from '../data/locations';

describe('passportProgress', () => {
  it('is 0/N · 0% for no visits', () => {
    expect(passportProgress(GUJARAT_LOCATIONS, [])).toEqual({
      visited: 0,
      total: GUJARAT_LOCATIONS.length,
      pct: 0,
    });
  });
  it('rounds pct', () => {
    const three = GUJARAT_LOCATIONS.slice(0, 3).map((l) => l.id);
    const expectedPct = Math.round((3 / GUJARAT_LOCATIONS.length) * 100);
    expect(passportProgress(GUJARAT_LOCATIONS, three)).toEqual({
      visited: 3,
      total: GUJARAT_LOCATIONS.length,
      pct: expectedPct,
    });
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

describe('nearestUnvisited', () => {
  it('returns the closest not-yet-visited location', () => {
    const from = GUJARAT_LOCATIONS[0].worldPosition;
    const visited = [GUJARAT_LOCATIONS[0].id];
    const n = nearestUnvisited(GUJARAT_LOCATIONS, visited, from);
    expect(n).not.toBeNull();
    expect(visited).not.toContain(n!.id);
  });
  it('is null when everything is visited', () => {
    expect(
      nearestUnvisited(GUJARAT_LOCATIONS, GUJARAT_LOCATIONS.map((l) => l.id), { x: 0, z: 0 }),
    ).toBeNull();
  });
});
