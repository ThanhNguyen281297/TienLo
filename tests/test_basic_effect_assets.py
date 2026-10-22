"""Standalone PNG/manifest checks: transparent intact materials for every class."""
import json
import struct
import unittest
import zlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def alpha_rows(file):
    data=file.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';w,h=struct.unpack('>II',data[16:24]);assert data[24:26]==bytes([8,6]) and data[28]==0
    offset=8;chunks=[]
    while offset<len(data):
        n=struct.unpack('>I',data[offset:offset+4])[0];kind=data[offset+4:offset+8]
        if kind==b'IDAT':chunks.append(data[offset+8:offset+8+n])
        offset+=n+12
    raw=zlib.decompress(b''.join(chunks));stride=w*4+1;rows=[];previous=bytearray(w)
    for y in range(h):
        base=y*stride;filter_type=raw[base];values=raw[base+4:base+stride:4];row=bytearray(w)
        for x,value in enumerate(values):
            left=row[x-1] if x else 0;up=previous[x];corner=previous[x-1] if x else 0
            if filter_type==1:value+=left
            elif filter_type==2:value+=up
            elif filter_type==3:value+=(left+up)//2
            elif filter_type==4:
                p=left+up-corner;a,b,c=abs(p-left),abs(p-up),abs(p-corner);value+=left if a<=b and a<=c else up if b<=c else corner
            else:assert filter_type==0
            row[x]=value&255
        rows.append(row);previous=row
    return w,h,rows

class BasicEffectAssets(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parts=json.loads((ROOT/'Skill/Basic/parts.json').read_text(encoding='utf-8'));cls.images={m['name']:alpha_rows(ROOT/m['file']) for m in cls.parts}
    def test_four_classes_and_24_distinct_complete_parts(self):
        self.assertEqual([m['name'] for m in self.parts],['Kiem','Liem','Thuong','Quat'])
        for m in self.parts:
            self.assertEqual(len(m['parts']),6);w,h,_=self.images[m['name']];self.assertEqual([w,h],m['size'])
            for part in m['parts']:
                x,y,pw,ph=part['rect'];self.assertTrue(0<=x<x+pw<=w and 0<=y<y+ph<=h);self.assertGreater(pw,100);self.assertGreater(ph,80)
    def test_png_background_really_is_transparent(self):
        for name,(w,h,rows) in self.images.items():
            self.assertLess(max(rows[0][0],rows[0][-1],rows[-1][0],rows[-1][-1]),8,name)
            self.assertGreater(sum(v<8 for row in rows for v in row)/(w*h),.55,name)
    def test_no_solid_blade_or_feather_is_cut_at_cell_edges(self):
        for m in self.parts:
            _,_,rows=self.images[m['name']]
            for part in m['parts']:
                x,y,w,h=part['cell'];edge=list(rows[y][x:x+w])+list(rows[y+h-1][x:x+w])+[row[x] for row in rows[y:y+h]]+[row[x+w-1] for row in rows[y:y+h]]
                self.assertLess(max(edge),150,m['name']+' '+str(part['cell']))
                x,y,w,h=part['rect'];self.assertGreater(max(max(row[x:x+w]) for row in rows[y:y+h]),180)
    def test_runtime_manifest_and_load_order(self):
        source=(ROOT/'js/22b-basic-effect-parts.js').read_text(encoding='utf-8').split('window.basicEffectParts=',1)[1].strip().removesuffix(';');self.assertEqual(json.loads(source),self.parts)
        html=(ROOT/'index.html').read_text(encoding='utf-8');self.assertLess(html.index('js/22b-basic-effect-parts.js'),html.index('js/23-basic-combo-effects.js'))

if __name__=='__main__':unittest.main()
