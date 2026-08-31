import { WeatherType } from '../types';

/** Something the player just did — Kaka may react to it. Kept to the last few, newest first. */
export type KakaEvent =
  | { kind: 'stamp'; nameGujarati: string }
  | { kind: 'food'; nameGujarati: string }
  | { kind: 'souvenir'; nameGujarati: string }
  | { kind: 'quiz'; correct: boolean }
  | { kind: 'mission_done'; nameGujarati: string }
  | { kind: 'refuel' }
  | { kind: 'repair' }
  | { kind: 'overspeed'; zone: string };

/** The single live snapshot every Kaka utterance (chat reply, proactive line, trip) is grounded in. */
export interface KakaContext {
  zone: { id: string; nameGujarati: string; region: string };
  nearbyLandmarkId: string | null;
  /** The nearby landmark is one the player has not stamped yet and is not already headed to. */
  nearbyLandmarkUnvisited: boolean;
  visitedCount: number;
  totalLocations: number;
  mission: { titleGujarati: string; dropNameGujarati: string } | null;
  nav: { targetNameGujarati: string; distanceM: number } | null;
  speedKmh: number;
  inGirZone: boolean; // 25 km/h wildlife cap active
  fuelPercent: number;
  weather: WeatherType;
  timeOfDayPhase: string | null;
  recentEvents: KakaEvent[]; // last <=5, newest first
}

// Matches GameWorld.updatePhysics: the Gir speed cap is active within 160 units of this point.
export const GIR_CENTER = { x: 150, z: 550 };
export const GIR_RADIUS = 160;

export interface BuildKakaContextInput {
  zoneId: string;
  zoneNameGujarati: string;
  zoneRegion: string;
  nearbyLandmarkId: string | null;
  nearbyLandmarkUnvisited: boolean;
  visitedCount: number;
  totalLocations: number;
  mission: { titleGujarati: string; dropNameGujarati: string } | null;
  nav: { targetNameGujarati: string; distanceM: number } | null;
  speedKmh: number;
  vehiclePos: { x: number; z: number } | null;
  fuelPercent: number;
  weather: WeatherType;
  timeOfDayPhase: string | null;
  recentEvents: KakaEvent[];
}

/** Pure projection of the App-state fields Kaka needs into one flat snapshot. */
export function buildKakaContext(input: BuildKakaContextInput): KakaContext {
  const inGirZone = input.vehiclePos
    ? Math.hypot(input.vehiclePos.x - GIR_CENTER.x, input.vehiclePos.z - GIR_CENTER.z) < GIR_RADIUS
    : input.zoneId === 'gir';

  return {
    zone: { id: input.zoneId, nameGujarati: input.zoneNameGujarati, region: input.zoneRegion },
    nearbyLandmarkId: input.nearbyLandmarkId,
    nearbyLandmarkUnvisited: input.nearbyLandmarkUnvisited,
    visitedCount: input.visitedCount,
    totalLocations: input.totalLocations,
    mission: input.mission,
    nav: input.nav,
    speedKmh: Math.round(input.speedKmh),
    inGirZone,
    fuelPercent: input.fuelPercent,
    weather: input.weather,
    timeOfDayPhase: input.timeOfDayPhase,
    recentEvents: input.recentEvents.slice(0, 5),
  };
}
