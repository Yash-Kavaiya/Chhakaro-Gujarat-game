import { GUJARAT_LOCATIONS } from '../data/locations';

/**
 * Local themed trip planner — the offline fallback for `/api/gemini/trip` and the client-side
 * hint the companion hook uses before the endpoint answers. Pure.
 *
 * (Created in M2 Task 5 so `useKakaCompanion.generateTrip` has something real to fall back on;
 * Task 6 adds the colocated test suite and the server endpoint that prefers a live plan.)
 */

export type TripTheme = 'dharmik' | 'heritage' | 'nature' | 'coast' | 'food' | 'mixed';

export interface TripStop {
  locationId: string;
  reasonGujarati: string;
}

export interface TripPlan {
  introGujarati: string;
  stops: TripStop[];
}

const MAX_STOPS = 6;

// Curated, geographically-sensible orderings. Every id is one of the 16 real locations.
const THEME_ROUTES: Record<TripTheme, string[]> = {
  dharmik: ['dwarka', 'somnath', 'palitana', 'pavagadh'],
  heritage: ['patan_modhera', 'dholavira', 'ahmedabad', 'vadodara', 'pavagadh'],
  nature: ['gir', 'junagadh', 'saputara', 'kutch'],
  coast: ['dwarka', 'somnath', 'dandi', 'dholavira'],
  food: ['rajkot', 'junagadh', 'ahmedabad', 'vadodara', 'surat'],
  mixed: ['rajkot', 'junagadh', 'gir', 'somnath', 'ahmedabad', 'statue_of_unity'],
};

const THEME_KEYWORDS: Array<[TripTheme, string[]]> = [
  ['dharmik', ['ધાર્મિક', 'ધર્મ', 'મંદિર', 'દર્શન', 'યાત્રા', 'જ્યોતિર્લિંગ', 'temple', 'pilgrim', 'dharmik', 'spiritual']],
  ['heritage', ['હેરિટેજ', 'વારસો', 'વિરાસત', 'ઇતિહાસ', 'ઐતિહાસિક', 'પ્રાચીન', 'યુનેસ્કો', 'heritage', 'history', 'ancient', 'unesco']],
  ['coast', ['દરિયો', 'દરિયા', 'બીચ', 'સમુદ્ર', 'કિનારો', 'coast', 'beach', 'sea', 'ocean']],
  ['nature', ['કુદરત', 'પ્રકૃતિ', 'જંગલ', 'સાવજ', 'સિંહ', 'પહાડ', 'ડુંગર', 'હિલ', 'nature', 'wildlife', 'forest', 'lion', 'hill', 'mountain']],
  ['food', ['ખાણીપીણી', 'ખાવા', 'ખાણું', 'ભોજન', 'વાનગી', 'સ્વાદ', 'નાસ્તો', 'food', 'eat', 'cuisine', 'street food']],
];

const THEME_INTRO: Record<TripTheme, string> = {
  dharmik: 'ચાલો બાપા, એક ધાર્મિક સફર બાંધીએ — દર્શન અને મનની શાંતિ બંને મળશે.',
  heritage: 'ગુજરાતનો વારસો જોવો હોય તો આ રહ્યો રસ્તો — પથ્થરે પથ્થરે ઇતિહાસ બોલે છે.',
  nature: 'કુદરતના ખોળે લઈ જાઉં — જંગલ, ડુંગર અને ખુલ્લી હવા.',
  coast: 'દરિયાકિનારાની સફર — મોજાં, પવન અને સોનેરી સૂર્યાસ્ત.',
  food: 'ખાણીપીણીની સફર! કમર કસી લ્યો, સ્વાદનો ખજાનો ખૂલે છે.',
  mixed: 'થોડું મંદિર, થોડો ઇતિહાસ, થોડું જંગલ ને થોડો સ્વાદ — અસલ ગુજરાતનો સ્વાદ.',
};

/** Keyword-match a free-text request to a theme; `mixed` when nothing matches. */
export function classifyTripRequest(request: string): TripTheme {
  const q = (request || '').toLowerCase();
  for (const [theme, keywords] of THEME_KEYWORDS) {
    if (keywords.some((k) => q.includes(k.toLowerCase()))) return theme;
  }
  return 'mixed';
}

function stopReason(locationId: string): string {
  const loc = GUJARAT_LOCATIONS.find((l) => l.id === locationId);
  return loc?.tagline || loc?.passportStory || 'આ સફરમાં જોવા જેવું સ્થળ.';
}

/**
 * A curated ordered plan for the theme in `request`, starting away from `fromLocationId`
 * (you are already there). 3–6 stops, every `locationId` real, each with a Gujarati reason.
 */
export function buildLocalTrip(request: string, fromLocationId: string): TripPlan {
  const theme = classifyTripRequest(request);
  const route = THEME_ROUTES[theme].filter((id) => id !== fromLocationId).slice(0, MAX_STOPS);
  const stops: TripStop[] = route.map((locationId) => ({
    locationId,
    reasonGujarati: stopReason(locationId),
  }));
  return { introGujarati: THEME_INTRO[theme], stops };
}
