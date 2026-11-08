"""Pixel versions of UI art (item icons, skill icons, portraits) for the Pixel art style.
For every source PNG listed, writes <name>.px.png next to it: the art reduced to a small
pixel grid (default 40 px on the long side), hard alpha, ~28-colour palette and a dark
1-px outline. The browser shows it with image-rendering: pixelated.
Run: python3 tools/pixel/icons.py  (writes js/00-pixel-manifest.js)"""
import os,sys,json,glob
import numpy as np
from PIL import Image,ImageEnhance
ROOT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..'))
def convert(path,size=40,colors=28):
    im=Image.open(path).convert('RGBA');bb=im.getbbox()
    if not bb:return None
    W,H=im.size
    if max(W,H)>1.6*min(W,H):size=int(size*2.6)   # wide badges keep their lettering readable
    s=size/max(W,H)
    tw,th=max(1,round(W*s)),max(1,round(H*s))
    a=np.asarray(im).astype(np.float32)/255;pm=a.copy();pm[...,:3]*=a[...,3:4]
    small=np.asarray(Image.fromarray((pm*255).astype('uint8'),'RGBA').resize((tw,th),Image.LANCZOS)).astype(np.float32)/255
    al=small[...,3];rgb=np.where(al[...,None]>0,small[...,:3]/np.maximum(al[...,None],1e-4),0)
    opaque=al>.45
    col=Image.fromarray((np.clip(rgb,0,1)*255).astype('uint8'),'RGB')
    col=ImageEnhance.Contrast(ImageEnhance.Color(col).enhance(1.15)).enhance(1.08)
    q=np.asarray(col.quantize(colors,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).convert('RGB'))
    out=np.zeros((th+2,tw+2,4),np.uint8);out[1:-1,1:-1,:3]=q;out[1:-1,1:-1,3]=opaque*255
    m=out[...,3]>0;edge=np.zeros_like(m)
    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):edge|=np.roll(np.roll(m,dy,0),dx,1)
    edge&=~m
    # outline colour: darkened neighbour average
    src=out[...,:3].astype(np.float32);acc=np.zeros_like(src);cnt=np.zeros(m.shape,np.float32)
    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
        nm=np.roll(np.roll(m,dy,0),dx,1);acc+=np.roll(np.roll(src,dy,0),dx,1)*nm[...,None];cnt+=nm
    dark=(acc/np.maximum(cnt[...,None],1))*.28+np.array([8,6,12]);out[edge,:3]=dark[edge].astype(np.uint8);out[edge,3]=255
    return Image.fromarray(out,'RGBA')
GROUPS=[('Item/**/*.png',40),('Character/NPC/*.png',56)]
if __name__=='__main__':
    made=[]
    for pattern,size in GROUPS:
        for p in sorted(glob.glob(os.path.join(ROOT,pattern),recursive=True)):
            rel=os.path.relpath(p,ROOT).replace(os.sep,'/')
            if rel.endswith('.px.png') or '/Pixel/' in rel:continue
            try:img=convert(p,size)
            except Exception as e:print('skip',rel,e);continue
            if img is None:continue
            img.save(p[:-4]+'.px.png',optimize=True);made.append(rel)
    with open(os.path.join(ROOT,'js','00-pixel-manifest.js'),'w') as f:f.write('window.pixelAssets='+json.dumps(made,ensure_ascii=False,separators=(',',':'))+';\n')
    print(len(made),'icons')
