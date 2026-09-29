import * as THREE from 'three';
import { ChhakaroCustomization, PassengerData } from '../../types';
import { VehicleModel, numberPlateTexture, passengerFigure } from './VehicleModel';

/**
 * A 150cc commuter motorcycle with its rider (helmet on — Gujarat traffic rules!): tank in
 * the player's colour, steering front fork, spinning wheels, headlamp spotlight, tail/brake
 * lamp and indicators, a GJ-18 plate and an optional pillion passenger. Forward is local −Z.
 * GameWorld leans the whole group into corners (positive roll in the vehicle spec).
 */
export class BikeModel implements VehicleModel {
  public group = new THREE.Group();
  private tankMat: THREE.MeshStandardMaterial;
  private fork = new THREE.Group();
  private frontWheel: THREE.Group;
  private rearWheel: THREE.Group;
  private spotLight: THREE.SpotLight;
  private brakeLight: THREE.PointLight;
  private indicators: THREE.PointLight[] = [];
  private passengerGroup = new THREE.Group();

  constructor(custom: ChhakaroCustomization) {
    this.group.name = 'Bike';
    this.tankMat = new THREE.MeshStandardMaterial({ color: custom.bodyColor || 0xdc2626, roughness: 0.3, metalness: 0.5 });
    const black = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });
    const tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 });
    const seat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.8 });
    const lamp = new THREE.MeshStandardMaterial({ color: 0xfffbeb, emissive: 0xfff3c4, emissiveIntensity: 1 });
    const tail = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.8 });
    const shirt = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.8 });
    const jeans = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
    const helmet = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.2 });

    const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = this.group) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    const wheel = (r: number) => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.1, 8, 20), tyre);
      t.rotation.y = Math.PI / 2;
      t.castShadow = true;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.75, r * 0.75, 0.06, 16), chrome);
      rim.rotation.z = Math.PI / 2;
      g.add(t, rim);
      return g;
    };

    // Frame, engine, tank, seat, exhaust.
    const frame = mesh(new THREE.BoxGeometry(0.14, 0.14, 1.5), black, 0, 0.72, 0);
    frame.rotation.x = -0.12;
    mesh(new THREE.BoxGeometry(0.38, 0.36, 0.5), chrome, 0, 0.5, 0.05);
    mesh(new THREE.BoxGeometry(0.44, 0.3, 0.62), this.tankMat, 0, 0.98, -0.3);
    mesh(new THREE.BoxGeometry(0.34, 0.12, 0.8), seat, 0, 0.98, 0.35);
    const exhaust = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.9, 10), chrome, 0.24, 0.42, 0.45);
    exhaust.rotation.x = Math.PI / 2 - 0.15;
    mesh(new THREE.BoxGeometry(0.3, 0.06, 0.5), this.tankMat, 0, 0.82, 0.95); // rear mudguard
    mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), tail, 0, 0.9, 1.2);

    // Rear plate.
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.11), new THREE.MeshBasicMaterial({ map: numberPlateTexture() }));
    plate.position.set(0, 0.74, 1.22);
    this.group.add(plate);

    // Wheels.
    this.rearWheel = wheel(0.34);
    this.rearWheel.position.set(0, 0.34, 0.72);
    this.group.add(this.rearWheel);

    // Steering fork with handlebar, headlamp and front wheel.
    this.fork.position.set(0, 0.34, -0.78);
    this.group.add(this.fork);
    const leg = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), chrome, 0, 0.42, 0.08, this.fork);
    leg.rotation.x = 0.35;
    const bar = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.78, 8), black, 0, 0.94, 0.2, this.fork);
    bar.rotation.z = Math.PI / 2;
    const head = mesh(new THREE.SphereGeometry(0.13, 12, 10), lamp, 0, 0.72, -0.05, this.fork);
    head.scale.z = 0.6;
    this.frontWheel = wheel(0.34);
    this.fork.add(this.frontWheel);

    // Rider in a yellow helmet, hands on the bars.
    const rider = new THREE.Group();
    rider.position.set(0, 1.04, 0.28);
    mesh(new THREE.BoxGeometry(0.42, 0.56, 0.28), shirt, 0, 0.4, 0, rider).rotation.x = -0.25;
    mesh(new THREE.SphereGeometry(0.17, 12, 10), helmet, 0, 0.84, -0.08, rider);
    mesh(new THREE.BoxGeometry(0.26, 0.08, 0.02), black, 0, 0.84, -0.25, rider); // visor
    for (const s of [-1, 1]) {
      const arm = mesh(new THREE.BoxGeometry(0.1, 0.1, 0.52), shirt, s * 0.22, 0.52, -0.32, rider);
      arm.rotation.x = 0.35;
      mesh(new THREE.SphereGeometry(0.05, 6, 6), skin, s * 0.3, 0.4, -0.58, rider);
      const thigh = mesh(new THREE.BoxGeometry(0.14, 0.14, 0.46), jeans, s * 0.16, 0.02, -0.12, rider);
      thigh.rotation.x = 0.1;
      mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), jeans, s * 0.2, -0.2, -0.36, rider);
    }
    this.group.add(rider);

    // Lights.
    const target = new THREE.Object3D();
    target.position.set(0, 0.2, -18);
    this.group.add(target);
    this.spotLight = new THREE.SpotLight(0xfffaed, 8, 45, Math.PI / 6, 0.4, 1.2);
    this.spotLight.position.set(0, 1.05, -0.9);
    this.spotLight.target = target;
    this.group.add(this.spotLight);
    this.brakeLight = new THREE.PointLight(0xff0000, 0, 4);
    this.brakeLight.position.set(0, 0.9, 1.3);
    this.group.add(this.brakeLight);
    for (const x of [-0.35, 0.35]) {
      const ind = new THREE.PointLight(0xf59e0b, 0, 3);
      ind.position.set(x, 0.95, 0);
      this.indicators.push(ind);
      this.group.add(ind);
    }

    this.group.add(this.passengerGroup);
  }

  update(delta: number, speed: number, steerAngle: number, isBraking: boolean, isHeadlightOn: boolean, isHazardOn = false, hasPuncture = false) {
    this.fork.rotation.y = steerAngle * 0.7;
    const spin = (speed / 3.6 / 0.34) * delta;
    this.frontWheel.rotation.x -= spin;
    this.rearWheel.rotation.x -= spin;
    this.group.position.y = hasPuncture ? Math.abs(Math.sin(Date.now() * 0.02)) * 0.04 : 0;
    // Reset roll each frame; GameWorld adds the corner lean on top.
    this.group.rotation.z = hasPuncture ? Math.sin(Date.now() * 0.015) * 0.03 : 0;
    this.brakeLight.intensity = isBraking ? 2.5 : 0.1;
    this.spotLight.intensity = isHeadlightOn ? 9 : 0;
    const blink = isHazardOn && Math.sin(Date.now() * 0.008) > 0;
    for (const i of this.indicators) i.intensity = blink ? 3 : 0;
  }

  setPassenger(passenger: PassengerData | null) {
    this.passengerGroup.clear();
    if (!passenger) return;
    const fig = passengerFigure(passenger);
    fig.position.set(0, 0.95, 0.72); // pillion seat
    this.passengerGroup.add(fig);
  }

  updateCustomization(custom: ChhakaroCustomization) {
    this.tankMat.color.set(custom.bodyColor);
  }
}
