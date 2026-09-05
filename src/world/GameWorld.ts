import * as THREE from 'three';
import { ChhakaroModel } from './ChhakaroModel';
import { EnvironmentBuilder } from './EnvironmentBuilder';
import { TimeOfDaySystem } from './TimeOfDaySystem';
import { NPCSystem } from './NPCSystem';
import { TrafficSystem } from './TrafficSystem';
import { IncidentDirector } from './IncidentDirector';
import { IncidentSpawn } from '../state/incidents';
import { LocationData, VehicleControls, CameraMode, WeatherType, ChhakaroCustomization, TimeOfDayState, PassengerData, VehicleHealthState, TimeFreezeMode, RoadsideEncounter, TransmissionMode } from '../types';
import { GUJARAT_LOCATIONS } from '../data/locations';
import { PETROL_PUMPS, AUTO_GARAGES, TOLL_PLAZA } from '../data/roadsidePlacements';
import { ROADSIDE_ENCOUNTERS } from '../data/encounters';
import { soundManager } from '../audio/SoundManager';
import { pickWeather, weatherParams, WeatherParams } from '../state/weatherDirector';
import {
  Gear,
  autoGear,
  autoGearUnderThrottle,
  accelMultiplier,
  gearMaxSpeed,
  shiftUp as shiftGearUp,
  shiftDown as shiftGearDown,
  canStartEngine,
  FORWARD_GEARS,
} from '../state/transmission';

// Gir Forest zone centre — hoisted so the per-frame speed-cap distance check in updatePhysics
// doesn't allocate a new Vector3 every frame.
const GIR_CENTER_VEC = new THREE.Vector3(150, 0, 550);

export class GameWorld {
  public container: HTMLElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public chhakaro: ChhakaroModel;
  public environmentBuilder: EnvironmentBuilder;
  public timeOfDaySystem: TimeOfDaySystem;
  public npcSystem: NPCSystem;
  public trafficSystem: TrafficSystem;
  public incidentDirector: IncidentDirector;

  // Lighting & Sky
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public ambientLight: THREE.AmbientLight;
  public rainParticles: THREE.Points | null = null;
  public currentTimeOfDayState: TimeOfDayState | null = null;

  // Vehicle Physics & Health State
  public vehiclePos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public vehicleRotation: number = 0; // heading angle in radians
  public speed: number = 0; // in km/h
  public steerAngle: number = 0; // front wheel steer angle
  public isEngineOn: boolean = false;
  public isHeadlightOn: boolean = true;
  public isHazardOn: boolean = false;
  public currentCameraMode: CameraMode = 'chase';
  public currentWeather: WeatherType = 'sunny';

  // Region/time weather. `weatherParamsCache` holds the driving numbers for `currentWeather`
  // (refreshed in setWeather); the WeatherDirector re-picks at ~2 Hz in animate(). A HUD
  // toggle stamps `manualOverrideUntilDistance` so the manual pick wins for one cycle-distance
  // before the director resumes.
  private weatherParamsCache: WeatherParams = weatherParams('sunny');
  public manualWeatherOverride: WeatherType | null = null;
  private manualOverrideUntilDistance = 0;
  private lastWeatherEvalAt = 0;
  // True while setWeather() (a 'sunset'/'night' pick) is what put the clock in manual mode, so
  // the next non-frozen weather can safely resume 'auto' without stomping a player's own freeze.
  private weatherFrozeTheClock = false;

  // Transmission
  public transmissionMode: TransmissionMode = 'auto';
  public currentGear: Gear = 'N';

  // Vehicle Health & Fuel
  public healthState: VehicleHealthState = {
    fuelPercent: 88,
    maxFuelLiters: 15,
    currentFuelLiters: 13.2,
    fuelConsumptionRateKm: 0.045, // liters/km
    engineTempCelsius: 82,
    isOverheating: false,
    hasPuncture: false,
    punctureWheel: null,
    headlightWorking: true,
    hornWorking: true,
    conditionScore: 95,
  };

  // Passenger & Mission
  public currentPassenger: PassengerData | null = null;

  // Drone Camera Controls
  public droneAltitude: number = 38;
  public droneAngleOffset: number = 0;

  // Game & Navigation
  public currentLocation: LocationData = GUJARAT_LOCATIONS[0];
  public nearbyLandmark: LocationData | null = null;
  public isNearLandmark: boolean = false;
  public nearbyFacility: { type: 'petrol' | 'garage' | 'toll'; name: string; distance: number } | null = null;
  public nearbyEncounter: RoadsideEncounter | null = null;
  public totalDistanceDriven: number = 0; // in meters

