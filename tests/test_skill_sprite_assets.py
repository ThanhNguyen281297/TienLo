"""Verify lossless export and transparent safety borders for all 96 poses."""
import json
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]

class SkillSpriteAssets(unittest.TestCase):
    def test_complete_lossless_frames(self):
        manifest=json.loads((ROOT/'CHARACTER/SkillSprites/manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(len(manifest),4)
        total=0
        for sect,skills in manifest.items():
            self.assertEqual(len(skills),4)
            for name,frames in skills.items():
                source=np.array(Image.open(ROOT/f'CHARACTER/SkillSprites/{sect}/{name}-sheet.png').convert('RGBA'))
                self.assertEqual(len(frames),6)
                pixels=0
                for frame in frames:
                    actual=np.array(Image.open(ROOT/frame['src']).convert('RGBA'))
                    l,t,r,b=frame['sourceBox']
                    np.testing.assert_array_equal(actual[32:-32,32:-32],source[t:b,l:r])
                    self.assertEqual(int(actual[:32,:,3].max()),0)
                    self.assertEqual(int(actual[-32:,:,3].max()),0)
                    self.assertEqual(int(actual[:,:32,3].max()),0)
                    self.assertEqual(int(actual[:,-32:,3].max()),0)
                    pixels+=(r-l)*(b-t)
                    total+=1
                self.assertEqual(pixels,source.shape[0]*source.shape[1])
        self.assertEqual(total,96)

if __name__=='__main__':unittest.main()
