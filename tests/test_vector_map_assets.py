"""Validate complete native map artwork coverage and standalone SVG safety."""
import json
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


class VectorMapAssets(unittest.TestCase):
    def test_complete_standalone_geometry(self):
        folder = ROOT / 'MAP/vector'
        manifest = json.loads((folder / 'manifest.json').read_text())
        self.assertEqual(set(manifest), {p.stem for p in (ROOT / 'MAP/sprites').glob('*.png')})
        self.assertEqual(len(manifest), 45)
        for asset in folder.glob('*.svg'):
            with self.subTest(asset=asset.name):
                root = ET.parse(asset).getroot()
                self.assertEqual(root.tag, '{http://www.w3.org/2000/svg}svg')
                self.assertGreaterEqual(float(root.attrib['width']), 768)
                box = list(map(float, root.attrib['viewBox'].split()))
                self.assertEqual(len(box), 4)
                self.assertGreater(box[2], 0)
                self.assertGreater(box[3], 0)
                for node in root.iter():
                    self.assertNotIn(node.tag.rsplit('}', 1)[-1], ('image', 'script', 'foreignObject'))
                    self.assertFalse(any('href' in key for key in node.attrib))
        self.assertEqual(len(list(folder.glob('*.svg'))), 49)


if __name__ == '__main__':
    unittest.main()
