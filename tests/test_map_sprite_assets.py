import hashlib
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MapSprites(unittest.TestCase):
    def test_painted_item_icons_and_hd_map_sizes(self):
        for name in ('daobao', 'ngoc', 'gioi', 'giay', 'phapbao', 'consume'):
            with self.subTest(item=name):
                data = (ROOT / 'MAP/items' / (name + '.png')).read_bytes()
                self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
                self.assertEqual(data[25], 6)
                self.assertGreaterEqual(min(struct.unpack('>II', data[16:24])), 768)
        for name in ('greatIsland', 'pineTree', 'mysticHall', 'thunderHall', 'tile'):
            data = (ROOT / 'MAP/sprites' / (name + '.png')).read_bytes()
            self.assertGreaterEqual(struct.unpack('>II', data[16:24])[0], 1200)

    def test_separate_rgba_pngs(self):
        assets = json.loads((ROOT / 'MAP/sprites/manifest.json').read_text())
        self.assertEqual(len(assets), 45)
        self.assertEqual(set(assets), {p.stem for p in (ROOT / 'MAP/sprites').glob('*.png')})
        for name, asset in assets.items():
            with self.subTest(name=name):
                data = (ROOT / asset['file']).read_bytes()
                self.assertEqual(data[:8], b'\x89PNG\r\n\x1a\n')
                self.assertEqual(struct.unpack('>II', data[16:24]), (asset['width'], asset['height']))
                self.assertIn(data[25], (2, 6) if name == 'tile' else (6,), 'Terrain tile may be opaque; props must have RGBA transparency')
                self.assertEqual(hashlib.sha256(data).hexdigest(), asset['sha256'])


if __name__ == '__main__':
    unittest.main()
