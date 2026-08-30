/**
 * Pure route math for the M1 turn-by-turn arrow. The world is open ground — no pathfinding —
 * so "navigation" is a straight line to the target zone centre.
 *
 * Sign conventions, verified against GameWorld:
 *  - World units are metres. The vehicle's forward vector is (-sin(rot), -cos(rot)), so
 *    heading `rot = 0` points along -z, which we call compass bearing 0 (north).
 *  - bearingDeg increases clockwise: +x (east) is 90, +z (south) is 180.
 *  - relativeHeadingDeg is positive when the target is to the vehicle's RIGHT (turn
 *    clockwise) and negative to its LEFT — feed it straight into an SVG rotate().
 */

export interface Vec2 {
  x: number;
  z: number;
}

/** Planar euclidean distance in metres. */
export function distanceMeters(a: Vec2, b: Vec2): number {
  return Math.hypot(b.x - a.x, b.z - a.z);
}

/** Compass-style bearing in degrees [0,360): 0 = -z (north), 90 = +x (east). */
export function bearingDeg(from: Vec2, to: Vec2): number {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

/** Normalise to (-180, 180]. */
function normalize180(deg: number): number {
  let d = ((deg % 360) + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/**
 * Signed heading-relative angle in degrees (-180,180]: how far to turn from `headingRad`
 * to face `to`. Positive = target is to the right, negative = to the left.
 */
export function relativeHeadingDeg(from: Vec2, headingRad: number, to: Vec2): number {
  // The forward vector (-sin,-cos) has compass bearing atan2(-sin, cos) = -headingRad.
  const headingBearing = ((-headingRad * 180) / Math.PI + 360) % 360;
  return normalize180(bearingDeg(from, to) - headingBearing);
}

export interface NavState {
  distanceM: number;
  relativeDeg: number; // for the arrow
  arrived: boolean; // distanceM <= arriveRadiusM
}

export function navState(from: Vec2, headingRad: number, to: Vec2, arriveRadiusM: number): NavState {
  const distanceM = distanceMeters(from, to);
  return {
    distanceM,
    relativeDeg: relativeHeadingDeg(from, headingRad, to),
    arrived: distanceM <= arriveRadiusM,
  };
}
