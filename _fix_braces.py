from pathlib import Path

loc = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\data\locations.ts")
t = loc.read_text(encoding="utf-8")
t = t.replace("  {\n  {\n    id: 'gandhinagar',", "  {\n    id: 'gandhinagar',", 1)
t = t.replace("  {\r\n  {\r\n    id: 'gandhinagar',", "  {\r\n    id: 'gandhinagar',", 1)
loc.write_text(t, encoding="utf-8")
print("locations braces", t.count("id: 'gandhinagar'"))

hw = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\data\highwayNetwork.ts")
h = hw.read_text(encoding="utf-8")
old = """  {
  {
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
    id: 'nh48_ahmedabad_surat',"""
new = """  {
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
  {
    id: 'nh48_ahmedabad_surat',"""
if old not in h:
    # CRLF
    old2 = old.replace("\n", "\r\n")
    new2 = new.replace("\n", "\r\n")
    if old2 not in h:
        raise SystemExit("highway block not found")
    h = h.replace(old2, new2, 1)
else:
    h = h.replace(old, new, 1)
hw.write_text(h, encoding="utf-8")
print("highway ok")
