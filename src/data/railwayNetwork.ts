import { getResolvedHighwaySegments, ResolvedHighwaySegment } from './highwayNetwork';

/**
 * Indian Railways lines across Gujarat. Each line runs parallel to the highway corridor that
 * shares its route (as the real Western Railway tracks mostly do), offset to one side and
 * stopped short of both city junctions so the track never cuts through a roundabout. The
 * side is picked per line to keep the track away from the other corridors leaving each city.
 */
export interface RailLine {
  id: string;
  /** Highway corridor this line follows. */
  corridorId: string;
  nameGujarati: string;
  nameEnglish: string;
  /** Station names at the corridor's from/to ends (Indian Railways style boards). */
  fromStationGujarati: string;
  fromStationEnglish: string;
  toStationGujarati: string;
  toStationEnglish: string;
  /** Livery of the passenger rake: ICF blue, LHB red or Vande Bharat white/saffron. */
  livery: 'icf_blue' | 'lhb_red' | 'vande_bharat';
  /** Pin the track to one side of the corridor (else the clearer side is picked). */
  side?: 1 | -1;
}

export const GUJARAT_RAIL_LINES: RailLine[] = [
  {
    id: 'rail_ahmedabad_vadodara',
    corridorId: 'ne1_ahmedabad_vadodara',
    nameGujarati: 'અમદાવાદ-વડોદરા મુખ્ય રેલ્વે લાઇન',
    nameEnglish: 'Ahmedabad - Vadodara Main Line',
    fromStationGujarati: 'અમદાવાદ જં.',
    fromStationEnglish: 'AHMEDABAD JN.',
    toStationGujarati: 'વડોદરા જં.',
    toStationEnglish: 'VADODARA JN.',
    livery: 'vande_bharat',
  },
  {
    id: 'rail_vadodara_surat',
    corridorId: 'nh48_vadodara_surat',
    nameGujarati: 'વડોદરા-ભરૂચ-સુરત (મુંબઈ મેઇન લાઇન)',
    nameEnglish: 'Vadodara - Bharuch - Surat (Mumbai Main Line)',
    fromStationGujarati: 'વડોદરા જં.',
    fromStationEnglish: 'VADODARA JN.',
    toStationGujarati: 'સુરત',
    toStationEnglish: 'SURAT',
    livery: 'lhb_red',
  },
  {
    id: 'rail_rajkot_ahmedabad',
    corridorId: 'nh47_rajkot_ahmedabad',
    nameGujarati: 'રાજકોટ-સુરેન્દ્રનગર-અમદાવાદ રેલ્વે',
    nameEnglish: 'Rajkot - Surendranagar - Ahmedabad Line',
    fromStationGujarati: 'રાજકોટ જં.',
    fromStationEnglish: 'RAJKOT JN.',
    toStationGujarati: 'અમદાવાદ જં.',
    toStationEnglish: 'AHMEDABAD JN.',
    livery: 'icf_blue',
  },
  {
    id: 'rail_rajkot_dwarka',
    corridorId: 'nh27_rajkot_dwarka',
    nameGujarati: 'રાજકોટ-જામનગર-દ્વારકા રેલ્વે',
    nameEnglish: 'Rajkot - Jamnagar - Dwarka Line',
    fromStationGujarati: 'રાજકોટ જં.',
    fromStationEnglish: 'RAJKOT JN.',
    toStationGujarati: 'દ્વારકા',
    toStationEnglish: 'DWARKA',
    livery: 'icf_blue',
  },
  {
    id: 'rail_junagadh_rajkot',
    corridorId: 'nh8d_junagadh_rajkot',
    nameGujarati: 'જૂનાગઢ-રાજકોટ રેલ્વે',
    nameEnglish: 'Junagadh - Rajkot Line',
    fromStationGujarati: 'જૂનાગઢ જં.',
    fromStationEnglish: 'JUNAGADH JN.',
    toStationGujarati: 'રાજકોટ જં.',
    toStationEnglish: 'RAJKOT JN.',
    livery: 'icf_blue',
  },
  {
    id: 'rail_ahmedabad_gandhinagar',
    corridorId: 'nh47_ahmedabad_gandhinagar',
    nameGujarati: 'અમદાવાદ-ગાંધીનગર કેપિટલ લાઇન',
    nameEnglish: 'Ahmedabad - Gandhinagar Capital Line',
    fromStationGujarati: 'અમદાવાદ જં.',
    fromStationEnglish: 'AHMEDABAD JN.',
    toStationGujarati: 'ગાંધીનગર કેપિટલ',
    toStationEnglish: 'GANDHINAGAR CAPITAL',
    livery: 'vande_bharat',
  },
  {
    id: 'rail_ahmedabad_patan',
    corridorId: 'gj_sh41_ahmedabad_patan',
    nameGujarati: 'અમદાવાદ-મહેસાણા-પાટણ રેલ્વે',
    nameEnglish: 'Ahmedabad - Mehsana - Patan Line',
    fromStationGujarati: 'અમદાવાદ જં.',
    fromStationEnglish: 'AHMEDABAD JN.',
    toStationGujarati: 'પાટણ',
    toStationEnglish: 'PATAN',
    livery: 'lhb_red',
    // East of the highway: the Sabarmati runs down the west side of Ahmedabad.
    side: 1,
  },
  {
    id: 'rail_vadodara_ektanagar',
    corridorId: 'nh56_vadodara_sou',
    nameGujarati: 'વડોદરા-એકતા નગર (કેવડિયા) રેલ્વે',
    nameEnglish: 'Vadodara - Ekta Nagar (Kevadia) Line',
    fromStationGujarati: 'વડોદરા જં.',
    fromStationEnglish: 'VADODARA JN.',
    toStationGujarati: 'એકતા નગર',
    toStationEnglish: 'EKTA NAGAR',
    livery: 'vande_bharat',
    // South of the highway: the Narmada backwater lies north of the Statue of Unity.
    side: 1,
  },
  {
    id: 'rail_kutch_rajkot',
    corridorId: 'nh8a_kutch_rajkot',
    nameGujarati: 'ભુજ-ગાંધીધામ-મોરબી-રાજકોટ રેલ્વે',
    nameEnglish: 'Bhuj - Gandhidham - Morbi - Rajkot Line',
    fromStationGujarati: 'ભુજ',
    fromStationEnglish: 'BHUJ',
    toStationGujarati: 'રાજકોટ જં.',
    toStationEnglish: 'RAJKOT JN.',
    livery: 'icf_blue',
  },
];

