"""Native, lossless alpha sprites from the user supplied theme atlases 10–15.

Touching scenic architecture stays a compound: hidden pixels are not invented.
This exporter owns only MAP/theme-sprites, never the nine original atlas exports.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'MAP/theme-sprites'


def export():
    records=[]
    for atlas in range(10,16):
        source=f'MAP/theme-sources/asset{atlas}-alpha.png'
        rgba=np.array(Image.open(ROOT/source).convert('RGBA'))
        if rgba[:,:,3].min()!=0:
            raise ValueError(f'{source} has no transparent background; do not cut by RGB.')
        labels,_=nd.label(rgba[:,:,3]>24)
        counts=np.bincount(labels.ravel())
        major=np.flatnonzero(counts>=200);major=major[major!=0]
        seeds=np.where(np.isin(labels,major),labels,0)
        _,nearest=nd.distance_transform_edt(seeds==0,return_indices=True)
        assigned=seeds[tuple(nearest)]
        objects=[]
        for label in major:
            yy,xx=np.nonzero((assigned==label)&(rgba[:,:,3]>0))
            if len(xx):objects.append(([int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)],int(label)))
        objects.sort(key=lambda row:(row[0][1]//70,row[0][0]))
        folder=DEST/str(atlas);folder.mkdir(parents=True,exist_ok=True)
        for i,(box,label) in enumerate(objects,1):
            x0,y0,x1,y1=box;pixels=rgba[y0:y1,x0:x1].copy()
            pixels[:,:,3]*=(assigned[y0:y1,x0:x1]==label)
            sprite=Image.new('RGBA',(x1-x0+16,y1-y0+16));sprite.paste(Image.fromarray(pixels),(8,8))
            key=f'theme-{atlas}-{i:03}';path=folder/f'{key}.png';sprite.save(path)
            records.append(dict(id=key,src=path.relative_to(ROOT).as_posix(),width=sprite.width,height=sprite.height,source=source,original=f'MAP/asset{atlas}.png',sourceBox=box,padding=8,kind='compound' if max(x1-x0,y1-y0)>300 else 'prop'))
        # A native extraction contact sheet, not an in-game atlas or image edit.
        own=[r for r in records if r['source']==source];sheet=Image.new('RGB',(800,((len(own)+5)//6)*110),'#14232c');draw=ImageDraw.Draw(sheet)
        for i,r in enumerate(own):
            img=Image.open(ROOT/r['src']);img.thumbnail((122,86));x=(i%6)*133;y=(i//6)*110;sheet.paste(img,(x+(128-img.width)//2,y),img);draw.text((x+3,y+88),r['id'],fill='#ecd799')
        sheet.save(folder/'contact-sheet.jpg')
        print(f'asset{atlas}: {len(own)} sprites')
    manifest=dict(atlases=list(range(10,16)),sprites=records)
    (DEST/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    (ROOT/'js/10d-theme-manifest.js').write_text('window.themeAtlasSprites='+json.dumps(manifest,separators=(',',':'))+';\n',encoding='utf-8')


if __name__=='__main__':export()
