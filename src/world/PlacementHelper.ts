import { GUJARAT_LOCATIONS } from '../data/locations';
import { getResolvedHighwaySegments, ResolvedHighwaySegment } from '../data/highwayNetwork';
import { RoadGeometryHelper } from './RoadGeometryHelper';
import { WaterOccupancy } from './WaterOccupancy';

export interface PlacedSpot {
  x: number;
  z: number;
  /** World yaw of the corridor at the anchor point (props can face the road). */
  angle: number;
}

interface PlacedBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const JUNCTION_RADIUS = 28;

/**
 * Deterministic, road/water-aware placement for world props.
 *
 * Everything decorative (farms, factories, malls, stalls, petrol pumps…) is anchored to a
 * real highway corridor at a parameter t, offset to one side, then nudged to the nearest
 * clear spot. That guarantees props hug roads for context but never paint over asphalt,
 * junction plazas, water bodies, or each other.
 */
export class PlacementHelper {
  private static segmentsCache: Map<string, ResolvedHighwaySegment> | null = null;
  private static placedProps: PlacedBox[] = [];

  /** Call at the start of every world (re)build. */
  static resetPlacements() {
    this.placedProps = [];
  }

  private static getSegmentsById(): Map<string, ResolvedHighwaySegment> {
    if (!this.segmentsCache) {
      this.segmentsCache = new Map(getResolvedHighwaySegments().map((s) => [s.corridor.id, s]));
    }
    return this.segmentsCache;
  }

  private static halfDiag(halfX: number, halfZ: number): number {
    return Math.hypot(halfX, halfZ);
  }

  /**
   * True when an axis-aligned footprint centered at (cx, cz) is fully clear of highways
   * (asphalt + shoulder), junction plazas, registered water, and previously placed props.
   */
  static isAreaClear(cx: number, cz: number, halfX: number, halfZ: number, margin = 6): boolean {
    const hd = this.halfDiag(halfX, halfZ);

    for (const seg of RoadGeometryHelper.getSegments()) {
      const dist = RoadGeometryHelper.distanceToSegment(cx, cz, seg.start.x, seg.start.z, seg.end.x, seg.end.z);
      if (dist < seg.width / 2 + margin + hd) return false;
    }

    for (const loc of GUJARAT_LOCATIONS) {
      const d = Math.hypot(cx - loc.worldPosition.x, cz - loc.worldPosition.z);
      if (d < JUNCTION_RADIUS + margin + hd) return false;
    }

    if (WaterOccupancy.isInsideWater(cx, cz, margin + hd)) return false;

    const box: PlacedBox = {
      minX: cx - halfX - margin,
      maxX: cx + halfX + margin,
      minZ: cz - halfZ - margin,
      maxZ: cz + halfZ + margin,
    };
    for (const p of this.placedProps) {
      if (box.minX < p.maxX && box.maxX > p.minX && box.minZ < p.maxZ && box.maxZ > p.minZ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Spiral-search outward from (cx, cz) for the nearest clear center for a footprint of
   * (2·halfX × 2·halfZ). Deterministic. Returns the input point if it is already clear.
   */
  static findClearSpot(cx: number, cz: number, halfX: number, halfZ: number, maxRadius = 320): PlacedSpot {
    if (this.isAreaClear(cx, cz, halfX, halfZ)) {
      return { x: cx, z: cz, angle: 0 };
    }
    for (let r = 14; r <= maxRadius; r += 14) {
      const steps = Math.max(10, Math.round((2 * Math.PI * r) / 12));
      for (let a = 0; a < steps; a++) {
        const theta = (a / steps) * Math.PI * 2 + r * 0.35;
        const x = cx + Math.cos(theta) * r;
        const z = cz + Math.sin(theta) * r;
        if (this.isAreaClear(x, z, halfX, halfZ)) {
          return { x, z, angle: 0 };
        }
      }
    }
    return { x: cx, z: cz, angle: 0 };
  }

  /**
   * Raw point ON a corridor's centerline at fraction t (no clearance nudging). Used by
   * road-spanning structures like the toll plaza arch.
   */
  static corridorPoint(corridorId: string, t: number): PlacedSpot {
    const seg = this.getSegmentsById().get(corridorId);
    if (!seg) return { x: 0, z: 0, angle: 0 };
    const dx = seg.end.x - seg.start.x;
    const dz = seg.end.z - seg.start.z;
    const clampedT = Math.min(0.92, Math.max(0.08, t));
    return {
      x: seg.start.x + dx * clampedT,
      z: seg.start.z + dz * clampedT,
      angle: Math.atan2(dx, dz),
    };
  }

  /**
   * Anchor a prop to a highway corridor: base point at fraction t along the segment,
   * pushed `side` (+1 right / -1 left of travel) beyond the asphalt by shoulderGap,
   * then nudged to the nearest clear spot for the given footprint. The footprint is
   * registered so later props don't stack on it.
   */
  static placeAlongCorridor(
    corridorId: string,
    t: number,
    side: 1 | -1,
    halfX: number,
    halfZ: number,
    shoulderGap = 14
  ): PlacedSpot {
    const seg = this.getSegmentsById().get(corridorId);
    if (!seg) {
      return { x: 0, z: 0, angle: 0 };
    }
    const clampedT = Math.min(0.92, Math.max(0.08, t));
    const dx = seg.end.x - seg.start.x;
    const dz = seg.end.z - seg.start.z;
    const bx = seg.start.x + dx * clampedT;
    const bz = seg.start.z + dz * clampedT;
    const len = seg.distance || 1;
    const nx = -dz / len;
    const nz = dx / len;
    const offset = seg.width / 2 + shoulderGap;
    const spot = this.findClearSpot(bx + nx * offset * side, bz + nz * offset * side, halfX, halfZ);

    this.placedProps.push({
      minX: spot.x - halfX - 6,
      maxX: spot.x + halfX + 6,
      minZ: spot.z - halfZ - 6,
      maxZ: spot.z + halfZ + 6,
    });
    return { x: spot.x, z: spot.z, angle: Math.atan2(dx, dz) };
  }
}
