import * as THREE from 'three';
import { LocationData } from '../types';
import { RoadSignBuilder } from './RoadSignBuilder';

export class EnvironmentBuilder {
  private scene: THREE.Scene;
  private roadSignBuilder: RoadSignBuilder;

  // Reusable materials
  private roadMat: THREE.MeshStandardMaterial;
  private roadMarkingMat: THREE.MeshBasicMaterial;
  private sandMat: THREE.MeshStandardMaterial;
  private saltMat: THREE.MeshStandardMaterial;
  private grassMat: THREE.MeshStandardMaterial;
  private redSoilMat: THREE.MeshStandardMaterial;
  private stoneMat: THREE.MeshStandardMaterial;
  private sandstoneMat: THREE.MeshStandardMaterial;
  private goldMat: THREE.MeshStandardMaterial;
  private waterMat: THREE.MeshStandardMaterial;
  private woodMat: THREE.MeshStandardMaterial;
  private thatchMat: THREE.MeshStandardMaterial;
  private leafMat: THREE.MeshStandardMaterial;
  private trunkMat: THREE.MeshStandardMaterial;
  private marbleMat: THREE.MeshStandardMaterial;
  private bronzeMat: THREE.MeshStandardMaterial;
  private terracottaMat: THREE.MeshStandardMaterial;
  private royalPalaceMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.roadSignBuilder = new RoadSignBuilder(scene);

