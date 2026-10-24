"""Build display-size WebP variants for artwork that is drawn much smaller than its source.

Item icons are painted at 1254 px but appear at 44-160 CSS px (inventory, HUD,
equipment drawn on the character). Each listed PNG gets a sibling
`<name>.d.webp`, uniformly scaled so its longest side is at most the folder cap.
The aspect ratio is kept, so every renderer that sizes artwork from
naturalWidth/naturalHeight (all Item users do) draws exactly the same picture.
Sprite sheets addressed by pixel rectangles (monster atlases, expressions,
skills, map atlases) are NOT listed here and keep their full-size WebP twin.

js/00-asset-webp.js prefers the .d.webp when the PNG appears in
js/00-display-manifest.js. Source PNGs stay untouched.

Run after adding or changing item artwork:  python3 tools/build_display_variants.py
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
QUALITY = 86
# Longest side in px. Larger caps where the art is drawn big: realm titles/auras
# are resampled to 1024 px by js/35j-character-auras.js; formation rings and
# weapons are drawn as skill circles and spell actors.
CAPS = {
    'Item/CanhGioi': 1024,
    'Item/DHCanhGioi': 1024,
    'Item/PhapTran': 768,
    'Item/VuKhi': 768,
    'Character/NPC': 768,
}
DEFAULT_CAP = 512
SKIP = ('Item/TrangPhuc/',)  # outfit sheet addressed by rectangles


def cap_for(path):
    for prefix, cap in CAPS.items():
        if path.startswith(prefix + '/'):
            return cap
    return DEFAULT_CAP


def candidates():
    for folder in ('Item', 'Character/NPC'):
        for p in sorted((ROOT / folder).rglob('*.png')):
            rel = str(p.relative_to(ROOT)).replace(os.sep, '/')
            if not rel.startswith(SKIP):
                yield rel


def build(path):
    src = ROOT / path
    dst = src.with_name(src.stem + '.d.webp')
    cap = cap_for(path)
    with Image.open(src) as image:
        w, h = image.size
        if max(w, h) <= cap * 1.15:
            dst.unlink(missing_ok=True)
            return path, None
        scale = cap / max(w, h)
        size = (max(1, round(w * scale)), max(1, round(h * scale)))
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime or Image.open(dst).size != size:
            image = image.convert('RGBA') if ('A' in image.getbands() or image.mode == 'P') else image.convert('RGB')
            image.resize(size, Image.LANCZOS).save(dst, 'WEBP', quality=QUALITY, method=6, alpha_quality=92)
        return path, [size[0], size[1]]


def monster_thumbnails():
    """First idle pose of each animated monster as Character/Monsters/<name>/thumb.webp.

    HUD buttons, the stable and portal dialogs show a 40-92 px portrait; without
    this they download the whole 1 MB atlas just to cut out one frame.
    """
    text = (ROOT / 'js/35n-monster-frames.js').read_text(encoding='utf-8')
    frames = json.loads(text.split('=', 1)[1].strip().rstrip(';'))
    made = []
    for name, meta in frames.items():
        x, y, w, h = meta['frames'][0]['rect']
        dst = ROOT / 'Character/Monsters' / name / 'thumb.webp'
        with Image.open(ROOT / meta['file']) as atlas:
            crop = atlas.convert('RGBA').crop((x, y, x + w, y + h))
        crop.thumbnail((192, 192), Image.LANCZOS)
        crop.save(dst, 'WEBP', quality=88, method=6, alpha_quality=92)
        made.append(name)
    return made


def main():
    thumbs = monster_thumbnails()
    print(f'{len(thumbs)} monster thumbnails')
    manifest = {}
    with ProcessPoolExecutor() as pool:
        for path, size in pool.map(build, list(candidates()), chunksize=2):
            if size:
                manifest[path] = size
    before = sum((ROOT / p).with_suffix('.webp').stat().st_size if (ROOT / p).with_suffix('.webp').exists() else (ROOT / p).stat().st_size for p in manifest)
    after = sum((ROOT / p).with_name(Path(p).stem + '.d.webp').stat().st_size for p in manifest)
    (ROOT / 'js/00-display-manifest.js').write_text('window.displayAssets=' + json.dumps(manifest, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'{len(manifest)} display variants: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB')


if __name__ == '__main__':
    sys.exit(main())
