import * as THREE from 'three';
import { ChhakaroCustomization, PassengerData } from '../types';

export class ChhakaroModel {
  public group: THREE.Group;
  public frontForkGroup: THREE.Group;
  public frontWheelMesh: THREE.Mesh;
  public rearLeftWheelMesh: THREE.Mesh;
  public rearRightWheelMesh: THREE.Mesh;
  public flywheelMesh: THREE.Mesh;
  public exhaustParticles: THREE.Points;
  public steamParticles: THREE.Points;
  public spotLight: THREE.SpotLight;
  public spotLightTarget: THREE.Object3D;
  public headLightGlow: THREE.PointLight;
  public brakeLightLeft: THREE.PointLight;
  public brakeLightRight: THREE.PointLight;
  public brakeLightMeshLeft: THREE.Mesh;
  public brakeLightMeshRight: THREE.Mesh;
  public indicatorLightLeft: THREE.PointLight;
  public indicatorLightRight: THREE.PointLight;
  public flagMesh: THREE.Mesh;
  public bodyMesh: THREE.Mesh;
  public signPlateMesh: THREE.Mesh;
  public passengerGroup: THREE.Group;

  private customization: ChhakaroCustomization;
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private particleLifetimes: Float32Array;
  private particleCount = 45;


  constructor(customization: ChhakaroCustomization) {
    this.customization = customization;
    this.group = new THREE.Group();
    this.group.name = 'Chhakaro';

    // Materials
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.2,
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.7,
      roughness: 0.5,
    });

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.85,
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xe6b800, // Gujarati yellow rims
      metalness: 0.6,
      roughness: 0.3,
    });

    const bodyMat = new THREE.MeshStandardMaterial({
      color: this.customization.bodyColor || 0xd9531e, // Saurashtra vibrant saffron/red-orange
      roughness: 0.4,
      metalness: 0.3,
    });

    const seatMat = new THREE.MeshStandardMaterial({
      color: 0x7c2d12, // Warm brown
      roughness: 0.9,
    });

    const woodSlatMat = new THREE.MeshStandardMaterial({
      color: 0x15803d, // Green traditional side bars
      roughness: 0.6,
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.8,
      roughness: 0.3,
    });

    // 1. MAIN CHASSIS FRAME
    const chassisGeo = new THREE.BoxGeometry(1.6, 0.2, 3.2);
    const chassis = new THREE.Mesh(chassisGeo, ironMat);
    chassis.position.set(0, 0.4, 0);
    chassis.castShadow = true;
    this.group.add(chassis);

    // 2. REAR CARGO & PASSENGER CABIN
    const bodyGeo = new THREE.BoxGeometry(1.7, 0.8, 2.0);
    this.bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    this.bodyMesh.position.set(0, 0.9, 0.5);
    this.bodyMesh.castShadow = true;
    this.group.add(this.bodyMesh);

    // Wooden / Metal decorated side railings (Railing bars)
    const sideRailLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 2.0), woodSlatMat);
    sideRailLeft.position.set(-0.85, 1.4, 0.5);
    this.group.add(sideRailLeft);

    const sideRailRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 2.0), woodSlatMat);
    sideRailRight.position.set(0.85, 1.4, 0.5);
    this.group.add(sideRailRight);

    // Metal canopy support pillars & Top roof frame
    const canopyPillarsGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2);
    const p1 = new THREE.Mesh(canopyPillarsGeo, chromeMat);
    p1.position.set(-0.8, 1.6, -0.4);
    const p2 = new THREE.Mesh(canopyPillarsGeo, chromeMat);
    p2.position.set(0.8, 1.6, -0.4);
    const p3 = new THREE.Mesh(canopyPillarsGeo, chromeMat);
    p3.position.set(-0.8, 1.6, 1.4);
    const p4 = new THREE.Mesh(canopyPillarsGeo, chromeMat);
    p4.position.set(0.8, 1.6, 1.4);
    this.group.add(p1, p2, p3, p4);

    // Ornate Roof canopy
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a, // Festive yellow fabric roof
      roughness: 0.8,
    });
    const roofGeo = new THREE.BoxGeometry(1.85, 0.1, 2.1);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 2.2, 0.5);
    roof.castShadow = true;
    this.group.add(roof);

    // Passenger Bench Seats
    const seatGeo = new THREE.BoxGeometry(1.5, 0.15, 0.6);
    const seat1 = new THREE.Mesh(seatGeo, seatMat);
    seat1.position.set(0, 0.8, 0.2);
    const seat2 = new THREE.Mesh(seatGeo, seatMat);
    seat2.position.set(0, 0.8, 1.0);
    this.group.add(seat1, seat2);

    // 3. FRONT MOTORCYCLE CABIN & STEERING FORK
    this.frontForkGroup = new THREE.Group();
    this.frontForkGroup.position.set(0, 0.5, -1.3);

    // Front fork legs
    const forkLegGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1);
    const forkLeft = new THREE.Mesh(forkLegGeo, chromeMat);
    forkLeft.position.set(-0.22, 0.2, 0);
    const forkRight = new THREE.Mesh(forkLegGeo, chromeMat);
    forkRight.position.set(0.22, 0.2, 0);
    this.frontForkGroup.add(forkLeft, forkRight);

    // Chrome Handlebars
    const handleBarCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.0), chromeMat);
    handleBarCenter.rotation.z = Math.PI / 2;
    handleBarCenter.position.set(0, 0.8, 0);
    this.frontForkGroup.add(handleBarCenter);

    // Handlebar grips
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const gripL = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2), gripMat);
    gripL.rotation.z = Math.PI / 2;
    gripL.position.set(-0.45, 0.8, 0);
    const gripR = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.2), gripMat);
    gripR.rotation.z = Math.PI / 2;
    gripR.position.set(0.45, 0.8, 0);
    this.frontForkGroup.add(gripL, gripR);

    // Round Rearview Mirrors
    const mirrorStemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35);
    const stemL = new THREE.Mesh(mirrorStemGeo, chromeMat);
    stemL.position.set(-0.48, 0.95, -0.05);
    stemL.rotation.x = 0.2;
    const stemR = new THREE.Mesh(mirrorStemGeo, chromeMat);
    stemR.position.set(0.48, 0.95, -0.05);
    stemR.rotation.x = 0.2;

    const mirrorGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.95, roughness: 0.05 })
    );
    mirrorGlass.rotation.x = Math.PI / 2;
    mirrorGlass.position.set(0, 0.18, 0);
    stemL.add(mirrorGlass.clone());
    stemR.add(mirrorGlass);
    this.frontForkGroup.add(stemL, stemR);

    // Front Mudguard
    const mudguardGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.35, 16, 1, true, 0, Math.PI * 0.7);
    const mudguardMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Deep blue mudguard
      side: THREE.DoubleSide,
      roughness: 0.4,
    });
    const mudguard = new THREE.Mesh(mudguardGeo, mudguardMat);
    mudguard.rotation.x = -Math.PI * 0.35;
    mudguard.rotation.z = Math.PI / 2;
    mudguard.position.set(0, 0.15, 0);
    this.frontForkGroup.add(mudguard);

    // Front Single Wheel
    this.frontWheelMesh = this.createWheel(tireMat, rimMat, 0.45, 0.22);
    this.frontWheelMesh.position.set(0, 0, 0);
    this.frontForkGroup.add(this.frontWheelMesh);

    // Vintage Chrome Headlight
    const headlightCaseGeo = new THREE.SphereGeometry(0.18, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const headlightCase = new THREE.Mesh(headlightCaseGeo, chromeMat);
    headlightCase.rotation.x = Math.PI / 2;
    headlightCase.position.set(0, 0.6, -0.2);

    const headlightGlass = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xffedd5,
        emissiveIntensity: 0.8,
      })
    );
    headlightGlass.position.set(0, 0.6, -0.36);
    headlightGlass.rotation.y = Math.PI;

    this.frontForkGroup.add(headlightCase);
    this.frontForkGroup.add(headlightGlass);

    // Traditional Bulb Horn (brass squeeze bulb horn)
    const hornHorn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 12), brassMat);
    hornHorn.rotation.x = -Math.PI / 2;
    hornHorn.position.set(0.35, 0.72, -0.15);
    const hornBulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), new THREE.MeshStandardMaterial({ color: 0x991b1b }));
    hornBulb.position.set(0.35, 0.72, 0.05);
    this.frontForkGroup.add(hornHorn, hornBulb);

    // Lemon-Chili "નજરબટ્ટુ" / Tassels hanging on front
    const tasselGroup = new THREE.Group();
    tasselGroup.position.set(0, 0.1, -0.25);
    const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    const chili1 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.12), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    chili1.position.set(-0.03, -0.06, 0);
    chili1.rotation.z = 0.2;
    const chili2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.005, 0.12), new THREE.MeshStandardMaterial({ color: 0x16a34a }));
    chili2.position.set(0.03, -0.06, 0);
    chili2.rotation.z = -0.2;
    tasselGroup.add(lemon, chili1, chili2);
    this.frontForkGroup.add(tasselGroup);

    this.group.add(this.frontForkGroup);

    // 4. REAL LIGHT SOURCES
    this.spotLightTarget = new THREE.Object3D();
    this.spotLightTarget.position.set(0, 0.2, -18);
    this.group.add(this.spotLightTarget);

    this.spotLight = new THREE.SpotLight(0xfffaed, 8.0, 45, Math.PI / 6, 0.4, 1.2);
    this.spotLight.position.set(0, 1.1, -1.4);
    this.spotLight.target = this.spotLightTarget;
    this.spotLight.castShadow = true;
    this.spotLight.shadow.bias = -0.002;
    this.group.add(this.spotLight);

    this.headLightGlow = new THREE.PointLight(0xfffaed, 1.5, 6);
    this.headLightGlow.position.set(0, 1.1, -1.6);
    this.group.add(this.headLightGlow);

    // 5. HEAVY DIESEL ENGINE BLOCK & PULLEY
    const engineGroup = new THREE.Group();
    engineGroup.position.set(0, 0.65, -0.5);

    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.8), ironMat);
    engineGroup.add(engineBlock);

    // Rotating flywheel pulley (Side flywheel)
    this.flywheelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), brassMat);
    this.flywheelMesh.rotation.z = Math.PI / 2;
    this.flywheelMesh.position.set(0.38, 0, 0);
    engineGroup.add(this.flywheelMesh);

    // Diesel Fuel tank (vintage green / red cylindrical tank)
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.3 });
    const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 16), tankMat);
    fuelTank.rotation.z = Math.PI / 2;
    fuelTank.position.set(0, 0.42, 0);
    engineGroup.add(fuelTank);

    // Chrome Exhaust Pipe pointing upward
    const exhaustPipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8);
    const exhaustPipe = new THREE.Mesh(exhaustPipeGeo, chromeMat);
    exhaustPipe.position.set(-0.38, 0.5, 0.2);
    engineGroup.add(exhaustPipe);

    this.group.add(engineGroup);

    // 6. REAR WHEELS & AXLE
    this.rearLeftWheelMesh = this.createWheel(tireMat, rimMat, 0.48, 0.26);
    this.rearLeftWheelMesh.position.set(-0.92, 0.48, 0.85);
    this.group.add(this.rearLeftWheelMesh);

    this.rearRightWheelMesh = this.createWheel(tireMat, rimMat, 0.48, 0.26);
    this.rearRightWheelMesh.position.set(0.92, 0.48, 0.85);
    this.group.add(this.rearRightWheelMesh);

    // Rear Axle
    const rearAxle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8), ironMat);
    rearAxle.rotation.z = Math.PI / 2;
    rearAxle.position.set(0, 0.48, 0.85);
    this.group.add(rearAxle);

    // 7. GUJARATI ARTWORK / STICKER REAR SIGNBOARD
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sctx = signCanvas.getContext('2d')!;
    sctx.fillStyle = '#f59e0b';
    sctx.fillRect(0, 0, 512, 128);
    sctx.fillStyle = '#dc2626';
    sctx.fillRect(8, 8, 496, 112);
    sctx.fillStyle = '#ffffff';
    sctx.font = 'bold 44px sans-serif';
    sctx.textAlign = 'center';
    sctx.textBaseline = 'middle';
    sctx.fillText(this.customization.stickerText || 'જય ગરવી ગુજરાત', 256, 64);

    const signTexture = new THREE.CanvasTexture(signCanvas);
    const signGeo = new THREE.PlaneGeometry(1.4, 0.35);
    const signMat = new THREE.MeshBasicMaterial({ map: signTexture, side: THREE.DoubleSide });
    this.signPlateMesh = new THREE.Mesh(signGeo, signMat);
    this.signPlateMesh.position.set(0, 0.65, 1.51);
    this.group.add(this.signPlateMesh);

    // 8. BRAKE LIGHTS
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.8,
    });
    this.brakeLightMeshLeft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04), brakeMat);
    this.brakeLightMeshLeft.rotation.x = Math.PI / 2;
    this.brakeLightMeshLeft.position.set(-0.7, 0.65, 1.51);

    this.brakeLightMeshRight = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04), brakeMat);
    this.brakeLightMeshRight.rotation.x = Math.PI / 2;
    this.brakeLightMeshRight.position.set(0.7, 0.65, 1.51);

    this.group.add(this.brakeLightMeshLeft, this.brakeLightMeshRight);

    this.brakeLightLeft = new THREE.PointLight(0xff0000, 0, 5);
    this.brakeLightLeft.position.set(-0.7, 0.65, 1.6);
    this.brakeLightRight = new THREE.PointLight(0xff0000, 0, 5);
    this.brakeLightRight.position.set(0.7, 0.65, 1.6);
    this.group.add(this.brakeLightLeft, this.brakeLightRight);

    // 9. FESTIVE FLAG (Saffron / Religious fluttering flag)
    const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5), chromeMat);
    flagPole.position.set(-0.8, 2.3, 1.4);
    this.group.add(flagPole);

    const flagGeo = new THREE.PlaneGeometry(0.45, 0.3, 8, 4);
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Saffron flag
      side: THREE.DoubleSide,
      roughness: 0.8,
    });
    this.flagMesh = new THREE.Mesh(flagGeo, flagMat);
    this.flagMesh.position.set(-0.8, 2.8, 1.2);
    this.flagMesh.rotation.y = Math.PI / 2;
    this.group.add(this.flagMesh);

    // 10. EXHAUST SMOKE PARTICLES SYSTEM
    const pGeo = new THREE.BufferGeometry();
    this.particlePositions = new Float32Array(this.particleCount * 3);
    this.particleVelocities = new Float32Array(this.particleCount * 3);
    this.particleLifetimes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i, 0);
      this.particleLifetimes[i] = Math.random(); // Initial stagger
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x888888,
      size: 0.18,
      transparent: true,
      opacity: 0.45,
    });
    this.exhaustParticles = new THREE.Points(pGeo, pMat);
    this.group.add(this.exhaustParticles);

    // 11. AMBER HAZARD / INDICATOR LIGHTS
    this.indicatorLightLeft = new THREE.PointLight(0xf59e0b, 0, 4);
    this.indicatorLightLeft.position.set(-0.9, 0.9, 0.5);
    this.indicatorLightRight = new THREE.PointLight(0xf59e0b, 0, 4);
    this.indicatorLightRight.position.set(0.9, 0.9, 0.5);
    this.group.add(this.indicatorLightLeft, this.indicatorLightRight);

    // 12. PASSENGER GROUP
    this.passengerGroup = new THREE.Group();
    this.group.add(this.passengerGroup);
  }

  public setPassenger(passenger: PassengerData | null) {
    // Clear old passenger mesh
    while (this.passengerGroup.children.length > 0) {
      const child = this.passengerGroup.children[0];
      this.passengerGroup.remove(child);
    }

    if (!passenger) return;

    // Create 3D Passenger sitting in the rear bench
    const pMesh = new THREE.Group();
    pMesh.position.set(0, 0.9, 0.6); // Position on rear seat

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 });
    let clothesColor = 0xd97706; // Default saffron / gold
    let turbanColor = 0xdc2626; // Red paghdi

    if (passenger.modelStyle === 'elder_ba') {
      clothesColor = 0xf8fafc; // White/red saree
      turbanColor = 0xd97706;
    } else if (passenger.modelStyle === 'tourist') {
      clothesColor = 0x0284c7; // Blue shirt
    } else if (passenger.modelStyle === 'student') {
      clothesColor = 0x16a34a; // Green kurta
    } else if (passenger.modelStyle === 'nri') {
      clothesColor = 0x4f46e5; // Indigo jacket
    }

    const clothMat = new THREE.MeshStandardMaterial({ color: clothesColor, roughness: 0.7 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.35), clothMat);
    torso.position.set(0, 0.45, 0);
    pMesh.add(torso);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), skinMat);
    head.position.set(0, 0.95, 0);
    pMesh.add(head);

    // Headgear / Turban / Saree Pallu
    if (passenger.modelStyle === 'elder_ba') {
      // Saree Pallu over head
      const pallu = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 10, 10, 0, Math.PI * 2, 0, Math.PI * 0.6),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, side: THREE.DoubleSide })
      );
      pallu.position.set(0, 0.98, -0.02);
      pMesh.add(pallu);
    } else if (passenger.modelStyle === 'villager' || passenger.modelStyle === 'dhaba_wala') {
      // Gujarati Paghdi
      const paghdi = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.22, 0.16, 12),
        new THREE.MeshStandardMaterial({ color: turbanColor })
      );
      paghdi.position.set(0, 1.1, 0);
      pMesh.add(paghdi);
    } else if (passenger.modelStyle === 'nri') {
      // Sunglasses
      const shades = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.08, 0.08),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 })
      );
      shades.position.set(0, 0.98, -0.16);
      pMesh.add(shades);
    }

    // Sitting Legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), legMat);
    legLeft.position.set(-0.16, 0.1, -0.2);
    const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.5), legMat);
    legRight.position.set(0.16, 0.1, -0.2);
    pMesh.add(legLeft, legRight);

    this.passengerGroup.add(pMesh);
  }

  private createWheel(tireMat: THREE.Material, rimMat: THREE.Material, radius: number, width: number): THREE.Mesh {
    const wheelGroup = new THREE.Group();

    // Rubber Tire
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Yellow / Chrome Rim
    const rimGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, width * 1.05, 12);
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.z = Math.PI / 2;
    wheelGroup.add(rim);

    // Wheel spokes & hubcap
    const hubGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, width * 1.15, 8);
    const hub = new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    hub.rotation.z = Math.PI / 2;
    wheelGroup.add(hub);

    const merged = new THREE.Mesh();
    merged.add(wheelGroup);
    return merged;
  }

  private resetParticle(index: number, speed: number) {
    const i3 = index * 3;
    // Exhaust pipe local position (-0.38, 1.15, -0.3)
    this.particlePositions[i3] = -0.38 + (Math.random() - 0.5) * 0.05;
    this.particlePositions[i3 + 1] = 1.15;
    this.particlePositions[i3 + 2] = -0.3;

    this.particleVelocities[i3] = (Math.random() - 0.5) * 0.15;
    this.particleVelocities[i3 + 1] = 0.5 + Math.random() * 0.4;
    this.particleVelocities[i3 + 2] = 0.3 + (Math.abs(speed) / 20) * 0.8 + Math.random() * 0.3;

    this.particleLifetimes[index] = 0;
  }

  public update(
    delta: number,
    speed: number,
    steerAngle: number,
    isBraking: boolean,
    isHeadlightOn: boolean,
    isHazardOn: boolean = false,
    hasPuncture: boolean = false
  ) {
    // 1. Front wheel steering rotation
    this.frontForkGroup.rotation.y = steerAngle;

    // 2. Rolling wheels based on speed
    const wheelRotSpeed = (speed / 0.45) * delta;
    this.frontWheelMesh.rotation.x += wheelRotSpeed;
    this.rearLeftWheelMesh.rotation.x += wheelRotSpeed;
    this.rearRightWheelMesh.rotation.x += wheelRotSpeed;

    // 3. Spinning diesel flywheel
    const flywheelSpeed = 20 + Math.abs(speed) * 2.5;
    this.flywheelMesh.rotation.y += flywheelSpeed * delta;

    // 4. Diesel engine vibration + Puncture wobble
    const engineVibe = Math.sin(Date.now() * 0.045) * 0.006;
    const punctureWobble = hasPuncture ? Math.sin(Date.now() * 0.02) * 0.03 : 0;
    this.group.position.y = engineVibe + punctureWobble;
    if (hasPuncture) {
      this.group.rotation.z = Math.sin(Date.now() * 0.015) * 0.04;
    } else {
      this.group.rotation.z = 0;
    }

    // 5. Fluttering Gujarati saffron flag
    if (this.flagMesh) {
      this.flagMesh.rotation.y = Math.PI / 2 + Math.sin(Date.now() * 0.012 + speed * 0.2) * 0.25;
    }

    // 6. Brake lights
    if (isBraking) {
      this.brakeLightLeft.intensity = 2.5;
      this.brakeLightRight.intensity = 2.5;
    } else {
      this.brakeLightLeft.intensity = 0.1;
      this.brakeLightRight.intensity = 0.1;
    }

    // 7. Headlight
    if (isHeadlightOn) {
      this.spotLight.intensity = 9.0;
      this.headLightGlow.intensity = 2.0;
    } else {
      this.spotLight.intensity = 0;
      this.headLightGlow.intensity = 0;
    }

    // 8. Hazard Indicator Blinking
    if (isHazardOn) {
      const blink = Math.sin(Date.now() * 0.008) > 0;
      this.indicatorLightLeft.intensity = blink ? 3.0 : 0;
      this.indicatorLightRight.intensity = blink ? 3.0 : 0;
    } else {
      this.indicatorLightLeft.intensity = 0;
      this.indicatorLightRight.intensity = 0;
    }

    // 9. Update exhaust smoke particles
    const positions = this.exhaustParticles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.particleLifetimes[i] += delta * 1.5;

      if (this.particleLifetimes[i] >= 1.0) {
        this.resetParticle(i, speed);
      } else {
        positions[i3] += this.particleVelocities[i3] * delta;
        positions[i3 + 1] += this.particleVelocities[i3 + 1] * delta;
        positions[i3 + 2] += this.particleVelocities[i3 + 2] * delta;
      }
    }
    this.exhaustParticles.geometry.attributes.position.needsUpdate = true;
  }


  public updateCustomization(custom: ChhakaroCustomization) {
    this.customization = custom;
    if (this.bodyMesh && (this.bodyMesh.material as THREE.MeshStandardMaterial)) {
      (this.bodyMesh.material as THREE.MeshStandardMaterial).color.set(custom.bodyColor);
    }
    if (this.signPlateMesh) {
      const signCanvas = document.createElement('canvas');
      signCanvas.width = 512;
      signCanvas.height = 128;
      const sctx = signCanvas.getContext('2d')!;
      sctx.fillStyle = '#f59e0b';
      sctx.fillRect(0, 0, 512, 128);
      sctx.fillStyle = '#dc2626';
      sctx.fillRect(8, 8, 496, 112);
      sctx.fillStyle = '#ffffff';
      sctx.font = 'bold 44px sans-serif';
      sctx.textAlign = 'center';
      sctx.textBaseline = 'middle';
      sctx.fillText(custom.stickerText || 'જય ગરવી ગુજરાત', 256, 64);
      (this.signPlateMesh.material as THREE.MeshBasicMaterial).map = new THREE.CanvasTexture(signCanvas);
      (this.signPlateMesh.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }
    if (this.flagMesh && (this.flagMesh.material as THREE.MeshStandardMaterial)) {
      (this.flagMesh.material as THREE.MeshStandardMaterial).color.set(custom.flagColor || 0xf97316);
    }
  }
}
