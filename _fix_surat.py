from pathlib import Path
p = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\data\locations.ts")
t = p.read_text(encoding="utf-8")
old = "    icon: '🟩',\n  },\n    id: 'surat',"
new = "    icon: '🟩',\n  },\n  {\n    id: 'surat',"
if old not in t:
    old = old.replace("\n", "\r\n")
    new = new.replace("\n", "\r\n")
    if old not in t:
        raise SystemExit("surat splice not found")
t = t.replace(old, new, 1)
p.write_text(t, encoding="utf-8")
print("surat brace restored")
