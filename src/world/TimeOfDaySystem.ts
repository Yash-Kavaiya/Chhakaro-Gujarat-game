import * as THREE from 'three';
import { TimeOfDayState, TimeOfDayPhase, WeatherType, TimeFreezeMode } from '../types';

interface LightingKeyframe {
  progress: number; // 0.0 to 1.0 (0.0 = 06:00 AM Dawn)
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  dirLightColor: number;
  dirLightIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  ambientColor: number;
  ambientIntensity: number;
  sunElevation: number; // -1 (nadir) to +1 (zenith)
  starsOpacity: number;
  cloudColor: number;
  phase: TimeOfDayPhase;
  phaseGujarati: string;
  phaseEnglish: string;
}

export class TimeOfDaySystem {
  private scene: THREE.Scene;
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight;

  // Sky & Celestial Meshes
  private celestialGroup: THREE.Group;
  private sunMesh: THREE.Mesh;
  private sunHalo: THREE.Mesh;
  private moonMesh: THREE.Mesh;
  private moonGlow: THREE.Mesh;
  private starPoints: THREE.Points;
  private shootingStar: THREE.Line;
  private cloudsGroup: THREE.Group;
  private cloudMeshes: THREE.Mesh[] = [];

  // Animation & Transition settings
  public cycleDistance: number = 1400; // 1400 meters of driving per 24h day-night cycle
  private manualMode: boolean = false;
  private manualProgress: number = 0;
  private timeFreezeMode: TimeFreezeMode = 'dynamic';
  private currentProgress: number = 0;
  private smoothProgress: number = 0;

