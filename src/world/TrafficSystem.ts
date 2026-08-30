import * as THREE from 'three';
import { LocationData } from '../types';

export interface TrafficEntity {
  id: string;
  type: 'st_bus' | 'tractor' | 'auto_rickshaw' | 'bike' | 'cow' | 'camel' | 'deer';
  group: THREE.Group;
  speed: number;
  currentAngle: number;
  radius: number;
  centerPos: THREE.Vector3;
  direction: number; // 1 or -1
  wheels?: THREE.Mesh[];
  animalLimbs?: THREE.Mesh[];
  hornReactionTimer?: number;
}

export class TrafficSystem {
  public scene: THREE.Scene;
  public entities: TrafficEntity[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnTraffic(locations: LocationData[]) {
    // 1. Spawn GSRTC Red ST Buses on main highway loops
    this.spawnSTBus('st_bus_1', new THREE.Vector3(200, 0, 100), 220, 0.45, 1);
    this.spawnSTBus('st_bus_2', new THREE.Vector3(-100, 0, -150), 280, 0.40, -1);
    this.spawnSTBus('st_bus_3', new THREE.Vector3(100, 0, 450), 200, 0.42, 1);

    // 2. Spawn Tractors with agricultural loads
    this.spawnTractor('tractor_1', new THREE.Vector3(0, 0, 0), 160, 0.25, 1, 'sugarcane');
    this.spawnTractor('tractor_2', new THREE.Vector3(250, 0, 300), 180, 0.22, -1, 'cotton');
    this.spawnTractor('tractor_3', new THREE.Vector3(-250, 0, -100), 190, 0.24, 1, 'groundnut');

    // 3. Spawn Auto-rickshaws
    this.spawnAutoRickshaw('auto_1', new THREE.Vector3(50, 0, 50), 130, 0.38, 1);
    this.spawnAutoRickshaw('auto_2', new THREE.Vector3(-300, 0, 400), 170, 0.35, -1);

    // 4. Spawn Motorbikes
    this.spawnMotorbike('bike_1', new THREE.Vector3(300, 0, -50), 150, 0.50, 1);
    this.spawnMotorbike('bike_2', new THREE.Vector3(-150, 0, 250), 210, 0.48, -1);

    // 5. Spawn Cattle & Wildlife (Cows, Camels, Deer)
    this.spawnCow('cow_1', new THREE.Vector3(120, 0, -80), 0);
    this.spawnCow('cow_2', new THREE.Vector3(280, 0, 180), Math.PI / 3);
    this.spawnCow('cow_3', new THREE.Vector3(-80, 0, 120), Math.PI / 1.5);
    this.spawnCamel('camel_1', new THREE.Vector3(-420, 0, -320), Math.PI / 4);
    this.spawnCamel('camel_2', new THREE.Vector3(-480, 0, -380), -Math.PI / 2);
    this.spawnDeer('deer_1', new THREE.Vector3(130, 0, 520));
    this.spawnDeer('deer_2', new THREE.Vector3(170, 0, 560));
  }

  private spawnSTBus(id: string, center: THREE.Vector3, radius: number, speed: number, direction: number) {
    const busGroup = new THREE.Group();

    // Red body material for Gujarat ST Bus ("ગુજરાત એસ.ટી.")
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xc92a2a, roughness: 0.4 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.8 });

    // Main Bus Body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 7.5), bodyMat);
    lowerBody.position.set(0, 1.1, 0);
    lowerBody.castShadow = true;
    busGroup.add(lowerBody);

