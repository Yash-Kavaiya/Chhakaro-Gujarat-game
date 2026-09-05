import * as THREE from 'three';
import { LocationData } from '../types';
import { getResolvedHighwaySegments } from '../data/highwayNetwork';

export type NPCType =
  | 'kathiyawadi_male'
  | 'garba_female'
  | 'pilgrim_male'
  | 'pilgrim_female'
  | 'kutchi_musician'
  | 'chaiwala'
  | 'maldhari_shepherd'
  | 'child_waver';

export type NPCBehavior = 'idle' | 'walk' | 'garba' | 'wave' | 'pray' | 'pour_tea' | 'dholak';

export interface NPCInstance {
  id: string;
  type: NPCType;
  behavior: NPCBehavior;
  group: THREE.Group;
  basePosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  walkRadius: number;
  walkSpeed: number;
  rotation: number;
  animPhase: number;
  animSpeed: number;
  
  // Skeletal limb nodes for smooth procedural animation
  torsoNode: THREE.Group;
  headNode: THREE.Group;
  leftArmNode: THREE.Group;
  rightArmNode: THREE.Group;
  leftLegNode: THREE.Group;
  rightLegNode: THREE.Group;
  skirtNode?: THREE.Mesh;
  propNode?: THREE.Group;

  // Interaction
  greetingGujarati: string;
  lastGreetTime: number;
  speechBubble?: THREE.Sprite;
  speechBubbleTimeout?: number;
}

