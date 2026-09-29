import { describe, it, expect } from 'vitest';
import { GUJARAT_LOCATIONS } from './locations';
import { GUJARATI_PASSENGERS, GUJARAT_MISSIONS } from './missions';

const LOCATION_IDS = new Set(GUJARAT_LOCATIONS.map((l) => l.id));

describe('data integrity: every referenced location id exists', () => {
  it('passengers reference real pickup/drop locations', () => {
    for (const p of GUJARATI_PASSENGERS) {
      expect(LOCATION_IDS, `passenger ${p.id} pickup`).toContain(p.pickupLocationId);
      expect(LOCATION_IDS, `passenger ${p.id} drop`).toContain(p.dropLocationId);
    }
  });

  it('missions reference real pickup/drop locations', () => {
    for (const m of GUJARAT_MISSIONS) {
      expect(LOCATION_IDS, `mission ${m.id} pickup`).toContain(m.pickupLocationId);
      expect(LOCATION_IDS, `mission ${m.id} drop`).toContain(m.dropLocationId);
    }
  });
});
