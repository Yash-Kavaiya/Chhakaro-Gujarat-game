import { describe, it, expect } from 'vitest';
import { initIncidentSchedule, stepIncidentSchedule } from './incidents';

const p = (over: Partial<Parameters<typeof stepIncidentSchedule>[0]>) => ({
  state: initIncidentSchedule(),
  distanceDriven: 1000, speedKmh: 30, zoneId: 'rajkot', weather: 'sunny', roll: 0.01,
  ...over,
});

describe('stepIncidentSchedule', () => {
  it('spawns when eligible, moving, and the roll passes', () => {
    const r = stepIncidentSchedule(p({}));
    expect(r.spawn).not.toBeNull();
    expect(r.state.active).not.toBeNull();
  });
  it('never spawns below the speed floor', () => {
    expect(stepIncidentSchedule(p({ speedKmh: 8 })).spawn).toBeNull();
  });
  it('never spawns a second incident while one is active', () => {
    const first = stepIncidentSchedule(p({}));
    const second = stepIncidentSchedule(p({ state: first.state, distanceDriven: 1050 }));
    expect(second.spawn).toBeNull();
  });
  it('despawns once the obstacle is behind the player', () => {
    const first = stepIncidentSchedule(p({}));
    const later = stepIncidentSchedule(p({ state: first.state, distanceDriven: 1000 + 200 }));
    expect(later.despawn).toBe(true);
    expect(later.state.active).toBeNull();
  });
  it('respects the min-gap after one ends', () => {
    const first = stepIncidentSchedule(p({}));
    const ended = stepIncidentSchedule(p({ state: first.state, distanceDriven: 1200 }));
    const tooSoon = stepIncidentSchedule(p({ state: ended.state, distanceDriven: 1400, roll: 0.01 }));
    expect(tooSoon.spawn).toBeNull();
  });
  it('rain_puddle only in the rain', () => {
    // force many rolls; a dry run must never yield a puddle
    for (let i = 0; i < 40; i++) {
      const r = stepIncidentSchedule(p({ weather: 'sunny', roll: i / 40, state: initIncidentSchedule() }));
      expect(r.spawn?.kind).not.toBe('rain_puddle');
    }
  });
});
