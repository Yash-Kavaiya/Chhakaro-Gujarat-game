import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameWorld } from './world/GameWorld';
import { HUD } from './components/HUD';
import { GujaratMapModal } from './components/GujaratMapModal';
import { GarageModal } from './components/GarageModal';
import { LandmarkInspectModal } from './components/LandmarkInspectModal';
import { PassengerMissionModal } from './components/PassengerMissionModal';
import { PhotoModeModal } from './components/PhotoModeModal';
import { MobileControls } from './components/MobileControls';
import { StartScreen } from './components/StartScreen';
import { NavBanner } from './components/NavBanner';
import {
  LocationData,
  CameraMode,
  WeatherType,
  ChhakaroCustomization,
  VehicleControls,
  TimeOfDayState,
  VehicleHealthState,
  PassengerData,
  MissionData,
  TimeFreezeMode,
  NavTarget,
  TransmissionMode,
  VehicleType,
} from './types';
import { GUJARAT_LOCATIONS, START_LOCATION } from './data/locations';
import { GUJARAT_MISSIONS } from './data/missions';
import { soundManager } from './audio/SoundManager';
import { voiceQueue } from './audio/VoiceQueue';
import { isMissionComplete } from './state/missionMatching';
import { loadProgress, saveProgress, clearProgress, flushProgress } from './state/persistence';
import { NotifyMessage, NotifyOptions, toneSound } from './state/notify';
import { navState, NavState } from './state/navigation';
import { nearestUnvisited } from './state/exploration';
import { VEHICLE_SPECS } from './world/vehicles/VehicleModel';

// Gujarati warning banners for procedural road incidents (see world/IncidentDirector).
const INCIDENT_TEXT: Record<string, string> = {
  cattle_crossing: 'ધ્યાન રાખો — ગાયો રસ્તો ક્રોસ કરે છે!',
  stalled_truck: 'આગળ ટ્રક બગડ્યો છે — ધીમે!',
  slow_tractor: 'આગળ ધીમું ટ્રેક્ટર — સાચવીને ઓવરટેક કરો.',
  rain_puddle: 'આગળ ખાબોચિયું — સ્પીડ ઓછી કરો.',
};

