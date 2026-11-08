"""Pixel heroes v3: converted from the painted class art (tools/pixel/hero_convert.py) with
hand-placed pixel faces, so every school keeps its own costume, headwear and colours.
Atlas per class+gender: 4 columns x 5 rows of 52x52 cells (figure 48 px):
rows = front, back, walking left, walking right, meditation.
Run: python3 tools/pixel/build_heroes_v3.py -> Character/Pixel/<Class>-<Nam|Nu>.png"""
import os,sys
import numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
from hero_convert import views
ROOT=os.path.normpath(os.path.join(HERE,'..','..'))
CW=CH=52
FIG=48            # figure height in art pixels (faces below are authored for 60 and scaled)
# Face boxes (x0,y0,x1,y1, eye row) in the 60-px figures; side boxes are for 'trai' (faces left).
FACES={
 ('Kiem','Nam'):{'truoc':(22,19,40,30,23),'trai':(20,19,31,30,23)},
 ('Kiem','Nu'):{'truoc':(10,15,20,23,17),'trai':(4,15,11,23,17)},
 ('Liem','Nam'):{'truoc':(21,17,41,28,21),'trai':(21,18,39,28,22)},
 ('Liem','Nu'):{'truoc':(15,12,25,20,13),'trai':(12,12,19,20,13)},
 ('Thuong','Nam'):{'truoc':(16,16,30,28,20),'trai':(11,16,20,26,20)},
 ('Thuong','Nu'):{'truoc':(21,16,35,25,18),'trai':(14,16,20,24,18)},
 ('Quat','Nam'):{'truoc':(22,13,40,24,17),'trai':(18,12,29,24,16)},
 ('Quat','Nu'):{'truoc':(24,12,34,20,14),'trai':(21,12,28,20,14)},
}
def skin_of(a,box):
    x0,y0,x1,y1,_=box;p=a[y0:y1+1,x0:x1+1].reshape(-1,4);p=p[(p[:,3]>0)&(p[:,0]>185)&(p[:,1]>150)]
    return tuple(int(v) for v in (np.median(p[:,:3],axis=0) if len(p) else (247,226,212)))
def face(img,gender,view,box):
    a=np.array(img);x0,y0,x1,y1,ey=box;sk=skin_of(a,box);w=x1-x0+1
    blush=(236,150,150);mouth=(176,72,84);dark=(30,20,38);hi=(255,255,255)
    iris=(196,34,48) if gender=='Nu' else (44,62,128);low=tuple(int(c*.62) for c in iris)
    # clear the painted features: rows from just above the eyes to the chin, inside the box
    top=ey-1 if gender=='Nu' else ey-2
    for y in range(top,y1):
        for x in range(x0+1,x1):
            if a[y,x,3]:a[y,x,:3]=sk
    def eye(x,tall):
        for dy in range(tall):
            a[ey+dy,x,:3]=iris;a[ey+dy,x+1,:3]=iris
        a[ey+tall-1,x,:3]=low;a[ey+tall-1,x+1,:3]=low;a[ey,x,:3]=hi if False else a[ey,x,:3]
        a[ey-1,x,:3]=dark;a[ey-1,x+1,:3]=dark;a[ey,x+1,:3]=hi
    tall=2
    if view=='truoc':
        c=(x0+x1)/2;g=max(2,round(w*.2));lx=int(c-g-1);rx=int(c+g-1)
        eye(lx,tall);eye(rx,tall)
        if gender=='Nu':a[ey-1,lx-1,:3]=dark;a[ey-1,rx+2,:3]=dark
        by=ey+tall
        for x in (lx-1,lx,rx+1,rx+2):
            if x0<x<x1 and by<y1:a[by,x,:3]=blush
        my=min(y1-1,by+1+(1 if gender=='Nam' else 0));cx=int(round(c))
        a[my,cx-1,:3]=mouth;a[my,cx,:3]=mouth
    else:
        ex=x0+max(1,round(w*.25));eye(ex,tall)
        if gender=='Nu':a[ey-1,ex-1,:3]=dark
        by=ey+tall
        if by<y1:a[by,ex+2,:3]=blush;a[by,ex+3,:3]=blush
        my=min(y1-1,by+1+(1 if gender=='Nam' else 0));a[my,x0+1,:3]=mouth;a[my,x0+2,:3]=mouth
    return Image.fromarray(a)
def place(img):
    c=Image.new('RGBA',(CW,CH));c.alpha_composite(img,((CW-img.width)//2,CH-img.height));return c
def walk(img):
    frames=[]
    for f in range(4):
        a=np.array(img);h=a.shape[0];out=np.zeros_like(a)
        lift=1 if f in (1,3) else 0;sway=[0,1,0,-1][f];hem=8
        out[:h-hem-lift]=a[lift:h-hem]
        band=np.roll(a[h-hem:],sway,axis=1)
        out[h-hem-lift:h-lift]=band
        if lift:out[h-1]=a[h-1]*0
        frames.append(place(Image.fromarray(out)))
    return frames
def meditate(img):
    a=np.array(img);h,w=a.shape[:2];cut=int(h*.62)
    top=Image.fromarray(a[:cut]);bottom=Image.fromarray(a[cut:]).resize((int(w*1.18),max(1,int((h-cut)*.5))),Image.NEAREST)
    frames=[]
    for f in range(4):
        b=[0,0,1,1][f];W=max(w,bottom.width);c=Image.new('RGBA',(W,cut+bottom.height))
        c.alpha_composite(bottom,((W-bottom.width)//2,cut));c.alpha_composite(top,((W-w)//2,b))
        frames.append(place(c))
    return frames
def scaled(box,k):
    x0,y0,x1,y1,ey=box;return (round(x0*k),round(y0*k),round(x1*k),round(y1*k),round(ey*k))
def build(cls,g):
    v=views(cls,g,FIG);k=FIG/60;box={d:scaled(b,k) for d,b in FACES[(cls,g)].items()}
    front=face(v['truoc'],g,'truoc',box['truoc']);left=face(v['trai'],g,'trai',box['trai']);right=left.transpose(Image.FLIP_LEFT_RIGHT)
    rows=[walk(front),walk(v['sau']),walk(left),walk(right),meditate(front)]
    a=Image.new('RGBA',(CW*4,CH*5))
    for y,row in enumerate(rows):
        for x,c in enumerate(row):a.alpha_composite(c,(x*CW,y*CH))
    return a
if __name__=='__main__':
    dest=os.path.join(ROOT,'Character','Pixel');os.makedirs(dest,exist_ok=True)
    for cls in ('Kiem','Liem','Thuong','Quat'):
        for g in ('Nam','Nu'):build(cls,g).save(os.path.join(dest,f'{cls}-{g}.png'),optimize=True)
    print('ok')
