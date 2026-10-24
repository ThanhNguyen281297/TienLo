"""Build lightweight WebP twins for the game artwork and the runtime manifest.

Every PNG under Character/, Item/, Map/ and Skill/ gets a sibling .webp with the
same pixel size (atlas rectangles and size checks stay valid). The browser keeps
requesting the .png names; js/00-asset-webp.js swaps them for the .webp twin when
it exists in js/00-webp-manifest.js.

Run after adding or changing artwork:  python3 tools/build_webp.py
"""
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
FOLDERS = ('Character', 'Item', 'Map', 'Skill')
QUALITY = 84


def convert(path):
    src = ROOT / path
    dst = src.with_suffix('.webp')
    if dst.exists() and dst.stat().st_mtime >= src.stat().st_mtime:
        return path, src.stat().st_size, dst.stat().st_size
    image = Image.open(src)
    image = image.convert('RGBA') if ('A' in image.getbands() or image.mode == 'P') else image.convert('RGB')
    image.save(dst, 'WEBP', quality=QUALITY, method=6, alpha_quality=90)
    return path, src.stat().st_size, dst.stat().st_size


def main():
    files = sorted(str(p.relative_to(ROOT)).replace(os.sep, '/') for folder in FOLDERS for p in (ROOT / folder).rglob('*.png'))
    kept, before, after = [], 0, 0
    with ProcessPoolExecutor() as pool:
        for path, a, b in pool.map(convert, files, chunksize=4):
            # Keep the WebP only when it is meaningfully smaller.
            if b < a * .9:
                kept.append(path)
                before += a
                after += b
            else:
                (ROOT / path).with_suffix('.webp').unlink(missing_ok=True)
    (ROOT / 'js/00-webp-manifest.js').write_text('window.webpAssets=' + json.dumps(kept, separators=(',', ':')) + ';\n', encoding='utf-8')
    print(f'{len(kept)}/{len(files)} PNG have WebP twins: {before / 1e6:.1f} MB -> {after / 1e6:.1f} MB')


if __name__ == '__main__':
    sys.exit(main())
