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
atlas = json.loads((ROOT/'MAP/atlas-sprites/manifest.json').read_text())
paths.update(r['src'] for r in atlas['sprites'])
paths.update(r['src'] for r in atlas['terrain'].values())
paths.update(('MAP/atlas-sprites/index.html','MAP/atlas-sprites/manifest.json','js/10c-atlas-manifest.js','MAP/hd/courtyard-island.png','MAP/hd/garden-grass.png'))
out = ROOT / 'dist/tienlo-sprite-library.zip'
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=1) as archive:
    for path in sorted(paths):
        archive.write(ROOT / path, path)
    archive.writestr('START-HERE.txt', 'Extract the complete ZIP, then open MAP/sprite-library.html or MAP/atlas-sprites/index.html.\nNative atlas exports include connected scenic compounds; original source sheets remain in the game repository.\n')
print(f'{out}: {out.stat().st_size / 1024 / 1024:.1f} MiB')