  // Keyframes along 24h cycle (starting at 0.0 = 06:00 AM sunrise)
  private keyframes: LightingKeyframe[] = [
    {
      // 06:00 AM - Dawn / Early Sunrise (સૂર્યોદય)
      progress: 0.0,
      skyColor: 0xf97316, // Golden orange dawn
      fogColor: 0xfba74c,
      fogDensity: 0.0022,
      dirLightColor: 0xfed7aa,
      dirLightIntensity: 1.1,
      hemiSkyColor: 0xfed7aa,
      hemiGroundColor: 0x15803d,
      ambientColor: 0xffedd5,
      ambientIntensity: 0.45,
      sunElevation: 0.15,
      starsOpacity: 0.2,
      cloudColor: 0xfeb272,
      phase: 'sunrise',
      phaseGujarati: 'સૂર્યોદય (સવાર)',
      phaseEnglish: 'Sunrise / Dawn',
    },
    {
      // 08:30 AM - Morning Sunlight (પ્રભાત)
      progress: 0.1,
      skyColor: 0x60a5fa, // Crisp morning azure
      fogColor: 0x93c5fd,
      fogDensity: 0.0018,
      dirLightColor: 0xfef08a,
      dirLightIntensity: 1.6,
      hemiSkyColor: 0xe0f2fe,
      hemiGroundColor: 0x166534,
      ambientColor: 0xffedd5,
      ambientIntensity: 0.58,
      sunElevation: 0.45,
      starsOpacity: 0.0,
      cloudColor: 0xffffff,
      phase: 'day',
      phaseGujarati: 'પ્રભાત (સવાર)',
      phaseEnglish: 'Morning Sun',
    },
    {
      // 12:30 PM - High Noon / Full Day (બપોરનો તડકો)
      progress: 0.27,
      skyColor: 0x38bdf8, // Brilliant Gujarat blue
      fogColor: 0x7dd3fc,
      fogDensity: 0.0015,
      dirLightColor: 0xfffbeb,
      dirLightIntensity: 1.9,
      hemiSkyColor: 0xffffff,
      hemiGroundColor: 0x14532d,
      ambientColor: 0xffedd5,
      ambientIntensity: 0.65,
      sunElevation: 0.95,
      starsOpacity: 0.0,
      cloudColor: 0xffffff,
      phase: 'day',
      phaseGujarati: 'બપોર (દિવસ)',
      phaseEnglish: 'Bright Afternoon',
    },
    {
      // 04:30 PM - Late Afternoon Warmth
      progress: 0.44,
      skyColor: 0x38bdf8,
      fogColor: 0xfde047,
      fogDensity: 0.0017,
      dirLightColor: 0xfde047,
      dirLightIntensity: 1.7,
      hemiSkyColor: 0xfef08a,
      hemiGroundColor: 0x166534,
      ambientColor: 0xffedd5,
      ambientIntensity: 0.6,
      sunElevation: 0.55,
      starsOpacity: 0.0,
      cloudColor: 0xfef3c7,
      phase: 'day',
      phaseGujarati: 'ઢળતી બપોર',
      phaseEnglish: 'Late Afternoon',
    },
    {
      // 06:15 PM - Golden Hour (સોનેરી સાંજ)
      progress: 0.51,
      skyColor: 0xf59e0b, // Warm radiant gold
      fogColor: 0xfb923c,
      fogDensity: 0.002,
      dirLightColor: 0xf97316,
      dirLightIntensity: 1.45,
      hemiSkyColor: 0xfcd34d,
      hemiGroundColor: 0xb45309,
      ambientColor: 0xfef3c7,
      ambientIntensity: 0.52,
      sunElevation: 0.22,
      starsOpacity: 0.05,
      cloudColor: 0xf97316,
      phase: 'sunset',
      phaseGujarati: 'સોનેરી સાંજ (ગોલ્ડન અવર)',
      phaseEnglish: 'Golden Hour',
    },
    {
      // 07:15 PM - Fiery Saurashtra Sunset (સંધ્યાકાળ)
      progress: 0.56,
      skyColor: 0xdb2777, // Vibrant vermillion & crimson magenta
      fogColor: 0xe11d48,
      fogDensity: 0.0025,
      dirLightColor: 0xef4444,
      dirLightIntensity: 0.95,
      hemiSkyColor: 0xf43f5e,
      hemiGroundColor: 0x4c1d95,
      ambientColor: 0x9f1239,
      ambientIntensity: 0.38,
      sunElevation: 0.05,
      starsOpacity: 0.35,
      cloudColor: 0xf43f5e,
      phase: 'sunset',
      phaseGujarati: 'સંધ્યાકાળ (સૂર્યાસ્ત)',
      phaseEnglish: 'Crimson Sunset',
    },
    {
      // 08:00 PM - Twilight & Dusk (ગોધુલી વેળા)
      progress: 0.62,
      skyColor: 0x312e81, // Deep violet indigo
      fogColor: 0x1e1b4b,
      fogDensity: 0.0028,
      dirLightColor: 0x818cf8,
      dirLightIntensity: 0.45,
      hemiSkyColor: 0x3730a3,
      hemiGroundColor: 0x0f172a,
      ambientColor: 0x312e81,
      ambientIntensity: 0.28,
      sunElevation: -0.15,
      starsOpacity: 0.75,
      cloudColor: 0x4338ca,
      phase: 'dusk',
      phaseGujarati: 'ગોધુલી વેળા (સાંજ)',
      phaseEnglish: 'Dusk / Twilight',
    },
    {
      // 10:30 PM - Starlit Night (ચાંદની રાત)
      progress: 0.73,
      skyColor: 0x020617, // Obsidian midnight
      fogColor: 0x020617,
      fogDensity: 0.0032,
      dirLightColor: 0x7dd3fc, // Cool lunar light
      dirLightIntensity: 0.28,
      hemiSkyColor: 0x1e1b4b,
      hemiGroundColor: 0x020617,
      ambientColor: 0x0f172a,
      ambientIntensity: 0.2,
      sunElevation: -0.65,
      starsOpacity: 1.0,
      cloudColor: 0x1e293b,
      phase: 'night',
      phaseGujarati: 'ચાંદની રાત (રાત્રિ)',
      phaseEnglish: 'Starlit Night',
    },
    {
      // 02:00 AM - Deep Midnight (મધ્યરાત્રિ)
      progress: 0.83,
      skyColor: 0x020617,
      fogColor: 0x020617,
      fogDensity: 0.0035,
      dirLightColor: 0x93c5fd,
      dirLightIntensity: 0.22,
      hemiSkyColor: 0x0f172a,
      hemiGroundColor: 0x000000,
      ambientColor: 0x090d16,
      ambientIntensity: 0.18,
      sunElevation: -0.92,
      starsOpacity: 1.0,
      cloudColor: 0x0f172a,
      phase: 'night',
      phaseGujarati: 'મધ્યરાત્રિ (શાંત રાત)',
      phaseEnglish: 'Midnight',
    },
    {
      // 04:45 AM - Pre-Dawn (બ્રહ્મ મુહૂર્ત)
      progress: 0.95,
      skyColor: 0x1e1b4b, // Indigo shifting to pinkish morning blush
      fogColor: 0x312e81,
      fogDensity: 0.0026,
      dirLightColor: 0xf472b6,
      dirLightIntensity: 0.55,
      hemiSkyColor: 0x6366f1,
      hemiGroundColor: 0x1e1b4b,
      ambientColor: 0x1e293b,
      ambientIntensity: 0.3,
      sunElevation: -0.1,
      starsOpacity: 0.6,
      cloudColor: 0xa855f7,
      phase: 'dawn',
      phaseGujarati: 'બ્રહ્મ મુહૂર્ત (પરોઢ)',
      phaseEnglish: 'Pre-Dawn / Brahma Muhurta',
    },
  ];

