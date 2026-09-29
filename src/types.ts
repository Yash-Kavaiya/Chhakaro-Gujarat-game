export type GujaratRegion = 'saurashtra' | 'kutch' | 'north' | 'central' | 'south' | 'north_gujarat' | 'central_gujarat' | 'south_gujarat';
export type RegionType = GujaratRegion;

export type WeatherType = 'sunny' | 'sunset' | 'night' | 'rain' | 'fog';

/** Gearbox behaviour. Declared here (not in state/transmission) to keep types.ts free of
 *  a types → state dependency; transmission.ts imports this type back. */
export type TransmissionMode = 'auto' | 'manual';

export type TimeOfDayPhase = 'sunrise' | 'day' | 'sunset' | 'dusk' | 'night' | 'dawn';
export type TimeFreezeMode = 'dynamic' | 'day' | 'sunrise' | 'sunset' | 'night';

export interface TimeOfDayState {
  hour: number; // 0 - 23
  minute: number; // 0 - 59
  formattedTime: string; // "06:30 AM"
  phase: TimeOfDayPhase;
  phaseGujarati: string; // "સૂર્યોદય (સવાર)", "બપોર (દિવસ)", "સંધ્યાકાળ (સાંજ)", etc.
  phaseEnglish: string; // "Sunrise", "Day", "Golden Sunset", etc.
  cycleProgress: number; // 0.0 to 1.0
  totalDistanceMeters: number;
  sunElevation: number; // -1 to 1
  isNight: boolean;
  sunAngle: number;
  isFrozen: boolean;
  freezeMode: TimeFreezeMode;
}

export interface LocationData {
  id: string;
  nameGujarati: string;
  nameEnglish: string;
  region: GujaratRegion;
  regionNameGujarati: string;
  tagline: string;
  description: string;
  history: string;
  /** One reliable "why this place matters" sentence — shown in the History Card. */
  story?: string;
  culturalHighlights: string[];
  landmarks: string[];
  worldPosition: { x: number; z: number };
  /** Optional hand-placed 2D coordinate (same units as worldPosition) for any zone whose 3D
   *  projection lands cramped on the flat map. MiniMap / GujaratMapModal fall back to worldPosition. */
  mapPosition?: { x: number; z: number };
  zoneRadius: number;
  environmentTheme:
    | 'village'
    | 'temple_coastal'
    | 'forest'
    | 'mountain'
    | 'salt_desert'
    | 'monument'
    | 'city'
    | 'airport'
    | 'hillstation'
    | 'heritage_stepwell'
    | 'jain_temple_hill'
    | 'indus_valley'
    | 'shaktipeeth_fort'
    | 'salt_memorial'
    | 'smart_city'
    | 'coastal_town';
  ambientAudioType: 'village' | 'ocean' | 'forest' | 'wind' | 'city' | 'rain';
  signboardText: string;
  unlockRequirement?: string;
  icon: string;
  /** Optional signature landmark for this zone — drives the hero-landmark set piece (M3 Task 3). */
  heroLandmark?: 'raniKiVav' | 'somnath' | 'girGate' | 'whiteRann' | 'statueOfUnity';
}

/** The drivable vehicle the player picked on the start screen (or in the garage). */
export type VehicleType = 'chhakaro' | 'car' | 'bike';

export interface ChhakaroCustomization {
  bodyColor: number | string;
  bodyColorName?: string;
  stickerText: string;
  hornType: string;
  flagColor?: number | string;
  flagType?: 'saffron' | 'gujarat' | 'tiranga' | 'om';
  hasMirrorTassels?: boolean;
  hasCanopy?: boolean;
  hasTassels?: boolean;
  headlightWarmth?: 'warm_yellow' | 'bright_white' | 'vintage_amber';
  mirrorStyle?: 'round_chrome' | 'painted_folk';
  seatCoverPattern?: 'bandhani' | 'kathiyawadi_patch' | 'classic_brown';
}

export interface GameProgress {
  coins: number;
  reputationStars: number;
  visitedLocations: string[];
  completedMissions: string[];
  customization: ChhakaroCustomization;
  totalKm: number;
  lastLocationId: string;
  transmissionMode: TransmissionMode;
  expertMode: boolean;
  vehicleType: VehicleType;
}

/** A set destination for the turn-by-turn arrow. The route is derived each frame, not stored. */
export interface NavTarget {
  locationId: string;
}

export interface VehicleControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  handbrake: boolean;
  horn: boolean;
  headlight: boolean;
  shiftUp: boolean;
  shiftDown: boolean;
}

export type CameraMode = 'chase' | 'hood' | 'passenger' | 'cinematic' | 'drone';

export interface PassengerData {
  id: string;
  nameGujarati: string;
  nameEnglish: string;
  roleGujarati: string;
  avatarEmoji: string;
  pickupLocationId: string;
  dropLocationId: string;
  fareCoins: number;
  reputationGain: number;
  dialogueGreeting: string;
  dialogueMidway: string;
  dialogueArrival: string;
  storySnippet: string;
  modelStyle: 'elder_ba' | 'tourist' | 'dhaba_wala' | 'student' | 'nri' | 'villager';
}

export type MissionType =
  | 'passenger_ride'
  | 'express_delivery'
  | 'sunset_chase'
  | 'safari_speed_limit'
  | 'heritage_tour'
  | 'photo_hunt';

export interface MissionData {
  id: string;
  titleGujarati: string;
  titleEnglish: string;
  descriptionGujarati: string;
  pickupLocationId: string;
  dropLocationId: string;
  rewardCoins: number;
  rewardReputation: number;
  timeLimitSec?: number;
  speedLimitMax?: number;
  type: MissionType;
  passenger?: PassengerData;
  targetLandmarkId?: string;
  icon: string;
}

export interface VehicleHealthState {
  // Fields that GameWorld always initialises and keeps updated.
  fuelPercent: number;
  maxFuelLiters: number;
  currentFuelLiters: number;
  fuelConsumptionRateKm: number; // liters/km
  engineTempCelsius: number; // In Celsius, normal ~82C
  isOverheating: boolean;
  hasPuncture: boolean;
  punctureWheel: 'front' | 'rear_left' | 'rear_right' | null;
  headlightWorking: boolean;
  hornWorking: boolean;
  conditionScore: number;
  // Genuinely-optional gear / hazard / legacy fields.
  puncture?: boolean;
  engineHeating?: number; // 0 - 100
  headlightBroken?: boolean;
  overallHealth?: number; // 0 - 100
  fuelLiters?: number; // 0 - 100%
  fuelConsumptionRate?: number;
  isEngineRunning?: boolean;
  currentGear?: number; // -1 (Reverse), 0 (Neutral), 1, 2, 3, 4
  isManualMode?: boolean;
  hazardLightsOn?: boolean;
}

export interface DriverStaminaState {
  energy: number; // 0 - 100
  maxEnergy: 100;
  chaiCupsCount: number;
  lastChaiTime: number;
}

export type PhotoFilterId =
  | 'normal'
  | 'kathiyawad_warm'
  | 'rann_sunset'
  | 'vintage_postcard'
  | 'navratri_vibrant'
  | 'monochrome_heritage';

export interface PhotoFilter {
  id: PhotoFilterId;
  name: string;
  cssFilter: string;
}

