import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameWorld } from './world/GameWorld';
import { HUD } from './components/HUD';
import { KanjiKakaGuide } from './components/KanjiKakaGuide';
import { GujaratMapModal } from './components/GujaratMapModal';
import { PassportModal } from './components/PassportModal';
import { FoodPassportModal } from './components/FoodPassportModal';
import { GarageModal } from './components/GarageModal';
import { LandmarkInspectModal } from './components/LandmarkInspectModal';
import { PassengerMissionModal } from './components/PassengerMissionModal';
import { SouvenirShopModal } from './components/SouvenirShopModal';
import { QuizModal } from './components/QuizModal';
import { PhotoModeModal } from './components/PhotoModeModal';
import { MobileControls } from './components/MobileControls';
import { StartScreen } from './components/StartScreen';
import { RoadsideEncounterModal } from './components/RoadsideEncounterModal';
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
  SouvenirItem,
  CulturalQuiz,
  TimeFreezeMode,
  RoadsideEncounter,
  PassportStampRecord,
  NavTarget,
} from './types';
import { GUJARAT_LOCATIONS } from './data/locations';
import { GUJARAT_MISSIONS } from './data/missions';
import { GUJARATI_SOUVENIRS } from './data/souvenirs';
import { GUJARATI_QUIZZES } from './data/quizzes';
import { soundManager } from './audio/SoundManager';
import { evaluateAchievements } from './state/achievements';
import { isMissionComplete } from './state/missionMatching';
import { loadProgress, saveProgress, clearProgress, flushProgress } from './state/persistence';
import { NotifyMessage, NotifyOptions, toneSound } from './state/notify';
import { navState, NavState } from './state/navigation';
import { nearestUnvisited } from './state/exploration';

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
  const [currentLocation, setCurrentLocation] = useState<LocationData>(
    GUJARAT_LOCATIONS.find((l) => l.id === initial.lastLocationId) ?? GUJARAT_LOCATIONS[0],
  );
  const [nearbyLandmark, setNearbyLandmark] = useState<LocationData | null>(null);
  const [nearbyFacility, setNearbyFacility] = useState<{ type: 'petrol' | 'garage' | 'toll'; name: string; distance: number } | null>(null);
  const [nearbyEncounter, setNearbyEncounter] = useState<RoadsideEncounter | null>(null);
  const [activeEncounterModal, setActiveEncounterModal] = useState<RoadsideEncounter | null>(null);
  const [isHeadlightOn, setIsHeadlightOn] = useState(true);
  const [isHazardOn, setIsHazardOn] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [totalKm, setTotalKm] = useState(initial.totalKm);

  // Economy & Progression
  const [coins, setCoins] = useState(initial.coins);
  const [reputationStars, setReputationStars] = useState(initial.reputationStars);

  // Vehicle Health State
  const [vehicleHealth, setVehicleHealth] = useState<VehicleHealthState>({
    fuelPercent: 88,
    maxFuelLiters: 15,
    currentFuelLiters: 13.2,
    fuelConsumptionRateKm: 0.045,
    engineTempCelsius: 82,
    isOverheating: false,
    hasPuncture: false,
    punctureWheel: null,
    headlightWorking: true,
    hornWorking: true,
    conditionScore: 95,
  });

  // User Progress & Collection
  const [visitedLocations, setVisitedLocations] = useState<string[]>(initial.visitedLocations);
  const [discoveredFoods, setDiscoveredFoods] = useState<string[]>(initial.discoveredFoods);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(initial.unlockedAchievements);
  const [collectedSouvenirs, setCollectedSouvenirs] = useState<string[]>(initial.collectedSouvenirs);
  const [completedMissions, setCompletedMissions] = useState<string[]>(initial.completedMissions);
  const [quizScore, setQuizScore] = useState(initial.quizScore);
  const [stampMeta, setStampMeta] = useState<Record<string, PassportStampRecord>>(initial.stampMeta);

  // Mirrors visitedLocations for recordVisit, which is called from the once-registered
  // world.onLocationChange closure — a plain read of visitedLocations there would be frozen
  // at its initial value and re-award coins on every zone re-entry.
  const visitedLocationsRef = useRef<string[]>(initial.visitedLocations);
  useEffect(() => {
    visitedLocationsRef.current = visitedLocations;
  }, [visitedLocations]);

  // Derived quiz for current location
  const currentQuiz: CulturalQuiz | null =
    (GUJARATI_QUIZZES || []).find((q) => q.locationId === currentLocation?.id) ?? null;

  // Derived souvenirs for current location
  const currentLocationSouvenirs = (GUJARATI_SOUVENIRS || [])
    .filter((s) => s.locationId === currentLocation?.id)
    .map((s) => ({ ...s, acquired: (collectedSouvenirs || []).includes(s.id) }));

  // Passenger & Active Mission
  const [activePassenger, setActivePassenger] = useState<PassengerData | null>(null);
  const [activeMission, setActiveMission] = useState<MissionData | null>(null);

  // Turn-by-turn nav. `navTarget` is the chosen destination (a mission drop or "માર્ગ બતાવો");
  // `navLive` is the throttled per-frame route (distance + heading-relative angle + arrived).
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);
  const [navLive, setNavLive] = useState<NavState | null>(null);
  // world.onVehicleMove is registered once, so it reads navTarget through a ref.
  const navTargetRef = useRef<NavTarget | null>(null);
  const navTickRef = useRef(0);
  const navStartDistRef = useRef<number | null>(null);
  const navCuesRef = useRef({ start: false, half: false, near: false });

  useEffect(() => {
    navTargetRef.current = navTarget;
    navStartDistRef.current = null;
    navCuesRef.current = { start: false, half: false, near: false };
    if (!navTarget) setNavLive(null);
  }, [navTarget]);

  // Live refs that always mirror the active mission/passenger. The GameWorld proximity
  // callbacks (onLandmarkApproach / onLocationChange) are registered exactly once, in the
  // effect below, so a plain closure over `activeMission` would freeze at its first value
  // (null). checkMissionCompletion reads these refs instead. A useEffect sync is the robust
  // choice — imperative writes in the handlers are only belt-and-braces.
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
  const [isPassportOpen, setIsPassportOpen] = useState(false);
  const [isFoodOpen, setIsFoodOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);
  const [isKakaOpen, setIsKakaOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isSouvenirsOpen, setIsSouvenirsOpen] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [isPhotoModeOpen, setIsPhotoModeOpen] = useState(false);
  const [inspectingLandmark, setInspectingLandmark] = useState<LocationData | null>(null);
  const [lastKakaNarration, setLastKakaNarration] = useState<string>('');

  // The single reward / event feedback channel. Every path that used to pair an ad-hoc
  // setFloatingBanner(...) with a loose soundManager.* call now calls notify() — one banner
  // style, one sound per tone. Uses only refs + the stable setter, so it is safe to call
  // from the once-registered world callbacks.
  const [notice, setNotice] = useState<NotifyMessage | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeSeq = useRef(0);

  const notify = ({ text, tone = 'info', speak = true, ttlMs = 6000 }: NotifyOptions) => {
    noticeSeq.current += 1;
    setNotice({ id: noticeSeq.current, text, tone });
    const s = toneSound(tone);
    if (s === 'chime') soundManager.playChime();
    else if (s === 'horn') soundManager.playHorn(1);
    if (speak) soundManager.speakGujaratiTextFallback(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), ttlMs);
  };

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  // Initialize Three.js Game World
  useEffect(() => {
    if (!isGameStarted || !containerRef.current) return;

    const world = new GameWorld(containerRef.current, customization, initial.totalKm * 1000);
    worldRef.current = world;
    canvasRef.current = world.canvas;

    world.startVehicleEngine();

    // Callbacks
    world.onSpeedUpdate = (newSpeed, newRpm) => {
      setSpeed(newSpeed);
      setRpm(newRpm);
      setTotalKm(world.totalDistanceDriven / 1000);
    };

    // Turn-by-turn: throttled straight-line route to the target zone centre + one-shot
    // Gujarati voice cues at set / ~50% / ~90% / arrival. navTarget is read via its ref
    // because this callback is registered exactly once.
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
        soundManager.speakGujaratiTextFallback(
          `${loc.nameGujarati} તરફ ચાલો — અંતર આશરે ${(ns.distanceM / 1000).toFixed(1)} કિમી`,
        );
      } else if (!cues.half && ns.distanceM < startDist * 0.5) {
        cues.half = true;
        soundManager.speakGujaratiTextFallback(`અડધો રસ્તો કપાયો — ${loc.nameGujarati} નજીક આવે છે`);
      } else if (!cues.near && ns.distanceM < loc.zoneRadius * 1.8) {
        cues.near = true;
        soundManager.speakGujaratiTextFallback(`લગભગ પહોંચી ગયા! ${loc.nameGujarati} સામે જ છે`);
      }

      if (ns.arrived) {
        notify({ text: `પહોંચી ગયા! ${loc.nameGujarati}`, tone: 'reward' });
        checkMissionCompletion(loc.id);
        setNavTarget(null);
      }
    };

    world.onTimeOfDayUpdate = (timeState) => {
      setTimeOfDay(timeState);
    };

    world.onHealthUpdate = (health) => {
      setVehicleHealth(health);
    };

    world.onFacilityApproach = (facility) => {
      setNearbyFacility(facility ? { ...facility, distance: 10 } : null);
    };

    world.onEncounterApproach = (encounter) => {
      setNearbyEncounter(encounter);
    };

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
      } else if (key === 'p') {
        setIsPassportOpen((prev) => !prev);
      } else if (key === 't') {
        if (worldRef.current) {
          const isFrozen = worldRef.current.toggleFreezeDay();
          notify({
            text: isFrozen
              ? '☀️ દિવસ ફ્રીઝ: બપોરનો તડકો લૉક થયો (Day Frozen)'
              : '🔄 ગતિશીલ ૨૪-કલાક ચક્ર શરૂ થયું (Dynamic Cycle)',
            tone: 'info',
            speak: false,
            ttlMs: 3000,
          });
        }
      } else if (key === 'e') {
        if (world.nearbyEncounter) {
          setActiveEncounterModal(world.nearbyEncounter);
        } else if (world.nearbyLandmark) {
          setInspectingLandmark(world.nearbyLandmark);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeys);
      world.destroy();
      worldRef.current = null;
      canvasRef.current = null;
    };
  }, [isGameStarted]);

  // Idle nudge: parked (~8 s) inside a visited zone → one Kaka suggestion toward the nearest
  // unvisited place, at most once per zone per session. speed is rounded, so a genuine stop
  // holds this effect stable and lets the timer complete; any movement re-runs it and the
  // `speed < 1` gate cancels the pending nudge.
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
      const next = nearestUnvisited(GUJARAT_LOCATIONS, visitedLocationsRef.current, {
        x: from.x,
        z: from.z,
      });
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

  // Unlock achievements in reaction to committed progress. Side effects (sound + banner)
  // are deliberately kept out of every setState updater so React 19 StrictMode's dev
  // double-invoke of updaters can't fire the achievement sound or banner twice.
  useEffect(() => {
    if (!isGameStarted) return;
    const earned = evaluateAchievements({ visitedLocations, discoveredFoods }) || [];
    const added = earned.filter((id) => !(unlockedAchievements || []).includes(id));
    if (added.length === 0) return;
    // playAchievementSound is distinct from the reward chime, so keep it and pass a silent
    // tone rather than letting notify double the audio.
    soundManager.playAchievementSound();
    notify({ text: `🏅 નવું અચીવમેન્ટ અનલૉક! (${added.length})`, tone: 'info', speak: false });
    // Union, never wholesale-replace: an id in the saved set that a future renamed/removed
    // rule no longer reproduces must not be silently dropped.
    setUnlockedAchievements((prev) => [...new Set([...prev, ...earned])]);
  }, [isGameStarted, visitedLocations, discoveredFoods, unlockedAchievements]);

  // Persist the GameProgress slice on every change. saveProgress debounces the actual
  // localStorage write (~500ms), so this staying cheap is what keeps driving smooth even
  // though totalKm ticks continuously. Vehicle sim state is deliberately excluded.
  useEffect(() => {
    saveProgress({
      coins,
      reputationStars,
      visitedLocations,
      discoveredFoods,
      unlockedAchievements,
      collectedSouvenirs,
      completedMissions,
      quizScore,
      customization,
      totalKm,
      lastLocationId: currentLocation.id,
      stampMeta,
    });
  }, [
    coins,
    reputationStars,
    visitedLocations,
    discoveredFoods,
    unlockedAchievements,
    collectedSouvenirs,
    completedMissions,
    quizScore,
    customization,
    totalKm,
    currentLocation,
    stampMeta,
  ]);

  // Force any pending debounced write to disk before the tab unloads.
  useEffect(() => {
    const onHide = () => flushProgress();
    window.addEventListener('beforeunload', onHide);
    return () => window.removeEventListener('beforeunload', onHide);
  }, []);

  // The single entry point for "the player is now at locId". Adds to visitedLocations and,
  // on the FIRST visit only, writes the passport stamp (date + odometer) and awards a
  // one-time reward. Safe to call from the stale world.onLocationChange closure: the guard
  // reads visitedLocationsRef, and the ref is bumped synchronously so a paired callback
  // fire (onLandmarkApproach + onLocationChange for the same arrival) is a no-op.
  // Achievement unlocking stays a reaction to committed progress (see the effect above) —
  // never a side effect inside a setState updater (StrictMode double-invokes updaters).
  const FIRST_VISIT_COINS = 100;

  const recordVisit = (locId: string) => {
    if (visitedLocationsRef.current.includes(locId)) return;
    const km = worldRef.current ? worldRef.current.totalDistanceDriven / 1000 : totalKm;
    visitedLocationsRef.current = [...visitedLocationsRef.current, locId];
    setVisitedLocations((prev) => (prev.includes(locId) ? prev : [...prev, locId]));
    setStampMeta((prev) =>
      prev[locId] ? prev : { ...prev, [locId]: { visitedAt: new Date().toISOString(), kilometersDriven: km } },
    );
    setCoins((c) => c + FIRST_VISIT_COINS);
    notify({ text: `📖 નવો પાસપોર્ટ સ્ટેમ્પ! +₹${FIRST_VISIT_COINS}`, tone: 'reward', speak: false });
  };

  const handleDiscoverFood = (foodId: string) => {
    setDiscoveredFoods((prev) => (prev.includes(foodId) ? prev : [...prev, foodId]));
  };

  const handleTasteAndCollectFood = (encounter: RoadsideEncounter) => {
    if (encounter.foodId) {
      handleDiscoverFood(encounter.foodId);
    }
    const coinsReward = encounter.rewardCoins ?? 35;
    setCoins((prev) => prev + coinsReward);
    setReputationStars((prev) => Math.min(5, prev + 1));
    const foodName = encounter.foodNameGujarati || encounter.foodNameEnglish || 'વાનગી';
    notify({
      text: `🍽️ વાહ! "${foodName}" નો સ્વાદ માણ્યો અને ફૂડ પાસપોર્ટમાં ઉમેરાઈ! (+₹${coinsReward})`,
      tone: 'reward',
      speak: false,
    });
    setActiveEncounterModal(null);
  };

  const triggerLandmarkWelcome = (loc: LocationData) => {
    const welcomeSpeech = `આપણે હવે ${loc.nameGujarati} પહોંચી ગયા છીએ! અહીં ${loc.famousFood} નો સ્વાદ લેવાનું ભૂલતા નહીં!`;
    setLastKakaNarration(welcomeSpeech);
    notify({ text: welcomeSpeech, tone: 'info', ttlMs: 8000 });
  };

  // Check if passenger mission arrived at destination. Invoked from the once-registered
  // GameWorld callbacks, so it reads the live refs — never the state — to avoid a stale
  // closure. onLandmarkApproach AND onLocationChange both fire for the same arrival, so the
  // ref is cleared synchronously at the top of the completion branch: the second call then
  // sees a null mission and is a no-op (no double award).
  const checkMissionCompletion = (arrivedLocationId: string) => {
    const mission = activeMissionRef.current;
    if (isMissionComplete(mission, arrivedLocationId)) {
      const passenger = activePassengerRef.current;
      activeMissionRef.current = null;
      activePassengerRef.current = null;

      const reward = mission.rewardCoins;
      setCoins((c) => c + reward);
      setReputationStars((s) => Math.min(5.0, Number((s + 0.1).toFixed(1))));
      setCompletedMissions((m) => [...m, mission.id]);

      const successMsg = `શાબાશ! મુસાફર ${passenger?.nameGujarati || ''} ને મુકામે પહોંચાડ્યા! ₹${reward} કમાયા!`;
      soundManager.playAchievementSound();
      notify({ text: `🎉 ${successMsg}`, tone: 'info', speak: true });

      // Clear passenger from vehicle + the nav arrow
      setActivePassenger(null);
      setActiveMission(null);
      setNavTarget(null);
      if (worldRef.current) {
        worldRef.current.setPassenger(null);
      }
    }
  };

  const handleAcceptMission = (mission: MissionData) => {
    const passenger = mission.passenger ?? null;
    setActiveMission(mission);
    setActivePassenger(passenger);
    // Belt-and-braces: keep the refs live this same tick so a fast-travel fired before the
    // sync effect commits still sees the accepted mission.
    activeMissionRef.current = mission;
    activePassengerRef.current = passenger;
    if (passenger && worldRef.current) worldRef.current.setPassenger(passenger);
    setNavTarget({ locationId: mission.dropLocationId });
    const dest = GUJARAT_LOCATIONS.find((l) => l.id === mission.dropLocationId)?.nameGujarati ?? mission.dropLocationId;
    notify({ text: `${mission.titleGujarati} — ચાલો ${dest} તરફ!`, tone: 'reward' });
  };

  const handleCancelMission = () => {
    setActiveMission(null);
    setActivePassenger(null);
    activeMissionRef.current = null;
    activePassengerRef.current = null;
    setNavTarget(null);
    if (worldRef.current) worldRef.current.setPassenger(null);
    notify({ text: 'મિશન રદ થયું.', tone: 'info', speak: false });
  };

  const handleBuySouvenir = (souvenirId: string) => {
    const item = GUJARATI_SOUVENIRS.find((s) => s.id === souvenirId);
    if (!item || collectedSouvenirs.includes(souvenirId) || coins < item.priceCoins) return;
    // Make the collection add atomic + conditional so a double-click before re-render can't
    // charge twice or push the id twice. `bought` gates the charge to the one call that
    // actually appended the souvenir.
    let bought = false;
    setCollectedSouvenirs((prev) => {
      if (prev.includes(souvenirId)) return prev;
      bought = true;
      return [...prev, souvenirId];
    });
    if (!bought) return;
    setCoins((c) => c - item.priceCoins);
    notify({ text: `🛍️ ${item.nameGujarati} ખરીદ્યું!`, tone: 'reward', speak: false });
  };

  const handleQuizCorrect = (rewardCoins: number) => {
    setCoins((c) => c + rewardCoins);
    setQuizScore((s) => ({ correct: s.correct + 1, totalAnswered: s.totalAnswered + 1 }));
    notify({ text: `સાચો જવાબ! +₹${rewardCoins}`, tone: 'reward', speak: false });
  };

  const handleRefuel = () => {
    if (coins >= 500) {
      setCoins((c) => c - 500);
      if (worldRef.current) {
        worldRef.current.refuel(10);
      }
      notify({ text: '⛽ ₹૫૦૦ નું ડીઝલ પુરાઈ ગયું!', tone: 'reward', speak: false });
    }
  };

  const handleRepair = () => {
    if (coins >= 200) {
      setCoins((c) => c - 200);
      if (worldRef.current) {
        worldRef.current.repairPunctureAndCool();
      }
      notify({ text: '🔧 પંચર રીપેર અને એન્જિન ઠંડુ થયું!', tone: 'reward', speak: false });
    }
  };

  const handleStartGame = (startLoc: LocationData, isResume = false) => {
    setCurrentLocation(startLoc);
    recordVisit(startLoc.id);
    setIsGameStarted(true);

    soundManager.startEngine();
    soundManager.speakGujaratiTextFallback(
      isResume
        ? `ફરી સ્વાગત છે! આપણો છકડો ${startLoc.nameGujarati} થી આગળ વધે છે. જય ગરવી ગુજરાત!`
        : `ચાલો બાપા! આપણો છકડો ${startLoc.nameGujarati} થી ઉપડ્યો! જય ગરવી ગુજરાત!`,
    );
  };

  const initialLocation =
    GUJARAT_LOCATIONS.find((l) => l.id === initial.lastLocationId) ?? GUJARAT_LOCATIONS[0];
  const hasSave =
    initial.visitedLocations.length > 1 || initial.totalKm > 0 || initial.coins !== 1200;
  const handleResume = () => handleStartGame(initialLocation, true);

  const handleToggleMute = () => {
    const muted = soundManager.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleHeadlight = () => {
    if (worldRef.current) {
      const state = worldRef.current.toggleHeadlight();
      setIsHeadlightOn(state);
    }
  };

  const handleToggleHazard = () => {
    if (worldRef.current) {
      const state = worldRef.current.toggleHazardLights();
      setIsHazardOn(state);
    }
  };

  const handleChangeCamera = () => {
    if (worldRef.current) {
      const modes: CameraMode[] = ['chase', 'hood', 'passenger', 'cinematic', 'drone'];
      const nextIdx = (modes.indexOf(cameraMode) + 1) % modes.length;
      const nextMode = modes[nextIdx];
      worldRef.current.setCameraMode(nextMode);
      setCameraMode(nextMode);
    }
  };

  const handleChangeWeather = () => {
    if (worldRef.current) {
      const weathers: WeatherType[] = ['sunny', 'sunset', 'night', 'rain', 'fog'];
      const nextIdx = (weathers.indexOf(weather) + 1) % weathers.length;
      const nextWeather = weathers[nextIdx];
      worldRef.current.setWeather(nextWeather);
      setWeather(nextWeather);
    }
  };

  const handleToggleFreezeDay = () => {
    if (worldRef.current) {
      const isFrozen = worldRef.current.toggleFreezeDay();
      notify({
        text: isFrozen
          ? '☀️ દિવસ ફ્રીઝ: બપોરનો તેજસ્વી તડકો લૉક થયો (Day Frozen)'
          : '🔄 ગતિશીલ ૨૪-કલાક સૂર્ય ચક્ર શરૂ થયું (Dynamic Cycle)',
        tone: 'info',
        speak: false,
        ttlMs: 3000,
      });
    }
  };

  const handleSetTimeFreezeMode = (mode: TimeFreezeMode) => {
    if (worldRef.current) {
      worldRef.current.setTimeFreezeMode(mode);
      const text: Record<TimeFreezeMode, string> = {
        day: '☀️ દિવસ ફ્રીઝ: બપોરનો તડકો (Freeze Day - 12:30 PM)',
        dynamic: '🔄 ગતિશીલ ૨૪-કલાક સમય ચક્ર (Dynamic 24h Driving Cycle)',
        sunrise: '🌅 સૂર્યોદય ફ્રીઝ: સોનેરી સવાર (Freeze Sunrise - 06:00 AM)',
        sunset: '🌇 સંધ્યાકાળ ફ્રીઝ: લાલચોળ સાંજ (Freeze Sunset - 07:15 PM)',
        night: '🌌 ચાંદની રાત ફ્રીઝ: શાંત મધ્યરાત્રિ (Freeze Night - 10:30 PM)',
      };
      notify({ text: text[mode], tone: 'info', speak: false, ttlMs: 3000 });
    }
  };

  const handleFastTravel = (loc: LocationData) => {
    if (worldRef.current) {
      worldRef.current.teleportToLocation(loc);
      setCurrentLocation(loc);
      recordVisit(loc.id);
      triggerLandmarkWelcome(loc);
      checkMissionCompletion(loc.id);
    }
  };

  const handleSetDestination = (loc: LocationData) => {
    setNavTarget({ locationId: loc.id });
    notify({ text: `${loc.nameGujarati} તરફ ચાલો — માર્ગ બતાવું છું`, tone: 'info' });
  };

  const handleUpdateCustomization = (custom: ChhakaroCustomization) => {
    setCustomization(custom);
    if (worldRef.current) {
      worldRef.current.updateCustomization(custom);
    }
  };

  const handleMobileControl = (key: keyof VehicleControls, state: boolean) => {
    if (worldRef.current) {
      worldRef.current.setControlState(key, state);
    }
  };

  const handleResetProgress = () => {
    clearProgress();
    window.location.reload();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Start / Launch Screen */}
      {!isGameStarted && (
        <StartScreen
          onStartGame={handleStartGame}
          hasSave={hasSave}
          lastLocationName={hasSave ? initialLocation.nameGujarati : null}
          onResume={handleResume}
        />
      )}

      {/* Unified reward / event notice — one style, tone-colored border. Keyed by notice.id
          so a repeat notify() re-triggers the entry animation. */}
      {isGameStarted && notice && (
        <div
          key={notice.id}
          className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 border-2 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in pointer-events-auto max-w-lg text-center ${
            notice.tone === 'reward'
              ? 'border-amber-400 text-amber-300'
              : notice.tone === 'warn'
                ? 'border-rose-400 text-rose-300'
                : 'border-slate-400 text-slate-200'
          }`}
        >
          <span className="text-2xl">👳🏽‍♂️</span>
          <div className="text-xs sm:text-sm font-bold font-serif">{notice.text}</div>
          <button
            onClick={() => setIsKakaOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0"
          >
            કાકા બોલો
          </button>
        </div>
      )}

      {/* Turn-by-turn nav banner (mission drop, or "માર્ગ બતાવો" from the map) */}
      {isGameStarted && navTarget && navLive && (
        <NavBanner
          targetName={
            GUJARAT_LOCATIONS.find((l) => l.id === navTarget.locationId)?.nameGujarati ?? navTarget.locationId
          }
          distanceM={navLive.distanceM}
          relativeDeg={navLive.relativeDeg}
          onCancel={() => setNavTarget(null)}
        />
      )}

      {/* Primary In-Game HUD */}
      {isGameStarted && (
        <>
          <HUD
            speed={speed}
            rpm={rpm}
            currentLocation={currentLocation}
            nearbyLandmark={nearbyLandmark}
            visitedLocations={visitedLocations}
            worldRef={worldRef}
            navTargetId={navTarget?.locationId ?? null}
            nearbyFacility={nearbyFacility}
            nearbyEncounter={nearbyEncounter}
            isEngineOn={true}
            isHeadlightOn={isHeadlightOn}
            isHazardOn={isHazardOn}
            cameraMode={cameraMode}
            weather={weather}
            timeOfDay={timeOfDay}
            healthState={vehicleHealth}
            activePassenger={activePassenger}
            activeMission={activeMission}
            coins={coins}
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
            onOpenMap={() => setIsMapOpen(true)}
            onOpenPassport={() => setIsPassportOpen(true)}
            onOpenFood={() => setIsFoodOpen(true)}
            onOpenGarage={() => setIsGarageOpen(true)}
            onOpenKaka={() => setIsKakaOpen(true)}
            onOpenMissions={() => setIsMissionsOpen(true)}
            onOpenSouvenirs={() => setIsSouvenirsOpen(true)}
            onOpenQuiz={currentQuiz ? () => setIsQuizOpen(true) : undefined}
            onInspectLandmark={(loc) => setInspectingLandmark(loc)}
            onCapturePhoto={() => setIsPhotoModeOpen(true)}
            onRefuel={handleRefuel}
            onRepair={handleRepair}
            onInteractEncounter={(enc) => setActiveEncounterModal(enc)}
          />

          {/* On-screen Mobile Pedals & Steer Controls */}
          <MobileControls
            onControlChange={handleMobileControl}
            onChangeCamera={handleChangeCamera}
          />
        </>
      )}

      {/* Modals & Dialogs */}
      <KanjiKakaGuide
        isOpen={isKakaOpen}
        onClose={() => setIsKakaOpen(false)}
        currentLocation={currentLocation}
        speed={speed}
        weather={weather}
        visitedLocations={visitedLocations}
        lastSpokenMessage={lastKakaNarration}
        onNewKakaReply={(reply) => setLastKakaNarration(reply)}
      />

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

      <SouvenirShopModal
        isOpen={isSouvenirsOpen}
        onClose={() => setIsSouvenirsOpen(false)}
        souvenirs={currentLocationSouvenirs}
        coins={coins}
        onBuySouvenir={handleBuySouvenir}
      />

      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        quiz={currentQuiz}
        onAnswerCorrect={handleQuizCorrect}
      />

      <PhotoModeModal
        isOpen={isPhotoModeOpen}
        onClose={() => setIsPhotoModeOpen(false)}
        currentLocation={currentLocation}
        canvasRef={canvasRef}
      />

      <PassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        visitedLocations={visitedLocations}
        unlockedAchievements={unlockedAchievements}
        totalDistanceKm={totalKm}
        stampMeta={stampMeta}
        onResetProgress={handleResetProgress}
      />

      <FoodPassportModal
        isOpen={isFoodOpen}
        onClose={() => setIsFoodOpen(false)}
        discoveredFoods={discoveredFoods}
        onDiscoverFood={handleDiscoverFood}
      />

      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        customization={customization}
        onUpdateCustomization={handleUpdateCustomization}
      />

      {inspectingLandmark && (
        <LandmarkInspectModal
          isOpen={true}
          onClose={() => setInspectingLandmark(null)}
          location={inspectingLandmark}
          isVisited={visitedLocations.includes(inspectingLandmark.id)}
          stampRecord={stampMeta[inspectingLandmark.id]}
          onMarkVisited={(locId) => recordVisit(locId)}
          onOpenKaka={() => {
            setInspectingLandmark(null);
            setIsKakaOpen(true);
          }}
        />
      )}

      {activeEncounterModal && (
        <RoadsideEncounterModal
          encounter={activeEncounterModal}
          isFoodAlreadyDiscovered={
            activeEncounterModal.foodId
              ? discoveredFoods.includes(activeEncounterModal.foodId)
              : false
          }
          onTasteAndCollect={handleTasteAndCollectFood}
          onClose={() => setActiveEncounterModal(null)}
        />
      )}
    </div>
  );
}

