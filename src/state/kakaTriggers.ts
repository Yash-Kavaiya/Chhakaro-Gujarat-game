import { KakaContext } from './kakaContext';
import { GUJARAT_LOCATIONS } from '../data/locations';

/** A proactive line Kanji Kaka should speak right now, decided from a context change. */
export interface TriggerFire {
  id: string;
  textGujarati: string;
  priority: 'low' | 'normal';
}

const COASTAL_TEMPLE_ZONES = new Set(['dwarka', 'somnath']);
const GIR_SPEED_WARN_KMH = 27; // a little over the 25 km/h wildlife cap
const LOW_FUEL_PCT = 15;

function landmarkName(id: string | null): string {
  return (id && GUJARAT_LOCATIONS.find((l) => l.id === id)?.nameGujarati) || 'એક જોવાલાયક જગ્યા';
}

function isOverspeedingInGir(c: KakaContext | null): boolean {
  return !!c && c.inGirZone && c.speedKmh > GIR_SPEED_WARN_KMH;
}

function isLowFuel(c: KakaContext | null): boolean {
  return !!c && c.fuelPercent < LOW_FUEL_PCT;
}

function isCoastalSunset(c: KakaContext | null): boolean {
  return !!c && COASTAL_TEMPLE_ZONES.has(c.zone.id) && c.timeOfDayPhase === 'sunset';
}

/**
 * The next proactive line Kaka should speak given how the context just changed, or `null`.
 *
 * Every rule is rising-edge — it fires on the transition *into* its condition, not while the
 * condition merely holds — and the App effect additionally dedupes by `id` so each fires at
 * most once per session. Precedence is safety first: overspeed and low fuel outrank the
 * arrival greeting, which outranks the ambient nudges.
 */
export function evaluateKakaTriggers(
  prev: KakaContext | null,
  next: KakaContext,
): TriggerFire | null {
  // gir-overspeed — safety, rising edge
  if (isOverspeedingInGir(next) && !isOverspeedingInGir(prev)) {
    return {
      id: 'gir-overspeed',
      textGujarati: 'ધીમે બાપા! ગીરમાં સાવજનો વિસ્તાર છે — ૨૫ ની લિમિટમાં હંકારો.',
      priority: 'normal',
    };
  }

  // low-fuel — safety, rising edge
  if (isLowFuel(next) && !isLowFuel(prev)) {
    return {
      id: 'low-fuel',
      textGujarati: 'ડીઝલ ખૂટવા આવ્યું — હવે પમ્પ શોધી લઈએ, નહીંતર છકડો રસ્તે ઊભો રહેશે.',
      priority: 'normal',
    };
  }

  // zone:<id> — entered a new zone
  if (next.zone.id && prev?.zone.id !== next.zone.id) {
    const highlight = GUJARAT_LOCATIONS.find((l) => l.id === next.zone.id)?.landmarks?.[0];
    return {
      id: `zone:${next.zone.id}`,
      textGujarati: highlight
        ? `આપણે હવે ${next.zone.nameGujarati} માં છીએ — ${highlight} તો જોવું જ પડે!`
        : `આપણે હવે ${next.zone.nameGujarati} માં છીએ. જરા આંટો મારીએ!`,
      priority: 'normal',
    };
  }

  // sunset-coast — ambience, rising edge
  if (isCoastalSunset(next) && !isCoastalSunset(prev)) {
    return {
      id: `sunset-coast:${next.zone.id}`,
      textGujarati: `${next.zone.nameGujarati} નો દરિયાકિનારે સૂર્યાસ્ત — કેમેરા કાઢો!`,
      priority: 'low',
    };
  }

  // unvisited-near:<id> — newly close to an unvisited landmark we are not already headed to
  if (
    next.nearbyLandmarkId &&
    next.nearbyLandmarkUnvisited &&
    prev?.nearbyLandmarkId !== next.nearbyLandmarkId
  ) {
    return {
      id: `unvisited-near:${next.nearbyLandmarkId}`,
      textGujarati: `${landmarkName(next.nearbyLandmarkId)} અહીં જ છે — હજી ત્યાં ગયા નથી, આંટો મારીએ?`,
      priority: 'low',
    };
  }

  return null;
}
