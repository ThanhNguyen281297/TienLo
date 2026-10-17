"""Losslessly package ImageGen poses as individual PNGs; never resize artwork.

Find transparent gutters near the requested grid, rather than slicing through
a bright blade when the generated layout is a few pixels off the grid.
The source sheets remain untouched. Every source pixel is copied exactly once.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'Skill' / 'Class'
manifest = {}

def gutter(alpha, nominal, axis):
    start, end = nominal - 75, nominal + 76
    band = alpha[start:end] if axis == 0 else alpha[:, start:end]
    core = (band > 160).sum(axis=1 if axis == 0 else 0)
    energy = band.astype(np.int64).sum(axis=1 if axis == 0 else 0)
    candidates = np.where(core == core.min())[0]
    index = min(candidates, key=lambda i: (int(energy[i]), abs(start + i - nominal)))
    if core[index] != 0:
        raise ValueError('No clear gutter: regenerate this sheet instead of cutting the artwork')
    return start + int(index)

for source in sorted(BASE.glob('*/*-sheet.png')):
    image = Image.open(source).convert('RGBA')
    alpha = np.array(image.getchannel('A'))
    width, height = image.size
    middle = gutter(alpha, height // 2, 0)
    key = source.stem.removesuffix('-sheet')
    output = source.parent / key
    output.mkdir(exist_ok=True)
    frames = []
    copied = 0
    for row, (top, bottom) in enumerate(((0, middle), (middle, height))):
        band = alpha[top:bottom]
        xs = [0, gutter(band, width // 3, 1), gutter(band, width * 2 // 3, 1), width]
        for col in range(3):
            box = (xs[col], top, xs[col + 1], bottom)
            pose = image.crop(box)
            copied += pose.width * pose.height
            # Add empty safety space without throwing away or resizing any pixels.
            frame = Image.new('RGBA', (pose.width + 64, pose.height + 64))
            frame.paste(pose, (32, 32))
            name = output / f'{row * 3 + col + 1:02}.png'
            frame.save(name, optimize=True)
            a = np.array(frame.getchannel('A'))
            yy, xx = np.where(a > 24)
            bounds = [int(xx.min()), int(yy.min()), int(xx.max()+1), int(yy.max()+1)]
            frames.append({'src':name.relative_to(ROOT).as_posix(), 'bounds':bounds,
                           'size':list(frame.size), 'sourceBox':list(box)})
    assert copied == width * height
    manifest.setdefault(source.parent.name, {})[key] = frames

assert sum(len(skills) for skills in manifest.values()) == 16
(BASE / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT / 'js/10-skill-sprite-manifest.js').write_text('window.skillSpriteManifest='+json.dumps(manifest, separators=(',', ':'))+';\n', encoding='utf-8')
print('Exported 96 complete poses from 16 ImageGen sheets, losslessly, with transparent padding.')
