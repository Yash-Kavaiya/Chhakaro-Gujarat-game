import { describe, it, expect } from 'vitest';
import { evaluateAchievements } from './achievements';

describe('evaluateAchievements', () => {
  it('always includes the starter achievement', () => {
    expect(evaluateAchievements({ visitedLocations: [], discoveredFoods: [] }))
      .toContain('ach_starter');
  });

  it('unlocks Saurashtra Safari when all six Saurashtra hubs are visited', () => {
    const visited = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh', 'palitana'];
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [] }))
      .toContain('ach_saurashtra');
  });

  it('does not unlock Saurashtra Safari when one hub is missing', () => {
    const visited = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh'];
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [] }))
      .not.toContain('ach_saurashtra');
  });

  it('unlocks the foodie achievement at six discovered foods', () => {
    expect(evaluateAchievements({ visitedLocations: [], discoveredFoods: ['a', 'b', 'c', 'd', 'e', 'f'] }))
      .toContain('ach_foodie');
  });

  it('unlocks the airport achievement when Ahmedabad Airport is visited', () => {
    expect(evaluateAchievements({ visitedLocations: ['ahmedabad_airport'], discoveredFoods: [] }))
      .toContain('ach_svpia_airport');
  });

  it('unlocks the grand explorer at 16 visited locations', () => {
    const visited = Array.from({ length: 16 }, (_, i) => `loc_${i}`);
    expect(evaluateAchievements({ visitedLocations: visited, discoveredFoods: [] }))
      .toContain('ach_all_gujarat');
  });
});
