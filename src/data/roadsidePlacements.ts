import { PlacementHelper, PlacedSpot } from '../world/PlacementHelper';

export interface RoadsideProp {
  name: string;
  spot: PlacedSpot;
}

function place(corridorId: string, t: number, side: 1 | -1, halfX: number, halfZ: number, shoulderGap = 14): PlacedSpot {
  return PlacementHelper.placeAlongCorridor(corridorId, t, side, halfX, halfZ, shoulderGap);
}

/**
 * Every roadside facility (interactable) — the SAME spots drive the 3D props in
 * EnvironmentBuilder and the proximity prompts in GameWorld.
 */
export const PETROL_PUMPS: RoadsideProp[] = [
  { name: '⛽ શ્રી ગણેશ પેટ્રોલિયમ (HP)', spot: place('nh47_rajkot_ahmedabad', 0.45, 1, 12, 8) },
  { name: '⛽ ખોડિયાર પેટ્રોલિયમ (IndianOil)', spot: place('nh27_rajkot_dwarka', 0.55, -1, 12, 8) },
  { name: '⛽ ગોલ્ડન કોરિડોર પેટ્રોલિયમ', spot: place('nh48_vadodara_surat', 0.3, -1, 12, 8) },
  { name: '⛽ નર્મદા હાઇવે પેટ્રોલિયમ', spot: place('nh56_vadodara_sou', 0.35, 1, 12, 8) },
];

export const AUTO_GARAGES: RoadsideProp[] = [
  { name: '🔧 રણછોડ ઓટો ગેરેજ & પંચર', spot: place('nh151_gir_junagadh', 0.5, 1, 9, 7) },
  { name: '🔧 બાલાજી છકડો સર્વિસ સેન્ટર', spot: place('nh8a_kutch_rajkot', 0.5, -1, 9, 7) },
];

/** The FASTag toll stands ON the carriageway (arch spans the road), aligned to its yaw. */
export const TOLL_PLAZA: RoadsideProp = {
  name: '🛣️ રાષ્ટ્રીય ધોરીમાર્ગ ટોલ પ્લાઝા (FASTag Lane)',
  spot: PlacementHelper.corridorPoint('nh48_vadodara_surat', 0.62),
};

/** Scenery props — decorative, but placed with the same road/water-safe rules. */
export const FARMS: (RoadsideProp & { cropColor: number; hasWindmill: boolean; hasTractor: boolean })[] = [
  { name: '🌾 શ્રી ખોડિયાર એગ્રી ફાર્મ (કપાસ & મગફળી)', spot: place('nh51b_rajkot_palitana', 0.3, 1, 24, 18), cropColor: 0xca8a04, hasWindmill: true, hasTractor: true },
  { name: '🌾 સરદાર પટેલ કિસાન ફાર્મ (ઓર્ગેનિક કપાસ)', spot: place('nh27_rajkot_dwarka', 0.6, 1, 24, 18), cropColor: 0x15803d, hasWindmill: true, hasTractor: true },
  { name: '🌾 સૌરાષ્ટ્ર પ્રાકૃતિક ફાર્મ', spot: place('nh47_rajkot_ahmedabad', 0.75, -1, 24, 18), cropColor: 0xd97706, hasWindmill: true, hasTractor: false },
  { name: '🌾 ગોપાલ કૃષિ ફાર્મ & બોરવેલ', spot: place('nh8d_junagadh_rajkot', 0.4, 1, 24, 18), cropColor: 0x166534, hasWindmill: false, hasTractor: true },
];

export const FACTORIES: (RoadsideProp & { shedColor: number })[] = [
  { name: '🏭 GIDC મોરબી સિરામિક્સ & ટાઇલ્સ પ્લાન્ટ', spot: place('nh8a_kutch_rajkot', 0.55, 1, 20, 14), shedColor: 0x0369a1 },
  { name: '🏭 રાજકોટ એન્જિનિયરિંગ & ફાઉન્ડ્રી GIDC', spot: place('nh47_rajkot_ahmedabad', 0.55, 1, 20, 14), shedColor: 0x15803d },
  { name: '🏭 સુરત સિન્થેટિક્સ & ટેક્સટાઇલ મિલ', spot: place('nh48_vadodara_surat', 0.75, -1, 20, 14), shedColor: 0x475569 },
  { name: '🏭 વડોદરા ફાર્મા & કેમિકલ પાર્ક', spot: place('nh56_vadodara_sou', 0.3, -1, 20, 14), shedColor: 0x0891b2 },
];

