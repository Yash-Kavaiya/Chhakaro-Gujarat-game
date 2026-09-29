import * as THREE from 'three';
import {
  ARABIAN_SEA,
  COASTLINE,
  GREAT_RANN,
  GUJARAT_OUTLINE,
  KHADIR_BET,
  LAND_BORDER,
  LITTLE_RANN,
  Pt,
  WORLD_BOUNDS,
} from '../data/gujaratGeography';

/**
 * The ground the whole game stands on, shaped like Gujarat: the state's green land mass,
 * the Arabian Sea with the Gulfs of Kutch and Khambhat, the white salt of the Great and
 * Little Rann, a sandy beach strip along the coast, and the drier neighbouring states
 * beyond a saffron border line.
 *
 * Layers are separated by height *and* polygon offset so they never z-fight at distance:
 * neighbour land (lowest) → sea → Gujarat land → Rann / Khadir Bet → beach. Roads sit at
 * y ≈ 0.03–0.05 above all of it.
 */

/** Flat polygon in the XZ plane at height y (Shape lives in XY; rotate onto the ground). */
function flatPolygon(points: Pt[], material: THREE.Material, y: number): THREE.Mesh {
  // Shape (x, -z) + rotation.x = -π/2 maps back to world (x, y, z).
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, -p.z)));
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

/** A flat ribbon of constant width following a polyline (beach strip, border line). */
function ribbon(line: Pt[], width: number, material: THREE.Material, y: number): THREE.Mesh {
  const positions: number[] = [];
  const hw = width / 2;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1];
    const b = line[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const nx = (-(b.z - a.z) / len) * hw;
    const nz = ((b.x - a.x) / len) * hw;
    const a1 = [a.x + nx, y, a.z + nz];
    const a2 = [a.x - nx, y, a.z - nz];
    const b1 = [b.x + nx, y, b.z + nz];
    const b2 = [b.x - nx, y, b.z - nz];
    positions.push(...a1, ...a2, ...b1, ...a2, ...b2, ...b1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  // Winding varies per edge direction; normals must still face up for lighting.
  const n = geo.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  return mesh;
}

function layeredMaterial(color: number, offset: number, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: offset,
    polygonOffsetUnits: offset,
    side: THREE.DoubleSide,
    ...extra,
  });
}

export function buildGujaratTerrain(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  group.name = 'GujaratTerrain';
  const { minX, maxX, minZ, maxZ } = WORLD_BOUNDS;

  // 1. Neighbouring states — drier khaki plains beyond the border.
  const neighbour = new THREE.Mesh(
    new THREE.PlaneGeometry(maxX - minX, maxZ - minZ),
    layeredMaterial(0x9c9459, 8),
  );
  neighbour.rotation.x = -Math.PI / 2;
  neighbour.position.set((minX + maxX) / 2, -0.9, (minZ + maxZ) / 2);
  neighbour.receiveShadow = true;
  group.add(neighbour);

  // 2. Arabian Sea with the Gulf of Kutch and the Gulf of Khambhat.
  const seaMat = layeredMaterial(0x0e7490, 6, { roughness: 0.25, metalness: 0.15 });
  group.add(flatPolygon(ARABIAN_SEA, seaMat, -0.6));

  // 3. Gujarat itself.
  group.add(flatPolygon(GUJARAT_OUTLINE, layeredMaterial(0x4d8a2f, 4), -0.05));

  // 4. The Rann: blinding white salt, with Khadir Bet (Dholavira's island) standing out brown.
  const saltMat = layeredMaterial(0xf1f5f9, 2, { roughness: 0.55 });
  group.add(flatPolygon(GREAT_RANN, saltMat, -0.05));
  group.add(flatPolygon(LITTLE_RANN, layeredMaterial(0xe7e0cf, 2), -0.05));
  group.add(flatPolygon(KHADIR_BET, layeredMaterial(0xa16207, 1), -0.05));

  // 5. Sandy beach strip along the whole coastline.
  group.add(ribbon(COASTLINE, 22, layeredMaterial(0xe9c98a, 1), -0.05));

  // 6. State border — a thin saffron line across the Rann and along the land frontier.
  const borderLine = [COASTLINE[COASTLINE.length - 1], ...LAND_BORDER, COASTLINE[0]];
  group.add(ribbon(borderLine, 5, layeredMaterial(0xf97316, 0, { emissive: 0x7c2d12, emissiveIntensity: 0.4 }), -0.04));

  scene.add(group);
  return group;
}
