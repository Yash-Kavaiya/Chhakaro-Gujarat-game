import * as THREE from 'three';

// Great Rann of Kutch — emptiness to the horizon. The caller positions the group at the zone
// origin. The star is one huge near-white salt disc; everything else stays low and sparse so the
// horizon line is never broken. The Rann Utsav tent city clusters off to one side (+X).
const SALT = new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 1, metalness: 0 });
const CRACK = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 1, metalness: 0 });
const TENT = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.85, metalness: 0 });
const TENT_TRIM = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7, metalness: 0 });

// Shared tent geometry — every tent in the seeded cluster reuses these three.
const TENT_DRUM_GEO = new THREE.CylinderGeometry(1.7, 1.7, 1.8, 8);
const TENT_ROOF_GEO = new THREE.ConeGeometry(2.1, 2.6, 8);
const TENT_TRIM_GEO = new THREE.CylinderGeometry(1.78, 1.78, 0.24, 8);

/** One stylised camel silhouette — a dark blocky shape that reads against the white salt. */
function buildCamel(): THREE.Group {
  const c = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.1, 1.0), CRACK);
  body.position.y = 2.3;
  const hump = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.9), CRACK);
  hump.position.set(0.1, 3.0, 0);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.6), CRACK);
  neck.position.set(1.2, 3.1, 0);
  neck.rotation.z = -0.35;
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.5), CRACK);
  head.position.set(1.9, 3.8, 0);
  c.add(body, hump, neck, head);
  for (const [lx, lz] of [[-1.0, 0.35], [-1.0, -0.35], [1.0, 0.35], [1.0, -0.35]] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.0, 0.35), CRACK);
    leg.position.set(lx, 1.0, lz);
    c.add(leg);
  }
  c.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  return c;
}

/** Great Rann of Kutch — salt flat to the horizon + a Rann Utsav tent cluster. Local space. */
export function build(): THREE.Group {
  const g = new THREE.Group();

  // --- the star: one huge near-white salt disc, laid flat just above the zone terrain ---
  //     y = 0.05 clears the opaque terrain plane at y = -0.05 so it actually renders.
  const salt = new THREE.Mesh(new THREE.CircleGeometry(140, 48), SALT);
  salt.rotation.x = -Math.PI / 2;
  salt.position.y = 0.05;
  salt.receiveShadow = true;
  g.add(salt);

  // --- hex-crack hint: 8 thin dark slivers scattered flat on the salt (seeded, no Math.random) ---
  for (let i = 0; i < 8; i++) {
    const a = i * 2.399963;                    // golden-angle spread
    const r = 6 + (i % 4) * 20;                // 6 → 66 units out
    const crack = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 6 + (i % 3) * 3), CRACK);
    crack.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r);
    crack.rotation.y = a * 1.7 + (i % 2) * 0.6;
    g.add(crack);
  }

  // --- Rann Utsav tents: 12 circular tents clustered off to one side (+X) ---
  const CLUSTER_X = 60;
  const CLUSTER_Z = -8;
  for (let i = 0; i < 12; i++) {
    const angle = i * 0.55;
    const r = 8 + (i % 3) * 5;
    const x = CLUSTER_X + Math.cos(angle) * r;
    const z = CLUSTER_Z + Math.sin(angle) * r;

    const drum = new THREE.Mesh(TENT_DRUM_GEO, TENT);
    drum.position.set(x, 0.9, z);
    drum.castShadow = true;
    drum.receiveShadow = true;
    g.add(drum);

    const trim = new THREE.Mesh(TENT_TRIM_GEO, TENT_TRIM);
    trim.position.set(x, 1.9, z);
    g.add(trim);

    const roof = new THREE.Mesh(TENT_ROOF_GEO, TENT);
    roof.position.set(x, 3.1, z);
    roof.castShadow = true;
    g.add(roof);
  }

  // --- two camel silhouettes out on the open salt (kept away from the tent cluster) ---
  const camelA = buildCamel();
  camelA.position.set(-14, 0, 10);
  camelA.rotation.y = 0.6;
  g.add(camelA);
  const camelB = buildCamel();
  camelB.position.set(-24, 0, 16);
  camelB.rotation.y = 1.3;
  camelB.scale.setScalar(0.9);
  g.add(camelB);

  return g;
}
