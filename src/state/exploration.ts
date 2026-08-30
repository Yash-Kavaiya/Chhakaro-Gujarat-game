import { LocationData } from '../types';

export interface RegionTally {
  region: string;
  regionNameGujarati: string;
  visited: number;
  total: number;
}

/** Per-region visited/total counts, in first-seen region order. Pure. */
export function regionTally(locations: LocationData[], visitedIds: string[]): RegionTally[] {
  const seen = new Set(visitedIds);
  const order: string[] = [];
  const byRegion = new Map<string, RegionTally>();
  for (const loc of locations) {
    let tally = byRegion.get(loc.region);
    if (!tally) {
      tally = { region: loc.region, regionNameGujarati: loc.regionNameGujarati, visited: 0, total: 0 };
      byRegion.set(loc.region, tally);
      order.push(loc.region);
    }
    tally.total += 1;
    if (seen.has(loc.id)) tally.visited += 1;
  }
  return order.map((r) => byRegion.get(r)!);
}

/** { visited, total, pct } for the whole map. Pure. */
export function passportProgress(
  locations: LocationData[],
  visitedIds: string[],
): { visited: number; total: number; pct: number } {
  const seen = new Set(visitedIds);
  const total = locations.length;
  const visited = locations.reduce((n, loc) => (seen.has(loc.id) ? n + 1 : n), 0);
  const pct = total > 0 ? Math.round((visited / total) * 100) : 0;
  return { visited, total, pct };
}