export const SHOPS: (RoadsideProp & { type: 'kirana' | 'paan' | 'handicraft' | 'dairy' })[] = [
  { name: '🏪 શ્રી ગણેશ કરિયાણા & જનરલ સ્ટોર્સ', spot: place('nh51b_rajkot_palitana', 0.55, 1, 5, 4), type: 'kirana' },
  { name: '🏪 જય બજરંગ પાન પાર્લર & કોલ્ડ્રિંક્સ', spot: place('nh27_rajkot_dwarka', 0.42, -1, 5, 4), type: 'paan' },
  { name: '🏪 હસ્તકલા & બાંધણી એમ્પોરિયમ', spot: place('gj_sh41_ahmedabad_patan', 0.5, 1, 5, 4), type: 'handicraft' },
  { name: '🏪 મા ખોડિયાર ડેરી & સ્વીટ માર્ટ', spot: place('nh8a_kutch_rajkot', 0.35, -1, 5, 4), type: 'dairy' },
];

export const MALLS: RoadsideProp[] = [
  { name: '🏬 ગુજરાત સેન્ટ્રલ મેગા મોલ & મલ્ટિપ્લેક્સ', spot: place('nh47_ahmedabad_gandhinagar', 0.4, 1, 23, 14) },
  { name: '🏬 રિલાયન્સ મેગા શોપિંગ પ્લાઝા', spot: place('nh48_vadodara_surat', 0.18, 1, 23, 14) },
];

export const TOWERS: (RoadsideProp & { floors: number; height: number })[] = [
  { name: '🏢 ગિફ્ટ સિટી હાઇ-ટેક ટાવર્સ (GIFT City Tower)', spot: place('nh47_ahmedabad_gandhinagar', 0.6, -1, 12, 12), floors: 12, height: 42 },
  { name: '🏢 ચારોટર કોર્પોરેટ પાર્ક & બિઝનેસ હબ', spot: place('ne1_ahmedabad_vadodara', 0.65, 1, 12, 12), floors: 10, height: 35 },
  { name: '🏢 રત્નમ ડાયમંડ કોમર્શિયલ સેન્ટર', spot: place('nh48_vadodara_surat', 0.85, 1, 12, 12), floors: 11, height: 38 },
];

export const HOUSES: RoadsideProp[] = [
  { name: '🏡 ગોપાલભાઈનું ગામઠી મકાન & ડેલી', spot: place('nh27_rajkot_dwarka', 0.78, -1, 8, 5) },
  { name: '🏡 રણછોડદાસની કાઠિયાવાડી હવેલી', spot: place('gj_sh33_palitana_somnath', 0.5, 1, 8, 5) },
  { name: '🏡 બાપા સીતારામ નિવાસ & ઓસરી', spot: place('nh151_gir_junagadh', 0.32, -1, 8, 5) },
  { name: '🏡 કિસાન નિવાસ', spot: place('gj_sh6_surat_dandi', 0.6, 1, 8, 5) },
];

/** Decorative roadside chai stalls, ganthiya raths and dhabas — highway culture scenery. */
export const ROADSIDE_STALLS: (RoadsideProp & { type: 'tea' | 'ganthiya' })[] = [
  { name: '☕ જય ખોડિયાર કડક મસાલા ચા & કટોરી', spot: place('nh47_rajkot_ahmedabad', 0.22, 1, 4, 3, 10), type: 'tea' },
  { name: '🥨 રાજકોટ વણેલા ગાંઠિયા & પપૈયા સંભારો', spot: place('nh27_rajkot_dwarka', 0.3, -1, 4, 3, 10), type: 'ganthiya' },
  { name: '🥨 ભાવનગરી ગાંઠિયા & જલેબી', spot: place('nh51b_rajkot_palitana', 0.62, 1, 4, 3, 10), type: 'ganthiya' },
  { name: '🧆 હાઇવે મેથીના ગોટા', spot: place('ne1_ahmedabad_vadodara', 0.35, -1, 4, 3, 10), type: 'ganthiya' },
  { name: '🫖 રોડ ટુ હેવન રણ ટી પોઇન્ટ', spot: place('rth_kutch_dholavira', 0.5, 1, 4, 3, 10), type: 'tea' },
  { name: '☕ નર્મદા કિનારા ટી સ્ટોલ', spot: place('nh56_vadodara_sou', 0.5, -1, 4, 3, 10), type: 'tea' },
  { name: '☕ ધોલેરા એક્સપ્રેસવે ટી પોઇન્ટ', spot: place('exp_ahmedabad_dholera', 0.5, 1, 4, 3, 10), type: 'tea' },
  { name: '☕ કોસ્ટલ હાઇવે ચા', spot: place('nh51_dwarka_porbandar', 0.45, -1, 4, 3, 10), type: 'tea' },
];

