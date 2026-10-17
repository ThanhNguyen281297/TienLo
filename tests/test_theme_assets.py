"""Theme exports preserve every visible pixel of the processed alpha sources."""
import json
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]


class ThemeAssets(unittest.TestCase):
    def test_six_sources_reconstruct_without_clipping_or_duplicate_pixels(self):
        manifest=json.loads((ROOT/'Map/theme-sprites/manifest.json').read_text())
        self.assertEqual(manifest['atlases'],list(range(10,16)))
        self.assertGreater(len(manifest['sprites']),300)
        for atlas in manifest['atlases']:
            source=f'Map/theme-sources/asset{atlas}-alpha.png'
            original=np.array(Image.open(ROOT/source).convert('RGBA'))
            self.assertEqual(original[:,:,3].min(),0)
            result=np.zeros_like(original);coverage=np.zeros(original.shape[:2],dtype=np.uint8)
            for r in manifest['sprites']:
                if r['source']!=source:continue
                x0,y0,x1,y1=r['sourceBox'];p=r['padding'];image=Image.open(ROOT/r['src'])
                self.assertEqual(image.size,(r['width'],r['height']))
                pixels=np.array(image)[p:p+y1-y0,p:p+x1-x0];visible=pixels[:,:,3]>0
                result[y0:y1,x0:x1][visible]=pixels[visible];coverage[y0:y1,x0:x1]+=visible
            visible=original[:,:,3]>0
            self.assertTrue(np.all(coverage[visible]==1),source)
            self.assertTrue(np.array_equal(result[visible],original[visible]),source)


if __name__=='__main__':unittest.main()
