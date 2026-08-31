import * as THREE from 'three';

// Chalukya seaside-temple palette. The caller positions the group at the zone origin;
// +Z faces the road / the shore, the shikhara rises at the back (−Z, toward the land).
const CREAM_STONE = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.9, metalness: 0 });
const STONE_DARK = new THREE.MeshStandardMaterial({ color: 0xcbb88f, roughness: 0.95, metalness: 0 });
const SEA = new THREE.MeshStandardMaterial({ color: 0x2f6f6a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.8 });
const SAFFRON = new THREE.MeshStandardMaterial({ color: 0xd9852b, roughness: 0.7, metalness: 0 });

/** Somnath — a stylised Chalukya seaside temple. Works in local space around origin; caller places it. */
export function build(): THREE.Group {
  const g = new THREE.Group();

  // --- plinth: one broad low slab the whole temple stands on ---
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(30, 2.4, 40), STONE_DARK);
  plinth.position.set(0, 1.2, 4);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);
  const PLINTH_TOP = 2.4;

  // --- shikhara: a stack of six receding drums narrowing upward ---
  const SHIKHARA_Z = -8;
  const widths = [10, 8.6, 7.3, 6.0, 4.7, 3.4];
  const drumH = 3.6;
  let y = PLINTH_TOP;
  widths.forEach((w, i) => {
    const drum = new THREE.Mesh(new THREE.BoxGeometry(w, drumH, w), i % 2 ? STONE_DARK : CREAM_STONE);
    drum.position.set(0, y + drumH / 2, SHIKHARA_Z);
    drum.castShadow = true;
    drum.receiveShadow = true;
    g.add(drum);
    y += drumH;
  });

  // amalaka (ribbed crowning disk) + finial + flag mast on the peak
  const amalaka = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), STONE_DARK);
  amalaka.scale.y = 0.55;
  amalaka.position.set(0, y + 0.8, SHIKHARA_Z);
  amalaka.castShadow = true;
  g.add(amalaka);

  const finial = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.6, 8), CREAM_STONE);
  finial.position.set(0, y + 2.8, SHIKHARA_Z);
  finial.castShadow = true;
  g.add(finial);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), STONE_DARK);
  mast.position.set(0, y + 6.4, SHIKHARA_Z);
  g.add(mast);

  const flag = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 0.12), SAFFRON);
  flag.position.set(1.4, y + 8.4, SHIKHARA_Z);
  g.add(flag);

  // --- mandapa: a wider, lower hall in front of the tower (toward +Z) ---
  const MANDAPA_Z = 12;
  const hall = new THREE.Mesh(new THREE.BoxGeometry(17, 8, 16), CREAM_STONE);
  hall.position.set(0, PLINTH_TOP + 4, MANDAPA_Z);
  hall.castShadow = true;
  hall.receiveShadow = true;
  g.add(hall);

  // three-tier receding pyramidal roof (4-sided cones)
  const tiers: Array<[number, number, number]> = [
    [12, 4, PLINTH_TOP + 10],
    [8.5, 3.4, PLINTH_TOP + 12.4],
    [5, 3, PLINTH_TOP + 14.6],
  ];
  tiers.forEach(([r, h, cy], i) => {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r, h, 4), i % 2 ? CREAM_STONE : STONE_DARK);
    roof.rotation.y = Math.PI / 4;
    roof.position.set(0, cy, MANDAPA_Z);
    roof.castShadow = true;
    g.add(roof);
  });

  // --- shore wall: a low long wall between the plinth and the sea ---
  const shoreWall = new THREE.Mesh(new THREE.BoxGeometry(64, 1.8, 2.2), STONE_DARK);
  shoreWall.position.set(0, 0.9, 26);
  shoreWall.castShadow = true;
  shoreWall.receiveShadow = true;
  g.add(shoreWall);

  // --- sea: a large thin semi-transparent plane extending toward +Z (the road side) ---
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(200, 120), SEA);
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.1, 86);
  sea.receiveShadow = true;
  g.add(sea);

  return g;
}
