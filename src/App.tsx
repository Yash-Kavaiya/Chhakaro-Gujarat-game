import React, { useState, useEffect, useRef } from 'react';
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
} from './types';
import { GUJARAT_LOCATIONS } from './data/locations';
import { GUJARAT_MISSIONS } from './data/missions';
import { GUJARATI_SOUVENIRS } from './data/souvenirs';
import { GUJARATI_QUIZZES } from './data/quizzes';
import { soundManager } from './audio/SoundManager';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<GameWorld | null>(null);

  // Game Lifecycle & Telemetry
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [rpm, setRpm] = useState(800);
  const [currentLocation, setCurrentLocation] = useState<LocationData>(GUJARAT_LOCATIONS[0]);
  const [nearbyLandmark, setNearbyLandmark] = useState<LocationData | null>(null);
  const [nearbyFacility, setNearbyFacility] = useState<{ type: 'petrol' | 'garage' | 'toll'; name: string; distance: number } | null>(null);
  const [isHeadlightOn, setIsHeadlightOn] = useState(true);
  const [isHazardOn, setIsHazardOn] = useState(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [weather, setWeather] = useState<WeatherType>('sunny');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [totalKm, setTotalKm] = useState(0);

  // Economy & Progression
  const [coins, setCoins] = useState(1200);
  const [reputationStars, setReputationStars] = useState(5.0);

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
  const [visitedLocations, setVisitedLocations] = useState<string[]>(['rajkot']);
  const [discoveredFoods, setDiscoveredFoods] = useState<string[]>(['gathiya']);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(['ach_starter']);
  const [collectedSouvenirs, setCollectedSouvenirs] = useState<string[]>([]);
  const [completedMissions, setCompletedMissions] = useState<string[]>([]);
  const [quizScore, setQuizScore] = useState({ correct: 0, totalAnswered: 0 });

  // Derived quiz for current location
  const currentQuiz: CulturalQuiz | null =
    GUJARATI_QUIZZES.find((q) => q.locationId === currentLocation.id) ?? null;

  // Passenger & Active Mission
  const [activePassenger, setActivePassenger] = useState<PassengerData | null>(null);
  const [activeMission, setActiveMission] = useState<MissionData | null>(null);

  // Customization
  const [customization, setCustomization] = useState<ChhakaroCustomization>({
    bodyColor: 0xd9531e, // Vibrant saffron
    stickerText: 'જય ગરવી ગુજરાત',
    hornType: 'classic_bulb',
    flagColor: 0xf97316,
    hasMirrorTassels: true,
    hasCanopy: true,
  });

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
      } else if (key === 'e' && world.nearbyLandmark) {
        setInspectingLandmark(world.nearbyLandmark);
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);

    return () => {
      window.removeEventListener('keydown', handleGlobalKeys);
      world.destroy();
      worldRef.current = null;
    };
  }, [isGameStarted]);

  // Handle location visit updates & achievement checks
  const markLocationVisited = (locId: string) => {
    setVisitedLocations((prev) => {
      if (prev.includes(locId)) return prev;
      const next = [...prev, locId];
      checkAchievements(next, discoveredFoods, totalKm);
      return next;
    });
  };

  const handleDiscoverFood = (foodId: string) => {
    setDiscoveredFoods((prev) => {
      if (prev.includes(foodId)) return prev;
      const next = [...prev, foodId];
      checkAchievements(visitedLocations, next, totalKm);
      return next;
    });
  };

  const checkAchievements = (visited: string[], foods: string[], km: number) => {
    const newUnlocked = [...unlockedAchievements];

    // Check Saurashtra Safari
    const saurashtraList = ['rajkot', 'dwarka', 'somnath', 'gir', 'junagadh', 'palitana'];
    if (saurashtraList.every((id) => visited.includes(id)) && !newUnlocked.includes('ach_saurashtra')) {
      newUnlocked.push('ach_saurashtra');
      soundManager.playAchievementSound();
    }

    // Check Rann King
    if (visited.includes('kutch') && !newUnlocked.includes('ach_rann')) {
      newUnlocked.push('ach_rann');
      soundManager.playAchievementSound();
    }

    // Check Road to Heaven Rider
    if (visited.includes('dholavira') && !newUnlocked.includes('ach_road_to_heaven')) {
      newUnlocked.push('ach_road_to_heaven');
      soundManager.playAchievementSound();
    }

    // Check UNESCO Heritage Master (Rani Ki Vav, Champaner, Dholavira, Ahmedabad)
    const unescoList = ['patan_modhera', 'pavagadh', 'dholavira', 'ahmedabad'];
    if (unescoList.every((id) => visited.includes(id)) && !newUnlocked.includes('ach_unesco_master')) {
      newUnlocked.push('ach_unesco_master');
      soundManager.playAchievementSound();
    }

    // Check Gir Lion
    if (visited.includes('gir') && !newUnlocked.includes('ach_gir_lion')) {
      newUnlocked.push('ach_gir_lion');
      soundManager.playAchievementSound();
    }

    // Check Pilgrim (Dwarka, Somnath, Palitana, Pavagadh)
    const pilgrimList = ['dwarka', 'somnath', 'palitana', 'pavagadh'];
    if (pilgrimList.every((id) => visited.includes(id)) && !newUnlocked.includes('ach_pilgrim')) {
      newUnlocked.push('ach_pilgrim');
      soundManager.playAchievementSound();
    }

    // Check Foodie
    if (foods.length >= 6 && !newUnlocked.includes('ach_foodie')) {
      newUnlocked.push('ach_foodie');
      soundManager.playAchievementSound();
    }

    // Check Grand Gujarat Explorer (all 16 places)
    if (visited.length >= 16 && !newUnlocked.includes('ach_all_gujarat')) {
      newUnlocked.push('ach_all_gujarat');
      soundManager.playAchievementSound();
    }

    setUnlockedAchievements(newUnlocked);
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

  // Check if passenger mission arrived at destination
  const checkMissionCompletion = (arrivedLocationId: string) => {
    if (activeMission && activeMission.dropLocationId === arrivedLocationId) {
      // Completed mission!
      const reward = activeMission.rewardCoins;
      setCoins((c) => c + reward);
      setReputationStars((s) => Math.min(5.0, Number((s + 0.1).toFixed(1))));
      setCompletedMissions((m) => [...m, activeMission.id]);

      const successMsg = `શાબાશ! મુસાફર ${activePassenger?.nameGujarati || ''} ને મુકામે પહોંચાડ્યા! ₹${reward} કમાયા!`;
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
    if (passenger && worldRef.current) worldRef.current.setPassenger(passenger);
    soundManager.playChime();
    const dest = GUJARAT_LOCATIONS.find((l) => l.id === mission.dropLocationId)?.nameGujarati ?? mission.dropLocationId;
    setFloatingBanner(`${mission.titleGujarati} — ચાલો ${dest} તરફ!`);
    soundManager.speakGujaratiTextFallback(`નવું મિશન: ${mission.titleGujarati}. ચાલો ${dest} તરફ!`);
  };

  const handleCancelMission = () => {
    setActiveMission(null);
    setActivePassenger(null);
    if (worldRef.current) worldRef.current.setPassenger(null);
    setFloatingBanner('મિશન રદ થયું.');
  };

  const handleBuySouvenir = (item: SouvenirItem) => {
    if (coins >= item.priceCoins) {
      setCoins((c) => c - item.priceCoins);
      setCollectedSouvenirs((prev) => [...prev, item.id]);
      soundManager.playAchievementSound();
      setFloatingBanner(`🛍️ ${item.nameGujarati} ખરીદ્યું!`);
    }
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
        currentLocation={currentLocation}
        coins={coins}
        collectedSouvenirs={collectedSouvenirs}
        onBuyItem={handleBuySouvenir}
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
        customization={customization}
        cameraMode={cameraMode}
        totalKm={totalKm}
      />

      <PassportModal
        isOpen={isPassportOpen}
        onClose={() => setIsPassportOpen(false)}
        visitedLocations={visitedLocations}
        unlockedAchievements={unlockedAchievements}
        totalDistanceKm={totalKm}
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
    </div>
  );
}

