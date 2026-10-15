"""Package exported sprites and the offline searchable library for map authors."""
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT / 'MAP/sprite-catalog.json').read_text())
paths = set()
for group in ('maps','modules','monsters','skills','characters','items','npcs'):
    rows = catalog[group].values() if group == 'modules' else catalog[group]
    paths.update(row['src'] for row in rows)
paths.update(('MAP/sprite-catalog.json','MAP/sprite-library.html','MAP/SPRITE-WORKFLOW.md','js/10b-sprite-catalog.js'))
out = ROOT / 'dist/tienlo-sprite-library.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as archive:
    for path in sorted(paths):
        archive.write(ROOT / path, path)
    archive.writestr('START-HERE.txt', 'Extract the complete ZIP, then open MAP/sprite-library.html.\n304 exported PNGs and metadata; original source sheets remain in the game repository.\n')
print(f'{out}: {out.stat().st_size / 1024 / 1024:.1f} MiB')
