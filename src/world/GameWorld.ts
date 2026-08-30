import * as THREE from 'three';
import { ChhakaroModel } from './ChhakaroModel';
import { EnvironmentBuilder } from './EnvironmentBuilder';
import { TimeOfDaySystem } from './TimeOfDaySystem';
import { NPCSystem } from './NPCSystem';
import { TrafficSystem } from './TrafficSystem';
import { LocationData, VehicleControls, CameraMode, WeatherType, ChhakaroCustomization, TimeOfDayState, PassengerData, VehicleHealthState, TimeFreezeMode, RoadsideEncounter } from '../types';
import { GUJARAT_LOCATIONS } from '../data/locations';
import { ROADSIDE_ENCOUNTERS } from '../data/encounters';
import { soundManager } from '../audio/SoundManager';

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

  // Handlers / Callbacks
  public onLandmarkApproach?: (location: LocationData) => void;
  public onLocationChange?: (location: LocationData) => void;
  public onSpeedUpdate?: (speed: number, rpm: number) => void;
  public onVehicleMove?: (x: number, z: number, headingRad: number) => void;
  public onTimeOfDayUpdate?: (timeState: TimeOfDayState) => void;
  public onHealthUpdate?: (health: VehicleHealthState) => void;
  public onFacilityApproach?: (facility: { type: 'petrol' | 'garage' | 'toll'; name: string } | null) => void;
  public onEncounterApproach?: (encounter: RoadsideEncounter | null) => void;

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
  };

  constructor(container: HTMLElement, customization: ChhakaroCustomization) {
    this.container = container;
    this.clock = new THREE.Clock();

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

    // 7. Spawn Animated Gujarati Pedestrian NPCs
    this.npcSystem = new NPCSystem(this.scene);
    this.npcSystem.spawnAllNPCs(GUJARAT_LOCATIONS);

    // 8. Spawn Dynamic Gujarati Road Traffic (ST Buses, Tractors, Autos, Cows, Bikes)
    this.trafficSystem = new TrafficSystem(this.scene);
    this.trafficSystem.spawnTraffic(GUJARAT_LOCATIONS);

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

  public setWeather(weather: WeatherType) {
    this.currentWeather = weather;

    if (weather === 'sunset') {
      this.timeOfDaySystem.setManualPhase('sunset');
    } else if (weather === 'night') {
      this.timeOfDaySystem.setManualPhase('night');
    } else if (weather === 'sunny') {
      this.timeOfDaySystem.setManualPhase('auto'); // Resume smooth distance based cycle
    }

    if (this.rainParticles) {
      (this.rainParticles.material as THREE.PointsMaterial).opacity = weather === 'rain' ? 0.65 : 0;
    }
  }

  public setTimeOfDayPhase(phase: 'auto' | 'sunrise' | 'day' | 'sunset' | 'night') {
    this.timeOfDaySystem.setManualPhase(phase);
  }

  public setTimeFreezeMode(mode: TimeFreezeMode) {
    this.timeOfDaySystem.setFreezeMode(mode);
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

    // Adapt weather to region
    if (loc.id === 'saputara') this.setWeather('rain');
    else if (loc.id === 'kutch') this.setWeather('sunset');
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
    const distToGir = this.vehiclePos.distanceTo(new THREE.Vector3(150, 0, 550));
    if (distToGir < 160) {
      maxForwardSpeed = Math.min(maxForwardSpeed, 25);
    }

    // Saputara Rain grip modifier
    if (this.currentWeather === 'rain') {
      acceleration *= 0.75;
      friction *= 0.65;
    }

    // 1. Acceleration & Braking
    const isAccelerating = this.controls.forward;
    if (this.controls.forward) {
      this.speed = Math.min(this.speed + acceleration * delta, maxForwardSpeed);
    } else if (this.controls.backward) {
      if (this.speed > 1) {
        this.speed = Math.max(this.speed - brakeForce * delta, 0);
      } else {
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
    const facilities: { type: 'petrol' | 'garage' | 'toll'; name: string; x: number; z: number }[] = [
      { type: 'petrol', name: '⛽ શ્રી ગણેશ પેટ્રોલિયમ (HP)', x: 220, z: 80 },
      { type: 'petrol', name: '⛽ ખોડિયાર પેટ્રોલિયમ (IndianOil)', x: -120, z: -160 },
      { type: 'petrol', name: '⛽ ગીર હાઇવે પેટ્રોલિયમ', x: 100, z: 460 },
      { type: 'garage', name: '🔧 રણછોડ ઓટો ગેરેજ & પંચર', x: 180, z: 50 },
      { type: 'garage', name: '🔧 બાલાજી છકડો સર્વિસ સેન્ટર', x: -80, z: 200 },
      { type: 'toll', name: '🛣️ રાષ્ટ્રીય ધોરીમાર્ગ ટોલ પ્લાઝા', x: 300, z: 100 },
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
      if (this.onFacilityApproach) {
        this.onFacilityApproach(nearest);
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
      this.trafficSystem.update(delta, this.vehiclePos, this.controls.horn);
    }

    // Update dynamic multi-aspect wide traffic signals & countdown timers
    if (this.environmentBuilder?.trafficSignalBuilder) {
      this.environmentBuilder.trafficSignalBuilder.update(delta);
    }

    // Update continuous environment animations (windmills, smoke, steam)
    if (this.environmentBuilder) {
      this.environmentBuilder.update(delta);
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
    this.renderer.dispose();
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

