import * as THREE from 'three';
import { getResolvedRailSegments, RailLine, ResolvedRailSegment, RAIL_BED_WIDTH } from '../data/railwayNetwork';

/**
 * Indian Railways across Gujarat: ballast beds, twin steel rails, instanced concrete
 * sleepers, a platform + yellow station board at both ends of every line, and one
 * passenger train per line shuttling between its terminals (with a halt at each).
 *
 * Every track comes from railwayNetwork.ts (the same data the placement/tree clearance
 * checks and the 2D maps use), so nothing is ever built on top of a rail.
 */

const GAUGE = 1.7; // broad gauge, scaled to the game's vehicles
const SLEEPER_SPACING = 1.6;
const CAR_LENGTH = 11;
const CAR_GAP = 0.8;
const CARS_PER_TRAIN = 6;
const TRAIN_SPEED = 22; // world units / s ≈ 80 km/h
const HALT_SECONDS = 6;

interface Train {
  segment: ResolvedRailSegment;
  cars: THREE.Group[];
  /** Distance of the locomotive nose from the segment start. */
  s: number;
  dir: 1 | -1;
  halt: number;
}

const ballastMat = new THREE.MeshStandardMaterial({ color: 0x6b6259, roughness: 1 });
const railMat = new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.85, roughness: 0.3 });
const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x8d8778, roughness: 0.9 });
const platformMat = new THREE.MeshStandardMaterial({ color: 0xd6c7a1, roughness: 0.85 });
const platformEdgeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 });
const roofMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 });
const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.4 });
const windowMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2, metalness: 0.5 });
const bogieMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });

const LIVERY: Record<RailLine['livery'], { coach: number; stripe: number; loco: number; locoStripe: number }> = {
  icf_blue: { coach: 0x1d4ed8, stripe: 0xf8fafc, loco: 0xb91c1c, locoStripe: 0xfef3c7 },
  lhb_red: { coach: 0xb91c1c, stripe: 0x9ca3af, loco: 0x1e3a8a, locoStripe: 0xf8fafc },
  vande_bharat: { coach: 0xf8fafc, stripe: 0xea580c, loco: 0xf8fafc, locoStripe: 0xea580c },
};

const boxGeo = new THREE.BoxGeometry(1, 1, 1);

