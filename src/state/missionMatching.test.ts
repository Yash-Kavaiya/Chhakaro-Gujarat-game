import { describe, it, expect } from 'vitest';
import { isMissionComplete } from './missionMatching';
import { GUJARAT_MISSIONS } from '../data/missions';

describe('isMissionComplete', () => {
  it('is false when there is no active mission', () => {
    expect(isMissionComplete(null, 'dwarka')).toBe(false);
  });
  it('is true only at the mission drop location', () => {
    const m = GUJARAT_MISSIONS[0]; // rajkot -> dwarka
    expect(isMissionComplete(m, m.dropLocationId)).toBe(true);
    expect(isMissionComplete(m, m.pickupLocationId)).toBe(false);
  });
});
