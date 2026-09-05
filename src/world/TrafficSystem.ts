import * as THREE from 'three';
import { LocationData } from '../types';
import { getResolvedHighwaySegments, ResolvedHighwaySegment } from '../data/highwayNetwork';

export type TrafficVehicleType =
  | 'st_bus'
  | 'truck_cargo'
  | 'truck_tanker'
  | 'truck_dumper'
  | 'car_taxi'
  | 'car_suv'
  | 'car_hatchback'
  | 'motorbike_bullet'
  | 'motorbike_commuter'
  | 'motorbike_scooter'
  | 'auto_rickshaw'
  | 'tractor'
  | 'cow'
  | 'camel'
  | 'deer';

export interface TrafficEntity {
  id: string;
  type: TrafficVehicleType;
  group: THREE.Group;
  
  // Road Segment Navigation
  segment?: ResolvedHighwaySegment;
  progress: number; // in meters along segment
  direction: 1 | -1; // 1: start -> end (forward), -1: end -> start (reverse)
  laneOffset: number; // lateral distance from centerline in meters (left-hand drive)
  
  // Speed & Physics
  targetSpeed: number; // cruising speed in m/s (approx 8m/s to 20m/s)
  currentSpeed: number;
  length: number; // vehicle length for collision following distance
  
  // Animation Nodes
  wheels?: { mesh: THREE.Mesh; radius: number }[];
  animalLimbs?: THREE.Mesh[];
  headlights?: THREE.Mesh[];
  taillights?: THREE.Mesh[];
  
  // Roadside Animals (stationary or gentle grazing)
  isStationaryAnimal?: boolean;
  animalBasePos?: THREE.Vector3;
  animalAngle?: number;
  animalRadius?: number;
  
  // Behavioral flags
  shoulderYieldOffset?: number;
  reactUntil?: number; // performance.now() timestamp until which a player-yield (shoulder + slowdown) is held
}

export class TrafficSystem {
  public scene: THREE.Scene;
  public entities: TrafficEntity[] = [];
  private highwaySegments: ResolvedHighwaySegment[] = [];
  private junctionMap = new Map<string, ResolvedHighwaySegment[]>();

