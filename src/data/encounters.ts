import { RoadsideEncounter } from '../types';
import { PlacementHelper } from '../world/PlacementHelper';

/**
 * Stall positions are anchored to the real highway corridors (deterministic, road/water-safe
 * placement from PlacementHelper) so every food stop sits on the shoulder of the route it
 * belongs to — never on asphalt, never in water.
 */
function spot(corridorId: string, t: number, side: 1 | -1): { x: number; z: number } {
  const s = PlacementHelper.placeAlongCorridor(corridorId, t, side, 4, 3, 10);
  return { x: Math.round(s.x * 10) / 10, z: Math.round(s.z * 10) / 10 };
}

export const ROADSIDE_ENCOUNTERS: RoadsideEncounter[] = [
  {
    id: 'enc_rajkot_tea',
    type: 'tea_stall',
    nameGujarati: '☕ જય ખોડિયાર કડક મસાલા ચા & કટોરી',
    nameEnglish: 'Jai Khodiyar Kadak Masala Chai',
    taglineGujarati: 'હાઇવેની અસલ તાજગી — દેશી આદુ-ઈલાયચી ચા',
    foodId: 'highway_masala_chai',
    foodNameGujarati: 'હાઇવે કડક મસાલા ચા (કટોરી સ્પેશિયલ)',
    foodNameEnglish: 'Highway Kadak Masala Chai',
    emoji: '🫖',
    kakaDialogue: 'અરે વાહ ભાઈ વાહ! હાઇવે માથે ગરમાગરમ કડક મસાલા ચા મળી ગઈ! એક કટોરી પીવો એટલે થાક ગાયબ!',
    worldPosition: spot('nh47_rajkot_ahmedabad', 0.22, 1),
  },
  {
    id: 'enc_rajkot_ganthiya',
    type: 'gathiya_stall',
    nameGujarati: '🥨 રાજકોટ વણેલા ગાંઠિયા & પપૈયા સંભારો',
    nameEnglish: 'Rajkot Live Ganthiya Rath',
    taglineGujarati: 'ગરમાગરમ લાઈવ વણેલા ગાંઠિયા અને તળેલી મરચી',
    foodId: 'ganthiya_rajkot',
    foodNameGujarati: 'રાજકોટના વણેલા ગાંઠિયા',
    foodNameEnglish: 'Rajkot Ganthiya',
    emoji: '🥨',
    kakaDialogue: 'ગરમાગરમ વણેલા ગાંઠિયા, તળેલી મરચી અને પપૈયાનો સંભારો! આ તો કાઠિયાવાડનું અમૃત કહેવાય બાપા!',
    worldPosition: spot('nh27_rajkot_dwarka', 0.3, -1),
  },
  {
    id: 'enc_bhavnagar_ganthiya',
    type: 'gathiya_stall',
    nameGujarati: '🥨 ભાવનગરી તીખા મરી ગાંઠિયા & ગરમ જલેબી',
    nameEnglish: 'Bhavnagari Spicy Ganthiya & Jalebi',
    taglineGujarati: 'તીખા ગાંઠિયા ને મીઠી કેસર જલેબીની જોડી',
    foodId: 'bhavnagari_ganthiya',
    foodNameGujarati: 'ભાવનગરી તીખા મરી ગાંઠિયા & જલેબી',
    foodNameEnglish: 'Bhavnagari Spicy Ganthiya',
    emoji: '🥨',
    kakaDialogue: 'ભાવનગરના તીખા કાળા મરીવાળા ગાંઠિયા અને રસદાર જલેબી! સ્વાદ દાઢે વળગી જાય એવો છે!',
    worldPosition: spot('nh51b_rajkot_palitana', 0.62, 1),
  },
  {
    id: 'enc_ahmedabad_gotas',
    type: 'gathiya_stall',
    nameGujarati: '🧆 હાઇવે લીલી મેથીના ગોટા & ગરમ કઢી',
    nameEnglish: 'Highway Methi Gota & Kadhi Stall',
    taglineGujarati: 'તાજી લીલી મેથીના સ્પંજી ગોટા અને ખાટી-મીઠી કઢી',
    foodId: 'methi_gotas',
    foodNameGujarati: 'ડાકોર-અમદાવાદ હાઇવે મેથીના ગોટા & કઢી',
    foodNameEnglish: 'Highway Methi Na Gota',
    emoji: '🧆',
    kakaDialogue: 'વરસાદી હવામાનમાં ગરમાગરમ મેથીના ગોટા અને કઢીનો સ્વાદ એટલે સ્વર્ગની મોજ!',
    worldPosition: spot('ne1_ahmedabad_vadodara', 0.35, -1),
  },
  {
    id: 'enc_rth_tea',
    type: 'tea_stall',
    nameGujarati: '🫖 રોડ ટુ હેવન રણ ટી પોઇન્ટ',
    nameEnglish: 'Road to Heaven Rann Tea Point',
    taglineGujarati: 'શ્વેત રણના હાઈવે વચ્ચે કડક કેતલી ચા',
    foodId: 'highway_masala_chai',
    foodNameGujarati: 'હાઇવે કડક મસાલા ચા (કટોરી સ્પેશિયલ)',
    foodNameEnglish: 'Highway Kadak Masala Chai',
    emoji: '🫖',
    kakaDialogue: 'શ્વેત રણના રોડ ટુ હેવન વચ્ચે ગરમ ચા પીવાની મોજ જ અલગ છે! જય ગરવી ગુજરાત!',
    worldPosition: spot('rth_kutch_dholavira', 0.5, 1),
  },
  {
    id: 'enc_narmada_tea',
    type: 'tea_stall',
    nameGujarati: '☕ નર્મદા કિનારા ટી & નાસ્તા સ્ટોલ',
    nameEnglish: 'Narmada Riverside Tea & Snacks',
    taglineGujarati: 'નર્મદા મૈયાના દર્શન અને આદુવાળી કડક ચા',
    foodId: 'highway_masala_chai',
    foodNameGujarati: 'હાઇવે કડક મસાલા ચા (કટોરી સ્પેશિયલ)',
    foodNameEnglish: 'Highway Kadak Masala Chai',
    emoji: '☕',
    kakaDialogue: 'નર્મદા નદીના કાંઠે આદુવાળી કડક ચાની ચુસકી લેતા લેતા છકડો હાંકવાની અલગ જ મજા છે!',
    worldPosition: spot('nh56_vadodara_sou', 0.5, -1),
  },
  {
    id: 'enc_surat_locho',
    type: 'dhaba',
    nameGujarati: '🍲 સુરતી લાઈવ બટર લોચો & સેવ ખમણી',
    nameEnglish: 'Surti Live Butter Locho Stall',
    taglineGujarati: 'તેલ-મસાલા અને સેવથી ભરપૂર અસલ સુરતી નાસ્તો',
    foodId: 'locho_surat',
    foodNameGujarati: 'સુરતી લોચો (બટર સ્પેશિયલ)',
    foodNameEnglish: 'Surti Locho',
    emoji: '🍲',
    kakaDialogue: 'સુરતનું જમણ અને કાશીનું મરણ! ગરમાગરમ બટર લોચો માથે લીલી ચટણી એટલે લિજ્જત આવી જાય!',
    worldPosition: spot('nh48_ahmedabad_surat', 0.55, 1),
  },
  {
    id: 'enc_dwarka_penda',
    type: 'dhaba',
    nameGujarati: '🍮 દ્વારકાધીશ પ્રસાદી પેંડા & માખણ મિસરી',
    nameEnglish: 'Dwarka Mawa Penda & Tea Stall',
    taglineGujarati: 'કાળિયા ઠાકોરના પ્રસાદ સમો શુદ્ધ માવા પેંડો',
    foodId: 'penda_dwarka',
    foodNameGujarati: 'દ્વારકાના માવા પેંડા',
    foodNameEnglish: 'Dwarka Penda',
    emoji: '🍮',
    kakaDialogue: 'જય દ્વારકાધીશ! ભગવાનનો પ્રસાદી માવા પેંડો આરોગીને આગળની યાત્રા શરૂ કરો બાપા!',
    worldPosition: spot('nh51_dwarka_somnath', 0.45, -1),
  },
];
