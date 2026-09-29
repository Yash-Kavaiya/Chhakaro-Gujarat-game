import { describe, it, expect } from 'vitest';
import { GUJARAT_LOCATIONS } from './locations';
import { getResolvedHighwaySegments } from './highwayNetwork';
import { getWaterBodySpecs, WaterBodySpec } from './waterBodies';
import {
  PETROL_PUMPS,
  AUTO_GARAGES,
  TOLL_PLAZA,
  FARMS,
  FACTORIES,
  SHOPS,
  MALLS,
  TOWERS,
  HOUSES,
  ROADSIDE_STALLS,
  BUS_STANDS,
  BUS_STOPS,
} from './roadsidePlacements';
import { getResolvedRailSegments, RAIL_BED_WIDTH } from './railwayNetwork';
import { WORLD_BOUNDS, GUJARAT_OUTLINE, isSea, pointInPolygon } from './gujaratGeography';
import { RoadGeometryHelper } from '../world/RoadGeometryHelper';
import { WaterOccupancy } from '../world/WaterOccupancy';

const GAP = 80;

interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function rectOf(w: WaterBodySpec, margin = 0): Rect {
  return {
    minX: w.x - w.sx / 2 - margin,
    maxX: w.x + w.sx / 2 + margin,
    minZ: w.z - w.sz / 2 - margin,
    maxZ: w.z + w.sz / 2 + margin,
  };
}

/** Smallest distance between a line segment and an axis-aligned rectangle. */
function segmentRectDistance(
  ax: number, az: number, bx: number, bz: number, r: Rect
): number {
  const inside = (x: number, z: number) =>
    x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;
  if (inside(ax, az) || inside(bx, bz)) return 0;

  const segSeg = (
    p1x: number, p1z: number, p2x: number, p2z: number,
    q1x: number, q1z: number, q2x: number, q2z: number
  ): number => {
    const d = (p2x - p1x) * (q2z - q1z) - (p2z - p1z) * (q2x - q1x);
    if (d !== 0) {
      const t = ((q1x - p1x) * (q2z - q1z) - (q1z - p1z) * (q2x - q1x)) / d;
      const u = ((q1x - p1x) * (p2z - p1z) - (q1z - p1z) * (p2x - p1x)) / d;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
    }
    const dist = (px: number, pz: number, qax: number, qaz: number, qbx: number, qbz: number) =>
      RoadGeometryHelper.distanceToSegment(px, pz, qax, qaz, qbx, qbz);
    return Math.min(
      dist(p1x, p1z, q1x, q1z, q2x, q2z),
      dist(p2x, p2z, q1x, q1z, q2x, q2z),
      dist(q1x, q1z, p1x, p1z, p2x, p2z),
      dist(q2x, q2z, p1x, p1z, p2x, p2z)
    );
  };

  const edges: [number, number, number, number][] = [
    [r.minX, r.minZ, r.maxX, r.minZ],
    [r.maxX, r.minZ, r.maxX, r.maxZ],
    [r.maxX, r.maxZ, r.minX, r.maxZ],
    [r.minX, r.maxZ, r.minX, r.minZ],
  ];
  let min = Infinity;
  for (const [x1, z1, x2, z2] of edges) {
    min = Math.min(min, segSeg(ax, az, bx, bz, x1, z1, x2, z2));
  }
  return min;
}

describe('zone layout: cities water and roads do not merge', () => {
  it('no two location zones overlap plus green belt', () => {
    const locs = GUJARAT_LOCATIONS;
    for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        const a = locs[i];
        const b = locs[j];
        const dx = a.worldPosition.x - b.worldPosition.x;
        const dz = a.worldPosition.z - b.worldPosition.z;
        const dist = Math.hypot(dx, dz);
        const need = a.zoneRadius + b.zoneRadius + GAP;
        expect(dist, `${a.id} overlaps ${b.id} (dist ${dist.toFixed(0)} need ${need})`).toBeGreaterThanOrEqual(need);
      }
    }
  });

  it('includes a separate Gandhinagar square-city zone', () => {
    const g = GUJARAT_LOCATIONS.find((l) => l.id === 'gandhinagar');
    const a = GUJARAT_LOCATIONS.find((l) => l.id === 'ahmedabad');
    expect(g).toBeTruthy();
    expect(a).toBeTruthy();
    const dist = Math.hypot(
      g!.worldPosition.x - a!.worldPosition.x,
      g!.worldPosition.z - a!.worldPosition.z
    );
    expect(dist).toBeGreaterThan(g!.zoneRadius + a!.zoneRadius);
  });
});

