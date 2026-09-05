import * as THREE from 'three';
import {
  IncidentKind,
  IncidentSchedulerState,
  IncidentSpawn,
  initIncidentSchedule,
  stepIncidentSchedule,
} from '../state/incidents';

/**
 * THREE side of the procedural road-incident system. The pure scheduler
 * (`src/state/incidents.ts`) decides WHEN something appears ahead; this class owns
 * one reusable low-poly obstacle group per kind, parks the right one ~40 units in
 * front of the player when the scheduler fires, animates it, and hides it again when
 * the scheduler retires it. `playerMustSlow` lets GameWorld cap the player's speed
 * while they are nosing through the hazard.
 */
const SPAWN_AHEAD = 40; // units in front of the player along its heading
const SLOW_RADIUS = 14; // within this many units of the obstacle the player must crawl
const ROLL_INTERVAL_S = 1.0; // consult the pure scheduler ~1 Hz, not every frame

export class IncidentDirector {
  private scene: THREE.Scene;
  private state: IncidentSchedulerState = initIncidentSchedule();

  private groups: Record<IncidentKind, THREE.Group>;
  private activeKind: IncidentKind | null = null;
  private animT = 0;
  // Seconds accumulated since the scheduler was last consulted (throttled to ~1 Hz so the
  // "first eligible frame always spawns" behaviour is gone and the cadence spreads out).
  private rollAccumulator = 0;

  // Latest player position, stashed each frame so the `playerMustSlow` getter can
  // measure distance without arguments.
  private readonly playerPos = new THREE.Vector3();

  // Per-kind animation handles.
  private cows: THREE.Group[] = [];
  private truckHazardMat: THREE.MeshStandardMaterial | null = null;
  private puddleMat: THREE.MeshStandardMaterial | null = null;

