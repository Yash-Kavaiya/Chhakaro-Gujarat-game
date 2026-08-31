import * as THREE from 'three';

// Sasan Gir safari check-post + forest canopy. The caller positions the group at the zone
// origin; the road runs along Z, +Z is the approach side, the canopy fills −Z (behind the gate).
const GATE_STONE = new THREE.MeshStandardMaterial({ color: 0x8c857a, roughness: 0.9, metalness: 0 });
const TIMBER = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.85, metalness: 0 });
const PLAQUE = new THREE.MeshStandardMaterial({ color: 0x24603a, roughness: 0.6, metalness: 0 });
const LEAF = new THREE.MeshStandardMaterial({ color: 0x2f6b2f, roughness: 0.9, metalness: 0 });
const TRUNK = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.95, metalness: 0 });
const HUT_WALL = new THREE.MeshStandardMaterial({ color: 0xc9a86a, roughness: 0.9, metalness: 0 });

// Shared low-poly trunk — every canopy clump reuses this geometry.
const TRUNK_GEO = new THREE.CylinderGeometry(0.35, 0.5, 4, 6);

/**
 * Adds ~60 deterministic tree clumps in a band behind the gate (−Z). Seeded loop, no Math.random,
 * so the forest wall is identical every run. Clumps that land on the road corridor are nudged aside.
 */
function scatterCanopy(g: THREE.Group) {
  for (let i = 0; i < 60; i++) {
    const angle = i * 2.4;
    const r = 30 + (i % 7) * 4;
    let x = Math.cos(angle) * r;
    const z = -20 - Math.abs(Math.sin(angle)) * r;
    if (Math.abs(x) < 8) x += (x >= 0 ? 1 : -1) * 8; // keep the road corridor readable
    const s = 1 + (i % 5) * 0.16;

    const clump = new THREE.Group();
    clump.position.set(x, 0, z);
    clump.rotation.y = angle;

    const trunk = new THREE.Mesh(TRUNK_GEO, TRUNK);
    trunk.position.y = 2;
    trunk.castShadow = true;
    clump.add(trunk);

    const canopy1 = new THREE.Mesh(new THREE.ConeGeometry(2.7 * s, 6.2 * s, 6), LEAF);
    canopy1.position.y = 3.6 + 3.1 * s;
    canopy1.castShadow = true;
    clump.add(canopy1);

    if (i % 3 === 0) {
      const canopy2 = new THREE.Mesh(new THREE.ConeGeometry(1.9 * s, 4.4 * s, 6), LEAF);
      canopy2.position.y = 3.6 + 6.0 * s;
      canopy2.castShadow = true;
      clump.add(canopy2);
    }

    g.add(clump);
  }
}

/** Gir safari gate — stone pillars + beam + boom pole + ranger hut, backed by a wall of forest. */
export function build(): THREE.Group {
  const g = new THREE.Group();

  // --- two stone gate pillars, one either side of the road ---
  for (const sx of [-6, 6]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 5, 1.8), GATE_STONE);
    pillar.position.set(sx, 2.5, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    g.add(pillar);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 2.4), GATE_STONE);
    cap.position.set(sx, 5.3, 0);
    cap.castShadow = true;
    g.add(cap);
  }

  // --- horizontal beam across the top + a plain plaque box (no text; the real signboard
  //     is added separately by EnvironmentBuilder) ---
  const beam = new THREE.Mesh(new THREE.BoxGeometry(14.5, 0.7, 1.0), TIMBER);
  beam.position.set(0, 5.4, 0);
  beam.castShadow = true;
  g.add(beam);

  const plaque = new THREE.Mesh(new THREE.BoxGeometry(6.5, 2.1, 0.3), PLAQUE);
  plaque.position.set(0, 6.7, 0);
  plaque.castShadow = true;
  g.add(plaque);

  // --- boom pole: pivots by the right pillar, angled up ~30° so it reads as "gate open" ---
  const boom = new THREE.Group();
  boom.position.set(6, 1.6, 1.6);
  boom.rotation.z = -Math.PI / 6;
  const pole = new THREE.Mesh(new THREE.BoxGeometry(9, 0.35, 0.35), TIMBER);
  pole.position.x = -4.5;
  pole.castShadow = true;
  boom.add(pole);
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), GATE_STONE);
  counterweight.position.x = 0.9;
  counterweight.castShadow = true;
  boom.add(counterweight);
  g.add(boom);

  // --- ranger hut to one side ---
  const hut = new THREE.Group();
  hut.position.set(-14, 0, 3);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(5, 3.6, 4.5), HUT_WALL);
  walls.position.y = 1.8;
  walls.castShadow = true;
  walls.receiveShadow = true;
  hut.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.3, 2.8, 4), TIMBER);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 5.0;
  roof.castShadow = true;
  hut.add(roof);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.2), TIMBER);
  door.position.set(0, 1.15, 2.25);
  hut.add(door);
  g.add(hut);

  // --- dense forest canopy filling the space behind the gate ---
  scatterCanopy(g);

  return g;
}
