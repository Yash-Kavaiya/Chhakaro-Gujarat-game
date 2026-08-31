import * as THREE from 'three';

// Statue of Unity, Kevadia — the 182 m Sardar Patel figure on its plinth, the Narmada behind it
// (−Z) and a hint of the Sardar Sarovar dam on the far bank. The caller positions the group at the
// zone origin. This is a silhouette, not a portrait: the figure is deliberately blocky, no face.
const BRONZE = new THREE.MeshStandardMaterial({ color: 0x8c6b4a, metalness: 0.4, roughness: 0.6 });
const PLINTH_STONE = new THREE.MeshStandardMaterial({ color: 0xb8b0a4, roughness: 0.9, metalness: 0 });
const RIVER = new THREE.MeshStandardMaterial({ color: 0x3b6ea5, roughness: 0.25, metalness: 0.2 });
const DAM = new THREE.MeshStandardMaterial({ color: 0x9aa2a8, roughness: 0.85, metalness: 0 });

/** Statue of Unity — standing figure on a tall plinth, Narmada + dam behind. Local space. */
export function build(): THREE.Group {
  const g = new THREE.Group();

  // --- plinth: a tall rectangular block the figure stands on (top at y = 10) ---
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 14), PLINTH_STONE);
  plinth.position.y = 5;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  g.add(plinth);
  const PLINTH_TOP = 10;

  // thin viewing-gallery band near the top of the plinth
  const gallery = new THREE.Mesh(new THREE.BoxGeometry(15.6, 1.0, 15.6), BRONZE);
  gallery.position.y = PLINTH_TOP - 1.4;
  gallery.castShadow = true;
  g.add(gallery);

  // --- the figure: a blocky ~30-unit silhouette standing ON the plinth ---
  const figure = new THREE.Group();
  figure.position.y = PLINTH_TOP;

  // robe / dhoti — a wide truncated cone flaring out at the base of the torso
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 4.6, 12, 10), BRONZE);
  robe.position.y = 6;
  robe.castShadow = true;
  figure.add(robe);

  // torso — a tapered stack (narrower at the shoulders would look wrong for Patel's build; keep it barrel-ish)
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 14, 10), BRONZE);
  torso.position.y = 18;
  torso.castShadow = true;
  figure.add(torso);

  // shawl draped over the left shoulder
  const shawl = new THREE.Mesh(new THREE.BoxGeometry(7.2, 6.5, 4.2), BRONZE);
  shawl.position.set(-1.1, 23, 0.2);
  shawl.rotation.z = 0.14;
  shawl.castShadow = true;
  figure.add(shawl);

  // arms — two boxes hanging at the sides
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 14, 2.0), BRONZE);
    arm.position.set(sx * 3.8, 18, 0);
    arm.castShadow = true;
    figure.add(arm);
  }

  // neck + head (silhouette only — SphereGeometry capped at 16,12)
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.2, 1.8, 8), BRONZE);
  neck.position.y = 26;
  figure.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 12), BRONZE);
  head.position.y = 28.4;
  head.castShadow = true;
  figure.add(head);

  g.add(figure);

  // --- the Narmada: a wide blue plane behind the statue (−Z), y = 0.06 clears the terrain ---
  const river = new THREE.Mesh(new THREE.PlaneGeometry(180, 70), RIVER);
  river.rotation.x = -Math.PI / 2;
  river.position.set(0, 0.06, -70);
  river.receiveShadow = true;
  g.add(river);

  // --- dam hint: one long low wall along the far bank ---
  const dam = new THREE.Mesh(new THREE.BoxGeometry(170, 7, 4), DAM);
  dam.position.set(0, 3.5, -103);
  dam.castShadow = true;
  dam.receiveShadow = true;
  g.add(dam);

  return g;
}
