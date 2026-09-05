# -*- coding: utf-8 -*-
from pathlib import Path

eb = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\world\EnvironmentBuilder.ts")
text = eb.read_text(encoding="utf-8")

if "WaterOccupancy" not in text:
    text = text.replace(
        "import { RoadGeometryHelper } from './RoadGeometryHelper';",
        "import { RoadGeometryHelper } from './RoadGeometryHelper';\nimport { WaterOccupancy } from './WaterOccupancy';",
    )

# clear occupancy at start of world build — insert after ground add
needle = "    this.scene.add(ground);\n\n    // 2. Build interconnected wide multi-lane highways"
if "WaterOccupancy.clear()" not in text:
    text = text.replace(
        needle,
        "    this.scene.add(ground);\n\n    WaterOccupancy.clear();\n\n    // 2. Build interconnected wide multi-lane highways",
    )

# night city ids
text = text.replace(
    "for (const id of ['rajkot', 'ahmedabad', 'surat', 'vadodara', 'junagadh'])",
    "for (const id of ['rajkot', 'ahmedabad', 'gandhinagar', 'surat', 'vadodara', 'junagadh'])",
)

# gandhinagar case
old_case = """      case 'ahmedabad':
        this.buildAhmedabadHeritage(landmarkGroup);
        break;"""
new_case = """      case 'ahmedabad':
        this.buildAhmedabadHeritage(landmarkGroup);
        break;
      case 'gandhinagar':
        this.buildGandhinagarSectors(landmarkGroup);
        break;"""
if "buildGandhinagarSectors" not in text:
    if old_case not in text:
        raise SystemExit("ahmedabad case missing")
    text = text.replace(old_case, new_case, 1)

# trees: block water too
old_tree = """    if (!bypassSafetyCheck && RoadGeometryHelper.isInsideRoadOrClearance(worldX, worldZ, 10.0)) {
      return;
    }"""
new_tree = """    if (!bypassSafetyCheck && WaterOccupancy.isBlocked(worldX, worldZ, 10.0)) {
      return;
    }"""
if old_tree not in text:
    raise SystemExit("tree guard missing")
text = text.replace(old_tree, new_tree)

ahmedabad_fn = r'''  /**
   * Zone: Ahmedabad — heritage pols on the east bank, Sabarmati as a NARROW river
   * WEST of the junction plaza so water never paints over roads. Atal Bridge is the
   * only crossing. Buildings skip water / road cells.
   */
  private buildAhmedabadHeritage(group: THREE.Group) {
    const ox = group.position.x;
    const oz = group.position.z;

    // River corridor behind the plaza (local z = -95), 160 x 22, well clear of the 27m roundabout.
    const riverW = 160;
    const riverD = 22;
    const riverZ = -95;
    const river = new THREE.Mesh(new THREE.PlaneGeometry(riverW, riverD), this.waterMat);
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, 0.08, riverZ);
    group.add(river);
    WaterOccupancy.registerPlane(ox, oz + riverZ, riverW, riverD);

    // Stone banks so water has a hard edge against land
    const bankMat = this.sandstoneMat;
    const bankN = new THREE.Mesh(new THREE.BoxGeometry(riverW, 0.6, 3), bankMat);
    bankN.position.set(0, 0.3, riverZ - riverD / 2 - 1.5);
    const bankS = new THREE.Mesh(new THREE.BoxGeometry(riverW, 0.6, 3), bankMat);
    bankS.position.set(0, 0.3, riverZ + riverD / 2 + 1.5);
    group.add(bankN, bankS);

    // Atal Bridge spans only the water (deck along Z)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0, 3.2, riverZ);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(8, 0.7, riverD + 10), this.stoneMat);
    const arch1 = new THREE.Mesh(
      new THREE.TorusGeometry(14, 0.45, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    arch1.rotation.y = Math.PI / 2;
    arch1.position.set(3.2, -2, 0);
    const arch2 = arch1.clone();
    arch2.position.set(-3.2, -2, 0);
    bridgeGroup.add(deck, arch1, arch2);
    group.add(bridgeGroup);

    // Sidi Saiyyed jali — east of plaza, not in water
    const sidiJali = new THREE.Mesh(new THREE.BoxGeometry(14, 8, 1.2), this.sandstoneMat);
    sidiJali.position.set(36, 4, -8);
    group.add(sidiJali);

    // Tight pol-house grid on the east bank, skipping road/water/plaza
    const houseMat = this.sandstoneMat;
    for (let gx = 0; gx < 4; gx++) {
      for (let gz = 0; gz < 4; gz++) {
        const lx = 48 + gx * 14;
        const lz = 8 + gz * 14;
        if (WaterOccupancy.isBlocked(ox + lx, oz + lz, 6)) continue;
        const h = 5 + ((gx + gz) % 3);
        const house = new THREE.Mesh(new THREE.BoxGeometry(8, h, 8), houseMat);
        house.position.set(lx, h / 2, lz);
        house.castShadow = true;
        group.add(house);
      }
    }

    const kiteColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899];
    kiteColors.forEach((kc, i) => {
      const kite = new THREE.Mesh(
        new THREE.PlaneGeometry(2.5, 2.5),
        new THREE.MeshStandardMaterial({ color: kc, side: THREE.DoubleSide })
      );
      kite.rotation.z = Math.PI / 4;
      kite.position.set(40 + i * 8, 22 + (i % 3) * 6, 10 + i * 3);
      group.add(kite);
    });
  }

  /**
   * Zone: Gandhinagar — square sector city. 4x4 blocks with 10m roads between,
   * central chowk left as a garden. Never overlaps Ahmedabad; no water on streets.
   */
  private buildGandhinagarSectors(group: THREE.Group) {
    const ox = group.position.x;
    const oz = group.position.z;
    const block = 16;
    const street = 10;
    const pitch = block + street;
    const origin = 40; // start outside the 27m junction plaza

    // Garden chowk at the first inner cell
    const chowk = new THREE.Mesh(new THREE.BoxGeometry(block, 0.15, block), this.grassMat);
    chowk.position.set(origin + pitch, 0.08, origin + pitch);
    group.add(chowk);

    const secretariat = new THREE.Mesh(new THREE.BoxGeometry(18, 10, 12), this.stoneMat);
    secretariat.position.set(origin + pitch, 5, origin + pitch);
    secretariat.castShadow = true;
    group.add(secretariat);
    this.createBoard(group, 'ગુજરાત સચિવાલય — ગાંધીનગર', origin + pitch, 11, origin + pitch + 8, 14, 1.6);

    for (let gx = 0; gx < 4; gx++) {
      for (let gz = 0; gz < 4; gz++) {
        if (gx === 1 && gz === 1) continue; // chowk
        const lx = origin + gx * pitch;
        const lz = origin + gz * pitch;
        if (WaterOccupancy.isBlocked(ox + lx, oz + lz, 6)) continue;
        const h = 4 + ((gx * 3 + gz) % 4);
        const bldg = new THREE.Mesh(new THREE.BoxGeometry(block - 4, h, block - 4), this.sandstoneMat);
        bldg.position.set(lx, h / 2, lz);
        bldg.castShadow = true;
        group.add(bldg);
      }
    }
  }

'''

