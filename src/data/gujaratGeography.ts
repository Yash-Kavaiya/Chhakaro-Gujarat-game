/**
 * The shape of Gujarat in world space (x = east, z = south; ~1 unit ≈ 200 m, Rajkot at the
 * origin). Hand-traced from the real state outline and fitted around the game's highway
 * layout, so the Arabian Sea, the Gulf of Kutch and the Gulf of Khambhat sit where they do
 * on a real map while every corridor, junction and roadside prop stays on dry land
 * (zoneLayout.test.ts verifies that).
 *
 * The same polygons drive the 3D terrain (EnvironmentBuilder) and the 2D maps (MiniMap,
 * GujaratMapModal), so what the player sees on the map matches what they drive through.
 */

export type Pt = { x: number; z: number };

const p = (x: number, z: number): Pt => ({ x, z });

/**
 * The Gujarat coastline, from the Maharashtra border near Vapi northward along south Gujarat,
 * round the Gulf of Khambhat, along Saurashtra's south and west coasts, into the Gulf of
 * Kutch and out along Kutch to the Kori Creek. Ordered as one continuous chain.
 */
export const COASTLINE: Pt[] = [
  // South Gujarat coast (Vapi → Valsad → Navsari/Dandi → Surat)
  p(1120, 1340),
  p(1060, 1250),
  p(1010, 1130),
  p(995, 990),
  p(1000, 860),
  p(1010, 720),
  // East shore of the Gulf of Khambhat (Hazira → Bharuch → Khambhat)
  p(1020, 560),
  p(1015, 400),
  p(995, 270),
  p(965, 160),
  p(935, 95),
  // Head of the gulf, then its west shore (Dholera → Bhavnagar → Alang → Mahuva)
  p(900, 90),
  p(860, 160),
  p(815, 260),
  p(770, 370),
  p(720, 480),
  p(650, 600),
  p(560, 720),
  // Saurashtra south coast (Mahuva → Diu → Veraval/Somnath)
  p(430, 830),
  p(260, 920),
  p(80, 985),
  p(-100, 1010),
  p(-240, 985),
  p(-330, 930),
  // Saurashtra west coast (Madhavpur → Porbandar → Dwarka)
  p(-450, 810),
  p(-560, 650),
  p(-640, 520),
  p(-705, 425),
  p(-790, 305),
  p(-880, 195),
  p(-990, 120),
  p(-1085, 60),
  // Okha, then the south shore of the Gulf of Kutch (Jamnagar → Navlakhi)
  p(-1090, -60),
  p(-1000, -120),
  p(-850, -150),
  p(-700, -165),
  p(-560, -195),
  p(-470, -245),
  // Head of the Gulf of Kutch, then the Kutch shore back west (Kandla → Mundra → Mandvi)
  p(-470, -300),
  p(-560, -320),
  p(-700, -335),
  p(-860, -330),
  p(-1020, -320),
  p(-1200, -300),
  // Kutch west coast (Jakhau → Koteshwar → Kori Creek)
  p(-1340, -360),
  p(-1440, -500),
  p(-1470, -650),
  p(-1450, -780),
];

/**
 * Gujarat's land border, continuing the coastline from Kori Creek clockwise across the
 * Rann (Pakistan), the Rajasthan border, the Madhya Pradesh border and the Maharashtra
 * border back to the coast at Vapi.
 */
export const LAND_BORDER: Pt[] = [
  p(-1400, -960),
  p(-1150, -1120),
  p(-800, -1250),
  p(-400, -1310),
  p(-50, -1300),
  p(250, -1240),
  p(560, -1300),
  p(860, -1320),
  p(1130, -1230),
  p(1380, -1060),
  p(1560, -850),
  p(1700, -600),
  p(1820, -330),
  p(1880, -60),
  p(1840, 220),
  p(1800, 520),
  p(1830, 760),
  p(1760, 1000),
  p(1640, 1180),
  p(1430, 1290),
  p(1250, 1350),
];

/** Closed outline of the state: coastline + land border. */
export const GUJARAT_OUTLINE: Pt[] = [...COASTLINE, ...LAND_BORDER];

/** World rectangle the terrain covers (and the 2D maps frame). */
export const WORLD_BOUNDS = { minX: -2300, maxX: 2500, minZ: -1900, maxZ: 2200 };

