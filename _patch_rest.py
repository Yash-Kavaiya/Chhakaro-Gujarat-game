# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\data\highwayNetwork.ts")
t = p.read_text(encoding="utf-8")
if "nh47_ahmedabad_gandhinagar" not in t:
    insert = """  {
    id: 'nh47_ahmedabad_gandhinagar',
    code: 'NH-47G',
    fromId: 'ahmedabad',
    toId: 'gandhinagar',
    nameGujarati: 'અમદાવાદ-ગાંધીનગર સેક્ટર લિંક',
    nameEnglish: 'Ahmedabad - Gandhinagar Sector Link',
    speedLimit: 60,
    type: 'national',
    hasSignalGantry: true,
  },
"""
    marker = "    id: 'nh48_ahmedabad_surat',"
    if marker not in t:
        raise SystemExit("highway marker missing")
    t = t.replace(marker, insert + marker, 1)
    p.write_text(t, encoding="utf-8")
    print("highway ok")
else:
    print("highway already")

v = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\state\voiceCommands.ts")
vt = v.read_text(encoding="utf-8")
if "gandhinagar" not in vt:
    old = "  ahmedabad: ['અમદાવાદ', 'ahmedabad', 'amdavad'],"
    new = old + "\n  gandhinagar: ['ગાંધીનગર', 'gandhinagar'],"
    if old not in vt:
        raise SystemExit("voice marker missing")
    v.write_text(vt.replace(old, new, 1), encoding="utf-8")
    print("voice ok")
else:
    print("voice already")

test = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\data\zoneLayout.test.ts")
test.write_text(
    """import { describe, it, expect } from 'vitest';
import { GUJARAT_LOCATIONS } from './locations';

const GAP = 80;

describe('zone layout: cities water and roads do not merge', () => {
  it('no two location zones overlap plus green belt', () => {
    const locs = GUJARAT_LOCATIONS;
    for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        const a = locs[i];
        const b = locs[j];
        const dx = a.worldPosition.x - b.worldPosition.x;
        const dz = a.worldPosition.z - b.worldPosition.z;
        const dist = Math.hypot(dx, dz);
        const need = a.zoneRadius + b.zoneRadius + GAP;
        expect(dist, `${a.id} overlaps ${b.id} (dist ${dist.toFixed(0)} need ${need})`).toBeGreaterThanOrEqual(need);
      }
    }
  });

  it('includes a separate Gandhinagar square-city zone', () => {
    const g = GUJARAT_LOCATIONS.find((l) => l.id === 'gandhinagar');
    const a = GUJARAT_LOCATIONS.find((l) => l.id === 'ahmedabad');
    expect(g).toBeTruthy();
    expect(a).toBeTruthy();
    const dist = Math.hypot(
      g!.worldPosition.x - a!.worldPosition.x,
      g!.worldPosition.z - a!.worldPosition.z
    );
    expect(dist).toBeGreaterThan(g!.zoneRadius + a!.zoneRadius);
  });
});
""",
    encoding="utf-8",
)
print("test ok")
