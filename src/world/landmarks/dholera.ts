import * as THREE from 'three';

/**
 * Dholera Smart City (SIR) + Dholera International Airport.
 *
 * Local space around the junction. The Ahmedabad expressway leaves to the NNE and the
 * Bhavnagar road to the SSW, so the smart-city blocks, the ABCD building and the solar park
 * fill the eastern wedge (toward the Gulf of Khambhat) and the airport — runway, terminal,
 * ATC tower and a parked jet — fills the western wedge.
 */

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const GLASS = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.8 });
const GLASS_DARK = new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.15, metalness: 0.7 });
const CONCRETE = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
const ASPHALT = new THREE.MeshStandardMaterial({ color: 0x27303f, roughness: 0.9 });
const MARKING = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
const SOLAR = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.2, metalness: 0.6 });
const STEEL = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.8 });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
const SAFFRON = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.5 });
const LAWN = new THREE.MeshStandardMaterial({ color: 0x3f8f2f, roughness: 0.9 });

function box(mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(boxGeo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function flat(mat: THREE.Material, sx: number, sz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

function board(text: string, sub: string, w: number, h: number): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(0, 216, 1024, 40);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 72px "Hind Vadodara", sans-serif';
  ctx.fillText(text, 512, 90);
  ctx.font = 'bold 40px "Hind Vadodara", sans-serif';
  ctx.fillText(sub, 512, 165);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
}

function jet(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 15, 12), WHITE);
  body.rotation.x = Math.PI / 2;
  body.position.y = 2.8;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.2, 12), WHITE);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 2.8, 9.1);
  const wings = box(STEEL, 16, 0.3, 3.6, 0, 2.6, 0.5);
  const tail = box(SAFFRON, 0.3, 3.6, 3, 0, 5, -6.4);
  const stab = box(STEEL, 6, 0.25, 1.8, 0, 3.2, -6.4);
  g.add(body, nose, wings, tail, stab);
  return g;
}

export interface DholeraBuild {
  group: THREE.Group;
  /** Wind-turbine rotors — spun by EnvironmentBuilder.update like the farm windmills. */
  rotors: THREE.Group[];
}

export function build(): DholeraBuild {
  const g = new THREE.Group();
  const rotors: THREE.Group[] = [];

  // ---------- East wedge: smart city ----------
  // Wide grid avenues (smart-city "activation area").
  for (const z of [-20, 20, 60]) g.add(flat(ASPHALT, 110, 9, 100, 0.03, z));
  for (const x of [55, 100, 145]) g.add(flat(ASPHALT, 9, 100, x, 0.031, 20));

  // Glass towers on the blocks between avenues.
  const towers: [number, number, number, THREE.Material][] = [
    [77, 0, 34, GLASS],
    [122, 0, 22, GLASS_DARK],
    [77, 40, 18, GLASS_DARK],
    [122, 40, 28, GLASS],
    [165, 0, 14, GLASS],
  ];
  for (const [x, z, h, mat] of towers) {
    g.add(box(mat, 16, h, 16, x, h / 2, z));
    g.add(box(CONCRETE, 17, 0.8, 17, x, h + 0.4, z));
  }

  // ABCD building (Administrative & Business Centre for Dholera): a low, wide landmark.
  g.add(box(CONCRETE, 30, 8, 14, 100, 4, 82));
  g.add(box(GLASS, 28, 5, 14.4, 100, 4.5, 82));
  g.add(box(SAFFRON, 31, 0.8, 15, 100, 8.4, 82));
  const abcd = board('ABCD બિલ્ડિંગ — ધોલેરા SIR', 'ભારતનું પ્રથમ ગ્રીનફિલ્ડ સ્માર્ટ સિટી', 20, 5);
  abcd.position.set(100, 12, 74);
  g.add(abcd);
  g.add(flat(LAWN, 34, 10, 100, 0.035, 96));

  // Solar park: rows of tilted panels (one instanced draw call).
  const rows = 8;
  const cols = 10;
  const panels = new THREE.InstancedMesh(new THREE.BoxGeometry(5, 0.15, 2.6), SOLAR, rows * cols);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.45, 0, 0));
  const s = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      m.compose(new THREE.Vector3(62 + c * 6, 1.4, 110 + r * 5), q, s);
      panels.setMatrixAt(i++, m);
    }
  }
  panels.instanceMatrix.needsUpdate = true;
  panels.castShadow = true;
  g.add(panels);

  // Wind turbines on the open Bhal plain north of the city (clear of the gulf shore).
  for (const [x, z] of [[140, -48], [168, -40], [196, -30]]) {
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 30, 10), WHITE);
    mast.position.set(x, 15, z);
    mast.castShadow = true;
    g.add(mast);
    const rotor = new THREE.Group();
    rotor.position.set(x, 30, z + 1);
    for (let b = 0; b < 3; b++) {
      const blade = box(WHITE, 0.8, 12, 0.3, 0, 6, 0);
      const arm = new THREE.Group();
      arm.rotation.z = (b / 3) * Math.PI * 2;
      arm.add(blade);
      rotor.add(arm);
    }
    rotor.add(new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), WHITE));
    g.add(rotor);
    rotors.push(rotor);
  }

  // ---------- West wedge: Dholera International Airport ----------
  const airport = new THREE.Group();
  airport.position.set(-120, 0, 0);
  // Runway (N-S) with centreline and threshold markings.
  airport.add(flat(ASPHALT, 26, 190, -20, 0.03, 0));
  for (let z = -80; z <= 80; z += 16) airport.add(flat(MARKING, 1.2, 9, -20, 0.036, z));
  for (let x = -9; x <= 9; x += 2.4) {
    airport.add(flat(MARKING, 1.0, 8, -20 + x, 0.036, -88));
    airport.add(flat(MARKING, 1.0, 8, -20 + x, 0.036, 88));
  }
  // Taxiway + apron.
  airport.add(flat(ASPHALT, 10, 40, 4, 0.03, 0));
  airport.add(flat(ASPHALT, 46, 60, 30, 0.029, 0));

  // Terminal: glass hall with a saffron wave roof.
  airport.add(box(CONCRETE, 14, 9, 52, 58, 4.5, 0));
  airport.add(box(GLASS, 14.4, 6, 50, 58, 4.4, 0));
  const roof = box(SAFFRON, 18, 1, 58, 58, 9.6, 0);
  roof.rotation.z = 0.06;
  airport.add(roof);
  const sign = board('ધોલેરા આંતરરાષ્ટ્રીય એરપોર્ટ', 'DHOLERA INTERNATIONAL AIRPORT ✈️', 24, 6);
  sign.position.set(66, 13, 0);
  sign.rotation.y = Math.PI / 2;
  airport.add(sign);

  // ATC tower.
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 26, 12), CONCRETE);
  shaft.position.set(45, 13, -48);
  shaft.castShadow = true;
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 3, 4, 12), GLASS);
  cab.position.set(45, 28, -48);
  airport.add(shaft, cab, box(SAFFRON, 9, 0.8, 9, 45, 30.4, -48));

  // Parked jet on the apron.
  const plane = jet();
  plane.position.set(28, 0, 14);
  plane.rotation.y = -Math.PI / 2;
  airport.add(plane);

  g.add(airport);
  return { group: g, rotors };
}
