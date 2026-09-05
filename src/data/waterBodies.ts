import { GUJARAT_LOCATIONS } from './locations';

export interface WaterBodySpec {
  id: string;
  /** World-space center. */
  x: number;
  z: number;
  /** Full extent along X / Z (axis-aligned rectangles keep collision + tests exact). */
  sx: number;
  sz: number;
  /**
   * Optional bridge style rendered across the water, perpendicular to its long axis.
   * `pedestrian` arches (Atal Bridge), `cable` (Tapi/Narmada), `causeway` (low slab).
   * Bridges stand alone in the field — no highway ever touches a water body.
   */
  bridge?: 'pedestrian' | 'cable' | 'causeway';
  /** Water drawn by a zone/landmark builder itself; still registered for collision/tests. */
  externallyRendered?: boolean;
  label?: string;
}

type OffsetSpec = Omit<WaterBodySpec, 'x' | 'z'> & { anchorId: string; dx: number; dz: number };

/**
 * Zone-relative water, expressed as offsets from the anchor junction so the specs follow
 * any future location edits. Offsets are chosen in road-free wedges behind/aside the
 * junction roundabout (radius 27 m) — zoneLayout.test.ts re-verifies every one against
 * every highway corridor.
 */
const ZONE_WATER: OffsetSpec[] = [
  // Dwarka — Arabian Sea behind the temple; both corridors exit north/east, sea sits north-west
  // across the Gomti ghat line.
  { id: 'sea_dwarka', anchorId: 'dwarka', dx: 0, dz: -130, sx: 220, sz: 80, label: 'અરબી સમુદ્ર' },
  // Somnath — sea south of the shore wall (all three corridors exit northward). Rendered by
  // the somnath landmark module itself.
  { id: 'sea_somnath', anchorId: 'somnath', dx: 0, dz: 86, sx: 200, sz: 100, externallyRendered: true, label: 'અરબી સમુદ્ર' },
  // Ahmedabad — Sabarmati as a narrow N-S strip EAST of the junction. The Rajkot expressway
  // sweeps diagonally through the whole western quadrant, so a west river can never clear it;
  // the eastern wedge (between the Vadodara and Gandhinagar corridors) is road-free.
  { id: 'sabarmati_ahmedabad', anchorId: 'ahmedabad', dx: 130, dz: 0, sx: 22, sz: 150, bridge: 'pedestrian', label: 'સાબરમતી નદી' },
  // Surat — Tapi as an E-W strip south of the junction; the Saputara ghat road (the only
  // corridor heading +Z) passes ≥ 40 m east of the strip's end.
  { id: 'tapi_surat', anchorId: 'surat', dx: 0, dz: 110, sx: 150, sz: 22, bridge: 'cable', label: 'તાપી નદી' },
  // Statue of Unity — Narmada backwater north of the monument, rendered by the landmark
  // module itself; registered here for collision + tests.
  { id: 'narmada_sou', anchorId: 'statue_of_unity', dx: 0, dz: -125, sx: 180, sz: 70, externallyRendered: true, label: 'નર્મદા નદી' },
  // Saputara — hill lake in the eastern saddle, clear of both ghat roads and the two hills.
  { id: 'lake_saputara', anchorId: 'saputara', dx: 72, dz: 26, sx: 28, sz: 28, label: 'સાપુતારા તળાવ' },
  // Vadodara — Sursagar square lake with the Shiva idol, rendered by the zone builder.
  { id: 'lake_vadodara', anchorId: 'vadodara', dx: 0, dz: 85, sx: 38, sz: 28, externallyRendered: true, label: 'સુરસાગર' },
  // Dandi — Arabian Sea coast behind the memorial (only the Surat road exits north-east).
  { id: 'sea_dandi', anchorId: 'dandi', dx: 0, dz: -95, sx: 160, sz: 60, label: 'અરબી સમુદ્ર' },
  // Dholavira — Harappan reservoir tank beside the citadel, rendered by the zone builder.
  { id: 'tank_dholavira', anchorId: 'dholavira', dx: 44, dz: -34, sx: 28, sz: 18, externallyRendered: true, label: 'હડપ્પન જળાશય' },
];

/**
 * Scenic rivers crossing open country between corridors. Every position is verified by
 * zoneLayout.test.ts against every highway corridor — water and roads never touch.
 */
const OPEN_COUNTRY_WATER: WaterBodySpec[] = [
  // Charotar plain river between the Rajkot-Palitana and Ahmedabad-Surat corridors.
  { id: 'narmada_charotar', x: 450, z: 150, sx: 200, sz: 24, bridge: 'cable', label: 'નર્મદા ઉપનદી' },
  // Creek on the Kutch approach, east of the Kutch-Rajkot highway.
  { id: 'kutch_creek', x: -70, z: -250, sx: 24, sz: 200, bridge: 'causeway', label: 'કચ્છની ખાડી' },
  // Shallow Rann creek beside the Road-to-Heaven route.
  { id: 'rth_creek', x: -150, z: -380, sx: 20, sz: 180, bridge: 'causeway', label: 'રણ નદી' },
];

function anchorPoint(anchorId: string): { x: number; z: number } {
  const loc = GUJARAT_LOCATIONS.find((l) => l.id === anchorId);
  if (!loc) return { x: 0, z: 0 };
  return { x: loc.worldPosition.x, z: loc.worldPosition.z };
}

/** All water in the world as axis-aligned world-space rectangles. */
export function getWaterBodySpecs(): WaterBodySpec[] {
  const zoneWater: WaterBodySpec[] = ZONE_WATER.map(({ anchorId, dx, dz, ...rest }) => {
    const p = anchorPoint(anchorId);
    return { ...rest, x: p.x + dx, z: p.z + dz };
  });
  return [...zoneWater, ...OPEN_COUNTRY_WATER];
}

/** Look up one spec by id (builders that render special meshes on top of the water). */
export function getWaterSpec(id: string): WaterBodySpec | undefined {
  return getWaterBodySpecs().find((s) => s.id === id);
}
