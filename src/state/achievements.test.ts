import { describe, it, expect } from 'vitest';
import { evaluateAchievements } from './achievements';

describe('evaluateAchievements', () => {
  it('always includes the starter achievement', () => {
    expect(evaluateAchievements({ visitedLocations: [], discoveredFoods: [], totalKm: 0 }))
      .toContain('ach_starter');
  });

  it('unlocks Saurashtra Safari when all six Saurashtra hubs are visited', () => {
    const visited = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh', 'palitana'];
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [], totalKm: 0 }))
      .toContain('ach_saurashtra');
  });

  it('does not unlock Saurashtra Safari when one hub is missing', () => {
    const visited = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh'];
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [], totalKm: 0 }))
      .not.toContain('ach_saurashtra');
  });

  it('unlocks the foodie achievement at six discovered foods', () => {
    expect(evaluateAchievements({ visitedLocations: [], discoveredFoods: ['a', 'b', 'c', 'd', 'e', 'f'], totalKm: 0 }))
      .toContain('ach_foodie');
  });

  it('unlocks the grand explorer at 16 visited locations', () => {
    const visited = Array.from({ length: 16 }, (_, i) => `loc_${i}`);
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [], totalKm: 0 }))
      .toContain('ach_all_gujarat');
  });
});