  // Everything created here, tracked flat for disposal.
  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.groups = {
      cattle_crossing: this.buildCattle(),
      stalled_truck: this.buildStalledTruck(),
      slow_tractor: this.buildSlowTractor(),
      rain_puddle: this.buildRainPuddle(),
    };
    for (const kind of Object.keys(this.groups) as IncidentKind[]) {
      const g = this.groups[kind];
      g.visible = false;
      this.scene.add(g);
    }
  }

  /** Called each frame from GameWorld.animate. Returns the IncidentSpawn on the
   *  frame an incident appears (so the caller can fire a notify), else null.
   *  The scheduler is consulted ~1 Hz; `animateActive` and `playerMustSlow` stay per-frame. */
  update(
    delta: number,
    playerPos: THREE.Vector3,
    headingRad: number,
    distanceDriven: number,
    speedKmh: number,
    zoneId: string,
    weather: string
  ): IncidentSpawn | null {
    this.playerPos.copy(playerPos);

    let spawnedThisFrame: IncidentSpawn | null = null;

    this.rollAccumulator += delta;
    if (this.rollAccumulator >= ROLL_INTERVAL_S) {
      this.rollAccumulator = 0;

      const { state, spawn, despawn } = stepIncidentSchedule({
        state: this.state,
        distanceDriven,
        speedKmh,
        zoneId,
        weather,
        roll: Math.random(),
      });
      this.state = state;

      if (despawn && this.activeKind) {
        this.groups[this.activeKind].visible = false;
        this.activeKind = null;
      }

      if (spawn) {
        const g = this.groups[spawn.kind];
        g.position.set(
          playerPos.x - Math.sin(headingRad) * SPAWN_AHEAD,
          0,
          playerPos.z - Math.cos(headingRad) * SPAWN_AHEAD
        );
        g.rotation.y = headingRad;
        g.visible = true;
        this.activeKind = spawn.kind;
        this.animT = 0;
        // Reset the cattle line so they start on one side each time.
        this.cows.forEach((cow, i) => {
          cow.position.x = -5 + i * 0.6;
        });
        spawnedThisFrame = spawn;
      }
    }

    if (this.activeKind) {
      this.animT += delta;
      this.animateActive(delta);
    }

    return spawnedThisFrame;
  }

  /** True while the player is within the active obstacle's slow-zone. */
  get playerMustSlow(): boolean {
    if (!this.activeKind) return false;
    return this.playerPos.distanceTo(this.groups[this.activeKind].position) < SLOW_RADIUS;
  }

  destroy(): void {
    for (const kind of Object.keys(this.groups) as IncidentKind[]) {
      this.scene.remove(this.groups[kind]);
    }
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.geometries.length = 0;
    this.materials.length = 0;
    this.cows = [];
    this.truckHazardMat = null;
    this.puddleMat = null;
    this.activeKind = null;
  }

  // ---- animation --------------------------------------------------------------

  private animateActive(delta: number): void {
    switch (this.activeKind) {
      case 'cattle_crossing': {
        // Cows shuffle slowly across the carriageway, wrapping back around.
        this.cows.forEach((cow, i) => {
          cow.position.x = -5 + ((this.animT * 1.1 + i * 1.7) % 10);
          cow.position.y = Math.abs(Math.sin(this.animT * 4 + i)) * 0.06;
        });
        break;
      }
      case 'stalled_truck': {
        // Hazard lights blink ~1.5 Hz.
        if (this.truckHazardMat) {
          const on = Math.sin(this.animT * Math.PI * 3) > 0;
          this.truckHazardMat.emissiveIntensity = on ? 2.2 : 0.15;
        }
        break;
      }
      case 'slow_tractor': {
        // Tractor creeps forward along ITS OWN facing (rotation.y, fixed at spawn) at a
        // walking pace — not the player's live heading, which would make it veer as the
        // player turns.
        const crawl = 2.2 * delta;
        const g = this.groups.slow_tractor;
        g.position.x -= Math.sin(g.rotation.y) * crawl;
        g.position.z -= Math.cos(g.rotation.y) * crawl;
        break;
      }
      case 'rain_puddle': {
        if (this.puddleMat) {
          this.puddleMat.opacity = 0.45 + Math.sin(this.animT * 2) * 0.08;
        }
        break;
      }
      default:
        break;
    }
  }

  // ---- mesh builders (low-poly, one reusable group per kind) ------------------

  private track<T extends THREE.BufferGeometry>(g: T): T {
    this.geometries.push(g);
    return g;
  }

  private trackMat<T extends THREE.Material>(m: T): T {
    this.materials.push(m);
    return m;
  }

  private buildCattle(): THREE.Group {
    const group = new THREE.Group();
    const hide = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xe7e2d6, roughness: 0.9 }));
    const bodyGeo = this.track(new THREE.BoxGeometry(0.8, 0.8, 1.5));
    const headGeo = this.track(new THREE.BoxGeometry(0.4, 0.4, 0.5));
    const legGeo = this.track(new THREE.BoxGeometry(0.14, 0.7, 0.14));

    for (let c = 0; c < 3; c++) {
      const cow = new THREE.Group();
      cow.position.set(-5 + c * 0.6, 0, (c - 1) * 1.4);

      const body = new THREE.Mesh(bodyGeo, hide);
      body.position.y = 1.0;
      body.castShadow = true;
      cow.add(body);

      const head = new THREE.Mesh(headGeo, hide);
      head.position.set(0, 1.15, -1.0);
      cow.add(head);

      [
        [-0.28, -0.55],
        [0.28, -0.55],
        [-0.28, 0.55],
        [0.28, 0.55],
      ].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeo, hide);
        leg.position.set(x, 0.35, z);
        cow.add(leg);
      });

      group.add(cow);
      this.cows.push(cow);
    }
    return group;
  }

  private buildStalledTruck(): THREE.Group {
    const group = new THREE.Group();
    const bodyMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x2f6f9f, roughness: 0.5 }));
    const cabMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0xd9d2c2, roughness: 0.6 }));
    const tyreMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.9 }));
    this.truckHazardMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0xff8a00,
        emissive: 0xff6a00,
        emissiveIntensity: 1,
      })
    );

    const cargo = new THREE.Mesh(this.track(new THREE.BoxGeometry(2.4, 2.0, 5.0)), bodyMat);
    cargo.position.set(0, 1.6, 0.8);
    cargo.castShadow = true;
    group.add(cargo);

    const cab = new THREE.Mesh(this.track(new THREE.BoxGeometry(2.3, 1.6, 2.0)), cabMat);
    cab.position.set(0, 1.4, -2.7);
    cab.castShadow = true;
    group.add(cab);

    const hazardGeo = this.track(new THREE.BoxGeometry(0.3, 0.3, 0.15));
    [-0.9, 0.9].forEach((x) => {
      const lamp = new THREE.Mesh(hazardGeo, this.truckHazardMat!);
      lamp.position.set(x, 0.9, 3.4);
      group.add(lamp);
    });

    const wheelGeo = this.track(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10));
    [
      [-1.1, -2.4],
      [1.1, -2.4],
      [-1.1, 1.2],
      [1.1, 1.2],
    ].forEach(([x, z]) => {
      const w = new THREE.Mesh(wheelGeo, tyreMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.55, z);
      group.add(w);
    });

    return group;
  }

  private buildSlowTractor(): THREE.Group {
    const group = new THREE.Group();
    const green = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.6 }));
    const tyreMat = this.trackMat(new THREE.MeshStandardMaterial({ color: 0x14161c, roughness: 0.9 }));

    const bonnet = new THREE.Mesh(this.track(new THREE.BoxGeometry(1.2, 0.85, 1.9)), green);
    bonnet.position.set(0, 1.0, -0.6);
    bonnet.castShadow = true;
    group.add(bonnet);

    const seat = new THREE.Mesh(this.track(new THREE.BoxGeometry(0.7, 0.5, 0.7)), green);
    seat.position.set(0, 1.3, 0.7);
    group.add(seat);

    const stack = new THREE.Mesh(this.track(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6)), tyreMat);
    stack.position.set(0.45, 1.85, -1.2);
    group.add(stack);

    const rearGeo = this.track(new THREE.CylinderGeometry(0.75, 0.75, 0.4, 12));
    [-0.8, 0.8].forEach((x) => {
      const w = new THREE.Mesh(rearGeo, tyreMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.75, 0.5);
      group.add(w);
    });

    const frontGeo = this.track(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 10));
    [-0.62, 0.62].forEach((x) => {
      const w = new THREE.Mesh(frontGeo, tyreMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.36, -1.3);
      group.add(w);
    });

    return group;
  }

  private buildRainPuddle(): THREE.Group {
    const group = new THREE.Group();
    this.puddleMat = this.trackMat(
      new THREE.MeshStandardMaterial({
        color: 0x0a0d16,
        roughness: 0.05,
        metalness: 0.6,
        transparent: true,
        opacity: 0.45,
      })
    );
    const disc = new THREE.Mesh(this.track(new THREE.CircleGeometry(6, 24)), this.puddleMat);
    disc.rotation.x = -Math.PI / 2;
    // World terrain plane is at y = -0.05; keep every horizontal plane >= ~0.05 to avoid z-fighting.
    disc.position.y = 0.06;
    group.add(disc);
    return group;
  }
}
