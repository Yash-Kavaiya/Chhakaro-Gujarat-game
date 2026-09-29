import * as THREE from 'three';
import { BUS_STANDS, BUS_STOPS, RoadsideProp } from '../data/roadsidePlacements';

/**
 * GSRTC ("ST") bus infrastructure: city bus stations with a saw-tooth platform shed and
 * parked red-and-silver ST buses, plus small village bus-stop shelters along the highways.
 * Positions come from roadsidePlacements.ts (road/rail/water/sea-safe, test-verified).
 */

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const concrete = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.85 });
const shedRoof = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
const pillar = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
const busRed = new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.5, metalness: 0.2 });
const busSilver = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4, metalness: 0.5 });
const glass = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.15, metalness: 0.6 });
const tyre = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const bench = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.7 });
const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12);

function box(mat: THREE.Material, sx: number, sy: number, sz: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(boxGeo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function textBoard(text: string, sub: string, bg: string, width: number, height: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 70px "Hind Vadodara", sans-serif';
  ctx.fillText(text, 512, sub ? 100 : 128);
  if (sub) {
    ctx.font = 'bold 40px "Hind Vadodara", sans-serif';
    ctx.fillText(sub, 512, 190);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
}

/** A parked GSRTC bus, nose toward +Z. */
function parkedBus(): THREE.Group {
  const bus = new THREE.Group();
  bus.add(box(busRed, 2.5, 1.5, 9.6, 0, 1.35, 0));
  bus.add(box(busSilver, 2.5, 1.3, 9.6, 0, 2.75, 0));
  bus.add(box(glass, 2.52, 0.8, 8.4, 0, 2.7, -0.3));
  bus.add(box(glass, 2.2, 1.0, 0.08, 0, 2.6, 4.82));
  bus.add(box(busSilver, 2.3, 0.2, 9.2, 0, 3.5, 0));
  for (const [x, z] of [[-1.2, 3.2], [1.2, 3.2], [-1.2, -3.2], [1.2, -3.2]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.55, z);
    bus.add(w);
  }
  return bus;
}

function buildBusStand(parent: THREE.Group, p: RoadsideProp) {
  const g = new THREE.Group();
  g.position.set(p.spot.x, 0, p.spot.z);
  g.rotation.y = p.spot.angle;

  // Apron + raised passenger platform.
  const apron = box(concrete, 30, 0.12, 20, 0, 0.06, 0);
  apron.castShadow = false;
  apron.receiveShadow = true;
  g.add(apron);
  g.add(box(pillar, 26, 0.5, 3, 0, 0.25, -7.5));

  // Saw-tooth platform shed in GSRTC red.
  for (let x = -12; x <= 12; x += 6) g.add(box(pillar, 0.35, 4.2, 0.35, x, 2.35, -7.5));
  for (let x = -10.5; x <= 10.5; x += 7) {
    const roof = box(shedRoof, 7, 0.3, 5.6, x, 4.6, -7.2);
    roof.rotation.x = -0.18;
    g.add(roof);
  }
  // Benches under the shed.
  for (let x = -9; x <= 9; x += 6) g.add(box(bench, 3, 0.4, 0.7, x, 0.9, -8.2));

  // Three buses parked nose-in at the bays.
  for (const x of [-8, 0, 8]) {
    const bus = parkedBus();
    bus.position.set(x, 0, 0.5);
    bus.rotation.y = Math.PI;
    g.add(bus);
  }

  // Station name board over the shed.
  const board = textBoard(`🚌 ${p.name}`, 'GSRTC — ગુજરાત એસ.ટી. | સલામત સવારી', '#b91c1c', 18, 4.5);
  board.position.set(0, 7.6, -7.5);
  g.add(board);
  g.add(box(pillar, 0.3, 5.5, 0.3, -8.5, 2.75, -7.9));
  g.add(box(pillar, 0.3, 5.5, 0.3, 8.5, 2.75, -7.9));

  parent.add(g);
}

function buildBusStop(parent: THREE.Group, p: RoadsideProp) {
  const g = new THREE.Group();
  g.position.set(p.spot.x, 0, p.spot.z);
  g.rotation.y = p.spot.angle;
  g.add(box(concrete, 5, 0.25, 2.6, 0, 0.12, 0));
  g.add(box(concrete, 5, 2.4, 0.2, 0, 1.45, -1.2));
  g.add(box(pillar, 0.2, 2.6, 0.2, -2.3, 1.3, 1));
  g.add(box(pillar, 0.2, 2.6, 0.2, 2.3, 1.3, 1));
  const roof = box(shedRoof, 5.6, 0.2, 3, 0, 2.75, 0);
  roof.rotation.x = 0.08;
  g.add(roof);
  g.add(box(bench, 3.6, 0.35, 0.6, 0, 0.7, -0.6));
  const board = textBoard(`એસ.ટી. સ્ટેન્ડ — ${p.name}`, '', '#b91c1c', 4.8, 1.2);
  board.position.set(0, 3.5, 0);
  g.add(board);
  parent.add(g);
}

export function buildBusTransit(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  group.name = 'BusTransit';
  for (const s of BUS_STANDS) buildBusStand(group, s);
  for (const s of BUS_STOPS) buildBusStop(group, s);
  scene.add(group);
  return group;
}
