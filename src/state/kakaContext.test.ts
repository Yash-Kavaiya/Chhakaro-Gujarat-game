import { describe, it, expect } from 'vitest';
import { buildKakaContext, BuildKakaContextInput } from './kakaContext';

const base: BuildKakaContextInput = {
  zoneId: 'rajkot',
  zoneNameGujarati: 'રાજકોટ',
  zoneRegion: 'saurashtra',
  nearbyLandmarkId: null,
  visitedCount: 1,
  totalLocations: 16,
  mission: null,
  nav: null,
  speedKmh: 0,
  vehiclePos: { x: 0, z: 0 },
  fuelPercent: 88,
  weather: 'sunny',
  timeOfDayPhase: 'day',
  recentEvents: [],
};

describe('buildKakaContext', () => {
  it('projects a fresh start', () => {
    const ctx = buildKakaContext(base);
    expect(ctx.zone).toEqual({ id: 'rajkot', nameGujarati: 'રાજકોટ', region: 'saurashtra' });
    expect(ctx.inGirZone).toBe(false);
    expect(ctx.mission).toBeNull();
    expect(ctx.nav).toBeNull();
    expect(ctx.recentEvents).toEqual([]);
  });

  it('projects a mid-mission drive with an active nav route', () => {
    const ctx = buildKakaContext({
      ...base,
      zoneId: 'dwarka',
      zoneNameGujarati: 'દ્વારકા',
      visitedCount: 4,
      mission: { titleGujarati: 'યાત્રી સવારી', dropNameGujarati: 'સોમનાથ' },
      nav: { targetNameGujarati: 'સોમનાથ', distanceM: 3200 },
      speedKmh: 47.6,
      nearbyLandmarkId: 'dwarka',
    });
    expect(ctx.mission?.dropNameGujarati).toBe('સોમનાથ');
    expect(ctx.nav?.distanceM).toBe(3200);
    expect(ctx.speedKmh).toBe(48); // rounded
    expect(ctx.nearbyLandmarkId).toBe('dwarka');
  });

  it('flags the Gir zone from the vehicle position even mid-speed', () => {
    const ctx = buildKakaContext({
      ...base,
      zoneId: 'gir',
      zoneNameGujarati: 'સાસણ ગીર',
      vehiclePos: { x: 150, z: 560 },
      speedKmh: 34,
      recentEvents: [{ kind: 'overspeed', zone: 'gir' }],
    });
    expect(ctx.inGirZone).toBe(true);
    expect(ctx.recentEvents[0]).toEqual({ kind: 'overspeed', zone: 'gir' });
  });

  it('truncates recentEvents to 5, newest first', () => {
    const many: BuildKakaContextInput['recentEvents'] = [
      { kind: 'stamp', nameGujarati: 'a' },
      { kind: 'food', nameGujarati: 'b' },
      { kind: 'souvenir', nameGujarati: 'c' },
      { kind: 'quiz', correct: true },
      { kind: 'refuel' },
      { kind: 'repair' },
    ];
    expect(buildKakaContext({ ...base, recentEvents: many }).recentEvents).toHaveLength(5);
  });
});