# replace existing ahmedabad function (keep surat after)
start = text.find("  /**\n   * Zone: Ahmedabad Sabarmati & Atal Bridge")
surat = text.find("  /**\n   * Zone: Surat Tapi Cable Bridge & Textile Hub")
if start < 0 or surat < 0:
    raise SystemExit("ahmedabad/surat markers missing %s %s" % (start, surat))
text = text[:start] + ahmedabad_fn + text[surat:]

# Surat water shrink
old_surat_water = """    // Tapi River
    const tapi = new THREE.Mesh(new THREE.PlaneGeometry(350, 80), this.waterMat);
    tapi.rotation.x = -Math.PI / 2;
    tapi.position.set(0, 0.1, -45);
    group.add(tapi);"""
new_surat_water = """    // Tapi River — narrow strip behind the plaza, never over the highway
    const tapiW = 150;
    const tapiD = 22;
    const tapiZ = -95;
    const tapi = new THREE.Mesh(new THREE.PlaneGeometry(tapiW, tapiD), this.waterMat);
    tapi.rotation.x = -Math.PI / 2;
    tapi.position.set(0, 0.08, tapiZ);
    group.add(tapi);
    WaterOccupancy.registerPlane(group.position.x, group.position.z + tapiZ, tapiW, tapiD);"""
if old_surat_water not in text:
    raise SystemExit("surat water missing")
text = text.replace(old_surat_water, new_surat_water)

# Move surat bridge onto the river
text = text.replace(
    "    bridgeGroup.position.set(0, 0, -45);",
    "    bridgeGroup.position.set(0, 0, -95);",
)

# Dwarka sea register + saputara lake shrink
old_sea = """    const sea = new THREE.Mesh(new THREE.PlaneGeometry(350, 120), this.waterMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.1, -120);
    group.add(sea);"""
new_sea = """    const sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), this.waterMat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(0, 0.08, -130);
    group.add(sea);
    WaterOccupancy.registerPlane(group.position.x, group.position.z - 130, 220, 80);"""
if old_sea not in text:
    raise SystemExit("dwarka sea missing")
text = text.replace(old_sea, new_sea)

old_lake = """    const lake = new THREE.Mesh(new THREE.CylinderGeometry(26, 26, 0.5, 24), this.waterMat);
    lake.position.set(0, 0.2, -25);
    group.add(lake);"""
new_lake = """    const lake = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 0.5, 24), this.waterMat);
    lake.position.set(0, 0.2, -55);
    group.add(lake);
    WaterOccupancy.registerPlane(group.position.x, group.position.z - 55, 28, 28);"""
if old_lake not in text:
    raise SystemExit("saputara lake missing")
text = text.replace(old_lake, new_lake)

eb.write_text(text, encoding="utf-8")
print("EnvironmentBuilder patched", eb.stat().st_size)
