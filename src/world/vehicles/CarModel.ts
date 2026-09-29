import * as THREE from 'three';
import { ChhakaroCustomization, PassengerData } from '../../types';
import { VehicleModel, numberPlateTexture, passengerFigure } from './VehicleModel';

/**
 * A compact Gujarati hatchback: painted body in the player's colour, glasshouse, four
 * wheels (front pair steers), headlamps with a real spotlight, brake/indicator lights,
 * GJ-18 plates and a sticker strip on the rear glass. Forward is local −Z.
 */
export class CarModel implements VehicleModel {
  public group = new THREE.Group();
  private bodyMat: THREE.MeshStandardMaterial;
  private stickerMesh: THREE.Mesh;
  private wheels: THREE.Object3D[] = [];
  private frontPivots: THREE.Group[] = [];
  private spotLight: THREE.SpotLight;
  private brakeLights: THREE.PointLight[] = [];
  private indicators: THREE.PointLight[] = [];
  private passengerGroup = new THREE.Group();

  constructor(custom: ChhakaroCustomization) {
    this.group.name = 'Car';
    this.bodyMat = new THREE.MeshStandardMaterial({ color: custom.bodyColor || 0xf8fafc, roughness: 0.35, metalness: 0.45 });
    const glass = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1, metalness: 0.7, transparent: true, opacity: 0.85 });
    const trim = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });
    const tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfff3c4, emissiveIntensity: 0.9 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.8 });

    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      return m;
    };

    // Lower body, bonnet slope and cabin.
    add(new THREE.BoxGeometry(1.8, 0.62, 4.0), this.bodyMat, 0, 0.62, 0);
    const bonnet = add(new THREE.BoxGeometry(1.72, 0.2, 1.1), this.bodyMat, 0, 0.98, -1.4);
    bonnet.rotation.x = 0.08;
    add(new THREE.BoxGeometry(1.66, 0.62, 2.1), this.bodyMat, 0, 1.24, 0.25);
    // Glasshouse: windscreen, rear glass and side windows.
    const ws = add(new THREE.BoxGeometry(1.56, 0.56, 0.06), glass, 0, 1.25, -0.84);
    ws.rotation.x = -0.45;
    const rg = add(new THREE.BoxGeometry(1.56, 0.5, 0.06), glass, 0, 1.25, 1.33);
    rg.rotation.x = 0.35;
    add(new THREE.BoxGeometry(1.68, 0.42, 1.7), glass, 0, 1.3, 0.25);
    add(new THREE.BoxGeometry(1.7, 0.08, 2.0), trim, 0, 1.56, 0.25);
    // Bumpers, grille, mirrors.
    add(new THREE.BoxGeometry(1.84, 0.26, 0.2), trim, 0, 0.42, -2.05);
    add(new THREE.BoxGeometry(1.84, 0.26, 0.2), trim, 0, 0.42, 2.05);
    add(new THREE.BoxGeometry(1.0, 0.18, 0.05), chrome, 0, 0.72, -2.02);
    add(new THREE.BoxGeometry(0.12, 0.14, 0.24), this.bodyMat, -0.92, 1.1, -0.6);
    add(new THREE.BoxGeometry(0.12, 0.14, 0.24), this.bodyMat, 0.92, 1.1, -0.6);
    // Lamps.
    add(new THREE.BoxGeometry(0.36, 0.14, 0.06), lampMat, -0.6, 0.78, -2.01);
    add(new THREE.BoxGeometry(0.36, 0.14, 0.06), lampMat, 0.6, 0.78, -2.01);
    add(new THREE.BoxGeometry(0.34, 0.16, 0.06), tailMat, -0.66, 0.82, 2.01);
    add(new THREE.BoxGeometry(0.34, 0.16, 0.06), tailMat, 0.66, 0.82, 2.01);

    // Number plates (front + rear).
    const plateMat = new THREE.MeshBasicMaterial({ map: numberPlateTexture() });
    const plateGeo = new THREE.PlaneGeometry(0.62, 0.16);
    const front = new THREE.Mesh(plateGeo, plateMat);
    front.position.set(0, 0.44, -2.16);
    front.rotation.y = Math.PI;
    const rear = new THREE.Mesh(plateGeo, plateMat);
    rear.position.set(0, 0.44, 2.16);
    this.group.add(front, rear);

    // Sticker strip on the rear glass ("જય ગરવી ગુજરાત").
    this.stickerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.16),
      new THREE.MeshBasicMaterial({ map: this.stickerTexture(custom.stickerText), transparent: true }),
    );
    this.stickerMesh.position.set(0, 1.44, 1.43);
    this.stickerMesh.rotation.x = -0.35;
    this.group.add(this.stickerMesh);

    // Wheels: front pair on steering pivots.
    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16);
    const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.26, 10);
    for (const [x, z, steer] of [[-0.86, -1.3, true], [0.86, -1.3, true], [-0.86, 1.3, false], [0.86, 1.3, false]] as const) {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.34, z);
      const wheel = new THREE.Group();
      const t = new THREE.Mesh(wheelGeo, tyre);
      t.rotation.z = Math.PI / 2;
      t.castShadow = true;
      const h = new THREE.Mesh(hubGeo, chrome);
      h.rotation.z = Math.PI / 2;
      wheel.add(t, h);
      pivot.add(wheel);
      this.group.add(pivot);
      this.wheels.push(wheel);
      if (steer) this.frontPivots.push(pivot);
    }

    // Real light sources.
    const target = new THREE.Object3D();
    target.position.set(0, 0.2, -20);
    this.group.add(target);
    this.spotLight = new THREE.SpotLight(0xfffaed, 9, 50, Math.PI / 5.5, 0.4, 1.2);
    this.spotLight.position.set(0, 0.9, -2.1);
    this.spotLight.target = target;
    this.group.add(this.spotLight);
    for (const x of [-0.66, 0.66]) {
      const b = new THREE.PointLight(0xff0000, 0, 5);
      b.position.set(x, 0.82, 2.2);
      this.brakeLights.push(b);
      const ind = new THREE.PointLight(0xf59e0b, 0, 4);
      ind.position.set(x * 1.3, 0.8, 0);
      this.indicators.push(ind);
      this.group.add(b, ind);
    }

    this.group.add(this.passengerGroup);
  }

  private stickerTexture(text: string): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 44px "Hind Vadodara", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text || 'જય ગરવી ગુજરાત', 256, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  update(delta: number, speed: number, steerAngle: number, isBraking: boolean, isHeadlightOn: boolean, isHazardOn = false, hasPuncture = false) {
    for (const p of this.frontPivots) p.rotation.y = steerAngle * 0.9;
    const spin = (speed / 3.6 / 0.34) * delta;
    for (const w of this.wheels) w.rotation.x -= spin;
    this.group.position.y = hasPuncture ? Math.abs(Math.sin(Date.now() * 0.02)) * 0.03 : 0;
    this.group.rotation.z = hasPuncture ? Math.sin(Date.now() * 0.015) * 0.02 : 0;
    for (const b of this.brakeLights) b.intensity = isBraking ? 2.5 : 0.1;
    this.spotLight.intensity = isHeadlightOn ? 10 : 0;
    const blink = isHazardOn && Math.sin(Date.now() * 0.008) > 0;
    for (const i of this.indicators) i.intensity = blink ? 3 : 0;
  }

  setPassenger(passenger: PassengerData | null) {
    this.passengerGroup.clear();
    if (!passenger) return;
    const fig = passengerFigure(passenger);
    fig.position.set(0.42, 0.55, 0.85); // rear seat, kerb side
    this.passengerGroup.add(fig);
  }

  updateCustomization(custom: ChhakaroCustomization) {
    this.bodyMat.color.set(custom.bodyColor);
    const mat = this.stickerMesh.material as THREE.MeshBasicMaterial;
    mat.map?.dispose();
    mat.map = this.stickerTexture(custom.stickerText);
    mat.needsUpdate = true;
  }
}