/** Track centerline distance from the parallel highway's centerline. */
export const RAIL_OFFSET = 42;
/** How far the track stops short of each city junction centre. */
export const RAIL_END_INSET = 55;
/** Ballast bed width — also the clearance half-width props and trees keep from the rails. */
export const RAIL_BED_WIDTH = 5;

export interface ResolvedRailSegment {
  line: RailLine;
  corridor: ResolvedHighwaySegment;
  /** +1 = right of the corridor's from→to direction, -1 = left. */
  side: 1 | -1;
  start: { x: number; z: number };
  end: { x: number; z: number };
  distance: number;
  /** Yaw of the track (same convention as highway segments: atan2(dx, dz)). */
  angle: number;
}

function distPointToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq ? ((px - ax) * dx + (pz - az) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

function segSegDistance(
  a: { x: number; z: number }, b: { x: number; z: number },
  c: { x: number; z: number }, d: { x: number; z: number },
): number {
  const r = (b.x - a.x) * (d.z - c.z) - (b.z - a.z) * (d.x - c.x);
  if (r !== 0) {
    const t = ((c.x - a.x) * (d.z - c.z) - (c.z - a.z) * (d.x - c.x)) / r;
    const u = ((c.x - a.x) * (b.z - a.z) - (c.z - a.z) * (b.x - a.x)) / r;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return 0;
  }
  return Math.min(
    distPointToSegment(a.x, a.z, c.x, c.z, d.x, d.z),
    distPointToSegment(b.x, b.z, c.x, c.z, d.x, d.z),
    distPointToSegment(c.x, c.z, a.x, a.z, b.x, b.z),
    distPointToSegment(d.x, d.z, a.x, a.z, b.x, b.z),
  );
}

function offsetTrack(seg: ResolvedHighwaySegment, side: 1 | -1) {
  const dx = seg.end.x - seg.start.x;
  const dz = seg.end.z - seg.start.z;
  const len = seg.distance || 1;
  const ux = dx / len;
  const uz = dz / len;
  // Right-hand normal of the travel direction (matches PlacementHelper's side convention).
  const nx = -uz * side;
  const nz = ux * side;
  return {
    start: { x: seg.start.x + ux * RAIL_END_INSET + nx * RAIL_OFFSET, z: seg.start.z + uz * RAIL_END_INSET + nz * RAIL_OFFSET },
    end: { x: seg.end.x - ux * RAIL_END_INSET + nx * RAIL_OFFSET, z: seg.end.z - uz * RAIL_END_INSET + nz * RAIL_OFFSET },
  };
}

let cache: ResolvedRailSegment[] | null = null;

/** All rail tracks as straight world-space segments (deterministic, cached). */
export function getResolvedRailSegments(): ResolvedRailSegment[] {
  if (cache) return cache;
  const roads = getResolvedHighwaySegments();
  const byId = new Map(roads.map((s) => [s.corridor.id, s]));
  const out: ResolvedRailSegment[] = [];

  for (const line of GUJARAT_RAIL_LINES) {
    const seg = byId.get(line.corridorId);
    if (!seg) continue;
    // Choose the side whose track stays furthest from every *other* corridor.
    let best: { side: 1 | -1; clear: number; track: ReturnType<typeof offsetTrack> } | null = null;
    const sides: (1 | -1)[] = line.side ? [line.side] : [1, -1];
    for (const side of sides) {
      const track = offsetTrack(seg, side);
      let clear = Infinity;
      for (const other of roads) {
        if (other === seg) continue;
        clear = Math.min(clear, segSegDistance(track.start, track.end, other.start, other.end));
      }
      if (!best || clear > best.clear) best = { side, clear, track };
    }
    const { start, end } = best!.track;
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    out.push({
      line,
      corridor: seg,
      side: best!.side,
      start,
      end,
      distance: Math.hypot(dx, dz),
      angle: Math.atan2(dx, dz),
    });
  }
  cache = out;
  return out;
}

/** Distance from a point to the nearest rail centerline (Infinity when there are no rails). */
export function distanceToNearestRail(x: number, z: number): number {
  let min = Infinity;
  for (const r of getResolvedRailSegments()) {
    min = Math.min(min, distPointToSegment(x, z, r.start.x, r.start.z, r.end.x, r.end.z));
  }
  return min;
}