export class NPCSystem {
  private scene: THREE.Scene;
  private npcs: NPCInstance[] = [];
  private sharedMaterials: { [key: string]: THREE.Material } = {};

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initSharedMaterials();
  }

  private initSharedMaterials() {
    // Skin tones
    this.sharedMaterials.skinWarm = new THREE.MeshStandardMaterial({ color: 0xdf9b74, roughness: 0.8 });
    this.sharedMaterials.skinDeep = new THREE.MeshStandardMaterial({ color: 0xb87348, roughness: 0.8 });
    this.sharedMaterials.skinFair = new THREE.MeshStandardMaterial({ color: 0xebb18b, roughness: 0.8 });

    // Traditional Garments
    this.sharedMaterials.kediyuWhite = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.7 });
    this.sharedMaterials.kediyuMaroon = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.6 });
    this.sharedMaterials.kediyuYellow = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
    this.sharedMaterials.dhotiWhite = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.8 });
    this.sharedMaterials.saffron = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.7 });
    this.sharedMaterials.crimsonPaghdi = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.6 });
    this.sharedMaterials.goldPaghdi = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    this.sharedMaterials.royalBlue = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 });
    this.sharedMaterials.emeraldGreen = new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.6 });
    this.sharedMaterials.magentaCholi = new THREE.MeshStandardMaterial({ color: 0xc026d3, roughness: 0.5 });
    this.sharedMaterials.pinkCholi = new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.5 });
    this.sharedMaterials.blackMirror = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 });
    this.sharedMaterials.brass = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.25 });
    this.sharedMaterials.wood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    this.sharedMaterials.silver = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.2 });
  }

  /**
   * Spawn authentic Gujarati NPC clusters across all locations and roadsides
   */
  public spawnAllNPCs(locations: LocationData[]) {
    locations.forEach((loc) => {
      this.spawnLocationCluster(loc);
    });

    // Roadside tea stops & milestones pedestrians
    this.spawnRoadsideNPCs();
  }

  private spawnLocationCluster(loc: LocationData) {
    const center = loc.worldPosition;

    switch (loc.id) {
      case 'rajkot':
        // Kathiyawadi Dhaba cluster: chaiwala, elders, garba dancers, children
        this.createNPC('chaiwala', 'pour_tea', center.x + 22, center.z - 2, 'ગરમાગરમ મસાલા ચા તૈયાર છે હો!');
        this.createNPC('kathiyawadi_male', 'idle', center.x + 20, center.z + 1, 'રામ રામ ભાઈ! ગાંઠિયા ખાધા કે નહિ?');
        this.createNPC('kathiyawadi_male', 'walk', center.x + 15, center.z + 6, 'આવો આવો રંગીલા રાજકોટમાં!', 8);
        this.createNPC('garba_female', 'garba', center.x - 12, center.z + 8, 'હે રંગલો જામ્યો કાલિંદીને ઘાટે!');
        this.createNPC('child_waver', 'wave', center.x - 8, center.z + 2, 'છકડો કેવો મસ્ત ભમે છે!');
        this.createNPC('maldhari_shepherd', 'idle', center.x - 24, center.z - 2, 'જય દ્વારકાધીશ બાપા!');
        break;

      case 'dwarka':
        // Temple devotees and pilgrims
        this.createNPC('pilgrim_male', 'pray', center.x - 5, center.z - 15, 'બોલો દ્વારકાધીશ કી જય!');
        this.createNPC('pilgrim_female', 'pray', center.x + 5, center.z - 15, 'જય મુરલીધર પ્રભુ!');
        this.createNPC('pilgrim_male', 'walk', center.x + 12, center.z - 5, 'ગોમતી ઘાટ તરફ ચાલો દર્શન કરવા.', 12);
        this.createNPC('garba_female', 'walk', center.x - 10, center.z + 5, 'દ્વારકાધીશના દર્શન કરી ધન્ય થઈ ગયા!', 10);
        this.createNPC('kathiyawadi_male', 'wave', center.x + 18, center.z + 6, 'જય ઠાકર! સફર શુભ રહે!');
        break;

      case 'somnath':
        // Somnath Mahadev seashore pilgrims
        this.createNPC('pilgrim_male', 'pray', center.x, center.z - 20, 'હર હર મહાદેવ! જય સોમનાથ!');
        this.createNPC('pilgrim_female', 'pray', center.x - 6, center.z - 18, 'ઓમ નમઃ શિવાય!');
        this.createNPC('kathiyawadi_male', 'walk', center.x + 14, center.z - 8, 'પ્રથમ જ્યોતિર્લિંગના પાવન દર્શન!', 14);
        this.createNPC('garba_female', 'walk', center.x - 14, center.z - 4, 'ત્રિવેણી સંગમનો શાંત કિનારો!', 10);
        break;

      case 'gir':
        // Gir Wildlife guides and Maldhari folk
        this.createNPC('maldhari_shepherd', 'walk', center.x + 12, center.z + 4, 'સિંહનું ટોળું નદી કાંઠે બેઠું છે હો!', 15);
        this.createNPC('kathiyawadi_male', 'idle', center.x - 14, center.z - 4, 'ગીરના સાવજની ધરતીમાં સ્વાગત છે!');
        this.createNPC('child_waver', 'wave', center.x + 8, center.z + 8, 'જુઓ સાવજ સામે દેખાય!');
        break;

      case 'junagadh':
        // Girnar pilgrims with sticks
        this.createNPC('pilgrim_male', 'walk', center.x - 10, center.z - 10, 'જય ગિરનારી! દત્ત મહારાજ કી જય!', 12);
        this.createNPC('pilgrim_female', 'walk', center.x + 8, center.z - 8, '૯,૯૯૯ પગથિયાં ચડીને મા અંબાના દર્શન!', 10);
        this.createNPC('kathiyawadi_male', 'idle', center.x + 16, center.z + 2, 'ગિરનારની લીલી પરિક્રમાની મોજ!');
        break;

      case 'kutch':
        // Rann Utsav: Garba dancers in mirror-work, Dholak artist, camel rider
        this.createNPC('kutchi_musician', 'dholak', center.x - 8, center.z - 12, 'ઢોલીડા ઢોલ રે વગાડ! કચ્છ નહિ દેખા તો કુછ નહિ દેખા!');
        this.createNPC('garba_female', 'garba', center.x + 4, center.z - 14, 'તારા વિના શ્યામ મને એકલડું લાગે!');
        this.createNPC('garba_female', 'garba', center.x + 12, center.z - 12, 'ઓઢણી ઓઢું તો ઉડી જાય!');
        this.createNPC('kathiyawadi_male', 'idle', center.x - 18, center.z - 4, 'કચ્છનું શ્વેત રણ સ્વર્ગ જેવું છે!');
        this.createNPC('child_waver', 'wave', center.x + 18, center.z + 2, 'વેલકમ ટુ રણોત્સવ!');
        break;

      case 'ahmedabad':
        // Heritage walkers & Gandhi Ashram visitors
        this.createNPC('pilgrim_male', 'walk', center.x - 12, center.z - 8, 'સાબરમતી આશ્રમ અને હેરિટેજ પોળ!', 14);
        this.createNPC('garba_female', 'walk', center.x + 12, center.z - 6, 'માણેક ચોકના મસ્કાબન અને જલેબી!', 12);
        this.createNPC('chaiwala', 'pour_tea', center.x + 18, center.z + 4, 'અમદાવાદી કડક ચા પિઓ બાપુ!');
        break;

      case 'statue_of_unity':
        // Tourists marveling at Sardar Patel statue
        this.createNPC('pilgrim_male', 'wave', center.x - 10, center.z - 15, 'ભારતનું ગૌરવ સરદાર વલ્લભભાઈ પટેલ!');
        this.createNPC('garba_female', 'walk', center.x + 12, center.z - 12, 'વિશ્વની સૌથી ઊંચી ૧૮૨ મીટરની પ્રતિમા!', 15);
        this.createNPC('child_waver', 'wave', center.x + 5, center.z + 6, 'ભારત માતા કી જય!');
        break;

      case 'saputara':
        // Dangi tribal dancers in the mist
        this.createNPC('garba_female', 'garba', center.x - 8, center.z - 10, 'ડાંગના જંગલોની લીલોતરી અને સુંદરતા!');
        this.createNPC('kutchi_musician', 'dholak', center.x + 8, center.z - 10, 'ડાંગી નૃત્યનો તાલ અને આનંદ!');
        this.createNPC('kathiyawadi_male', 'walk', center.x + 15, center.z + 4, 'ગુજરાતનું એકમાત્ર હિલસ્ટેશન!', 10);
        break;

      case 'surat':
        // Tapi bridge walkers and locho lovers
        this.createNPC('chaiwala', 'pour_tea', center.x + 15, center.z - 10, 'ગરમાગરમ સુરતી લોચો અને ચા!');
        this.createNPC('kathiyawadi_male', 'walk', center.x - 14, center.z - 12, 'સુરતનું જમણ અને કાશીનું મરણ!', 16);
        this.createNPC('garba_female', 'walk', center.x + 8, center.z + 5, 'હીરા અને કાપડનું વૈશ્વિક બજાર સુરત!', 12);
        break;

      case 'patan_modhera':
        // Stepwell tourists and Patola weavers
        this.createNPC('garba_female', 'walk', center.x - 16, center.z - 8, 'રાણકી વાવની સ્થાપત્ય કળા અદભૂત છે!', 12);
        this.createNPC('pilgrim_male', 'pray', center.x + 18, center.z - 10, 'મોઢેરા સૂર્ય મંદિરના સૂર્ય કુંડના દર્શન!');
        this.createNPC('kathiyawadi_male', 'idle', center.x + 2, center.z + 14, 'પાટણના પટોળા મોંઘા મૂલના!');
        break;

      case 'pavagadh':
        // Shaktipeeth pilgrims
        this.createNPC('pilgrim_female', 'pray', center.x - 8, center.z - 15, 'બોલો અંબે માત કી જય! જય મહાકાળી!');
        this.createNPC('pilgrim_male', 'walk', center.x + 10, center.z - 10, 'ઉડન ખટોલા રોપવેમાં બેસીને શિખર દર્શન!', 14);
        this.createNPC('child_waver', 'wave', center.x - 15, center.z + 8, 'જય માતાજી!');
        break;

      case 'dholavira':
        // Harappan site walkers & Road to heaven riders
        this.createNPC('kathiyawadi_male', 'walk', center.x + 14, center.z - 15, '૫૦૦૦ વર્ષ પ્રાચીન હડપ્પન સંસ્કૃતિ!', 15);
        this.createNPC('kutchi_musician', 'dholak', center.x - 14, center.z - 12, 'રોડ ટુ હેવનની સફેદ સુંદરતા!');
        this.createNPC('child_waver', 'wave', center.x + 6, center.z + 8, 'જુઓ સુરખાબ (ફ્લેમિંગો) ઉડે છે!');
        break;

      case 'palitana':
        // White-clad Jain pilgrimage yatris
        this.createNPC('pilgrim_male', 'pray', center.x - 6, center.z - 16, 'જય જિનેન્દ્ર! જય આદિનાથ દાદા!');
        this.createNPC('pilgrim_female', 'pray', center.x + 6, center.z - 16, '૩,૮૦૦ પગથિયાંની પવિત્ર શત્રુંજય યાત્રા!');
        this.createNPC('pilgrim_male', 'walk', center.x + 12, center.z - 6, '૮૬૩ શ્વેત આરસપહાણ મંદિરોનું દિવ્ય તીર્થ!', 12);
        break;

      case 'vadodara':
        // Royal palace visitors
        this.createNPC('kathiyawadi_male', 'walk', center.x - 16, center.z - 10, 'મહારાજા સયાજીરાવ ગાયકવાડનો ભવ્ય પેલેસ!', 15);
        this.createNPC('garba_female', 'garba', center.x + 12, center.z - 12, 'વડોદરાના વિશ્વપ્રસિદ્ધ યુનાઇટેડ વે ગરબા!');
        this.createNPC('pilgrim_male', 'pray', center.x, center.z + 18, 'સુરસાગર તળાવમાં શિવજીની ૧૨૦ ફૂટ ઊંચી મૂર્તિ!');
        break;

      case 'dandi':
        // Satyagraha memorial walkers
        this.createNPC('pilgrim_male', 'walk', center.x - 12, center.z - 10, 'ચપટી મીઠાથી આઝાદીનો મહાસંગ્રામ!', 16);
        this.createNPC('pilgrim_female', 'walk', center.x + 10, center.z - 8, 'પૂજ્ય બાપુની ઐતિહાસિક દાંડી યાત્રા!', 12);
        this.createNPC('child_waver', 'wave', center.x - 5, center.z + 6, 'વંદે માતરમ!');
        break;

      case 'ahmedabad_airport':
        // Pilots, travelers, airport staff, and visitors
        this.createNPC('kathiyawadi_male', 'walk', center.x - 14, center.z - 10, 'સરદાર પટેલ આંતરરાષ્ટ્રીય એરપોર્ટમાં આપનું સ્વાગત છે!', 15);
        this.createNPC('garba_female', 'walk', center.x + 12, center.z - 12, 'લંડન, દુબઈ અને અમેરિકાની ફ્લાઇટ્સ અહીંથી ઊડે છે!', 14);
        this.createNPC('child_waver', 'wave', center.x + 4, center.z + 8, 'જુઓ મોટું વિમાન ટેકઓફ થાય છે! આવજો!');
        this.createNPC('chaiwala', 'pour_tea', center.x - 18, center.z + 6, 'એરપોર્ટ સ્પેશિયલ ગરમ મસાલા ચા & બટર બન!');
        break;
    }
  }

  private spawnRoadsideNPCs() {
    // Spawn walkers on the shoulders of REAL highway segments (the old version walked the
    // location polygon, which strayed off-road and through water after the map spread out)
    const segments = getResolvedHighwaySegments();
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const dx = seg.end.x - seg.start.x;
      const dz = seg.end.z - seg.start.z;
      const t = 0.3 + (i % 4) * 0.15;
      // Perpendicular offset onto the shoulder, alternating sides
      const side = i % 2 === 0 ? 1 : -1;
      const mx = seg.start.x + dx * t + (-dz / seg.distance) * 11 * side;
      const mz = seg.start.z + dz * t + (dx / seg.distance) * 11 * side;

      if (i % 2 === 0) {
        this.createNPC('maldhari_shepherd', 'walk', mx, mz, 'હળવે હળવે ચલાવો ભાઈ, રસ્તો સરસ છે!', 16);
      } else {
        this.createNPC('kathiyawadi_male', 'walk', mx, mz, 'કેમ છો ભાઈ! મોજમાં ને?', 14);
      }
    }
  }

  /**
   * Build procedural 3D model for an NPC with detailed traditional Gujarati garments
   */
  public createNPC(
    type: NPCType,
    behavior: NPCBehavior,
    x: number,
    z: number,
    greeting: string,
    walkRadius: number = 8
  ): NPCInstance {
    const root = new THREE.Group();
    root.position.set(x, 0, z);

    // 1. Torso Group
    const torsoNode = new THREE.Group();
    torsoNode.position.y = 1.0;
    root.add(torsoNode);

    // 2. Head & Paghdi Group
    const headNode = new THREE.Group();
    headNode.position.y = 0.65;
    torsoNode.add(headNode);

    // 3. Limb groups for organic human movement
    const leftArmNode = new THREE.Group();
    leftArmNode.position.set(-0.35, 0.45, 0);
    torsoNode.add(leftArmNode);

    const rightArmNode = new THREE.Group();
    rightArmNode.position.set(0.35, 0.45, 0);
    torsoNode.add(rightArmNode);

    const leftLegNode = new THREE.Group();
    leftLegNode.position.set(-0.16, 0, 0);
    torsoNode.add(leftLegNode);

    const rightLegNode = new THREE.Group();
    rightLegNode.position.set(0.16, 0, 0);
    torsoNode.add(rightLegNode);

    let propNode: THREE.Group | undefined;
    let skirtNode: THREE.Mesh | undefined;

    // Pick Skin & Fabric materials based on archetype
    const skinMat = type === 'child_waver' ? this.sharedMaterials.skinFair : this.sharedMaterials.skinWarm;

    // Build specific 3D anatomy & cultural clothing
    switch (type) {
      case 'kathiyawadi_male':
      case 'maldhari_shepherd': {
        // Torso: Pleated white/maroon Kediyu top
        const kediyuMat = type === 'maldhari_shepherd' ? this.sharedMaterials.kediyuWhite : this.sharedMaterials.kediyuMaroon;
        const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.65, 8), kediyuMat);
        torsoMesh.position.y = 0.28;
        torsoMesh.castShadow = true;
        torsoNode.add(torsoMesh);

        // Flared Kediyu waist frill
        const frill = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.28, 8), kediyuMat);
        frill.position.y = 0.05;
        torsoNode.add(frill);

        // Head with prominent Gujarati Mustache
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), skinMat);
        headMesh.castShadow = true;
        const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.06), this.sharedMaterials.blackMirror);
        mustache.position.set(0, -0.04, 0.14);
        headNode.add(headMesh, mustache);

        // Grand Kathiyawadi Paghdi / Turban (Crimson / Saffron / Golden)
        const paghdiMat = type === 'maldhari_shepherd' ? this.sharedMaterials.saffron : this.sharedMaterials.crimsonPaghdi;
        const paghdi = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.09, 8, 12), paghdiMat);
        paghdi.position.y = 0.12;
        paghdi.rotation.x = Math.PI / 2;
        const paghdiTop = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), paghdiMat);
        paghdiTop.position.y = 0.15;
        // Paghdi tail (છોગું)
        const chhogu = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.25, 4), paghdiMat);
        chhogu.position.set(0.16, 0.15, -0.08);
        chhogu.rotation.z = -0.3;
        headNode.add(paghdi, paghdiTop, chhogu);

        // Arms (Kediyu sleeves)
        this.buildArmMesh(leftArmNode, kediyuMat, skinMat);
        this.buildArmMesh(rightArmNode, kediyuMat, skinMat);

        // Legs (Loose white Chorano trousers + Mojdi shoes)
        this.buildLegMesh(leftLegNode, this.sharedMaterials.dhotiWhite, this.sharedMaterials.wood);
        this.buildLegMesh(rightLegNode, this.sharedMaterials.dhotiWhite, this.sharedMaterials.wood);

        // Shepherd staff for Maldhari
        if (type === 'maldhari_shepherd') {
          propNode = new THREE.Group();
          const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.8), this.sharedMaterials.wood);
          staff.position.set(0.1, 0.4, 0.15);
          propNode.add(staff);
          rightArmNode.add(propNode);
        }
        break;
      }

      case 'garba_female': {
        // Torso: Embroidered Choli
        const choliMat = Math.random() > 0.5 ? this.sharedMaterials.magentaCholi : this.sharedMaterials.pinkCholi;
        const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.45, 8), choliMat);
        torsoMesh.position.y = 0.32;
        torsoMesh.castShadow = true;
        torsoNode.add(torsoMesh);

        // Flared Multi-colored Chaniya (Ghagra skirt)
        const skirtMat = Math.random() > 0.5 ? this.sharedMaterials.royalBlue : this.sharedMaterials.emeraldGreen;
        skirtNode = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.75, 12, 1, true), skirtMat);
        skirtNode.position.y = -0.28;
        skirtNode.castShadow = true;
        torsoNode.add(skirtNode);

        // Head with decorative Bindi & Hair Bun
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
        const hairBun = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), this.sharedMaterials.blackMirror);
        hairBun.position.set(0, 0.05, -0.14);
        const bindi = new THREE.Mesh(new THREE.SphereGeometry(0.02, 4, 4), this.sharedMaterials.crimsonPaghdi);
        bindi.position.set(0, 0.04, 0.15);
        headNode.add(headMesh, hairBun, bindi);

        // Odhni / Chunari draped over head/shoulder
        const odhniMat = this.sharedMaterials.goldPaghdi;
        const odhni = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.25, 8, 1, true), odhniMat);
        odhni.position.y = 0.08;
        headNode.add(odhni);

        // Arms with silver/gold Bangles (ચૂડીઓ)
        this.buildArmMesh(leftArmNode, skinMat, skinMat, this.sharedMaterials.silver);
        this.buildArmMesh(rightArmNode, skinMat, skinMat, this.sharedMaterials.silver);

        // Legs hidden under flared Chaniya
        this.buildLegMesh(leftLegNode, skinMat, this.sharedMaterials.goldPaghdi);
        this.buildLegMesh(rightLegNode, skinMat, this.sharedMaterials.goldPaghdi);

        // Optional Brass Water Pot (બેડલું) for walking women
        if (behavior === 'walk') {
          propNode = new THREE.Group();
          const pot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), this.sharedMaterials.brass);
          pot.position.set(0, 0.24, 0);
          const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06), this.sharedMaterials.brass);
          rim.position.set(0, 0.38, 0);
          propNode.add(pot, rim);
          headNode.add(propNode);
        }
        break;
      }

      case 'pilgrim_male':
      case 'pilgrim_female': {
        // Devotee in Saffron/White Dhoti & Upavastra shawl
        const isJain = x > 200 && z > 200; // Palitana zone is pure white
        const clothMat = isJain ? this.sharedMaterials.kediyuWhite : this.sharedMaterials.saffron;
        const dhotiMat = isJain ? this.sharedMaterials.kediyuWhite : this.sharedMaterials.dhotiWhite;

        const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.55, 8), clothMat);
        torsoMesh.position.y = 0.3;
        torsoNode.add(torsoMesh);

        // Shawl draped diagonally
        const shawl = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 6, 8), clothMat);
        shawl.position.set(0, 0.38, 0);
        shawl.rotation.x = Math.PI / 3;
        torsoNode.add(shawl);

        // Head with Tilak / Chandan
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
        const tilak = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.02), this.sharedMaterials.crimsonPaghdi);
        tilak.position.set(0, 0.04, 0.15);
        headNode.add(headMesh, tilak);

        this.buildArmMesh(leftArmNode, skinMat, skinMat);
        this.buildArmMesh(rightArmNode, skinMat, skinMat);

        this.buildLegMesh(leftLegNode, dhotiMat, this.sharedMaterials.wood);
        this.buildLegMesh(rightLegNode, dhotiMat, this.sharedMaterials.wood);
        break;
      }

      case 'kutchi_musician': {
        // Folk musician with Kutchi jacket and Dholak drum
        const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.55, 8), this.sharedMaterials.blackMirror);
        torsoMesh.position.y = 0.3;
        torsoNode.add(torsoMesh);

        // Grand White Kutchi Feta (Turban)
        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), skinMat);
        const turban = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.1, 8, 12), this.sharedMaterials.kediyuWhite);
        turban.position.y = 0.12;
        turban.rotation.x = Math.PI / 2;
        headNode.add(headMesh, turban);

        this.buildArmMesh(leftArmNode, this.sharedMaterials.kediyuWhite, skinMat);
        this.buildArmMesh(rightArmNode, this.sharedMaterials.kediyuWhite, skinMat);

        this.buildLegMesh(leftLegNode, this.sharedMaterials.dhotiWhite, this.sharedMaterials.wood);
        this.buildLegMesh(rightLegNode, this.sharedMaterials.dhotiWhite, this.sharedMaterials.wood);

        // Dholak Drum slung in front
        propNode = new THREE.Group();
        const dholBody = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.65, 12), this.sharedMaterials.wood);
        dholBody.rotation.z = Math.PI / 2;
        dholBody.position.set(0, 0.25, 0.25);
        const rimL = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 12), this.sharedMaterials.blackMirror);
        rimL.rotation.z = Math.PI / 2;
        rimL.position.set(-0.33, 0.25, 0.25);
        const rimR = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 12), this.sharedMaterials.blackMirror);
        rimR.rotation.z = Math.PI / 2;
        rimR.position.set(0.33, 0.25, 0.25);
        propNode.add(dholBody, rimL, rimR);
        torsoNode.add(propNode);
        break;
      }

      case 'chaiwala': {
        // Tea vendor with towel and cutting chai kettle
        const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.55, 8), this.sharedMaterials.royalBlue);
        torsoMesh.position.y = 0.3;
        // Towel over shoulder
        const towel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.26), this.sharedMaterials.kediyuWhite);
        towel.position.set(-0.18, 0.35, 0);
        torsoNode.add(torsoMesh, towel);

        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), skinMat);
        headNode.add(headMesh);

        this.buildArmMesh(leftArmNode, skinMat, skinMat);
        this.buildArmMesh(rightArmNode, skinMat, skinMat);

        this.buildLegMesh(leftLegNode, this.sharedMaterials.blackMirror, this.sharedMaterials.wood);
        this.buildLegMesh(rightLegNode, this.sharedMaterials.blackMirror, this.sharedMaterials.wood);

        // Brass Kettle (કેટલી) and Tea Glasses Tray
        propNode = new THREE.Group();
        const kettle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8), this.sharedMaterials.brass);
        kettle.position.set(0.18, -0.2, 0.25);
        const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.1), this.sharedMaterials.brass);
        spout.position.set(0.24, -0.15, 0.3);
        spout.rotation.x = 0.5;
        propNode.add(kettle, spout);
        rightArmNode.add(propNode);
        break;
      }

      case 'child_waver':
      default: {
        // Child in colorful yellow/red kurta
        const torsoMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.4, 8), this.sharedMaterials.kediyuYellow);
        torsoMesh.position.y = 0.22;
        torsoNode.add(torsoMesh);

        const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), skinMat);
        headNode.add(headMesh);

        this.buildArmMesh(leftArmNode, this.sharedMaterials.kediyuYellow, skinMat);
        this.buildArmMesh(rightArmNode, this.sharedMaterials.kediyuYellow, skinMat);

        this.buildLegMesh(leftLegNode, this.sharedMaterials.royalBlue, this.sharedMaterials.wood);
        this.buildLegMesh(rightLegNode, this.sharedMaterials.royalBlue, this.sharedMaterials.wood);

        root.scale.set(0.75, 0.75, 0.75);
        break;
      }
    }

    this.scene.add(root);

    const npc: NPCInstance = {
      id: `npc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      behavior,
      group: root,
      basePosition: new THREE.Vector3(x, 0, z),
      currentPosition: new THREE.Vector3(x, 0, z),
      targetPosition: new THREE.Vector3(x + (Math.random() - 0.5) * walkRadius, 0, z + (Math.random() - 0.5) * walkRadius),
      walkRadius,
      walkSpeed: 0.8 + Math.random() * 0.4,
      rotation: Math.random() * Math.PI * 2,
      animPhase: Math.random() * Math.PI * 2,
      animSpeed: 2.2 + Math.random() * 0.8,
      torsoNode,
      headNode,
      leftArmNode,
      rightArmNode,
      leftLegNode,
      rightLegNode,
      skirtNode,
      propNode,
      greetingGujarati: greeting,
      lastGreetTime: 0,
    };

    this.npcs.push(npc);
    return npc;
  }

  private buildArmMesh(armNode: THREE.Group, sleeveMat: THREE.Material, skinMat: THREE.Material, bangleMat?: THREE.Material) {
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.24, 6), sleeveMat);
    sleeve.position.y = -0.12;
    sleeve.castShadow = true;

    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.24, 6), skinMat);
    forearm.position.y = -0.32;
    forearm.castShadow = true;

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), skinMat);
    hand.position.y = -0.45;

    armNode.add(sleeve, forearm, hand);

    if (bangleMat) {
      const bangle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 8), bangleMat);
      bangle.position.y = -0.38;
      bangle.rotation.x = Math.PI / 2;
      armNode.add(bangle);
    }
  }

  private buildLegMesh(legNode: THREE.Group, pantsMat: THREE.Material, shoeMat: THREE.Material) {
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.45, 6), pantsMat);
    thigh.position.y = -0.25;
    thigh.castShadow = true;

    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.4, 6), pantsMat);
    calf.position.y = -0.65;
    calf.castShadow = true;

    const mojdi = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.22), shoeMat);
    mojdi.position.set(0, -0.88, 0.06);
    mojdi.castShadow = true;

    legNode.add(thigh, calf, mojdi);
  }

  /**
   * Main update loop for animating limbs, walking trajectories, garba dancing, tea pouring and greeting the player
   */
  public update(delta: number, playerPos: THREE.Vector3, isHonking: boolean = false) {
    const now = Date.now();

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      npc.animPhase += delta * npc.animSpeed;
      const phase = npc.animPhase;

      const distToPlayer = npc.currentPosition.distanceTo(playerPos);

      // 1. Proximity reaction: if Chhakaro is close (< 14m) or honking, wave & face Chhakaro
      const isPlayerNear = distToPlayer < 15;
      if (isPlayerNear && (isHonking || distToPlayer < 9)) {
        if (now - npc.lastGreetTime > 7000) {
          npc.lastGreetTime = now;
          this.triggerSpeechBubble(npc);
        }
      }

      // 2. Perform animation according to behavior
      switch (npc.behavior) {
        case 'garba': {
          // Energetic traditional Garba / Dandiya Raas steps
          // Torso bobbing and swaying
          npc.torsoNode.position.y = 1.0 + Math.abs(Math.sin(phase * 2)) * 0.12;
          npc.group.rotation.y += delta * 0.8; // Spin slowly in garba circle

          // Coordinated Garba clapping arms
          const clapSwing = Math.sin(phase * 2);
          npc.leftArmNode.rotation.x = -1.2 + clapSwing * 0.4;
          npc.leftArmNode.rotation.z = 0.5 + clapSwing * 0.3;
          npc.rightArmNode.rotation.x = -1.2 + clapSwing * 0.4;
          npc.rightArmNode.rotation.z = -0.5 - clapSwing * 0.3;

          // Leg rhythmic foot taps
          npc.leftLegNode.rotation.x = Math.sin(phase * 2) * 0.45;
          npc.rightLegNode.rotation.x = -Math.sin(phase * 2) * 0.45;

          // Flared Chaniya skirt swirl physics
          if (npc.skirtNode) {
            npc.skirtNode.rotation.z = Math.sin(phase * 2) * 0.15;
            npc.skirtNode.scale.x = 1.0 + Math.abs(clapSwing) * 0.15;
            npc.skirtNode.scale.z = 1.0 + Math.abs(clapSwing) * 0.15;
          }
          break;
        }

        case 'walk': {
          // Strolling along waypoint
          const dir = new THREE.Vector3().subVectors(npc.targetPosition, npc.currentPosition);
          const distToTarget = dir.length();

          if (distToTarget < 1.0) {
            // Pick new random destination around base
            npc.targetPosition.set(
              npc.basePosition.x + (Math.random() - 0.5) * npc.walkRadius * 2,
              0,
              npc.basePosition.z + (Math.random() - 0.5) * npc.walkRadius * 2
            );
          } else {
            dir.normalize();
            const step = npc.walkSpeed * delta;
            npc.currentPosition.addScaledVector(dir, step);
            npc.group.position.copy(npc.currentPosition);

            // Turn toward walking direction
            const targetAngle = Math.atan2(dir.x, dir.z);
            npc.group.rotation.y = THREE.MathUtils.lerp(npc.group.rotation.y, targetAngle, delta * 4);
          }

          // Walking stride kinematics
          const walkCycle = Math.sin(phase * 3.2);
          npc.torsoNode.position.y = 1.0 + Math.abs(walkCycle) * 0.05;
          npc.leftLegNode.rotation.x = walkCycle * 0.55;
          npc.rightLegNode.rotation.x = -walkCycle * 0.55;

          // Arms counter-swing (unless holding pot on head)
          if (npc.type !== 'garba_female') {
            npc.leftArmNode.rotation.x = -walkCycle * 0.45;
            npc.rightArmNode.rotation.x = walkCycle * 0.45;
          } else {
            // Woman balancing pot with arm raised gracefully
            npc.rightArmNode.rotation.x = -2.2;
            npc.rightArmNode.rotation.z = -0.4;
            npc.leftArmNode.rotation.x = walkCycle * 0.2;
          }
          break;
        }

        case 'pray': {
          // Namaskar gesture with folded hands & gentle devotional bowing
          const bow = Math.sin(phase * 0.8) * 0.1;
          npc.torsoNode.rotation.x = 0.1 + bow;
          npc.headNode.rotation.x = 0.15 + bow;

          // Hands joined in front of chest (Namaste)
          npc.leftArmNode.rotation.x = -1.5;
          npc.leftArmNode.rotation.z = 0.6;
          npc.rightArmNode.rotation.x = -1.5;
          npc.rightArmNode.rotation.z = -0.6;

          // Idle legs
          npc.leftLegNode.rotation.x = 0;
          npc.rightLegNode.rotation.x = 0;
          break;
        }

        case 'wave': {
          // Cheerful enthusiastic arm wave to the passing Chhakaro
          npc.torsoNode.position.y = 1.0;
          if (isPlayerNear) {
            // Turn toward player
            const pAngle = Math.atan2(playerPos.x - npc.currentPosition.x, playerPos.z - npc.currentPosition.z);
            npc.group.rotation.y = THREE.MathUtils.lerp(npc.group.rotation.y, pAngle, delta * 5);
          }

          // Right arm raised waving back and forth
          npc.rightArmNode.rotation.x = -2.4;
          npc.rightArmNode.rotation.z = Math.sin(phase * 6) * 0.5 - 0.3;
          npc.leftArmNode.rotation.x = 0.1;
          npc.leftArmNode.rotation.z = 0.1;
          break;
        }

        case 'pour_tea': {
          // Chaiwala tilting kettle into glass rhythmically
          const tilt = Math.sin(phase * 1.5);
          npc.rightArmNode.rotation.x = -1.2 + (tilt > 0 ? tilt * 0.4 : 0);
          npc.rightArmNode.rotation.z = -0.3;
          npc.leftArmNode.rotation.x = -1.0;
          npc.leftArmNode.rotation.z = 0.4;
          npc.headNode.rotation.x = 0.2;
          break;
        }

        case 'dholak': {
          // Dhol player drumming energetically
          const beatL = Math.sin(phase * 4);
          const beatR = Math.cos(phase * 4);
          npc.leftArmNode.rotation.x = -1.1 + beatL * 0.35;
          npc.leftArmNode.rotation.z = 0.4;
          npc.rightArmNode.rotation.x = -1.1 + beatR * 0.35;
          npc.rightArmNode.rotation.z = -0.4;
          npc.torsoNode.rotation.y = Math.sin(phase * 2) * 0.12;
          break;
        }

        case 'idle':
        default: {
          // Idle breathing and looking around
          npc.torsoNode.position.y = 1.0 + Math.sin(phase * 1.2) * 0.02;
          npc.headNode.rotation.y = Math.sin(phase * 0.6) * 0.35;
          npc.leftArmNode.rotation.x = Math.sin(phase * 1.2) * 0.05;
          npc.rightArmNode.rotation.x = -Math.sin(phase * 1.2) * 0.05;
          break;
        }
      }

      // If player is super close, override head to look at Chhakaro
      if (isPlayerNear && distToPlayer < 10) {
        const localPlayer = npc.group.worldToLocal(playerPos.clone());
        const lookAngle = Math.atan2(localPlayer.x, localPlayer.z);
        npc.headNode.rotation.y = THREE.MathUtils.clamp(lookAngle, -1.0, 1.0);
      }
    }
  }

  /**
   * Display floating traditional Gujarati greeting comic speech bubble above NPC
   */
  private triggerSpeechBubble(npc: NPCInstance) {
    if (npc.speechBubble) {
      npc.group.remove(npc.speechBubble);
      npc.speechBubble.material.dispose();
      npc.speechBubble = undefined;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;
    const ctx = canvas.getContext('2d')!;

    // Rounded speech bubble background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(10, 10, 492, 100, [18]);
    ctx.fill();
    ctx.stroke();

    // Little speech pointer tail
    ctx.beginPath();
    ctx.moveTo(230, 110);
    ctx.lineTo(256, 135);
    ctx.lineTo(280, 110);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();

    // Gujarati greeting text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(npc.greetingGujarati, 256, 60);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3.8, 1.1, 1);
    sprite.position.set(0, 2.3, 0);

    npc.speechBubble = sprite;
    npc.group.add(sprite);

    // Auto-fade speech bubble after 4.5 seconds
    if (npc.speechBubbleTimeout) {
      clearTimeout(npc.speechBubbleTimeout);
    }
    npc.speechBubbleTimeout = window.setTimeout(() => {
      if (npc.speechBubble) {
        npc.group.remove(npc.speechBubble);
        npc.speechBubble.material.dispose();
        npc.speechBubble = undefined;
      }
    }, 4500);
  }

  public destroy() {
    this.npcs.forEach((npc) => {
      if (npc.speechBubbleTimeout) clearTimeout(npc.speechBubbleTimeout);
      this.scene.remove(npc.group);
    });
    this.npcs = [];
  }
}
