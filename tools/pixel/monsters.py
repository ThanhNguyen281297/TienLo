"""Pixel-art versions of the monster animation sheets (Pixel art style).
Every frame is reduced to a coarse pixel grid (about 0.75 art pixel per world unit of the
monster's in-game height), mapped onto one shared palette per species, cleaned of stray
pixels, given a dark outline and scaled back up with nearest-neighbour by the same whole
factor, so the sheet keeps its size and frame rectangles. Output: <sheet>.px.png next to the
original; the game swaps to it in Pixel style (js/00-pixel-manifest.js, js/00-pixel-style.js).
Run: python3 tools/pixel/monsters.py"""
import os,json,sys
import numpy as np
from PIL import Image,ImageEnhance
ROOT=os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..'))
OLD={'BoNgua':(90,[6,6,6,5,6]),'Tho':(84,[6,6,6,5,6]),'Nhen':(76,[6,6,5,6]),'Doi':(84,[6,6,5,6])}
def premul_down(im,w,h):
    a=np.asarray(im).astype(np.float32)/255;a[...,:3]*=a[...,3:4]
    s=np.asarray(Image.fromarray((a*255).astype('uint8'),'RGBA').resize((w,h),Image.LANCZOS)).astype(np.float32)/255
    al=s[...,3];rgb=np.where(al[...,None]>0,s[...,:3]/np.maximum(al[...,None],1e-4),0)
    return np.clip(rgb,0,1),al
def palette_for(samples,colors=24):
    strip=np.concatenate([s[m] for s,m in samples]) if samples else np.zeros((1,3))
    strip=strip[np.random.default_rng(1).permutation(len(strip))[:60000]]
    img=Image.fromarray((strip.reshape(1,-1,3)*255).astype('uint8'),'RGB')
    img=ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.12)).enhance(1.06)
    return img.quantize(colors,method=Image.Quantize.MEDIANCUT,kmeans=4)
def render(rgb,al,pal):
    h,w=al.shape;img=Image.fromarray((rgb*255).astype('uint8'),'RGB')
    img=ImageEnhance.Contrast(ImageEnhance.Color(img).enhance(1.12)).enhance(1.06)
    idx=np.asarray(img.quantize(palette=pal,dither=Image.Dither.NONE));m=al>.42
    # despeckle: a lone pixel whose 4 neighbours share another colour takes that colour
    for _ in range(2):
        p=np.pad(idx,1,mode='edge');n=[p[:-2,1:-1],p[2:,1:-1],p[1:-1,:-2],p[1:-1,2:]]
        same=(n[0]==n[1])&(n[1]==n[2])&(n[2]==n[3])&(n[0]!=idx);idx=np.where(same&m,n[0],idx)
        pm=np.pad(m,1);cnt=pm[:-2,1:-1].astype(int)+pm[2:,1:-1]+pm[1:-1,:-2]+pm[1:-1,2:]
        m=(m&(cnt>=1))|(~m&(cnt>=4))
    cols=np.asarray(pal.getpalette()[:768],np.uint8).reshape(-1,3)[idx]
    out=np.zeros((h+2,w+2,4),np.uint8);out[1:-1,1:-1,:3]=cols;out[1:-1,1:-1,3]=m*255
    M=out[...,3]>0;edge=np.zeros_like(M);src=out[...,:3].astype(np.float32);acc=np.zeros_like(src);cnt=np.zeros(M.shape,np.float32)
    for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
        nm=np.roll(np.roll(M,dy,0),dx,1);edge|=nm;acc+=np.roll(np.roll(src,dy,0),dx,1)*nm[...,None];cnt+=nm
    edge&=~M;dark=(acc/np.maximum(cnt[...,None],1))*.25+np.array([10,6,14]);out[edge,:3]=dark[edge].astype(np.uint8);out[edge,3]=255
    return Image.fromarray(out,'RGBA')
def convert(sheet_path,rects,k,out_path):
    sheet=Image.open(sheet_path).convert('RGBA');res=Image.new('RGBA',sheet.size);frames=[]
    for (x,y,w,h) in rects:
        sw,sh=max(1,round(w/k)),max(1,round(h/k));frames.append(premul_down(sheet.crop((x,y,x+w,y+h)),sw,sh))
    pal=palette_for([(rgb,al>.42) for rgb,al in frames])
    for (x,y,w,h),(rgb,al) in zip(rects,frames):
        art=render(rgb,al,pal);big=art.resize((art.width*k,art.height*k),Image.NEAREST)
        ox,oy=x+(w-(art.width-2)*k)//2-k,y+(h-(art.height-2)*k)//2-k
        layer=Image.new('RGBA',sheet.size);layer.paste(big,(ox,oy));
        clip=Image.new('L',sheet.size,0);clip.paste(255,(max(0,x-k),max(0,y-k),x+w+k,y+h+k));layer.putalpha(Image.composite(layer.getchannel('A'),Image.new('L',sheet.size,0),clip))
        res.alpha_composite(layer)
    res.save(out_path,optimize=True)
if __name__=='__main__':
    made=[]
    meta=json.load(open(os.path.join(ROOT,'Character/Monsters/animation-frames.json')))
    heights={k:v.get('height') for k,v in json.load(open(os.path.join(ROOT,'Map/expeditions.json')))['species'].items()}
    only=set(sys.argv[1:])
    for name,m in meta.items():
        if only and name not in only:continue
        k=max(2,round(m['sourceHeight']/(heights.get(name,60)*.75)))
        src=os.path.join(ROOT,m['file']);convert(src,[f['rect'] for f in m['frames']],k,src[:-4]+'.px.png');made.append(m['file']);print(name,'k',k)
    import glob
    for name,(height,sheets) in OLD.items():
        if only and name not in only:continue
        # these species draw single frames from Character/Monsters/sprites/<name>/ (see js/10b-sprite-catalog.js)
        files=sorted(f for f in glob.glob(os.path.join(ROOT,'Character','Monsters','sprites',name,'*.png')) if not f.endswith('.px.png'))
        k=max(2,round(724/(height*.75)))
        sheets_=[(f,Image.open(f).size) for f in files]
        frames=[premul_down(Image.open(f).convert('RGBA'),max(1,round(w/k)),max(1,round(h/k))) for f,(w,h) in sheets_]
        pal=palette_for([(rgb,al>.42) for rgb,al in frames])
        for (f,(w,h)),(rgb,al) in zip(sheets_,frames):
            art=render(rgb,al,pal);big=art.resize((art.width*k,art.height*k),Image.NEAREST)
            out=Image.new('RGBA',(w,h));out.alpha_composite(big.crop((k,k,k+w,k+h)) if big.width>=w+k and big.height>=h+k else big,(0,0));out.save(f[:-4]+'.px.png',optimize=True)
            made.append(os.path.relpath(f,ROOT).replace(os.sep,'/'))
        print(name,'k',k,len(files))
    json.dump(made,open(os.path.join(ROOT,'tools','pixel','monsters.json'),'w'),indent=0)
