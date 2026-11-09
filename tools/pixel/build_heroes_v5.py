"""Pixel heroes v5: clean pixel bodies (v3: converted class art + hand-placed faces) with
hand-drawn pixel feet that really step, a 1-pixel body bob and a swinging hem.
Classic 4-frame walk: contact, passing, contact (other foot), passing.
Atlas per class+gender: 4 columns x 5 rows of 46x46 cells (figure 42 px):
rows = front, back, walking left, walking right, meditation.
Run: python3 tools/pixel/build_heroes_v5.py -> Character/Pixel/<Class>-<Nam|Nu>.png"""
import os,sys
import numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
from hero_convert import views
import build_heroes_v3 as v3
ROOT=os.path.normpath(os.path.join(HERE,'..','..'))
CW=CH=46;FIG=42;FEET=3
OUT=(22,14,28,255)
def trim(img):return img.crop(img.getbbox())
def shoe_colour(a):
    rows=a[-FEET-2:].reshape(-1,4);rows=rows[rows[:,3]>0];rows=rows[(rows[:,:3].sum(1)>90)]
    if not len(rows):return (60,44,60,255)
    lum=rows[:,:3].sum(1);dark=rows[lum<=np.percentile(lum,35)]
    c=np.median(dark[:,:3],axis=0).astype(int);return (int(c[0]),int(c[1]),int(c[2]),255)
def put(a,x,y,c):
    if 0<=y<a.shape[0] and 0<=x<a.shape[1]:a[y,x]=c
def shoe(a,x,y,w,c,side=0):
    """w-pixel wide shoe whose sole is on row y; side>0 points right, <0 left."""
    hi=tuple(min(255,int(v*1.35)) for v in c[:3])+(255,)
    for i in range(w):put(a,x+i,y,c);put(a,x+i,y-1,c)
    put(a,x+(w-1 if side>=0 else 0),y-1,hi) if w>1 else None
    for i in range(-1,w+1):put(a,x+i,y+1,OUT) if a[min(y+1,a.shape[0]-1),min(max(x+i,0),a.shape[1]-1),3]==0 else None
    for yy in (y-1,y):
        if a[yy,x-1,3]==0:put(a,x-1,yy,OUT)
        if x+w<a.shape[1] and a[yy,x+w,3]==0:put(a,x+w,yy,OUT)
    if a[y-2,x,3]==0:put(a,x,y-2,OUT)
LEG=2   # visible legs between the hem and the shoes
def leg(a,x,y0,y1,c):
    for y in range(y0,y1+1):
        for dx in (0,1):put(a,x+dx,y,c)
        if a[y,x-1,3]==0:put(a,x-1,y,OUT)
        if a[y,x+2,3]==0:put(a,x+2,y,OUT)
def frame(body,view,f,c):
    """body: RGBA array of the figure without its feet rows. Returns the frame array.
    f: 0 contact (right foot ahead), 1 passing, 2 contact (left foot ahead), 3 passing."""
    h,w=body.shape[:2];H=h+LEG+FEET+2;out=np.zeros((H,w+10,4),np.uint8)
    lift=1 if f in (1,3) else 0                       # passing poses ride one pixel higher
    b=body.copy();hem=max(3,h//7)
    sway={0:1,2:-1}.get(f,0)
    if view in ('trai','phai'):b[h-hem:]=np.roll(b[h-hem:],-sway*(1 if view=='phai' else -1),axis=1)
    else:b[h-hem:]=np.roll(b[h-hem:],sway,axis=1)
    top=1-lift+1
    region=out[top:top+h,5:5+w];out[top:top+h,5:5+w]=np.where(b[...,3:4]>0,b,region)
    ground=H-2;hemrow=top+h-1
    m=out[hemrow]
    cols=np.nonzero(m[...,3]>0)[0]
    cx=(cols.min()+cols.max())/2 if len(cols) else (w+10)/2;span=(cols.max()-cols.min()+1) if len(cols) else w
    pants=tuple(int(v*.8) for v in c[:3])+(255,);far=tuple(int(v*.62) for v in c[:3])+(255,)
    if view in ('truoc','sau'):
        d=max(2,round(span*.14));lx=int(round(cx-d-2));rx=int(round(cx+d-1))
        # the foot that swings forward comes down a pixel lower (towards the viewer), the other lifts
        ly=ground-(2 if f==2 else 0)+(0 if f!=0 else 0);ry=ground-(2 if f==0 else 0)
        if view=='sau':ly,ry=ry,ly
        for x,y in ((lx,ly),(rx,ry)):leg(out,x,hemrow+1,y-2,pants);shoe(out,x,y,3,c)
    else:
        s=1 if view=='phai' else -1;spread=[5,0,5,0][f]
        lead=int(round(cx+s*spread/2))-1;trail=int(round(cx-s*spread/2))-1
        if f in (1,3):lead,trail=int(round(cx))-1+s,int(round(cx))-2   # passing: legs together, back foot lifted
        ty=ground-(2 if f in (1,3) else 0)
        leg(out,trail,hemrow+1,ty-2,far);shoe(out,trail,ty,3,far,s)
        leg(out,lead,hemrow+1,ground-2,pants);shoe(out,lead,ground,3,c,s)
    return out
def body_of(img):
    a=np.array(trim(img));return a[:-FEET] if a.shape[0]>FEET+10 else a
def place(arr,row,col,atlas):
    im=Image.fromarray(arr);im=trim(im)
    x=col*CW+(CW-im.width)//2;y=row*CH+CH-im.height;atlas.alpha_composite(im,(max(0,x),max(0,y)))
def build(cls,g):
    st=views(cls,g,FIG);k=FIG/60;fb={d:v3.scaled(b,k) for d,b in v3.FACES[(cls,g)].items()}
    front=v3.face(st['truoc'],g,'truoc',fb['truoc']);left=v3.face(st['trai'],g,'trai',fb['trai'])
    vs={'truoc':front,'sau':st['sau'],'trai':left,'phai':left.transpose(Image.FLIP_LEFT_RIGHT)}
    atlas=Image.new('RGBA',(CW*4,CH*5))
    for row,view in enumerate(('truoc','sau','trai','phai')):
        full=np.array(trim(vs[view]));c=shoe_colour(full);body=body_of(vs[view])
        for col in range(4):place(frame(body,view,col,c),row,col,atlas)
    for col,m in enumerate(v3.meditate(front)):atlas.alpha_composite(trim(m),(col*CW+(CW-trim(m).width)//2,4*CH+CH-trim(m).height))
    return atlas
if __name__=='__main__':
    dest=os.path.join(ROOT,'Character','Pixel')
    for cls in ('Kiem','Liem','Thuong','Quat'):
        for g in ('Nam','Nu'):build(cls,g).save(os.path.join(dest,f'{cls}-{g}.png'),optimize=True)
    print('ok')
