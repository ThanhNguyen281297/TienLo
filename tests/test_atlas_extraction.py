"""Every nontransparent source pixel survives the nine-atlas export exactly once."""
import json
import unittest
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]


class AtlasExtractionTests(unittest.TestCase):
    def test_all_nine_atlases_reconstruct_without_cutting_artwork(self):
        manifest = json.loads((ROOT/'MAP/atlas-sprites/manifest.json').read_text())
        sources = {r['source'] for r in manifest['sprites']}
        self.assertEqual(len(sources), 9)
        for source in sorted(sources):
            original = np.array(Image.open(ROOT/source).convert('RGBA'))
            result = np.zeros_like(original)
            coverage = np.zeros(original.shape[:2], dtype=np.uint8)
            for r in manifest['sprites']:
                if r['source'] != source:
                    continue
                image = Image.open(ROOT/r['src'])
                self.assertEqual(image.mode, 'RGBA')
                x0, y0, x1, y1 = r['sourceBox']
                p = r['padding']
                sprite = np.array(image)[p:p+y1-y0, p:p+x1-x0]
                visible = sprite[:, :, 3] > 0
                target = result[y0:y1, x0:x1]
                target[visible] = sprite[visible]
                coverage[y0:y1, x0:x1] += visible
            visible = original[:, :, 3] > 0
            self.assertTrue(np.all(coverage[visible] == 1), source)
            self.assertTrue(np.array_equal(result[visible], original[visible]), source)


if __name__ == '__main__':
    unittest.main()