describe('water bodies never touch roads, junctions or each other', () => {
  const segments = getResolvedHighwaySegments();
  const water = getWaterBodySpecs();

  it('every water rectangle clears every highway corridor (asphalt + shoulder + buffer)', () => {
    for (const w of water) {
      const r = rectOf(w, 2);
      for (const seg of segments) {
        const d = segmentRectDistance(seg.start.x, seg.start.z, seg.end.x, seg.end.z, r);
        const need = seg.width / 2 + 2.4 + 1.5; // asphalt half + shoulder + buffer
        expect(
          d,
          `water "${w.id}" comes within ${d.toFixed(1)}m of corridor ${seg.corridor.id} (needs ${need.toFixed(1)}m)`
        ).toBeGreaterThanOrEqual(need);
      }
    }
  });

  it('every water rectangle clears every junction roundabout', () => {
    for (const w of water) {
      const r = rectOf(w, 3);
      for (const loc of GUJARAT_LOCATIONS) {
        const dx = Math.max(r.minX - loc.worldPosition.x, 0, loc.worldPosition.x - r.maxX);
        const dz = Math.max(r.minZ - loc.worldPosition.z, 0, loc.worldPosition.z - r.maxZ);
        const d = Math.hypot(dx, dz);
        expect(
          d,
          `water "${w.id}" is ${d.toFixed(1)}m from junction ${loc.id} (needs 33m)`
        ).toBeGreaterThanOrEqual(33);
      }
    }
  });

  it('water rectangles never overlap each other', () => {
    for (let i = 0; i < water.length; i++) {
      for (let j = i + 1; j < water.length; j++) {
        const a = rectOf(water[i], 4);
        const b = rectOf(water[j], 4);
        const overlaps =
          a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
        expect(overlaps, `water "${water[i].id}" overlaps "${water[j].id}"`).toBe(false);
      }
    }
  });

  it('every water body sits on the terrain plane', () => {
    for (const w of water) {
      const r = rectOf(w, 10);
      expect(r.minX).toBeGreaterThan(WORLD_BOUNDS.minX);
      expect(r.maxX).toBeLessThan(WORLD_BOUNDS.maxX);
      expect(r.minZ).toBeGreaterThan(WORLD_BOUNDS.minZ);
      expect(r.maxZ).toBeLessThan(WORLD_BOUNDS.maxZ);
    }
  });

  it('WaterOccupancy registration matches the specs', () => {
    WaterOccupancy.clear();
    for (const w of water) {
      WaterOccupancy.registerRect(w.x - w.sx / 2, w.x + w.sx / 2, w.z - w.sz / 2, w.z + w.sz / 2);
    }
    for (const w of water) {
      expect(WaterOccupancy.isInsideWater(w.x, w.z, 0), w.id).toBe(true);
    }
    WaterOccupancy.clear();
  });
});

