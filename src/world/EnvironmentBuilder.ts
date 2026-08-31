import * as THREE from 'three';
import { LocationData } from '../types';
import { RoadSignBuilder } from './RoadSignBuilder';
import { TrafficSignalBuilder } from './TrafficSignalBuilder';
import { RoadGeometryHelper } from './RoadGeometryHelper';
import { RoadTextureGenerator } from './RoadTextureGenerator';
import { getResolvedHighwaySegments, ResolvedHighwaySegment } from '../data/highwayNetwork';
import * as raniKiVav from './landmarks/raniKiVav';
import * as somnath from './landmarks/somnath';
import * as girGate from './landmarks/girGate';
import * as whiteRann from './landmarks/whiteRann';
import * as statueOfUnity from './landmarks/statueOfUnity';

export class EnvironmentBuilder {
  private scene: THREE.Scene;
  public roadSignBuilder: RoadSignBuilder;
  public trafficSignalBuilder: TrafficSignalBuilder;

  // Reusable materials
  private roadMat: THREE.MeshStandardMaterial;
  private roadMarkingMat: THREE.MeshBasicMaterial;
  private whiteLineMat: THREE.MeshBasicMaterial;
  private curbMat: THREE.MeshStandardMaterial;
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
  private glassMat: THREE.MeshStandardMaterial;
  private steelMat: THREE.MeshStandardMaterial;
  private factoryWallMat: THREE.MeshStandardMaterial;
  private factoryRoofMat: THREE.MeshStandardMaterial;
  private brightRedMat: THREE.MeshStandardMaterial;

