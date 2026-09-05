# -*- coding: utf-8 -*-
from pathlib import Path

p = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\data\locations.ts")
text = p.read_text(encoding="utf-8")

pos = {
  "rajkot": (0, 0, 140),
  "dwarka": (-952, 34, 160),
  "somnath": (-282, 839, 160),
  "gir": (116, 638, 170),
  "junagadh": (-224, 405, 150),
  "kutch": (-588, -526, 180),
  "statue_of_unity": (1522, 272, 160),
  "saputara": (1534, 969, 150),
  "ahmedabad": (920, -379, 140),
  "surat": (1154, 718, 140),
  "patan_modhera": (674, -876, 150),
  "pavagadh": (1489, -161, 150),
  "dholavira": (-307, -890, 170),
  "palitana": (505, 428, 150),
  "vadodara": (1164, 40, 140),
  "dandi": (884, 461, 140),
}

for lid, (x, z, r) in pos.items():
    marker = "id: '%s'" % lid
    i = text.find(marker)
    if i < 0:
        raise SystemExit("missing " + lid)
    wp = text.find("worldPosition:", i)
    zr = text.find("zoneRadius:", wp)
    if wp < 0 or zr < 0 or zr - i > 2500:
        raise SystemExit("bad span for " + lid)
    end = text.find("\n", zr)
    block = text[wp:end]
    # expect worldPosition line then zoneRadius line — replace both
    new_block = "worldPosition: { x: %d, z: %d },\n    zoneRadius: %d" % (x, z, r)
    # from worldPosition to end of zoneRadius line
    text = text[:wp] + new_block + text[end:]
    print("patched", lid)

g = """  {
    id: 'gandhinagar',
    nameGujarati: 'ગાંધીનગર (સેક્ટર સિટી)',
    nameEnglish: 'Gandhinagar',
    region: 'north_gujarat',
    regionNameGujarati: 'ઉત્તર/મધ્ય ગુજરાત',
    tagline: 'ગુજરાતની રાજધાની — ચોરસ સેક્ટરોની આયોજિત નગરી',
    description: 'ચોરસ સેક્ટર નગરી. દરેક સેક્ટર રસ્તાથી અલગ, હરિયાળી પટ્ટી વચ્ચે, અમદાવાદ સાથે ભળ્યા વગર.',
    history: '૧૯૬૦માં ગુજરાત રાજ્યની રચના પછી ગાંધીનગર નવી રાજધાની તરીકે આયોજિત થયું. સેક્ટર ગ્રિડ તેની ઓળખ છે.',
    passportStory: 'ગાંધીનગર ભારતની સૌથી આયોજિત રાજધાનીઓમાંની એક છે — ચોરસ સેક્ટર, પહોળા રસ્તા, અને અમદાવાદથી અલગ હરિયાળી પટ્ટી.',
    famousFood: 'ગાંધીનગર ધોકળા અને સેક્ટર ચા',
    foodDescription: 'નરમ ખમણ-ધોકળા અને સેક્ટર 21ની મસાલા ચા.',
    culturalHighlights: ['સચિવાલય', 'અક્ષરધામ', 'ઇન્દ્રોદા પાર્ક', 'સેક્ટર ચોક'],
    landmarks: ['ગુજરાત સચિવાલય', 'અક્ષરધામ', 'ઇન્દ્રોદા નેચર પાર્ક', 'સેક્ટર 21 ચોક'],
    worldPosition: { x: 1001, z: -721 },
    zoneRadius: 120,
    environmentTheme: 'city',
    ambientAudioType: 'city',
    signboardText: 'ગાંધીનગર રાજધાની | સેક્ટર સિટી — અમદાવાદ 32 KM',
    icon: '🟩',
  },
"""
if "id: 'gandhinagar'" not in text:
    needle = "    id: 'surat',"
    if needle not in text:
        raise SystemExit("surat marker missing")
    text = text.replace(needle, g + needle, 1)
    print("inserted gandhinagar")

p.write_text(text, encoding="utf-8")
print("ok", p.stat().st_size)