  constructor(
    scene: THREE.Scene,
    dirLight: THREE.DirectionalLight,
    hemiLight: THREE.HemisphereLight,
    ambientLight: THREE.AmbientLight
  ) {
    this.scene = scene;
    this.dirLight = dirLight;
    this.hemiLight = hemiLight;
    this.ambientLight = ambientLight;

    // Celestial parent group that follows player
    this.celestialGroup = new THREE.Group();
    this.scene.add(this.celestialGroup);

    // 1. Sun Mesh & Glow Corona
    const sunGeo = new THREE.SphereGeometry(18, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({
      color: 0xfffae0,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.celestialGroup.add(this.sunMesh);

    // Outer sun corona halo
    const haloGeo = new THREE.RingGeometry(18, 38, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sunMesh.add(this.sunHalo);

    // 2. Moon Mesh & Atmospheric Lunar Glow
    const moonGeo = new THREE.SphereGeometry(14, 20, 20);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x93c5fd,
      emissiveIntensity: 0.35,
      roughness: 0.9,
      fog: false,
    });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.celestialGroup.add(this.moonMesh);

    // Moon halo ring
    const moonHaloGeo = new THREE.RingGeometry(14, 26, 24);
    const moonHaloMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      fog: false,
    });
    this.moonGlow = new THREE.Mesh(moonHaloGeo, moonHaloMat);
    this.moonMesh.add(this.moonGlow);

    // 3. Realistic Starfield
    this.starPoints = this.createStarfield();
    this.celestialGroup.add(this.starPoints);

    // 4. Shooting Star Streak
    this.shootingStar = this.createShootingStar();
    this.celestialGroup.add(this.shootingStar);

    // 5. Stylized Low-Poly Horizon Clouds
    this.cloudsGroup = new THREE.Group();
    this.createAtmosphericClouds();
    this.celestialGroup.add(this.cloudsGroup);
  }