function box(mat: THREE.Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(boxGeo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

function stationBoardTexture(gu: string, en: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 192;
  const ctx = c.getContext('2d')!;
  // Indian Railways station board: yellow with a black border and black lettering.
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 182);
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 64px "Hind Vadodara", sans-serif';
  ctx.fillText(gu, 256, 72);
  ctx.font = 'bold 36px "Hind Vadodara", sans-serif';
  ctx.fillText(en, 256, 146);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class RailwaySystem {
  private group = new THREE.Group();
  private trains: Train[] = [];

  constructor(private scene: THREE.Scene) {
    this.group.name = 'Railways';
  }

  build() {
    const segments = getResolvedRailSegments();
    let sleeperCount = 0;
    for (const seg of segments) sleeperCount += Math.floor(seg.distance / SLEEPER_SPACING);

    const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(GAUGE + 1.3, 0.18, 0.32), sleeperMat, sleeperCount);
    sleepers.receiveShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const one = new THREE.Vector3(1, 1, 1);
    const pos = new THREE.Vector3();
    let i = 0;

    for (const seg of segments) {
      const { start, end, distance, angle } = seg;
      const cx = (start.x + end.x) / 2;
      const cz = (start.z + end.z) / 2;

      // Ballast bed + two continuous rails, all aligned to the track yaw.
      const bed = box(ballastMat, RAIL_BED_WIDTH, 0.35, distance, cx, 0.1, cz);
      bed.rotation.y = angle;
      bed.receiveShadow = true;
      this.group.add(bed);
      for (const side of [-1, 1]) {
        const rail = box(railMat, 0.14, 0.16, distance, 0, 0.44, 0);
        const lateral = (side * GAUGE) / 2;
        rail.position.set(cx + Math.cos(angle) * lateral, 0.44, cz - Math.sin(angle) * lateral);
        rail.rotation.y = angle;
        this.group.add(rail);
      }

      // Sleepers (one instanced draw call for the whole network).
      q.setFromAxisAngle(up, angle);
      const n = Math.floor(distance / SLEEPER_SPACING);
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        pos.set(start.x + (end.x - start.x) * t, 0.33, start.z + (end.z - start.z) * t);
        m.compose(pos, q, one);
        sleepers.setMatrixAt(i++, m);
      }

      this.buildStation(seg, 0, seg.line.fromStationGujarati, seg.line.fromStationEnglish);
      this.buildStation(seg, 1, seg.line.toStationGujarati, seg.line.toStationEnglish);
      this.trains.push(this.buildTrain(seg));
    }

    sleepers.count = i;
    sleepers.instanceMatrix.needsUpdate = true;
    this.group.add(sleepers);
    this.scene.add(this.group);
  }

  /** Platform alongside the track end, on the side facing away from the highway. */
  private buildStation(seg: ResolvedRailSegment, end: 0 | 1, gu: string, en: string) {
    const { start, end: e, angle, distance } = seg;
    const ux = (e.x - start.x) / distance;
    const uz = (e.z - start.z) / distance;
    const along = end === 0 ? 28 : distance - 28;
    // Right-hand normal of the track, pushed to the side opposite the highway.
    const nx = -uz * seg.side;
    const nz = ux * seg.side;
    const off = RAIL_BED_WIDTH / 2 + 3.2;
    const px = start.x + ux * along + nx * off;
    const pz = start.z + uz * along + nz * off;

    const st = new THREE.Group();
    st.position.set(px, 0, pz);
    st.rotation.y = angle;

    // Local frame after the yaw: +Z runs along the track and +X maps to (cos a, -sin a),
    // which is the corridor's LEFT normal. `ax` is the local X sign pointing away from the
    // rails, so the platform edge faces the track and the building sits behind it.
    const ax = seg.side === 1 ? -1 : 1;
    const platform = box(platformMat, 5, 1.0, 44, 0, 0.5, 0);
    platform.receiveShadow = true;
    const edge = box(platformEdgeMat, 0.4, 0.05, 44, -2.3 * ax, 1.02, 0);
    st.add(platform, edge);

    // Canopy on pillars.
    for (let z = -16; z <= 16; z += 8) st.add(box(pillarMat, 0.3, 3.4, 0.3, 0.8 * ax, 2.7, z));
    const roof = box(roofMat, 4.6, 0.25, 38, 0.4 * ax, 4.4, 0);
    roof.castShadow = true;
    st.add(roof);

    // Small station building behind the platform.
    const building = box(platformMat, 4, 4, 12, 4.6 * ax, 2, 6);
    building.castShadow = true;
    st.add(building);
    st.add(box(roofMat, 4.6, 0.4, 12.6, 4.6 * ax, 4.2, 6));

    // Yellow station name boards at both ends of the platform, facing the track.
    const boardMat = new THREE.MeshBasicMaterial({ map: stationBoardTexture(gu, en) });
    for (const z of [-18, 18]) {
      const board = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2), boardMat);
      board.position.set(0.2 * ax, 3.1, z);
      board.rotation.y = ax === 1 ? -Math.PI / 2 : Math.PI / 2;
      st.add(board);
      st.add(box(pillarMat, 0.15, 2.2, 0.15, 0.2 * ax, 1.1, z - 2.4));
      st.add(box(pillarMat, 0.15, 2.2, 0.15, 0.2 * ax, 1.1, z + 2.4));
    }
    this.group.add(st);
  }

  private buildTrain(seg: ResolvedRailSegment): Train {
    const lv = LIVERY[seg.line.livery];
    const coachMat = new THREE.MeshStandardMaterial({ color: lv.coach, roughness: 0.5, metalness: 0.2 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: lv.stripe, roughness: 0.5 });
    const locoMat = new THREE.MeshStandardMaterial({ color: lv.loco, roughness: 0.45, metalness: 0.25 });
    const locoStripeMat = new THREE.MeshStandardMaterial({ color: lv.locoStripe, roughness: 0.5 });
    const roofTone = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });

    const cars: THREE.Group[] = [];
    for (let c = 0; c < CARS_PER_TRAIN; c++) {
      const car = new THREE.Group();
      const isLoco = c === 0 || (seg.line.livery === 'vande_bharat' && c === CARS_PER_TRAIN - 1);
      const body = box(isLoco ? locoMat : coachMat, 2.9, 3.1, CAR_LENGTH, 0, 2.35, 0);
      body.castShadow = true;
      car.add(body);
      car.add(box(roofTone, 2.7, 0.35, CAR_LENGTH - 0.4, 0, 4.05, 0));
      car.add(box(isLoco ? locoStripeMat : stripeMat, 2.95, 0.35, CAR_LENGTH - 0.2, 0, 1.75, 0));
      if (!isLoco) {
        // Window band on both sides.
        car.add(box(windowMat, 2.96, 0.8, CAR_LENGTH - 2.2, 0, 2.95, 0));
      } else {
        // Driver cab windscreen at the nose (+Z) and a headlight.
        car.add(box(windowMat, 2.4, 0.9, 0.1, 0, 3.1, CAR_LENGTH / 2 + 0.02));
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.25, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfff3c4, emissiveIntensity: 1.2 }),
        );
        lamp.position.set(0, 3.9, CAR_LENGTH / 2 + 0.05);
        car.add(lamp);
        if (seg.line.livery === 'vande_bharat') {
          // Aerodynamic nose.
          const nose = box(locoMat, 2.7, 2.2, 2.2, 0, 1.9, CAR_LENGTH / 2 + 0.8);
          nose.rotation.x = 0.35;
          car.add(nose);
          // The trailing power car faces backwards.
          if (c === CARS_PER_TRAIN - 1) car.userData.flipped = true;
        }
      }
      car.add(box(bogieMat, 2.2, 0.7, 2.6, 0, 0.75, -CAR_LENGTH / 2 + 1.8));
      car.add(box(bogieMat, 2.2, 0.7, 2.6, 0, 0.75, CAR_LENGTH / 2 - 1.8));
      this.group.add(car);
      cars.push(car);
    }

    // Stagger the starting point per line so trains aren't all at their terminals, keeping
    // the whole rake on the track (nose leads by the rake length when heading +1).
    const phase = ((seg.line.id.length * 37) % 100) / 100;
    const dir: 1 | -1 = phase > 0.5 ? 1 : -1;
    const trainLen = CARS_PER_TRAIN * (CAR_LENGTH + CAR_GAP);
    const lo = dir === 1 ? trainLen + 12 : 12;
    const hi = dir === 1 ? seg.distance - 12 : seg.distance - 12 - trainLen;
    const s = Math.min(hi, Math.max(lo, seg.distance * (0.2 + phase * 0.6)));
    const train: Train = { segment: seg, cars, s, dir, halt: 0 };
    this.placeTrain(train);
    return train;
  }

  private placeTrain(train: Train) {
    const { segment: seg, cars, s, dir } = train;
    const ux = (seg.end.x - seg.start.x) / seg.distance;
    const uz = (seg.end.z - seg.start.z) / seg.distance;
    const yaw = dir === 1 ? seg.angle : seg.angle + Math.PI;
    for (let c = 0; c < cars.length; c++) {
      // Car c trails the nose by c car-lengths, against the direction of travel.
      const d = s - dir * (c * (CAR_LENGTH + CAR_GAP) + CAR_LENGTH / 2);
      const car = cars[c];
      car.position.set(seg.start.x + ux * d, 0.35, seg.start.z + uz * d);
      car.rotation.y = car.userData.flipped ? yaw + Math.PI : yaw;
    }
  }

  update(delta: number, playerPos: THREE.Vector3) {
    const trainLen = CARS_PER_TRAIN * (CAR_LENGTH + CAR_GAP);
    for (const train of this.trains) {
      const seg = train.segment;
      // Trains far from the player keep running but skip the per-car transform work.
      const mid = { x: (seg.start.x + seg.end.x) / 2, z: (seg.start.z + seg.end.z) / 2 };
      const far = Math.hypot(playerPos.x - mid.x, playerPos.z - mid.z) > seg.distance / 2 + 900;

      if (train.halt > 0) {
        train.halt -= delta;
      } else {
        train.s += train.dir * TRAIN_SPEED * delta;
        const minS = trainLen + 12;
        const maxS = seg.distance - 12;
        if (train.dir === 1 && train.s >= maxS) {
          // Arrived: turn around with the nose at the other end of the rake.
          train.s = maxS - trainLen;
          train.dir = -1;
          train.halt = HALT_SECONDS;
        } else if (train.dir === -1 && train.s <= minS - trainLen) {
          train.s = minS;
          train.dir = 1;
          train.halt = HALT_SECONDS;
        }
      }
      for (const car of train.cars) car.visible = !far;
      if (!far) this.placeTrain(train);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