    const upperWhiteRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 7.5), whiteMat);
    upperWhiteRoof.position.set(0, 2.25, 0);
    busGroup.add(upperWhiteRoof);

    // Front & Side Windows
    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 0.1), glassMat);
    frontGlass.position.set(0, 2.2, -3.76);
    busGroup.add(frontGlass);

    const sideGlassLeft = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 5.8), glassMat);
    sideGlassLeft.position.set(-1.21, 2.2, 0.2);
    const sideGlassRight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 5.8), glassMat);
    sideGlassRight.position.set(1.21, 2.2, 0.2);
    busGroup.add(sideGlassLeft, sideGlassRight);

    // Destination Sign Board ("ગુજરાત રાજ્ય વાહન વ્યવહાર નિગમ")
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d')!;
    sctx.fillStyle = '#0f172a';
    sctx.fillRect(0, 0, 512, 128);
    sctx.fillStyle = '#facc15';
    sctx.font = 'bold 38px sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText('ગુજરાત એસ.ટી. એક્સપ્રેસ', 256, 64);
    const signTex = new THREE.CanvasTexture(signCanvas);

    const signBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: signTex }));
    signBoard.position.set(0, 2.9, -3.77);
    busGroup.add(signBoard);

    // Wheels
    const wheels: THREE.Mesh[] = [];
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 16);
    const wheelPositions = [
      [-1.15, 0.5, -2.2],
      [1.15, 0.5, -2.2],
      [-1.15, 0.5, 2.0],
      [1.15, 0.5, 2.0],
      [-1.15, 0.5, 2.45],
      [1.15, 0.5, 2.45],
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      busGroup.add(wheel);
      wheels.push(wheel);
    });

    // Headlights
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.1), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    h1.position.set(-0.8, 0.8, -3.76);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.1), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
    h2.position.set(0.8, 0.8, -3.76);
    busGroup.add(h1, h2);

    this.scene.add(busGroup);
    this.entities.push({
      id,
      type: 'st_bus',
      group: busGroup,
      speed,
      currentAngle: Math.random() * Math.PI * 2,
      radius,
      centerPos: center,
      direction,
      wheels,
    });
  }

  private spawnTractor(
    id: string,
    center: THREE.Vector3,
    radius: number,
    speed: number,
    direction: number,
    cargoType: 'sugarcane' | 'cotton' | 'groundnut'
  ) {
    const tractorGroup = new THREE.Group();

    // Gujarati Tractor (Traditional Green/Blue Swaraj / Mahindra style)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const cargoMat = new THREE.MeshStandardMaterial({
      color: cargoType === 'cotton' ? 0xf8fafc : cargoType === 'sugarcane' ? 0x84cc16 : 0xd97706,
      roughness: 0.8,
    });

    // Engine Bonnet & Cabin
    const bonnet = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 2.0), bodyMat);
    bonnet.position.set(0, 1.0, -0.6);
    bonnet.castShadow = true;
    tractorGroup.add(bonnet);

    // Silencer Exhaust pipe
    const silencer = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2), metalMat);
    silencer.position.set(0.5, 1.8, -1.2);
    tractorGroup.add(silencer);

    // Mudguards & Driver Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.5), metalMat);
    seat.position.set(0, 1.2, 0.5);
    tractorGroup.add(seat);

    // Small Front Wheels
    const frontWheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.25, 14);
    const wheels: THREE.Mesh[] = [];
    [-0.65, 0.65].forEach((x) => {
      const fw = new THREE.Mesh(frontWheelGeo, wheelMat);
      fw.rotation.z = Math.PI / 2;
      fw.position.set(x, 0.35, -1.3);
      tractorGroup.add(fw);
      wheels.push(fw);
    });

    // Large Rear Deep-Tread Wheels
    const rearWheelGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.4, 16);
    [-0.8, 0.8].forEach((x) => {
      const rw = new THREE.Mesh(rearWheelGeo, wheelMat);
      rw.rotation.z = Math.PI / 2;
      rw.position.set(x, 0.75, 0.4);
      tractorGroup.add(rw);
      wheels.push(rw);
    });

    // Trolley Trailer behind tractor
    const trolleyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 });
    const trolley = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 3.0), trolleyMat);
    trolley.position.set(0, 0.9, 2.8);
    trolley.castShadow = true;
    tractorGroup.add(trolley);

    // Trolley Cargo heap
    const cargoMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 2.8), cargoMat);
    cargoMesh.position.set(0, 1.4, 2.8);
    tractorGroup.add(cargoMesh);

    // Trolley Wheels
    [-0.95, 0.95].forEach((x) => {
      const tw = new THREE.Mesh(frontWheelGeo, wheelMat);
      tw.rotation.z = Math.PI / 2;
      tw.position.set(x, 0.35, 3.4);
      tractorGroup.add(tw);
      wheels.push(tw);
    });

    this.scene.add(tractorGroup);
    this.entities.push({
      id,
      type: 'tractor',
      group: tractorGroup,
      speed,
      currentAngle: Math.random() * Math.PI * 2,
      radius,
      centerPos: center,
      direction,
      wheels,
    });
  }

  private spawnAutoRickshaw(id: string, center: THREE.Vector3, radius: number, speed: number, direction: number) {
    const autoGroup = new THREE.Group();

    // Gujarati Yellow/Green Auto-rickshaw
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });

    // Lower green body
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.6, 2.2), greenMat);
    lowerBody.position.set(0, 0.5, 0);
    autoGroup.add(lowerBody);

    // Yellow cabin & roof
    const yellowRoof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 1.8), yellowMat);
    yellowRoof.position.set(0, 1.2, 0.2);
    autoGroup.add(yellowRoof);

    // 3 Wheels
    const wheels: THREE.Mesh[] = [];
    const wGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12);

    const frontW = new THREE.Mesh(wGeo, wheelMat);
    frontW.rotation.z = Math.PI / 2;
    frontW.position.set(0, 0.28, -0.9);
    autoGroup.add(frontW);
    wheels.push(frontW);

    [-0.6, 0.6].forEach((x) => {
      const rw = new THREE.Mesh(wGeo, wheelMat);
      rw.rotation.z = Math.PI / 2;
      rw.position.set(x, 0.28, 0.6);
      autoGroup.add(rw);
      wheels.push(rw);
    });

    this.scene.add(autoGroup);
    this.entities.push({
      id,
      type: 'auto_rickshaw',
      group: autoGroup,
      speed,
      currentAngle: Math.random() * Math.PI * 2,
      radius,
      centerPos: center,
      direction,
      wheels,
    });
  }

  private spawnMotorbike(id: string, center: THREE.Vector3, radius: number, speed: number, direction: number) {
    const bikeGroup = new THREE.Group();
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });

    // Chassis & Tank
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 1.4), blackMat);
    frame.position.set(0, 0.5, 0);
    bikeGroup.add(frame);

    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 0.5), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    tank.position.set(0, 0.75, -0.2);
    bikeGroup.add(tank);

    // Rider (Gujarati youth in kurta)
    const riderMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
    const riderTorso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.3), riderMat);
    riderTorso.position.set(0, 1.0, 0.05);
    bikeGroup.add(riderTorso);

    const riderHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshStandardMaterial({ color: 0xb45309 }));
    riderHead.position.set(0, 1.4, 0.05);
    bikeGroup.add(riderHead);

    // Wheels
    const wheels: THREE.Mesh[] = [];
    const wGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12);
    [0.7, -0.7].forEach((z) => {
      const bw = new THREE.Mesh(wGeo, wheelMat);
      bw.rotation.z = Math.PI / 2;
      bw.position.set(0, 0.3, z);
      bikeGroup.add(bw);
      wheels.push(bw);
    });

    this.scene.add(bikeGroup);
    this.entities.push({
      id,
      type: 'bike',
      group: bikeGroup,
      speed,
      currentAngle: Math.random() * Math.PI * 2,
      radius,
      centerPos: center,
      direction,
      wheels,
    });
  }

  private spawnCow(id: string, pos: THREE.Vector3, initialRotation: number) {
    const cowGroup = new THREE.Group();
    cowGroup.position.copy(pos);
    cowGroup.rotation.y = initialRotation;

    // Sacred Indian Cow (Gau Mata)
    const whiteHideMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 });
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 1.8), whiteHideMat);
    body.position.set(0, 0.95, 0);
    body.castShadow = true;
    cowGroup.add(body);

    // Indian Cow Hump (ખૂંધ)
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), whiteHideMat);
    hump.position.set(0, 1.45, -0.4);
    cowGroup.add(hump);

    // Neck & Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.6), whiteHideMat);
    head.position.set(0, 1.3, -1.05);
    cowGroup.add(head);

    // Horns
    [-0.2, 0.2].forEach((x) => {
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.35, 6), hornMat);
      horn.position.set(x, 1.6, -0.95);
      horn.rotation.x = -0.3;
      cowGroup.add(horn);
    });

    // Neck Bell (ઘંટડી)
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1), bellMat);
    bell.position.set(0, 0.9, -0.9);
    cowGroup.add(bell);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    const limbs: THREE.Mesh[] = [];
    [
      [-0.32, -0.5],
      [0.32, -0.5],
      [-0.32, 0.5],
      [0.32, 0.5],
    ].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, whiteHideMat);
      leg.position.set(x, 0.4, z);
      cowGroup.add(leg);
      limbs.push(leg);
    });

    this.scene.add(cowGroup);
    this.entities.push({
      id,
      type: 'cow',
      group: cowGroup,
      speed: 0.05,
      currentAngle: Math.random() * Math.PI * 2,
      radius: 12,
      centerPos: pos,
      direction: 1,
      animalLimbs: limbs,
    });
  }

  private spawnCamel(id: string, pos: THREE.Vector3, initialRotation: number) {
    const camelGroup = new THREE.Group();
    camelGroup.position.copy(pos);
    camelGroup.rotation.y = initialRotation;

    const camelMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.2, 2.2), camelMat);
    body.position.set(0, 1.6, 0);
    camelGroup.add(body);

    // Hump
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), camelMat);
    hump.position.set(0, 2.3, 0);
    camelGroup.add(hump);

    // Kutchi Mirror-work cloth saddle
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.4, 1.4), clothMat);
    saddle.position.set(0, 2.1, 0);
    camelGroup.add(saddle);

    // Long Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.4), camelMat);
    neck.position.set(0, 2.4, -1.2);
    neck.rotation.x = 0.4;
    camelGroup.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.6), camelMat);
    head.position.set(0, 2.9, -1.6);
    camelGroup.add(head);

    // Tall Legs
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
      camelGroup.add(leg);
      limbs.push(leg);
    });

    this.scene.add(camelGroup);
    this.entities.push({
      id,
      type: 'camel',
      group: camelGroup,
      speed: 0.08,
      currentAngle: Math.random() * Math.PI * 2,
      radius: 18,
      centerPos: pos,
      direction: 1,
      animalLimbs: limbs,
    });
  }

  private spawnDeer(id: string, pos: THREE.Vector3) {
    const deerGroup = new THREE.Group();
    deerGroup.position.copy(pos);

    const deerMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x334155 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 1.2), deerMat);
    body.position.set(0, 0.8, 0);
    deerGroup.add(body);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.4), deerMat);
    head.position.set(0, 1.2, -0.6);
    deerGroup.add(head);

    // Antlers
    [-0.1, 0.1].forEach((x) => {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.4), hornMat);
      antler.position.set(x, 1.5, -0.55);
      antler.rotation.x = -0.2;
      deerGroup.add(antler);
    });

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
      deerGroup.add(leg);
      limbs.push(leg);
    });

    this.scene.add(deerGroup);
    this.entities.push({
      id,
      type: 'deer',
      group: deerGroup,
      speed: 0.12,
      currentAngle: Math.random() * Math.PI * 2,
      radius: 15,
      centerPos: pos,
      direction: 1,
      animalLimbs: limbs,
    });
  }

  public update(delta: number, chhakaroPos: THREE.Vector3, isHornActive: boolean) {
    const time = Date.now() * 0.001;

    for (const entity of this.entities) {
      if (entity.type === 'cow' || entity.type === 'camel' || entity.type === 'deer') {
        // Animal gentle wander
        entity.currentAngle += (entity.speed / entity.radius) * delta * entity.direction;
        const x = entity.centerPos.x + Math.cos(entity.currentAngle) * entity.radius;
        const z = entity.centerPos.z + Math.sin(entity.currentAngle) * entity.radius;
        entity.group.position.x = x;
        entity.group.position.z = z;
        entity.group.rotation.y = -entity.currentAngle + (entity.direction > 0 ? Math.PI / 2 : -Math.PI / 2);

        // Animate legs
        if (entity.animalLimbs) {
          const legSway = Math.sin(time * 3 + entity.currentAngle * 2) * 0.25;
          entity.animalLimbs[0].rotation.x = legSway;
          entity.animalLimbs[1].rotation.x = -legSway;
          entity.animalLimbs[2].rotation.x = -legSway;
          entity.animalLimbs[3].rotation.x = legSway;
        }
      } else {
        // Vehicle navigation along circular loops
        entity.currentAngle += (entity.speed * 18 * delta * entity.direction) / entity.radius;
        const x = entity.centerPos.x + Math.cos(entity.currentAngle) * entity.radius;
        const z = entity.centerPos.z + Math.sin(entity.currentAngle) * entity.radius;
        entity.group.position.x = x;
        entity.group.position.z = z;
        entity.group.rotation.y = -entity.currentAngle + (entity.direction > 0 ? Math.PI / 2 : -Math.PI / 2);

        // Spin wheels
        if (entity.wheels) {
          entity.wheels.forEach((w) => {
            w.rotation.x += entity.speed * 40 * delta;
          });
        }
      }

      // Reactive avoidance/honk: If Chhakaro is close and honks, animals turn/step back
      const dist = entity.group.position.distanceTo(chhakaroPos);
      if (dist < 15 && isHornActive) {
        entity.group.position.y = 0.2 + Math.sin(time * 15) * 0.1; // startled hop
      } else {
        entity.group.position.y = 0;
      }
    }
  }

  public destroy() {
    for (const e of this.entities) {
      this.scene.remove(e.group);
    }
    this.entities = [];
  }
}