const locName = (id: string | null | undefined): string =>
  (id && GUJARAT_LOCATIONS.find((l) => l.id === id)?.nameGujarati) || id || '';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GameWorld | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Persisted player progress, loaded once from localStorage (vehicle sim state is never persisted).
  const initial = useMemo(() => loadProgress(), []);

  // Game Lifecycle & Telemetry
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(800);
  const [gear, setGear] = useState<string>('N');
  // Persisted gearbox prefs. The Expert toggle drives both: Expert on ⇒ manual gearbox,
  // off ⇒ automatic.
  const [transmissionMode, setTransmissionMode] = useState<TransmissionMode>(initial.transmissionMode);
  const [expertMode, setExpertMode] = useState(initial.expertMode);
  // handleGlobalKeys is registered once inside the world-init effect; it reads the live Expert
  // flag through this ref rather than forcing that effect to re-run on every toggle.
  const expertModeRef = useRef(expertMode);
  expertModeRef.current = expertMode;
  // Chosen vehicle (chhakaro / car / bike) — picked on the start screen or in the garage.
  const [vehicleType, setVehicleType] = useState<VehicleType>(initial.vehicleType);
  const vehicleName = VEHICLE_SPECS[vehicleType].nameGujarati;
  // Every trip starts in Gandhinagar; currentLocation then follows the vehicle.
  const [currentLocation, setCurrentLocation] = useState<LocationData>(START_LOCATION);
  const [nearbyLandmark, setNearbyLandmark] = useState<LocationData | null>(null);
  const [nearbyFacility, setNearbyFacility] = useState<{ type: 'petrol' | 'garage' | 'toll'; name: string; distance: number } | null>(null);
  const [nearbyToll, setNearbyToll] = useState<{ name: string } | null>(null);
  const [isHeadlightOn, setIsHeadlightOn] = useState(true);
  const [isHazardOn, setIsHazardOn] = useState(false);
  const [isEngineOn, setIsEngineOn] = useState(true);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [totalKm, setTotalKm] = useState(initial.totalKm);

  // Progression
  const [coins] = useState(initial.coins);
  const [reputationStars, setReputationStars] = useState(initial.reputationStars);

  // Vehicle Health State
  const [vehicleHealth, setVehicleHealth] = useState<VehicleHealthState>({
    fuelPercent: 100,
    maxFuelLiters: 15,
    currentFuelLiters: 15,
    fuelConsumptionRateKm: 0,
    engineTempCelsius: 82,
    isOverheating: false,
    hasPuncture: false,
    punctureWheel: null,
    headlightWorking: true,
    hornWorking: true,
    conditionScore: 95,
  });

  // User Progress
  const [visitedLocations, setVisitedLocations] = useState<string[]>(initial.visitedLocations);
  const [completedMissions, setCompletedMissions] = useState<string[]>(initial.completedMissions);

  // Mirrors visitedLocations for recordVisit, which is called from the once-registered
  // world.onLocationChange closure — a plain read of visitedLocations there would be frozen
  // at its initial value.
  const visitedLocationsRef = useRef<string[]>(initial.visitedLocations);
  useEffect(() => {
    visitedLocationsRef.current = visitedLocations;
  }, [visitedLocations]);

  // Passenger & Active Mission
  const [activePassenger, setActivePassenger] = useState<PassengerData | null>(null);
  const [activeMission, setActiveMission] = useState<MissionData | null>(null);

  // Turn-by-turn nav. `navTarget` is an explicit user destination ("માર્ગ બતાવો"); a mission
  // drop is the implicit second source. Precedence: explicit > mission.
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);
  const [navLive, setNavLive] = useState<NavState | null>(null);
  // world.onVehicleMove is registered once, so it reads the derived target via a ref.
  const navTargetRef = useRef<NavTarget | null>(null);
  const navTickRef = useRef(0);
  const navStartDistRef = useRef<number | null>(null);
  const navCuesRef = useRef({ start: false, half: false, near: false });

  const effectiveNavTargetId: string | null = navTarget?.locationId ?? activeMission?.dropLocationId ?? null;

  useEffect(() => {
    navTargetRef.current = effectiveNavTargetId ? { locationId: effectiveNavTargetId } : null;
    navStartDistRef.current = null;
    navCuesRef.current = { start: false, half: false, near: false };
    if (!effectiveNavTargetId) setNavLive(null);
  }, [effectiveNavTargetId]);

  // Live refs that always mirror the active mission/passenger. The GameWorld proximity
  // callbacks (onLandmarkApproach / onLocationChange) are registered exactly once, so a plain
  // closure over `activeMission` would freeze at its first value (null).
  const activeMissionRef = useRef<MissionData | null>(null);
  const activePassengerRef = useRef<PassengerData | null>(null);

  useEffect(() => {
    activeMissionRef.current = activeMission;
  }, [activeMission]);

  useEffect(() => {
    activePassengerRef.current = activePassenger;
  }, [activePassenger]);

  // Customization
  const [customization, setCustomization] = useState<ChhakaroCustomization>(initial.customization);

  // Modals
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isPhotoModeOpen, setIsPhotoModeOpen] = useState(false);
  const [inspectingLandmark, setInspectingLandmark] = useState<LocationData | null>(null);

  // The single reward / event feedback channel: one banner style, one sound per tone. Uses
  // only refs + the stable setter, so it is safe to call from the once-registered world
  // callbacks.
  const [notice, setNotice] = useState<NotifyMessage | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeSeq = useRef(0);

  const notify = ({ text, tone = 'info', speak = true, ttlMs = 6000 }: NotifyOptions) => {
    noticeSeq.current += 1;
    setNotice({ id: noticeSeq.current, text, tone });
    const s = toneSound(tone);
    if (s === 'chime') soundManager.playChime();
    else if (s === 'horn') soundManager.playHorn(1);
    // Narration goes through the shared queue so lines never overlap; the short tone SFX
    // above stays on soundManager.
    if (speak) voiceQueue.enqueue(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), ttlMs);
  };

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  // Initialize Three.js Game World. Canvas-drawn signboards are rasterised once at build
  // time, so wait for the Hind Vadodara webfont before building (bounded, so a blocked font
  // CDN can never hang the game).
  useEffect(() => {
    if (!isGameStarted || !containerRef.current) return;
    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const fontsReady = Promise.race([
      Promise.all([
        document.fonts?.load('700 48px "Hind Vadodara"', 'ગુજરાત'),
        document.fonts?.load('400 48px "Hind Vadodara"', 'ગુજરાત'),
      ]).catch(() => undefined),
      new Promise((r) => setTimeout(r, 2500)),
    ]);

    fontsReady.then(() => {
      if (cancelled || !containerRef.current) return;
      cleanup = initWorld(containerRef.current);
    });

    return () => {
      cancelled = true;
      cleanup?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGameStarted]);

  const initWorld = (container: HTMLElement) => {
    // transmissionMode / vehicleType (not initial.*) so start-screen choices are already live
    // when the world spins up; mid-game changes go through the world's setters.
    const world = new GameWorld(
      container,
      customization,
      initial.totalKm * 1000,
      transmissionMode,
      vehicleType,
      START_LOCATION,
    );
    worldRef.current = world;
    canvasRef.current = world.canvas;

    world.startVehicleEngine();

    // Callbacks (GameWorld throttles these to ~10 Hz / ~4 Hz)
    world.onSpeedUpdate = (newSpeed, newRpm) => {
      setSpeed(newSpeed);
      setRpm(newRpm);
      setTotalKm(Math.round(world.totalDistanceDriven / 10) / 100);
    };

    world.onGearChange = (g) => setGear(g);

    // The WeatherDirector re-picks weather as the player drives between regions / times of
    // day; mirror it into React so the HUD icon stays truthful.
    world.onWeatherChange = (w) => setWeather(w);

    // Procedural road incident just appeared ~40 units ahead — warn the player (banner only).
    world.onIncident = (i) => notify({ text: INCIDENT_TEXT[i.kind], tone: 'warn', speak: false });

    // Turn-by-turn: throttled straight-line route to the target zone centre + one-shot
    // Gujarati voice cues at set / ~50% / ~90% / arrival.
    world.onVehicleMove = (x, z, heading) => {
      const target = navTargetRef.current;
      if (!target) return;
      const now = performance.now();
      if (now - navTickRef.current < 250) return; // ~4 Hz
      navTickRef.current = now;

      const loc = GUJARAT_LOCATIONS.find((l) => l.id === target.locationId);
      if (!loc) return;
      const ns = navState({ x, z }, heading, loc.worldPosition, loc.zoneRadius);
      setNavLive(ns);

      if (navStartDistRef.current == null) navStartDistRef.current = ns.distanceM;
      const startDist = navStartDistRef.current;
      const cues = navCuesRef.current;
      if (!cues.start) {
        cues.start = true;
        voiceQueue.enqueue(
          `${loc.nameGujarati} તરફ ચાલો — અંતર આશરે ${(ns.distanceM / 1000).toFixed(1)} કિમી`,
          { dedupeKey: `nav-start:${loc.id}` },
        );
      } else if (!cues.half && ns.distanceM < startDist * 0.5) {
        cues.half = true;
        voiceQueue.enqueue(`અડધો રસ્તો કપાયો — ${loc.nameGujarati} નજીક આવે છે`, {
          dedupeKey: `nav-half:${loc.id}`,
        });
      } else if (!cues.near && ns.distanceM < loc.zoneRadius * 1.8) {
        cues.near = true;
        voiceQueue.enqueue(`લગભગ પહોંચી ગયા! ${loc.nameGujarati} સામે જ છે`, {
          dedupeKey: `nav-near:${loc.id}`,
        });
      }

      if (ns.arrived) {
        notify({ text: `પહોંચી ગયા! ${loc.nameGujarati}`, tone: 'reward' });
        checkMissionCompletion(loc.id);
        // Clear an explicit destination once reached (mission targets self-clear).
        setNavTarget((cur) => (cur && cur.locationId === loc.id ? null : cur));
      }
    };

    world.onTimeOfDayUpdate = (timeState) => setTimeOfDay(timeState);
    world.onHealthUpdate = (health) => setVehicleHealth(health);
    world.onFacilityApproach = (facility) => setNearbyFacility(facility ? { ...facility, distance: 10 } : null);
    world.onTollApproach = (t) => setNearbyToll(t);

    world.onLandmarkApproach = (loc) => {
      setNearbyLandmark(loc);
      triggerLandmarkWelcome(loc);
      checkMissionCompletion(loc.id);
    };

    world.onLocationChange = (loc) => {
      setCurrentLocation(loc);
      recordVisit(loc.id);
      checkMissionCompletion(loc.id);
    };

    // Keyboard Shortcuts
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'm') {
        setIsMapOpen((prev) => !prev);
      } else if (key === 't') {
        const isFrozen = world.toggleFreezeDay();
        notify({
          text: isFrozen
            ? '☀️ દિવસ ફ્રીઝ: બપોરનો તડકો લૉક થયો (Day Frozen)'
            : '🔄 ગતિશીલ ૨૪-કલાક ચક્ર શરૂ થયું (Dynamic Cycle)',
          tone: 'info',
          speak: false,
          ttlMs: 3000,
        });
      } else if (key === 'q') {
        // Expert-only: shift down one gear.
        if (!expertModeRef.current) return;
        world.shiftDown();
      } else if (key === 'e') {
        // Expert mode repurposes E as shift-up; otherwise E opens the nearby History Card.
        if (expertModeRef.current) {
          world.shiftUp();
        } else if (world.nearbyLandmark) {
          setInspectingLandmark(world.nearbyLandmark);
        }
      } else if (key === 'i') {
        // Expert-only: manual engine start/stop. GameWorld refuses to stop above 1 km/h.
        if (!expertModeRef.current) return;
        handleToggleEngine();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeys);
      world.destroy();
      worldRef.current = null;
      canvasRef.current = null;
    };
  };

  // Idle nudge: parked (~8 s) inside a visited zone → one suggestion toward the nearest
  // unvisited place, at most once per zone per session.
  const nudgedZonesRef = useRef<Set<string>>(new Set());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (!isGameStarted || speed >= 1) return;
    if (!visitedLocations.includes(currentLocation.id)) return;
    if (nudgedZonesRef.current.has(currentLocation.id)) return;

    idleTimerRef.current = setTimeout(() => {
      const from = worldRef.current?.vehiclePos ?? currentLocation.worldPosition;
      const next = nearestUnvisited(GUJARAT_LOCATIONS, visitedLocationsRef.current, { x: from.x, z: from.z });
      if (!next) return;
      nudgedZonesRef.current.add(currentLocation.id);
      notify({ text: `અહીંથી ${next.nameGujarati} નજીક છે — ત્યાં ફરવા જઈએ?`, tone: 'info' });
    }, 8000);

    return () => {
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [isGameStarted, speed, currentLocation, visitedLocations]);

  // Persist the GameProgress slice on every change. saveProgress debounces the actual
  // localStorage write (~500ms). Vehicle sim state is deliberately excluded.
  useEffect(() => {
    saveProgress({
      coins,
      reputationStars,
      visitedLocations,
      completedMissions,
      customization,
      totalKm,
      lastLocationId: currentLocation.id,
      transmissionMode,
      expertMode,
      vehicleType,
    });
  }, [
    coins,
    reputationStars,
    visitedLocations,
    completedMissions,
    customization,
    totalKm,
    currentLocation,
    transmissionMode,
    expertMode,
    vehicleType,
  ]);

  // Force any pending debounced write to disk before the tab unloads.
  useEffect(() => {
    const onHide = () => flushProgress();
    window.addEventListener('beforeunload', onHide);
    return () => window.removeEventListener('beforeunload', onHide);
  }, []);

  // The single entry point for "the player is now at locId". Safe to call from the stale
  // world.onLocationChange closure: the guard reads visitedLocationsRef, and the ref is bumped
  // synchronously so a paired callback fire is a no-op.
  const recordVisit = (locId: string) => {
    if (visitedLocationsRef.current.includes(locId)) return;
    visitedLocationsRef.current = [...visitedLocationsRef.current, locId];
    setVisitedLocations((prev) => (prev.includes(locId) ? prev : [...prev, locId]));
    notify({ text: `📍 નવું સ્થળ જોયું: ${locName(locId)}`, tone: 'reward', speak: false });
  };

  const triggerLandmarkWelcome = (loc: LocationData) => {
    notify({ text: `આપણે હવે ${loc.nameGujarati} પહોંચી ગયા છીએ! ${loc.tagline}`, tone: 'info', ttlMs: 8000 });
  };

  // Check if passenger mission arrived at destination. Invoked from the once-registered
  // GameWorld callbacks, so it reads the live refs. onLandmarkApproach AND onLocationChange
  // both fire for the same arrival, so the ref is cleared synchronously at the top of the
  // completion branch: the second call then sees a null mission and is a no-op.
  const checkMissionCompletion = (arrivedLocationId: string) => {
    const mission = activeMissionRef.current;
    if (isMissionComplete(mission, arrivedLocationId)) {
      const passenger = activePassengerRef.current;
      activeMissionRef.current = null;
      activePassengerRef.current = null;

      setReputationStars((s) => Math.min(5.0, Number((s + 0.1).toFixed(1))));
      setCompletedMissions((m) => [...m, mission.id]);

      const successMsg = `શાબાશ! મુસાફર ${passenger?.nameGujarati || ''} ને મુકામે પહોંચાડ્યા!`;
      soundManager.playAchievementSound();
      notify({ text: `🎉 ${successMsg} (+0.1 ★)`, tone: 'info', speak: true });

      // Clear passenger from vehicle; the mission-derived nav arrow drops with the mission.
      setActivePassenger(null);
      setActiveMission(null);
      worldRef.current?.setPassenger(null);
    }
  };

  const handleAcceptMission = (mission: MissionData) => {
    const passenger = mission.passenger ?? null;
    setActiveMission(mission);
    setActivePassenger(passenger);
    // Keep the refs live this same tick so a fast-travel fired before the sync effect
    // commits still sees the accepted mission.
    activeMissionRef.current = mission;
    activePassengerRef.current = passenger;
    if (passenger) worldRef.current?.setPassenger(passenger);
    notify({ text: `${mission.titleGujarati} — ચાલો ${locName(mission.dropLocationId)} તરફ!`, tone: 'reward' });
  };

  const handleCancelMission = () => {
    setActiveMission(null);
    setActivePassenger(null);
    activeMissionRef.current = null;
    activePassengerRef.current = null;
    worldRef.current?.setPassenger(null);
    notify({ text: 'મિશન રદ થયું.', tone: 'info', speak: false });
  };

  const handleRepair = () => {
    worldRef.current?.repairPunctureAndCool();
    notify({ text: '🔧 પંચર રીપેર અને એન્જિન ઠંડુ થયું!', tone: 'reward', speak: false });
  };

  // New trip or resume — both start in Gandhinagar (resume keeps visited places, missions,
  // odometer and garage choices).
  const handleStartGame = (isResume = false) => {
    setCurrentLocation(START_LOCATION);
    recordVisit(START_LOCATION.id);
    setIsGameStarted(true);

    soundManager.startEngine();
    voiceQueue.enqueue(
      isResume
        ? `ફરી સ્વાગત છે! આપણું ${vehicleName} ${START_LOCATION.nameGujarati} થી આગળ વધે છે. જય ગરવી ગુજરાત!`
        : `ચાલો! આપણું ${vehicleName} રાજધાની ${START_LOCATION.nameGujarati} થી ઉપડ્યું! જય ગરવી ગુજરાત!`,
    );
  };

  const hasSave = initial.visitedLocations.length > 1 || initial.totalKm > 0;

  const handleToggleMute = () => setIsMuted(soundManager.toggleMute());

  const handleToggleHeadlight = () => {
    if (worldRef.current) setIsHeadlightOn(worldRef.current.toggleHeadlight());
  };

  const handleToggleHazard = () => {
    if (worldRef.current) setIsHazardOn(worldRef.current.toggleHazardLights());
  };

  // Expert mode ⇔ manual gearbox. Flipping it also switches the transmission (and tells the
  // running world), so the gauge badge and shift behaviour follow the one toggle.
  const handleToggleExpertMode = () => {
    const next = !expertMode;
    const mode: TransmissionMode = next ? 'manual' : 'auto';
    setExpertMode(next);
    setTransmissionMode(mode);
    worldRef.current?.setTransmissionMode(mode);
  };

  const handleChangeVehicle = (v: VehicleType) => {
    setVehicleType(v);
    const world = worldRef.current;
    if (world && world.vehicleType !== v) {
      world.setVehicleType(v);
      notify({ text: `${VEHICLE_SPECS[v].nameGujarati} તૈયાર છે — ચાલો!`, tone: 'reward', speak: false, ttlMs: 3000 });
    }
  };

  const handleShiftUp = () => worldRef.current?.shiftUp();
  const handleShiftDown = () => worldRef.current?.shiftDown();

  const handleToggleEngine = () => {
    const world = worldRef.current;
    if (!world) return;
    const wasOn = world.isEngineOn;
    const nowOn = world.toggleEngine();
    setIsEngineOn(nowOn);
    if (wasOn && nowOn) {
      // Engine stayed on: refused to stop while still rolling.
      notify({ text: `${VEHICLE_SPECS[world.vehicleType].nameGujarati} ઊભું રાખીને એન્જિન બંધ કરો`, tone: 'info', speak: false, ttlMs: 3000 });
    } else if (!wasOn && !nowOn) {
      notify({ text: 'એન્જિન ચાલુ કરવા વાહન ઊભું રાખો અને ગિયર N કે R માં નાખો', tone: 'info', speak: false, ttlMs: 3500 });
    } else {
      notify({ text: nowOn ? '🔑 એન્જિન ચાલુ' : '🔑 એન્જિન બંધ', tone: 'info', speak: false, ttlMs: 2500 });
    }
  };

  const handleChangeCamera = () => {
    if (!worldRef.current) return;
    const modes: CameraMode[] = ['chase', 'hood', 'passenger', 'cinematic', 'drone'];
    const nextMode = modes[(modes.indexOf(cameraMode) + 1) % modes.length];
    worldRef.current.setCameraMode(nextMode);
    setCameraMode(nextMode);
  };

  const handleChangeWeather = () => {
    if (!worldRef.current) return;
    const weathers: WeatherType[] = ['sunny', 'sunset', 'night', 'rain', 'fog'];
    const nextWeather = weathers[(weathers.indexOf(weather) + 1) % weathers.length];
    // Manual pick wins for ~one cycle-distance (1400 m), then the region/time
    // WeatherDirector resumes control. onWeatherChange mirrors it back into React state.
    worldRef.current.setManualWeather(nextWeather);
  };

  const handleToggleFreezeDay = () => {
    if (!worldRef.current) return;
    const isFrozen = worldRef.current.toggleFreezeDay();
    notify({
      text: isFrozen
        ? '☀️ દિવસ ફ્રીઝ: બપોરનો તેજસ્વી તડકો લૉક થયો (Day Frozen)'
        : '🔄 ગતિશીલ ૨૪-કલાક સૂર્ય ચક્ર શરૂ થયું (Dynamic Cycle)',
      tone: 'info',
      speak: false,
      ttlMs: 3000,
    });
  };

  const handleSetTimeFreezeMode = (mode: TimeFreezeMode) => {
    if (!worldRef.current) return;
    worldRef.current.setTimeFreezeMode(mode);
    const text: Record<TimeFreezeMode, string> = {
      day: '☀️ દિવસ ફ્રીઝ: બપોરનો તડકો (Freeze Day - 12:30 PM)',
      dynamic: '🔄 ગતિશીલ ૨૪-કલાક સમય ચક્ર (Dynamic 24h Driving Cycle)',
      sunrise: '🌅 સૂર્યોદય ફ્રીઝ: સોનેરી સવાર (Freeze Sunrise - 06:00 AM)',
      sunset: '🌇 સંધ્યાકાળ ફ્રીઝ: લાલચોળ સાંજ (Freeze Sunset - 07:15 PM)',
      night: '🌌 ચાંદની રાત ફ્રીઝ: શાંત મધ્યરાત્રિ (Freeze Night - 10:30 PM)',
    };
    notify({ text: text[mode], tone: 'info', speak: false, ttlMs: 3000 });
  };

  // "Rest till morning" — resume the live cycle (clearing any weather-induced freeze), then
  // let the world skip its own phase clock forward to the next 06:00.
  const handleRest = () => {
    const world = worldRef.current;
    if (!world) return;
    world.setTimeFreezeMode('dynamic');
    world.clearWeatherClockFreeze();
    world.advanceToHour(6);
    notify({ text: 'સવાર પડી — તાજામાજા થઈને ચાલો!', tone: 'reward' });
  };

  const handleFastTravel = (loc: LocationData) => {
    if (!worldRef.current) return;
    worldRef.current.teleportToLocation(loc);
    setCurrentLocation(loc);
    recordVisit(loc.id);
    triggerLandmarkWelcome(loc);
    checkMissionCompletion(loc.id);
  };

  const handleSetDestination = (loc: LocationData) => {
    setNavTarget({ locationId: loc.id });
    notify({ text: `${loc.nameGujarati} તરફ ચાલો — માર્ગ બતાવું છું`, tone: 'info' });
  };

  const handleUpdateCustomization = (custom: ChhakaroCustomization) => {
    setCustomization(custom);
    worldRef.current?.updateCustomization(custom);
  };

  const handleMobileControl = (key: keyof VehicleControls, state: boolean) => {
    worldRef.current?.setControlState(key, state);
  };

  const navTargetLoc = effectiveNavTargetId ? GUJARAT_LOCATIONS.find((l) => l.id === effectiveNavTargetId) : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Start / Launch Screen */}
      {!isGameStarted && (
        <StartScreen
          onStartGame={() => handleStartGame(false)}
          hasSave={hasSave}
          onResume={() => handleStartGame(true)}
          vehicleType={vehicleType}
          onChangeVehicle={handleChangeVehicle}
          expertMode={expertMode}
          onToggleExpertMode={handleToggleExpertMode}
          onResetProgress={() => {
            clearProgress();
            window.location.reload();
          }}
        />
      )}

      {/* Unified reward / event notice — one style, tone-colored border. Keyed by notice.id
          so a repeat notify() re-triggers the entry animation. */}
      {isGameStarted && notice && (
        <div
          key={notice.id}
          className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 border-2 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in pointer-events-none max-w-lg text-center ${
            notice.tone === 'reward'
              ? 'border-amber-400 text-amber-300'
              : notice.tone === 'warn'
                ? 'border-rose-400 text-rose-300'
                : 'border-slate-400 text-slate-200'
          }`}
        >
          <span className="text-2xl">{notice.tone === 'warn' ? '⚠️' : currentLocation.icon}</span>
          <div className="text-xs sm:text-sm font-bold">{notice.text}</div>
        </div>
      )}

      {/* Turn-by-turn nav banner — explicit destination or mission drop */}
      {isGameStarted && navTargetLoc && navLive && (
        <NavBanner
          targetName={navTargetLoc.nameGujarati}
          distanceM={navLive.distanceM}
          relativeDeg={navLive.relativeDeg}
          onCancel={() => setNavTarget(null)}
        />
      )}

      {/* Highway toll plaza prompt — the boom gate rises, then it stays quiet for 300 m. */}
      {isGameStarted && nearbyToll && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-md bg-slate-950/90 border-2 border-amber-400 p-4 rounded-3xl shadow-2xl flex items-center justify-between gap-4 animate-bounce pointer-events-auto">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl shrink-0">🛣️</span>
            <div className="min-w-0">
              <h4 className="font-bold text-amber-300 text-sm truncate">{nearbyToll.name}</h4>
              <p className="text-xs text-slate-300">FASTag લેન — ગેટ ખૂલશે, આગળ વધો</p>
            </div>
          </div>
          <button
            onClick={() => {
              worldRef.current?.payToll();
              setNearbyToll(null);
              notify({ text: '🧾 FASTag ટોલ પાસ — સફર ચાલુ!', tone: 'info' });
            }}
            className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-950 whitespace-nowrap shadow-lg shrink-0"
          >
            આગળ વધો
          </button>
        </div>
      )}

      {/* Primary In-Game HUD */}
      {isGameStarted && (
        <>
          <HUD
            speed={speed}
            rpm={rpm}
            gear={gear}
            transmissionMode={transmissionMode}
            vehicleType={vehicleType}
            currentLocation={currentLocation}
            nearbyLandmark={nearbyLandmark}
            visitedLocations={visitedLocations}
            worldRef={worldRef}
            navTargetId={effectiveNavTargetId}
            nearbyFacility={nearbyFacility}
            isEngineOn={isEngineOn}
            isHeadlightOn={isHeadlightOn}
            isHazardOn={isHazardOn}
            cameraMode={cameraMode}
            weather={weather}
            timeOfDay={timeOfDay}
            healthState={vehicleHealth}
            activePassenger={activePassenger}
            activeMission={activeMission}
            reputationStars={reputationStars}
            isMuted={isMuted}
            totalKm={totalKm}
            onToggleMute={handleToggleMute}
            onToggleHeadlight={handleToggleHeadlight}
            onToggleHazard={handleToggleHazard}
            onChangeCamera={handleChangeCamera}
            onChangeWeather={handleChangeWeather}
            onToggleFreezeDay={handleToggleFreezeDay}
            onSetTimeFreezeMode={handleSetTimeFreezeMode}
            onRest={handleRest}
            onOpenMap={() => setIsMapOpen(true)}
            onOpenGarage={() => setIsGarageOpen(true)}
            onOpenMissions={() => setIsMissionsOpen(true)}
            onInspectLandmark={(loc) => setInspectingLandmark(loc)}
            onCapturePhoto={() => setIsPhotoModeOpen(true)}
            onRepair={handleRepair}
            expertMode={expertMode}
            onShiftUp={handleShiftUp}
            onShiftDown={handleShiftDown}
            onToggleEngine={handleToggleEngine}
          />

          {/* On-screen Mobile Pedals & Steer Controls */}
          <MobileControls
            onControlChange={handleMobileControl}
            onChangeCamera={handleChangeCamera}
            expertMode={expertMode}
            onShift={(dir) => (dir === 'up' ? handleShiftUp() : handleShiftDown())}
          />
        </>
      )}

      {/* Modals & Dialogs */}
      <GujaratMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        currentLocation={currentLocation}
        visitedLocations={visitedLocations}
        onFastTravel={handleFastTravel}
        onSetDestination={handleSetDestination}
      />

      <PassengerMissionModal
        isOpen={isMissionsOpen}
        onClose={() => setIsMissionsOpen(false)}
        currentLocation={currentLocation}
        availableMissions={GUJARAT_MISSIONS}
        activeMission={activeMission}
        activePassenger={activePassenger}
        coins={coins}
        reputationStars={reputationStars}
        completedMissions={completedMissions}
        onAcceptMission={handleAcceptMission}
        onCancelMission={handleCancelMission}
      />

      <PhotoModeModal
        isOpen={isPhotoModeOpen}
        onClose={() => setIsPhotoModeOpen(false)}
        currentLocation={currentLocation}
        canvasRef={canvasRef}
        visitedCount={visitedLocations.length}
        totalCount={GUJARAT_LOCATIONS.length}
        totalKm={totalKm}
        phaseGujarati={timeOfDay?.phaseGujarati ?? ''}
        routeVisitedIds={visitedLocations}
      />

      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        customization={customization}
        onUpdateCustomization={handleUpdateCustomization}
        vehicleType={vehicleType}
        onChangeVehicle={handleChangeVehicle}
      />

      {inspectingLandmark && (
        <LandmarkInspectModal
          isOpen={true}
          onClose={() => setInspectingLandmark(null)}
          location={inspectingLandmark}
          isVisited={visitedLocations.includes(inspectingLandmark.id)}
          onMarkVisited={(locId) => recordVisit(locId)}
        />
      )}
    </div>
  );
}
