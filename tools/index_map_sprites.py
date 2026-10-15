"""Index the individual PNG props extracted from the original MAP atlases."""
from pathlib import Path
import hashlib
import json
import struct

ROOT = Path(__file__).resolve().parents[1]
folder = ROOT / 'MAP/sprites'
assets = {}
for file in sorted(folder.glob('*.png')):
    data = file.read_bytes()
    width, height = struct.unpack('>II', data[16:24])
    assets[file.stem] = dict(file='MAP/sprites/' + file.name, width=width,
                             height=height, sha256=hashlib.sha256(data).hexdigest())
(folder / 'manifest.json').write_text(json.dumps(assets, indent=2) + '\n', encoding='utf-8')
cards = ''.join(f'<figure><img src="{key}.png" alt="{key}"><figcaption>{key} · {a["width"]} × {a["height"]}</figcaption></figure>' for key, a in assets.items())
(folder / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8">
<title>Map PNG assets</title><style>body{background:#142830;color:#e8dfc2;font:16px sans-serif;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}figure{margin:0;padding:16px;background:#29404a;border:1px solid #48616b;border-radius:12px}img{width:100%;height:230px;object-fit:contain}figcaption{margin-top:12px}</style>
<h1>45 individual map PNG assets</h1><p>Original painted artwork, transparent background, native resolution.</p><main>''' + cards + '</main></html>', encoding='utf-8')
print(f'Indexed {len(assets)} separate PNG map props.')
