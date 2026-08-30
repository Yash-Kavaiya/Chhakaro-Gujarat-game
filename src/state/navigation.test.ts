import { describe, it, expect } from 'vitest';
import { distanceMeters, bearingDeg, relativeHeadingDeg, navState } from './navigation';

describe('navigation', () => {
  it('distance is planar euclidean', () => {
    expect(distanceMeters({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
  });

  it('bearing: due north (-z) is 0, east (+x) is 90', () => {
    expect(bearingDeg({ x: 0, z: 0 }, { x: 0, z: -10 })).toBe(0);
    expect(bearingDeg({ x: 0, z: 0 }, { x: 10, z: 0 })).toBe(90);
    expect(bearingDeg({ x: 0, z: 0 }, { x: 0, z: 10 })).toBe(180);
    expect(bearingDeg({ x: 0, z: 0 }, { x: -10, z: 0 })).toBe(270);
  });

  it('relative heading: facing the target is ~0, target behind is ~180', () => {
    // heading 0 rad => forward is -z. Target at -z => straight ahead.
    expect(Math.abs(relativeHeadingDeg({ x: 0, z: 0 }, 0, { x: 0, z: -10 }))).toBeLessThan(1);
    expect(Math.abs(relativeHeadingDeg({ x: 0, z: 0 }, 0, { x: 0, z: 10 }))).toBeCloseTo(180, 0);
  });

  it('relative heading sign: target to the right is +90, to the left is -90', () => {
    // Convention: positive = turn right (clockwise), negative = turn left.
    expect(relativeHeadingDeg({ x: 0, z: 0 }, 0, { x: 10, z: 0 })).toBeCloseTo(90, 0);
    expect(relativeHeadingDeg({ x: 0, z: 0 }, 0, { x: -10, z: 0 })).toBeCloseTo(-90, 0);
  });

  it('relative heading tracks the vehicle turning', () => {
    // Vehicle rotated so forward points +x (east): heading bearing = -rotDeg = 90 => rot = -PI/2.
    // A target due east is now straight ahead.
    expect(Math.abs(relativeHeadingDeg({ x: 0, z: 0 }, -Math.PI / 2, { x: 10, z: 0 }))).toBeLessThan(1);
  });

  it('navState.arrived flips inside the radius', () => {
    expect(navState({ x: 0, z: 0 }, 0, { x: 0, z: 5 }, 10).arrived).toBe(true);
    expect(navState({ x: 0, z: 0 }, 0, { x: 0, z: 50 }, 10).arrived).toBe(false);
  });
});
