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
} from './types';
import { GUJARAT_LOCATIONS } from './data/locations';
import { GUJARAT_MISSIONS } from './data/missions';
import { GUJARATI_SOUVENIRS } from './data/souvenirs';
import { GUJARATI_QUIZZES } from './data/quizzes';
import { soundManager } from './audio/SoundManager';
import { evaluateAchievements } from './state/achievements';
import { isMissionComplete } from './state/missionMatching';
import { loadProgress, saveProgress, clearProgress, flushProgress } from './state/persistence';

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
  const [totalKm, setTotalKm] = useState(0);

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

  // Proactive Kanji Kaka Narration banner state
  const [floatingBanner, setFloatingBanner] = useState<string | null>(null);

  // Initialize Three.js Game World
  useEffect(() => {
    if (!isGameStarted || !containerRef.current) return;

    const world = new GameWorld(containerRef.current, customization);
    worldRef.current = world;
    canvasRef.current = world.canvas;

    world.startVehicleEngine();

    // Callbacks
    world.onSpeedUpdate = (newSpeed, newRpm) => {
      setSpeed(newSpeed);
      setRpm(newRpm);
      setTotalKm(world.totalDistanceDriven / 1000);
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
      markLocationVisited(loc.id);
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
          if (isFrozen) {
            setFloatingBanner('☀️ દિવસ ફ્રીઝ: બપોરનો તડકો લૉક થયો (Day Frozen)');
          } else {
            setFloatingBanner('🔄 ગતિશીલ ૨૪-કલાક ચક્ર શરૂ થયું (Dynamic Cycle)');
          }
          setTimeout(() => setFloatingBanner(null), 3000);
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

  // Unlock achievements in reaction to committed progress. Side effects (sound + banner)
  // are deliberately kept out of every setState updater so React 19 StrictMode's dev
  // double-invoke of updaters can't fire the achievement sound or banner twice.
  useEffect(() => {
    if (!isGameStarted) return;
    const earned = evaluateAchievements({ visitedLocations, discoveredFoods }) || [];
    const added = earned.filter((id) => !(unlockedAchievements || []).includes(id));
    if (added.length === 0) return;
    soundManager.playAchievementSound();
    setFloatingBanner(`🏅 નવું અચીવમેન્ટ અનલૉક! (${added.length})`);
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
      stampMeta: initial.stampMeta,
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
  ]);

  // Force any pending debounced write to disk before the tab unloads.
  useEffect(() => {
    const onHide = () => flushProgress();
    window.addEventListener('beforeunload', onHide);
    return () => window.removeEventListener('beforeunload', onHide);
  }, []);

  // Handle location visit updates. These stay pure prev -> next reducers (safe against
  // stale closures in the once-registered world callbacks). Achievement unlocking is a
  // reaction to the committed progress — see the effect above — never a side effect
  // inside a setState updater (React 19 StrictMode double-invokes updaters in dev).
  const markLocationVisited = (locId: string) => {
    setVisitedLocations((prev) => (prev.includes(locId) ? prev : [...prev, locId]));
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
    soundManager.playHorn();
    const foodName = encounter.foodNameGujarati || encounter.foodNameEnglish || 'વાનગી';
    setFloatingBanner(`🍽️ વાહ! "${foodName}" નો સ્વાદ માણ્યો અને ફૂડ પાસપોર્ટમાં ઉમેરાઈ! (+₹${coinsReward})`);
    setTimeout(() => setFloatingBanner(null), 4500);
    setActiveEncounterModal(null);
  };

  const triggerLandmarkWelcome = (loc: LocationData) => {
    const welcomeSpeech = `આપણે હવે ${loc.nameGujarati} પહોંચી ગયા છીએ! અહીં ${loc.famousFood} નો સ્વાદ લેવાનું ભૂલતા નહીં!`;
    setLastKakaNarration(welcomeSpeech);
    setFloatingBanner(`📍 ${loc.nameGujarati}: ${loc.tagline}`);

    soundManager.speakGujaratiTextFallback(welcomeSpeech);

    setTimeout(() => {
      setFloatingBanner(null);
    }, 8000);
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
      setFloatingBanner(`🎉 ${successMsg}`);
      soundManager.playAchievementSound();
      soundManager.speakGujaratiTextFallback(successMsg);

      // Clear passenger from vehicle
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
    soundManager.playChime();
    const dest = GUJARAT_LOCATIONS.find((l) => l.id === mission.dropLocationId)?.nameGujarati ?? mission.dropLocationId;
    setFloatingBanner(`${mission.titleGujarati} — ચાલો ${dest} તરફ!`);
    soundManager.speakGujaratiTextFallback(`નવું મિશન: ${mission.titleGujarati}. ચાલો ${dest} તરફ!`);
  };

  const handleCancelMission = () => {
    setActiveMission(null);
    setActivePassenger(null);
    activeMissionRef.current = null;
    activePassengerRef.current = null;
    if (worldRef.current) worldRef.current.setPassenger(null);
    setFloatingBanner('મિશન રદ થયું.');
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
    soundManager.playChime();
    setFloatingBanner(`🛍️ ${item.nameGujarati} ખરીદ્યું!`);
  };

  const handleQuizCorrect = (rewardCoins: number) => {
    setCoins((c) => c + rewardCoins);
    setQuizScore((s) => ({ correct: s.correct + 1, totalAnswered: s.totalAnswered + 1 }));
    setFloatingBanner(`સાચો જવાબ! +₹${rewardCoins}`);
  };

  const handleRefuel = () => {
    if (coins >= 500) {
      setCoins((c) => c - 500);
      if (worldRef.current) {
        worldRef.current.refuel(10);
      }
      setFloatingBanner('⛽ ₹૫૦૦ નું ડીઝલ પુરાઈ ગયું!');
    }
  };

  const handleRepair = () => {
    if (coins >= 200) {
      setCoins((c) => c - 200);
      if (worldRef.current) {
        worldRef.current.repairPunctureAndCool();
      }
      setFloatingBanner('🔧 પંચર રીપેર અને એન્જિન ઠંડુ થયું!');
    }
  };

  const handleStartGame = (startLoc: LocationData) => {
    setCurrentLocation(startLoc);
    markLocationVisited(startLoc.id);
    setIsGameStarted(true);

    soundManager.startEngine();
    soundManager.speakGujaratiTextFallback(`ચાલો બાપા! આપણો છકડો ${startLoc.nameGujarati} થી ઉપડ્યો! જય ગરવી ગુજરાત!`);
  };

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
      if (isFrozen) {
        setFloatingBanner('☀️ દિવસ ફ્રીઝ: બપોરનો તેજસ્વી તડકો લૉક થયો (Day Frozen)');
      } else {
        setFloatingBanner('🔄 ગતિશીલ ૨૪-કલાક સૂર્ય ચક્ર શરૂ થયું (Dynamic Cycle)');
      }
      setTimeout(() => setFloatingBanner(null), 3000);
    }
  };

  const handleSetTimeFreezeMode = (mode: TimeFreezeMode) => {
    if (worldRef.current) {
      worldRef.current.setTimeFreezeMode(mode);
      if (mode === 'day') {
        setFloatingBanner('☀️ દિવસ ફ્રીઝ: બપોરનો તડકો (Freeze Day - 12:30 PM)');
      } else if (mode === 'dynamic') {
        setFloatingBanner('🔄 ગતિશીલ ૨૪-કલાક સમય ચક્ર (Dynamic 24h Driving Cycle)');
      } else if (mode === 'sunrise') {
        setFloatingBanner('🌅 સૂર્યોદય ફ્રીઝ: સોનેરી સવાર (Freeze Sunrise - 06:00 AM)');
      } else if (mode === 'sunset') {
        setFloatingBanner('🌇 સંધ્યાકાળ ફ્રીઝ: લાલચોળ સાંજ (Freeze Sunset - 07:15 PM)');
      } else if (mode === 'night') {
        setFloatingBanner('🌌 ચાંદની રાત ફ્રીઝ: શાંત મધ્યરાત્રિ (Freeze Night - 10:30 PM)');
      }
      setTimeout(() => setFloatingBanner(null), 3000);
    }
  };

  const handleFastTravel = (loc: LocationData) => {
    if (worldRef.current) {
      worldRef.current.teleportToLocation(loc);
      setCurrentLocation(loc);
      markLocationVisited(loc.id);
      triggerLandmarkWelcome(loc);
      checkMissionCompletion(loc.id);
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
      {!isGameStarted && <StartScreen onStartGame={handleStartGame} />}

      {/* Floating Kaka / Mission Dialogue Banner */}
      {isGameStarted && floatingBanner && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-slate-950/90 border-2 border-amber-400 text-amber-300 px-5 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in pointer-events-auto max-w-lg text-center">
          <span className="text-2xl">👳🏽‍♂️</span>
          <div className="text-xs sm:text-sm font-bold font-serif">{floatingBanner}</div>
          <button
            onClick={() => setIsKakaOpen(true)}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0"
          >
            કાકા બોલો
          </button>
        </div>
      )}

      {/* Primary In-Game HUD */}
      {isGameStarted && (
        <>
          <HUD
            speed={speed}
            rpm={rpm}
            currentLocation={currentLocation}
            nearbyLandmark={nearbyLandmark}
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
          onMarkVisited={(locId) => markLocationVisited(locId)}
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

