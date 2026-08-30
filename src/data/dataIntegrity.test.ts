import { describe, it, expect } from 'vitest';
import { GUJARAT_LOCATIONS } from './locations';
import { GUJARATI_PASSENGERS, GUJARAT_MISSIONS } from './missions';
import { GUJARATI_QUIZZES } from './quizzes';
import { GUJARATI_SOUVENIRS } from './souvenirs';

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

  it('quizzes reference real locations', () => {
    for (const q of GUJARATI_QUIZZES) {
      expect(LOCATION_IDS, `quiz ${q.id}`).toContain(q.locationId);
    }
  });

  it('souvenirs reference real locations', () => {
    for (const s of GUJARATI_SOUVENIRS) {
      expect(LOCATION_IDS, `souvenir ${s.id}`).toContain(s.locationId);
    }
  });
});
