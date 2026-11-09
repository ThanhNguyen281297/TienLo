"""Pixel versions of the skill effect art (Pixel art style).
Each image keeps its size and layout (so frame bounds and part rectangles still match) but is
rebuilt on a coarse grid: alpha in 4 hard steps, colours in 7 steps per channel with a little
extra saturation, then scaled back with nearest-neighbour. Soft glows become stepped pixel
glows. Output: <name>.px.png next to the original; listed in tools/pixel/skills.json and merged
into js/00-pixel-manifest.js by tools/pixel/icons.py.
Run: python3 tools/pixel/skill_vfx.py"""
import os,glob,json
import numpy as np
from PIL import Image,ImageEnhance
ROOT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..'))
GROUPS=[('Skill/Class/**/*.png',4),('Skill/Basic/*.png',3),('Skill/Legacy/**/*.png',4),('Skill/VFX/*.png',3)]
ALPHA=np.array([0,.34,.67,1.0])
def convert(path,k):
    im=Image.open(path).convert('RGBA');W,H=im.size;w,h=max(1,W//k),max(1,H//k)
    a=np.asarray(im).astype(np.float32)/255;pm=a.copy();pm[...,:3]*=a[...,3:4]
    s=np.asarray(Image.fromarray((pm*255).astype('uint8'),'RGBA').resize((w,h),Image.BOX)).astype(np.float32)/255
    al=s[...,3];rgb=np.where(al[...,None]>0,s[...,:3]/np.maximum(al[...,None],1e-4),0)
    col=Image.fromarray((np.clip(rgb,0,1)*255).astype('uint8'),'RGB');col=np.asarray(ImageEnhance.Color(col).enhance(1.2)).astype(np.float32)/255
    col=np.round(col*6)/6
    idx=np.digitize(al,[.08,.42,.75]);aq=ALPHA[idx]
    out=np.dstack([col*255,aq*255]).astype('uint8')
    small=Image.fromarray(out,'RGBA');big=small.resize((w*k,h*k),Image.NEAREST)
    res=Image.new('RGBA',(W,H));res.paste(big,(0,0));return res
if __name__=='__main__':
    made=[]
    for pattern,k in GROUPS:
        for p in sorted(glob.glob(os.path.join(ROOT,pattern),recursive=True)):
            if p.endswith('.px.png'):continue
            convert(p,k).save(p[:-4]+'.px.png',optimize=True);made.append(os.path.relpath(p,ROOT).replace(os.sep,'/'))
    json.dump(made,open(os.path.join(ROOT,'tools','pixel','skills.json'),'w'),indent=0)
    print(len(made),'skill images')
