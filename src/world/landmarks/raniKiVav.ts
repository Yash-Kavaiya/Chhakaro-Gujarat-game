import * as THREE from 'three';

const SANDSTONE = new THREE.MeshStandardMaterial({ color: 0xc8a06a, roughness: 0.9, metalness: 0 });
const SANDSTONE_DARK = new THREE.MeshStandardMaterial({ color: 0xa8814c, roughness: 0.95 });
const WATER = new THREE.MeshStandardMaterial({ color: 0x2f6f6a, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.85 });

/** Rani ki Vav — inverted stepped well descending along −Z. Caller positions the group. */
export function build(): THREE.Group {
  const g = new THREE.Group();
  const TERRACES = 7;
  for (let i = 0; i < TERRACES; i++) {
    const depth = -i * 1.6;                       // each terrace 1.6 units deeper
    const halfW = 22 - i * 2.6;                    // narrowing toward the shaft
    const zNear = -6 - i * 3.0;
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 2, 0.6, 3.0),
      i % 2 ? SANDSTONE : SANDSTONE_DARK,
    );
    slab.position.set(0, depth, zNear);
    slab.receiveShadow = true;
    g.add(slab);
    // colonnade: short pillars along the terrace lip
    const pillarGeo = new THREE.CylinderGeometry(0.35, 0.4, 2.2, 8);
    for (let p = -halfW + 1.5; p <= halfW - 1.5; p += 3.2) {
      const pil = new THREE.Mesh(pillarGeo, SANDSTONE);
      pil.position.set(p, depth + 1.4, zNear + 1.2);
      pil.castShadow = true;
      g.add(pil);
    }
  }
  // water at the bottom of the shaft
  const pool = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 5), WATER);
  pool.position.set(0, -TERRACES * 1.6 + 0.2, -6 - TERRACES * 3.0 - 2);
  g.add(pool);
  // entrance pavilion tower (kuta) at the shallow end
  const tower = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 6), SANDSTONE);
  base.position.y = 2.5;
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6, 6), SANDSTONE_DARK);
  spire.position.y = 8;
  tower.add(base, spire);
  tower.position.set(0, 0, -3);
  tower.traverse((o) => { if (o instanceof THREE.Mesh) o.castShadow = true; });
  g.add(tower);
  return g;
}
