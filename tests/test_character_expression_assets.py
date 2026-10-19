import json
from pathlib import Path
import struct
import unittest

ROOT = Path(__file__).resolve().parents[1]


class CharacterExpressions(unittest.TestCase):
    def test_complete_transparent_character_atlases(self):
        data=json.loads((ROOT/'Character/Expressions/manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(data['type'],'whole-character')
        expected={f'{folder}/{gender}' for folder in ('Kiem','Liem','Thuong','Quat') for gender in ('Nam','Nu')}
        self.assertEqual(set(data['atlases']),expected)
        poses={(v,d) for v in range(1,11) for d in ('truoc','trai','phai')}
        for key,atlas in data['atlases'].items():
            with self.subTest(atlas=key):
                self.assertEqual(atlas['file'],f'Character/Expressions/{key}.png')
                png=(ROOT/atlas['file']).read_bytes()
                self.assertEqual(png[:8],b'\x89PNG\r\n\x1a\n')
                self.assertEqual(png[25],6,'Sprites must have RGBA transparency')
                self.assertEqual(list(struct.unpack('>II',png[16:24])),atlas['size'])
                self.assertEqual(len(atlas['frames']),30)
                self.assertEqual({(f['variant'],f['direction']) for f in atlas['frames']},poses)
                for frame in atlas['frames']:
                    x,y,w,h=frame['rect'];ax,ay=frame['anchor']
                    self.assertGreaterEqual(w,70)
                    self.assertGreaterEqual(h,140)
                    self.assertTrue(x>=0 and y>=0 and x+w<=atlas['size'][0] and y+h<=atlas['size'][1])
                    self.assertTrue(0<ax<w and h-8<=ay<=h,'Feet must anchor at the bottom of a whole character')
                    self.assertTrue(.65<=frame['pixelAspect']<=1)
                for direction in data['directions']:
                    ratios=[f['rect'][2]*f['pixelAspect']/f['anchor'][1] for f in atlas['frames'] if f['direction']==direction]
                    self.assertLess(max(ratios)/min(ratios),1.2,'Expression changes must retain body proportions')

    def test_browser_metadata_matches_source(self):
        source=(ROOT/'js/35l-expression-frames.js').read_text(encoding='utf-8')
        browser=json.loads(source.split('window.characterExpressionFrames=',1)[1].rstrip().removesuffix(';'))
        self.assertEqual(browser,json.loads((ROOT/'Character/Expressions/manifest.json').read_text(encoding='utf-8')))
        index=(ROOT/'index.html').read_text(encoding='utf-8-sig')
        self.assertLess(index.index('js/35l-expression-frames.js'),index.index('js/35l-character-masks.js'))


if __name__=='__main__': unittest.main()
