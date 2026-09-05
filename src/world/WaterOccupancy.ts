import { RoadGeometryHelper } from './RoadGeometryHelper';

/** Axis-aligned water rectangle in world XZ. */
export interface WaterRect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Tracks water bodies so scenery, city blocks, and trees never sit in a river
 * or sea, and so water never paints over a highway or junction plaza.
 */
export class WaterOccupancy {
  private static rects: WaterRect[] = [];

  static clear() {
    this.rects = [];
  }

  static registerRect(minX: number, maxX: number, minZ: number, maxZ: number) {
    this.rects.push({
      minX: Math.min(minX, maxX),
      maxX: Math.max(minX, maxX),
      minZ: Math.min(minZ, maxZ),
      maxZ: Math.max(minZ, maxZ),
    });
  }

  /** Register a plane centered at (cx, cz) with size (sx, sz). */
  static registerPlane(cx: number, cz: number, sx: number, sz: number) {
    this.registerRect(cx - sx / 2, cx + sx / 2, cz - sz / 2, cz + sz / 2);
  }

  static isInsideWater(x: number, z: number, margin = 2): boolean {
    for (const r of this.rects) {
      if (x >= r.minX - margin && x <= r.maxX + margin && z >= r.minZ - margin && z <= r.maxZ + margin) {
        return true;
      }
    }
    return false;
  }

  static getRects(): readonly WaterRect[] {
    return this.rects;
  }

  /** True if this cell is water, road, or a city junction plaza. */
  static isBlocked(x: number, z: number, margin = 4): boolean {
    if (this.isInsideWater(x, z, margin)) return true;
    return RoadGeometryHelper.isInsideRoadOrClearance(x, z, margin);
  }
}
