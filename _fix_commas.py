from pathlib import Path
import re
p = Path(r"C:\Users\yashk\Downloads\Chhakaro-Gujarat-game\src\data\locations.ts")
t = p.read_text(encoding="utf-8")
t2, n = re.subn(r"(zoneRadius: \d+)(\r?\n)", r"\1,\2", t)
p.write_text(t2, encoding="utf-8")
print("commas added", n)
