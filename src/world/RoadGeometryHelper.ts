import { GUJARAT_LOCATIONS } from '../data/locations';
import { getResolvedHighwaySegments, ResolvedHighwaySegment } from '../data/highwayNetwork';

export class RoadGeometryHelper {
  private static segmentsCache: ResolvedHighwaySegment[] | null = null;

  public static getSegments(): ResolvedHighwaySegment[] {
    if (!this.segmentsCache) {
      this.segmentsCache = getResolvedHighwaySegments();
    }
    return this.segmentsCache;
  }

  /**
   * Distance from point P to line segment AB
   */
  public static distanceToSegment(
    px: number,
    pz: number,
    ax: number,
    az: number,
    bx: number,
    bz: number
  ): number {
    const dx = bx - ax;
    const dz = bz - az;
    const lenSq = dx * dx + dz * dz;

    if (lenSq === 0) {
      const ex = px - ax;
      const ez = pz - az;
      return Math.sqrt(ex * ex + ez * ez);
    }

    // Projection parameter clamped to [0, 1]
    let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = ax + t * dx;
    const projZ = az + t * dz;
    const rx = px - projX;
    const rz = pz - projZ;

    return Math.sqrt(rx * rx + rz * rz);
  }

  /**
   * Returns true if point (x, z) falls within the road surface or within clearanceMargin of any road or junction
   */
  public static isInsideRoadOrClearance(x: number, z: number, clearanceMargin: number = 10.0): boolean {
    // 1. Check all highway segments
    const segments = this.getSegments();
    for (const seg of segments) {
      const dist = this.distanceToSegment(x, z, seg.start.x, seg.start.z, seg.end.x, seg.end.z);
      const halfWidth = seg.width / 2;
      if (dist < halfWidth + clearanceMargin) {
        return true;
      }
    }

    // 2. Check all city junction roundabouts / hubs (radius ~26m)
    for (const loc of GUJARAT_LOCATIONS) {
      const jx = loc.worldPosition.x;
      const jz = loc.worldPosition.z;
      const dx = x - jx;
      const dz = z - jz;
      const distToHub = Math.sqrt(dx * dx + dz * dz);
      // Junction plaza radius is 26m + safe clearance
      if (distToHub < 28.0 + clearanceMargin) {
        return true;
      }
    }

    return false;
  }

  /**
   * Find distance to the nearest road center line across the whole map
   */
  public static getDistanceToNearestRoad(x: number, z: number): number {
    let minDist = Infinity;
    const segments = this.getSegments();

    for (const seg of segments) {
      const dist = this.distanceToSegment(x, z, seg.start.x, seg.start.z, seg.end.x, seg.end.z);
      if (dist < minDist) {
        minDist = dist;
      }
    }

    return minDist;
  }
}
