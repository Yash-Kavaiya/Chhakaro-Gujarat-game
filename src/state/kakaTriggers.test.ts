import { describe, it, expect } from 'vitest';
import { evaluateKakaTriggers } from './kakaTriggers';
import { KakaContext } from './kakaContext';

const RAJKOT = { id: 'rajkot', nameGujarati: 'રાજકોટ', region: 'saurashtra' };
const GIR = { id: 'gir', nameGujarati: 'સાસણ ગીર', region: 'saurashtra' };
const DWARKA = { id: 'dwarka', nameGujarati: 'દ્વારકા', region: 'saurashtra' };
const PATAN = { id: 'patan_modhera', nameGujarati: 'પાટણ', region: 'north_gujarat' };

function ctx(over: Partial<KakaContext> = {}): KakaContext {
  return {
    zone: RAJKOT,
    nearbyLandmarkId: null,
    nearbyLandmarkUnvisited: false,
    visitedCount: 1,
    totalLocations: 16,
    mission: null,
    nav: null,
    speedKmh: 20,
    inGirZone: false,
    fuelPercent: 80,
    weather: 'sunny',
    timeOfDayPhase: 'day',
    recentEvents: [],
    ...over,
  };
}

/** Rough sentence count — the copy guideline is "at most 2 sentences". */
function sentences(text: string): number {
  return text.split(/[!?.]/).map((s) => s.trim()).filter(Boolean).length;
}

describe('evaluateKakaTriggers', () => {
  it('nothing changed → no fire', () => {
    expect(evaluateKakaTriggers(ctx(), ctx())).toBeNull();
  });

  describe('zone:<id>', () => {
    it('fires when a new zone is entered, id encodes the zone', () => {
      const fire = evaluateKakaTriggers(ctx(), ctx({ zone: PATAN }));
      expect(fire?.id).toBe('zone:patan_modhera');
      expect(fire?.priority).toBe('normal');
      expect(fire!.textGujarati).toContain('પાટણ');
      expect(sentences(fire!.textGujarati)).toBeLessThanOrEqual(2);
    });

    it('fires from a null previous context (first snapshot)', () => {
      expect(evaluateKakaTriggers(null, ctx({ zone: DWARKA }))?.id).toBe('zone:dwarka');
    });

    it('does not fire again while parked in the same zone', () => {
      expect(evaluateKakaTriggers(ctx({ zone: DWARKA }), ctx({ zone: DWARKA }))).toBeNull();
    });
  });

  describe('gir-overspeed', () => {
    it('fires on the rising edge of speeding inside the Gir zone', () => {
      const prev = ctx({ zone: GIR, inGirZone: true, speedKmh: 22 });
      const next = ctx({ zone: GIR, inGirZone: true, speedKmh: 33 });
      const fire = evaluateKakaTriggers(prev, next);
      expect(fire?.id).toBe('gir-overspeed');
      expect(fire?.priority).toBe('normal');
      expect(sentences(fire!.textGujarati)).toBeLessThanOrEqual(2);
    });

    it('does not re-fire while still speeding', () => {
      const speeding = ctx({ zone: GIR, inGirZone: true, speedKmh: 33 });
      const faster = ctx({ zone: GIR, inGirZone: true, speedKmh: 40 });
      expect(evaluateKakaTriggers(speeding, faster)).toBeNull();
    });

    it('does not fire at the cap speed', () => {
      const prev = ctx({ zone: GIR, inGirZone: true, speedKmh: 10 });
      const next = ctx({ zone: GIR, inGirZone: true, speedKmh: 25 });
      expect(evaluateKakaTriggers(prev, next)).toBeNull();
    });
  });

  describe('low-fuel', () => {
    it('fires once when fuel first drops below 15%', () => {
      const fire = evaluateKakaTriggers(ctx({ fuelPercent: 40 }), ctx({ fuelPercent: 11 }));
      expect(fire?.id).toBe('low-fuel');
      expect(sentences(fire!.textGujarati)).toBeLessThanOrEqual(2);
    });

    it('does not re-fire once already low', () => {
      expect(evaluateKakaTriggers(ctx({ fuelPercent: 11 }), ctx({ fuelPercent: 7 }))).toBeNull();
    });
  });

  describe('sunset-coast', () => {
    it('fires when a coastal temple zone turns to sunset', () => {
      const prev = ctx({ zone: DWARKA, timeOfDayPhase: 'day' });
      const next = ctx({ zone: DWARKA, timeOfDayPhase: 'sunset' });
      const fire = evaluateKakaTriggers(prev, next);
      expect(fire?.id).toBe('sunset-coast:dwarka');
      expect(fire?.priority).toBe('low');
    });

    it('does not fire for an inland zone at sunset', () => {
      const prev = ctx({ zone: PATAN, timeOfDayPhase: 'day' });
      const next = ctx({ zone: PATAN, timeOfDayPhase: 'sunset' });
      expect(evaluateKakaTriggers(prev, next)?.id).not.toBe('sunset-coast:patan_modhera');
    });
  });

  describe('unvisited-near:<id>', () => {
    it('fires when newly close to an unvisited landmark', () => {
      const prev = ctx({ nearbyLandmarkId: null });
      const next = ctx({ nearbyLandmarkId: 'somnath', nearbyLandmarkUnvisited: true });
      const fire = evaluateKakaTriggers(prev, next);
      expect(fire?.id).toBe('unvisited-near:somnath');
      expect(fire?.priority).toBe('low');
    });

    it('does not fire when the nearby landmark is already visited / being navigated to', () => {
      const prev = ctx({ nearbyLandmarkId: null });
      const next = ctx({ nearbyLandmarkId: 'somnath', nearbyLandmarkUnvisited: false });
      expect(evaluateKakaTriggers(prev, next)).toBeNull();
    });
  });

  it('safety beats arrival: speeding into the Gir zone warns before it welcomes', () => {
    const prev = ctx({ zone: RAJKOT, inGirZone: false, speedKmh: 20 });
    const next = ctx({ zone: GIR, inGirZone: true, speedKmh: 34 });
    expect(evaluateKakaTriggers(prev, next)?.id).toBe('gir-overspeed');
  });
});
