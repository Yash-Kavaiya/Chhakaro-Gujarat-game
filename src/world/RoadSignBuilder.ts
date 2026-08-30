import * as THREE from 'three';
import { LocationData } from '../types';

interface RoadSegment {
  fromLoc: LocationData;
  toLoc: LocationData;
  startPos: { x: number; z: number };
  endPos: { x: number; z: number };
  angle: number;
  distance: number;
  highwayCode: string;
}

export class RoadSignBuilder {
  private scene: THREE.Scene;
  private poleMat: THREE.MeshStandardMaterial;
  private gantryTrussMat: THREE.MeshStandardMaterial;
  private concreteMat: THREE.MeshStandardMaterial;
  private yellowMilestoneMat: THREE.MeshStandardMaterial;
  private greenMilestoneMat: THREE.MeshStandardMaterial;
  private whiteBaseMat: THREE.MeshStandardMaterial;
  private metalBackMat: THREE.MeshStandardMaterial;
  private warningYellowMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.poleMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.6,
      roughness: 0.35,
    });

    this.gantryTrussMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.7,
      roughness: 0.3,
    });

    this.concreteMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.9,
    });

    this.yellowMilestoneMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.5,
    });

    this.greenMilestoneMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.5,
    });

    this.whiteBaseMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.6,
    });

    this.metalBackMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.5,
      roughness: 0.4,
    });

    this.warningYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
    });
  }

  /**
   * Build complete highway road sign and milestone network along all connected roads
   */
  public buildAllRoadSigns(locations: LocationData[], parentGroup: THREE.Object3D) {
    const segments: RoadSegment[] = [];

    // Derive segments connecting adjacent locations in circuit
    for (let i = 0; i < locations.length; i++) {
      const fromLoc = locations[i];
      const toLoc = locations[(i + 1) % locations.length];

      const dx = toLoc.worldPosition.x - fromLoc.worldPosition.x;
      const dz = toLoc.worldPosition.z - fromLoc.worldPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      // Assign realistic Gujarat National & State highway codes
      const highwayCodes = ['NH-27', 'NH-51', 'NH-8D', 'GJ-SH-26', 'NH-48', 'GJ-SH-17', 'NH-151', 'NH-56'];
      const highwayCode = highwayCodes[i % highwayCodes.length];

      segments.push({
        fromLoc,
        toLoc,
        startPos: fromLoc.worldPosition,
        endPos: toLoc.worldPosition,
        angle,
        distance: dist,
        highwayCode,
      });
    }

    // Populate road signs along each highway segment
    segments.forEach((seg) => {
      this.populateSegmentSigns(seg, parentGroup);
    });

    // Add landmark entry/junction welcome boards
    locations.forEach((loc) => {
      this.buildLandmarkWelcomeGate(loc, parentGroup);
    });
  }

  /**
   * Populate signs along a single road segment at calculated distances
   */
  private populateSegmentSigns(seg: RoadSegment, parent: THREE.Object3D) {
    const { fromLoc, toLoc, startPos, endPos, angle, distance, highwayCode } = seg;
    const dx = endPos.x - startPos.x;
    const dz = endPos.z - startPos.z;

    // Road shoulder offset vector (perpendicular to road axis)
    const shoulderRightX = Math.cos(angle) * 5.8;
    const shoulderRightZ = -Math.sin(angle) * 5.8;
    const shoulderLeftX = -Math.cos(angle) * 5.8;
    const shoulderLeftZ = Math.sin(angle) * 5.8;

    // 1. Initial Highway Route & Distance Sign at 20% along segment
    const t1 = 0.22;
    const pos1X = startPos.x + dx * t1;
    const pos1Z = startPos.z + dz * t1;
    const distToNext1 = Math.max(5, Math.round((1 - t1) * (distance / 5)));
    const distToPrev1 = Math.max(5, Math.round(t1 * (distance / 5)));

    this.createCantileverHighwaySign(
      parent,
      pos1X + shoulderRightX,
      pos1Z + shoulderRightZ,
      angle,
      toLoc.nameGujarati,
      toLoc.nameEnglish,
      distToNext1,
      fromLoc.nameGujarati,
      distToPrev1,
      highwayCode,
      'forward'
    );

    // 2. Midpoint Overhead Gantry Sign with Dual Destinations at 50% along segment
    const t2 = 0.50;
    const pos2X = startPos.x + dx * t2;
    const pos2Z = startPos.z + dz * t2;
    const distToNext2 = Math.max(4, Math.round((1 - t2) * (distance / 5)));

    this.createOverheadGantry(
      parent,
      pos2X,
      pos2Z,
      angle,
      toLoc.nameGujarati,
      toLoc.nameEnglish,
      distToNext2,
      toLoc.famousFood,
      highwayCode
    );

    // 3. Cultural / Tourism & Caution Signboard at 72% along segment
    const t3 = 0.72;
    const pos3X = startPos.x + dx * t3;
    const pos3Z = startPos.z + dz * t3;
    const distToNext3 = Math.max(2, Math.round((1 - t3) * (distance / 5)));

    this.createCulturalCautionSign(
      parent,
      pos3X + shoulderLeftX,
      pos3Z + shoulderLeftZ,
      angle + Math.PI,
      toLoc,
      distToNext3,
      highwayCode
    );

    // 4. Milestone concrete pillars (કિલોમીટર પથ્થર) every 30-40 world units along road shoulder
    const milestoneCount = Math.floor(distance / 45);
    for (let m = 1; m <= milestoneCount; m++) {
      const tm = m / (milestoneCount + 1);
      const mx = startPos.x + dx * tm + shoulderRightX * 0.92;
      const mz = startPos.z + dz * tm + shoulderRightZ * 0.92;
      const kmRemaining = Math.max(1, Math.round((1 - tm) * (distance / 5)));

      const isNational = m % 2 === 0;
      this.createConcreteMilestone(
        parent,
        mx,
        mz,
        angle,
        toLoc.nameGujarati,
        kmRemaining,
        highwayCode,
        isNational ? 'yellow' : 'green'
      );
    }
  }

  /**
   * Create realistic green Highway Cantilever Direction Board (ગુજરાતી હાઈવે બોર્ડ)
   */
  private createCantileverHighwaySign(
    parent: THREE.Object3D,
    x: number,
    z: number,
    roadAngle: number,
    nextCityGujarati: string,
    nextCityEnglish: string,
    distNextKm: number,
    prevCityGujarati: string,
    distPrevKm: number,
    highwayCode: string,
    direction: 'forward' | 'reverse'
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = -roadAngle + (direction === 'reverse' ? Math.PI : 0);

    // Cantilever Heavy Metallic Pole Structure
    const mainPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 5.8, 12),
      this.poleMat
    );
    mainPole.position.set(0, 2.9, 0);
    mainPole.castShadow = true;
    group.add(mainPole);

    // Horizontal cantilever arm extending towards the road
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8),
      this.poleMat
    );
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-1.8, 5.2, 0);
    arm.castShadow = true;
    group.add(arm);

    // Diagonal support strut
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.4, 8),
      this.poleMat
    );
    strut.rotation.z = Math.PI / 4;
    strut.position.set(-0.8, 4.4, 0);
    group.add(strut);

    // Concrete Footing Foundation
    const footing = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.7),
      this.concreteMat
    );
    footing.position.y = 0.25;
    group.add(footing);

    // Canvas Texture for Road Sign
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // 1. High contrast Indian Highway Green background
    ctx.fillStyle = '#047857';
    ctx.fillRect(0, 0, 1024, 512);

    // Outer & Inner white retro-reflective borders
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(12, 12, 1000, 488);
    ctx.lineWidth = 4;
    ctx.strokeRect(28, 28, 968, 456);

    // Highway Badge (e.g. NH-27)
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(40, 40, 220, 64);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, 220, 64);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(highwayCode, 150, 72);

    // Route Sub-heading
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('ગુજરાત સ્ટેટ હાઇવે ઓથોરિટી', 960, 72);

    // Divider Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 120);
    ctx.lineTo(984, 120);
    ctx.stroke();

    // Primary Forward Destination (Next Landmark)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Straight Ahead Arrow
    ctx.font = 'bold 64px sans-serif';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('↑', 50, 200);

    // Gujarati Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(nextCityGujarati, 130, 190);

    // English Name
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(nextCityEnglish, 130, 240);

    // Distance in KM
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 58px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${distNextKm} KM`, 960, 205);

    // Divider between destinations
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(40, 290);
    ctx.lineTo(984, 290);
    ctx.stroke();

    // Secondary / Reverse Destination
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f87171';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText('←', 50, 370);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(`પાછળ: ${prevCityGujarati}`, 130, 370);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${distPrevKm} KM`, 960, 370);

    // Bottom Slogan / Safety Ribbon
    ctx.fillStyle = '#065f46';
    ctx.fillRect(40, 428, 944, 52);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('નજર હટી દુર્ઘટના ઘટી — ધીમે ચલાવો!', 512, 454);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    // Signboard Plane Mesh
    const boardWidth = 5.2;
    const boardHeight = 2.6;
    const boardMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardWidth, boardHeight), boardMat);
    signMesh.position.set(-1.8, 5.0, 0.05);

    // Metal Frame Backing
    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(boardWidth + 0.1, boardHeight + 0.1, 0.1), this.metalBackMat);
    backMesh.position.set(-1.8, 5.0, 0);

    group.add(signMesh, backMesh);
    parent.add(group);
  }

  /**
   * Create realistic Overhead Highway Gantry spanning the full roadway
   */
  private createOverheadGantry(
    parent: THREE.Object3D,
    x: number,
    z: number,
    roadAngle: number,
    nextCityGujarati: string,
    nextCityEnglish: string,
    distNextKm: number,
    famousFood: string,
    highwayCode: string
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = -roadAngle;

    const spanWidth = 12.0;
    const gantryHeight = 6.8;

    // Left Pillar Post
    const leftPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, gantryHeight, 12),
      this.gantryTrussMat
    );
    leftPost.position.set(-spanWidth / 2, gantryHeight / 2, 0);
    leftPost.castShadow = true;

    // Right Pillar Post
    const rightPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, gantryHeight, 12),
      this.gantryTrussMat
    );
    rightPost.position.set(spanWidth / 2, gantryHeight / 2, 0);
    rightPost.castShadow = true;

    // Top Cross Beam Truss
    const topTruss = new THREE.Mesh(
      new THREE.BoxGeometry(spanWidth + 0.8, 0.45, 0.45),
      this.gantryTrussMat
    );
    topTruss.position.set(0, gantryHeight, 0);
    topTruss.castShadow = true;

    // Lower Support Rail
    const bottomTruss = new THREE.Mesh(
      new THREE.BoxGeometry(spanWidth + 0.8, 0.25, 0.25),
      this.gantryTrussMat
    );
    bottomTruss.position.set(0, gantryHeight - 1.8, 0);

    // Concrete Footings
    const foot1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), this.concreteMat);
    foot1.position.set(-spanWidth / 2, 0.3, 0);
    const foot2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.8), this.concreteMat);
    foot2.position.set(spanWidth / 2, 0.3, 0);

    group.add(leftPost, rightPost, topTruss, bottomTruss, foot1, foot2);

    // Signboard Canvas Texture
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#065f46';
    ctx.fillRect(0, 0, 1280, 360);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 1260, 340);
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, 1232, 312);

    // Highway Code Badge
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(36, 36, 180, 60);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(highwayCode, 126, 66);

    // Destination & Distance in Gujarati & English
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 60px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('↑ સીધા આગળ', 240, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 62px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(nextCityGujarati, 560, 68);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 68px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${distNextKm} KM`, 1230, 70);

    // Divider Line
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(36, 124);
    ctx.lineTo(1244, 124);
    ctx.stroke();

    // Food & Culture Hint Ribbon on Overhead Sign
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 36px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(`🍽️ પ્રખ્યાત વાનગી: ${famousFood}`, 50, 185);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`Keep Left For Slow Moving Vehicles / Chhakado | નિયંત્રિત ગતિમાં ચલાવો`, 50, 245);

    // Solar Powered Blinking Hazard Lights on Top of Gantry
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(60, 305, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('ગુજરાત પર્યટન નિગમ (GUJARAT TOURISM) — ખુશ્બૂ ગુજરાત કી', 90, 305);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const boardWidth = 9.8;
    const boardHeight = 2.75;
    const boardMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardWidth, boardHeight), boardMat);
    signMesh.position.set(0, gantryHeight - 0.9, 0.05);

    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(boardWidth + 0.1, boardHeight + 0.1, 0.1), this.metalBackMat);
    backMesh.position.set(0, gantryHeight - 0.9, 0);

    // Double sided board for oncoming drivers in opposite lane
    const reverseSignMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide });
    const reverseSign = new THREE.Mesh(new THREE.PlaneGeometry(boardWidth, boardHeight), reverseSignMat);
    reverseSign.position.set(0, gantryHeight - 0.9, -0.06);

    group.add(signMesh, backMesh, reverseSign);
    parent.add(group);
  }

  /**
   * Create authentic Cultural Tourism & Road Caution Sign
   */
  private createCulturalCautionSign(
    parent: THREE.Object3D,
    x: number,
    z: number,
    roadAngle: number,
    loc: LocationData,
    distKm: number,
    highwayCode: string
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = -roadAngle;

    // Dual support poles
    const pole1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.6, 8), this.poleMat);
    pole1.position.set(-1.8, 2.3, 0);
    const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.6, 8), this.poleMat);
    pole2.position.set(1.8, 2.3, 0);
    group.add(pole1, pole2);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Brown/Navy Cultural Tourism background
    ctx.fillStyle = '#1e3a8a'; // Deep Indian Tourism Blue
    ctx.fillRect(0, 0, 1024, 512);

    // Yellow & White Border
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 1004, 492);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, 972, 460);

    // Cultural Heading
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 36px "Noto Sans Gujarati", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🚩 પવિત્ર ગુજરાત દર્શન — આગળ ${loc.nameGujarati}`, 512, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(`${loc.nameGujarati} માત્ર ${distKm} KM દૂર છે!`, 512, 145);

    ctx.fillStyle = '#93c5fd';
    ctx.font = 'italic 30px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(`"${loc.tagline.slice(0, 50)}..."`, 512, 215);

    // Road Safety Advice in Gujarati
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(40, 270, 944, 90);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(`⚠️ ધીમે ચલાવો! આગળ ${loc.culturalHighlights[0] || 'મુખ્ય વિસ્તાર'} આવે છે`, 512, 315);
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Speed Limit: 40 km/h | Enjoy Safe Saurashtra & Gujarat Travel`, 512, 345);

    // Bottom Tag
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`HIGHWAY PATROL & AMBULANCE HELPLINE: 108 / 1033 | ${highwayCode}`, 512, 430);

    const texture = new THREE.CanvasTexture(canvas);
    const boardWidth = 4.8;
    const boardHeight = 2.4;
    const boardMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(boardWidth, boardHeight), boardMat);
    signMesh.position.set(0, 3.6, 0.05);

    const backMesh = new THREE.Mesh(new THREE.BoxGeometry(boardWidth + 0.1, boardHeight + 0.1, 0.08), this.metalBackMat);
    backMesh.position.set(0, 3.6, 0);

    group.add(signMesh, backMesh);
    parent.add(group);
  }

  /**
   * Create authentic 3D Indian Concrete Milestone (માઇલસ્ટોન / કિલોમીટર પથ્થર)
   */
  private createConcreteMilestone(
    parent: THREE.Object3D,
    x: number,
    z: number,
    roadAngle: number,
    destinationName: string,
    kmDistance: number,
    highwayCode: string,
    type: 'yellow' | 'green'
  ) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = -roadAngle;

    // 1. Lower rectangular concrete base
    const baseGeo = new THREE.BoxGeometry(0.65, 0.85, 0.45);
    const baseMesh = new THREE.Mesh(baseGeo, this.whiteBaseMat);
    baseMesh.position.y = 0.425;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    // 2. Upper rounded dome
    const domeGeo = new THREE.CylinderGeometry(0.325, 0.325, 0.45, 16);
    const domeMat = type === 'yellow' ? this.yellowMilestoneMat : this.greenMilestoneMat;
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.rotation.z = Math.PI / 2;
    domeMesh.position.set(0, 0.85, 0);
    domeMesh.castShadow = true;
    group.add(domeMesh);

    // 3. Canvas Texture for milestone face
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 384;
    const ctx = canvas.getContext('2d')!;

    // Top Dome Colored Section
    ctx.fillStyle = type === 'yellow' ? '#f59e0b' : '#16a34a';
    ctx.fillRect(0, 0, 256, 130);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(highwayCode.replace('-', ' '), 128, 65);

    // White Lower Base Section
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 130, 256, 254);

    // City Name in Gujarati
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px "Noto Sans Gujarati", sans-serif';
    // Shorten if long
    const cleanCity = destinationName.split(' ')[0].replace('(', '');
    ctx.fillText(cleanCity, 128, 195);

    // KM Distance
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 56px sans-serif';
    ctx.fillText(`${kmDistance}`, 128, 275);

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('KM', 128, 335);

    const texture = new THREE.CanvasTexture(canvas);
    const faceMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

    // Front Face
    const faceFront = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 1.05), faceMat);
    faceFront.position.set(0, 0.65, 0.23);
    group.add(faceFront);

    // Back Face (so visible in opposite driving lane too)
    const faceBack = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 1.05), faceMat);
    faceBack.rotation.y = Math.PI;
    faceBack.position.set(0, 0.65, -0.23);
    group.add(faceBack);

    parent.add(group);
  }

  /**
   * Create Landmark Approach & Welcome Gateway Arch
   */
  private buildLandmarkWelcomeGate(loc: LocationData, parent: THREE.Object3D) {
    const { x, z } = loc.worldPosition;
    const gateGroup = new THREE.Group();
    gateGroup.position.set(x + 22, 0, z + 22);

    // Large Ornate Indian Welcome Signboard
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 360;
    const ctx = canvas.getContext('2d')!;

    // Festive Saffron / Gold Background
    ctx.fillStyle = '#7c2d12'; // Deep terracotta saffron
    ctx.fillRect(0, 0, 1024, 360);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, 1004, 340);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, 972, 308);

    // Welcome Greeting
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 40px "Noto Sans Gujarati", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🙏 પધારો! ${loc.nameGujarati} માં તમારું હાર્દિક સ્વાગત છે 🙏`, 512, 70);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText(`WELCOME TO ${loc.nameEnglish.toUpperCase()}`, 512, 140);

    // Culture Tagline
    ctx.fillStyle = '#fed7aa';
    ctx.font = 'bold 28px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(`${loc.tagline}`, 512, 210);

    // Food Ribbon
    ctx.fillStyle = '#f97316';
    ctx.fillRect(40, 260, 944, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px "Noto Sans Gujarati", sans-serif';
    ctx.fillText(`😋 અસલ સ્વાદ: ${loc.famousFood}`, 512, 298);

    const texture = new THREE.CanvasTexture(canvas);
    const boardMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });

    const archWidth = 10.0;
    const archHeight = 3.5;
    const gateSign = new THREE.Mesh(new THREE.PlaneGeometry(archWidth, archHeight), boardMat);
    gateSign.position.set(0, 6.2, 0);

    // Pillars
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 7.5, 12), this.concreteMat);
    p1.position.set(-archWidth / 2 + 0.5, 3.75, 0);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 7.5, 12), this.concreteMat);
    p2.position.set(archWidth / 2 - 0.5, 3.75, 0);

    // Decorative Pillar Tops (Kalash / Spheres)
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.2 });
    const k1 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), goldMat);
    k1.position.set(-archWidth / 2 + 0.5, 7.8, 0);
    const k2 = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), goldMat);
    k2.position.set(archWidth / 2 - 0.5, 7.8, 0);

    gateGroup.add(gateSign, p1, p2, k1, k2);
    parent.add(gateGroup);
  }
}
