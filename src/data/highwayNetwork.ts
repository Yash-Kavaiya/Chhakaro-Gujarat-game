import { LocationData } from '../types';
import { GUJARAT_LOCATIONS } from './locations';

export interface HighwayCorridor {
  id: string;
  code: string;
  fromId: string;
  toId: string;
  nameGujarati: string;
  nameEnglish: string;
  speedLimit: number;
  type: 'national' | 'expressway' | 'state';
  hasSignalGantry?: boolean;
}

export const GUJARAT_HIGHWAY_CORRIDORS: HighwayCorridor[] = [
  // Saurashtra West Highway Circuit
  {
    id: 'nh27_rajkot_dwarka',
    code: 'NH-27',
    fromId: 'rajkot',
    toId: 'dwarka',
    nameGujarati: 'રાજકોટ-દ્વારકા નેશનલ હાઈવે',
    nameEnglish: 'Rajkot - Dwarka National Highway',
    speedLimit: 60,
    type: 'national',
    hasSignalGantry: true,
  },
  {
    id: 'nh51_dwarka_somnath',
    code: 'NH-51',
    fromId: 'dwarka',
    toId: 'somnath',
    nameGujarati: 'સાગરખેડૂ કોસ્ટલ હાઈવે (દ્વારકા-સોમનાથ)',
    nameEnglish: 'Dwarka - Somnath Coastal Highway',
    speedLimit: 60,
    type: 'national',
    hasSignalGantry: true,
  },
  {
    id: 'gj_sh26_somnath_gir',
    code: 'GJ-SH-26',
    fromId: 'somnath',
    toId: 'gir',
    nameGujarati: 'સોમનાથ-સાસણ ગીર સેન્ચ્યુરી રોડ',
    nameEnglish: 'Somnath - Sasan Gir Sanctuary Road',
    speedLimit: 40,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'nh151_gir_junagadh',
    code: 'NH-151',
    fromId: 'gir',
    toId: 'junagadh',
    nameGujarati: 'ગીર-જૂનાગઢ ગિરનાર કોરિડોર',
    nameEnglish: 'Gir - Junagadh Foothills Corridor',
    speedLimit: 50,
    type: 'national',
    hasSignalGantry: true,
  },
  {
    id: 'nh8d_junagadh_rajkot',
    code: 'NH-8D',
    fromId: 'junagadh',
    toId: 'rajkot',
    nameGujarati: 'જૂનાગઢ-રાજકોટ સૌરાષ્ટ્ર મેઇનલાઇન',
    nameEnglish: 'Junagadh - Rajkot Saurashtra Mainline',
    speedLimit: 60,
    type: 'national',
    hasSignalGantry: true,
  },

  // North Gujarat & Kutch Highways
  {
    id: 'nh47_rajkot_ahmedabad',
    code: 'NH-47',
    fromId: 'rajkot',
    toId: 'ahmedabad',
    nameGujarati: 'રાજકોટ-અમદાવાદ સિક્સલેન એક્સપ્રેસવે',
    nameEnglish: 'Rajkot - Ahmedabad Six-Lane Expressway',
    speedLimit: 70,
    type: 'expressway',
    hasSignalGantry: true,
  },
  {
    id: 'gj_sh41_ahmedabad_patan',
    code: 'GJ-SH-41',
    fromId: 'ahmedabad',
    toId: 'patan_modhera',
    nameGujarati: 'અમદાવાદ-પાટણ હેરિટેજ હાઇવે',
    nameEnglish: 'Ahmedabad - Patan Heritage Highway',
    speedLimit: 55,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'nh27_patan_kutch',
    code: 'NH-27',
    fromId: 'patan_modhera',
    toId: 'kutch',
    nameGujarati: 'પાટણ-કચ્છ શ્વેત રણ એક્સપ્રેસવે',
    nameEnglish: 'Patan - Kutch White Desert Expressway',
    speedLimit: 65,
    type: 'national',
    hasSignalGantry: true,
  },
  {
    id: 'nh8a_kutch_rajkot',
    code: 'NH-8A',
    fromId: 'kutch',
    toId: 'rajkot',
    nameGujarati: 'કચ્છ-મોરબી-રાજકોટ ગેટવે હાઇવે',
    nameEnglish: 'Kutch - Morbi - Rajkot Gateway Highway',
    speedLimit: 65,
    type: 'national',
    hasSignalGantry: true,
  },

  // South & Central Gujarat Highways
  {
    id: 'nh48_ahmedabad_surat',
    code: 'NH-48',
    fromId: 'ahmedabad',
    toId: 'surat',
    nameGujarati: 'અમદાવાદ-સુરત ગોલ્ડન ક્વાડ્રીલેટરલ',
    nameEnglish: 'Ahmedabad - Surat Golden Corridor',
    speedLimit: 75,
    type: 'expressway',
    hasSignalGantry: true,
  },
  {
    id: 'ne1_ahmedabad_vadodara',
    code: 'NE-1',
    fromId: 'ahmedabad',
    toId: 'vadodara',
    nameGujarati: 'મહાત્મા ગાંધી એક્સપ્રેસવે (NE-1)',
    nameEnglish: 'Ahmedabad - Vadodara National Expressway',
    speedLimit: 80,
    type: 'expressway',
    hasSignalGantry: true,
  },
  {
    id: 'sh150_vadodara_pavagadh',
    code: 'GJ-SH-150',
    fromId: 'vadodara',
    toId: 'pavagadh',
    nameGujarati: 'વડોદરા-પાવાગઢ હેરિટેજ હાઇવે',
    nameEnglish: 'Vadodara - Pavagadh Shakti Corridor',
    speedLimit: 55,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'nh56_vadodara_sou',
    code: 'NH-56',
    fromId: 'vadodara',
    toId: 'statue_of_unity',
    nameGujarati: 'વડોદરા-કેવડિયા નર્મદા એક્સપ્રેસવે',
    nameEnglish: 'Vadodara - Kevadia SOU Expressway',
    speedLimit: 65,
    type: 'national',
    hasSignalGantry: true,
  },
  {
    id: 'gj_sh11_surat_sou',
    code: 'GJ-SH-11',
    fromId: 'surat',
    toId: 'statue_of_unity',
    nameGujarati: 'સુરત-કેવડિયા નર્મદા એક્સપ્રેસવે',
    nameEnglish: 'Surat - Kevadia Narmada Expressway',
    speedLimit: 60,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'gj_sh6_surat_dandi',
    code: 'GJ-SH-6',
    fromId: 'surat',
    toId: 'dandi',
    nameGujarati: 'દાંડી હેરિટેજ કોસ્ટલ રોડ',
    nameEnglish: 'Dandi Heritage Coastal Highway',
    speedLimit: 50,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'gj_sh17_surat_saputara',
    code: 'GJ-SH-17',
    fromId: 'surat',
    toId: 'saputara',
    nameGujarati: 'સુરત-સાપુતારા ડાંગ ઘાટ રોડ',
    nameEnglish: 'Surat - Saputara Dangs Ghat Road',
    speedLimit: 45,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'gj_sh63_sou_saputara',
    code: 'GJ-SH-63',
    fromId: 'statue_of_unity',
    toId: 'saputara',
    nameGujarati: 'સ્ટેચ્યુ ઓફ યુનિટી - સાપુતારા લિંક',
    nameEnglish: 'Statue of Unity - Saputara Link',
    speedLimit: 50,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'nh51b_rajkot_palitana',
    code: 'NH-51B',
    fromId: 'rajkot',
    toId: 'palitana',
    nameGujarati: 'રાજકોટ-પાલીતાણા શત્રુંજય હાઇવે',
    nameEnglish: 'Rajkot - Palitana Shatrunjaya Highway',
    speedLimit: 60,
    type: 'national',
    hasSignalGantry: true,
  },
  {
    id: 'gj_sh33_palitana_somnath',
    code: 'GJ-SH-33',
    fromId: 'palitana',
    toId: 'somnath',
    nameGujarati: 'પાલીતાણા-સોમનાથ તીર્થ કોરિડોર',
    nameEnglish: 'Palitana - Somnath Pilgrimage Corridor',
    speedLimit: 55,
    type: 'state',
    hasSignalGantry: true,
  },
  {
    id: 'rth_kutch_dholavira',
    code: 'NH-754K',
    fromId: 'kutch',
    toId: 'dholavira',
    nameGujarati: 'રોડ ટુ હેવન (શ્વેત રણ એક્સપ્રેસવે)',
    nameEnglish: 'Road to Heaven - White Desert Highway',
    speedLimit: 70,
    type: 'expressway',
    hasSignalGantry: true,
  },
  {
    id: 'nh27_dholavira_patan',
    code: 'NH-27K',
    fromId: 'dholavira',
    toId: 'patan_modhera',
    nameGujarati: 'ધોળાવીરા-પાટણ હેરિટેજ લિંક',
    nameEnglish: 'Dholavira - Patan Heritage Link',
    speedLimit: 60,
    type: 'national',
    hasSignalGantry: true,
  },
  {
    id: 'gj_airport_express_ahmedabad',
    code: 'GJ-AIRPORT',
    fromId: 'ahmedabad',
    toId: 'ahmedabad_airport',
    nameGujarati: 'અમદાવાદ-SVPIA એરપોર્ટ એપ્રોચ રોડ',
    nameEnglish: 'Ahmedabad - SVPIA Airport Approach Road',
    speedLimit: 60,
    type: 'expressway',
    hasSignalGantry: true,
  },
  {
    id: 'gj_airport_express_rajkot',
    code: 'NH-47A',
    fromId: 'rajkot',
    toId: 'ahmedabad_airport',
    nameGujarati: 'રાજકોટ-અમદાવાદ એરપોર્ટ લિંક',
    nameEnglish: 'Rajkot - SVPIA Airport Link',
    speedLimit: 70,
    type: 'expressway',
    hasSignalGantry: true,
  },
];

