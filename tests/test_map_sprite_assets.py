import hashlib
import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]


class MapSprites(unittest.TestCase):
    def test_nine_atlas_exports_and_new_hd_terrain(self):
        manifest=json.loads((ROOT/'MAP/atlas-sprites/manifest.json').read_text())
        self.assertEqual(manifest['atlases'],9)
        self.assertEqual(len({r['source'] for r in manifest['sprites']}),9)
        for r in manifest['sprites']+list(manifest['terrain'].values()):
            data=(ROOT/r['src']).read_bytes()
            self.assertEqual(data[:8],b'\x89PNG\r\n\x1a\n')
            self.assertEqual(data[25],6)
            self.assertEqual(struct.unpack('>II',data[16:24]),(r['width'],r['height']))
        data=(ROOT/'MAP/hd/courtyard-island.png').read_bytes()
        self.assertEqual(data[25],6)
        self.assertGreaterEqual(struct.unpack('>II',data[16:24])[0],1536)

    def test_runtime_sprite_catalog(self):
        catalog=json.loads((ROOT / 'MAP/sprite-catalog.json').read_text())
        for group,count in [('maps',45),('modules',5),('monsters',104),('skills',96),('characters',44),('items',6),('npcs',4)]:
            entries=catalog[group].values() if group=='modules' else catalog[group]
            self.assertEqual(len(catalog[group]),count)
            for entry in entries:
                path=ROOT / entry['src']
                self.assertTrue(path.resolve().is_relative_to(ROOT))
                data=path.read_bytes()
                self.assertEqual(data[:8],b'\x89PNG\r\n\x1a\n')
                self.assertEqual(struct.unpack('>II',data[16:24]),(entry['width'],entry['height']))

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
