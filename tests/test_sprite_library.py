"""Lossless standalone monster exports, module provenance and library coverage."""
import json
from pathlib import Path
import unittest
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]


class SpriteLibraryTest(unittest.TestCase):
    def test_complete_exports(self):
        catalog = json.loads((ROOT / 'MAP/sprite-catalog.json').read_text())
        for key, count in [('maps',45),('modules',5),('monsters',104),('skills',96),('characters',44),('items',6),('npcs',4)]:
            self.assertEqual(len(catalog[key]), count, key)
        for prop in catalog['maps']:
            image=Image.open(ROOT/prop['src']).convert('RGBA')
            self.assertEqual(prop['bounds'],list(image.getchannel('A').getbbox()))
        for frame in catalog['monsters']:
            source=Image.open(ROOT / frame['source']).convert('RGBA')
            pose=Image.open(ROOT / frame['src']).convert('RGBA')
            rect=frame['rect'];x,y,w,h=(rect[k] for k in ('x','y','w','h'));pad=frame['padding']
            self.assertEqual(pose.size,(w+pad*2,h+pad*2))
            self.assertEqual(pose.crop((pad,pad,pad+w,pad+h)).tobytes(),source.crop((x,y,x+w,y+h)).tobytes())
            self.assertIsNone(pose.crop((0,0,pose.width,pad)).getchannel('A').getbbox())
        for frame in catalog['modules'].values():
            source=Image.open(ROOT / frame['source']).convert('RGBA')
            pose=Image.open(ROOT / frame['src']).convert('RGBA')
            self.assertEqual(pose.tobytes(),source.crop(frame['sourceBox']).tobytes())


if __name__ == '__main__':unittest.main()