/**
 * The Arabian Sea with both gulfs: the coastline chain closed off along the world edge.
 * Everything west and south of the coast is water.
 */
export const ARABIAN_SEA: Pt[] = [
  ...COASTLINE,
  p(WORLD_BOUNDS.minX, -780),
  p(WORLD_BOUNDS.minX, WORLD_BOUNDS.maxZ),
  p(1120, WORLD_BOUNDS.maxZ),
];

/** Great Rann of Kutch — the white salt desert north of Kutch mainland. */
export const GREAT_RANN: Pt[] = [
  p(-1380, -900),
  p(-1150, -1080),
  p(-800, -1200),
  p(-400, -1260),
  p(-60, -1250),
  p(200, -1170),
  p(260, -1040),
  p(120, -930),
  p(-120, -800),
  p(-420, -730),
  p(-760, -760),
  p(-1100, -790),
];

/** Khadir Bet — the island in the Great Rann that holds Dholavira. */
export const KHADIR_BET: Pt[] = [
  p(-420, -960),
  p(-330, -1010),
  p(-200, -975),
  p(-170, -880),
  p(-240, -810),
  p(-380, -820),
];

/** Little Rann of Kutch — the wild-ass sanctuary salt flat between Kutch and north Gujarat. */
export const LITTLE_RANN: Pt[] = [
  p(-40, -640),
  p(180, -700),
  p(380, -650),
  p(430, -530),
  p(300, -430),
  p(100, -420),
  p(-60, -500),
];

export interface MapLabel {
  text: string;
  x: number;
  z: number;
  kind: 'sea' | 'region' | 'neighbour';
}

/** Big geographic labels for the 2D map. */
export const MAP_LABELS: MapLabel[] = [
  { text: 'અરબી સમુદ્ર', x: -1250, z: 900, kind: 'sea' },
  { text: 'કચ્છનો અખાત', x: -860, z: -245, kind: 'sea' },
  { text: 'ખંભાતનો અખાત', x: 880, z: 600, kind: 'sea' },
  { text: 'કચ્છનું મોટું રણ', x: -650, z: -1000, kind: 'region' },
  { text: 'નાનું રણ', x: 190, z: -560, kind: 'region' },
  { text: 'કચ્છ', x: -1000, z: -520, kind: 'region' },
  { text: 'સૌરાષ્ટ્ર', x: -350, z: 250, kind: 'region' },
  { text: 'ઉત્તર ગુજરાત', x: 560, z: -1100, kind: 'region' },
  { text: 'મધ્ય ગુજરાત', x: 1420, z: -300, kind: 'region' },
  { text: 'દક્ષિણ ગુજરાત', x: 1440, z: 700, kind: 'region' },
  { text: 'રાજસ્થાન', x: 900, z: -1600, kind: 'neighbour' },
  { text: 'મધ્ય પ્રદેશ', x: 1790, z: -860, kind: 'neighbour' },
  { text: 'મહારાષ્ટ્ર', x: 1640, z: 1340, kind: 'neighbour' },
  { text: 'પાકિસ્તાન', x: -1080, z: -1330, kind: 'neighbour' },
];

/** Ray-cast point-in-polygon test. */
export function pointInPolygon(x: number, z: number, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
  }
  return inside;
}

function edgeDistance(x: number, z: number, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const lenSq = dx * dx + dz * dz;
  let t = lenSq ? ((x - a.x) * dx + (z - a.z) * dz) / lenSq : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (a.x + t * dx), z - (a.z + t * dz));
}

/** Shortest distance from a point to an open polyline (e.g. the coastline chain). */
export function distanceToPolyline(x: number, z: number, line: Pt[]): number {
  let min = Infinity;
  for (let i = 1; i < line.length; i++) min = Math.min(min, edgeDistance(x, z, line[i - 1], line[i]));
  return min;
}

/** True when (x, z) is in the sea or within `margin` of the coast. */
export function isSea(x: number, z: number, margin = 0): boolean {
  if (pointInPolygon(x, z, ARABIAN_SEA)) return true;
  return margin > 0 && distanceToPolyline(x, z, COASTLINE) < margin;
}
