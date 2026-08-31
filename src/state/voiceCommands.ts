import { LocationData } from '../types';

/** A recognised spoken command. `unknown` means "treat the transcript as a question". */
export type VoiceIntent =
  | { kind: 'navigate'; locationId: string }
  | { kind: 'open'; target: 'map' | 'passport' | 'missions' | 'garage' }
  | { kind: 'toggle'; target: 'music' | 'headlight' | 'mute' }
  | { kind: 'photo' }
  | { kind: 'repeat' }
  | { kind: 'unknown' };

/** Gujarati + English aliases per location id, matched as substrings of the transcript. */
const NAV_ALIASES: Record<string, string[]> = {
  rajkot: ['રાજકોટ', 'rajkot'],
  dwarka: ['દ્વારકા', 'દ્વારિકા', 'dwarka', 'dwarika'],
  somnath: ['સોમનાથ', 'somnath'],
  gir: ['સાસણ ગીર', 'સાસણ', 'ગીર', 'gir', 'sasan'],
  junagadh: ['જૂનાગઢ', 'જુનાગઢ', 'ગિરનાર', 'junagadh', 'girnar'],
  kutch: ['કચ્છ', 'રણ', 'kutch', 'kachchh', 'rann'],
  statue_of_unity: ['સ્ટેચ્યુ ઓફ યુનિટી', 'સ્ટેચ્યુ', 'યુનિટી', 'કેવડિયા', 'statue of unity', 'statue', 'kevadia', 'unity'],
  saputara: ['સાપુતારા', 'saputara'],
  ahmedabad: ['અમદાવાદ', 'ahmedabad', 'amdavad'],
  surat: ['સુરત', 'surat'],
  patan_modhera: ['પાટણ', 'મોઢેરા', 'રાણકી વાવ', 'patan', 'modhera', 'rani ki vav'],
  pavagadh: ['પાવાગઢ', 'ચાંપાનેર', 'pavagadh', 'champaner'],
  dholavira: ['ધોળાવીરા', 'dholavira'],
  palitana: ['પાલીતાણા', 'શત્રુંજય', 'palitana', 'shatrunjay', 'shetrunjay'],
  vadodara: ['વડોદરા', 'બરોડા', 'vadodara', 'baroda'],
  dandi: ['દાંડી', 'dandi'],
};

const NAV_VERBS = /(લઈ જા|લઇ જા|લઈ જાવ|લઈ જાઓ|ચાલો|ચાલ |તરફ|જવું|take me to|take me|go to|drive to|navigate to|lai ja)/;
const OPEN_VERBS = /(બતાવ|દેખાડ|ખોલ|open|show)/;
const TOGGLE_VERBS = /(ચાલુ કર|બંધ કર|ચાલુ|બંધ|turn on|turn off|switch on|switch off|toggle)/;

function stripAddress(text: string): string {
  return text
    .replace(/^(hey |ok |અરે |એ )?(કાનજી )?કાકા[,\s]*/i, '')
    .replace(/^(hey |ok )?kaka[,\s]*/i, '')
    .trim();
}

function findLocationId(text: string, locations: LocationData[]): string | null {
  for (const loc of locations) {
    const aliases = NAV_ALIASES[loc.id];
    if (aliases && aliases.some((a) => text.includes(a.toLowerCase()))) return loc.id;
  }
  return null;
}

/**
 * Local, offline intent match. Requires a command verb — a bare place name or an
 * "X વિશે કહો" ("tell me about X") question returns `{kind:'unknown'}` so the caller
 * routes it to Kaka as a normal question.
 */
export function matchVoiceIntent(transcript: string, locations: LocationData[]): VoiceIntent {
  const raw = (transcript || '').toLowerCase().trim().replace(/\s+/g, ' ');
  if (!raw) return { kind: 'unknown' };
  const t = stripAddress(raw);

  if (/(ફરી (કહો|બોલો|સંભળાવો)|ફરીથી (કહો|બોલો)|repeat( that)?|say (that )?again)/.test(t)) {
    return { kind: 'repeat' };
  }

  if (/(ફોટો|ફોટ્ટો|photo|selfie|સેલ્ફી|picture)/.test(t)) {
    return { kind: 'photo' };
  }

  if (TOGGLE_VERBS.test(t)) {
    if (/(મ્યુઝિક|મ્યૂઝિક|સંગીત|ગીત|રેડિયો|music|radio|song)/.test(t)) return { kind: 'toggle', target: 'music' };
    if (/(હેડલાઇટ|હેડલાઈટ|હેડ લાઇટ|લાઇટ|લાઈટ|બત્તી|headlight|head light|lights?)/.test(t))
      return { kind: 'toggle', target: 'headlight' };
    if (/(મ્યૂટ|મ્યુટ|અવાજ|સાઉન્ડ|mute|sound|volume)/.test(t)) return { kind: 'toggle', target: 'mute' };
  }

  if (OPEN_VERBS.test(t)) {
    if (/(નકશો|નક્શો|મૅપ|મેપ|map)/.test(t)) return { kind: 'open', target: 'map' };
    if (/(પાસપોર્ટ|સ્ટૅમ્પ|સ્ટેમ્પ|passport|stamps?)/.test(t)) return { kind: 'open', target: 'passport' };
    if (/(મિશન|સવારી|મુસાફર|mission|passenger|rides?)/.test(t)) return { kind: 'open', target: 'missions' };
    if (/(ગેરેજ|ગૅરેજ|garage|repair|workshop)/.test(t)) return { kind: 'open', target: 'garage' };
  }

  if (NAV_VERBS.test(t)) {
    const locationId = findLocationId(t, locations);
    if (locationId) return { kind: 'navigate', locationId };
  }

  return { kind: 'unknown' };
}