  private createStarfield(): THREE.Points {
    const starCount = 2800;
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const radius = 800;

    const starPalette = [
      new THREE.Color(0xffffff), // Pure white
      new THREE.Color(0x93c5fd), // Soft cyan/blue
      new THREE.Color(0xfef08a), // Golden dwarf
      new THREE.Color(0xf472b6), // Nebula pink
    ];

    for (let i = 0; i < starCount; i++) {
      // Distribute randomly across upper hemisphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9 + 0.05); // Keep mostly above horizon

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = starPalette[Math.floor(Math.random() * starPalette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.8,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      fog: false,
      depthWrite: false,
    });

    return new THREE.Points(starGeo, starMat);
  }

  private createShootingStar(): THREE.Line {
    const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -12, 35)];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0,
      fog: false,
    });
    const line = new THREE.Line(geo, mat);
    line.position.set(0, -500, 0);
    return line;
  }

  private createAtmosphericClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.9,
      transparent: true,
      opacity: 0.85,
      fog: true,
    });

    // Ring of soft puffy clouds along horizon
    const numCloudClusters = 14;
    const distance = 450;

    for (let i = 0; i < numCloudClusters; i++) {
      const angle = (i / numCloudClusters) * Math.PI * 2;
      const clusterGroup = new THREE.Group();
      const cx = Math.cos(angle) * distance;
      const cz = Math.sin(angle) * distance;
      const cy = 70 + Math.sin(i * 1.5) * 20;

      clusterGroup.position.set(cx, cy, cz);

      // Puffs
      const puffCount = 3 + Math.floor(Math.random() * 3);
      for (let p = 0; p < puffCount; p++) {
        const puffSize = 25 + Math.random() * 20;
        const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(puffSize, 1), cloudMat.clone());
        mesh.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 40);
        mesh.scale.set(1.4, 0.5, 1.0);
        clusterGroup.add(mesh);
        this.cloudMeshes.push(mesh);
      }

      this.cloudsGroup.add(clusterGroup);
    }
  }

  /**
   * Updates lighting and celestial bodies according to total distance traveled
   */
  public update(totalDistanceDriven: number, playerPos: THREE.Vector3, weather: WeatherType = 'sunny'): TimeOfDayState {
    // Keep celestial objects centered over player
    this.celestialGroup.position.set(playerPos.x, 0, playerPos.z);

    // Calculate progress (0.0 to 1.0)
    let rawProgress = (totalDistanceDriven % this.cycleDistance) / this.cycleDistance;

    if (this.manualMode) {
      rawProgress = this.manualProgress;
    }

    this.currentProgress = rawProgress;

    // Smooth lerp to prevent any snapping
    this.smoothProgress += (rawProgress - this.smoothProgress) * 0.15;
    if (Math.abs(rawProgress - this.smoothProgress) > 0.5) {
      // Wrapped around 0 -> 1 boundary
      this.smoothProgress = rawProgress;
    }

    const t = this.smoothProgress;

    // Find bounding keyframes for smooth interpolation
    let idx1 = 0;
    for (let i = 0; i < this.keyframes.length; i++) {
      if (this.keyframes[i].progress <= t) {
        idx1 = i;
      }
    }
    const idx2 = (idx1 + 1) % this.keyframes.length;

    const k1 = this.keyframes[idx1];
    const k2 = this.keyframes[idx2];

    let span = k2.progress - k1.progress;
    if (span <= 0) span += 1.0;

    let segmentT = (t - k1.progress) / span;
    if (segmentT < 0) segmentT += 1.0;
    segmentT = Math.max(0, Math.min(1, segmentT));

    // Smooth step curve
    const smoothT = segmentT * segmentT * (3 - 2 * segmentT);

    // Interpolate colors
    const currentSkyColor = new THREE.Color(k1.skyColor).lerp(new THREE.Color(k2.skyColor), smoothT);
    const currentFogColor = new THREE.Color(k1.fogColor).lerp(new THREE.Color(k2.fogColor), smoothT);
    const currentDirColor = new THREE.Color(k1.dirLightColor).lerp(new THREE.Color(k2.dirLightColor), smoothT);
    const currentHemiSky = new THREE.Color(k1.hemiSkyColor).lerp(new THREE.Color(k2.hemiSkyColor), smoothT);
    const currentHemiGround = new THREE.Color(k1.hemiGroundColor).lerp(new THREE.Color(k2.hemiGroundColor), smoothT);
    const currentAmbientColor = new THREE.Color(k1.ambientColor).lerp(new THREE.Color(k2.ambientColor), smoothT);
    const currentCloudColor = new THREE.Color(k1.cloudColor).lerp(new THREE.Color(k2.cloudColor), smoothT);

    // Interpolate scalars
    const currentFogDensity = THREE.MathUtils.lerp(k1.fogDensity, k2.fogDensity, smoothT);
    const currentDirIntensity = THREE.MathUtils.lerp(k1.dirLightIntensity, k2.dirLightIntensity, smoothT);
    const currentAmbientIntensity = THREE.MathUtils.lerp(k1.ambientIntensity, k2.ambientIntensity, smoothT);
    const currentStarsOpacity = THREE.MathUtils.lerp(k1.starsOpacity, k2.starsOpacity, smoothT);
    const currentSunElevation = THREE.MathUtils.lerp(k1.sunElevation, k2.sunElevation, smoothT);

    // Weather adjustments override or tint if user enabled rain or thick fog
    if (weather === 'rain') {
      currentSkyColor.lerp(new THREE.Color(0x334155), 0.7);
      currentFogColor.lerp(new THREE.Color(0x334155), 0.7);
      currentDirColor.lerp(new THREE.Color(0x94a3b8), 0.5);
    } else if (weather === 'fog') {
      currentSkyColor.lerp(new THREE.Color(0x94a3b8), 0.8);
      currentFogColor.lerp(new THREE.Color(0x94a3b8), 0.8);
    }

    // Apply to Three.js Scene & Lights
    this.scene.background = currentSkyColor;
    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(currentFogColor);
      this.scene.fog.density = weather === 'fog' ? 0.01 : weather === 'rain' ? 0.005 : currentFogDensity;
    }

    this.dirLight.color.copy(currentDirColor);
    this.dirLight.intensity = weather === 'rain' ? currentDirIntensity * 0.6 : currentDirIntensity;

    this.hemiLight.color.copy(currentHemiSky);
    this.hemiLight.groundColor.copy(currentHemiGround);

    this.ambientLight.color.copy(currentAmbientColor);
    this.ambientLight.intensity = currentAmbientIntensity;

    // Sun & Moon orbital trajectory (Sun orbits on an East-West tilted plane)
    // t = 0 (06:00 AM) => Sun rises at East (angle = 0)
    const sunAngle = t * Math.PI * 2;
    const orbitDistance = 550;

    const sunX = Math.cos(sunAngle + Math.PI) * orbitDistance;
    const sunY = Math.sin(sunAngle) * orbitDistance * 0.85;
    const sunZ = Math.sin(sunAngle * 0.5) * 140;

    this.sunMesh.position.set(sunX, sunY, sunZ);
    this.sunHalo.lookAt(playerPos.x, playerPos.y + 10, playerPos.z);

    // Moon is 180 degrees opposite sun
    const moonX = -sunX;
    const moonY = -sunY;
    const moonZ = -sunZ;

    this.moonMesh.position.set(moonX, moonY, moonZ);
    this.moonGlow.lookAt(playerPos.x, playerPos.y + 10, playerPos.z);

    // Direct light matches celestial body: Sun when elevated, Moon when sun is below horizon
    if (sunY > -20) {
      this.dirLight.position.set(playerPos.x + sunX * 0.35, Math.max(sunY * 0.4, 25), playerPos.z + sunZ * 0.35 + 40);
    } else {
      this.dirLight.position.set(playerPos.x + moonX * 0.35, Math.max(moonY * 0.4, 30), playerPos.z + moonZ * 0.35 + 40);
    }

    // Starfield Opacity & Twinkling
    const starMat = this.starPoints.material as THREE.PointsMaterial;
    starMat.opacity = currentStarsOpacity;

    // Cloud tint
    this.cloudMeshes.forEach((mesh) => {
      (mesh.material as THREE.MeshStandardMaterial).color.copy(currentCloudColor);
    });

    // Calculate virtual 24-hour clock (starts at 06:00 AM)
    const totalMinutes = Math.floor(((t * 24 + 6) % 24) * 60);
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    const formattedTime = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;

    const isNight = currentSunElevation < 0;

    return {
      hour,
      minute,
      formattedTime,
      phase: k1.phase,
      phaseGujarati: k1.phaseGujarati,
      phaseEnglish: k1.phaseEnglish,
      cycleProgress: t,
      totalDistanceMeters: totalDistanceDriven,
      sunElevation: currentSunElevation,
      isNight,
      sunAngle,
      isFrozen: this.manualMode,
      freezeMode: this.timeFreezeMode,
    };
  }

  /**
   * Set specific time mode (Dynamic 24h cycle, or Freeze Day / Sunrise / Sunset / Night)
   */
  public setFreezeMode(mode: TimeFreezeMode) {
    this.timeFreezeMode = mode;
    if (mode === 'dynamic') {
      this.manualMode = false;
      return;
    }

    this.manualMode = true;
    switch (mode) {
      case 'day':
        this.manualProgress = 0.27; // High Noon Sun
        break;
      case 'sunrise':
        this.manualProgress = 0.0;
        break;
      case 'sunset':
        this.manualProgress = 0.56;
        break;
      case 'night':
        this.manualProgress = 0.75;
        break;
    }
  }

  /**
   * Toggle between Dynamic 24h driving cycle and Frozen Day
   * Returns true if now frozen to Day, false if dynamic
   */
  public toggleDayFreeze(): boolean {
    if (this.manualMode && this.timeFreezeMode === 'day') {
      this.setFreezeMode('dynamic');
      return false;
    } else {
      this.setFreezeMode('day');
      return true;
    }
  }

  /**
   * Set manual time of day preset (e.g. from UI buttons) or restore auto
   */
  public setManualPhase(phase: 'auto' | 'sunrise' | 'day' | 'sunset' | 'night') {
    if (phase === 'auto') {
      this.setFreezeMode('dynamic');
      return;
    }
    this.setFreezeMode(phase);
  }

  public isAutoMode(): boolean {
    return !this.manualMode;
  }

  public getFreezeMode(): TimeFreezeMode {
    return this.timeFreezeMode;
  }
}