describe('roadside placements: props never sit on roads, junctions or water', () => {
  const segments = getResolvedHighwaySegments();
  const water = getWaterBodySpecs();

  interface PropLike { name: string; spot: { x: number; z: number } }
  const propSets: Array<[string, PropLike[]]> = [
    ['PETROL_PUMPS', PETROL_PUMPS],
    ['AUTO_GARAGES', AUTO_GARAGES],
    ['FARMS', FARMS],
    ['FACTORIES', FACTORIES],
    ['SHOPS', SHOPS],
    ['MALLS', MALLS],
    ['TOWERS', TOWERS],
    ['HOUSES', HOUSES],
    ['ROADSIDE_STALLS', ROADSIDE_STALLS],
    ['BUS_STANDS', BUS_STANDS],
    ['BUS_STOPS', BUS_STOPS],
  ];
  const rails = getResolvedRailSegments();

  const WATER_CLEAR = 14; // water half-extents already carry margin; props keep this far out

  for (const [setName, props] of propSets) {
    it(`${setName} are valid, off-road, off-water spots`, () => {
      for (const p of props) {
        // (0,0) is the corridor-lookup fallback — an unknown corridor id must fail loudly
        expect(p.spot.x !== 0 || p.spot.z !== 0, `${setName} "${p.name}" fell back to (0,0)`).toBe(true);

        const roadDist = Math.min(
          ...segments.map((s) =>
            RoadGeometryHelper.distanceToSegment(p.spot.x, p.spot.z, s.start.x, s.start.z, s.end.x, s.end.z)
          )
        );
        expect(roadDist, `${setName} "${p.name}" is ${roadDist.toFixed(1)}m from the nearest road`).toBeGreaterThanOrEqual(10);

        for (const loc of GUJARAT_LOCATIONS) {
          const d = Math.hypot(p.spot.x - loc.worldPosition.x, p.spot.z - loc.worldPosition.z);
          expect(d, `${setName} "${p.name}" sits inside junction ${loc.id}`).toBeGreaterThanOrEqual(34);
        }

        for (const w of water) {
          const dx = Math.max(w.x - w.sx / 2 - p.spot.x, 0, p.spot.x - (w.x + w.sx / 2));
          const dz = Math.max(w.z - w.sz / 2 - p.spot.z, 0, p.spot.z - (w.z + w.sz / 2));
          expect(Math.hypot(dx, dz), `${setName} "${p.name}" is inside water "${w.id}"`).toBeGreaterThanOrEqual(WATER_CLEAR);
        }

        expect(isSea(p.spot.x, p.spot.z, 6), `${setName} "${p.name}" is in the sea`).toBe(false);

        for (const r of rails) {
          const d = RoadGeometryHelper.distanceToSegment(p.spot.x, p.spot.z, r.start.x, r.start.z, r.end.x, r.end.z);
          expect(d, `${setName} "${p.name}" sits on the ${r.line.id} track`).toBeGreaterThanOrEqual(RAIL_BED_WIDTH);
        }
      }
    });
  }

  it('toll plaza stands ON its expressway carriageway', () => {
    const seg = segments.find((s) => s.corridor.id === 'nh48_vadodara_surat')!;
    const d = RoadGeometryHelper.distanceToSegment(
      TOLL_PLAZA.spot.x, TOLL_PLAZA.spot.z, seg.start.x, seg.start.z, seg.end.x, seg.end.z
    );
    expect(d).toBeLessThan(1);
  });
});

describe('Gujarat geography: roads, junctions and rails stay on land', () => {
  const segments = getResolvedHighwaySegments();

  it('every location sits inside the Gujarat outline, clear of the sea', () => {
    for (const loc of GUJARAT_LOCATIONS) {
      const { x, z } = loc.worldPosition;
      expect(pointInPolygon(x, z, GUJARAT_OUTLINE), `${loc.id} is outside Gujarat`).toBe(true);
      expect(isSea(x, z, 34), `junction ${loc.id} touches the sea`).toBe(false);
    }
  });

  it('every highway corridor runs on land', () => {
    for (const seg of segments) {
      const steps = Math.ceil(seg.distance / 10);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = seg.start.x + (seg.end.x - seg.start.x) * t;
        const z = seg.start.z + (seg.end.z - seg.start.z) * t;
        expect(isSea(x, z, seg.width / 2 + 4), `${seg.corridor.id} dips into the sea at t=${t.toFixed(2)}`).toBe(false);
      }
    }
  });

  it('every railway line runs on land, clear of rivers and junction plazas', () => {
    const water = getWaterBodySpecs();
    const rails = getResolvedRailSegments();
    expect(rails.length).toBeGreaterThanOrEqual(8);
    for (const r of rails) {
      const steps = Math.ceil(r.distance / 10);
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = r.start.x + (r.end.x - r.start.x) * t;
        const z = r.start.z + (r.end.z - r.start.z) * t;
        expect(isSea(x, z, RAIL_BED_WIDTH), `${r.line.id} dips into the sea`).toBe(false);
      }
      for (const w of water) {
        const d = segmentRectDistance(r.start.x, r.start.z, r.end.x, r.end.z, rectOf(w, 2));
        expect(d, `${r.line.id} crosses water "${w.id}"`).toBeGreaterThanOrEqual(RAIL_BED_WIDTH);
      }
      for (const loc of GUJARAT_LOCATIONS) {
        const d = RoadGeometryHelper.distanceToSegment(
          loc.worldPosition.x, loc.worldPosition.z, r.start.x, r.start.z, r.end.x, r.end.z,
        );
        expect(d, `${r.line.id} cuts through junction ${loc.id}`).toBeGreaterThanOrEqual(34);
      }
    }
  });
});