  // Animatable objects
  public animatableWindmills: THREE.Group[] = [];
  public animatableSmokePuffs: { mesh: THREE.Mesh; startY: number; maxOffset: number; speed: number }[] = [];
  public animatableSteamPuffs: { mesh: THREE.Mesh; startY: number; maxOffset: number; speed: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.roadSignBuilder = new RoadSignBuilder(scene);
    this.trafficSignalBuilder = new TrafficSignalBuilder(scene);

    this.roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    this.roadMarkingMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    this.whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
    this.curbMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
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
    this.glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8, transparent: true, opacity: 0.75 });
    this.steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.8 });
    this.factoryWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
    this.factoryRoofMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.5 });
    this.brightRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
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

    // 2. Build interconnected wide multi-lane highways
    const segments = getResolvedHighwaySegments();
    this.buildRoadNetwork(segments);

    // 3. Build grand junction plazas / roundabouts at each city destination
    this.buildJunctionPlazas(locations);

    // 4. Build wide overhead gantry traffic signals
    this.trafficSignalBuilder.buildAllSignals(segments, this.scene);

    // 5. Build realistic Gujarati road signs and distance milestones
    this.roadSignBuilder.buildAllRoadSigns(locations, this.scene);

    // 6. Build each unique landmark zone
    locations.forEach((loc) => {
      this.buildZoneLandmark(loc);
    });

    // 7. Populate roadside scenery: trees (strictly off-road), milestone signboards, dhabas, streetlights
    this.buildRoadsideScenery(locations);
  }

  /**
   * Helper to create direct 3D highway mesh with exact coordinates and zero rotation ambiguity
   */
  private createHighwaySegmentGeometry(
    start: { x: number; z: number },
    end: { x: number; z: number },
    width: number,
    elevation: number,
    repeatUVY: number
  ): THREE.BufferGeometry {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance <= 0) return new THREE.BufferGeometry();

    const dirX = dx / distance;
    const dirZ = dz / distance;
    // Perpendicular normal to the right of travel direction
    const normX = -dirZ;
    const normZ = dirX;

    const hw = width / 2;

    // 4 Corner Vertices in 3D world space
    // Corner 0: Start Left
    const x0 = start.x - normX * hw;
    const z0 = start.z - normZ * hw;
    // Corner 1: Start Right
    const x1 = start.x + normX * hw;
    const z1 = start.z + normZ * hw;
    // Corner 2: End Left
    const x2 = end.x - normX * hw;
    const z2 = end.z - normZ * hw;
    // Corner 3: End Right
    const x3 = end.x + normX * hw;
    const z3 = end.z + normZ * hw;

    const positions = new Float32Array([
      // Triangle 1 (0 -> 1 -> 2)
      x0, elevation, z0,
      x1, elevation, z1,
      x2, elevation, z2,
      // Triangle 2 (1 -> 3 -> 2)
      x1, elevation, z1,
      x3, elevation, z3,
      x2, elevation, z2,
    ]);

    const uvs = new Float32Array([
      0, 0,
      1, 0,
      0, repeatUVY,

      1, 0,
      1, repeatUVY,
      0, repeatUVY,
    ]);

    const normals = new Float32Array([
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
      0, 1, 0,
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    return geo;
  }

  /**
   * Helper to create direct 3D shoulder verge mesh along the highway sides
   */
  private createShoulderGeometry(
    start: { x: number; z: number },
    end: { x: number; z: number },
    roadWidth: number,
    shoulderWidth: number,
    side: 'left' | 'right',
    elevation: number
  ): THREE.BufferGeometry {
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance <= 0) return new THREE.BufferGeometry();

    const dirX = dx / distance;
    const dirZ = dz / distance;
    const normX = -dirZ;
    const normZ = dirX;

    const hw = roadWidth / 2;
    const inOffset = hw;
    const outOffset = hw + shoulderWidth;
    const factor = side === 'right' ? 1 : -1;

    const inStartX = start.x + normX * (inOffset * factor);
    const inStartZ = start.z + normZ * (inOffset * factor);
    const inEndX = end.x + normX * (inOffset * factor);
    const inEndZ = end.z + normZ * (inOffset * factor);

    const outStartX = start.x + normX * (outOffset * factor);
    const outStartZ = start.z + normZ * (outOffset * factor);
    const outEndX = end.x + normX * (outOffset * factor);
    const outEndZ = end.z + normZ * (outOffset * factor);

    let positions: Float32Array;
    if (side === 'right') {
      positions = new Float32Array([
        inStartX, elevation, inStartZ,
        outStartX, elevation, outStartZ,
        inEndX, elevation, inEndZ,

        outStartX, elevation, outStartZ,
        outEndX, elevation, outEndZ,
        inEndX, elevation, inEndZ,
      ]);
    } else {
      positions = new Float32Array([
        outStartX, elevation, outStartZ,
        inStartX, elevation, inStartZ,
        outEndX, elevation, outEndZ,

        inStartX, elevation, inStartZ,
        inEndX, elevation, inEndZ,
        outEndX, elevation, outEndZ,
      ]);
    }

    const uvs = new Float32Array([
      0, 0, 1, 0, 0, distance / 8,
      1, 0, 1, distance / 8, 0, distance / 8
    ]);

    const normals = new Float32Array([
      0, 1, 0, 0, 1, 0, 0, 1, 0,
      0, 1, 0, 0, 1, 0, 0, 1, 0
    ]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    return geo;
  }

  /**
   * Create realistic wide asphalt roads with textured lane markings, dashed center lines,
   * continuous shoulder fog lines, rumble notches, and retro-reflective road studs.
   */
  private buildRoadNetwork(segments: ResolvedHighwaySegment[]) {
    const roadGroup = new THREE.Group();
    const studMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2, metalness: 0.9 });
    const whiteStudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.85 });
    const rumbleBarTexture = RoadTextureGenerator.getRumbleBarTexture();
    const rumbleBarMat = new THREE.MeshBasicMaterial({ map: rumbleBarTexture, transparent: true });

    for (const seg of segments) {
      const { start, end, distance, width, corridor } = seg;
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      if (distance <= 0) continue;

      const dirX = dx / distance;
      const dirZ = dz / distance;
      const normX = -dirZ;
      const normZ = dirX;

      // 1. Solid Dark Dammar Base Underlay (prevents any ground peeking through)
      const underlayGeo = this.createHighwaySegmentGeometry(start, end, width + 0.6, 0.032, 1);
      const underlayMesh = new THREE.Mesh(underlayGeo, this.roadMat);
      underlayMesh.receiveShadow = true;
      roadGroup.add(underlayMesh);

      // 2. High-Definition Textured Asphalt Highway Surface
      const baseRoadTexture = RoadTextureGenerator.getHighwayTexture({
        type: corridor.type,
        width,
      });

      const segmentTexture = baseRoadTexture.clone();
      segmentTexture.wrapS = THREE.ClampToEdgeWrapping;
      segmentTexture.wrapT = THREE.RepeatWrapping;
      const repeatY = distance / 16.0;
      segmentTexture.repeat.set(1, repeatY);
      segmentTexture.needsUpdate = true;

      const segmentMat = new THREE.MeshStandardMaterial({
        map: segmentTexture,
        roughness: 0.82,
        metalness: 0.05,
      });

      const segmentGeo = this.createHighwaySegmentGeometry(start, end, width, 0.040, repeatY);
      const segment = new THREE.Mesh(segmentGeo, segmentMat);
      segment.receiveShadow = true;
      roadGroup.add(segment);

      // 3. Paved Shoulders / Gravel verge running alongside road edges
      const shoulderWidth = 2.4;
      const shoulderLeftGeo = this.createShoulderGeometry(start, end, width, shoulderWidth, 'left', 0.025);
      const shoulderLeft = new THREE.Mesh(shoulderLeftGeo, this.sandMat);
      shoulderLeft.receiveShadow = true;
      roadGroup.add(shoulderLeft);

      const shoulderRightGeo = this.createShoulderGeometry(start, end, width, shoulderWidth, 'right', 0.025);
      const shoulderRight = new THREE.Mesh(shoulderRightGeo, this.sandMat);
      shoulderRight.receiveShadow = true;
      roadGroup.add(shoulderRight);

      // 4. 3D Raised Retro-Reflective Road Studs (RPMs / Cat's Eyes)
      const studStep = 8.0;
      const studCount = Math.floor(distance / studStep);
      const edgeOffset = width / 2 - 0.55;

      for (let s = 1; s < studCount; s++) {
        const t = s / studCount;
        const cx = start.x + dx * t;
        const cz = start.z + dz * t;

        // Center line amber/yellow cat's eye stud
        const centerStud = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.18), studMat);
        centerStud.position.set(cx, 0.065, cz);
        roadGroup.add(centerStud);

        // Left & Right shoulder line white cat's eye studs
        if (s % 2 === 0) {
          const leftStud = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.16), whiteStudMat);
          leftStud.position.set(cx - normX * edgeOffset, 0.062, cz - normZ * edgeOffset);
          roadGroup.add(leftStud);

          const rightStud = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.16), whiteStudMat);
          rightStud.position.set(cx + normX * edgeOffset, 0.062, cz + normZ * edgeOffset);
          roadGroup.add(rightStud);
        }
      }

      // 5. Yellow Transverse Rumble Bars / Speed Warning Markings (approaching junctions at both ends)
      if (distance > 60) {
        // Near start junction (approx 25m out)
        const t1 = 25 / distance;
        const r1Start = { x: start.x + dx * (t1 - 1.8 / distance), z: start.z + dz * (t1 - 1.8 / distance) };
        const r1End = { x: start.x + dx * (t1 + 1.8 / distance), z: start.z + dz * (t1 + 1.8 / distance) };
        const rumble1Geo = this.createHighwaySegmentGeometry(r1Start, r1End, width * 0.88, 0.046, 1);
        const rumble1 = new THREE.Mesh(rumble1Geo, rumbleBarMat);
        roadGroup.add(rumble1);

        // Near end junction (approx 25m out)
        const t2 = (distance - 25) / distance;
        const r2Start = { x: start.x + dx * (t2 - 1.8 / distance), z: start.z + dz * (t2 - 1.8 / distance) };
        const r2End = { x: start.x + dx * (t2 + 1.8 / distance), z: start.z + dz * (t2 + 1.8 / distance) };
        const rumble2Geo = this.createHighwaySegmentGeometry(r2Start, r2End, width * 0.88, 0.046, 1);
        const rumble2 = new THREE.Mesh(rumble2Geo, rumbleBarMat);
        roadGroup.add(rumble2);
      }
    }

    this.scene.add(roadGroup);
  }

  /**
   * Build clean, wide junction roundabouts and plazas connecting all highway branches
   * with textured circular asphalt, concentric circulation lane guides, radial zebra crossings,
   * and hazard chevrons.
   */
  private buildJunctionPlazas(locations: LocationData[]) {
    const plazaGroup = new THREE.Group();
    const roundaboutTex = RoadTextureGenerator.getRoundaboutTexture();
    const roundaboutMat = new THREE.MeshStandardMaterial({
      map: roundaboutTex,
      roughness: 0.82,
      metalness: 0.05,
    });

    for (const loc of locations) {
      const { x, z } = loc.worldPosition;
      const jGroup = new THREE.Group();
      jGroup.position.set(x, 0, z);

      // 1. Solid Dark Dammar Base Underlay Disc (radius 27m)
      const underlayAsphalt = new THREE.Mesh(
        new THREE.CircleGeometry(27, 48),
        this.roadMat
      );
      underlayAsphalt.rotation.x = -Math.PI / 2;
      underlayAsphalt.position.y = 0.032;
      underlayAsphalt.receiveShadow = true;
      jGroup.add(underlayAsphalt);

      // 2. Wide circular asphalt roundabout (radius 26.5m) with textured markings
      const asphalt = new THREE.Mesh(
        new THREE.CircleGeometry(26.5, 48),
        roundaboutMat
      );
      asphalt.rotation.x = -Math.PI / 2;
      asphalt.position.y = 0.042;
      asphalt.receiveShadow = true;
      jGroup.add(asphalt);

      // 3. Outer paved sidewalk ring
      const sidewalk = new THREE.Mesh(
        new THREE.RingGeometry(26.5, 29.8, 32),
        this.sandstoneMat
      );
      sidewalk.rotation.x = -Math.PI / 2;
      sidewalk.position.y = 0.044;
      jGroup.add(sidewalk);

      // 4. Outer yellow-black kerb ring
      const kerb = new THREE.Mesh(
        new THREE.RingGeometry(26.2, 26.6, 32),
        this.terracottaMat
      );
      kerb.rotation.x = -Math.PI / 2;
      kerb.position.y = 0.046;
      jGroup.add(kerb);

      // 5. Central Landscaped Traffic Island
      const islandKerb = new THREE.Mesh(
        new THREE.CylinderGeometry(7.5, 7.5, 0.45, 32),
        this.stoneMat
      );
      islandKerb.position.y = 0.225;
      islandKerb.castShadow = true;
      jGroup.add(islandKerb);

      const islandLawn = new THREE.Mesh(
        new THREE.CircleGeometry(7.3, 32),
        this.grassMat
      );
      islandLawn.rotation.x = -Math.PI / 2;
      islandLawn.position.y = 0.46;
      jGroup.add(islandLawn);

      // 5. Central Landmark Decorative Pillar
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 2.0, 1.2, 16),
        this.sandstoneMat
      );
      pedestal.position.y = 1.05;
      pedestal.castShadow = true;

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.9, 4.0, 16),
        this.sandstoneMat
      );
      column.position.y = 3.6;
      column.castShadow = true;

      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(1.0, 16, 16),
        this.goldMat
      );
      crown.position.y = 6.2;
      crown.castShadow = true;

      jGroup.add(pedestal, column, crown);

      // 6. Roundabout guidance dashes
      const innerDashRing = new THREE.Mesh(
        new THREE.RingGeometry(16.8, 17.2, 32),
        this.whiteLineMat
      );
      innerDashRing.rotation.x = -Math.PI / 2;
      innerDashRing.position.y = 0.02;
      jGroup.add(innerDashRing);

      plazaGroup.add(jGroup);
    }

    this.scene.add(plazaGroup);
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
        landmarkGroup.add(somnath.build());
        break;
      case 'gir':
        landmarkGroup.add(girGate.build());
        break;
      case 'junagadh':
        this.buildGirnarMountain(landmarkGroup);
        break;
      case 'kutch':
        landmarkGroup.add(whiteRann.build());
        break;
      case 'statue_of_unity':
        landmarkGroup.add(statueOfUnity.build());
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
        landmarkGroup.add(raniKiVav.build());
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
    // Teak & Banyan Dense Forest trees (strictly checked for world position road clearance)
    for (let i = 0; i < 56; i++) {
      const angle = (i / 56) * Math.PI * 2;
      const radius = 30 + Math.random() * 75;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius - 20;
      const worldX = 150 + tx; // Gir position is (150, 550)
      const worldZ = 550 + tz;
      if (!RoadGeometryHelper.isInsideRoadOrClearance(worldX, worldZ, 12.0)) {
        this.createTree(group, tx, tz, 2.2 + Math.random() * 1.8, true);
      }
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


  private createTree(parent: THREE.Group, x: number, z: number, scale: number = 1.0, bypassSafetyCheck: boolean = false) {
    // Compute world coordinates
    let worldX = x;
    let worldZ = z;
    if (parent && parent.position) {
      worldX = parent.position.x + x;
      worldZ = parent.position.z + z;
    }

    // Strictly forbid placing tree on road or within safety clearance
    if (!bypassSafetyCheck && RoadGeometryHelper.isInsideRoadOrClearance(worldX, worldZ, 10.0)) {
      return;
    }

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
    this.buildPetrolStation(roadsideGroup, -120, -180, '⛽ ખોડિયાર પેટ્રોલિયમ (IndianOil)');
    this.buildPetrolStation(roadsideGroup, 110, 470, '⛽ ગીર હાઇવે પેટ્રોલિયમ');

    // 2. Roadside Mechanic & Puncture Garages ("રણછોડ ઓટો ગેરેજ")
    this.buildAutoGarage(roadsideGroup, 180, 45, '🔧 રણછોડ ઓટો ગેરેજ & પંચર');
    this.buildAutoGarage(roadsideGroup, -85, 210, '🔧 બાલાજી છકડો સર્વિસ સેન્ટર');

    // 3. Highway FASTag Toll Plaza
    this.buildTollPlaza(roadsideGroup, 300, 100);

    // 4. Highway Water Crossings & Multi-Span Bridges with Real Water Rivers
    this.buildAllWaterBridges(roadsideGroup);

    // 5. Agricultural Gujarat Farms (Windmills, Tubewells, Scarecrows, Tractors, Cotton Crops)
    this.buildAllFarms(roadsideGroup);

    // 6. GIDC Industrial Estates & Manufacturing Factories (Silos, Chimneys, Smoke)
    this.buildAllFactories(roadsideGroup);

    // 7. Roadside Shops (Kirana, Paan Parlours, Handicrafts)
    this.buildAllShops(roadsideGroup);

    // 8. Modern Commercial Shopping Malls
    this.buildAllMalls(roadsideGroup);

    // 9. Modern Corporate & High-Rise Buildings
    this.buildAllBuildings(roadsideGroup);

    // 10. Traditional Saurashtra Village Houses & Delis
    this.buildAllHouses(roadsideGroup);

    // 11. Roadside Food & Tea Stall Encounters (Ganthiya & Tea Kiosks)
    this.buildRoadsideFoodStalls(roadsideGroup);

    // 12. Milestone Tree Groves along highway verges (outside asphalt + clearance buffer)
    const segments = RoadGeometryHelper.getSegments();
    for (const seg of segments) {
      const { start, end, angle, distance, width } = seg;
      const dx = end.x - start.x;
      const dz = end.z - start.z;

      // Normal vector perpendicular to road axis
      const normX = Math.cos(angle);
      const normZ = -Math.sin(angle);

      // Safe distance beyond road edge: (width/2 + 5.5m)
      const safeDist = width / 2 + 5.5;
      const stepCount = Math.floor(distance / 50);

      for (let s = 1; s < stepCount; s++) {
        const t = s / stepCount;
        const cx = start.x + dx * t;
        const cz = start.z + dz * t;

        // Right side roadside tree
        const rx = cx + normX * (safeDist + (s % 3) * 2.5);
        const rz = cz + normZ * (safeDist + (s % 3) * 2.5);
        if (!RoadGeometryHelper.isInsideRoadOrClearance(rx, rz, 8.0)) {
          this.createTree(roadsideGroup, rx, rz, 1.3 + (s % 2) * 0.4, true);
        }

        // Left side roadside tree
        const lx = cx - normX * (safeDist + ((s + 1) % 3) * 2.5);
        const lz = cz - normZ * (safeDist + ((s + 1) % 3) * 2.5);
        if (!RoadGeometryHelper.isInsideRoadOrClearance(lx, lz, 8.0)) {
          this.createTree(roadsideGroup, lx, lz, 1.3 + ((s + 1) % 2) * 0.4, true);
        }
      }
    }

    this.scene.add(roadsideGroup);
  }

  /**
   * Update continuous world animations: Windmill rotor spin & chimney smoke rising
   */
  public update(delta: number) {
    // 1. Rotate windmill blades
    for (const windmill of this.animatableWindmills) {
      windmill.rotation.z += delta * 1.5;
    }

    // 2. Animate factory smokestack chimney puffs
    for (const puff of this.animatableSmokePuffs) {
      puff.mesh.position.y += delta * puff.speed;
      const progress = (puff.mesh.position.y - puff.startY) / puff.maxOffset;
      if (progress >= 1.0) {
        puff.mesh.position.y = puff.startY;
        puff.mesh.scale.set(1, 1, 1);
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.65;
      } else {
        const scale = 1.0 + progress * 2.2;
        puff.mesh.scale.set(scale, scale, scale);
        (puff.mesh.material as THREE.MeshStandardMaterial).opacity = 0.65 * (1 - progress);
      }
    }

    // 3. Animate tea stall steaming kettle puffs
    for (const steam of this.animatableSteamPuffs) {
      steam.mesh.position.y += delta * steam.speed;
      const progress = (steam.mesh.position.y - steam.startY) / steam.maxOffset;
      if (progress >= 1.0) {
        steam.mesh.position.y = steam.startY;
        steam.mesh.scale.set(1, 1, 1);
        (steam.mesh.material as THREE.MeshStandardMaterial).opacity = 0.6;
      } else {
        const scale = 1.0 + progress * 1.6;
        steam.mesh.scale.set(scale, scale, scale);
        (steam.mesh.material as THREE.MeshStandardMaterial).opacity = 0.6 * (1 - progress);
      }
    }
  }

  /**
   * Build 3D Bridges with authentic flowing water channels underneath
   */
  private buildAllWaterBridges(parent: THREE.Group) {
    const bridges = [
      {
        id: 'sabarmati',
        name: '🌉 સાબરમતી નદી મહાસેતુ (Sabarmati River Bridge)',
        x: -140,
        z: -40,
        width: 18,
        length: 80,
        riverWidth: 70,
        riverLength: 260,
        riverAngle: 0.85,
        hasArch: true,
      },
      {
        id: 'narmada',
        name: '🌉 શ્રી નર્મદા મૈયા કેબલ બ્રિજ (Narmada Cable Bridge)',
        x: -210,
        z: 220,
        width: 18,
        length: 90,
        riverWidth: 80,
        riverLength: 280,
        riverAngle: -0.4,
        isCableStayed: true,
      },
      {
        id: 'tapi',
        name: '🌉 તાપી નદી બ્રિજ (Tapi River Bridge)',
        x: -180,
        z: 360,
        width: 18,
        length: 80,
        riverWidth: 70,
        riverLength: 240,
        riverAngle: 0.3,
        isCableStayed: true,
      },
      {
        id: 'kutch_gulf',
        name: '🌉 કચ્છ પ્રવેશ દ્વાર મહાસેતુ (Gulf of Kutch Causeway)',
        x: -70,
        z: -250,
        width: 18,
        length: 85,
        riverWidth: 75,
        riverLength: 260,
        riverAngle: -0.7,
        hasArch: false,
      },
      {
        id: 'road_to_heaven',
        name: '🌉 રોડ ટુ હેવન કોઝવે પુલ (Road to Heaven Bridge)',
        x: -150,
        z: -380,
        width: 16,
        length: 80,
        riverWidth: 70,
        riverLength: 250,
        riverAngle: 0.5,
        hasArch: false,
      },
    ];

    for (const b of bridges) {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, 0, b.z);

      // 1. Water Channel Underneath Bridge
      const riverWater = new THREE.Mesh(
        new THREE.PlaneGeometry(b.riverWidth, b.riverLength),
        this.waterMat
      );
      riverWater.rotation.x = -Math.PI / 2;
      riverWater.rotation.z = b.riverAngle;
      riverWater.position.y = 0.04;
      bGroup.add(riverWater);

      // Riverbanks Embankment
      const bankMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
      const bankL = new THREE.Mesh(new THREE.BoxGeometry(b.riverWidth, 0.4, 6), bankMat);
      bankL.position.set(0, 0.2, -b.length / 2 - 2);
      const bankR = new THREE.Mesh(new THREE.BoxGeometry(b.riverWidth, 0.4, 6), bankMat);
      bankR.position.set(0, 0.2, b.length / 2 + 2);
      bGroup.add(bankL, bankR);

      // 2. Concrete Bridge Piers Extending into River
      const pierMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 });
      const pierOffsets = [-24, 0, 24];
      for (const pz of pierOffsets) {
        // Left & Right Cylindrical Pier Columns
        const pLeft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 6, 12), pierMat);
        pLeft.position.set(-b.width / 2 + 1.2, 0.8, pz);
        const pRight = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 6, 12), pierMat);
        pRight.position.set(b.width / 2 - 1.2, 0.8, pz);

        // Crosshead Beam
        const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(b.width + 1.5, 1.2, 3.2), pierMat);
        crossBeam.position.set(0, 3.2, pz);
        bGroup.add(pLeft, pRight, crossBeam);
      }

      // 3. Heavy-Duty Side Guard Rails & Crash Barriers
      const barrierMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
      const railMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 });

      // Concrete side parapet base
      const parapetL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, b.length), barrierMat);
      parapetL.position.set(-b.width / 2 - 0.4, 0.48, 0);
      const parapetR = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, b.length), barrierMat);
      parapetR.position.set(b.width / 2 + 0.4, 0.48, 0);

      // Steel tubular handrail on top
      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, b.length), railMat);
      railL.position.set(-b.width / 2 - 0.4, 1.2, 0);
      const railR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, b.length), railMat);
      railR.position.set(b.width / 2 + 0.4, 1.2, 0);

      bGroup.add(parapetL, parapetR, railL, railR);

      // 4. Cable Stayed Pylons (for Narmada / Tapi bridges)
      if (b.isCableStayed) {
        const pylonMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5 });
        const cableWireMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });

        // Center A-frame Pylon Tower (Height 36m)
        const pylonLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 34, 8), pylonMat);
        pylonLeft.position.set(-b.width / 2 - 1.5, 17, 0);
        pylonLeft.rotation.z = -0.06;

        const pylonRight = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 34, 8), pylonMat);
        pylonRight.position.set(b.width / 2 + 1.5, 17, 0);
        pylonRight.rotation.z = 0.06;

        const topCrest = new THREE.Mesh(new THREE.BoxGeometry(b.width + 5, 2.0, 3.0), this.goldMat);
        topCrest.position.set(0, 34, 0);

        bGroup.add(pylonLeft, pylonRight, topCrest);

        // Suspension Stay Cables radiating down to bridge deck
        for (let c = -4; c <= 4; c++) {
          if (c === 0) continue;
          const cableZ = c * 8;
          const cableLen = Math.hypot(30, Math.abs(cableZ));

          const cable1 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, cableLen), cableWireMat);
          cable1.position.set(-b.width / 2 - 0.2, 17, cableZ / 2);
          cable1.rotation.x = Math.atan2(cableZ, 30);
          cable1.rotation.z = -0.08;

          const cable2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, cableLen), cableWireMat);
          cable2.position.set(b.width / 2 + 0.2, 17, cableZ / 2);
          cable2.rotation.x = Math.atan2(cableZ, 30);
          cable2.rotation.z = 0.08;

          bGroup.add(cable1, cable2);
        }
      }

      // 5. Overhead Decorative Steel Arch (for Sabarmati bridge)
      if (b.hasArch) {
        const archSteelMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
        const archLeft = new THREE.Mesh(new THREE.TorusGeometry(b.length / 2, 0.6, 8, 24, Math.PI), archSteelMat);
        archLeft.position.set(-b.width / 2 - 0.5, 0, 0);
        archLeft.rotation.y = Math.PI / 2;

        const archRight = new THREE.Mesh(new THREE.TorusGeometry(b.length / 2, 0.6, 8, 24, Math.PI), archSteelMat);
        archRight.position.set(b.width / 2 + 0.5, 0, 0);
        archRight.rotation.y = Math.PI / 2;

        bGroup.add(archLeft, archRight);
      }

      // 6. Bridge Milestone Signboards at both approaches
      this.createBoard(bGroup, b.name, 0, 4.5, -b.length / 2 - 4, 18, 1.6);
      this.createBoard(bGroup, b.name, 0, 4.5, b.length / 2 + 4, 18, 1.6);

      // 7. Bridge LED Streetlights along deck
      for (let lz = -b.length / 2 + 10; lz <= b.length / 2 - 10; lz += 20) {
        const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6), this.steelMat);
        postL.position.set(-b.width / 2 - 0.8, 3.0, lz);
        const lampL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.4), this.goldMat);
        lampL.position.set(-b.width / 2 - 0.4, 6.0, lz);

        const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6), this.steelMat);
        postR.position.set(b.width / 2 + 0.8, 3.0, lz);
        const lampR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.4), this.goldMat);
        lampR.position.set(b.width / 2 + 0.4, 6.0, lz);

        bGroup.add(postL, lampL, postR, lampR);
      }

      parent.add(bGroup);
    }
  }

  /**
   * Build Agricultural Farms along rural highways (Windmills, Tubewells, Scarecrows, Tractors, Cotton Crops)
   */
  private buildAllFarms(parent: THREE.Group) {
    const farms = [
      {
        name: '🌾 શ્રી ખોડિયાર એગ્રી ફાર્મ (કપાસ & મગફળી)',
        x: 130,
        z: 150,
        cropColor: 0xca8a04, // Golden mustard
        hasWindmill: true,
        hasTractor: true,
        hasScarecrow: true,
      },
      {
        name: '🌾 સરદાર પટેલ કિસાન ફાર્મ (ઓર્ગેનિક કપાસ)',
        x: -160,
        z: -90,
        cropColor: 0x15803d, // Lush green
        hasWindmill: true,
        hasTractor: true,
        hasScarecrow: true,
      },
      {
        name: '🌾 સૌરાષ્ટ્ર પ્રાકૃતિક ફાર્મ',
        x: 260,
        z: -80,
        cropColor: 0xd97706, // Groundnut gold
        hasWindmill: true,
        hasTractor: false,
        hasScarecrow: true,
      },
      {
        name: '🌾 ગોપાલ કૃષિ ફાર્મ & બોરવેલ',
        x: -90,
        z: 140,
        cropColor: 0x166534, // Dark green
        hasWindmill: false,
        hasTractor: true,
        hasScarecrow: true,
      },
    ];

    for (const f of farms) {
      const fGroup = new THREE.Group();
      fGroup.position.set(f.x, 0, f.z);

      // 1. Crop Field Base
      this.createCropField(fGroup, 0, 0, 48, 36, f.cropColor);

      // Cotton Puffs / Crop Rows on the field
      const cottonMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
      for (let r = -14; r <= 14; r += 7) {
        for (let c = -20; c <= 20; c += 8) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 6), cottonMat);
          puff.position.set(c + (Math.random() - 0.5) * 2, 0.4, r + (Math.random() - 0.5) * 2);
          fGroup.add(puff);
        }
      }

      // 2. Working Windmill (પવનચક્કી)
      if (f.hasWindmill) {
        const windmillTower = new THREE.Group();
        windmillTower.position.set(-18, 0, -12);

        // Steel lattice tower / column
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.2, 16, 6), this.steelMat);
        tower.position.y = 8;
        windmillTower.add(tower);

        // Gearbox head
        const nacelle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 2.2), this.steelMat);
        nacelle.position.set(0, 16, 0);
        windmillTower.add(nacelle);

        // Tail vane (direction fin)
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 2.8), this.brightRedMat);
        tail.position.set(0, 16, -2.2);
        windmillTower.add(tail);

        // 4-Blade Rotating Rotor
        const rotor = new THREE.Group();
        rotor.position.set(0, 16, 1.2);

        const hub = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), this.steelMat);
        rotor.add(hub);

        for (let b = 0; b < 4; b++) {
          const bladeAngle = (b * Math.PI) / 2;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4.2, 0.08), this.woodMat);
          blade.position.set(Math.sin(bladeAngle) * 2.2, Math.cos(bladeAngle) * 2.2, 0);
          blade.rotation.z = -bladeAngle;
          rotor.add(blade);
        }

        windmillTower.add(rotor);
        this.animatableWindmills.push(rotor);
        fGroup.add(windmillTower);
      }

      // 3. Tube-Well Pump House & Irrigation Water Channel
      const pumpHouse = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 4), this.terracottaMat);
      pumpHouse.position.set(18, 1.5, -12);
      const pumpRoof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.5, 4), this.thatchMat);
      pumpRoof.position.set(18, 3.75, -12);
      pumpRoof.rotation.y = Math.PI / 4;
      fGroup.add(pumpHouse, pumpRoof);

      // Turquoise Irrigation Water Canal
      const canal = new THREE.Mesh(new THREE.BoxGeometry(32, 0.3, 1.6), this.waterMat);
      canal.position.set(0, 0.15, -12);
      fGroup.add(canal);

      // 4. Traditional Scarecrow (ચાડિયો)
      if (f.hasScarecrow) {
        const scarecrow = new THREE.Group();
        scarecrow.position.set(6, 0, 4);

        // Wooden Cross Stand
        const poleV = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2), this.woodMat);
        poleV.position.y = 1.6;
        const poleH = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), this.woodMat);
        poleH.position.set(0, 2.3, 0);
        poleH.rotation.z = Math.PI / 2;

        // Pot Head with mustache / tilak
        const potHead = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), this.terracottaMat);
        potHead.position.y = 3.2;

        // Colorful Turban / Paghadi
        const paghadi = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.15, 6, 12), this.brightRedMat);
        paghadi.position.set(0, 3.4, 0);
        paghadi.rotation.x = Math.PI / 2;

        // Vest / Kurta
        const kurta = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.4), this.goldMat);
        kurta.position.set(0, 1.9, 0);

        scarecrow.add(poleV, poleH, potHead, paghadi, kurta);
        fGroup.add(scarecrow);
      }

      // 5. Farm Tractor with Hay Wagon
      if (f.hasTractor) {
        const tractor = new THREE.Group();
        tractor.position.set(-10, 0, 10);
        tractor.rotation.y = 0.4;

        // Red Tractor Hood & Chassis
        const hood = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 1.4), this.brightRedMat);
        hood.position.set(0, 1.1, 0.6);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), this.brightRedMat);
        cab.position.set(0, 1.8, -0.6);
        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.2), this.steelMat);
        chimney.position.set(0.6, 2.0, 0.8);

        // Big rear tires
        const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
        const rearL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 12), tireMat);
        rearL.rotation.z = Math.PI / 2;
        rearL.position.set(-0.9, 0.8, -0.6);
        const rearR = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 12), tireMat);
        rearR.rotation.z = Math.PI / 2;
        rearR.position.set(0.9, 0.8, -0.6);

        // Front small tires
        const frontL = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), tireMat);
        frontL.rotation.z = Math.PI / 2;
        frontL.position.set(-0.8, 0.45, 1.2);
        const frontR = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), tireMat);
        frontR.rotation.z = Math.PI / 2;
        frontR.position.set(0.8, 0.45, 1.2);

        tractor.add(hood, cab, chimney, rearL, rearR, frontL, frontR);

        // Yellow Trailer Wagon attached behind
        const wagon = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 3.5), this.goldMat);
        wagon.position.set(0, 1.0, -3.2);
        const hay = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 3.2), this.thatchMat);
        hay.position.set(0, 1.8, -3.2);

        tractor.add(wagon, hay);
        fGroup.add(tractor);
      }

      // 6. Farm Wooden Boundary Fence & Signboard
      for (let px = -22; px <= 22; px += 8) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.4), this.woodMat);
        post.position.set(px, 0.7, 18);
        fGroup.add(post);
      }
      const fenceRail = new THREE.Mesh(new THREE.BoxGeometry(44, 0.1, 0.1), this.woodMat);
      fenceRail.position.set(0, 1.1, 18);
      fGroup.add(fenceRail);

      // Farm Signboard
      this.createBoard(fGroup, f.name, 0, 3.2, 18.2, 14, 1.4);

      parent.add(fGroup);
    }
  }

  /**
   * Build Industrial Factories & Manufacturing GIDC Estates (Silos, Chimneys, Animated Smoke, Loading Bays)
   */
  private buildAllFactories(parent: THREE.Group) {
    const factories = [
      {
        name: '🏭 GIDC સિરામિક્સ & ટાઇલ્સ મેન્યુફેક્ચરિંગ પ્લાન્ટ',
        x: -180,
        z: 250,
        shedColor: 0x0369a1, // Deep Blue
        hasChimney: true,
      },
      {
        name: '🏭 રાજકોટ એન્જિનિયરિંગ & ફાઉન્ડ્રી GIDC',
        x: 190,
        z: -210,
        shedColor: 0x15803d, // Industrial Green
        hasChimney: true,
      },
      {
        name: '🏭 સુરત સિન્થેટિક્સ & ટેક્સટાઇલ પ્રોસેસિંગ મિલ',
        x: -280,
        z: 360,
        shedColor: 0x475569, // Steel Grey
        hasChimney: true,
      },
      {
        name: '🏭 અમદાવાદ ફાર્મા & કેમિકલ પાર્ક',
        x: -310,
        z: -60,
        shedColor: 0x0891b2, // Cyan Blue
        hasChimney: true,
      },
    ];

    for (const f of factories) {
      const factGroup = new THREE.Group();
      factGroup.position.set(f.x, 0, f.z);

      // 1. Large Industrial Corrugated Manufacturing Shed (36m x 20m x 10m)
      const shedMat = new THREE.MeshStandardMaterial({ color: f.shedColor, roughness: 0.6, metalness: 0.4 });
      const mainShed = new THREE.Mesh(new THREE.BoxGeometry(36, 9, 20), shedMat);
      mainShed.position.set(0, 4.5, 0);
      mainShed.castShadow = true;

      // Pitched Industrial Roof with translucent skylights
      const roof = new THREE.Mesh(new THREE.ConeGeometry(22, 4, 4), this.factoryRoofMat);
      roof.position.set(0, 11, 0);
      roof.rotation.y = Math.PI / 4;

      factGroup.add(mainShed, roof);

      // 2. Tall Industrial Chimney (Height 26m) with Rising Smoke Particle System
      if (f.hasChimney) {
        const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 });
        const chimney = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.8, 24, 12), chimneyMat);
        chimney.position.set(14, 12, -8);
        factGroup.add(chimney);

        // Red & White Aviation Safety Rings on Chimney Top
        const ring1 = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.25, 2.0, 12), this.brightRedMat);
        ring1.position.set(14, 21, -8);
        const ring2 = new THREE.Mesh(new THREE.CylinderGeometry(1.21, 1.22, 2.0, 12), this.whiteLineMat);
        ring2.position.set(14, 23, -8);
        factGroup.add(ring1, ring2);

        // Animated Smoke Puffs rising from chimney
        for (let p = 0; p < 4; p++) {
          const smokeMat = new THREE.MeshStandardMaterial({
            color: 0xe2e8f0,
            roughness: 0.9,
            transparent: true,
            opacity: 0.65,
          });
          const smokePuff = new THREE.Mesh(new THREE.SphereGeometry(1.2 + p * 0.3, 8, 8), smokeMat);
          const startY = 25 + p * 4;
          smokePuff.position.set(14 + (Math.random() - 0.5) * 0.8, startY, -8 + (Math.random() - 0.5) * 0.8);
          factGroup.add(smokePuff);

          this.animatableSmokePuffs.push({
            mesh: smokePuff,
            startY: 24.5,
            maxOffset: 20,
            speed: 3.5 + (p % 2) * 1.5,
          });
        }
      }

      // 3. Chemical / Grain Storage Silos (3 Cylindrical Tanks)
      for (let s = -1; s <= 1; s++) {
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 12, 16), this.steelMat);
        silo.position.set(-14 + s * 5.5, 6, -10);
        const siloCap = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.steelMat);
        siloCap.position.set(-14 + s * 5.5, 12, -10);
        factGroup.add(silo, siloCap);
      }

      // 4. Loading Platform & Shipping Cargo Containers
      const dock = new THREE.Mesh(new THREE.BoxGeometry(20, 1.4, 8), this.stoneMat);
      dock.position.set(0, 0.7, 12);
      factGroup.add(dock);

      const containerColors = [0x2563eb, 0xd97706, 0x16a34a];
      [-6, 0, 6].forEach((cx, idx) => {
        const cMat = new THREE.MeshStandardMaterial({ color: containerColors[idx % 3], roughness: 0.5 });
        const container = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.5, 2.2), cMat);
        container.position.set(cx, 2.6, 12);
        factGroup.add(container);
      });

      // 5. Factory Billboard Signboard
      this.createBoard(factGroup, f.name, 0, 8.5, 10.1, 18, 1.6);

      parent.add(factGroup);
    }
  }

  /**
   * Build Roadside Village & Highway Commercial Shops (Kirana, Paan Parlours, Handicrafts)
   */
  private buildAllShops(parent: THREE.Group) {
    const shops = [
      {
        name: '🏪 શ્રી ગણેશ કરિયાણા & જનરલ સ્ટોર્સ',
        x: 75,
        z: 45,
        type: 'kirana',
      },
      {
        name: '🏪 જય બજરંગ પાન પાર્લર & કોલ્ડ્રિંક્સ',
        x: -135,
        z: 125,
        type: 'paan',
      },
      {
        name: '🏪 હસ્તકલા & બાંધણી એમ્પોરિયમ',
        x: 210,
        z: -95,
        type: 'handicraft',
      },
      {
        name: '🏪 મા ખોડિયાર ડેરી & સ્વીટ માર્ટ',
        x: -65,
        z: -145,
        type: 'dairy',
      },
    ];

    for (const s of shops) {
      const sGroup = new THREE.Group();
      sGroup.position.set(s.x, 0, s.z);

      // 1. Shop Building
      const shopBuilding = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 6), this.sandstoneMat);
      shopBuilding.position.set(0, 2.1, 0);
      shopBuilding.castShadow = true;

      // 2. Striped Shop Awning Canopy
      const awningMat = new THREE.MeshStandardMaterial({
        color: s.type === 'paan' ? 0xdc2626 : s.type === 'handicraft' ? 0x9333ea : 0x0284c7,
        roughness: 0.4,
      });
      const awning = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.2, 2.5), awningMat);
      awning.position.set(0, 3.8, 3.8);
      awning.rotation.x = 0.25;

      sGroup.add(shopBuilding, awning);

      // 3. Shop Display Counter / Shelves
      const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 1.2), this.woodMat);
      counter.position.set(0, 0.55, 2.2);
      sGroup.add(counter);

      // Paan Parlour Cold Drink Refrigerator
      if (s.type === 'paan') {
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.0), this.glassMat);
        fridge.position.set(-2.5, 1.2, 2.0);
        sGroup.add(fridge);
      }

      // Shop Signboard
      this.createBoard(sGroup, s.name, 0, 4.6, 3.1, 8.5, 1.2);

      parent.add(sGroup);
    }
  }

  /**
   * Build Modern Gujarat Commercial Shopping Malls
   */
  private buildAllMalls(parent: THREE.Group) {
    const malls = [
      {
        name: '🏬 ગુજરાત સેન્ટ્રલ મેગા મોલ & મલ્ટિપ્લેક્સ',
        x: -130,
        z: -30,
      },
      {
        name: '🏬 રિલાયન્સ મેગા શોપિંગ પ્લાઝા',
        x: 260,
        z: 30,
      },
    ];

    for (const m of malls) {
      const mallGroup = new THREE.Group();
      mallGroup.position.set(m.x, 0, m.z);

      // 1. Multi-tier Grand Curved Mall Facade (45m x 18m x 26m)
      const baseBuilding = new THREE.Mesh(new THREE.BoxGeometry(45, 14, 26), this.stoneMat);
      baseBuilding.position.set(0, 7, 0);

      // Modern Glass Curtain Wall Facade
      const glassFacade = new THREE.Mesh(new THREE.PlaneGeometry(42, 12), this.glassMat);
      glassFacade.position.set(0, 7.5, 13.1);

      // Grand Entrance Glass Portico
      const portico = new THREE.Mesh(new THREE.BoxGeometry(18, 6, 6), this.steelMat);
      portico.position.set(0, 3, 15);

      mallGroup.add(baseBuilding, glassFacade, portico);

      // 2. Rooftop Illuminated Neon Header Sign
      this.createBoard(mallGroup, m.name, 0, 16.5, 13.2, 26, 2.4);

      // 3. Landscaped Palm Plaza in front of mall
      for (let p = -3; p <= 3; p++) {
        if (p !== 0) {
          this.createTree(mallGroup, p * 6, 20, 1.6, true);
        }
      }

      parent.add(mallGroup);
    }
  }

  /**
   * Build High-Rise Corporate & Commercial Glass Buildings / Towers
   */
  private buildAllBuildings(parent: THREE.Group) {
    const towers = [
      {
        name: '🏢 ગિફ્ટ સિટી હાઇ-ટેક ટાવર્સ (GIFT City Tower)',
        x: -220,
        z: -110,
        floors: 12,
        height: 42,
      },
      {
        name: '🏢 સૌરાષ્ટ્ર કોર્પોરેટ પાર્ક & બિઝનેસ હબ',
        x: -255,
        z: 180,
        floors: 10,
        height: 35,
      },
      {
        name: '🏢 રત્નમ ડાયમંડ કોમર્શિયલ સેન્ટર',
        x: 85,
        z: -170,
        floors: 11,
        height: 38,
      },
    ];

    for (const b of towers) {
      const bGroup = new THREE.Group();
      bGroup.position.set(b.x, 0, b.z);

      // 1. Concrete Core & Glass Tower
      const towerCore = new THREE.Mesh(new THREE.BoxGeometry(22, b.height, 22), this.stoneMat);
      towerCore.position.set(0, b.height / 2, 0);

      // Architectural Glass Curtain Facade
      const glass1 = new THREE.Mesh(new THREE.PlaneGeometry(20, b.height - 4), this.glassMat);
      glass1.position.set(0, b.height / 2, 11.1);

      const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(20, b.height - 4), this.glassMat);
      glass2.position.set(0, b.height / 2, -11.1);
      glass2.rotation.y = Math.PI;

      // Rooftop Communication Mast / Antenna
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 10), this.steelMat);
      mast.position.set(0, b.height + 5, 0);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), this.brightRedMat);
      beacon.position.set(0, b.height + 10, 0);

      bGroup.add(towerCore, glass1, glass2, mast, beacon);

      // Ground Floor Entrance Canopy & Signboard
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 5), this.steelMat);
      canopy.position.set(0, 4.5, 13.5);
      bGroup.add(canopy);

      this.createBoard(bGroup, b.name, 0, 5.8, 14.5, 16, 1.4);

      parent.add(bGroup);
    }
  }

  /**
   * Build Traditional Saurashtra Village Houses & Delis (Mangalore tiles, Osari, Charpai, Tulsi Kyara, Toran)
   */
  private buildAllHouses(parent: THREE.Group) {
    const houses = [
      {
        name: '🏡 ગોપાલભાઈનું ગામઠી મકાન & ડેલી',
        x: 55,
        z: -85,
      },
      {
        name: '🏡 રણછોડદાસની કાઠિયાવાડી હવેલી',
        x: 135,
        z: 300,
      },
      {
        name: '🏡 બાપા સીતારામ નિવાસ & ઓસરી',
        x: -95,
        z: 260,
      },
      {
        name: '🏡 કિસાન નિવાસ',
        x: 275,
        z: 180,
      },
    ];

    for (const h of houses) {
      const hGroup = new THREE.Group();
      hGroup.position.set(h.x, 0, h.z);

      // 1. Whitewashed & Sandstone Village House Base (14m x 9m x 4.5m)
      const houseBody = new THREE.Mesh(new THREE.BoxGeometry(14, 4.2, 9), this.sandstoneMat);
      houseBody.position.set(0, 2.1, 0);
      houseBody.castShadow = true;

      // 2. Traditional Sloping Red Clay Mangalore Tile Roof (નળિયાંવાળું છાપરું)
      const tileRoof = new THREE.Mesh(new THREE.ConeGeometry(11, 2.8, 4), this.terracottaMat);
      tileRoof.position.set(0, 5.6, 0);
      tileRoof.rotation.y = Math.PI / 4;

      hGroup.add(houseBody, tileRoof);

      // 3. Front Covered Verandah (ઓસરી / ઓટલો) with 4 Carved Teak Wooden Pillars
      const verandah = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 3.5), this.stoneMat);
      verandah.position.set(0, 0.2, 5.5);
      hGroup.add(verandah);

      [-5, -1.8, 1.8, 5].forEach((px) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 3.8, 8), this.woodMat);
        pillar.position.set(px, 2.0, 7.0);
        hGroup.add(pillar);
      });

      // 4. Traditional Woven Rope Cot / Bed (કાઠિયાવાડી ખાટલો / ચારપાઈ) on the verandah
      const charpai = new THREE.Group();
      charpai.position.set(-2.5, 0.4, 5.5);

      const cotFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 1.4), this.woodMat);
      cotFrame.position.y = 0.35;
      const cotBed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.2), this.thatchMat);
      cotBed.position.y = 0.42;

      // 4 legs
      [-1.0, 1.0].forEach((lx) => {
        [-0.55, 0.55].forEach((lz) => {
          const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.4), this.woodMat);
          leg.position.set(lx, 0.2, lz);
          charpai.add(leg);
        });
      });
      charpai.add(cotFrame, cotBed);
      hGroup.add(charpai);

      // 5. Sacred Tulsi Kyara (તુલસી ક્યારો) with Green Basil Plant in courtyard
      const tulsi = new THREE.Group();
      tulsi.position.set(4.0, 0, 8.5);

      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.1, 1.0), this.terracottaMat);
      pedestal.position.y = 0.55;
      const basil = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4), this.leafMat);
      basil.position.y = 1.35;
      const diya = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1), this.goldMat);
      diya.position.set(0.4, 0.8, 0);

      tulsi.add(pedestal, basil, diya);
      hGroup.add(tulsi);

      // 6. Brass Water Pots (બેડાં / હેલ) on wooden stool
      const potStack = new THREE.Group();
      potStack.position.set(3.5, 0.4, 5.5);
      const pot1 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), this.goldMat);
      pot1.position.y = 0.35;
      const pot2 = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), this.goldMat);
      pot2.position.y = 0.8;
      potStack.add(pot1, pot2);
      hGroup.add(potStack);

      // House Name Signboard
      this.createBoard(hGroup, h.name, 0, 4.8, 5.5, 10, 1.2);

      parent.add(hGroup);
    }
  }

  /**
   * Build 3D Visual Models for Roadside Food & Tea Stalls matching ROADSIDE_ENCOUNTERS
   */
  private buildRoadsideFoodStalls(parent: THREE.Group) {
    const stalls = [
      {
        id: 'enc_rajkot_tea',
        name: '☕ જય ખોડિયાર કડક મસાલા ચા',
        type: 'tea',
        x: 120,
        z: -40,
      },
      {
        id: 'enc_rajkot_ganthiya',
        name: '🥨 રાજકોટ લાઈવ વણેલા ગાંઠિયા રથ',
        type: 'ganthiya',
        x: -60,
        z: -80,
      },
      {
        id: 'enc_bhavnagar_ganthiya',
        name: '🥨 ભાવનગરી તીખા ગાંઠિયા & જલેબી સ્ટોલ',
        type: 'ganthiya',
        x: 80,
        z: 220,
      },
      {
        id: 'enc_ahmedabad_gotas',
        name: '🧆 હાઇવે લીલી મેથીના ગોટા & કઢી',
        type: 'ganthiya',
        x: -240,
        z: 60,
      },
      {
        id: 'enc_rth_tea',
        name: '🫖 રોડ ટુ હેવન રણ ટી પોઇન્ટ',
        type: 'tea',
        x: -180,
        z: -450,
      },
      {
        id: 'enc_narmada_tea',
        name: '☕ નર્મદા કિનારા કડક ચા & નાસ્તો',
        type: 'tea',
        x: -160,
        z: 280,
      },
      {
        id: 'enc_surat_locho',
        name: '🍲 સુરતી લાઈવ બટર લોચો & ખમણ',
        type: 'ganthiya',
        x: -200,
        z: 420,
      },
      {
        id: 'enc_dwarka_penda',
        name: '🍮 દ્વારકાધીશ પ્રસાદી પેંડા & ચા',
        type: 'tea',
        x: 410,
        z: 80,
      },
    ];

    for (const st of stalls) {
      const stallGroup = new THREE.Group();
      stallGroup.position.set(st.x, 0, st.z);

      if (st.type === 'tea') {
        // 1. Tea Stall / Kitli
        const stallCabin = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.2, 4.0), this.woodMat);
        stallCabin.position.set(0, 1.6, 0);

        // Striped Canvas Umbrella Canopy
        const canopy = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.2, 8), this.brightRedMat);
        canopy.position.set(0, 3.6, 0);

        // Tea Serving Counter
        const counter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.1, 1.2), this.steelMat);
        counter.position.set(0, 0.55, 2.2);

        // Big Brass Tea Samovar Kettle
        const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 1.0, 10), this.goldMat);
        kettle.position.set(-1.2, 1.6, 2.2);

        // Steaming Kettle Smoke Puff
        const steamMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.6,
        });
        const steam = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 6), steamMat);
        steam.position.set(-1.2, 2.3, 2.2);
        stallGroup.add(steam);

        this.animatableSteamPuffs.push({
          mesh: steam,
          startY: 2.2,
          maxOffset: 1.8,
          speed: 1.2,
        });

        // Cutting Chai Glasses Rack
        const glassRack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), this.steelMat);
        glassRack.position.set(1.2, 1.2, 2.2);

        // Outdoor Charpai & Benches for highway drivers
        const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 1.0), this.woodMat);
        bench.position.set(0, 0.25, 4.8);

        stallGroup.add(stallCabin, canopy, counter, kettle, glassRack, bench);
      } else {
        // 2. Ganthiya / Jalebi Live Frying Food Rath
        const rathCart = new THREE.Mesh(new THREE.BoxGeometry(5.8, 2.8, 3.8), this.brightRedMat);
        rathCart.position.set(0, 1.4, 0);

        // Stainless Steel Frying Counter
        const counter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 1.4), this.steelMat);
        counter.position.set(0, 0.55, 2.2);

        // Iron Frying Kadai on Bhatti
        const kadai = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.4, 0.4, 12), this.stoneMat);
        kadai.position.set(-1.4, 1.3, 2.2);

        // Boiling Golden Oil in Kadai
        const oil = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 12), this.goldMat);
        oil.position.set(-1.4, 1.45, 2.2);

        // Ganthiya Heap on Brass Thal
        const ganthiyaThal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.25, 10), this.goldMat);
        ganthiyaThal.position.set(0.6, 1.25, 2.2);

        // Jalebi Orange Heap
        const jalebiThal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.25, 10), this.terracottaMat);
        jalebiThal.position.set(1.8, 1.25, 2.2);

        stallGroup.add(rathCart, counter, kadai, oil, ganthiyaThal, jalebiThal);
      }

      // Stall Board with Gujarati Name
      this.createBoard(stallGroup, st.name, 0, 4.2, 2.2, 7.5, 1.3);

      parent.add(stallGroup);
    }
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

