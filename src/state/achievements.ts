export interface AchievementInput {
  visitedLocations: string[];
  discoveredFoods: string[];
}

const SAURASHTRA = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh', 'palitana'];
const UNESCO = ['patan_modhera', 'pavagadh', 'dholavira', 'ahmedabad'];
const PILGRIM = ['dwarka', 'somnath', 'palitana', 'pavagadh'];

/** Returns the full set of achievement ids that should be unlocked for this progress. Pure. */
export function evaluateAchievements(input: AchievementInput): string[] {
  const v = Array.isArray(input?.visitedLocations) ? input.visitedLocations : [];
  const f = Array.isArray(input?.discoveredFoods) ? input.discoveredFoods : [];
  const has = (id: string) => v.includes(id);
  const all = (ids: string[]) => ids.every(has);
  const out: string[] = ['ach_starter'];

  if (all(SAURASHTRA)) out.push('ach_saurashtra');
  if (has('kutch')) out.push('ach_rann');
  if (has('dholavira')) out.push('ach_road_to_heaven');
  if (all(UNESCO)) out.push('ach_unesco_master');
  if (has('gir')) out.push('ach_gir_lion');
  if (has('ahmedabad_airport')) out.push('ach_svpia_airport');
  if (all(PILGRIM)) out.push('ach_pilgrim');
  if (f.length >= 6) out.push('ach_foodie');
  if (v.length >= 16) out.push('ach_all_gujarat');

  return out;
}
