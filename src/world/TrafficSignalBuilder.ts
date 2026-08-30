import * as THREE from 'three';
import { ResolvedHighwaySegment } from '../data/highwayNetwork';

export interface TrafficSignalInstance {
  group: THREE.Group;
  redMats: THREE.MeshStandardMaterial[];
  amberMats: THREE.MeshStandardMaterial[];
  greenMats: THREE.MeshStandardMaterial[];
  lights: THREE.PointLight[];
  cycleTime: number; // in seconds
  state: 'green' | 'amber' | 'red';
  timerTextMesh?: THREE.Mesh;
  timerCanvas?: HTMLCanvasElement;
  timerTexture?: THREE.CanvasTexture;
}

export class TrafficSignalBuilder {
  private scene: THREE.Scene;
  private signals: TrafficSignalInstance[] = [];

  // Materials
  private poleMat: THREE.MeshStandardMaterial;
  private gantryTrussMat: THREE.MeshStandardMaterial;
  private signalHousingMat: THREE.MeshStandardMaterial;
  private visorMat: THREE.MeshStandardMaterial;
  private concreteMat: THREE.MeshStandardMaterial;
  private hazardStripeMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.poleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.35,
    });

    this.gantryTrussMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.3,
    });

    this.signalHousingMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.8,
    });

    this.visorMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      roughness: 0.9,
    });

    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.9,
    });

    // Yellow and black hazard striped texture
    const stripeCanvas = document.createElement('canvas');
    stripeCanvas.width = 128;
    stripeCanvas.height = 128;
    const sctx = stripeCanvas.getContext('2d')!;
    sctx.fillStyle = '#facc15';
    sctx.fillRect(0, 0, 128, 128);
    sctx.fillStyle = '#0f172a';
    for (let i = -128; i < 256; i += 32) {
      sctx.beginPath();
      sctx.moveTo(i, 0);
      sctx.lineTo(i + 32, 128);
      sctx.lineTo(i + 16, 128);
      sctx.lineTo(i - 16, 0);
      sctx.fill();
    }
    const stripeTex = new THREE.CanvasTexture(stripeCanvas);
    stripeTex.wrapS = THREE.RepeatWrapping;
    stripeTex.wrapT = THREE.RepeatWrapping;
    stripeTex.repeat.set(1, 4);

    this.hazardStripeMat = new THREE.MeshStandardMaterial({
      map: stripeTex,
      roughness: 0.6,
    });
  }

  /**
   * Build wide traffic signal gantries at critical highway junctions and approaches
   */
  public buildAllSignals(segments: ResolvedHighwaySegment[], parent: THREE.Object3D) {
    // Place wide signals at junction approaches (approx 25-35m before junction) and mid-highway crossings
    for (const seg of segments) {
      if (!seg.corridor.hasSignalGantry) continue;

      const { start, end, angle, distance, corridor } = seg;
      const dx = end.x - start.x;
      const dz = end.z - start.z;

      // 1. Approach Signal at ~35m from start junction
      if (distance > 80) {
        const tStart = 35 / distance;
        const posX = start.x + dx * tStart;
        const posZ = start.z + dz * tStart;
        this.createWideGantrySignal(
          parent,
          posX,
          posZ,
          angle,
          seg.width,
          `🚦 ${corridor.code} ટ્રાફિક સિગ્નલ`,
          `SPEED LIMIT ${corridor.speedLimit} KM/H`
        );
      }

      // 2. Approach Signal at ~35m before end junction
      if (distance > 120) {
        const tEnd = (distance - 35) / distance;
        const posX = start.x + dx * tEnd;
        const posZ = start.z + dz * tEnd;
        this.createWideGantrySignal(
          parent,
          posX,
          posZ,
          angle + Math.PI,
          seg.width,
          `🚦 ${seg.toLoc.nameGujarati} પ્રવેશ સિગ્નલ`,
          `લાલ લાઈટે થોભો | STOP ON RED`
        );
      }
    }
  }

  /**
   * Create a wide multi-lane traffic signal gantry spanning the full road width
   */
  public createWideGantrySignal(
    parent: THREE.Object3D,
    x: number,
    z: number,
    roadAngle: number,
    roadWidth: number,
    titleGujarati: string,
    subText: string
  ): TrafficSignalInstance {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = roadAngle;

    const spanWidth = Math.max(16.0, roadWidth + 3.6);
    const gantryHeight = 7.2;
    const halfSpan = spanWidth / 2;

    // 1. Concrete Crash Barriers (Jersey Barriers) at footings
    [-halfSpan, halfSpan].forEach((px) => {
      const footing = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.0, 3.2),
        this.concreteMat
      );
      footing.position.set(px, 0.5, 0);
      footing.castShadow = true;
      footing.receiveShadow = true;
      group.add(footing);
    });

    // 2. Vertical Support Columns with Hazard Stripes
    [-halfSpan, halfSpan].forEach((px) => {
      // Base striped sleeve
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.45, 2.5, 16),
        this.hazardStripeMat
      );
      sleeve.position.set(px, 2.25, 0);
      sleeve.castShadow = true;
      group.add(sleeve);

      // Upper steel pillar
      const upperPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.35, gantryHeight - 2.5, 16),
        this.poleMat
      );
      upperPillar.position.set(px, 2.5 + (gantryHeight - 2.5) / 2, 0);
      upperPillar.castShadow = true;
      group.add(upperPillar);
    });

    // 3. Overhead Horizontal Gantry Truss Box (spanning across the road)
    const trussLength = spanWidth + 1.2;
    const mainBeamTop = new THREE.Mesh(
      new THREE.BoxGeometry(trussLength, 0.35, 0.35),
      this.gantryTrussMat
    );
    mainBeamTop.position.set(0, gantryHeight, 0.3);

    const mainBeamBottom = new THREE.Mesh(
      new THREE.BoxGeometry(trussLength, 0.35, 0.35),
      this.gantryTrussMat
    );
    mainBeamBottom.position.set(0, gantryHeight - 1.4, 0.3);

    // Cross truss diagonals
    const trussGroup = new THREE.Group();
    trussGroup.add(mainBeamTop, mainBeamBottom);

    const crossSteps = Math.floor(trussLength / 2.2);
    for (let c = 0; c <= crossSteps; c++) {
      const cx = -trussLength / 2 + c * 2.2;
      const verticalStrut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.4, 8),
        this.gantryTrussMat
      );
      verticalStrut.position.set(cx, gantryHeight - 0.7, 0.3);
      trussGroup.add(verticalStrut);

      if (c < crossSteps) {
        const diagonalStrut = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8),
          this.gantryTrussMat
        );
        diagonalStrut.rotation.z = Math.atan2(1.4, 2.2);
        diagonalStrut.position.set(cx + 1.1, gantryHeight - 0.7, 0.3);
        trussGroup.add(diagonalStrut);
      }
    }
    group.add(trussGroup);

    // 4. Overhead VMS Electronic Message Board
    const vmsWidth = 7.5;
    const vmsHeight = 1.6;
    const vmsCanvas = document.createElement('canvas');
    vmsCanvas.width = 1024;
    vmsCanvas.height = 256;
    const vctx = vmsCanvas.getContext('2d')!;
    vctx.fillStyle = '#020617';
    vctx.fillRect(0, 0, 1024, 256);
    vctx.strokeStyle = '#f59e0b';
    vctx.lineWidth = 10;
    vctx.strokeRect(6, 6, 1012, 244);

    vctx.fillStyle = '#fde047';
    vctx.font = 'bold 44px "Noto Sans Gujarati", sans-serif';
    vctx.textAlign = 'center';
    vctx.textBaseline = 'middle';
    vctx.fillText(titleGujarati, 512, 65);

    vctx.fillStyle = '#38bdf8';
    vctx.font = 'bold 36px sans-serif';
    vctx.fillText(subText, 512, 140);

    vctx.fillStyle = '#22c55e';
    vctx.font = 'bold 28px sans-serif';
    vctx.fillText('🚦 GUJARAT STATE HIGHWAY TRAFFIC CONTROL 🚦', 512, 205);

    const vmsTex = new THREE.CanvasTexture(vmsCanvas);
    const vmsBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(vmsWidth, vmsHeight),
      new THREE.MeshBasicMaterial({ map: vmsTex, side: THREE.DoubleSide })
    );
    vmsBoard.position.set(0, gantryHeight - 0.7, 0.65);
    group.add(vmsBoard);

    // 5. Build High-Lumen Traffic Signal Heads hanging over each driving lane
    const redMats: THREE.MeshStandardMaterial[] = [];
    const amberMats: THREE.MeshStandardMaterial[] = [];
    const greenMats: THREE.MeshStandardMaterial[] = [];
    const lights: THREE.PointLight[] = [];

    // Lane positions hanging over roadway (Left lane, Center-Right lane, Right turn)
    const signalXPositions = [-halfSpan + 4.0, 0, halfSpan - 4.0];

    signalXPositions.forEach((sx) => {
      const headGroup = new THREE.Group();
      headGroup.position.set(sx, gantryHeight - 2.6, 0.35);

      // Support bracket pipe from gantry
      const hanger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 1.2, 8),
        this.poleMat
      );
      hanger.position.set(0, 1.2, 0);
      headGroup.add(hanger);

      // Backboard / Signal Housing Box
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 2.4, 0.5),
        this.signalHousingMat
      );
      housing.position.set(0, 0, 0);
      housing.castShadow = true;
      headGroup.add(housing);

      // Yellow reflective backplate border
      const backplate = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 2.7, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      backplate.position.set(0, 0, -0.22);
      headGroup.add(backplate);

      // 3 Aspect Lenses: Red (top), Amber (mid), Green (bot)
      const lensGeo = new THREE.SphereGeometry(0.24, 16, 16);

      // RED
      const redMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.1,
        roughness: 0.2,
      });
      const redLens = new THREE.Mesh(lensGeo, redMat);
      redLens.scale.set(1, 1, 0.45);
      redLens.position.set(0, 0.72, 0.26);
      redMats.push(redMat);

      // AMBER
      const amberMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.1,
        roughness: 0.2,
      });
      const amberLens = new THREE.Mesh(lensGeo, amberMat);
      amberLens.scale.set(1, 1, 0.45);
      amberLens.position.set(0, 0, 0.26);
      amberMats.push(amberMat);

      // GREEN
      const greenMat = new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x22c55e,
        emissiveIntensity: 2.2, // initially Green is ON
        roughness: 0.2,
      });
      const greenLens = new THREE.Mesh(lensGeo, greenMat);
      greenLens.scale.set(1, 1, 0.45);
      greenLens.position.set(0, -0.72, 0.26);
      greenMats.push(greenMat);

      // Deep cylindrical sun-visors (hoods) over lenses
      [0.72, 0, -0.72].forEach((ly) => {
        const visor = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.32, 16, 1, true, 0, Math.PI),
          this.visorMat
        );
        visor.rotation.x = Math.PI / 2;
        visor.position.set(0, ly + 0.08, 0.36);
        headGroup.add(visor);
      });

      headGroup.add(redLens, amberLens, greenLens);

      // Active illuminated point light
      const pLight = new THREE.PointLight(0x22c55e, 3.0, 18);
      pLight.position.set(0, -0.72, 1.2);
      headGroup.add(pLight);
      lights.push(pLight);

      group.add(headGroup);
    });

    // 6. Digital LED Countdown Timer Box next to center signal
    const timerCanvas = document.createElement('canvas');
    timerCanvas.width = 128;
    timerCanvas.height = 128;
    const tctx = timerCanvas.getContext('2d')!;
    tctx.fillStyle = '#020617';
    tctx.fillRect(0, 0, 128, 128);
    tctx.fillStyle = '#22c55e';
    tctx.font = 'bold 78px monospace';
    tctx.textAlign = 'center';
    tctx.textBaseline = 'middle';
    tctx.fillText('28', 64, 64);

    const timerTexture = new THREE.CanvasTexture(timerCanvas);
    const timerMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ map: timerTexture, side: THREE.DoubleSide })
    );
    timerMesh.position.set(2.2, gantryHeight - 2.6, 0.65);
    group.add(timerMesh);

    // 7. Roadside Pedestrian Crossing Box at Curbs
    const pedPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 3.2, 8),
      this.poleMat
    );
    pedPost.position.set(halfSpan - 1.0, 1.6, 0);
    const pedBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.75, 0.3),
      this.signalHousingMat
    );
    pedBox.position.set(halfSpan - 1.0, 2.4, 0);
    group.add(pedPost, pedBox);

    // 8. Zebra Crossing & STOP Line painted on asphalt under/before the signal
    const zebraGroup = new THREE.Group();
    const zebraMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // STOP Line (thick white line 10m before signal)
    const stopLine = new THREE.Mesh(
      new THREE.PlaneGeometry(roadWidth, 0.8),
      zebraMat
    );
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(0, 0.052, 8.0);
    zebraGroup.add(stopLine);

    // Zebra stripes
    const stripeCount = Math.floor(roadWidth / 1.5);
    for (let s = 0; s < stripeCount; s++) {
      const zx = -roadWidth / 2 + (s + 0.5) * 1.5;
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(0.75, 4.2),
        zebraMat
      );
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(zx, 0.052, 2.5);
      zebraGroup.add(stripe);
    }
    group.add(zebraGroup);

    parent.add(group);

    const instance: TrafficSignalInstance = {
      group,
      redMats,
      amberMats,
      greenMats,
      lights,
      cycleTime: Math.random() * 25,
      state: 'green',
      timerTextMesh: timerMesh,
      timerCanvas,
      timerTexture,
    };

    this.signals.push(instance);
    return instance;
  }

  /**
   * Update active traffic signal cycles (Green -> Amber -> Red -> Green) and animated LED countdowns
   */
  public update(delta: number) {
    const totalCycle = 28; // 14s Green, 3s Amber, 11s Red

    for (const sig of this.signals) {
      sig.cycleTime = (sig.cycleTime + delta) % totalCycle;
      let newState: 'green' | 'amber' | 'red' = 'green';
      let remainingSec = 0;

      if (sig.cycleTime < 14) {
        newState = 'green';
        remainingSec = Math.ceil(14 - sig.cycleTime);
      } else if (sig.cycleTime < 17) {
        newState = 'amber';
        remainingSec = Math.ceil(17 - sig.cycleTime);
      } else {
        newState = 'red';
        remainingSec = Math.ceil(totalCycle - sig.cycleTime);
      }

      // Update lamp emissive intensities
      if (newState !== sig.state) {
        sig.state = newState;

        const isGreen = newState === 'green';
        const isAmber = newState === 'amber';
        const isRed = newState === 'red';

        sig.greenMats.forEach((m) => {
          m.emissiveIntensity = isGreen ? 2.5 : 0.08;
        });
        sig.amberMats.forEach((m) => {
          m.emissiveIntensity = isAmber ? 2.8 : 0.08;
        });
        sig.redMats.forEach((m) => {
          m.emissiveIntensity = isRed ? 2.8 : 0.08;
        });

        const activeColor = isGreen ? 0x22c55e : isAmber ? 0xf59e0b : 0xef4444;
        sig.lights.forEach((l) => {
          l.color.setHex(activeColor);
          l.intensity = 3.2;
        });
      }

      // Update countdown texture
      if (sig.timerCanvas && sig.timerTexture) {
        const tctx = sig.timerCanvas.getContext('2d');
        if (tctx) {
          tctx.fillStyle = '#020617';
          tctx.fillRect(0, 0, 128, 128);
          tctx.fillStyle = sig.state === 'green' ? '#22c55e' : sig.state === 'amber' ? '#f59e0b' : '#ef4444';
          tctx.font = 'bold 76px monospace';
          tctx.textAlign = 'center';
          tctx.textBaseline = 'middle';
          tctx.fillText(String(remainingSec).padStart(2, '0'), 64, 64);
          sig.timerTexture.needsUpdate = true;
        }
      }
    }
  }

  public destroy() {
    for (const s of this.signals) {
      this.scene.remove(s.group);
    }
    this.signals = [];
  }
}
