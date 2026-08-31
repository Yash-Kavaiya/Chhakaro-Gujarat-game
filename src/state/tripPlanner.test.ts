import { describe, it, expect } from 'vitest';
import { classifyTripRequest, buildLocalTrip } from './tripPlanner';
import { GUJARAT_LOCATIONS } from '../data/locations';

const REAL_IDS = new Set(GUJARAT_LOCATIONS.map((l) => l.id));

describe('classifyTripRequest', () => {
  const cases: Array<[string, string]> = [
    ['ધાર્મિક', 'dharmik'],
    ['મારે ૩૦ મિનિટનો ધાર્મિક પ્રવાસ જોઈએ', 'dharmik'],
    ['જ્યોતિર્લિંગ અને મંદિર દર્શન', 'dharmik'],
    ['હેરિટેજ અને ઇતિહાસ જોવો છે', 'heritage'],
    ['યુનેસ્કો પ્રાચીન સ્થળો', 'heritage'],
    ['દરિયાકિનારો અને બીચ', 'coast'],
    ['કુદરત અને જંગલમાં સાવજ જોવા છે', 'nature'],
    ['ખાણીપીણીની સફર, સ્વાદનો ખજાનો', 'food'],
    ['take me on a heritage tour', 'heritage'],
    ['કંઈક મજેદાર બતાવો', 'mixed'],
  ];

  it.each(cases)('%s → %s', (phrase, theme) => {
    expect(classifyTripRequest(phrase)).toBe(theme);
  });
});

describe('buildLocalTrip', () => {
  const requests = ['ધાર્મિક પ્રવાસ', 'હેરિટેજ', 'દરિયો', 'કુદરત', 'ખાણીપીણી', 'કંઈક બતાવો'];

  it.each(requests)('"%s" → 3–6 real ordered stops with Gujarati reasons', (req) => {
    const plan = buildLocalTrip(req, 'rajkot');
    expect(plan.introGujarati.trim().length).toBeGreaterThan(0);
    expect(plan.stops.length).toBeGreaterThanOrEqual(3);
    expect(plan.stops.length).toBeLessThanOrEqual(6);
    for (const stop of plan.stops) {
      expect(REAL_IDS.has(stop.locationId)).toBe(true);
      expect(stop.reasonGujarati.trim().length).toBeGreaterThan(0);
    }
    // no duplicates
    expect(new Set(plan.stops.map((s) => s.locationId)).size).toBe(plan.stops.length);
  });

  it('never starts at the location you are already in', () => {
    const plan = buildLocalTrip('ધાર્મિક', 'dwarka');
    expect(plan.stops.map((s) => s.locationId)).not.toContain('dwarka');
  });

  it('a dharmik trip leads with the temple towns', () => {
    const ids = buildLocalTrip('ધાર્મિક દર્શન', 'rajkot').stops.map((s) => s.locationId);
    expect(ids[0]).toBe('dwarka');
    expect(ids).toContain('somnath');
  });
});