  // Shared reusable materials for high-performance rendering
  private mats: { [key: string]: THREE.Material } = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedMaterials();
  }

  private initSharedMaterials() {
    // GSRTC Bus Colors
    this.mats.gsrtcRed = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.35, metalness: 0.1 });
    this.mats.gsrtcCream = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });
    this.mats.gsrtcWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });

    // Truck Colors
    this.mats.truckBlue = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    this.mats.truckOrange = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.4 });
    this.mats.truckYellow = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 });
    this.mats.truckGreen = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
    this.mats.woodBrown = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    this.mats.stainlessSteel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.85 });

    // Car Colors
    this.mats.carWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.2 });
    this.mats.carSilver = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.7 });
    this.mats.carRed = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.3, metalness: 0.3 });
    this.mats.carDark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 });
    this.mats.taxiYellow = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3 });

    // Glass & Chrome & Tires
    this.mats.glass = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.85 });
    this.mats.tintedGlass = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.9 });
    this.mats.chrome = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.95, roughness: 0.1 });
    this.mats.tireRubber = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    this.mats.darkChassis = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });

    // Lights
    this.mats.headlightGlow = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.mats.taillightRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.mats.amberBlinker = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  }

  /**
   * Spawn authentic Gujarat road traffic flowing along real highway segments
   */
  public spawnTraffic(locations: LocationData[]) {
    this.highwaySegments = getResolvedHighwaySegments();

    // Index highway corridors by starting and ending location IDs for seamless junction routing
    this.junctionMap.clear();
    for (const seg of this.highwaySegments) {
      const fromId = seg.corridor.fromId;
      const toId = seg.corridor.toId;

      if (!this.junctionMap.has(fromId)) this.junctionMap.set(fromId, []);
      if (!this.junctionMap.has(toId)) this.junctionMap.set(toId, []);

      this.junctionMap.get(fromId)!.push(seg);
      this.junctionMap.get(toId)!.push(seg);
    }

    // 1. Populate each highway segment with authentic vehicle types
    this.highwaySegments.forEach((seg, index) => {
      const dist = seg.distance;
      const isExpressway = seg.corridor.type === 'expressway';

      // Standard lane offset for Indian Left-Hand Drive (approx 3.2m from centerline)
      const baseLane = isExpressway ? 4.6 : 3.4;
      const fastLane = isExpressway ? 2.2 : 3.0;

      // Spawn GSRTC ST Buses on major National & State Highways
      if (seg.corridor.type === 'national' || seg.corridor.type === 'expressway' || index % 2 === 0) {
        this.spawnGSRTCBus(
          `bus_${seg.corridor.id}_fwd`,
          seg,
          dist * (0.15 + (index % 3) * 0.25),
          1,
          baseLane,
          13.5 + Math.random() * 2.5
        );

        this.spawnGSRTCBus(
          `bus_${seg.corridor.id}_rev`,
          seg,
          dist * (0.75 - (index % 3) * 0.2),
          -1,
          baseLane,
          13.0 + Math.random() * 2.0
        );
      }

      // Spawn Heavy Goods Trucks & Amul Tankers
      if (index % 2 === 0 || isExpressway) {
        const truckType = index % 3 === 0 ? 'truck_tanker' : index % 3 === 1 ? 'truck_cargo' : 'truck_dumper';
        this.spawnHeavyTruck(
          `truck_${seg.corridor.id}_1`,
          seg,
          dist * (0.35 + (index % 4) * 0.15),
          1,
          baseLane,
          11.0 + Math.random() * 2.5,
          truckType
        );
      }

      // Spawn Passenger Cars (Tourist Taxi Swift Dzire, Bolero SUV, Hatchback)
      this.spawnCar(
        `car_taxi_${seg.corridor.id}`,
        seg,
        dist * (0.05 + (index % 5) * 0.18),
        1,
        fastLane,
        17.0 + Math.random() * 3.0,
        'car_taxi'
      );

      this.spawnCar(
        `car_suv_${seg.corridor.id}`,
        seg,
        dist * (0.85 - (index % 4) * 0.2),
        -1,
        fastLane,
        16.0 + Math.random() * 2.5,
        'car_suv'
      );

      if (isExpressway || index % 3 === 0) {
        this.spawnCar(
          `car_hatch_${seg.corridor.id}`,
          seg,
          dist * (0.5 + (index % 3) * 0.15),
          -1,
          fastLane,
          17.5 + Math.random() * 3.0,
          'car_hatchback'
        );
      }

      // Spawn Motorbikes (Royal Enfield Classic Bullet, Hero Splendor with Milk Cans, Scooters)
      this.spawnMotorbike(
        `bike_bullet_${seg.corridor.id}`,
        seg,
        dist * (0.2 + (index % 4) * 0.2),
        1,
        baseLane + 0.8,
        15.5 + Math.random() * 2.5,
        'motorbike_bullet'
      );

      this.spawnMotorbike(
        `bike_commuter_${seg.corridor.id}`,
        seg,
        dist * (0.65 - (index % 3) * 0.18),
        -1,
        baseLane + 0.8,
        14.0 + Math.random() * 2.0,
        'motorbike_commuter'
      );

      // Spawn Tractors & Auto-rickshaws on State & Regional Highways
      if (seg.corridor.type === 'state' || index % 2 === 1) {
        this.spawnTractor(
          `tractor_${seg.corridor.id}`,
          seg,
          dist * (0.4 + (index % 3) * 0.18),
          1,
          baseLane + 0.5,
          7.5 + Math.random() * 1.5,
          index % 3 === 0 ? 'sugarcane' : index % 3 === 1 ? 'cotton' : 'groundnut'
        );

        this.spawnAutoRickshaw(
          `auto_${seg.corridor.id}`,
          seg,
          dist * (0.8 - (index % 3) * 0.2),
          -1,
          baseLane + 0.4,
          9.5 + Math.random() * 2.0
        );
      }
    });

    // 2. Spawn Roadside Pastoral Animals (Cows on grass verges, Camels in Kutch, Deer in Gir)
    this.spawnRoadsideAnimals();
  }

  // ==========================================
  // 1. GSRTC GUJARAT ST BUS MODEL ("ગુજરાત એસ.ટી. - GSRTC")
  // ==========================================
  private spawnGSRTCBus(
    id: string,
    segment: ResolvedHighwaySegment,
    initialProgress: number,
    direction: 1 | -1,
    laneOffset: number,
    targetSpeed: number
  ) {
    const bus = new THREE.Group();

    // Bus Dimensions: Width: 2.5m, Height: 3.3m, Length: 9.8m
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 9.6), this.mats.gsrtcRed);
    lowerBody.position.set(0, 1.15, 0);
    lowerBody.castShadow = true;
    bus.add(lowerBody);

    // Cream / White Upper Cabin Roof
    const upperRoof = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.1, 9.6), this.mats.gsrtcCream);
    upperRoof.position.set(0, 2.4, 0);
    bus.add(upperRoof);

    // Front Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.95, 0.1), this.mats.glass);
    windshield.position.set(0, 2.35, -4.81);
    windshield.rotation.x = 0.08;
    bus.add(windshield);

    // Side Passenger Windows
    const sideGlassL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 7.8), this.mats.glass);
    sideGlassL.position.set(-1.26, 2.35, 0.3);
    const sideGlassR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 7.8), this.mats.glass);
    sideGlassR.position.set(1.26, 2.35, 0.3);
    bus.add(sideGlassL, sideGlassR);

    // Rear Windshield & Emergency Door
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 0.1), this.mats.glass);
    rearGlass.position.set(0, 2.35, 4.81);
    bus.add(rearGlass);

    // ----------------------------------------------------
    // A. REAR GSRTC BRANDING & NUMBER PLATE (Back of Bus)
    // ----------------------------------------------------
    const rearCanvas = document.createElement('canvas');
    rearCanvas.width = 512;
    rearCanvas.height = 256;
    const rctx = rearCanvas.getContext('2d')!;
    // Red base
    rctx.fillStyle = '#b91c1c';
    rctx.fillRect(0, 0, 512, 256);
    // Yellow hazard chevron accents at bottom
    rctx.fillStyle = '#facc15';
    rctx.fillRect(0, 210, 512, 46);
    rctx.fillStyle = '#1e293b';
    for (let i = 0; i < 512; i += 40) {
      rctx.beginPath();
      rctx.moveTo(i, 256);
      rctx.lineTo(i + 20, 210);
      rctx.lineTo(i + 32, 210);
      rctx.lineTo(i + 12, 256);
      rctx.fill();
    }
    // Top Gujarati Organization Header
    rctx.fillStyle = '#ffffff';
    rctx.font = 'bold 20px sans-serif';
    rctx.textAlign = 'center';
    rctx.fillText('ગુજરાત રાજ્ય માર્ગ વાહન વ્યવહાર નિગમ', 256, 32);
    // Giant Bold GSRTC Text
    rctx.fillStyle = '#fde047';
    rctx.font = '900 84px sans-serif';
    rctx.strokeStyle = '#ffffff';
    rctx.lineWidth = 4;
    rctx.strokeText('GSRTC', 256, 114);
    rctx.fillText('GSRTC', 256, 114);
    // Subtitle
    rctx.fillStyle = '#ffffff';
    rctx.font = 'bold 22px sans-serif';
    rctx.fillText('GURJARNAGARI · ગુર્જરનગરી', 256, 150);
    // Number Plate & Speed Tag
    rctx.fillStyle = '#facc15';
    rctx.fillRect(156, 168, 200, 36);
    rctx.strokeStyle = '#1e293b';
    rctx.lineWidth = 2;
    rctx.strokeRect(156, 168, 200, 36);
    rctx.fillStyle = '#0f172a';
    rctx.font = '900 22px monospace';
    rctx.fillText('GJ 18 Z 1960', 256, 194);
    // Speed sticker
    rctx.fillStyle = '#ffffff';
    rctx.font = 'bold 16px sans-serif';
    rctx.fillText('SPEED 65 KM/H', 80, 192);
    rctx.fillText('KEEP DISTANCE', 432, 192);

    const rearTex = new THREE.CanvasTexture(rearCanvas);
    const rearDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(2.36, 1.28),
      new THREE.MeshBasicMaterial({ map: rearTex })
    );
    rearDecal.position.set(0, 1.18, 4.82);
    bus.add(rearDecal);

    // ----------------------------------------------------
    // B. SIDE GSRTC LIVERY (Left and Right Body Panels)
    // ----------------------------------------------------
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = 1024;
    sideCanvas.height = 256;
    const sctx = sideCanvas.getContext('2d')!;
    // Red base
    sctx.fillStyle = '#b91c1c';
    sctx.fillRect(0, 0, 1024, 256);
    // Yellow & White Aerodynamic Speed Striping
    sctx.fillStyle = '#facc15';
    sctx.fillRect(0, 180, 1024, 24);
    sctx.fillStyle = '#ffffff';
    sctx.fillRect(0, 208, 1024, 12);
    // Diagonal speed stripes at front and back
    sctx.fillStyle = '#fef08a';
    for (let x = 60; x < 240; x += 36) {
      sctx.beginPath();
      sctx.moveTo(x, 180);
      sctx.lineTo(x + 24, 40);
      sctx.lineTo(x + 36, 40);
      sctx.lineTo(x + 12, 180);
      sctx.fill();
    }
    // Prominent Bold GSRTC Branding Center
    sctx.fillStyle = '#fde047';
    sctx.font = '900 88px sans-serif';
    sctx.strokeStyle = '#ffffff';
    sctx.lineWidth = 4;
    sctx.strokeText('GSRTC', 512, 105);
    sctx.fillText('GSRTC', 512, 105);
    // Gujarati ST header & Slogan
    sctx.fillStyle = '#ffffff';
    sctx.font = 'bold 28px sans-serif';
    sctx.fillText('ગુજરાત એસ.ટી. · GUJARAT ST', 512, 150);
    sctx.font = 'bold 20px sans-serif';
    sctx.fillText('« સલામત સવારી, એસ.ટી. અમારી »', 512, 240);

    const sideTex = new THREE.CanvasTexture(sideCanvas);
    const sideMat = new THREE.MeshBasicMaterial({ map: sideTex });

    // Left Side Panel
    const sideDecalL = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.2), sideMat);
    sideDecalL.rotation.y = -Math.PI / 2;
    sideDecalL.position.set(-1.26, 1.18, 0.2);
    bus.add(sideDecalL);

    // Right Side Panel
    const sideDecalR = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 1.2), sideMat);
    sideDecalR.rotation.y = Math.PI / 2;
    sideDecalR.position.set(1.26, 1.18, 0.2);
    bus.add(sideDecalR);

    // ----------------------------------------------------
    // C. FRONT GSRTC GRILL EMBLEM & SUN VISOR
    // ----------------------------------------------------
    const grillCanvas = document.createElement('canvas');
    grillCanvas.width = 512;
    grillCanvas.height = 128;
    const gctx = grillCanvas.getContext('2d')!;
    gctx.fillStyle = '#0f172a';
    gctx.fillRect(0, 0, 512, 128);
    // Gold chrome border
    gctx.strokeStyle = '#facc15';
    gctx.lineWidth = 6;
    gctx.strokeRect(6, 6, 500, 116);
    // GSRTC Emblem
    gctx.fillStyle = '#fde047';
    gctx.font = '900 68px sans-serif';
    gctx.textAlign = 'center';
    gctx.textBaseline = 'middle';
    gctx.fillText('GSRTC', 256, 64);
    const grillTex = new THREE.CanvasTexture(grillCanvas);

    const grillMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: grillTex })
    );
    grillMesh.rotation.y = Math.PI;
    grillMesh.position.set(0, 0.85, -4.82);
    bus.add(grillMesh);

    // Front Windshield Top Sun Visor Strip ("★ GSRTC EXPRESS ★")
    const visorCanvas = document.createElement('canvas');
    visorCanvas.width = 512;
    visorCanvas.height = 80;
    const vctx = visorCanvas.getContext('2d')!;
    vctx.fillStyle = '#991b1b';
    vctx.fillRect(0, 0, 512, 80);
    vctx.fillStyle = '#fef08a';
    vctx.font = 'bold 32px sans-serif';
    vctx.textAlign = 'center';
    vctx.textBaseline = 'middle';
    vctx.fillText('★ GSRTC EXPRESS · ગુર્જરનગરી ★', 256, 40);
    const visorTex = new THREE.CanvasTexture(visorCanvas);

    const visorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.35, 0.28),
      new THREE.MeshBasicMaterial({ map: visorTex })
    );
    visorMesh.rotation.y = Math.PI;
    visorMesh.position.set(0, 2.76, -4.82);
    bus.add(visorMesh);

    // Front Destination Board Canvas ("ગુજરાત રાજ્ય વાહન વ્યવહાર નિગમ")
    const destCanvas = document.createElement('canvas');
    destCanvas.width = 512;
    destCanvas.height = 128;
    const dctx = destCanvas.getContext('2d')!;
    dctx.fillStyle = '#0f172a';
    dctx.fillRect(0, 0, 512, 128);
    // Yellow LED Border
    dctx.strokeStyle = '#facc15';
    dctx.lineWidth = 4;
    dctx.strokeRect(4, 4, 504, 120);
    dctx.fillStyle = '#facc15';
    dctx.font = 'bold 36px sans-serif';
    dctx.textAlign = 'center';
    dctx.textBaseline = 'middle';
    const busDestText = direction > 0 ? `${segment.fromLoc.nameGujarati} ➔ ${segment.toLoc.nameGujarati}` : `${segment.toLoc.nameGujarati} ➔ ${segment.fromLoc.nameGujarati}`;
    dctx.fillText(busDestText, 256, 44);
    dctx.fillStyle = '#ffffff';
    dctx.font = '900 24px sans-serif';
    dctx.fillText('GSRTC EXPRESS · ગુર્જરનગરી', 256, 92);
    const destTex = new THREE.CanvasTexture(destCanvas);

    const destBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ map: destTex }));
    destBoard.rotation.y = Math.PI;
    destBoard.position.set(0, 3.1, -4.82);
    bus.add(destBoard);

    // Roof Luggage Rack with Tarpaulin Bundles
    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 5.0), this.mats.chrome);
    rack.position.set(0, 3.08, 0.5);
    bus.add(rack);

    const tarpBundle = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 3.8), this.mats.truckBlue);
    tarpBundle.position.set(0, 3.35, 0.5);
    bus.add(tarpBundle);

    // 6 Large Wheels (Dual rear axle)
    const wheels: { mesh: THREE.Mesh; radius: number }[] = [];
    const wGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.38, 16);
    const wheelPositions = [
      [-1.2, 0.52, -2.8],
      [1.2, 0.52, -2.8],
      [-1.2, 0.52, 2.5],
      [1.2, 0.52, 2.5],
      [-1.2, 0.52, 3.2],
      [1.2, 0.52, 3.2],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wGeo, this.mats.tireRubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      bus.add(wheel);
      wheels.push({ mesh: wheel, radius: 0.52 });
    });

    // Bright Headlights & Taillights
    const hlGeo = new THREE.BoxGeometry(0.35, 0.25, 0.1);
    const hlL = new THREE.Mesh(hlGeo, this.mats.headlightGlow);
    hlL.position.set(-0.85, 0.8, -4.82);
    const hlR = new THREE.Mesh(hlGeo, this.mats.headlightGlow);
    hlR.position.set(0.85, 0.8, -4.82);
    bus.add(hlL, hlR);

    const tlGeo = new THREE.BoxGeometry(0.25, 0.25, 0.1);
    const tlL = new THREE.Mesh(tlGeo, this.mats.taillightRed);
    tlL.position.set(-0.95, 0.8, 4.82);
    const tlR = new THREE.Mesh(tlGeo, this.mats.taillightRed);
    tlR.position.set(0.95, 0.8, 4.82);
    bus.add(tlL, tlR);

    this.scene.add(bus);
    this.entities.push({
      id,
      type: 'st_bus',
      group: bus,
      segment,
      progress: initialProgress,
      direction,
      laneOffset,
      targetSpeed,
      currentSpeed: targetSpeed,
      length: 10.5,
      wheels,
      headlights: [hlL, hlR],
      taillights: [tlL, tlR],
    });
  }

  // ==========================================
  // 2. HEAVY INDIAN HIGHWAY TRUCKS ("HORN OK PLEASE")
  // ==========================================
  private spawnHeavyTruck(
    id: string,
    segment: ResolvedHighwaySegment,
    initialProgress: number,
    direction: 1 | -1,
    laneOffset: number,
    targetSpeed: number,
    truckType: 'truck_cargo' | 'truck_tanker' | 'truck_dumper'
  ) {
    const truck = new THREE.Group();

    // Cabin (Tata / Ashok Leyland style with ornate wooden crown)
    const cabinColor = truckType === 'truck_tanker' ? this.mats.truckBlue : this.mats.truckOrange;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 2.6), cabinColor);
    cabin.position.set(0, 1.8, -2.8);
    cabin.castShadow = true;
    truck.add(cabin);

    // Decorated Top Crown / Carrier ("ॐ શ્રી ગણેશાય નમઃ")
    const crown = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.8), this.mats.truckYellow);
    crown.position.set(0, 2.9, -2.8);
    truck.add(crown);

    // Front Windshield
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.1), this.mats.glass);
    windshield.position.set(0, 2.0, -4.11);
    truck.add(windshield);

    // Heavy Steel Bullbar / Front Bumper with Hazard Stripes
    const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.4, 0.3), this.mats.truckYellow);
    bumper.position.set(0, 0.7, -4.2);
    truck.add(bumper);

    // Chassis Beam
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 8.2), this.mats.darkChassis);
    chassis.position.set(0, 0.8, 0.2);
    truck.add(chassis);

    // Tailgate Sign Canvas ("HORN OK PLEASE")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d')!;
    sctx.fillStyle = '#facc15';
    sctx.fillRect(0, 0, 512, 128);
    sctx.fillStyle = '#dc2626';
    sctx.font = 'bold 44px sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('HORN   OK   PLEASE', 256, 46);
    sctx.fillStyle = '#1e293b';
    sctx.font = 'bold 24px sans-serif';
    sctx.fillText('બુરી નજર વાલે તેરા મુહ કાલા · મા કૃપા', 256, 94);
    const signTex = new THREE.CanvasTexture(signCanvas);

    if (truckType === 'truck_tanker') {
      // Cylindrical Stainless Steel Amul Milk Tanker ("અમૂલ દૂધ ટેન્કર")
      const tankGeo = new THREE.CylinderGeometry(1.2, 1.2, 6.2, 24);
      const tanker = new THREE.Mesh(tankGeo, this.mats.stainlessSteel);
      tanker.rotation.x = Math.PI / 2;
      tanker.position.set(0, 2.1, 1.2);
      tanker.castShadow = true;
      truck.add(tanker);

      // Tanker Logo Canvas ("Amul - The Taste of India")
      const amulCanvas = document.createElement('canvas');
      amulCanvas.width = 512;
      amulCanvas.height = 256;
      const actx = amulCanvas.getContext('2d')!;
      actx.fillStyle = '#dc2626';
      actx.fillRect(0, 0, 512, 256);
      actx.fillStyle = '#ffffff';
      actx.font = 'bold 54px sans-serif';
      actx.textAlign = 'center';
      actx.fillText('Amul', 256, 90);
      actx.font = 'bold 30px sans-serif';
      actx.fillText('ધ ટેસ્ટ ઓફ ઇન્ડિયા · દૂધ ટેન્કર', 256, 170);
      const amulTex = new THREE.CanvasTexture(amulCanvas);

      const amulBadgeL = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: amulTex }));
      amulBadgeL.rotation.y = -Math.PI / 2;
      amulBadgeL.position.set(-1.22, 2.1, 1.2);
      const amulBadgeR = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: amulTex }));
      amulBadgeR.rotation.y = Math.PI / 2;
      amulBadgeR.position.set(1.22, 2.1, 1.2);
      truck.add(amulBadgeL, amulBadgeR);
    } else if (truckType === 'truck_dumper') {
      // Heavy Sand / Gravel Dumper Tipper
      const dumperBed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 5.8), this.mats.truckYellow);
      dumperBed.position.set(0, 2.0, 1.2);
      dumperBed.castShadow = true;
      truck.add(dumperBed);

      const gravelHeap = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 5.4), this.mats.darkChassis);
      gravelHeap.position.set(0, 2.7, 1.2);
      truck.add(gravelHeap);
    } else {
      // Wooden Slat Cargo Truck with Colorful Canopy
      const cargoBed = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.6, 6.0), this.mats.woodBrown);
      cargoBed.position.set(0, 2.1, 1.2);
      cargoBed.castShadow = true;
      truck.add(cargoBed);

      const tarpCanopy = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.0, 6.0), this.mats.truckGreen);
      tarpCanopy.position.set(0, 3.2, 1.2);
      truck.add(tarpCanopy);
    }

    // Rear "HORN OK PLEASE" Sign Board
    const tailBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.6), new THREE.MeshBasicMaterial({ map: signTex }));
    tailBoard.position.set(0, 1.4, 4.32);
    truck.add(tailBoard);

    // 6 Wheels (2 front steering wheels + 4 dual rear drive wheels)
    const wheels: { mesh: THREE.Mesh; radius: number }[] = [];
    const wGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.42, 16);
    const wheelPositions = [
      [-1.15, 0.55, -2.8],
      [1.15, 0.55, -2.8],
      [-1.15, 0.55, 1.8],
      [1.15, 0.55, 1.8],
      [-1.15, 0.55, 2.9],
      [1.15, 0.55, 2.9],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wGeo, this.mats.tireRubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      truck.add(wheel);
      wheels.push({ mesh: wheel, radius: 0.55 });
    });

    // Lights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.1), this.mats.headlightGlow);
    hlL.position.set(-0.85, 0.75, -4.26);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.1), this.mats.headlightGlow);
    hlR.position.set(0.85, 0.75, -4.26);
    truck.add(hlL, hlR);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.1), this.mats.taillightRed);
    tlL.position.set(-0.95, 0.8, 4.33);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.1), this.mats.taillightRed);
    tlR.position.set(0.95, 0.8, 4.33);
    truck.add(tlL, tlR);

    this.scene.add(truck);
    this.entities.push({
      id,
      type: truckType,
      group: truck,
      segment,
      progress: initialProgress,
      direction,
      laneOffset,
      targetSpeed,
      currentSpeed: targetSpeed,
      length: 9.5,
      wheels,
      headlights: [hlL, hlR],
      taillights: [tlL, tlR],
    });
  }

  // ==========================================
  // 3. PASSENGER CARS (SWIFT TAXI, BOLERO SUV, HATCHBACK)
  // ==========================================
  private spawnCar(
    id: string,
    segment: ResolvedHighwaySegment,
    initialProgress: number,
    direction: 1 | -1,
    laneOffset: number,
    targetSpeed: number,
    carType: 'car_taxi' | 'car_suv' | 'car_hatchback'
  ) {
    const car = new THREE.Group();

    if (carType === 'car_taxi') {
      // White Swift Dzire Gujarat Tourist Taxi with Yellow Number Plate & Roof Board
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.2), this.mats.carWhite);
      body.position.set(0, 0.55, 0);
      body.castShadow = true;
      car.add(body);

      // Cabin Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.2), this.mats.carWhite);
      cabin.position.set(0, 1.1, -0.1);
      car.add(cabin);

      // Windows
      const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.1), this.mats.glass);
      frontGlass.position.set(0, 1.05, -1.25);
      frontGlass.rotation.x = 0.35;
      const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.1), this.mats.glass);
      rearGlass.position.set(0, 1.05, 1.05);
      rearGlass.rotation.x = -0.35;
      car.add(frontGlass, rearGlass);

      // Roof TAXI Light Board
      const taxiSign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.3), this.mats.taxiYellow);
      taxiSign.position.set(0, 1.45, -0.1);
      car.add(taxiSign);

      // Yellow Commercial Number Plates ("GJ-03-BT-7788")
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.05), this.mats.taxiYellow);
      plate.position.set(0, 0.4, -2.12);
      car.add(plate);
    } else if (carType === 'car_suv') {
      // Mahindra Bolero / Scorpio Rural Safari SUV (Rugged Stance)
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 4.4), this.mats.carSilver);
      body.position.set(0, 0.75, 0);
      body.castShadow = true;
      car.add(body);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 2.8), this.mats.carSilver);
      cabin.position.set(0, 1.45, 0.2);
      car.add(cabin);

      // Heavy Front Bullbar / Nudge Bar
      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.2), this.mats.chrome);
      bullbar.position.set(0, 0.65, -2.25);
      car.add(bullbar);

      // Rooftop Luggage Carrier
      const roofCarrier = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 2.2), this.mats.darkChassis);
      roofCarrier.position.set(0, 1.9, 0.2);
      car.add(roofCarrier);

      // Rear Mounted Spare Tire
      const spareTire = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.22, 16), this.mats.tireRubber);
      spareTire.rotation.x = Math.PI / 2;
      spareTire.position.set(0, 0.9, 2.3);
      car.add(spareTire);
    } else {
      // Modern Metallic Red City Hatchback
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.65, 3.8), this.mats.carRed);
      body.position.set(0, 0.55, 0);
      body.castShadow = true;
      car.add(body);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.6, 2.1), this.mats.carRed);
      cabin.position.set(0, 1.15, 0.1);
      car.add(cabin);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.3), this.mats.darkChassis);
      spoiler.position.set(0, 1.48, 1.15);
      car.add(spoiler);
    }

    // 4 Wheels
    const wheels: { mesh: THREE.Mesh; radius: number }[] = [];
    const wGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.22, 14);
    const wheelPositions = [
      [-0.88, 0.34, -1.3],
      [0.88, 0.34, -1.3],
      [-0.88, 0.34, 1.3],
      [0.88, 0.34, 1.3],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const wheel = new THREE.Mesh(wGeo, this.mats.tireRubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      car.add(wheel);
      wheels.push({ mesh: wheel, radius: 0.34 });
    });

    // Headlights & Taillights
    const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.1), this.mats.headlightGlow);
    hlL.position.set(-0.65, 0.6, -2.11);
    const hlR = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.1), this.mats.headlightGlow);
    hlR.position.set(0.65, 0.6, -2.11);
    car.add(hlL, hlR);

    const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.1), this.mats.taillightRed);
    tlL.position.set(-0.65, 0.65, 2.11);
    const tlR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.1), this.mats.taillightRed);
    tlR.position.set(0.65, 0.65, 2.11);
    car.add(tlL, tlR);

    this.scene.add(car);
    this.entities.push({
      id,
      type: carType,
      group: car,
      segment,
      progress: initialProgress,
      direction,
      laneOffset,
      targetSpeed,
      currentSpeed: targetSpeed,
      length: 4.8,
      wheels,
      headlights: [hlL, hlR],
      taillights: [tlL, tlR],
    });
  }

  // ==========================================
  // 4. MOTORBIKES (ROYAL ENFIELD BULLET & HERO SPLENDOR WITH MILK CANS)
  // ==========================================
  private spawnMotorbike(
    id: string,
    segment: ResolvedHighwaySegment,
    initialProgress: number,
    direction: 1 | -1,
    laneOffset: number,
    targetSpeed: number,
    bikeType: 'motorbike_bullet' | 'motorbike_commuter'
  ) {
    const bike = new THREE.Group();

    // Chassis & Engine Block
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 1.6), this.mats.darkChassis);
    frame.position.set(0, 0.45, 0);
    bike.add(frame);

    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.4), this.mats.chrome);
    engine.position.set(0, 0.4, -0.1);
    bike.add(engine);

    // Fuel Tank
    const tankColor = bikeType === 'motorbike_bullet' ? this.mats.carDark : this.mats.truckOrange;
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.6), tankColor);
    tank.position.set(0, 0.72, -0.25);
    bike.add(tank);

    // Chrome Silencer / Exhaust Pipe
    const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), this.mats.chrome);
    silencer.rotation.x = Math.PI / 2;
    silencer.position.set(0.2, 0.25, 0.2);
    bike.add(silencer);

    // Handlebars
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.04), this.mats.chrome);
    handle.position.set(0, 0.95, -0.55);
    bike.add(handle);

    // Round Headlight
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 12), this.mats.headlightGlow);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(0, 0.85, -0.75);
    bike.add(hl);

    // Milk Cans on commuter motorcycle rear rack ("દૂધના કેન")
    if (bikeType === 'motorbike_commuter') {
      const milkCanGeo = new THREE.CylinderGeometry(0.15, 0.16, 0.5, 12);
      const canL = new THREE.Mesh(milkCanGeo, this.mats.stainlessSteel);
      canL.position.set(-0.35, 0.55, 0.5);
      const canR = new THREE.Mesh(milkCanGeo, this.mats.stainlessSteel);
      canR.position.set(0.35, 0.55, 0.5);
      bike.add(canL, canR);
    }

    // Gujarati Rider Figure
    const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.28), this.mats.truckYellow);
    riderTorso.position.set(0, 1.05, 0.05);
    bike.add(riderTorso);

    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), new THREE.MeshStandardMaterial({ color: 0xb87348 }));
    riderHead.position.set(0, 1.45, 0.05);
    bike.add(riderHead);

    // Turban / Paghdi on Bullet Rider
    const paghdi = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 8), this.mats.gsrtcRed);
    paghdi.position.set(0, 1.52, 0.05);
    bike.add(paghdi);

    // 2 Spoked Wheels
    const wheels: { mesh: THREE.Mesh; radius: number }[] = [];
    const wGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 14);
    [-0.75, 0.75].forEach((z) => {
      const w = new THREE.Mesh(wGeo, this.mats.tireRubber);
      w.rotation.z = Math.PI / 2;
      w.position.set(0, 0.32, z);
      w.castShadow = true;
      bike.add(w);
      wheels.push({ mesh: w, radius: 0.32 });
    });

    this.scene.add(bike);
    this.entities.push({
      id,
      type: bikeType,
      group: bike,
      segment,
      progress: initialProgress,
      direction,
      laneOffset,
      targetSpeed,
      currentSpeed: targetSpeed,
      length: 2.4,
      wheels,
      headlights: [hl],
    });
  }

  // ==========================================
  // 5. TRACTOR & AGRICULTURAL TROLLEY
  // ==========================================
  private spawnTractor(
    id: string,
    segment: ResolvedHighwaySegment,
    initialProgress: number,
    direction: 1 | -1,
    laneOffset: number,
    targetSpeed: number,
    cargoType: 'sugarcane' | 'cotton' | 'groundnut'
  ) {
    const tractor = new THREE.Group();

    // Swaraj / Mahindra Green Tractor Bonnet
    const bonnet = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 2.0), this.mats.truckGreen);
    bonnet.position.set(0, 1.05, -0.7);
    bonnet.castShadow = true;
    tractor.add(bonnet);

    // Tall Silencer Exhaust Pipe
    const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4), this.mats.darkChassis);
    silencer.position.set(0.5, 1.9, -1.3);
    tractor.add(silencer);

    // Driver Mudguards & Seat
    const mudguardL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 1.2), this.mats.truckGreen);
    mudguardL.position.set(-0.8, 1.2, 0.4);
    const mudguardR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 1.2), this.mats.truckGreen);
    mudguardR.position.set(0.8, 1.2, 0.4);
    tractor.add(mudguardL, mudguardR);

    // Trolley Trailer
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 3.4), this.mats.truckBlue);
    trolley.position.set(0, 1.0, 3.0);
    trolley.castShadow = true;
    tractor.add(trolley);

    // Agricultural Cargo Heap (Sugarcane / Cotton / Groundnut)
    const cargoColor = cargoType === 'cotton' ? 0xf8fafc : cargoType === 'sugarcane' ? 0x84cc16 : 0xd97706;
    const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.8, 3.2), new THREE.MeshStandardMaterial({ color: cargoColor, roughness: 0.8 }));
    cargo.position.set(0, 1.6, 3.0);
    tractor.add(cargo);

    // Wheels
    const wheels: { mesh: THREE.Mesh; radius: number }[] = [];
    // Small Front Steering Wheels
    const frontGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 14);
    [-0.68, 0.68].forEach((x) => {
      const fw = new THREE.Mesh(frontGeo, this.mats.tireRubber);
      fw.rotation.z = Math.PI / 2;
      fw.position.set(x, 0.38, -1.4);
      tractor.add(fw);
      wheels.push({ mesh: fw, radius: 0.38 });
    });

    // Large Rear Drive Wheels
    const rearGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.44, 16);
    [-0.85, 0.85].forEach((x) => {
      const rw = new THREE.Mesh(rearGeo, this.mats.tireRubber);
      rw.rotation.z = Math.PI / 2;
      rw.position.set(x, 0.8, 0.4);
      tractor.add(rw);
      wheels.push({ mesh: rw, radius: 0.8 });
    });

    // Trolley Wheels
    [-1.05, 1.05].forEach((x) => {
      const tw = new THREE.Mesh(frontGeo, this.mats.tireRubber);
      tw.rotation.z = Math.PI / 2;
      tw.position.set(x, 0.38, 3.6);
      tractor.add(tw);
      wheels.push({ mesh: tw, radius: 0.38 });
    });

    this.scene.add(tractor);
    this.entities.push({
      id,
      type: 'tractor',
      group: tractor,
      segment,
      progress: initialProgress,
      direction,
      laneOffset,
      targetSpeed,
      currentSpeed: targetSpeed,
      length: 6.8,
      wheels,
    });
  }

  // ==========================================
  // 6. AUTO-RICKSHAW (GREEN & YELLOW CNG)
  // ==========================================
  private spawnAutoRickshaw(
    id: string,
    segment: ResolvedHighwaySegment,
    initialProgress: number,
    direction: 1 | -1,
    laneOffset: number,
    targetSpeed: number
  ) {
    const auto = new THREE.Group();

    // Lower Green Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.65, 2.4), this.mats.truckGreen);
    lowerBody.position.set(0, 0.55, 0);
    auto.add(lowerBody);

    // Yellow Canopy & Roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.85, 1.9), this.mats.truckYellow);
    roof.position.set(0, 1.25, 0.2);
    auto.add(roof);

    // Windshield
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.08), this.mats.glass);
    glass.position.set(0, 1.2, -0.85);
    glass.rotation.x = 0.25;
    auto.add(glass);

    // 3 Wheels
    const wheels: { mesh: THREE.Mesh; radius: number }[] = [];
    const wGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.18, 12);
    const frontW = new THREE.Mesh(wGeo, this.mats.tireRubber);
    frontW.rotation.z = Math.PI / 2;
    frontW.position.set(0, 0.3, -1.0);
    auto.add(frontW);
    wheels.push({ mesh: frontW, radius: 0.3 });

    [-0.62, 0.62].forEach((x) => {
      const rw = new THREE.Mesh(wGeo, this.mats.tireRubber);
      rw.rotation.z = Math.PI / 2;
      rw.position.set(x, 0.3, 0.65);
      auto.add(rw);
      wheels.push({ mesh: rw, radius: 0.3 });
    });

    this.scene.add(auto);
    this.entities.push({
      id,
      type: 'auto_rickshaw',
      group: auto,
      segment,
      progress: initialProgress,
      direction,
      laneOffset,
      targetSpeed,
      currentSpeed: targetSpeed,
      length: 2.8,
      wheels,
    });
  }

  // ==========================================
  // 7. ROADSIDE ANIMALS (SAFE GRAZING ON VERGES)
  // ==========================================
  private spawnRoadsideAnimals() {
    // Holy Gir Cow (Gau Mata) grazing on roadside verges
    this.createCow('cow_rajkot_verge', new THREE.Vector3(65, 0, 45), 0.4);
    this.createCow('cow_somnath_verge', new THREE.Vector3(-170, 0, 720), -0.8);
    this.createCow('cow_ahmedabad_verge', new THREE.Vector3(340, 0, -30), 1.2);

    // Kutch Desert Camels in White Rann desert area
    this.createCamel('camel_kutch_1', new THREE.Vector3(-380, 0, -320), 0.6);
    this.createCamel('camel_kutch_2', new THREE.Vector3(-450, 0, -360), -0.5);

    // Gir Forest Wildlife Deer
    this.createDeer('deer_gir_1', new THREE.Vector3(120, 0, 520));
    this.createDeer('deer_gir_2', new THREE.Vector3(175, 0, 560));
  }

  private createCow(id: string, pos: THREE.Vector3, rot: number) {
    const cow = new THREE.Group();
    cow.position.copy(pos);
    cow.rotation.y = rot;

    const hideMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.8), hideMat);
    body.position.set(0, 0.95, 0);
    body.castShadow = true;
    cow.add(body);

    // Sacred Hump
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), hideMat);
    hump.position.set(0, 1.45, -0.4);
    cow.add(hump);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.6), hideMat);
    head.position.set(0, 1.25, -1.05);
    cow.add(head);

    [-0.2, 0.2].forEach((x) => {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.35, 6), hornMat);
      horn.position.set(x, 1.55, -0.95);
      horn.rotation.x = -0.3;
      cow.add(horn);
    });

    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1), bellMat);
    bell.position.set(0, 0.85, -0.9);
    cow.add(bell);

    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    const limbs: THREE.Mesh[] = [];
    [
      [-0.32, -0.5],
      [0.32, -0.5],
      [-0.32, 0.5],
      [0.32, 0.5],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, hideMat);
      leg.position.set(x, 0.4, z);
      cow.add(leg);
      limbs.push(leg);
    });

    this.scene.add(cow);
    this.entities.push({
      id,
      type: 'cow',
      group: cow,
      progress: 0,
      direction: 1,
      laneOffset: 0,
      targetSpeed: 0.4,
      currentSpeed: 0.4,
      length: 2.0,
      isStationaryAnimal: true,
      animalBasePos: pos.clone(),
      animalAngle: Math.random() * Math.PI * 2,
      animalRadius: 8.0,
      animalLimbs: limbs,
    });
  }

  private createCamel(id: string, pos: THREE.Vector3, rot: number) {
    const camel = new THREE.Group();
    camel.position.copy(pos);
    camel.rotation.y = rot;

    const camelMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const saddleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 2.2), camelMat);
    body.position.set(0, 1.6, 0);
    camel.add(body);

    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), camelMat);
    hump.position.set(0, 2.3, 0);
    camel.add(hump);

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.4, 1.4), saddleMat);
    saddle.position.set(0, 2.1, 0);
    camel.add(saddle);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.4), camelMat);
    neck.position.set(0, 2.4, -1.2);
    neck.rotation.x = 0.4;
    camel.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.6), camelMat);
    head.position.set(0, 2.9, -1.6);
    camel.add(head);

    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8);
    const limbs: THREE.Mesh[] = [];
    [
      [-0.4, -0.7],
      [0.4, -0.7],
      [-0.4, 0.7],
      [0.4, 0.7],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, camelMat);
      leg.position.set(x, 0.75, z);
      camel.add(leg);
      limbs.push(leg);
    });

    this.scene.add(camel);
    this.entities.push({
      id,
      type: 'camel',
      group: camel,
      progress: 0,
      direction: 1,
      laneOffset: 0,
      targetSpeed: 0.3,
      currentSpeed: 0.3,
      length: 2.5,
      isStationaryAnimal: true,
      animalBasePos: pos.clone(),
      animalAngle: Math.random() * Math.PI * 2,
      animalRadius: 10.0,
      animalLimbs: limbs,
    });
  }

  private createDeer(id: string, pos: THREE.Vector3) {
    const deer = new THREE.Group();
    deer.position.copy(pos);

    const deerMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.2), deerMat);
    body.position.set(0, 0.8, 0);
    deer.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.4), deerMat);
    head.position.set(0, 1.2, -0.6);
    deer.add(head);

    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.7, 6);
    const limbs: THREE.Mesh[] = [];
    [
      [-0.2, -0.4],
      [0.2, -0.4],
      [-0.2, 0.4],
      [0.2, 0.4],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, deerMat);
      leg.position.set(x, 0.35, z);
      deer.add(leg);
      limbs.push(leg);
    });

    this.scene.add(deer);
    this.entities.push({
      id,
      type: 'deer',
      group: deer,
      progress: 0,
      direction: 1,
      laneOffset: 0,
      targetSpeed: 0.5,
      currentSpeed: 0.5,
      length: 1.5,
      isStationaryAnimal: true,
      animalBasePos: pos.clone(),
      animalAngle: Math.random() * Math.PI * 2,
      animalRadius: 12.0,
      animalLimbs: limbs,
    });
  }

  // ==========================================
  // ROAD FOLLOWING PHYSICS & TRAFFIC UPDATE
  // ==========================================
  public update(delta: number, chhakaroPos: THREE.Vector3, isHornActive: boolean, playerHeading: number = 0) {
    const time = Date.now() * 0.001;
    const now = performance.now();

    for (let i = 0; i < this.entities.length; i++) {
      const entity = this.entities[i];

      if (entity.isStationaryAnimal) {
        // Gentle grazing & wandering near grass verges
        if (entity.animalBasePos && entity.animalAngle !== undefined && entity.animalRadius) {
          entity.animalAngle += entity.targetSpeed * 0.08 * delta;
          const ax = entity.animalBasePos.x + Math.cos(entity.animalAngle) * entity.animalRadius;
          const az = entity.animalBasePos.z + Math.sin(entity.animalAngle) * entity.animalRadius;
          entity.group.position.set(ax, 0, az);
          entity.group.rotation.y = -entity.animalAngle + Math.PI / 2;

          if (entity.animalLimbs) {
            const sway = Math.sin(time * 2.5 + i) * 0.2;
            entity.animalLimbs[0].rotation.x = sway;
            entity.animalLimbs[1].rotation.x = -sway;
            entity.animalLimbs[2].rotation.x = -sway;
            entity.animalLimbs[3].rotation.x = sway;
          }
        }
        continue;
      }

      if (!entity.segment) continue;

      const seg = entity.segment;
      const dx = seg.end.x - seg.start.x;
      const dz = seg.end.z - seg.start.z;
      const segLen = seg.distance;
      const dirX = dx / segLen;
      const dirZ = dz / segLen;

      // Normal vector pointing perpendicular to road
      const normX = -dirZ;
      const normZ = dirX;

      // Collision avoidance with other traffic ahead in same lane
      let targetSpeed = entity.targetSpeed;
      for (let j = 0; j < this.entities.length; j++) {
        if (i === j) continue;
        const other = this.entities[j];
        if (other.segment?.corridor.id === seg.corridor.id && other.direction === entity.direction) {
          const distAhead = (other.progress - entity.progress) * entity.direction;
          if (distAhead > 0 && distAhead < entity.length + 8.0) {
            targetSpeed = Math.min(targetSpeed, other.currentSpeed * 0.85);
          }
        }
      }

      // ── Heading-aware reactions to the player's Chhakaro ──
      const apx = chhakaroPos.x - entity.group.position.x;
      const apz = chhakaroPos.z - entity.group.position.z;
      const distToPlayer = Math.hypot(apx, apz);

      // Player forward unit vector (matches GameWorld.updatePhysics convention)
      const pfx = -Math.sin(playerHeading);
      const pfz = -Math.cos(playerHeading);

      // 1. Agent is AHEAD of the player and inside the player's path → the player is
      //    bearing down on it, so brake. dot(playerForward, player→agent) > 0 is
      //    equivalent to -(pfx*apx + pfz*apz) > 0 (agent→player points backwards).
      if (-(pfx * apx + pfz * apz) > 0 && distToPlayer < 22) {
        // perpendicular distance of the agent from the player's path line (unit-vec 2D cross)
        const pathPerp = Math.abs(apz * pfx - apx * pfz);
        if (pathPerp < 4.0) {
          targetSpeed = Math.min(targetSpeed, distToPlayer < 12 ? 0.5 : 4.0);
        }
      }

      // 2. Player is AHEAD of the agent and in the agent's lane → the player is
      //    overtaking, so the agent yields to the outer shoulder for ~1.5 s.
      const afx = -Math.sin(entity.group.rotation.y);
      const afz = -Math.cos(entity.group.rotation.y);
      if (afx * apx + afz * apz > 0 && distToPlayer < 20) {
        const lanePerp = Math.abs(apx * afz - apz * afx);
        if (lanePerp < 3.5) {
          entity.reactUntil = now + 1500;
        }
      }

      // 3. Resolve the shoulder-yield offset & pass-decay for this frame. Horn yield and
      //    the overtake yield coexist — take the larger offset. Offset is rebuilt from 0
      //    every frame so agents never stay crabbed onto the shoulder.
      let shoulderYield = 0;
      if (distToPlayer < 25 && isHornActive) {
        shoulderYield = 0.8;
      }
      if (entity.reactUntil !== undefined && now < entity.reactUntil) {
        shoulderYield = Math.max(shoulderYield, 1.2);
        targetSpeed *= 0.7; // ease back rather than snap to lane speed the instant the player clears
      } else if (entity.reactUntil !== undefined) {
        entity.reactUntil = undefined;
      }
      entity.shoulderYieldOffset = shoulderYield;

      // Smooth acceleration / braking
      entity.currentSpeed += (targetSpeed - entity.currentSpeed) * Math.min(1.0, delta * 3.5);

      // Advance progress along highway segment
      entity.progress += entity.currentSpeed * delta * entity.direction;

      // Seamless Junction Transition when reaching segment ends
      if (entity.progress >= segLen) {
        this.transitionToNextSegment(entity, seg.toLoc.id, 1);
      } else if (entity.progress <= 0) {
        this.transitionToNextSegment(entity, seg.fromLoc.id, -1);
      }

      // Compute exact 3D world position strictly on the correct driving lane
      const clampedProg = Math.max(0, Math.min(entity.segment.distance, entity.progress));
      const cx = entity.segment.start.x + (entity.segment.end.x - entity.segment.start.x) * (clampedProg / entity.segment.distance);
      const cz = entity.segment.start.z + (entity.segment.end.z - entity.segment.start.z) * (clampedProg / entity.segment.distance);

      const curDx = (entity.segment.end.x - entity.segment.start.x) / entity.segment.distance;
      const curDz = (entity.segment.end.z - entity.segment.start.z) / entity.segment.distance;
      const curNormX = -curDz;
      const curNormZ = curDx;

      const totalOffset = entity.laneOffset + (entity.shoulderYieldOffset || 0);

      if (entity.direction === 1) {
        // Traveling start -> end (Forward): Drive in Left Lane
        entity.group.position.x = cx - curNormX * totalOffset;
        entity.group.position.z = cz - curNormZ * totalOffset;
        entity.group.rotation.y = Math.atan2(-curDx, -curDz);
      } else {
        // Traveling end -> start (Reverse): Drive in its respective Left Lane
        entity.group.position.x = cx + curNormX * totalOffset;
        entity.group.position.z = cz + curNormZ * totalOffset;
        entity.group.rotation.y = Math.atan2(curDx, curDz);
      }

      // Dynamic wheel rotation corresponding to vehicle velocity
      if (entity.wheels) {
        entity.wheels.forEach((w) => {
          w.mesh.rotation.x += (entity.currentSpeed / w.radius) * delta * entity.direction;
        });
      }
    }
  }

  /**
   * Smoothly seamlessly routes vehicles across connecting Gujarat highway corridors
   */
  private transitionToNextSegment(entity: TrafficEntity, arrivingCityId: string, arrivalDirection: 1 | -1) {
    const connected = this.junctionMap.get(arrivingCityId) || [];
    // Filter out the exact same corridor in same direction to encourage exploring network
    const options = connected.filter((s) => s.corridor.id !== entity.segment?.corridor.id);

    if (options.length > 0) {
      // Pick next connecting highway corridor
      const nextSeg = options[Math.floor(Math.random() * options.length)];
      entity.segment = nextSeg;

      if (nextSeg.corridor.fromId === arrivingCityId) {
        // Originating from this city -> travel forward towards toLoc
        entity.direction = 1;
        entity.progress = 2.0;
      } else {
        // Terminating at this city -> travel in reverse towards fromLoc
        entity.direction = -1;
        entity.progress = nextSeg.distance - 2.0;
      }
    } else {
      // Turn around if end of coastal mainline
      entity.direction = (entity.direction * -1) as 1 | -1;
      entity.progress = entity.direction === 1 ? 2.0 : (entity.segment?.distance || 100) - 2.0;
    }
  }

  public destroy() {
    for (const e of this.entities) {
      this.scene.remove(e.group);
    }
    this.entities = [];
  }
}