    this.roadMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 });
    this.roadMarkingMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.sandMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
    this.saltMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4, metalness: 0.1 });
    this.grassMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 });
    this.redSoilMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.9 });
    this.stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
    this.sandstoneMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 });
    this.goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    this.waterMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.85 });
    this.woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    this.thatchMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.9 });
    this.leafMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.7 });
    this.trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    this.marbleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25, metalness: 0.1 });
    this.bronzeMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.7, roughness: 0.35 });
    this.terracottaMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.85 });
    this.royalPalaceMat = new THREE.MeshStandardMaterial({ color: 0xdf9d5f, roughness: 0.65 });
  }

  /**
   * Build complete Gujarat map environment connecting all locations
   */
  public buildFullWorld(locations: LocationData[]) {
    // 1. Base Terrain Ground Plane
    const groundGeo = new THREE.PlaneGeometry(2400, 2400, 48, 48);
    const ground = new THREE.Mesh(groundGeo, this.grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // 2. Build interconnected highways and roads
    this.buildRoadNetwork(locations);

    // 3. Build realistic Gujarati road signs and distance milestones
    this.roadSignBuilder.buildAllRoadSigns(locations, this.scene);

    // 4. Build each unique landmark zone
    locations.forEach((loc) => {
      this.buildZoneLandmark(loc);
    });

    // 5. Populate roadside scenery: trees, milestone signboards, dhabas, streetlights
    this.buildRoadsideScenery(locations);
  }

  /**
   * Create realistic asphalt roads with dashed lane markings connecting destinations
   */
  private buildRoadNetwork(locations: LocationData[]) {
    const roadGroup = new THREE.Group();

    // Main ring highway connecting locations in tour order
    for (let i = 0; i < locations.length; i++) {
      const current = locations[i].worldPosition;
      const next = locations[(i + 1) % locations.length].worldPosition;

      const dx = next.x - current.x;
      const dz = next.z - current.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      // Road segment
      const segmentGeo = new THREE.PlaneGeometry(9.0, distance);
      const segment = new THREE.Mesh(segmentGeo, this.roadMat);
      segment.rotation.x = -Math.PI / 2;
      segment.rotation.z = -angle;
      segment.position.set((current.x + next.x) / 2, 0.01, (current.z + next.z) / 2);
      segment.receiveShadow = true;
      roadGroup.add(segment);

      // Road edge shoulders (dirt/gravel strips)
      const shoulderGeo = new THREE.PlaneGeometry(1.5, distance);
      const shoulderLeft = new THREE.Mesh(shoulderGeo, this.sandMat);
      shoulderLeft.rotation.x = -Math.PI / 2;
      shoulderLeft.rotation.z = -angle;
      const perpX = Math.cos(angle) * 5.2;
      const perpZ = -Math.sin(angle) * 5.2;
      shoulderLeft.position.set((current.x + next.x) / 2 + perpX, 0.005, (current.z + next.z) / 2 + perpZ);
      roadGroup.add(shoulderLeft);

      const shoulderRight = new THREE.Mesh(shoulderGeo, this.sandMat);
      shoulderRight.rotation.x = -Math.PI / 2;
      shoulderRight.rotation.z = -angle;
      shoulderRight.position.set((current.x + next.x) / 2 - perpX, 0.005, (current.z + next.z) / 2 - perpZ);
      roadGroup.add(shoulderRight);

      // Center dashed yellow lane markings
      const dashCount = Math.floor(distance / 8);
      for (let d = 0; d < dashCount; d++) {
        const t = (d + 0.5) / dashCount;
        const markGeo = new THREE.PlaneGeometry(0.3, 3.5);
        const mark = new THREE.Mesh(markGeo, this.roadMarkingMat);
        mark.rotation.x = -Math.PI / 2;
        mark.rotation.z = -angle;
        mark.position.set(current.x + dx * t, 0.02, current.z + dz * t);
        roadGroup.add(mark);
      }
    }

    this.scene.add(roadGroup);
  }

  /**
   * Build iconic 3D monument/feature for each specific Gujarat zone
   */
  private buildZoneLandmark(loc: LocationData) {
    const { x, z } = loc.worldPosition;
    const landmarkGroup = new THREE.Group();
    landmarkGroup.position.set(x, 0, z);

    switch (loc.id) {
      case 'dwarka':
        this.buildDwarkadhishTemple(landmarkGroup);
        break;
      case 'somnath':
        this.buildSomnathTemple(landmarkGroup);
        break;
      case 'gir':
        this.buildGirForestZone(landmarkGroup);
        break;
      case 'junagadh':
        this.buildGirnarMountain(landmarkGroup);
        break;
      case 'kutch':
        this.buildWhiteRann(landmarkGroup);
        break;
      case 'statue_of_unity':
        this.buildStatueOfUnity(landmarkGroup);
        break;
      case 'saputara':
        this.buildSaputaraGhats(landmarkGroup);
        break;
      case 'ahmedabad':
        this.buildAhmedabadHeritage(landmarkGroup);
        break;
      case 'surat':
        this.buildSuratTapiBridge(landmarkGroup);
        break;
      case 'patan_modhera':
        this.buildPatanModheraLandmark(landmarkGroup);
        break;
      case 'pavagadh':
        this.buildPavagadhChampaner(landmarkGroup);
        break;
      case 'dholavira':
        this.buildDholaviraRoadToHeaven(landmarkGroup);
        break;
      case 'palitana':
        this.buildPalitanaShatrunjaya(landmarkGroup);
        break;
      case 'vadodara':
        this.buildVadodaraLaxmiVilas(landmarkGroup);
        break;
      case 'dandi':
        this.buildDandiSaltMemorial(landmarkGroup);
        break;
      case 'rajkot':
      default:
        this.buildRajkotVillage(landmarkGroup);
        break;
    }

    // Large Gujarati destination entry signboard at the landmark entrance
    this.createSignboard(landmarkGroup, loc.signboardText, 0, 0, -22);

    this.scene.add(landmarkGroup);
  }

  /**
   * Zone: Rajkot Kathiyawadi Village & Dhaba
   */
  private buildRajkotVillage(group: THREE.Group) {
    // Village Gateway Arch ("આપનું સ્વાગત છે!")
    const archGroup = new THREE.Group();
    archGroup.position.set(0, 0, -18);

    const pillarL = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), this.sandstoneMat);
    pillarL.position.set(-7, 3, 0);
    const pillarR = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 6, 8), this.sandstoneMat);
    pillarR.position.set(7, 3, 0);

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 1.0), this.sandstoneMat);
    archBeam.position.set(0, 6, 0);

    // Decorative Kalash on top
    const kalash = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), this.goldMat);
    kalash.position.set(0, 7.2, 0);

    archGroup.add(pillarL, pillarR, archBeam, kalash);
    group.add(archGroup);

    // Kathiyawadi Dhaba restaurant building with outdoor Charpai cots
    const dhaba = new THREE.Mesh(new THREE.BoxGeometry(18, 5, 12), this.sandstoneMat);
    dhaba.position.set(22, 2.5, -5);
    dhaba.castShadow = true;

    const dhabaRoof = new THREE.Mesh(new THREE.ConeGeometry(14, 3, 4), this.thatchMat);
    dhabaRoof.position.set(22, 6.5, -5);
    dhabaRoof.rotation.y = Math.PI / 4;

    group.add(dhaba, dhabaRoof);

    // Dhaba Board ("કાઠિયાવાડી ધાબો - ગરમાગરમ ગાંઠિયા & ચા")
    this.createBoard(group, 'કાઠિયાવાડી ધાબો — ગરમ ગાંઠિયા & મસાલા ચા', 22, 5.5, 1.5, 9, 1.5);

    // Chhakaro Workshop Shed
    const shedRoof = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 10), this.woodMat);
    shedRoof.position.set(-22, 4.5, -5);
    shedRoof.rotation.z = -0.15;
    group.add(shedRoof);
    this.createBoard(group, 'છકડો સર્વિસ વર્કશોપ', -22, 4.8, 0.5, 6, 1.2);

    // Peanut & Cotton crop fields
    this.createCropField(group, 35, 15, 30, 25, 0xca8a04);
    this.createCropField(group, -35, 15, 30, 25, 0x15803d);
  }

  /**
   * Zone: Dwarkadhish Temple & Coastal Shivrajpur Beach
   */
  private buildDwarkadhishTemple(group: THREE.Group) {
    const templeGroup = new THREE.Group();
    templeGroup.position.set(0, 0, -35);

    // Multi-tiered Sandstone Shikhar (Tower)
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 8, 22), this.sandstoneMat);
    base.position.y = 4;
    base.castShadow = true;

    const tier1 = new THREE.Mesh(new THREE.BoxGeometry(16, 7, 16), this.sandstoneMat);
    tier1.position.y = 11.5;

    const tier2 = new THREE.Mesh(new THREE.BoxGeometry(11, 7, 11), this.sandstoneMat);
    tier2.position.y = 18.5;

    const shikharTop = new THREE.Mesh(new THREE.ConeGeometry(6, 14, 4), this.sandstoneMat);
    shikharTop.position.y = 29;
    shikharTop.rotation.y = Math.PI / 4;

    // Golden Kalash & 52-Gaj Dhwaja (flag)
    const kalash = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), this.goldMat);
    kalash.position.y = 36.5;

    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6), this.goldMat);
    flagPole.position.y = 40;

    const dhwaja = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 2.5), new THREE.MeshStandardMaterial({ color: 0xf97316, side: THREE.DoubleSide }));
    dhwaja.position.set(2.4, 41, 0);

    templeGroup.add(base, tier1, tier2, shikharTop, kalash, flagPole, dhwaja);

    // Temple Pillars Entrance
    for (let p = -8; p <= 8; p += 4) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6), this.sandstoneMat);
      col.position.set(p, 3, 13);
      templeGroup.add(col);
    }

    group.add(templeGroup);

    // Coastal Arabian Sea shoreline
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(350, 120), this.waterMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.1, -120);
    group.add(sea);

    // Shivrajpur Lighthouse
    const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(2, 3, 22, 12), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
    lhBase.position.set(45, 11, -70);
    const lhTop = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 3, 12), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    lhTop.position.set(45, 23.5, -70);
    const lhLight = new THREE.PointLight(0xfef08a, 4, 90);
    lhLight.position.set(45, 25, -70);
    group.add(lhBase, lhTop, lhLight);

    // Gomti Ghat Steps
    const steps = new THREE.Mesh(new THREE.BoxGeometry(60, 1.5, 15), this.sandstoneMat);
    steps.position.set(0, 0.7, -65);
    group.add(steps);
  }

  /**
   * Zone: Somnath Jyotirlinga Temple & Seashore
   */
  private buildSomnathTemple(group: THREE.Group) {
    const templeGroup = new THREE.Group();
    templeGroup.position.set(0, 0, -40);

    // Grand Somnath Sabha Mandap & Shikhar
    const mainHall = new THREE.Mesh(new THREE.BoxGeometry(26, 9, 28), this.sandstoneMat);
    mainHall.position.y = 4.5;
    mainHall.castShadow = true;

    const shikhar = new THREE.Mesh(new THREE.ConeGeometry(10, 28, 8), this.sandstoneMat);
    shikhar.position.set(0, 23, -6);

    const goldDome = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 16), this.goldMat);
    goldDome.position.set(0, 37.5, -6);

    // Trishul & Om Flag
    const trishul = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 5), this.goldMat);
    trishul.position.set(0, 41, -6);
    templeGroup.add(mainHall, shikhar, goldDome, trishul);

    // Baan-Stambh (Arrow Pillar) pointing South Pole
    const baanStambh = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 14, 12), this.sandstoneMat);
    baanStambh.position.set(24, 7, 10);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8), this.goldMat);
    arrow.position.set(24, 15, 10);
    arrow.rotation.z = Math.PI;
    templeGroup.add(baanStambh, arrow);

    group.add(templeGroup);

    // Rocky ocean coastline with waves
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(350, 140), this.waterMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.1, -120);
    group.add(sea);
  }

  /**
   * Zone: Sasan Gir Forest & Wildlife
   */
  private buildGirForestZone(group: THREE.Group) {
    // Teak & Banyan Dense Forest trees
    for (let i = 0; i < 48; i++) {
      const angle = (i / 48) * Math.PI * 2;
      const radius = 25 + Math.random() * 65;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius - 15;
      this.createTree(group, tx, tz, 2.5 + Math.random() * 2.0);
    }

    // Wooden Safari Watchtower
    const towerGroup = new THREE.Group();
    towerGroup.position.set(28, 0, -25);
    const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 12), this.woodMat);
    leg1.position.set(-2, 6, -2);
    const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 12), this.woodMat);
    leg2.position.set(2, 6, -2);
    const leg3 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 12), this.woodMat);
    leg3.position.set(-2, 6, 2);
    const leg4 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 12), this.woodMat);
    leg4.position.set(2, 6, 2);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.5, 5.5), this.woodMat);
    cabin.position.set(0, 13, 0);
    towerGroup.add(leg1, leg2, leg3, leg4, cabin);
    group.add(towerGroup);

    // 3D Asiatic Lions (King of Gir) resting on rock
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(3.5), this.stoneMat);
    rock.position.set(-18, 2, -22);
    group.add(rock);

    // Asiatic Lion model (Procedural golden body, majestic mane, tail)
    const lionGroup = new THREE.Group();
    lionGroup.position.set(-18, 4.2, -22);
    const lionMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });

    const lionBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.8, 2.2, 8, 8), lionMat);
    lionBody.rotation.z = Math.PI / 2;
    const lionMane = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 10), maneMat);
    lionMane.position.set(-1.2, 0.6, 0);
    const lionHead = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), lionMat);
    lionHead.position.set(-1.5, 0.6, 0);
    lionGroup.add(lionBody, lionMane, lionHead);
    group.add(lionGroup);

    // Dancing Peacock (Mor)
    const peacockGroup = new THREE.Group();
    peacockGroup.position.set(12, 1, -12);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const pBody = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 8), pMat);
    pBody.rotation.x = Math.PI / 3;
    const pFeathers = new THREE.Mesh(new THREE.CircleGeometry(1.4, 12), new THREE.MeshStandardMaterial({ color: 0x15803d, side: THREE.DoubleSide }));
    pFeathers.position.set(0, 0.8, 0.6);
    pFeathers.rotation.x = 0.3;
    peacockGroup.add(pBody, pFeathers);
    group.add(peacockGroup);
  }

  /**
   * Zone: Junagadh & Girnar Mountain
   */
  private buildGirnarMountain(group: THREE.Group) {
    // Gigantic Mountain Backdrop (Girnar peaks rising 150m into sky)
    const mountainGeo = new THREE.ConeGeometry(95, 140, 16);
    const mountain = new THREE.Mesh(mountainGeo, this.stoneMat);
    mountain.position.set(0, 70, -110);
    group.add(mountain);

    const mountainPeak2 = new THREE.Mesh(new THREE.ConeGeometry(65, 110, 12), this.stoneMat);
    mountainPeak2.position.set(-75, 55, -95);
    group.add(mountainPeak2);

    const mountainPeak3 = new THREE.Mesh(new THREE.ConeGeometry(70, 120, 12), this.stoneMat);
    mountainPeak3.position.set(80, 60, -100);
    group.add(mountainPeak3);

    // Uparkot Fort Historic Stone Gate
    const fortGate = new THREE.Mesh(new THREE.BoxGeometry(24, 12, 6), this.sandstoneMat);
    fortGate.position.set(0, 6, -30);

    const gateArchHole = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 7, 16), this.sandstoneMat);
    gateArchHole.rotation.x = Math.PI / 2;
    gateArchHole.position.set(0, 4.5, -30);

    group.add(fortGate);

    // Winding 9999 Steps path on mountain
    const pathGroup = new THREE.Group();
    for (let s = 0; s < 30; s++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 2), this.stoneMat);
      step.position.set(Math.sin(s * 0.4) * 12, s * 2.2 + 2, -35 - s * 2.2);
      pathGroup.add(step);
    }
    group.add(pathGroup);
  }

  /**
   * Zone: Great Rann of Kutch (White Salt Desert & Bhungas)
   */
  private buildWhiteRann(group: THREE.Group) {
    // Salt flat ground overlay (Sparkling White Rann)
    const saltGround = new THREE.Mesh(new THREE.PlaneGeometry(450, 450), this.saltMat);
    saltGround.rotation.x = -Math.PI / 2;
    saltGround.position.set(0, 0.05, -30);
    group.add(saltGround);

    // Traditional Kutchi Bhungas (Round mud huts with conical thatch roof & mirror Lippan art)
    for (let b = 0; b < 6; b++) {
      const bx = -35 + (b % 3) * 35;
      const bz = -35 - Math.floor(b / 3) * 30;

      const bhungaGroup = new THREE.Group();
      bhungaGroup.position.set(bx, 0, bz);

      const hutWall = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 4.5, 18), this.sandstoneMat);
      hutWall.position.y = 2.25;

      const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(5.8, 4.2, 18), this.thatchMat);
      hutRoof.position.y = 6.4;

      // Lippan art mirror accent ring
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.55, 0.1, 8, 24), this.goldMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.5;

      bhungaGroup.add(hutWall, hutRoof, ring);
      group.add(bhungaGroup);
    }

    // Colorful Rann Utsav Handloom Tents
    for (let t = -30; t <= 30; t += 20) {
      const tentGeo = new THREE.ConeGeometry(4, 5, 4);
      const tentMat = new THREE.MeshStandardMaterial({
        color: t === 0 ? 0xdc2626 : t < 0 ? 0x2563eb : 0xf59e0b,
      });
      const tent = new THREE.Mesh(tentGeo, tentMat);
      tent.position.set(t, 2.5, 15);
      tent.rotation.y = Math.PI / 4;
      group.add(tent);
    }

    // Camel Cart
    const camel = this.createCamel();
    camel.position.set(18, 0, -12);
    group.add(camel);
  }

  /**
   * Zone: Statue of Unity (182m Sardar Patel Statue & Sardar Sarovar Dam)
   */
  private buildStatueOfUnity(group: THREE.Group) {
    const souGroup = new THREE.Group();
    souGroup.position.set(0, 0, -55);

    // Bronze alloy material for Sardar Patel
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x92400e, // Rich bronze patina
      metalness: 0.7,
      roughness: 0.35,
    });

    // Star-shaped base podium
    const basePodium = new THREE.Mesh(new THREE.CylinderGeometry(14, 18, 12, 6), this.sandstoneMat);
    basePodium.position.y = 6;
    souGroup.add(basePodium);

    // Sardar Patel 3D Colossus Figure
    // Legs
    const legL = new THREE.Mesh(new THREE.BoxGeometry(4.0, 18, 4.5), bronzeMat);
    legL.position.set(-3.2, 21, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(4.0, 18, 4.5), bronzeMat);
    legR.position.set(3.2, 21, 0);

    // Traditional Kurta / Dhoti Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(11, 22, 7.5), bronzeMat);
    torso.position.set(0, 41, 0);

    // Shawl draped over shoulder
    const shawl = new THREE.Mesh(new THREE.BoxGeometry(12.5, 14, 8.2), bronzeMat);
    shawl.position.set(0, 44, 0);

    // Head and Face of Sardar Patel
    const head = new THREE.Mesh(new THREE.SphereGeometry(3.6, 16, 16), bronzeMat);
    head.position.set(0, 55, 0);

    souGroup.add(legL, legR, torso, shawl, head);
    group.add(souGroup);

    // Narmada River
    const narmada = new THREE.Mesh(new THREE.PlaneGeometry(350, 60), this.waterMat);
    narmada.rotation.x = -Math.PI / 2;
    narmada.position.set(0, 0.1, -15);
    group.add(narmada);

    // Bridge over Narmada
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(80, 2, 8), this.stoneMat);
    bridge.position.set(0, 1.5, -15);
    group.add(bridge);

    // Valley of Flowers colorful garden stripes
    const colors = [0xec4899, 0xfacc15, 0xa855f7, 0xef4444, 0x3b82f6];
    colors.forEach((c, idx) => {
      const flowerBed = new THREE.Mesh(new THREE.PlaneGeometry(28, 4), new THREE.MeshStandardMaterial({ color: c }));
      flowerBed.rotation.x = -Math.PI / 2;
      flowerBed.position.set(-25 + idx * 12, 0.08, 12);
      group.add(flowerBed);
    });
  }

  /**
   * Zone: Saputara Hill Station & Monsoon Ghats
   */
  private buildSaputaraGhats(group: THREE.Group) {
    // Sahyadri Mountain Hills
    const hill1 = new THREE.Mesh(new THREE.ConeGeometry(55, 45, 16), this.grassMat);
    hill1.position.set(-45, 22.5, -50);
    const hill2 = new THREE.Mesh(new THREE.ConeGeometry(65, 55, 16), this.grassMat);
    hill2.position.set(45, 27.5, -60);
    group.add(hill1, hill2);

    // Saputara Lake
    const lake = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 0.5, 24), this.waterMat);
    lake.position.set(0, 0.2, -25);
    group.add(lake);

    // Gira Waterfall stream
    const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(8, 35), this.waterMat);
    waterfall.position.set(-35, 18, -35);
    waterfall.rotation.y = 0.4;
    group.add(waterfall);

    // Mountain Ghat Barriers (Yellow & Black striped safety rails)
    for (let r = -40; r <= 40; r += 8) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 1.2),
        new THREE.MeshStandardMaterial({ color: r % 16 === 0 ? 0x000000 : 0xfacc15 })
      );
      post.position.set(r, 0.6, -6);
      group.add(post);
    }
  }

  /**
   * Zone: Ahmedabad Sabarmati & Atal Bridge
   */
  private buildAhmedabadHeritage(group: THREE.Group) {
    // Sabarmati River
    const river = new THREE.Mesh(new THREE.PlaneGeometry(350, 70), this.waterMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.1, -40);
    group.add(river);

    // Atal Bridge (Iconic white pedestrian arch bridge over Sabarmati)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 4, -40);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(70, 0.8, 6), this.stoneMat);
    const arch1 = new THREE.Mesh(new THREE.TorusGeometry(32, 0.6, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    arch1.position.set(0, -6, 3.2);
    const arch2 = new THREE.Mesh(new THREE.TorusGeometry(32, 0.6, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    arch2.position.set(0, -6, -3.2);
    bridgeGroup.add(deck, arch1, arch2);
    group.add(bridgeGroup);

    // Sidi Saiyyed Stone Carved Arch monument
    const sidiJali = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 1.2), this.sandstoneMat);
    sidiJali.position.set(-28, 4, -10);
    group.add(sidiJali);

    // Flying Kites (પતંગોત્સવ) in the sky
    const kiteColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899];
    kiteColors.forEach((kc, i) => {
      const kite = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 2.5), new THREE.MeshStandardMaterial({ color: kc, side: THREE.DoubleSide }));
      kite.rotation.z = Math.PI / 4;
      kite.position.set(-30 + i * 15, 22 + (i % 3) * 6, -30 + i * 5);
      group.add(kite);
    });
  }

  /**
   * Zone: Surat Tapi Cable Bridge & Textile Hub
   */
  private buildSuratTapiBridge(group: THREE.Group) {
    // Tapi River
    const tapi = new THREE.Mesh(new THREE.PlaneGeometry(350, 80), this.waterMat);
    tapi.rotation.x = -Math.PI / 2;
    tapi.position.set(0, 0.1, -45);
    group.add(tapi);

    // Surat Cable-Stayed Suspension Bridge
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 0, -45);
    const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.5, 34), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    pylon.position.set(0, 17, 0);
    bridgeGroup.add(pylon);

    // Cable stays
    for (let c = 1; c <= 5; c++) {
      const cableL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 25), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
      cableL.position.set(-c * 5, 12, 0);
      cableL.rotation.z = 0.45;
      const cableR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 25), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
      cableR.position.set(c * 5, 12, 0);
      cableR.rotation.z = -0.45;
      bridgeGroup.add(cableL, cableR);
    }
    group.add(bridgeGroup);

    // Textile Market Billboard
    this.createBoard(group, 'સુરત ટેક્સટાઇલ & ડાયમંડ સિટી — સુરતી લોચો સ્પેશિયલ', 0, 8, -12, 14, 2.0);
  }


  private createTree(parent: THREE.Group, x: number, z: number, scale: number = 1.0) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);

    const trunkGeo = new THREE.CylinderGeometry(0.35 * scale, 0.5 * scale, 3.5 * scale, 8);
    const trunk = new THREE.Mesh(trunkGeo, this.trunkMat);
    trunk.position.y = (3.5 * scale) / 2;
    trunk.castShadow = true;

    const foliageGeo = new THREE.DodecahedronGeometry(2.5 * scale);
    const foliage = new THREE.Mesh(foliageGeo, this.leafMat);
    foliage.position.y = 4.2 * scale;
    foliage.castShadow = true;

    tree.add(trunk, foliage);
    parent.add(tree);
  }

  private createCamel(): THREE.Group {
    const camel = new THREE.Group();
    const camelMat = new THREE.MeshStandardMaterial({ color: 0xc27803, roughness: 0.9 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 2.8), camelMat);
    body.position.y = 2.4;

    const hump = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 8), camelMat);
    hump.position.set(0, 3.6, 0);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.0), camelMat);
    neck.position.set(0, 3.6, 1.4);
    neck.rotation.x = 0.4;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 1.0), camelMat);
    head.position.set(0, 4.4, 2.0);

    camel.add(body, hump, neck, head);
    return camel;
  }

  private createCropField(parent: THREE.Group, x: number, z: number, w: number, d: number, colorHex: number) {
    const fieldMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.9 });
    const field = new THREE.Mesh(new THREE.PlaneGeometry(w, d), fieldMat);
    field.rotation.x = -Math.PI / 2;
    field.position.set(x, 0.02, z);
    parent.add(field);
  }

  private createSignboard(parent: THREE.Group, text: string, x: number, y: number, z: number) {
    this.createBoard(parent, text, x, y + 4.5, z, 12, 2.0);
    // Support posts
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5), this.stoneMat);
    p1.position.set(x - 5.5, y + 2.5, z);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 5), this.stoneMat);
    p2.position.set(x + 5.5, y + 2.5, z);
    parent.add(p1, p2);
  }

  private createBoard(parent: THREE.Group, text: string, x: number, y: number, z: number, width: number, height: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Green highway signboard styling
    ctx.fillStyle = '#15803d';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 12;
    ctx.strokeRect(12, 12, 1000, 232);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 512, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const boardMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const board = new THREE.Mesh(new THREE.PlaneGeometry(width, height), boardMat);
    board.position.set(x, y, z);
    parent.add(board);
  }

  /**
   * Zone: Patan (Rani Ki Vav UNESCO Stepwell) & Modhera Sun Temple
   */
  private buildPatanModheraLandmark(group: THREE.Group) {
    const complex = new THREE.Group();
    complex.position.set(0, 0, -25);

    // 1. Rani Ki Vav - 5 Stepped Multi-Tiered Subterranean Structure
    const vavGroup = new THREE.Group();
    vavGroup.position.set(-20, 0, 0);

    // Terraced stepwell levels
    const levels = 5;
    for (let i = 0; i < levels; i++) {
      const w = 28 - i * 4;
      const d = 36 - i * 5;
      const y = -i * 2.2;

      const terrace = new THREE.Mesh(new THREE.BoxGeometry(w, 2.2, d), this.sandstoneMat);
      terrace.position.set(0, y - 1.1, i * 3);
      vavGroup.add(terrace);

      // Colonnaded carved pillars on each terrace
      const pillarCount = 6 - i;
      for (let p = 0; p < pillarCount; p++) {
        const px = -w / 2 + 2 + p * (w / (pillarCount || 1));
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.5, 8), this.sandstoneMat);
        pillar.position.set(px, y + 1.75, i * 3);
        vavGroup.add(pillar);
      }
    }

    // Sacred water pool at lowest level
    const pool = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 12), this.waterMat);
    pool.position.set(0, -levels * 2.2 + 0.5, (levels - 1) * 3);
    vavGroup.add(pool);

    // Solanki carved entrance Torana Arch
    const torana = new THREE.Group();
    torana.position.set(0, 0, -16);
    const tL = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 8, 8), this.sandstoneMat);
    tL.position.set(-6, 4, 0);
    const tR = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 8, 8), this.sandstoneMat);
    tR.position.set(6, 4, 0);
    const tBeam = new THREE.Mesh(new THREE.BoxGeometry(15, 1.2, 1.2), this.sandstoneMat);
    tBeam.position.set(0, 7.5, 0);
    const kalash = new THREE.Mesh(new THREE.ConeGeometry(1.0, 2.0, 8), this.goldMat);
    kalash.position.set(0, 9.0, 0);
    torana.add(tL, tR, tBeam, kalash);
    vavGroup.add(torana);

    // 2. Modhera Sun Temple (Sabha Mandap & Surya Kund)
    const modheraGroup = new THREE.Group();
    modheraGroup.position.set(22, 0, 0);

    // Sabha Mandap Stepped Pyramid Hall
    const mandapBase = new THREE.Mesh(new THREE.BoxGeometry(18, 2, 18), this.sandstoneMat);
    mandapBase.position.set(0, 1, 0);
    modheraGroup.add(mandapBase);

    // 52 Carved Columns around the Sabha Mandap
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const r = 7.0;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 6, 8), this.sandstoneMat);
      col.position.set(Math.cos(angle) * r, 5, Math.sin(angle) * r);
      modheraGroup.add(col);
    }

    // Pyramidical stepped roof
    const roof = new THREE.Mesh(new THREE.ConeGeometry(9, 7, 4), this.sandstoneMat);
    roof.position.set(0, 11, 0);
    roof.rotation.y = Math.PI / 4;
    modheraGroup.add(roof);

    // Golden Surya Dev Sun Crest on roof
    const sunCrest = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16), this.goldMat);
    sunCrest.position.set(0, 14.8, 0);
    sunCrest.rotation.x = Math.PI / 2;
    modheraGroup.add(sunCrest);

    // Stepped Surya Kund (Water Reservoir in front)
    const kund = new THREE.Mesh(new THREE.BoxGeometry(22, 1.5, 16), this.stoneMat);
    kund.position.set(0, 0.5, 18);
    const kundWater = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), this.waterMat);
    kundWater.rotation.x = -Math.PI / 2;
    kundWater.position.set(0, 1.2, 18);
    modheraGroup.add(kund, kundWater);

    // Miniature step niches around Surya Kund
    for (let k = -2; k <= 2; k++) {
      const niche = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.8, 4), this.sandstoneMat);
      niche.position.set(k * 4.5, 2.0, 10);
      modheraGroup.add(niche);
    }

    // 3. Patan Patola Loom Workshop Pavilion
    const patolaPavilion = new THREE.Group();
    patolaPavilion.position.set(0, 0, 20);
    const loomBase = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 8), this.woodMat);
    loomBase.position.set(0, 0.25, 0);
    const patolaRoof = new THREE.Mesh(new THREE.ConeGeometry(6, 3, 4), this.terracottaMat);
    patolaRoof.position.set(0, 4.5, 0);
    patolaRoof.rotation.y = Math.PI / 4;

    // Colorful Patola silk banner
    const silkBannerMat = new THREE.MeshStandardMaterial({ color: 0xd946ef, roughness: 0.5 });
    const silkBanner = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 0.2), silkBannerMat);
    silkBanner.position.set(0, 2.5, 0);

    patolaPavilion.add(loomBase, patolaRoof, silkBanner);

    complex.add(vavGroup, modheraGroup, patolaPavilion);
    group.add(complex);
  }

  /**
   * Zone: Pavagadh Shaktipeeth Mountain & UNESCO Champaner Fort
   */
  private buildPavagadhChampaner(group: THREE.Group) {
    const complex = new THREE.Group();
    complex.position.set(0, 0, -30);

    // 1. Pavagadh Mountain Massif
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(55, 65, 8), this.redSoilMat);
    mountain.position.set(0, 32, -15);
    complex.add(mountain);

    // 2. Mahakali Temple on the Summit
    const templeBase = new THREE.Mesh(new THREE.BoxGeometry(14, 5, 14), this.stoneMat);
    templeBase.position.set(0, 66, -15);
    const templeShikhar = new THREE.Mesh(new THREE.ConeGeometry(4.5, 10, 8), this.goldMat);
    templeShikhar.position.set(0, 73.5, -15);

    // Flying Mahakali Red Flag (Dhwaja)
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 8), this.goldMat);
    flagPole.position.set(0, 80, -15);
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xdc2626, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), flagMat);
    flag.position.set(2, 81.5, -15);
    complex.add(templeBase, templeShikhar, flagPole, flag);

    // 3. Udan Khatola (Ropeway Gondola Cable Line)
    const baseStation = new THREE.Mesh(new THREE.BoxGeometry(12, 6, 12), this.sandstoneMat);
    baseStation.position.set(-25, 3, 20);
    complex.add(baseStation);

    // Steel Ropeway Cable
    const cableGeo = new THREE.CylinderGeometry(0.08, 0.08, 80);
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
    const cable = new THREE.Mesh(cableGeo, cableMat);
    cable.position.set(-12.5, 36, 2.5);
    cable.rotation.x = -Math.atan2(35, 63);
    cable.rotation.z = Math.atan2(25, 63);
    complex.add(cable);

    // Suspended Ropeway Gondolas
    const cabinColors = [0xef4444, 0xf59e0b, 0x10b981, 0x3b82f6];
    for (let c = 0; c < 4; c++) {
      const t = 0.2 + c * 0.22;
      const cabinMat = new THREE.MeshStandardMaterial({ color: cabinColors[c], roughness: 0.4 });
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), cabinMat);
      const cx = -25 + t * 25;
      const cy = 6 + t * 60;
      const cz = 20 - t * 35;
      cabin.position.set(cx, cy, cz);
      complex.add(cabin);
    }

    // 4. UNESCO Champaner Heritage Stone Gate & Minarets
    const champanerGate = new THREE.Group();
    champanerGate.position.set(20, 0, 15);

    const gateArch = new THREE.Mesh(new THREE.BoxGeometry(16, 8, 3), this.sandstoneMat);
    gateArch.position.set(0, 4, 0);

    const minaret1 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 18, 8), this.sandstoneMat);
    minaret1.position.set(-8, 9, 0);
    const minaret2 = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 18, 8), this.sandstoneMat);
    minaret2.position.set(8, 9, 0);

    const dome1 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), this.sandstoneMat);
    dome1.position.set(-8, 18.5, 0);
    const dome2 = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 8), this.sandstoneMat);
    dome2.position.set(8, 18.5, 0);

    champanerGate.add(gateArch, minaret1, minaret2, dome1, dome2);
    complex.add(champanerGate);

    group.add(complex);
  }

  /**
   * Zone: Dholavira Harappan Citadel & Iconic "Road to Heaven"
   */
  private buildDholaviraRoadToHeaven(group: THREE.Group) {
    const complex = new THREE.Group();
    complex.position.set(0, 0, -20);

    // 1. "Road to Heaven" - White salt flats stretching to horizon with straight highway
    const saltBed = new THREE.Mesh(new THREE.PlaneGeometry(280, 180), this.saltMat);
    saltBed.rotation.x = -Math.PI / 2;
    saltBed.position.set(0, 0.05, 0);
    complex.add(saltBed);

    // Elevated Highway Causeway slicing through salt
    const roadCauseway = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 180), this.roadMat);
    roadCauseway.position.set(0, 0.6, 0);
    complex.add(roadCauseway);

    // White highway railings
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 180), railMat);
    railL.position.set(-5.8, 1.4, 0);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 180), railMat);
    railR.position.set(5.8, 1.4, 0);
    complex.add(railL, railR);

    // 2. Harappan 5000-year-old Stone Citadel & Bastions
    const citadelGroup = new THREE.Group();
    citadelGroup.position.set(40, 0, -30);

    const citadelWall = new THREE.Mesh(new THREE.BoxGeometry(50, 6, 8), this.sandstoneMat);
    citadelWall.position.set(0, 3, 0);
    const bastion1 = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 9, 8), this.sandstoneMat);
    bastion1.position.set(-25, 4.5, 0);
    const bastion2 = new THREE.Mesh(new THREE.CylinderGeometry(4, 5, 9, 8), this.sandstoneMat);
    bastion2.position.set(25, 4.5, 0);

    // Great Indus Reservoir (Stepped Water Tank)
    const tank = new THREE.Mesh(new THREE.BoxGeometry(32, 4, 22), this.stoneMat);
    tank.position.set(0, -1, 20);
    const tankWater = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), this.waterMat);
    tankWater.rotation.x = -Math.PI / 2;
    tankWater.position.set(0, 0.8, 20);
    citadelGroup.add(citadelWall, bastion1, bastion2, tank, tankWater);

    // Dholavira 10-Character Signboard Inscription Monument
    const signPlaque = new THREE.Mesh(new THREE.BoxGeometry(14, 3, 0.8), this.sandstoneMat);
    signPlaque.position.set(0, 8, 0);
    citadelGroup.add(signPlaque);

    complex.add(citadelGroup);

    // 3. Pink Flamingo Sanctuary Flock
    const flamingoGroup = new THREE.Group();
    flamingoGroup.position.set(-45, 0, 10);
    const flamingoMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 });

    for (let f = 0; f < 12; f++) {
      const bird = new THREE.Group();
      const fx = (f % 4) * 5 + (Math.random() - 0.5) * 3;
      const fz = Math.floor(f / 4) * 6 + (Math.random() - 0.5) * 3;
      bird.position.set(fx, 0, fz);

      const fLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8), flamingoMat);
      fLegs.position.y = 0.9;
      const fBody = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), flamingoMat);
      fBody.position.set(0, 1.9, 0);
      const fNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9), flamingoMat);
      fNeck.position.set(0.1, 2.3, 0.2);
      fNeck.rotation.x = 0.4;

      bird.add(fLegs, fBody, fNeck);
      flamingoGroup.add(bird);
    }
    complex.add(flamingoGroup);

    group.add(complex);
  }

  /**
   * Zone: Palitana Shatrunjaya Hill & 863 White Marble Jain Temples
   */
  private buildPalitanaShatrunjaya(group: THREE.Group) {
    const complex = new THREE.Group();
    complex.position.set(0, 0, -35);

    // 1. Shatrunjaya Sacred Mountain
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(65, 55, 8), this.sandstoneMat);
    mountain.position.set(0, 27.5, -10);
    complex.add(mountain);

    // 2. 3,800 Steps Pilgrimage Path Winding Up
    for (let s = 0; s < 25; s++) {
      const t = s / 25;
      const angle = t * Math.PI * 1.5;
      const r = 50 * (1 - t * 0.7);
      const step = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 2.5), this.marbleMat);
      step.position.set(Math.cos(angle) * r, t * 50 + 0.4, Math.sin(angle) * r - 10);
      step.rotation.y = -angle + Math.PI / 2;
      complex.add(step);
    }

    // 3. Adinath Bhagwan Grand Central Jinmandir (White Marble)
    const centralTemple = new THREE.Group();
    centralTemple.position.set(0, 55, -10);

    const base = new THREE.Mesh(new THREE.BoxGeometry(24, 6, 24), this.marbleMat);
    base.position.y = 3;

    // Main central marble Shikhar
    const mainShikhar = new THREE.Mesh(new THREE.ConeGeometry(5, 16, 12), this.marbleMat);
    mainShikhar.position.set(0, 14, 0);
    const kalash = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 8), this.goldMat);
    kalash.position.set(0, 23.5, 0);

    // Pure white Jinendra Dhwaja flag
    const flagMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const whiteFlag = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.0), flagMat);
    whiteFlag.position.set(2.0, 25.5, 0);

    centralTemple.add(base, mainShikhar, kalash, whiteFlag);

    // 4. Cluster of auxiliary white marble temple spires (City of Temples)
    const clusterOffsets = [
      { x: -9, z: -9 },
      { x: 9, z: -9 },
      { x: -9, z: 9 },
      { x: 9, z: 9 },
      { x: -16, z: 0 },
      { x: 16, z: 0 },
      { x: 0, z: -16 },
      { x: 0, z: 16 },
    ];

    clusterOffsets.forEach((pos) => {
      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.5, 10, 8), this.marbleMat);
      spire.position.set(pos.x, 9, pos.z);
      const goldTop = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 6), this.goldMat);
      goldTop.position.set(pos.x, 14.5, pos.z);
      centralTemple.add(spire, goldTop);
    });

    complex.add(centralTemple);

    // 5. Palitana Base Station & Torana Gateway
    const torana = new THREE.Group();
    torana.position.set(0, 0, 25);
    const tCol1 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 7, 8), this.marbleMat);
    tCol1.position.set(-6, 3.5, 0);
    const tCol2 = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 7, 8), this.marbleMat);
    tCol2.position.set(6, 3.5, 0);
    const tArch = new THREE.Mesh(new THREE.BoxGeometry(15, 1.4, 1.2), this.marbleMat);
    tArch.position.set(0, 7.2, 0);
    torana.add(tCol1, tCol2, tArch);
    complex.add(torana);

    group.add(complex);
  }

  /**
   * Zone: Vadodara Laxmi Vilas Palace & Sursagar Lake Shiva Idol
   */
  private buildVadodaraLaxmiVilas(group: THREE.Group) {
    const complex = new THREE.Group();
    complex.position.set(0, 0, -25);

    // 1. Laxmi Vilas Palace Indo-Saracenic Facade
    const palaceGroup = new THREE.Group();
    palaceGroup.position.set(0, 0, -15);

    // Main central palace wing
    const centerWing = new THREE.Mesh(new THREE.BoxGeometry(40, 16, 18), this.royalPalaceMat);
    centerWing.position.set(0, 8, 0);

    // Left and Right Royal Courtyard wings
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(26, 12, 14), this.royalPalaceMat);
    leftWing.position.set(-32, 6, 3);
    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(26, 12, 14), this.royalPalaceMat);
    rightWing.position.set(32, 6, 3);

    // Iconic 45m Venetian Clock Tower
    const clockTower = new THREE.Mesh(new THREE.BoxGeometry(8, 36, 8), this.royalPalaceMat);
    clockTower.position.set(0, 18, 6);
    const towerSpire = new THREE.Mesh(new THREE.ConeGeometry(4.5, 12, 8), this.goldMat);
    towerSpire.position.set(0, 42, 6);

    // Palace Domes and Balconies (Jharokhas)
    const dome1 = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), this.goldMat);
    dome1.position.set(-20, 18, 0);
    const dome2 = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 12), this.goldMat);
    dome2.position.set(20, 18, 0);

    palaceGroup.add(centerWing, leftWing, rightWing, clockTower, towerSpire, dome1, dome2);
    complex.add(palaceGroup);

    // 2. Sursagar Lake & 120-foot Golden/Stone Shiva Statue
    const lakeGroup = new THREE.Group();
    lakeGroup.position.set(0, 0, 25);

    // Square lake reservoir
    const lakeBed = new THREE.Mesh(new THREE.BoxGeometry(38, 1.2, 28), this.stoneMat);
    lakeBed.position.set(0, 0.6, 0);
    const lakeWater = new THREE.Mesh(new THREE.PlaneGeometry(34, 24), this.waterMat);
    lakeWater.rotation.x = -Math.PI / 2;
    lakeWater.position.set(0, 1.25, 0);

    // Central Shiva Idol Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 4, 8), this.stoneMat);
    pedestal.position.set(0, 3, 0);

    // Lord Shiva in Padmasana (Meditative Pose)
    const shivaTorso = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 3.5, 8), this.goldMat);
    shivaTorso.position.set(0, 6.5, 0);
    const shivaHead = new THREE.Mesh(new THREE.SphereGeometry(1.0, 8, 8), this.goldMat);
    shivaHead.position.set(0, 8.8, 0);
    const trishul = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 7), this.goldMat);
    trishul.position.set(1.5, 8.5, 0);

    lakeGroup.add(lakeBed, lakeWater, pedestal, shivaTorso, shivaHead, trishul);
    complex.add(lakeGroup);

    // Royal Palm Garden
    for (let p = -2; p <= 2; p++) {
      if (p !== 0) {
        this.createTree(complex, p * 18, 5, 1.5);
      }
    }

    group.add(complex);
  }

  /**
   * Zone: Dandi National Salt Satyagraha Memorial & Beach Coast
   */
  private buildDandiSaltMemorial(group: THREE.Group) {
    const complex = new THREE.Group();
    complex.position.set(0, 0, -20);

    // 1. Arabian Sea Coastline & Beach Sandy Promenade
    const coastWater = new THREE.Mesh(new THREE.PlaneGeometry(160, 60), this.waterMat);
    coastWater.rotation.x = -Math.PI / 2;
    coastWater.position.set(0, 0.05, -35);
    const sandyBeach = new THREE.Mesh(new THREE.PlaneGeometry(160, 40), this.sandMat);
    sandyBeach.rotation.x = -Math.PI / 2;
    sandyBeach.position.set(0, 0.06, 0);
    complex.add(coastWater, sandyBeach);

    // 2. National Salt Satyagraha Memorial - Iconic Solar Pyramid Monument
    const memorialBase = new THREE.Mesh(new THREE.BoxGeometry(26, 1.5, 26), this.stoneMat);
    memorialBase.position.set(0, 0.75, 15);

    // Translucent pyramid pavilion
    const pyramidMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.75,
    });
    const pyramid = new THREE.Mesh(new THREE.ConeGeometry(9, 14, 4), pyramidMat);
    pyramid.position.set(0, 8.5, 15);
    pyramid.rotation.y = Math.PI / 4;

    // Glowing salt crystal sphere at center
    const crystal = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0), this.saltMat);
    crystal.position.set(0, 7.0, 15);

    complex.add(memorialBase, pyramid, crystal);

    // 3. Bronze Tableau: Mahatma Gandhi & 80 Satyagrahis Bronze Procession
    const marchPath = new THREE.Group();
    marchPath.position.set(-20, 0, 15);

    // Lead figure: Mahatma Gandhi with walking stick
    const gandhi = new THREE.Group();
    gandhi.position.set(0, 0, 0);
    const gBody = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 2.2, 6), this.bronzeMat);
    gBody.position.y = 1.1;
    const gHead = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 6), this.bronzeMat);
    gHead.position.y = 2.4;
    const gStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6), this.bronzeMat);
    gStaff.position.set(0.4, 1.3, 0.3);
    gandhi.add(gBody, gHead, gStaff);
    marchPath.add(gandhi);

    // Follower Satyagrahi figures in column
    for (let s = 1; s <= 14; s++) {
      const follower = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 2.0, 6), this.bronzeMat);
      const fx = -s * 1.6;
      const fz = (s % 2 === 0 ? 0.6 : -0.6);
      follower.position.set(fx, 1.0, fz);
      marchPath.add(follower);
    }
    complex.add(marchPath);

    // 4. Historic Salt Heaps (મીઠાના ઢગલા)
    for (let h = 0; h < 6; h++) {
      const saltHeap = new THREE.Mesh(new THREE.ConeGeometry(2.5 + (h % 3) * 0.5, 2.5, 8), this.saltMat);
      saltHeap.position.set(22 + (h % 3) * 5, 1.25, 8 + Math.floor(h / 3) * 7);
      complex.add(saltHeap);
    }

    // Coastal Coconut Palms
    for (let p = -3; p <= 3; p++) {
      this.createTree(complex, p * 16, -12, 1.8);
    }

    group.add(complex);
  }

  /**
   * Build roadside infrastructure: Gujarati Petrol Pumps, Mechanics, Toll Plazas, Dhabas
   */
  private buildRoadsideScenery(locations: LocationData[]) {
    const roadsideGroup = new THREE.Group();

    // 1. Gujarati Petrol Pumps ("શ્રી ગણેશ પેટ્રોલિયમ")
    this.buildPetrolStation(roadsideGroup, 220, 80, '⛽ શ્રી ગણેશ પેટ્રોલિયમ (HP)');
    this.buildPetrolStation(roadsideGroup, -120, -160, '⛽ ખોડિયાર પેટ્રોલિયમ (IndianOil)');
    this.buildPetrolStation(roadsideGroup, 100, 460, '⛽ ગીર હાઇવે પેટ્રોલિયમ');

    // 2. Roadside Mechanic & Puncture Garages ("રણછોડ ઓટો ગેરેજ")
    this.buildAutoGarage(roadsideGroup, 180, 50, '🔧 રણછોડ ઓટો ગેરેજ & પંચર');
    this.buildAutoGarage(roadsideGroup, -80, 200, '🔧 બાલાજી છકડો સર્વિસ સેન્ટર');

    // 3. Highway FASTag Toll Plaza
    this.buildTollPlaza(roadsideGroup, 300, 100);

    // 4. Milestone Markers and Streetlamps along roadways
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const nextLoc = locations[(i + 1) % locations.length];
      const midX = (loc.worldPosition.x + nextLoc.worldPosition.x) / 2;
      const midZ = (loc.worldPosition.z + nextLoc.worldPosition.z) / 2;

      // Tree groves
      for (let t = 0; t < 4; t++) {
        this.createTree(roadsideGroup, midX + (t % 2 === 0 ? 12 : -12), midZ + (t * 15 - 25), 1.5);
      }
    }

    this.scene.add(roadsideGroup);
  }

  private buildPetrolStation(parent: THREE.Group, x: number, z: number, name: string) {
    const station = new THREE.Group();
    station.position.set(x, 0, z);

    // Large illuminated canopy roof
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(22, 1.2, 14), canopyMat);
    canopy.position.set(0, 6.5, 0);
    canopy.castShadow = true;
    station.add(canopy);

    // Canopy support pillars
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6), pillarMat);
    p1.position.set(-8, 3, -4);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6), pillarMat);
    p2.position.set(8, 3, -4);
    const p3 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6), pillarMat);
    p3.position.set(-8, 3, 4);
    const p4 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 6), pillarMat);
    p4.position.set(8, 3, 4);
    station.add(p1, p2, p3, p4);

    // Fuel dispenser pumps (Petrol / Diesel / CNG)
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });

    [-4, 4].forEach((px) => {
      const pumpIsland = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 6), this.stoneMat);
      pumpIsland.position.set(px, 0.2, 0);
      station.add(pumpIsland);

      const pumpUnit = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.2, 1.2), pumpMat);
      pumpUnit.position.set(px, 1.5, 0);
      station.add(pumpUnit);

      const digitalScreen = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 1.22), screenMat);
      digitalScreen.position.set(px, 2.0, 0);
      station.add(digitalScreen);
    });

    // Canopy Signboard
    this.createBoard(station, name, 0, 7.5, 7.1, 16, 1.8);

    // Canopy LED lights underneath
    const ceilingLight = new THREE.PointLight(0xffedd5, 3.5, 25);
    ceilingLight.position.set(0, 5.8, 0);
    station.add(ceilingLight);

    parent.add(station);
  }

  private buildAutoGarage(parent: THREE.Group, x: number, z: number, name: string) {
    const garage = new THREE.Group();
    garage.position.set(x, 0, z);

    // Workshop corrugated shed
    const shedMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7 });
    const shed = new THREE.Mesh(new THREE.BoxGeometry(16, 5, 12), shedMat);
    shed.position.set(0, 2.5, 0);
    garage.add(shed);

    // Slanted tin roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(18, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    roof.position.set(0, 5.2, 0);
    roof.rotation.x = 0.08;
    garage.add(roof);

    // Stacked Tyres outside
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    for (let t = 0; t < 5; t++) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.28, 12), tireMat);
      tire.position.set(-7, 0.14 + t * 0.28, 7);
      garage.add(tire);
    }

    // Garage Board
    this.createBoard(garage, name, 0, 5.8, 6.1, 14, 1.5);

    parent.add(garage);
  }

  private buildTollPlaza(parent: THREE.Group, x: number, z: number) {
    const toll = new THREE.Group();
    toll.position.set(x, 0, z);

    // Toll Plaza Overhead Arch
    const archMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const overhead = new THREE.Mesh(new THREE.BoxGeometry(26, 1.5, 4), archMat);
    overhead.position.set(0, 7.5, 0);
    toll.add(overhead);

    // Toll Booth Cabins
    [-7, 0, 7].forEach((bx) => {
      const booth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 3.2, 3.5), new THREE.MeshStandardMaterial({ color: 0xf8fafc }));
      booth.position.set(bx, 1.6, 0);
      toll.add(booth);

      // FASTag electronic scanner indicator
      const greenArrow = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.1), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      greenArrow.position.set(bx, 7.5, 2.1);
      toll.add(greenArrow);
    });

    this.createBoard(toll, '🛣️ રાષ્ટ્રીય ધોરીમાર્ગ ટોલ પ્લાઝા (FASTag Lane)', 0, 8.8, 2.1, 20, 1.4);

    parent.add(toll);
  }
}

