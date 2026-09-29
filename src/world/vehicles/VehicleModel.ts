import * as THREE from 'three';
import { ChhakaroCustomization, PassengerData, VehicleType } from '../../types';

/** What GameWorld needs from any drivable vehicle model. Forward is local −Z. */
export interface VehicleModel {
  group: THREE.Group;
  update(
    delta: number,
    speed: number,
    steerAngle: number,
    isBraking: boolean,
    isHeadlightOn: boolean,
    isHazardOn?: boolean,
    hasPuncture?: boolean,
  ): void;
  setPassenger(passenger: PassengerData | null): void;
  updateCustomization(custom: ChhakaroCustomization): void;
}

/** Driving feel + camera framing per vehicle. Speeds in km/h. */
export interface VehicleSpec {
  nameGujarati: string;
  maxSpeed: number;
  acceleration: number;
  brakeForce: number;
  /** Stretches the shared 4-speed gearbox bands (tuned for the 68 km/h chhakaro). */
  gearScale: number;
  turnRadius: number;
  /** Body roll per unit of (speed/60 · steer). Negative rolls out of a turn, positive leans in (bikes). */
  roll: number;
  /** Driver-eye offset for the hood camera. */
  hoodCam: [number, number, number];
  /** Rear-seat / pillion offset for the passenger camera. */
  passengerCam: [number, number, number];
  chaseDistance: number;
  chaseHeight: number;
}

export const VEHICLE_SPECS: Record<VehicleType, VehicleSpec> = {
  chhakaro: {
    nameGujarati: 'છકડો',
    maxSpeed: 68,
    acceleration: 24,
    brakeForce: 45,
    gearScale: 1,
    turnRadius: 3.5,
    roll: -0.28,
    hoodCam: [0, 1.45, -0.6],
    passengerCam: [0.3, 1.6, 0.6],
    chaseDistance: 7.5,
    chaseHeight: 3.2,
  },
  car: {
    nameGujarati: 'કાર',
    maxSpeed: 112,
    acceleration: 30,
    brakeForce: 62,
    gearScale: 1.6,
    turnRadius: 4.6,
    roll: -0.07,
    hoodCam: [-0.35, 1.25, -0.1],
    passengerCam: [0.4, 1.25, 0.9],
    chaseDistance: 8.5,
    chaseHeight: 3.0,
  },
  bike: {
    nameGujarati: 'બાઇક',
    maxSpeed: 96,
    acceleration: 34,
    brakeForce: 55,
    gearScale: 1.38,
    turnRadius: 3.0,
    roll: 0.95,
    hoodCam: [0, 1.6, 0.05],
    passengerCam: [0, 1.75, 0.75],
    chaseDistance: 6.2,
    chaseHeight: 2.6,
  },
};

/** Gujarat RTO plate — GJ-18 is Gandhinagar, where every trip starts. */
export function numberPlateTexture(text = 'GJ 18 AB 1960'): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, 256, 64);
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 5;
  ctx.strokeRect(3, 3, 250, 58);
  ctx.fillStyle = '#1d4ed8';
  ctx.fillRect(6, 6, 26, 52);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px "Hind Vadodara", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('IND', 19, 40);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 34px "Hind Vadodara", monospace';
  ctx.fillText(text, 144, 45);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** A seated Gujarati passenger figure; styles mirror the chhakaro's rear-bench passenger. */
export function passengerFigure(p: PassengerData): THREE.Group {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
  const clothes: Record<PassengerData['modelStyle'], number> = {
    elder_ba: 0xf8fafc,
    tourist: 0x0284c7,
    student: 0x16a34a,
    nri: 0x4f46e5,
    dhaba_wala: 0xd97706,
    villager: 0xd97706,
  };
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.55, 0.32),
    new THREE.MeshStandardMaterial({ color: clothes[p.modelStyle], roughness: 0.7 }),
  );
  torso.position.y = 0.4;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), skin);
  head.position.y = 0.85;
  g.add(torso, head);
  if (p.modelStyle === 'villager' || p.modelStyle === 'dhaba_wala') {
    const paghdi = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.19, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 }),
    );
    paghdi.position.y = 0.98;
    g.add(paghdi);
  } else if (p.modelStyle === 'elder_ba') {
    const pallu = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, side: THREE.DoubleSide }),
    );
    pallu.position.y = 0.88;
    g.add(pallu);
  }
  return g;
}