export interface ResolvedHighwaySegment {
  corridor: HighwayCorridor;
  fromLoc: LocationData;
  toLoc: LocationData;
  start: { x: number; z: number };
  end: { x: number; z: number };
  distance: number;
  angle: number;
  width: number;
}

export function getResolvedHighwaySegments(): ResolvedHighwaySegment[] {
  const locMap = new Map<string, LocationData>();
  GUJARAT_LOCATIONS.forEach((l) => locMap.set(l.id, l));

  const results: ResolvedHighwaySegment[] = [];

  for (const c of GUJARAT_HIGHWAY_CORRIDORS) {
    const fromLoc = locMap.get(c.fromId);
    const toLoc = locMap.get(c.toId);
    if (!fromLoc || !toLoc) continue;

    const dx = toLoc.worldPosition.x - fromLoc.worldPosition.x;
    const dz = toLoc.worldPosition.z - fromLoc.worldPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dx, dz);

    results.push({
      corridor: c,
      fromLoc,
      toLoc,
      start: { x: fromLoc.worldPosition.x, z: fromLoc.worldPosition.z },
      end: { x: toLoc.worldPosition.x, z: toLoc.worldPosition.z },
      distance,
      angle,
      width: c.type === 'expressway' ? 16.0 : 14.0,
    });
  }

  return results;
}
