import { describe, it, expect } from 'vitest';
import { pickWeather, weatherParams } from './weatherDirector';

const base = { phase: 'day', distanceDriven: 0, manualOverride: null } as const;

describe('pickWeather', () => {
  it('manual override always wins', () => {
    expect(pickWeather({ ...base, zoneId: 'rajkot', manualOverride: 'rain' })).toBe('rain');
  });
  it('Saputara is rain-biased', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'saputara', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'rain').length).toBeGreaterThan(6);
  });
  it('Kutch is dust/low-visibility biased (returned as fog)', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'kutch', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'fog').length).toBeGreaterThan(6);
  });
  it('coastal dawn is fog-biased', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'somnath', phase: 'dawn', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'fog').length).toBeGreaterThan(5);
  });
  it('a plain inland day is mostly sunny', () => {
    const samples = Array.from({ length: 12 }, (_, i) =>
      pickWeather({ ...base, zoneId: 'ahmedabad', distanceDriven: i * 600 }));
    expect(samples.filter((w) => w === 'sunny').length).toBeGreaterThan(7);
  });
  it('is deterministic for the same input', () => {
    const a = pickWeather({ ...base, zoneId: 'saputara', distanceDriven: 3000 });
    const b = pickWeather({ ...base, zoneId: 'saputara', distanceDriven: 3000 });
    expect(a).toBe(b);
  });
});

describe('weatherParams', () => {
  it('dry sunny is the 1.0 baseline', () => {
    const p = weatherParams('sunny');
    expect(p.gripMultiplier).toBe(1);
    expect(p.rainOpacity).toBe(0);
    expect(p.windPushX).toBe(0);
  });
  it('rain cuts grip and adds spray', () => {
    const p = weatherParams('rain');
    expect(p.gripMultiplier).toBeLessThan(0.8);
    expect(p.spray).toBe(true);
    expect(p.rainOpacity).toBeGreaterThan(0.4);
  });
  it('fog/dust cuts visibility and (dust) pushes sideways', () => {
    const p = weatherParams('fog');
    expect(p.fogDensity).toBeGreaterThan(weatherParams('sunny').fogDensity);
  });
});
