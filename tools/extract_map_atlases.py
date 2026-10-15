"""Export the nine original atlases at native resolution, with independent alpha masks.

Connected artwork is deliberately kept together: a pavilion and the island under it
are a compound, not a building recovered from pixels hidden behind the pavilion.
The manifest records this distinction. Originals are never modified.
Requires Pillow, numpy and scipy; runtime has no image-processing dependency.
"""
from pathlib import Path
from io import BytesIO
import json
import numpy as np
from PIL import Image
from scipy import ndimage as nd

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'MAP/atlas-sprites'
DEST.mkdir(exist_ok=True)


def save(image, path):
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    data = buffer.getvalue()
    if path.exists() and path.read_bytes() == data:
        return
    temporary = path.with_suffix('.png.tmp')
    temporary.write_bytes(data)
    temporary.replace(path)


records = []
for atlas in range(1, 10):
    source = 'MAP/asset' + (str(atlas) if atlas > 1 else '') + '.png'
    rgba = np.array(Image.open(ROOT / source).convert('RGBA'))
    # No morphological closing: it joins adjacent props and fills genuine holes.
    labels, _ = nd.label(rgba[:, :, 3] > 24)
    counts = np.bincount(labels.ravel())
    major = np.flatnonzero(counts >= 200)
    major = major[major != 0]
    seeds = np.where(np.isin(labels, major), labels, 0)
    # Assign antialiasing and detached small details to their nearest object,
    # rather than including every neighbouring object in a rectangular crop.
    _, nearest = nd.distance_transform_edt(seeds == 0, return_indices=True)
    assigned = seeds[tuple(nearest)]
    folder = DEST / f'{atlas:02}'
    folder.mkdir(exist_ok=True)
    objects = []
    for label in major:
        yy, xx = np.nonzero((assigned == label) & (rgba[:, :, 3] > 0))
        if not len(xx):
            continue
        box = [int(xx.min()), int(yy.min()), int(xx.max()+1), int(yy.max()+1)]
        objects.append((box, int(label)))
    objects.sort(key=lambda row: (row[0][1] // 70, row[0][0]))
    for index, (box, label) in enumerate(objects, 1):
        x0, y0, x1, y1 = box
        pixels = rgba[y0:y1, x0:x1].copy()
        pixels[:, :, 3] *= (assigned[y0:y1, x0:x1] == label)
        sprite = Image.new('RGBA', (x1-x0+16, y1-y0+16))
        sprite.paste(Image.fromarray(pixels), (8, 8))
        key = f'atlas-{atlas:02}-{index:03}'
        path = folder / f'{key}.png'
        save(sprite, path)
        records.append(dict(id=key, src=path.relative_to(ROOT).as_posix(),
                            width=sprite.width, height=sprite.height,
                            source=source, sourceBox=box, padding=8,
                            kind='compound' if x1-x0 > 450 or y1-y0 > 400 else 'prop'))

# Hand-reviewed terrain pieces used by the renderer. The alpha of neighbouring
# objects is excluded by the connected mask, not by opaque background painting.
curated = {
    'court': (3, [0, 510, 375, 737], [175, 610]),
    'roundCourt': (3, [374, 518, 640, 704], [490, 610]),
    'rockSpire': (3, [877, 885, 1050, 1086], [950, 980]),
    'lotusTerrace': (7, [0, 420, 322, 592], [130, 510]),
}
terrain = {}
for key, (atlas, box, seed) in curated.items():
    source = f'MAP/asset{atlas}.png'
    rgba = np.array(Image.open(ROOT/source).convert('RGBA'))
    x0, y0, x1, y1 = box
    pixels = rgba[y0:y1, x0:x1].copy()
    labels, _ = nd.label(pixels[:, :, 3] > 24)
    label = labels[seed[1]-y0, seed[0]-x0]
    if not label:
        raise ValueError(f'Missing terrain seed: {key}')
    # Include the original antialias fringe within three pixels of this object.
    distance = nd.distance_transform_edt(labels != label)
    pixels[:, :, 3] *= (distance <= 3)
    image = Image.fromarray(pixels)
    tight = image.getchannel('A').getbbox()
    image = image.crop(tight)
    path = DEST / f'{key}.png'
    save(image, path)
    terrain[key] = dict(id=key, src=path.relative_to(ROOT).as_posix(), width=image.width,
                        height=image.height, source=source, sourceBox=box, kind='terrain')

manifest = dict(atlases=9, sprites=records, terrain=terrain)
used = {r['src'] for r in records} | {r['src'] for r in terrain.values()}
# This directory is exporter-owned. Remove only obsolete PNG outputs here,
# including files from a previous segmentation, never original source atlases.
for path in DEST.rglob('*.png'):
    path.resolve().relative_to(DEST.resolve())
    if path.relative_to(ROOT).as_posix() not in used:
        path.unlink()
(DEST/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
(ROOT/'js/10c-atlas-manifest.js').write_text('window.mapAtlasSprites='+json.dumps(manifest, separators=(',', ':'))+';\n', encoding='utf-8')
print(f'Exported {len(records)} native alpha props/compounds and {len(terrain)} terrain pieces from all nine atlases.')
