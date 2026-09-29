import * as THREE from 'three';

/**
 * Porbandar — Kirti Mandir (Gandhiji's birthplace memorial), the Sudama temple and the
 * fishing harbour. Local space around the junction: the Dwarka road leaves to the NW and
 * the Somnath road to the SE, so the memorial stands in the free NE wedge and the beach and
 * fishing boats sit in the SW, where the Arabian Sea begins.
 */

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const CREAM = new THREE.MeshStandardMaterial({ color: 0xf1e3c2, roughness: 0.8 });
const OCHRE = new THREE.MeshStandardMaterial({ color: 0xd9a441, roughness: 0.75 });
const WHITE = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.6 });
const DARK = new THREE.MeshStandardMaterial({ color: 0x3f2a1d, roughness: 0.8 });
const SAFFRON = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6, side: THREE.DoubleSide });
const HULL_BLUE = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
const HULL_RED = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 });
const WOOD = new THREE.MeshStandardMaterial({ color: 0x7c4a1e, roughness: 0.85 });
const SAND = new THREE.MeshStandardMaterial({ color: 0xe9c98a, roughness: 0.95 });

function box(mat: THREE.Material, sx: number, sy: number, sz: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(boxGeo, mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function nameBoard(text: string, sub: string): THREE.Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 12;
  ctx.strokeRect(10, 10, 1004, 236);
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 76px "Hind Vadodara", sans-serif';
  ctx.fillText(text, 512, 100);
  ctx.font = 'bold 40px "Hind Vadodara", sans-serif';
  ctx.fillText(sub, 512, 185);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(16, 4), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
}

/** Traditional Gujarati fishing vahan (dhow) with a saffron pennant. */
function boat(hull: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.add(box(hull, 3, 1.4, 10, 0, 0.5, 0));
  const bow = box(hull, 2.2, 1.6, 2.6, 0, 0.8, 5.6);
  bow.rotation.x = -0.35;
  g.add(bow);
  g.add(box(WOOD, 2.6, 0.2, 8.6, 0, 1.25, -0.3));
  g.add(box(WOOD, 0.25, 7, 0.25, 0, 4.6, 1));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), SAFFRON);
  flag.position.set(0.8, 7.6, 1);
  g.add(flag);
  return g;
}

export function build(): THREE.Group {
  const g = new THREE.Group();

  // ---------- Kirti Mandir (NE wedge) ----------
  const km = new THREE.Group();
  km.position.set(60, 0, -60);
  km.rotation.y = -Math.PI / 4; // face the junction
  km.add(box(OCHRE, 34, 1.2, 26, 0, 0.6, 0));
  // Three receding storeys of the haveli-style memorial.
  km.add(box(CREAM, 26, 7, 18, 0, 4.7, 0));
  km.add(box(CREAM, 18, 6, 13, 0, 11.2, -1));
  km.add(box(CREAM, 10, 5, 8, 0, 16.7, -2));
  // Windows / jharokhas across the front.
  for (let x = -10; x <= 10; x += 4) km.add(box(DARK, 1.8, 3, 0.3, x, 4.5, 9.1));
  for (let x = -6; x <= 6; x += 4) km.add(box(DARK, 1.6, 2.6, 0.3, x, 11, 5.6));
  // Shikhara-like crown and a saffron flag — the memorial is 79 ft, one for each year of Bapu's life.
  const crown = new THREE.Mesh(new THREE.ConeGeometry(4, 6, 8), OCHRE);
  crown.position.set(0, 22.2, -2);
  crown.castShadow = true;
  km.add(crown);
  km.add(box(WHITE, 0.2, 4, 0.2, 0, 27, -2));
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), SAFFRON);
  flag.position.set(1.2, 28.2, -2);
  km.add(flag);
  const board = nameBoard('કીર્તિ મંદિર', 'ગાંધીજીનું જન્મસ્થળ — ૨ ઓક્ટોબર ૧૮૬૯');
  board.position.set(0, 9.6, 9.4);
  km.add(board);
  g.add(km);

  // ---------- Sudama temple (NE, beside Kirti Mandir) ----------
  const sudama = new THREE.Group();
  sudama.position.set(105, 0, -18);
  sudama.add(box(WHITE, 12, 1, 12, 0, 0.5, 0));
  sudama.add(box(WHITE, 8, 6, 8, 0, 4, 0));
  const spire = new THREE.Mesh(new THREE.ConeGeometry(4, 9, 8), WHITE);
  spire.position.set(0, 11.5, 0);
  spire.castShadow = true;
  sudama.add(spire);
  const sf = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1), SAFFRON);
  sf.position.set(0.9, 17, 0);
  sudama.add(sf);
  g.add(sudama);

  // ---------- Chowpatty beach + fishing harbour (SW, toward the sea) ----------
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(90, 40), SAND);
  beach.rotation.x = -Math.PI / 2;
  beach.rotation.z = Math.PI / 4;
  beach.position.set(-70, 0.02, 45);
  beach.receiveShadow = true;
  g.add(beach);
  // Boats afloat just offshore (the sea surface sits at y ≈ -0.6).
  const boats: [number, number, THREE.Material][] = [
    [-120, 70, HULL_BLUE],
    [-105, 95, HULL_RED],
    [-140, 45, HULL_RED],
  ];
  for (const [x, z, mat] of boats) {
    const b = boat(mat);
    b.position.set(x, -0.5, z);
    b.rotation.y = Math.PI / 4 + (x % 3) * 0.2;
    g.add(b);
  }
  return g;
}