/**
 * GSRTC ST bus stations (depots) at the edge of the big cities — each anchored to one of
 * the city's corridors a short way out of its junction.
 */
export const BUS_STANDS: RoadsideProp[] = [
  { name: 'ગાંધીનગર એસ.ટી. બસ સ્ટેશન', spot: place('nh47_ahmedabad_gandhinagar', 0.86, 1, 16, 11) },
  { name: 'અમદાવાદ ગીતા મંદિર એસ.ટી. બસ પોર્ટ', spot: place('ne1_ahmedabad_vadodara', 0.1, -1, 16, 11) },
  { name: 'રાજકોટ એસ.ટી. બસ પોર્ટ', spot: place('nh51b_rajkot_palitana', 0.1, -1, 16, 11) },
  { name: 'વડોદરા સેન્ટ્રલ એસ.ટી. બસ સ્ટેશન', spot: place('nh56_vadodara_sou', 0.1, 1, 16, 11) },
  { name: 'સુરત એસ.ટી. બસ સ્ટેશન', spot: place('gj_sh17_surat_saputara', 0.1, -1, 16, 11) },
  { name: 'જૂનાગઢ એસ.ટી. બસ સ્ટેશન', spot: place('nh151_gir_junagadh', 0.9, -1, 16, 11) },
  { name: 'ધોલેરા એસ.ટી. બસ સ્ટેશન', spot: place('nh751_dholera_palitana', 0.1, 1, 16, 11) },
  { name: 'ભુજ એસ.ટી. બસ સ્ટેશન', spot: place('nh8a_kutch_rajkot', 0.12, 1, 16, 11) },
];

/** Small roadside ST bus-stop shelters ("એસ.ટી. સ્ટેન્ડ") along the highways. */
export const BUS_STOPS: RoadsideProp[] = [
  { name: 'કુવાડવા', spot: place('nh47_rajkot_ahmedabad', 0.35, -1, 3, 2, 8) },
  { name: 'લીંબડી', spot: place('nh47_rajkot_ahmedabad', 0.62, 1, 3, 2, 8) },
  { name: 'ખંભાળિયા', spot: place('nh27_rajkot_dwarka', 0.7, 1, 3, 2, 8) },
  { name: 'ગોંડલ', spot: place('nh8d_junagadh_rajkot', 0.7, -1, 3, 2, 8) },
  { name: 'આણંદ ચોકડી', spot: place('ne1_ahmedabad_vadodara', 0.6, 1, 3, 2, 8) },
  { name: 'ભરૂચ', spot: place('nh48_vadodara_surat', 0.5, -1, 3, 2, 8) },
  { name: 'મહેસાણા', spot: place('gj_sh41_ahmedabad_patan', 0.55, -1, 3, 2, 8) },
  { name: 'ધંધુકા', spot: place('exp_ahmedabad_dholera', 0.35, -1, 3, 2, 8) },
  { name: 'ભાવનગર', spot: place('nh751_dholera_palitana', 0.55, -1, 3, 2, 8) },
  { name: 'માધવપુર', spot: place('nh51_porbandar_somnath', 0.5, 1, 3, 2, 8) },
  { name: 'મોરબી', spot: place('nh8a_kutch_rajkot', 0.7, -1, 3, 2, 8) },
  { name: 'કરજણ', spot: place('nh56_vadodara_sou', 0.6, 1, 3, 2, 8) },
];
