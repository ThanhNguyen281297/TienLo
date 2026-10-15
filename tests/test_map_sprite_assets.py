import hashlib
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MapSprites(unittest.TestCase):
    def test_separate_rgba_pngs(self):
        assets = json.loads((ROOT / 'MAP/sprites/manifest.json').read_text())
        self.assertEqual(len(assets), 45)
        self.assertEqual(set(assets), {p.stem for p in (ROOT / 'MAP/sprites').glob('*.png')})
        for name, asset in assets.items():
            with self.subTest(name=name):
                data = (ROOT / asset['file']).read_bytes()
                self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
                self.assertEqual(struct.unpack('>II', data[16:24]), (asset['width'], asset['height']))
                self.assertEqual(data[25], 6, 'PNG has native RGBA transparency')
                self.assertEqual(hashlib.sha256(data).hexdigest(), asset['sha256'])


if __name__ == '__main__':
    unittest.main()
