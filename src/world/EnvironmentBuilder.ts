import * as THREE from 'three';
import { LocationData } from '../types';
import { RoadSignBuilder } from './RoadSignBuilder';
import { TrafficSignalBuilder } from './TrafficSignalBuilder';
import { RoadGeometryHelper } from './RoadGeometryHelper';
import { WaterOccupancy } from './WaterOccupancy';
import { PlacementHelper } from './PlacementHelper';
import { RoadTextureGenerator } from './RoadTextureGenerator';
import { getResolvedHighwaySegments, ResolvedHighwaySegment } from '../data/highwayNetwork';
import {
  getWaterBodySpecs,
  WaterBodySpec,
} from '../data/waterBodies';
import {
  PETROL_PUMPS,
  AUTO_GARAGES,
  TOLL_PLAZA,
  FARMS,
  FACTORIES,
  SHOPS,
  MALLS,
  TOWERS,
  HOUSES,
} from '../data/roadsidePlacements';
import { ROADSIDE_ENCOUNTERS } from '../data/encounters';
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

  // Toll-plaza boom barriers — pivot Groups whose origin is the hinge; start horizontal
  // (rotation.z = 0). GameWorld.payToll() tweens rotation.z to -Math.PI/2 to raise one.
  public tollBoomGates: THREE.Object3D[] = [];

  // Night atmosphere: lit windows, street lamps & coastal aarti glow — driven by setNightFactor()
  private nightEmissiveMaterials: { mat: THREE.MeshStandardMaterial; base: number }[] = [];
  private streetLamps: THREE.PointLight[] = [];
  private aartiLights: THREE.PointLight[] = [];

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
    // 1. Base Terrain Ground Plane — sized to cover every zone (largest extents:
    //    Saputara x≈1534, Dholavira z≈-890) plus their landmark footprints.
    const groundGeo = new THREE.PlaneGeometry(3600, 3600, 60, 60);
    const ground = new THREE.Mesh(groundGeo, this.grassMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    this.scene.add(ground);

    WaterOccupancy.clear();
    PlacementHelper.resetPlacements();

    // Register every water body (rivers, seas, lakes) BEFORE anything else is placed, so
    // trees, city blocks and roadside props can all keep out of the water.
    for (const w of getWaterBodySpecs()) {
      WaterOccupancy.registerRect(w.x - w.sx / 2, w.x + w.sx / 2, w.z - w.sz / 2, w.z + w.sz / 2);
    }

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

    // 7. Populate roadside scenery: trees (strictly off-road), milestone signboards, dhabas, petrol/garage stops
    this.buildRoadsideScenery(locations);

    // 8. Night infrastructure: lit city windows, highway street lamps, coastal aarti glow (all dark by day)
    this.buildNightAtmosphere(locations);
  }

  /**
   * Register an emissive material whose intensity is ramped by setNightFactor().
   * `base` is the emissiveIntensity reached at full night (nightFactor === 1).
   */
  private registerNightEmissive(mat: THREE.MeshStandardMaterial, base: number) {
    this.nightEmissiveMaterials.push({ mat, base });
  }

  /**
   * Self-contained night lighting pass. Adds — all starting fully dark —:
   *  - ~8 emissive "lit window" boxes per city/village/monument zone (rajkot, ahmedabad, surat, vadodara, junagadh)
   *  - street lamp posts + point lights along the highway verges (capped at 40)
   *  - a warm "aarti" point light at the coastal temples (dwarka, somnath) that blooms at dusk
   * setNightFactor() drives all of it each frame from GameWorld.animate().
   */
  private buildNightAtmosphere(locations: LocationData[]) {
    const group = new THREE.Group();
    const locMap = new Map(locations.map((l): [string, LocationData] => [l.id, l]));

    // 1. Lit windows — one shared emissive material, silhouette lighting (not every pane)
    const windowMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0xfde68a, emissiveIntensity: 0 });
    this.registerNightEmissive(windowMat, 0.9);
    const windowGeo = new THREE.BoxGeometry(1.2, 1.6, 0.15);

    for (const id of ['rajkot', 'ahmedabad', 'gandhinagar', 'surat', 'vadodara', 'junagadh']) {
      const loc = locMap.get(id);
      if (!loc) continue;
      const { x, z } = loc.worldPosition;
      // Deterministic per-zone pseudo-random so the layout is stable across reloads
      const seed = x * 0.017 + z * 0.031 + id.length;
      const rand = (n: number) => {
        const s = Math.sin(seed + n * 12.9898) * 43758.5453;
        return s - Math.floor(s);
      };
      // Two implied building faces flanking the zone, 4 windows each (y 2..8)
      for (let face = 0; face < 2; face++) {
        const faceAngle = 0.7 + face * 2.5 + rand(face) * 0.5;
        const bx = x + Math.cos(faceAngle) * 26;
        const bz = z + Math.sin(faceAngle) * 26;
        const yaw = Math.atan2(x - bx, z - bz); // face looks back toward the zone centre
        for (let w = 0; w < 4; w++) {
          const win = new THREE.Mesh(windowGeo, windowMat);
          const lateral = (w % 2 === 0 ? -1 : 1) * (1.4 + rand(face * 10 + w) * 1.3);
          const wy = 2 + Math.floor(w / 2) * 3 + rand(face * 20 + w) * 1.4;
          win.position.set(
            bx + Math.cos(faceAngle + Math.PI / 2) * lateral,
            wy,
            bz + Math.sin(faceAngle + Math.PI / 2) * lateral
          );
          win.rotation.y = yaw;
          group.add(win);
        }
      }
    }

    // 2. Street lamps along the highway verges — walk the same segment data buildRoadsideScenery uses
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.5 });
    const lampHeadMat = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xfff3c4, emissiveIntensity: 0 });
    this.registerNightEmissive(lampHeadMat, 1.0);
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 5, 6);
    const headGeo = new THREE.SphereGeometry(0.35, 8, 6);
    const LAMP_CAP = 40;

    const segments = RoadGeometryHelper.getSegments();
    for (const seg of segments) {
      if (this.streetLamps.length >= LAMP_CAP) break;
      const { start, end, angle, distance, width } = seg;
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const normX = Math.cos(angle);
      const normZ = -Math.sin(angle);
      const sideDist = width / 2 + 2.5;
      const stepCount = Math.floor(distance / 50);

      for (let s = 1; s < stepCount; s++) {
        if (s % 4 !== 0) continue;
        if (this.streetLamps.length >= LAMP_CAP) break;
        const t = s / stepCount;
        const cx = start.x + dx * t;
        const cz = start.z + dz * t;
        const side = s % 8 === 0 ? 1 : -1;
        const lx = cx + normX * sideDist * side;
        const lz = cz + normZ * sideDist * side;

        const lamp = new THREE.Group();
        lamp.position.set(lx, 0, lz);
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2.5;
        const head = new THREE.Mesh(headGeo, lampHeadMat);
        head.position.y = 5;
        const light = new THREE.PointLight(0xfff3c4, 0, 14);
        light.position.y = 5;
        lamp.add(pole, head, light);
        group.add(lamp);
        this.streetLamps.push(light);
      }
    }

    // 3. Coastal aarti glow — warm bloom at the seaside temples, peaks at dusk
    for (const id of ['dwarka', 'somnath']) {
      const loc = locMap.get(id);
      if (!loc) continue;
      const aarti = new THREE.PointLight(0xffa94d, 0, 40);
      aarti.position.set(loc.worldPosition.x, 6, loc.worldPosition.z);
      group.add(aarti);
      this.aartiLights.push(aarti);
    }

    this.scene.add(group);
  }

  /**
   * Ramp all night lighting from a single factor.
   * @param f 0 = full day (everything dark), 1 = deep night. Aarti glow peaks near f ≈ 0.4 (dusk).
   */
  public setNightFactor(f: number) {
    this.nightEmissiveMaterials.forEach(({ mat, base }) => {
      mat.emissiveIntensity = f * base;
    });
    // A PointLight with intensity 0 is NOT culled by Three.js — WebGLLights counts every light
    // whose .visible !== false, so leaving these on would keep ~42 point lights in every
    // material's shader (NUM_POINT_LIGHTS) even at noon. Toggle .visible so they leave the
    // shader entirely by day and only cost a recompile at the dawn/dusk crossover.
    this.streetLamps.forEach((l) => {
      const lit = f > 0.35;
      l.visible = lit;
      l.intensity = lit ? 3.5 : 0;
    });
    this.aartiLights.forEach((l) => {
      const intensity = THREE.MathUtils.clamp(1 - Math.abs(f - 0.4) * 3, 0, 1) * 4;
      l.visible = intensity > 0.01;
      l.intensity = intensity;
    });
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
      case 'somnath': {
        // −Z setback so the temple plinth clears the northbound corridors and the
        // junction-plaza rings; the sea renders south of the shore wall (see somnath.ts).
        const g = somnath.build();
        g.position.z = -62;
        landmarkGroup.add(g);
        break;
      }
      case 'gir': {
        // Skip canopy clumps that would land on the Somnath/Junagadh corridors.
        const gz0 = -20;
        const g = girGate.build((lx, lz) =>
          RoadGeometryHelper.isInsideRoadOrClearance(loc.worldPosition.x + lx, loc.worldPosition.z + gz0 + lz, 5)
        );
        g.position.z = gz0;
        landmarkGroup.add(g);
        break;
      }
      case 'junagadh':
        this.buildGirnarMountain(landmarkGroup);
        break;
      case 'kutch': {
        const g = whiteRann.build();
        g.position.z = -30;
        landmarkGroup.add(g);
        break;
      }
      case 'statue_of_unity': {
        const g = statueOfUnity.build();
        g.position.z = -55;
        landmarkGroup.add(g);
        break;
      }
      case 'saputara':
        this.buildSaputaraGhats(landmarkGroup);
        break;
      case 'ahmedabad':
        this.buildAhmedabadHeritage(landmarkGroup);
        break;
      case 'gandhinagar':
        this.buildGandhinagarSectors(landmarkGroup);
        break;
      case 'surat':
        this.buildSuratTapiBridge(landmarkGroup);
        break;
      case 'patan_modhera': {
        const g = raniKiVav.build();
        g.position.z = -25;
        landmarkGroup.add(g);
        break;
      }
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

    // Coastal Arabian Sea is drawn centrally by buildRiverSystems() from waterBodies.ts
    // (registered for collision + verified road-free).

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
   * Zone: Saputara Hill Station & Monsoon Ghats. Both corridors exit north/north-west, so
   * the hills, lake and waterfall all sit in the road-free eastern saddle — verified by the
   * zoneLayout water/road tests. The lake is drawn centrally from waterBodies.ts.
   */
  private buildSaputaraGhats(group: THREE.Group) {
    // Sahyadri Mountain Hills (off the highway corridors)
    const hill1 = new THREE.Mesh(new THREE.ConeGeometry(55, 45, 16), this.grassMat);
    hill1.position.set(95, 22.5, -45);
    const hill2 = new THREE.Mesh(new THREE.ConeGeometry(65, 55, 16), this.grassMat);
    hill2.position.set(30, 27.5, 100);
    group.add(hill1, hill2);

    // Gira Waterfall stream cascading down hill1's west face
    const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(8, 35), this.waterMat);
    waterfall.position.set(60, 18, -45);
    waterfall.rotation.y = -0.4;
    group.add(waterfall);
  }

  /**
   * Zone: Ahmedabad — heritage pols east of the junction, Sidi Saiyyed jali, and kites.
   * The Sabarmati itself is a narrow N-S strip east of the pols, drawn centrally by
   * buildRiverSystems() from waterBodies.ts with the pedestrian Atal Bridge across it —
   * the wedge is verified road-free, so water never paints over a highway.
   */
  private buildAhmedabadHeritage(group: THREE.Group) {
    const ox = group.position.x;
    const oz = group.position.z;

    // Sidi Saiyyed jali — north-east of the plaza, well clear of the roundabout
    const sidiJali = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 1.2), this.sandstoneMat);
    sidiJali.position.set(36, 4, -8);
    group.add(sidiJali);

    // Tight pol-house grid between the plaza and the river, skipping road/water/plaza cells
    const houseMat = this.sandstoneMat;
    for (let gx = 0; gx < 4; gx++) {
      for (let gz = 0; gz < 4; gz++) {
        const lx = 50 + gx * 13;
        const lz = 6 + gz * 13;
        if (WaterOccupancy.isBlocked(ox + lx, oz + lz, 6)) continue;
        if (RoadGeometryHelper.isInsideRoadOrClearance(ox + lx, oz + lz, 6)) continue;
        const h = 5 + ((gx + gz) % 3);
        const house = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), houseMat);
        house.position.set(lx, h / 2, lz);
        house.castShadow = true;
        group.add(house);
      }
    }

    const kiteColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899];
    kiteColors.forEach((kc, i) => {
      const kite = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 2.5),
        new THREE.MeshStandardMaterial({ color: kc, side: THREE.DoubleSide })
      );
      kite.rotation.z = Math.PI / 4;
      kite.position.set(60 + i * 8, 22 + (i % 3) * 6, -10 + i * 5);
      group.add(kite);
    });
  }

  /**
   * Zone: Gandhinagar — the square sector city. A 4x4 grid of sectors separated by VISIBLE
   * internal streets (purely local geometry, never touching the highway graph), a garden
   * chowk, the Secretariat, an Akshardham pavilion, sector name boards and a tree green
   * belt around the whole grid. The grid starts 34m out from the junction so nothing
   * overlaps the roundabout, and every cell checks road/water before building.
   */
  private buildGandhinagarSectors(group: THREE.Group) {
    const ox = group.position.x;
    const oz = group.position.z;
    const block = 16;
    const street = 10;
    const pitch = block + street;
    const origin = 42; // grid starts outside the 27m junction plaza
    const gridMin = origin - block / 2;                     // 34
    const gridMax = origin + 3 * pitch + block / 2;         // 128

    // --- internal sector streets: 3 lines each way between the 4 rows/columns ---
    const streetMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88 });
    const gridLen = gridMax - gridMin + street;
    for (let k = 0; k < 3; k++) {
      const pos = origin + pitch / 2 + k * pitch; // 55, 81, 107
      const ns = new THREE.Mesh(new THREE.PlaneGeometry(street, gridLen), streetMat);
      ns.rotation.x = -Math.PI / 2;
      ns.position.set(pos, 0.02, (gridMin + gridMax) / 2);
      const ew = new THREE.Mesh(new THREE.PlaneGeometry(gridLen, street), streetMat);
      ew.rotation.x = -Math.PI / 2;
      ew.position.set((gridMin + gridMax) / 2, 0.02, pos);
      group.add(ns, ew);
    }

    const chowkX = origin + pitch;
    const chowkZ = origin + pitch;
    const sectorNames = ['સેક્ટર ૧૩', 'સેક્ટર ૧૪', 'સેક્ટર ૨૧', 'સેક્ટર ૨૨'];
    let nameIdx = 0;

    for (let gx = 0; gx < 4; gx++) {
      for (let gz = 0; gz < 4; gz++) {
        const lx = origin + gx * pitch;
        const lz = origin + gz * pitch;
        const isChowk = gx === 1 && gz === 1;
        const isSecretariat = gx === 2 && gz === 2;
        const isAkshardham = gx === 2 && gz === 0;

        if (isChowk) {
          // Central garden chowk with a small fountain and Indroda-style trees
          const lawn = new THREE.Mesh(new THREE.BoxGeometry(block, 0.15, block), this.grassMat);
          lawn.position.set(lx, 0.08, lz);
          group.add(lawn);
          const fountain = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.9, 16), this.stoneMat);
          fountain.position.set(lx, 0.45, lz);
          const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 2.2, 10), this.waterMat);
          jet.position.set(lx, 1.9, lz);
          group.add(fountain, jet);
          this.createTree(group, lx - 5, lz - 5, 1.1);
          this.createTree(group, lx + 5, lz + 5, 1.1);
          this.createTree(group, lx + 5, lz - 5, 0.9);
          this.createTree(group, lx - 5, lz + 5, 0.9);
          continue;
        }

        if (WaterOccupancy.isBlocked(ox + lx, oz + lz, 6)) continue;
        if (RoadGeometryHelper.isInsideRoadOrClearance(ox + lx, oz + lz, 6)) continue;

        if (isSecretariat) {
          const secretariat = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 12), this.stoneMat);
          secretariat.position.set(lx, 5, lz);
          secretariat.castShadow = true;
          group.add(secretariat);
          this.createBoard(group, 'ગુજરાત સચિવાલય — ગાંધીનગર', lx, 11, lz + 7, 14, 1.6);
          continue;
        }

        if (isAkshardham) {
          // Akshardham-style pavilion: plinth, colonnade, ribbed dome, gold finial
          const pavilion = new THREE.Group();
          pavilion.position.set(lx, 0, lz);
          const plinth = new THREE.Mesh(new THREE.BoxGeometry(18, 1.2, 18), this.sandstoneMat);
          plinth.position.y = 0.6;
          pavilion.add(plinth);
          for (let p = 0; p < 8; p++) {
            const a = (p / 8) * Math.PI * 2;
            const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 7, 10), this.sandstoneMat);
            col.position.set(Math.cos(a) * 6.5, 4.7, Math.sin(a) * 6.5);
            col.castShadow = true;
            pavilion.add(col);
          }
          const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.8, 3, 16), this.sandstoneMat);
          drum.position.y = 9.6;
          const dome = new THREE.Mesh(new THREE.SphereGeometry(5.4, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), this.sandstoneMat);
          dome.position.y = 11.1;
          const finial = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), this.goldMat);
          finial.position.y = 17.2;
          pavilion.add(drum, dome, finial);
          pavilion.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
          group.add(pavilion);
          continue;
        }

        // Regular sector block
        const h = 4 + ((gx * 3 + gz) % 4);
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(block - 4, h, block - 4), this.sandstoneMat);
        bldg.position.set(lx, h / 2, lz);
        bldg.castShadow = true;
        group.add(bldg);

        if ((gx === 0 || gx === 3) && (gz === 0 || gz === 3) && nameIdx < sectorNames.length) {
          this.createBoard(group, sectorNames[nameIdx++], lx, h + 1.6, lz + (block - 4) / 2 + 0.6, 8, 1.3);
        }
      }
    }

    // Green belt: a ring of trees around the whole sector city (createTree skips
    // anything that would land on a road or in water)
    const beltR = (gridMax - (gridMin + gridMax) / 2) * Math.SQRT2 + 12;
    for (let a = 0; a < 20; a++) {
      const theta = (a / 20) * Math.PI * 2 + 0.15;
      const x = (gridMin + gridMax) / 2 + Math.cos(theta) * beltR;
      const z = (gridMin + gridMax) / 2 + Math.sin(theta) * beltR;
      this.createTree(group, x, z, 1.2 + (a % 3) * 0.25);
    }
  }

  /**
   * Zone: Surat textile hub. The Tapi river + cable bridge are drawn centrally by
   * buildRiverSystems() from waterBodies.ts in the road-free wedge south of the junction.
   */
  private buildSuratTapiBridge(group: THREE.Group) {
    // Textile Market Billboard facing the junction
    this.createBoard(group, 'સુરત ટેક્સટાઇલ & ડાયમંડ સિટી — સુરતી લોચો સ્પેશિયલ', 0, 8, -34, 14, 2.0);
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
    if (!bypassSafetyCheck && WaterOccupancy.isBlocked(worldX, worldZ, 10.0)) {
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

    // 1. "Road to Heaven" - White salt flats stretching to horizon. y=0.028 sits above the
    //    terrain (-0.05) but BELOW every road layer (0.032+), so highways and the junction
    //    roundabout always render on top of the salt — no painting over asphalt.
    const saltBed = new THREE.Mesh(new THREE.PlaneGeometry(280, 180), this.saltMat);
    saltBed.rotation.x = -Math.PI / 2;
    saltBed.position.set(0, 0.028, 0);
    complex.add(saltBed);

    // Elevated Highway Causeway slicing through salt — pushed 100m north of the complex
    // centre so the slab never crosses the real junction roundabout.
    const causewayZ = -100;
    const roadCauseway = new THREE.Mesh(new THREE.BoxGeometry(12, 1.2, 180), this.roadMat);
    roadCauseway.position.set(0, 0.6, causewayZ);
    complex.add(roadCauseway);

    // White highway railings
    const railMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6 });
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 180), railMat);
    railL.position.set(-5.8, 1.4, causewayZ);
    const railR = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 180), railMat);
    railR.position.set(5.8, 1.4, causewayZ);
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
    tank.position.set(4, -1, 16);
    const tankWater = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), this.waterMat);
    tankWater.rotation.x = -Math.PI / 2;
    tankWater.position.set(4, 0.8, 16);
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

    // 2. Sursagar Lake & 120-foot Golden/Stone Shiva Statue — SOUTH of the palace
    //    (net +85 from the junction) so the reservoir never touches the roundabout.
    const lakeGroup = new THREE.Group();
    lakeGroup.position.set(0, 0, 110);

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
   * Zone: Dandi National Salt Satyagraha Memorial & Beach Coast. The whole complex sits
   * 60m back from the junction (only corridor exits NE), so the sea, beach and memorial
   * stay clear of the roundabout. Sea is drawn centrally from waterBodies.ts.
   */
  private buildDandiSaltMemorial(group: THREE.Group) {
    const complex = new THREE.Group();
    complex.position.set(0, 0, -60);

    // 1. Beach Sandy Promenade between the memorial lawns and the sea (sea drawn centrally)
    const sandyBeach = new THREE.Mesh(new THREE.PlaneGeometry(160, 40), this.sandMat);
    sandyBeach.rotation.x = -Math.PI / 2;
    sandyBeach.position.set(0, 0.03, 0);
    complex.add(sandyBeach);

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
   * Build roadside infrastructure. Every prop anchors to a real highway corridor via
   * roadsidePlacements.ts (road/water/prop-safe placement), so services hug the routes
   * they serve and never paint over asphalt, junctions or water.
   */
  private buildRoadsideScenery(locations: LocationData[]) {
    const roadsideGroup = new THREE.Group();

    // 1. Gujarati Petrol Pumps ("શ્રી ગણેશ પેટ્રોલિયમ")
    for (const p of PETROL_PUMPS) {
      this.buildPetrolStation(roadsideGroup, p.spot.x, p.spot.z, p.name);
    }

    // 2. Roadside Mechanic & Puncture Garages ("રણછોડ ઓટો ગેરેજ")
    for (const g of AUTO_GARAGES) {
      this.buildAutoGarage(roadsideGroup, g.spot.x, g.spot.z, g.name);
    }

    // 3. Highway FASTag Toll Plaza — ON the expressway carriageway, aligned to its yaw
    this.buildTollPlaza(roadsideGroup, TOLL_PLAZA.spot.x, TOLL_PLAZA.spot.z, TOLL_PLAZA.spot.angle);

    // 4. Scenic river systems + standalone bridges (data-driven, road-free)
    this.buildRiverSystems(getWaterBodySpecs());

    // 5. Agricultural Gujarat Farms (Windmills, Tubewells, Scarecrows, Tractors, Cotton Crops)
    for (const f of FARMS) {
      this.buildFarm(roadsideGroup, f.spot.x, f.spot.z, f.name, f.cropColor, f.hasWindmill, f.hasTractor);
    }

    // 6. GIDC Industrial Estates & Manufacturing Factories (Silos, Chimneys, Smoke)
    for (const f of FACTORIES) {
      this.buildFactory(roadsideGroup, f.spot.x, f.spot.z, f.name, f.shedColor);
    }

    // 7. Roadside Shops (Kirana, Paan Parlours, Handicrafts)
    for (const s of SHOPS) {
      this.buildShop(roadsideGroup, s.spot.x, s.spot.z, s.name, s.type);
    }

    // 8. Modern Commercial Shopping Malls
    for (const m of MALLS) {
      this.buildMall(roadsideGroup, m.spot.x, m.spot.z, m.name);
    }

    // 9. Modern Corporate & High-Rise Buildings
    for (const b of TOWERS) {
      this.buildTower(roadsideGroup, b.spot.x, b.spot.z, b.name, b.height);
    }

    // 10. Traditional Saurashtra Village Houses & Delis
    for (const h of HOUSES) {
      this.buildHouse(roadsideGroup, h.spot.x, h.spot.z, h.name);
    }

    // 11. Roadside Food & Tea Stall Encounters — placed exactly at the ROADSIDE_ENCOUNTERS
    //     positions (single source of truth shared with the trigger logic in GameWorld)
    for (const enc of ROADSIDE_ENCOUNTERS) {
      this.buildFoodStall(roadsideGroup, enc.worldPosition.x, enc.worldPosition.z, enc.nameGujarati, enc.type === 'tea_stall' ? 'tea' : 'ganthiya');
    }

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
   * Render every water body declared in waterBodies.ts (except externallyRendered ones
   * drawn by their zone builders): water plane, stone banks for elongated rivers, and an
   * optional standalone bridge across it. Every rectangle is verified road-free by the
   * zoneLayout tests, so no highway ever crosses open water without a real bridge —
   * because no highway crosses any of these water bodies at all.
   */
  private buildRiverSystems(specs: WaterBodySpec[]) {
    const waterGroup = new THREE.Group();
    const bankMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.9 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6 });

    for (const w of specs) {
      if (w.externallyRendered) continue;

      const water = new THREE.Mesh(new THREE.PlaneGeometry(w.sx, w.sz), this.waterMat);
      water.rotation.x = -Math.PI / 2;
      water.position.set(w.x, 0.08, w.z);
      waterGroup.add(water);

      const alongX = w.sx >= w.sz;
      const longLen = alongX ? w.sx : w.sz;
      const shortLen = alongX ? w.sz : w.sx;

      // Elongated water = river → stone banks give it a hard edge against land
      if (shortLen / longLen < 0.5) {
        const bankGeo = alongX
          ? new THREE.BoxGeometry(longLen + 4, 0.6, 3)
          : new THREE.BoxGeometry(3, 0.6, longLen + 4);
        const off = shortLen / 2 + 1.5;
        const bankA = new THREE.Mesh(bankGeo, bankMat);
        const bankB = new THREE.Mesh(bankGeo, bankMat);
        if (alongX) {
          bankA.position.set(w.x, 0.3, w.z - off);
          bankB.position.set(w.x, 0.3, w.z + off);
        } else {
          bankA.position.set(w.x - off, 0.3, w.z);
          bankB.position.set(w.x + off, 0.3, w.z);
        }
        waterGroup.add(bankA, bankB);
      }

      if (w.bridge) {
        const bridge = new THREE.Group();
        bridge.position.set(w.x, 0, w.z);
        const deckLen = shortLen + 18; // rests on both banks
        const deck = alongX
          ? new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, deckLen), this.stoneMat)
          : new THREE.Mesh(new THREE.BoxGeometry(deckLen, 0.7, 8), this.stoneMat);
        deck.position.y = 2.6;
        bridge.add(deck);

        // Guard rails along the deck (deck spans Z for E-W rivers, X for N-S rivers)
        const railGeo = alongX
          ? new THREE.BoxGeometry(0.3, 0.8, deckLen)
          : new THREE.BoxGeometry(deckLen, 0.8, 0.3);
        const railA = new THREE.Mesh(railGeo, railMat);
        const railB = new THREE.Mesh(railGeo, railMat);
        if (alongX) {
          railA.position.set(-3.9, 3.3, 0);
          railB.position.set(3.9, 3.3, 0);
        } else {
          railA.position.set(0, 3.3, -3.9);
          railB.position.set(0, 3.3, 3.9);
        }
        bridge.add(railA, railB);

        // Piers down into the water
        const pierMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 });
        for (const p of [-shortLen / 4, shortLen / 4]) {
          const pier = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 3.4, 10), pierMat);
          if (alongX) pier.position.set(0, 1.2, p);
          else pier.position.set(p, 1.2, 0);
          bridge.add(pier);
        }

        if (w.bridge === 'pedestrian') {
          // Atal-Bridge-style white arches rising along the deck
          const archMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.3 });
          for (const s of [-1, 1]) {
            const arch = new THREE.Mesh(new THREE.TorusGeometry(deckLen / 2.6, 0.45, 8, 24, Math.PI), archMat);
            if (alongX) {
              arch.rotation.y = Math.PI / 2;
              arch.position.set(0, 0.6, s * 3.2);
            } else {
              arch.position.set(s * 3.2, 0.6, 0);
            }
            bridge.add(arch);
          }
        } else if (w.bridge === 'cable') {
          // Cable-stayed pylon + radiating stays
          const pylonMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.5 });
          const cableMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
          const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 34, 8), pylonMat);
          pylon.position.y = 17;
          bridge.add(pylon);
          const crest = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 2.4), this.goldMat);
          crest.position.y = 34;
          bridge.add(crest);
          for (let c = -4; c <= 4; c++) {
            if (c === 0) continue;
            const cableZ = c * (deckLen / 10);
            const cableLen = Math.hypot(28, Math.abs(cableZ));
            const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, cableLen), cableMat);
            if (alongX) {
              cable.position.set(cableZ / 2, 16, 0);
              cable.rotation.z = Math.atan2(cableZ, 28);
            } else {
              cable.position.set(0, 16, cableZ / 2);
              cable.rotation.x = Math.atan2(cableZ, 28);
            }
            bridge.add(cable);
          }
        } else {
          // causeway: low concrete slab deck already reads from the rails + piers
        }

        waterGroup.add(bridge);
      }
    }

    this.scene.add(waterGroup);
  }

  /**
   * Build an Agricultural Farm along a rural highway (Windmill, Tubewell, Scarecrow, Tractor, Cotton Crops)
   */
  private buildFarm(parent: THREE.Group, x: number, z: number, name: string, cropColor: number, hasWindmill: boolean, hasTractor: boolean) {
    const fGroup = new THREE.Group();
    fGroup.position.set(x, 0, z);

    // 1. Crop Field Base
    this.createCropField(fGroup, 0, 0, 48, 36, cropColor);

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
    if (hasWindmill) {
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
    {
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
    if (hasTractor) {
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
    this.createBoard(fGroup, name, 0, 3.2, 18.2, 14, 1.4);

    parent.add(fGroup);
  }

  /**
   * Build an Industrial GIDC Factory (Silos, Chimney with Animated Smoke, Loading Bays)
   */
  private buildFactory(parent: THREE.Group, x: number, z: number, name: string, shedColor: number) {
    {
      const factGroup = new THREE.Group();
      factGroup.position.set(x, 0, z);

      // 1. Large Industrial Corrugated Manufacturing Shed (36m x 20m x 10m)
      const shedMat = new THREE.MeshStandardMaterial({ color: shedColor, roughness: 0.6, metalness: 0.4 });
      const mainShed = new THREE.Mesh(new THREE.BoxGeometry(36, 9, 20), shedMat);
      mainShed.position.set(0, 4.5, 0);
      mainShed.castShadow = true;

      // Pitched Industrial Roof with translucent skylights
      const roof = new THREE.Mesh(new THREE.ConeGeometry(22, 4, 4), this.factoryRoofMat);
      roof.position.set(0, 11, 0);
      roof.rotation.y = Math.PI / 4;

      factGroup.add(mainShed, roof);

      // 2. Tall Industrial Chimney (Height 26m) with Rising Smoke Particle System
      {
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
      this.createBoard(factGroup, name, 0, 8.5, 10.1, 18, 1.6);

      parent.add(factGroup);
    }
  }

  /**
   * Build a Roadside Village & Highway Commercial Shop (Kirana, Paan Parlour, Handicrafts)
   */
  private buildShop(parent: THREE.Group, x: number, z: number, name: string, type: 'kirana' | 'paan' | 'handicraft' | 'dairy') {
    {
      const sGroup = new THREE.Group();
      sGroup.position.set(x, 0, z);

      // 1. Shop Building
      const shopBuilding = new THREE.Mesh(new THREE.BoxGeometry(8, 4.2, 6), this.sandstoneMat);
      shopBuilding.position.set(0, 2.1, 0);
      shopBuilding.castShadow = true;

      // 2. Striped Shop Awning Canopy
      const awningMat = new THREE.MeshStandardMaterial({
        color: type === 'paan' ? 0xdc2626 : type === 'handicraft' ? 0x9333ea : 0x0284c7,
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
      if (type === 'paan') {
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.0), this.glassMat);
        fridge.position.set(-2.5, 1.2, 2.0);
        sGroup.add(fridge);
      }

      // Shop Signboard
      this.createBoard(sGroup, name, 0, 4.6, 3.1, 8.5, 1.2);

      parent.add(sGroup);
    }
  }

  /**
   * Build a Modern Gujarat Commercial Shopping Mall
   */
  private buildMall(parent: THREE.Group, x: number, z: number, name: string) {
    {
      const mallGroup = new THREE.Group();
      mallGroup.position.set(x, 0, z);

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
      this.createBoard(mallGroup, name, 0, 16.5, 13.2, 26, 2.4);

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
   * Build a High-Rise Corporate & Commercial Glass Tower
   */
  private buildTower(parent: THREE.Group, x: number, z: number, name: string, height: number) {
    {
      const bGroup = new THREE.Group();
      bGroup.position.set(x, 0, z);

      // 1. Concrete Core & Glass Tower
      const towerCore = new THREE.Mesh(new THREE.BoxGeometry(22, height, 22), this.stoneMat);
      towerCore.position.set(0, height / 2, 0);

      // Architectural Glass Curtain Facade
      const glass1 = new THREE.Mesh(new THREE.PlaneGeometry(20, height - 4), this.glassMat);
      glass1.position.set(0, height / 2, 11.1);

      const glass2 = new THREE.Mesh(new THREE.PlaneGeometry(20, height - 4), this.glassMat);
      glass2.position.set(0, height / 2, -11.1);
      glass2.rotation.y = Math.PI;

      // Rooftop Communication Mast / Antenna
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 10), this.steelMat);
      mast.position.set(0, height + 5, 0);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), this.brightRedMat);
      beacon.position.set(0, height + 10, 0);

      bGroup.add(towerCore, glass1, glass2, mast, beacon);

      // Ground Floor Entrance Canopy & Signboard
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 5), this.steelMat);
      canopy.position.set(0, 4.5, 13.5);
      bGroup.add(canopy);

      this.createBoard(bGroup, name, 0, 5.8, 14.5, 16, 1.4);

      parent.add(bGroup);
    }
  }

  /**
   * Build a Traditional Saurashtra Village House (Mangalore tiles, Osari, Charpai, Tulsi Kyara)
   */
  private buildHouse(parent: THREE.Group, x: number, z: number, name: string) {
    {
      const hGroup = new THREE.Group();
      hGroup.position.set(x, 0, z);

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
      this.createBoard(hGroup, name, 0, 4.8, 5.5, 10, 1.2);

      parent.add(hGroup);
    }
  }

  /**
   * Build a 3D Visual Model for a Roadside Food / Tea Stall (matches ROADSIDE_ENCOUNTERS)
   */
  private buildFoodStall(parent: THREE.Group, x: number, z: number, name: string, type: 'tea' | 'ganthiya') {
    {
      const stallGroup = new THREE.Group();
      stallGroup.position.set(x, 0, z);

      if (type === 'tea') {
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
      this.createBoard(stallGroup, name, 0, 4.2, 2.2, 7.5, 1.3);

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

  private buildTollPlaza(parent: THREE.Group, x: number, z: number, rotY = 0) {
    const toll = new THREE.Group();
    toll.position.set(x, 0, z);
    toll.rotation.y = rotY; // align the arch across the carriageway yaw

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

    // FASTag-lane boom barrier. Hinged from a Group whose origin is the pivot; the pole
    // extends toward the lane centre (−x) so rotation.z = −Math.PI/2 swings it straight up.
    // Starts horizontal (rotation.z = 0) — GameWorld.payToll() drives the raise tween.
    const boomPivot = new THREE.Group();
    boomPivot.position.set(5.5, 1.4, 2.3);
    const boomPole = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.16, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 }),
    );
    boomPole.position.set(-2, 0, 0); // one end at the pivot, the other reaching across the lane
    boomPivot.add(boomPole);
    const boomTip = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 }),
    );
    boomTip.position.set(-3.5, 0, 0);
    boomPivot.add(boomTip);
    toll.add(boomPivot);
    this.tollBoomGates.push(boomPivot);

    parent.add(toll);
  }
}

