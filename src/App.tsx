import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  TransmissionMode,
} from './types';
import { GUJARAT_LOCATIONS } from './data/locations';
import { GUJARAT_MISSIONS } from './data/missions';
import { GUJARATI_SOUVENIRS } from './data/souvenirs';
import { GUJARATI_QUIZZES } from './data/quizzes';
import { soundManager } from './audio/SoundManager';
import { voiceQueue, setKakaMutedGetter } from './audio/VoiceQueue';
import { evaluateAchievements } from './state/achievements';
import { isMissionComplete } from './state/missionMatching';
import { loadProgress, saveProgress, clearProgress, flushProgress } from './state/persistence';
import { NotifyMessage, NotifyOptions, toneSound } from './state/notify';
import { navState, NavState } from './state/navigation';
import { nearestUnvisited } from './state/exploration';
import { KakaEvent, KakaContext, buildKakaContext } from './state/kakaContext';
import { evaluateKakaTriggers } from './state/kakaTriggers';
import { useKakaCompanion } from './state/useKakaCompanion';
import { VoiceIntent, matchVoiceIntent } from './state/voiceCommands';
import { radioAudioEngine } from './audio/RadioAudioEngine';

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
  // Persisted gearbox prefs. The Expert toggle (StartScreen + a future in-game control) drives
  // both: Expert on ⇒ manual gearbox, off ⇒ automatic. Persisted via the saveProgress payload.
  const [transmissionMode, setTransmissionMode] = useState<TransmissionMode>(initial.transmissionMode);
  const [expertMode, setExpertMode] = useState(initial.expertMode);
  // handleGlobalKeys is registered once inside the world-init effect; it reads the live Expert
  // flag through this ref rather than forcing that effect to re-run on every toggle.
  const expertModeRef = useRef(expertMode);
  expertModeRef.current = expertMode;
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

  // Turn-by-turn nav. `navTarget` is an *explicit* user destination ("માર્ગ બતાવો" / a voice
  // command); `routeQueue` is a Kaka trip plan being driven stop by stop; a mission drop is
  // the implicit third source. Precedence: explicit > route queue > mission.
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);
  const [routeQueue, setRouteQueue] = useState<string[]>([]);
  const [navLive, setNavLive] = useState<NavState | null>(null);
  // world.onVehicleMove is registered once, so it reads the derived target + queue via refs.
  const navTargetRef = useRef<NavTarget | null>(null);
  const routeQueueRef = useRef<string[]>([]);
  const navTickRef = useRef(0);
  const navStartDistRef = useRef<number | null>(null);
  const navCuesRef = useRef({ start: false, half: false, near: false });

  const effectiveNavTargetId: string | null =
    navTarget?.locationId ?? routeQueue[0] ?? activeMission?.dropLocationId ?? null;

  useEffect(() => {
    routeQueueRef.current = routeQueue;
  }, [routeQueue]);

  useEffect(() => {
    navTargetRef.current = effectiveNavTargetId ? { locationId: effectiveNavTargetId } : null;
    navStartDistRef.current = null;
    navCuesRef.current = { start: false, half: false, near: false };
    if (!effectiveNavTargetId) setNavLive(null);
  }, [effectiveNavTargetId]);

  // Bounded ring of the player's last few actions — Kaka reacts to these. pushKakaEvent is
  // called from the reward paths; the tick state forces the kakaContext memo to refresh.
  const recentEventsRef = useRef<KakaEvent[]>([]);
  const [kakaEventTick, setKakaEventTick] = useState(0);
  const pushKakaEvent = (e: KakaEvent) => {
    recentEventsRef.current = [e, ...recentEventsRef.current].slice(0, 5);
    setKakaEventTick((t) => t + 1);
  };
  const locName = (id: string | null | undefined): string =>
    (id && GUJARAT_LOCATIONS.find((l) => l.id === id)?.nameGujarati) || id || '';

  // The one live snapshot every Kaka utterance is grounded in. Consumed by the companion
  // hook and the proactive-trigger effect (added in later M2 tasks).
  const kakaContext: KakaContext = useMemo(
    () =>
      buildKakaContext({
        zoneId: currentLocation.id,
        zoneNameGujarati: currentLocation.nameGujarati,
        zoneRegion: currentLocation.region,
        nearbyLandmarkId: nearbyLandmark?.id ?? null,
        nearbyLandmarkUnvisited: nearbyLandmark
          ? !visitedLocations.includes(nearbyLandmark.id) && effectiveNavTargetId !== nearbyLandmark.id
          : false,
        visitedCount: visitedLocations.length,
        totalLocations: GUJARAT_LOCATIONS.length,
        mission: activeMission
          ? {
              titleGujarati: activeMission.titleGujarati,
              dropNameGujarati: locName(activeMission.dropLocationId),
            }
          : null,
        nav:
          effectiveNavTargetId && navLive
            ? { targetNameGujarati: locName(effectiveNavTargetId), distanceM: navLive.distanceM }
            : null,
        speedKmh: speed,
        vehiclePos: worldRef.current
          ? { x: worldRef.current.vehiclePos.x, z: worldRef.current.vehiclePos.z }
          : null,
        fuelPercent: vehicleHealth.fuelPercent,
        weather,
        timeOfDayPhase: timeOfDay?.phase ?? null,
        recentEvents: recentEventsRef.current,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentLocation,
      nearbyLandmark,
      visitedLocations,
      activeMission,
      effectiveNavTargetId,
      navLive,
      speed,
      vehicleHealth,
      weather,
      timeOfDay,
      kakaEventTick,
    ],
  );

  // The last line Kaka said out loud — chat reply or proactive trigger — for the HUD strip.
  const [lastKakaNarration, setLastKakaNarration] = useState<string>('');
  // "કાકા શાંત" — silences Kaka's proactive/spoken lines. Persisted (schema v3).
  const [kakaMuted, setKakaMuted] = useState(initial.kakaMuted);
  const kakaMutedRef = useRef(kakaMuted);
  kakaMutedRef.current = kakaMuted;

  // The companion controller reads the context through a ref accessor so its callbacks stay
  // stable while every request still carries the freshest snapshot.
  const kakaContextRef = useRef(kakaContext);
  kakaContextRef.current = kakaContext;
  const getKakaContext = useCallback(() => kakaContextRef.current, []);
  const kaka = useKakaCompanion(getKakaContext);

  useEffect(() => {
    if (kaka.lastReply) setLastKakaNarration(kaka.lastReply);
  }, [kaka.lastReply]);

  useEffect(() => {
    setKakaMutedGetter(() => kakaMutedRef.current);
  }, []);

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
    // Kaka narration goes through the shared queue so lines never overlap; the short
    // tone SFX above stays on soundManager.
    if (speak) voiceQueue.enqueue(text);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), ttlMs);
  };

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  // Proactive Kanji Kaka narration. Diff the previous vs current context snapshot on every
  // change; evaluateKakaTriggers is pure and rising-edge, and firedTriggerIds keeps each
  // trigger to one utterance per session. The very first snapshot only seeds the ref so the
  // "entered rajkot" line doesn't double up with the start-game greeting.
  const prevKakaContextRef = useRef<KakaContext | null>(null);
  const firedTriggerIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isGameStarted) return;
    const prev = prevKakaContextRef.current;
    prevKakaContextRef.current = kakaContext;
    if (!prev) return;
    const fire = evaluateKakaTriggers(prev, kakaContext);
    if (!fire || kakaMuted || firedTriggerIds.current.has(fire.id)) return;
    firedTriggerIds.current.add(fire.id);
    voiceQueue.enqueue(fire.textGujarati, { priority: fire.priority, dedupeKey: fire.id });
    notify({ text: fire.textGujarati, tone: 'info', speak: false });
    setLastKakaNarration(fire.textGujarati);
  }, [isGameStarted, kakaContext, kakaMuted]);

  // Initialize Three.js Game World
  useEffect(() => {
    if (!isGameStarted || !containerRef.current) return;

    // transmissionMode (not initial.*) so an Expert opt-in made on the StartScreen is already
    // live when the world spins up; mid-game toggles go through world.setTransmissionMode.
    const world = new GameWorld(containerRef.current, customization, initial.totalKm * 1000, transmissionMode);
    worldRef.current = world;
    canvasRef.current = world.canvas;

    world.startVehicleEngine();

    // Callbacks
    world.onSpeedUpdate = (newSpeed, newRpm) => {
      setSpeed(newSpeed);
      setRpm(newRpm);
      setTotalKm(world.totalDistanceDriven / 1000);
    };

    world.onGearChange = (g) => setGear(g);

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

        // Advance a Kaka trip plan one stop.
        const queue = routeQueueRef.current;
        if (queue[0] === loc.id) {
          const rest = queue.slice(1);
          routeQueueRef.current = rest;
          setRouteQueue(rest);
          if (rest.length > 0) {
            const nextLoc = GUJARAT_LOCATIONS.find((l) => l.id === rest[0]);
            if (nextLoc) voiceQueue.enqueue(`આગળનું સ્થળ: ${nextLoc.nameGujarati}`);
          } else {
            notify({ text: 'સફર પૂરી! મોજ કરો.', tone: 'reward' });
          }
        }

        // Clear an explicit destination once reached (queue / mission targets self-clear).
        setNavTarget((cur) => (cur && cur.locationId === loc.id ? null : cur));
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
      } else if (key === 'q') {
        // Expert-only: shift down one gear.
        if (!expertModeRef.current) return;
        worldRef.current?.shiftDown();
      } else if (key === 'e') {
        // Expert mode repurposes E as shift-up; otherwise E is the landmark/encounter action.
        if (expertModeRef.current) {
          worldRef.current?.shiftUp();
        } else if (world.nearbyEncounter) {
          setActiveEncounterModal(world.nearbyEncounter);
        } else if (world.nearbyLandmark) {
          setInspectingLandmark(world.nearbyLandmark);
        }
      } else if (key === 'i') {
        // Engine start/stop is allowed in either mode (GameWorld enforces the standstill rule).
        worldRef.current?.toggleEngine();
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
      kakaMuted,
      transmissionMode,
      expertMode,
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
    kakaMuted,
    transmissionMode,
    expertMode,
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
    pushKakaEvent({ kind: 'stamp', nameGujarati: locName(locId) });
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
    pushKakaEvent({ kind: 'food', nameGujarati: foodName });
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
      pushKakaEvent({ kind: 'mission_done', nameGujarati: locName(arrivedLocationId) });
      soundManager.playAchievementSound();
      notify({ text: `🎉 ${successMsg}`, tone: 'info', speak: true });

      // Clear passenger from vehicle; the mission-derived nav arrow drops with the mission.
      setActivePassenger(null);
      setActiveMission(null);
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
    // The nav arrow follows the mission drop implicitly (effectiveNavTargetId), unless the
    // player has set an explicit destination or is mid trip-plan.
    const dest = GUJARAT_LOCATIONS.find((l) => l.id === mission.dropLocationId)?.nameGujarati ?? mission.dropLocationId;
    notify({ text: `${mission.titleGujarati} — ચાલો ${dest} તરફ!`, tone: 'reward' });
  };

  const handleCancelMission = () => {
    setActiveMission(null);
    setActivePassenger(null);
    activeMissionRef.current = null;
    activePassengerRef.current = null;
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
    pushKakaEvent({ kind: 'souvenir', nameGujarati: item.nameGujarati });
    notify({ text: `🛍️ ${item.nameGujarati} ખરીદ્યું!`, tone: 'reward', speak: false });
  };

  const handleQuizCorrect = (rewardCoins: number) => {
    setCoins((c) => c + rewardCoins);
    setQuizScore((s) => ({ correct: s.correct + 1, totalAnswered: s.totalAnswered + 1 }));
    pushKakaEvent({ kind: 'quiz', correct: true });
    notify({ text: `સાચો જવાબ! +₹${rewardCoins}`, tone: 'reward', speak: false });
  };

  const handleRefuel = () => {
    if (coins >= 500) {
      setCoins((c) => c - 500);
      if (worldRef.current) {
        worldRef.current.refuel(10);
      }
      pushKakaEvent({ kind: 'refuel' });
      notify({ text: '⛽ ₹૫૦૦ નું ડીઝલ પુરાઈ ગયું!', tone: 'reward', speak: false });
    }
  };

  const handleRepair = () => {
    if (coins >= 200) {
      setCoins((c) => c - 200);
      if (worldRef.current) {
        worldRef.current.repairPunctureAndCool();
      }
      pushKakaEvent({ kind: 'repair' });
      notify({ text: '🔧 પંચર રીપેર અને એન્જિન ઠંડુ થયું!', tone: 'reward', speak: false });
    }
  };

  const handleStartGame = (startLoc: LocationData, isResume = false) => {
    setCurrentLocation(startLoc);
    recordVisit(startLoc.id);
    setIsGameStarted(true);

    soundManager.startEngine();
    voiceQueue.enqueue(
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

  // Expert mode ⇔ manual gearbox. Flipping it also switches the transmission (and tells the
  // running world), so the gauge badge and shift behaviour follow the one toggle. Both fields
  // ride the existing saveProgress payload.
  const handleToggleExpertMode = () => {
    const next = !expertMode;
    const mode: TransmissionMode = next ? 'manual' : 'auto';
    setExpertMode(next);
    setTransmissionMode(mode);
    worldRef.current?.setTransmissionMode(mode);
  };

  const handleShiftUp = () => worldRef.current?.shiftUp();
  const handleShiftDown = () => worldRef.current?.shiftDown();

  const handleToggleEngine = () => {
    const world = worldRef.current;
    if (!world) return;
    const wasOn = world.isEngineOn;
    const nowOn = world.toggleEngine();
    if (!wasOn && !nowOn) {
      notify({
        text: 'એન્જિન ચાલુ કરવા છકડો ઊભો રાખો અને ગિયર N કે R માં નાખો',
        tone: 'info',
        speak: false,
        ttlMs: 3500,
      });
    } else {
      notify({ text: nowOn ? '🔑 એન્જિન ચાલુ' : '🔑 એન્જિન બંધ', tone: 'info', speak: false, ttlMs: 2500 });
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

  // "Rest till morning" — skip the day/night phase forward to the next 06:00. M3 is a plain
  // skip; M4 ties it to dhaba stops. Does not touch the odometer or any freeze mode.
  const handleRest = () => {
    if (!worldRef.current) return;
    const h = timeOfDay?.hour ?? 22;
    const m = timeOfDay?.minute ?? 0;
    const hoursUntilSix = (6 - (h + m / 60) + 24) % 24;
    worldRef.current.advanceTimeOfDay(hoursUntilSix);
    notify({ text: 'સવાર પડી — તાજામાજા થઈને ચાલો!', tone: 'reward' });
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

  // Scoped Gujarati voice commands from the Kaka mic. `unknown` never reaches here — the
  // modal routes those to askKaka as a question.
  const handleVoiceIntent = (intent: VoiceIntent) => {
    switch (intent.kind) {
      case 'navigate': {
        const loc = GUJARAT_LOCATIONS.find((l) => l.id === intent.locationId);
        if (!loc) return;
        setRouteQueue([]);
        setNavTarget({ locationId: loc.id });
        voiceQueue.enqueue(`ચાલો ${loc.nameGujarati} તરફ!`);
        break;
      }
      case 'open':
        if (intent.target === 'map') setIsMapOpen(true);
        else if (intent.target === 'passport') setIsPassportOpen(true);
        else if (intent.target === 'missions') setIsMissionsOpen(true);
        else if (intent.target === 'garage') setIsGarageOpen(true);
        break;
      case 'toggle':
        if (intent.target === 'music') radioAudioEngine.togglePower();
        else if (intent.target === 'headlight') handleToggleHeadlight();
        else if (intent.target === 'mute') handleToggleMute();
        break;
      case 'photo':
        setIsPhotoModeOpen(true);
        break;
      case 'repeat':
        if (lastKakaNarration) voiceQueue.enqueue(lastKakaNarration, { priority: 'high' });
        break;
    }
  };

  const handleToggleKakaMuted = () => {
    setKakaMuted((m) => {
      const next = !m;
      if (next) voiceQueue.clear();
      return next;
    });
  };

  // The HUD Kaka-strip mic: same scoped-command-or-question routing as the modal, but it
  // works without opening the chat. A lazily-created single recognition instance.
  const [kakaMicActive, setKakaMicActive] = useState(false);
  const quickRecRef = useRef<any>(null);
  const handleKakaMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      notify({ text: 'તમારા બ્રાઉઝરમાં માઇક્રોફોન સપોર્ટેડ નથી.', tone: 'warn', speak: false });
      return;
    }
    if (!quickRecRef.current) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'gu-IN';
      rec.onresult = (e: any) => {
        const transcript = e.results?.[0]?.[0]?.transcript;
        if (transcript) {
          const intent = matchVoiceIntent(transcript, GUJARAT_LOCATIONS);
          if (intent.kind !== 'unknown') handleVoiceIntent(intent);
          else {
            setIsKakaOpen(true);
            kaka.askKaka(transcript);
          }
        }
        setKakaMicActive(false);
      };
      rec.onerror = () => setKakaMicActive(false);
      rec.onend = () => setKakaMicActive(false);
      quickRecRef.current = rec;
    }
    try {
      quickRecRef.current.start();
      setKakaMicActive(true);
    } catch {
      setKakaMicActive(false);
    }
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
          expertMode={expertMode}
          onToggleExpertMode={handleToggleExpertMode}
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

      {/* Turn-by-turn nav banner — explicit destination, Kaka trip plan, or mission drop */}
      {isGameStarted && effectiveNavTargetId && navLive && (
        <NavBanner
          targetName={
            GUJARAT_LOCATIONS.find((l) => l.id === effectiveNavTargetId)?.nameGujarati ?? effectiveNavTargetId
          }
          distanceM={navLive.distanceM}
          relativeDeg={navLive.relativeDeg}
          onCancel={() => {
            setNavTarget(null);
            setRouteQueue([]);
          }}
        />
      )}

      {/* Primary In-Game HUD */}
      {isGameStarted && (
        <>
          <HUD
            speed={speed}
            rpm={rpm}
            gear={gear}
            transmissionMode={transmissionMode}
            currentLocation={currentLocation}
            nearbyLandmark={nearbyLandmark}
            visitedLocations={visitedLocations}
            worldRef={worldRef}
            navTargetId={effectiveNavTargetId}
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
            onRest={handleRest}
            onOpenMap={() => setIsMapOpen(true)}
            onOpenPassport={() => setIsPassportOpen(true)}
            onOpenFood={() => setIsFoodOpen(true)}
            onOpenGarage={() => setIsGarageOpen(true)}
            onOpenKaka={() => setIsKakaOpen(true)}
            lastKakaLine={lastKakaNarration}
            kakaMuted={kakaMuted}
            kakaMicActive={kakaMicActive}
            onToggleKakaMuted={handleToggleKakaMuted}
            onKakaMic={handleKakaMic}
            onOpenMissions={() => setIsMissionsOpen(true)}
            onOpenSouvenirs={() => setIsSouvenirsOpen(true)}
            onOpenQuiz={currentQuiz ? () => setIsQuizOpen(true) : undefined}
            onInspectLandmark={(loc) => setInspectingLandmark(loc)}
            onCapturePhoto={() => setIsPhotoModeOpen(true)}
            onRefuel={handleRefuel}
            onRepair={handleRepair}
            onInteractEncounter={(enc) => setActiveEncounterModal(enc)}
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
      <KanjiKakaGuide
        isOpen={isKakaOpen}
        onClose={() => setIsKakaOpen(false)}
        currentLocation={currentLocation}
        messages={kaka.messages}
        isThinking={kaka.isThinking}
        onAsk={kaka.askKaka}
        onGenerateTrip={kaka.generateTrip}
        onStartTrip={(ids) => {
          setNavTarget(null);
          setRouteQueue(ids);
          const first = GUJARAT_LOCATIONS.find((l) => l.id === ids[0]);
          if (first) notify({ text: `સફર શરૂ! પહેલું સ્થળ: ${first.nameGujarati}`, tone: 'reward' });
        }}
        onVoiceIntent={handleVoiceIntent}
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