  // Highway toll: once paid, the toll prompt stays suppressed until the odometer passes this
  // stamp (payToll sets it to totalDistanceDriven + 300 m). tollBoomTweenT drives the boom
  // raise (null = not tweening; 0..1 while raising; back to null and left up when done).
  public tollPaidUntilDistance = 0;
  private tollBoomTweenT: number | null = null;

  // Handlers / Callbacks
  public onLandmarkApproach?: (location: LocationData) => void;
  public onLocationChange?: (location: LocationData) => void;
  public onSpeedUpdate?: (speed: number, rpm: number) => void;
  public onVehicleMove?: (x: number, z: number, headingRad: number) => void;
  public onTimeOfDayUpdate?: (timeState: TimeOfDayState) => void;
  public onHealthUpdate?: (health: VehicleHealthState) => void;
  public onFacilityApproach?: (facility: { type: 'petrol' | 'garage' | 'toll'; name: string } | null) => void;
  public onTollApproach?: (toll: { name: string } | null) => void;
  public onEncounterApproach?: (encounter: RoadsideEncounter | null) => void;
  public onGearChange?: (gear: Gear) => void;
  public onWeatherChange?: (weather: WeatherType) => void;
  public onIncident?: (i: IncidentSpawn) => void;

  private clock: THREE.Clock;
  private animationFrameId: number = 0;
  private controls: VehicleControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    handbrake: false,
    horn: false,
    headlight: true,
    shiftUp: false,
    shiftDown: false,
  };

  constructor(
    container: HTMLElement,
    customization: ChhakaroCustomization,
    initialDistanceMeters = 0,
    transmissionMode: TransmissionMode = 'auto',
  ) {
    this.container = container;
    this.clock = new THREE.Clock();
    // Resume: seed the odometer so totalKm doesn't snap to 0 on the first frame.
    this.totalDistanceDriven = initialDistanceMeters;
    this.transmissionMode = transmissionMode;

    // 1. Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x38bdf8); // Base sky
    this.scene.fog = new THREE.FogExp2(0x38bdf8, 0.0018);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(55, aspect, 0.2, 3000);
    this.camera.position.set(0, 5, 10);

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.ambientLight = new THREE.AmbientLight(0xffedd5, 0.6);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x15803d, 0.5);
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffbeb, 1.8);
    this.dirLight.position.set(120, 200, 100);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 500;
    this.dirLight.shadow.camera.left = -70;
    this.dirLight.shadow.camera.right = 70;
    this.dirLight.shadow.camera.top = 70;
    this.dirLight.shadow.camera.bottom = -70;
    this.scene.add(this.dirLight);

    // 5. Setup dynamic distance-based Time Of Day lighting system
    this.timeOfDaySystem = new TimeOfDaySystem(
      this.scene,
      this.dirLight,
      this.hemiLight,
      this.ambientLight
    );

    // 6. Build full Gujarat environment
    this.environmentBuilder = new EnvironmentBuilder(this.scene);
    this.environmentBuilder.buildFullWorld(GUJARAT_LOCATIONS);

    // Console/QA hook: world instance handle for debugging and tooling.
    if (typeof window !== 'undefined') {
      (window as unknown as { __CHHAKARO__?: GameWorld }).__CHHAKARO__ = this;
    }

    // 7. Spawn Animated Gujarati Pedestrian NPCs
    this.npcSystem = new NPCSystem(this.scene);
    this.npcSystem.spawnAllNPCs(GUJARAT_LOCATIONS);

    // 8. Spawn Dynamic Gujarati Road Traffic (ST Buses, Tractors, Autos, Cows, Bikes)
    this.trafficSystem = new TrafficSystem(this.scene);
    this.trafficSystem.spawnTraffic(GUJARAT_LOCATIONS);

    // 8b. Procedural road incidents (cattle crossings, stalled trucks, slow tractors, puddles)
    this.incidentDirector = new IncidentDirector(this.scene);

    // 9. Spawn Chhakaro Model
    this.chhakaro = new ChhakaroModel(customization);
    this.scene.add(this.chhakaro.group);
    this.dirLight.target = this.chhakaro.group;

    // 10. Setup Rain Particles
    this.initRainSystem();

    // 11. Event Listeners
    window.addEventListener('resize', this.onWindowResize);
    this.setupKeyboardListeners();

    // Initial time update
    this.currentTimeOfDayState = this.timeOfDaySystem.update(0, this.vehiclePos, this.currentWeather);

    // Start render loop
    this.animate();
  }

  public get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  private initRainSystem() {
    const rainCount = 1800;
    const rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = Math.random() * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.15,
      transparent: true,
      opacity: 0,
    });
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.scene.add(this.rainParticles);
  }

  public setPassenger(passenger: PassengerData | null) {
    this.currentPassenger = passenger;
    this.chhakaro.setPassenger(passenger);
  }

  public refuel(amountLiters: number = 10) {
    this.healthState.currentFuelLiters = Math.min(
      this.healthState.maxFuelLiters,
      this.healthState.currentFuelLiters + amountLiters
    );
    this.healthState.fuelPercent = Math.round((this.healthState.currentFuelLiters / this.healthState.maxFuelLiters) * 100);
    soundManager.playChime();
    if (this.onHealthUpdate) this.onHealthUpdate({ ...this.healthState });
  }

  public repairPunctureAndCool() {
    this.healthState.hasPuncture = false;
    this.healthState.punctureWheel = null;
    this.healthState.engineTempCelsius = 80;
    this.healthState.isOverheating = false;
    this.healthState.conditionScore = 98;
    soundManager.playChime();
    if (this.onHealthUpdate) this.onHealthUpdate({ ...this.healthState });
  }

  public toggleHazardLights(): boolean {
    this.isHazardOn = !this.isHazardOn;
    return this.isHazardOn;
  }

  /**
   * Pay the highway toll: kick off the boom-gate raise tween (~0.8 s, advanced in animate())
   * and stamp a 300 m suppression window so checkFacilityProximity() stops re-prompting.
   * The gate stays up for the rest of the M3 session — it never lowers again.
   */
  public payToll(): void {
    this.tollBoomTweenT = 0;
    this.tollPaidUntilDistance = this.totalDistanceDriven + 300;
  }

  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;
    this.weatherParamsCache = weatherParams(weather);

    // 'sunset'/'night' freeze the time-of-day clock at that phase; any other weather resumes
    // the live distance-based cycle — but ONLY if it was this method that froze it. Otherwise
    // a manual 'night' pick followed by an autonomous rain/fog pick would strand the clock at
    // night forever, while blindly resuming would cancel a player's own "Freeze Day" toggle.
    if (weather === 'sunset') {
      this.timeOfDaySystem.setManualPhase('sunset');
      this.weatherFrozeTheClock = true;
    } else if (weather === 'night') {
      this.timeOfDaySystem.setManualPhase('night');
      this.weatherFrozeTheClock = true;
    } else if (this.weatherFrozeTheClock) {
      this.timeOfDaySystem.setManualPhase('auto'); // Resume smooth distance based cycle
      this.weatherFrozeTheClock = false;
    }

    if (this.rainParticles) {
      (this.rainParticles.material as THREE.PointsMaterial).opacity = this.weatherParamsCache.rainOpacity;
    }

    // Keep React (HUD icon, Kaka context) in step when the director re-picks the weather.
    this.onWeatherChange?.(weather);
  }

  /** HUD weather button: force a weather and make it stick for ~one cycle-distance (1400 m of
   *  driving) before the WeatherDirector resumes region/time control. */
  public setManualWeather(weather: WeatherType) {
    this.manualWeatherOverride = weather;
    this.manualOverrideUntilDistance = this.totalDistanceDriven + 1400;
    this.setWeather(weather);
  }

  public setTimeOfDayPhase(phase: 'auto' | 'sunrise' | 'day' | 'sunset' | 'night') {
    this.timeOfDaySystem.setManualPhase(phase);
  }

  public setTimeFreezeMode(mode: TimeFreezeMode) {
    this.timeOfDaySystem.setFreezeMode(mode);
  }

  /** Skip the day/night phase forward by N virtual hours ("rest till morning"). */
  public advanceTimeOfDay(hours: number) {
    this.timeOfDaySystem.advanceTimeOfDay(hours);
  }

  /** Skip the day/night phase forward to the next occurrence of `targetHour` (0–23), computed
   *  from the live phase clock. "Rest till morning" calls this with 6. */
  public advanceToHour(targetHour: number) {
    this.timeOfDaySystem.advanceToHour(targetHour);
  }

  /** Clear the "weather froze the clock" latch. setTimeFreezeMode('dynamic') resumes the live
   *  cycle but leaves this private flag stale; callers that explicitly unfreeze (e.g. Rest)
   *  clear it here so a later autonomous weather pick doesn't wrongly resume-from-frozen. */
  public clearWeatherClockFreeze() {
    this.weatherFrozeTheClock = false;
  }

  public toggleFreezeDay(): boolean {
    const isNowDayFrozen = this.timeOfDaySystem.toggleDayFreeze();
    soundManager.playClick();
    return isNowDayFrozen;
  }

  public setCameraMode(mode: CameraMode) {
    this.currentCameraMode = mode;
  }

  public toggleHeadlight(): boolean {
    this.isHeadlightOn = !this.isHeadlightOn;
    return this.isHeadlightOn;
  }

  public startVehicleEngine() {
    this.isEngineOn = true;
    soundManager.startEngine();
  }

  private emitGear() {
    this.onGearChange?.(this.currentGear);
  }

  /** Switch gearbox behaviour. In auto we immediately resolve the gear for the current speed. */
  public setTransmissionMode(mode: TransmissionMode) {
    this.transmissionMode = mode;
    if (mode === 'auto') {
      this.currentGear = autoGear(this.speed, this.currentGear);
    }
    this.emitGear();
  }

  /** Manual shift up one gear on the R,N,1..4 ladder (no-op in auto). */
  public shiftUp() {
    if (this.transmissionMode !== 'manual') return;
    this.currentGear = shiftGearUp(this.currentGear);
    this.emitGear();
  }

  /** Manual shift down one gear on the R,N,1..4 ladder (no-op in auto). */
  public shiftDown() {
    if (this.transmissionMode !== 'manual') return;
    this.currentGear = shiftGearDown(this.currentGear);
    this.emitGear();
  }

  /** Start / stop the engine, honouring the manual "standstill in N or R" rule.
   *  Returns the resulting engine state. A refused start leaves the engine off and gives a
   *  single horn toot as the "won't start" cue. */
  public toggleEngine(): boolean {
    if (this.isEngineOn) {
      // Refuse to kill the engine while rolling — updatePhysics early-returns when the engine
      // is off, which would freeze the vehicle at speed and strand the HUD on its last reading.
      if (Math.abs(this.speed) > 1) {
        soundManager.playHorn(1);
        return true;
      }
      this.isEngineOn = false;
      soundManager.stopEngine();
      return false;
    }
    if (!canStartEngine(this.transmissionMode, this.currentGear, this.speed)) {
      soundManager.playHorn(1);
      return false;
    }
    this.startVehicleEngine();
    return true;
  }

  public updateCustomization(custom: ChhakaroCustomization) {
    this.chhakaro.updateCustomization(custom);
  }

  public setControlState(key: keyof VehicleControls, state: boolean) {
    this.controls[key] = state;
    if (key === 'horn') {
      if (state) soundManager.startHorn();
      else soundManager.stopHorn();
    }
  }

  /**
   * Fast travel teleportation to any Gujarat landmark
   */
  public teleportToLocation(loc: LocationData) {
    this.currentLocation = loc;
    this.vehiclePos.set(loc.worldPosition.x, 0, loc.worldPosition.z + 10);
    this.vehicleRotation = Math.PI; // Face toward landmark
    this.speed = 0;
    this.steerAngle = 0;
    this.chhakaro.group.position.copy(this.vehiclePos);
    this.chhakaro.group.rotation.y = this.vehicleRotation;

    // Adapt weather to region. Route through setManualWeather so the arrival look holds for a
    // stretch before the WeatherDirector (which also knows these regions) resumes control —
    // otherwise the ~2 Hz re-pick would fight the teleport the same second.
    if (loc.id === 'saputara') this.setManualWeather('rain');
    else if (loc.id === 'kutch') this.setManualWeather('fog');
    else if (loc.id === 'dwarka' || loc.id === 'somnath') soundManager.playTempleBell();

    if (this.onLocationChange) this.onLocationChange(loc);
  }

  private setupKeyboardListeners() {
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      const key = e.key.toLowerCase();

      switch (key) {
        case 'w':
        case 'arrowup':
          this.controls.forward = isDown;
          break;
        case 's':
        case 'arrowdown':
          this.controls.backward = isDown;
          break;
        case 'a':
        case 'arrowleft':
          this.controls.left = isDown;
          break;
        case 'd':
        case 'arrowright':
          this.controls.right = isDown;
          break;
        case ' ':
          this.controls.handbrake = isDown;
          break;
        case 'h':
          this.controls.horn = isDown;
          if (isDown) soundManager.startHorn();
          else soundManager.stopHorn();
          break;
        case 'l':
          if (isDown) this.toggleHeadlight();
          break;
        case 'x':
          if (isDown) this.toggleHazardLights();
          break;
        case 'c':
          if (isDown) {
            const modes: CameraMode[] = ['chase', 'hood', 'passenger', 'cinematic', 'drone'];
            const nextIdx = (modes.indexOf(this.currentCameraMode) + 1) % modes.length;
            this.setCameraMode(modes[nextIdx]);
          }
          break;
      }
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
  }

  private updatePhysics(delta: number) {
    if (!this.isEngineOn) {
      this.speed *= 0.95;
      return;
    }

    // Top Speed limits
    let maxForwardSpeed = 68; // km/h for authentic Saurashtra Chhakaro
    const maxReverseSpeed = -18;
    let acceleration = 24; // km/h per sec
    const brakeForce = 45;
    let friction = 12;

    // Fuel depletion
    if (this.healthState.currentFuelLiters > 0) {
      const consumed = (Math.abs(this.speed) > 1 ? 0.003 : 0.0008) * delta;
      this.healthState.currentFuelLiters = Math.max(0, this.healthState.currentFuelLiters - consumed);
      this.healthState.fuelPercent = Math.round(
        (this.healthState.currentFuelLiters / this.healthState.maxFuelLiters) * 100
      );
    } else {
      // Out of fuel!
      maxForwardSpeed = 0;
      acceleration = 0;
    }

    // Puncture mechanics: limit speed and add pull
    if (this.healthState.hasPuncture) {
      maxForwardSpeed = Math.min(maxForwardSpeed, 22);
      acceleration *= 0.5;
      // Slight steer pull
      this.steerAngle += 0.05 * delta;
    }

    // Engine temperature simulation
    if (Math.abs(this.speed) > 55) {
      this.healthState.engineTempCelsius = Math.min(125, this.healthState.engineTempCelsius + 1.2 * delta);
    } else {
      this.healthState.engineTempCelsius = Math.max(78, this.healthState.engineTempCelsius - 0.5 * delta);
    }
    this.healthState.isOverheating = this.healthState.engineTempCelsius > 110;

    // Gir Forest Mode speed cap (25 km/h) to protect Asiatic lions & wildlife
    const distToGir = this.vehiclePos.distanceTo(GIR_CENTER_VEC);
    if (distToGir < 160) {
      maxForwardSpeed = Math.min(maxForwardSpeed, 25);
    }

    // Crawl through an active road incident (cattle on the road, stalled truck, etc.)
    if (this.incidentDirector.playerMustSlow) {
      maxForwardSpeed = Math.min(maxForwardSpeed, 12);
    }

    // Region/time weather grip: rain slashes accel & braking authority, coastal/dust fog
    // trims it slightly (see weatherParams). Applied to both so the cart both accelerates
    // and stops worse on a wet Saputara ghat.
    acceleration *= this.weatherParamsCache.gripMultiplier;
    friction *= this.weatherParamsCache.gripMultiplier;
    // Kutch dust storm: a faint, constant sideways drift on the little three-wheeler.
    // `windPushX` is zone-agnostic in weatherParams; the shove only makes sense in the Rann,
    // so gate it to Kutch (sea fog on the coast should not push the vehicle).
    if (this.currentLocation.id === 'kutch') {
      this.vehiclePos.x += this.weatherParamsCache.windPushX * delta * 0.1;
    }

    // Transmission — gear-aware torque + per-gear speed ceiling.
    // autoGear() upshifts strictly above the band max while the clamp below pins speed
    // *exactly* at that max, so under throttle we resolve the gear against the pre-clamp
    // next-frame speed (`acceleration * delta`, the very step the accel branch applies) —
    // otherwise an automatic deadlocks on the gear-1 ceiling (18 km/h).
    if (this.transmissionMode === 'auto') {
      this.currentGear = autoGearUnderThrottle(
        this.speed, this.currentGear, this.controls.forward, acceleration * delta,
      );
    } // manual: this.currentGear is set by shiftUp/shiftDown
    const gearMult = accelMultiplier(this.currentGear, Math.abs(this.speed), this.transmissionMode);
    acceleration *= gearMult;
    maxForwardSpeed = Math.min(maxForwardSpeed, gearMaxSpeed(this.currentGear));
    if (this.currentGear === 'N') { acceleration = 0; }
    this.emitGear();

    // 1. Acceleration & Braking
    // Manual mode only pulls forward with a forward gear engaged ('1'..'4'); throttle in
    // 'N'/'R' just coasts. Reverse-from-standstill is already gated to R (auto is unaffected),
    // and the `speed > 1` brake sub-case stays shared across every mode.
    const forwardGearEngaged =
      this.transmissionMode !== 'manual' || FORWARD_GEARS.includes(this.currentGear);
    const isAccelerating = this.controls.forward;
    if (this.controls.forward && forwardGearEngaged) {
      this.speed = Math.min(this.speed + acceleration * delta, maxForwardSpeed);
    } else if (this.controls.backward) {
      if (this.speed > 1) {
        this.speed = Math.max(this.speed - brakeForce * delta, 0);
      } else if (this.transmissionMode === 'auto' || this.currentGear === 'R') {
        this.speed = Math.max(this.speed - acceleration * 0.7 * delta, maxReverseSpeed);
      }
    } else if (this.controls.handbrake) {
      this.speed = this.speed > 0 ? Math.max(this.speed - brakeForce * 1.8 * delta, 0) : Math.min(this.speed + brakeForce * 1.8 * delta, 0);
    } else {
      // Natural rolling resistance friction
      if (this.speed > 0) this.speed = Math.max(this.speed - friction * delta, 0);
      else if (this.speed < 0) this.speed = Math.min(this.speed + friction * delta, 0);
    }

    // 2. Steering angle
    const maxSteer = 0.52; // ~30 degrees
    const steerSpeed = 2.4;
    if (this.controls.left) {
      this.steerAngle = Math.min(this.steerAngle + steerSpeed * delta, maxSteer);
    } else if (this.controls.right) {
      this.steerAngle = Math.max(this.steerAngle - steerSpeed * delta, -maxSteer);
    } else {
      this.steerAngle *= 0.85; // Auto-center
    }

    // 3. Update vehicle heading orientation
    if (Math.abs(this.speed) > 0.1) {
      const turnRadius = 3.5;
      const turnRate = (this.speed / 3.6 / turnRadius) * Math.sin(this.steerAngle);
      this.vehicleRotation += turnRate * delta;
    }

    // 4. Move position forward/backward in heading direction
    const forwardX = -Math.sin(this.vehicleRotation);
    const forwardZ = -Math.cos(this.vehicleRotation);
    const moveStep = (this.speed / 3.6) * delta;

    this.vehiclePos.x += forwardX * moveStep;
    this.vehiclePos.z += forwardZ * moveStep;

    // Track total distance
    if (Math.abs(moveStep) > 0) {
      this.totalDistanceDriven += Math.abs(moveStep);
    }

    // 5. Update Chhakaro 3D model transforms & tilt
    this.chhakaro.group.position.set(this.vehiclePos.x, 0, this.vehiclePos.z);
    this.chhakaro.group.rotation.y = this.vehicleRotation;

    // Three-wheeler body roll / tilt into corners
    const bodyTilt = -(this.speed / 60) * this.steerAngle * 0.28;
    this.chhakaro.group.rotation.z = bodyTilt;

    // Update Chhakaro internal wheel spin, smoke, lights, hazard, puncture
    this.chhakaro.update(
      delta,
      this.speed,
      this.steerAngle,
      this.controls.backward || this.controls.handbrake,
      this.isHeadlightOn,
      this.isHazardOn,
      this.healthState.hasPuncture
    );

    // Update diesel engine audio
    soundManager.updateEngineRPM(this.speed, isAccelerating);

    // Update UI speeds
    if (this.onSpeedUpdate) {
      const rpm = Math.floor(800 + (Math.abs(this.speed) / 70) * 2400);
      this.onSpeedUpdate(Math.round(this.speed), rpm);
    }

    this.onVehicleMove?.(this.vehiclePos.x, this.vehiclePos.z, this.vehicleRotation);

    if (this.onHealthUpdate) {
      this.onHealthUpdate({ ...this.healthState });
    }

    // 6. Check landmark proximity & facilities & encounters
    this.checkLandmarkProximity();
    this.checkFacilityProximity();
    this.checkRoadsideEncounters();
  }

  private checkRoadsideEncounters() {
    let nearest: RoadsideEncounter | null = null;
    let minDist = 35; // Interaction radius in meters

    for (const enc of ROADSIDE_ENCOUNTERS) {
      const d = Math.hypot(this.vehiclePos.x - enc.worldPosition.x, this.vehiclePos.z - enc.worldPosition.z);
      if (d < minDist) {
        minDist = d;
        nearest = enc;
      }
    }

    if (nearest !== this.nearbyEncounter) {
      this.nearbyEncounter = nearest;
      if (this.onEncounterApproach) {
        this.onEncounterApproach(nearest);
      }
    }
  }

  private checkFacilityProximity() {
    // Single source of truth with EnvironmentBuilder's 3D props (roadsidePlacements.ts)
    const facilities: { type: 'petrol' | 'garage' | 'toll'; name: string; x: number; z: number }[] = [
      ...PETROL_PUMPS.map((f) => ({ type: 'petrol' as const, name: f.name, x: f.spot.x, z: f.spot.z })),
      ...AUTO_GARAGES.map((g) => ({ type: 'garage' as const, name: g.name, x: g.spot.x, z: g.spot.z })),
      { type: 'toll' as const, name: TOLL_PLAZA.name, x: TOLL_PLAZA.spot.x, z: TOLL_PLAZA.spot.z },
    ];

    let nearest: { type: 'petrol' | 'garage' | 'toll'; name: string; distance: number } | null = null;
    let minDist = 35; // Interaction radius

    for (const f of facilities) {
      const d = Math.hypot(this.vehiclePos.x - f.x, this.vehiclePos.z - f.z);
      if (d < minDist) {
        minDist = d;
        nearest = { type: f.type, name: f.name, distance: d };
      }
    }

    if (nearest !== this.nearbyFacility) {
      this.nearbyFacility = nearest;

      const isToll = nearest?.type === 'toll';
      const tollDue = isToll && this.totalDistanceDriven >= this.tollPaidUntilDistance;

      if (tollDue && nearest) {
        // Toll owns the prompt while a fee is due — keep the generic petrol/garage pill hidden.
        this.onTollApproach?.({ name: nearest.name });
        this.onFacilityApproach?.(null);
      } else {
        // Not a toll, or the toll's already paid within the 300 m window — clear the toll
        // prompt and route petrol/garage through the generic facility pill exactly as before.
        this.onTollApproach?.(null);
        this.onFacilityApproach?.(isToll ? null : nearest);
      }
    }
  }

  private checkLandmarkProximity() {
    let closestDist = Infinity;
    let closestLoc: LocationData = this.currentLocation;

    for (const loc of GUJARAT_LOCATIONS) {
      const dist = Math.hypot(this.vehiclePos.x - loc.worldPosition.x, this.vehiclePos.z - loc.worldPosition.z);
      if (dist < closestDist) {
        closestDist = dist;
        closestLoc = loc;
      }
    }

    if (closestDist < 95) {
      if (!this.isNearLandmark || this.nearbyLandmark?.id !== closestLoc.id) {
        this.isNearLandmark = true;
        this.nearbyLandmark = closestLoc;
        if (this.onLandmarkApproach) {
          this.onLandmarkApproach(closestLoc);
        }
      }
    } else {
      this.isNearLandmark = false;
      this.nearbyLandmark = null;
    }

    if (closestLoc.id !== this.currentLocation.id && closestDist < closestLoc.zoneRadius) {
      this.currentLocation = closestLoc;
      if (this.onLocationChange) {
        this.onLocationChange(closestLoc);
      }
    }
  }

  private updateCamera(delta: number) {
    const targetPos = this.chhakaro.group.position;
    const forward = new THREE.Vector3(-Math.sin(this.vehicleRotation), 0, -Math.cos(this.vehicleRotation));

    switch (this.currentCameraMode) {
      case 'hood': {
        // Driver POV (Right on handlebars looking through windshield)
        const driverOffset = new THREE.Vector3(0, 1.45, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicleRotation);
        this.camera.position.copy(targetPos).add(driverOffset);
        const lookTarget = targetPos.clone().add(forward.clone().multiplyScalar(30)).add(new THREE.Vector3(0, 1.2, 0));
        this.camera.lookAt(lookTarget);
        break;
      }

      case 'passenger': {
        // View from rear decorated bench seat
        const seatOffset = new THREE.Vector3(0.3, 1.6, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicleRotation);
        this.camera.position.copy(targetPos).add(seatOffset);
        const lookTarget = targetPos.clone().add(forward.clone().multiplyScalar(20)).add(new THREE.Vector3(0, 1.0, 0));
        this.camera.lookAt(lookTarget);
        break;
      }

      case 'cinematic': {
        // Smooth dramatic orbiting camera
        const time = Date.now() * 0.0006;
        const orbitRadius = 14;
        const cx = targetPos.x + Math.sin(time) * orbitRadius;
        const cz = targetPos.z + Math.cos(time) * orbitRadius;
        this.camera.position.lerp(new THREE.Vector3(cx, targetPos.y + 4.5, cz), 0.08);
        this.camera.lookAt(targetPos.x, targetPos.y + 1.2, targetPos.z);
        break;
      }

      case 'drone': {
        // Aerial GPS / Bird's Eye view with configurable altitude
        const dronePos = new THREE.Vector3(
          targetPos.x + Math.sin(this.droneAngleOffset) * 15,
          targetPos.y + this.droneAltitude,
          targetPos.z + Math.cos(this.droneAngleOffset) * 15
        );
        this.camera.position.lerp(dronePos, 0.1);
        this.camera.lookAt(targetPos.x, targetPos.y, targetPos.z);
        break;
      }

      case 'chase':
      default: {
        // Third person chase cam with speed zoom
        const chaseDist = 7.5 + (Math.abs(this.speed) / 70) * 3.5;
        const chaseHeight = 3.2 + (Math.abs(this.speed) / 70) * 1.0;
        const desiredPos = targetPos
          .clone()
          .sub(forward.clone().multiplyScalar(chaseDist))
          .add(new THREE.Vector3(0, chaseHeight, 0));

        this.camera.position.lerp(desiredPos, 0.12);
        const lookAhead = targetPos.clone().add(forward.clone().multiplyScalar(8)).add(new THREE.Vector3(0, 1.2, 0));
        this.camera.lookAt(lookAhead);
        break;
      }
    }

    // Rain particles follow player
    if (this.rainParticles && this.currentWeather === 'rain') {
      this.rainParticles.position.set(targetPos.x, 0, targetPos.z);
      const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= delta * 35;
        if (positions[i] < 0) positions[i] = 40;
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.1);

    this.updatePhysics(delta);

    // Update smooth distance-based time of day & lighting
    const timeState = this.timeOfDaySystem.update(this.totalDistanceDriven, this.vehiclePos, this.currentWeather);
    this.currentTimeOfDayState = timeState;

    // Region/time weather — re-picked at ~2 Hz off the pure WeatherDirector (needs the fresh
    // phase, so this runs after the time-of-day update). A HUD override wins until the player
    // has driven the stamped stretch, then the director resumes.
    const nowMs = performance.now();
    if (nowMs - this.lastWeatherEvalAt > 500) {
      this.lastWeatherEvalAt = nowMs;
      const overrideActive = this.totalDistanceDriven < this.manualOverrideUntilDistance;
      if (!overrideActive) this.manualWeatherOverride = null; // window elapsed — don't keep a stale pick
      const next = pickWeather({
        zoneId: this.currentLocation.id,
        phase: timeState.phase,
        distanceDriven: this.totalDistanceDriven,
        manualOverride: overrideActive ? this.manualWeatherOverride : null,
      });
      if (next !== this.currentWeather) this.setWeather(next);
    }

    // T7 Ruling: WeatherDirector owns scene.fog.density — but as a FLOOR, not a clamp.
    // TimeOfDaySystem already wrote its computed density (the day→night haze ramp) to
    // scene.fog.density this same frame just above; weather can only thicken it, so the
    // night ramp survives while fog (0.011) / rain (0.005) still win when they're heavier.
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = Math.max(this.scene.fog.density, this.weatherParamsCache.fogDensity);
    }

    // Light up city windows / street lamps at night; bloom the coastal aarti glow at dusk
    this.environmentBuilder.setNightFactor(THREE.MathUtils.clamp(-timeState.sunElevation * 1.6 + 0.15, 0, 1));
    if (this.onTimeOfDayUpdate) {
      this.onTimeOfDayUpdate(timeState);
    }

    this.updateCamera(delta);

    // Update animated Gujarati Pedestrian NPCs
    if (this.npcSystem) {
      this.npcSystem.update(delta, this.vehiclePos, this.controls.horn);
    }

    // Update dynamic road traffic & wildlife
    if (this.trafficSystem) {
      this.trafficSystem.update(delta, this.vehiclePos, this.controls.horn, this.vehicleRotation);
    }

    // Procedural road incidents — pure scheduler + THREE director; notify on the frame one appears
    const spawned = this.incidentDirector.update(
      delta,
      this.vehiclePos,
      this.vehicleRotation,
      this.totalDistanceDriven,
      this.speed,
      this.currentLocation.id,
      this.currentWeather
    );
    if (spawned) this.onIncident?.(spawned);

    // Update dynamic multi-aspect wide traffic signals & countdown timers
    if (this.environmentBuilder?.trafficSignalBuilder) {
      this.environmentBuilder.trafficSignalBuilder.update(delta);
    }

    // Update continuous environment animations (windmills, smoke, steam)
    if (this.environmentBuilder) {
      this.environmentBuilder.update(delta);
    }

    // Toll boom-gate raise: payToll() sets tollBoomTweenT to 0; lerp rotation.z 0 -> -PI/2
    // over ~0.8 s, then leave it raised (tweenT back to null, gate stays open for the session).
    const boomGate = this.environmentBuilder.tollBoomGates[0];
    if (this.tollBoomTweenT !== null && boomGate) {
      this.tollBoomTweenT = Math.min(this.tollBoomTweenT + delta / 0.8, 1);
      boomGate.rotation.z = THREE.MathUtils.lerp(0, -Math.PI / 2, this.tollBoomTweenT);
      if (this.tollBoomTweenT >= 1) this.tollBoomTweenT = null;
    }

    this.renderer.render(this.scene, this.camera);
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public destroy() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    soundManager.stopEngine();
    if (this.npcSystem) {
      this.npcSystem.destroy();
    }
    if (this.trafficSystem) {
      this.trafficSystem.destroy();
    }
    if (this.incidentDirector) {
      this.incidentDirector.destroy();
    }
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

