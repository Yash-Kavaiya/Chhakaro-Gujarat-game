// Pure procedural-incident scheduler. Decides WHEN a road incident (cattle crossing,
// stalled truck, slow tractor, rain puddle) appears ahead of the player and WHEN it
// falls behind and is retired. No THREE, no Math.random — the caller supplies `roll`
// (its own Math.random()) so the scheduler stays deterministic and unit-testable.
// The THREE side (spawning/animating the mesh) lives in src/world/IncidentDirector.ts.

export type IncidentKind = 'cattle_crossing' | 'stalled_truck' | 'slow_tractor' | 'rain_puddle';

export interface IncidentSpawn {
  id: string;
  kind: IncidentKind;
  /** metres of totalDistanceDriven at which it was placed (for despawn-behind) */
  placedAtDistance: number;
}

export interface IncidentSchedulerState {
  active: IncidentSpawn | null;
  lastEndedAtDistance: number; // for the min-gap
  nextEligibleAtDistance: number;
}

/** Clear road required after one incident ends before the next is eligible. Tuned so a
 *  ~40 km/h cruise meets roughly 2–3 incidents per 10 minutes (spec §10 "reads as
 *  realistic, not a bug"), not one every ~700 m. */
export const MIN_GAP_M = 2800;
/** Incidents only appear while the player is actually moving. */
const SPEED_FLOOR_KMH = 15;
/** Chance the caller's roll must beat for a spawn, per scheduler tick (the director
 *  ticks this ~1 Hz, not per frame, so the cadence gets an organic spread). */
const SPAWN_CHANCE = 0.15;
/** Small head-start so a first-timer isn't hit with an incident in the opening seconds. */
const INITIAL_ELIGIBLE_M = 800;
/** Once the incident is this far behind `placedAtDistance` it is retired. */
const DESPAWN_BEHIND_M = 180;
/** Zones where cattle on the carriageway is the everyday hazard. */
const CATTLE_ZONES = ['gir', 'rajkot', 'saputara'];

export function initIncidentSchedule(): IncidentSchedulerState {
  return { active: null, lastEndedAtDistance: 0, nextEligibleAtDistance: INITIAL_ELIGIBLE_M };
}

/** Weighted pick of the incident kind. `sub` is a fresh 0..1 value derived from the
 *  caller's roll so we never touch Math.random here. rain_puddle is weight 0 (never
 *  chosen) unless it is actually raining. */
function pickKind(zoneId: string, weather: string, sub: number): IncidentKind {
  const weights: Array<[IncidentKind, number]> = [
    ['cattle_crossing', CATTLE_ZONES.includes(zoneId) ? 3 : 1],
    ['stalled_truck', 1],
    // No corridor type available here, so slow tractors are weighted generally up.
    ['slow_tractor', 2],
    ['rain_puddle', weather === 'rain' ? 2 : 0],
  ];
  const total = weights.reduce((sum, [, w]) => sum + w, 0);
  let acc = 0;
  const target = sub * total;
  for (const [kind, w] of weights) {
    acc += w;
    if (w > 0 && target < acc) return kind;
  }
  return 'stalled_truck';
}

/** Advance the schedule one tick. Pure: returns the (possibly new) state plus a
 *  command for the world layer — `spawn` on the tick an incident appears, `despawn`
 *  on the tick it is retired. */
export function stepIncidentSchedule(params: {
  state: IncidentSchedulerState;
  distanceDriven: number;
  speedKmh: number;
  zoneId: string;
  weather: string;
  roll: number; // 0..1, caller supplies Math.random()
}): { state: IncidentSchedulerState; spawn: IncidentSpawn | null; despawn: boolean } {
  const { state, distanceDriven, speedKmh, zoneId, weather, roll } = params;

  // An incident is running: the only decision is whether it has fallen behind.
  if (state.active) {
    if (distanceDriven - state.active.placedAtDistance > DESPAWN_BEHIND_M) {
      return {
        state: {
          active: null,
          lastEndedAtDistance: distanceDriven,
          nextEligibleAtDistance: distanceDriven + MIN_GAP_M,
        },
        spawn: null,
        despawn: true,
      };
    }
    return { state, spawn: null, despawn: false };
  }

  // No incident: check spawn eligibility.
  if (speedKmh <= SPEED_FLOOR_KMH) return { state, spawn: null, despawn: false };
  if (distanceDriven < state.nextEligibleAtDistance) return { state, spawn: null, despawn: false };
  if (roll >= SPAWN_CHANCE) return { state, spawn: null, despawn: false };

  // Re-spread the passing roll across 0..1 so kind selection isn't biased to the low end.
  const sub = (roll / SPAWN_CHANCE) % 1;
  const kind = pickKind(zoneId, weather, sub);
  const spawn: IncidentSpawn = {
    id: `incident-${Math.round(distanceDriven)}-${kind}`,
    kind,
    placedAtDistance: distanceDriven,
  };
  return {
    state: {
      active: spawn,
      lastEndedAtDistance: state.lastEndedAtDistance,
      nextEligibleAtDistance: state.nextEligibleAtDistance,
    },
    spawn,
    despawn: false,
  };
}
