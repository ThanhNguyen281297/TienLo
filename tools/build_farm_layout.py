"""Keep the file:// browser configuration identical to the server JSON."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
layout = json.loads((ROOT / 'Map/farm-layout.json').read_text(encoding='utf-8'))
(ROOT / 'js/19c-farm-layout.js').write_text(
    '/* Generated from Map/farm-layout.json; client and server share the same layout. */\n'
    + 'window.farmLayout=' + json.dumps(layout, ensure_ascii=False, separators=(',', ':')) + ';\n',
    encoding='utf-8')
