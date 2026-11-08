"""Pixel heroes from the painted class art (Pixel style, v3).
Each painted view (Character/<Class>/<Nam|Nu>/<dir>.png) is reduced to a 60-px-tall figure with
the monster pipeline (shared palette per character, despeckle, selective dark outline)."""
import os,sys
import numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
from monsters import premul_down,palette_for,render
ROOT=os.path.normpath(os.path.join(HERE,'..','..'))
def views(cls,g,height=60,colors=28):
    out={};frames={}
    for d in ('truoc','sau','trai','phai'):
        im=Image.open(os.path.join(ROOT,'Character',cls,g,d+'.png')).convert('RGBA');im=im.crop(im.getbbox())
        w=max(1,round(im.width*height/im.height));frames[d]=premul_down(im,w,height)
    pal=palette_for([(rgb,al>.42) for rgb,al in frames.values()],colors)
    for d,(rgb,al) in frames.items():out[d]=despeck(render(rgb,al,pal))
    return out
def despeck(img,minimum=6):
    """Drop specks: opaque islands smaller than `minimum` pixels."""
    a=np.array(img);m=a[...,3]>0;h,w=m.shape;seen=np.zeros_like(m)
    for y0 in range(h):
        for x0 in range(w):
            if not m[y0,x0] or seen[y0,x0]:continue
            st=[(y0,x0)];seen[y0,x0]=1;pts=[]
            while st:
                y,x=st.pop();pts.append((y,x))
                for dy in(-1,0,1):
                    for dx in(-1,0,1):
                        Y,X=y+dy,x+dx
                        if 0<=Y<h and 0<=X<w and m[Y,X] and not seen[Y,X]:seen[Y,X]=1;st.append((Y,X))
            if len(pts)<minimum:
                for y,x in pts:a[y,x,3]=0
    return Image.fromarray(a)
if __name__=='__main__':
    from render_preview import sheet
    ims=[]
    for cls in sys.argv[2:]:
        for g in ('Nam','Nu'):
            v=views(cls,g);ims+= [v['truoc'],v['trai'],v['sau']]
    sheet(ims,5).save(sys.argv[1])

# ---------- clean pixel faces over the converted art ----------
from collections import deque
def face_box(img,side=None):
    a=np.asarray(img).astype(int);h,w=a.shape[:2]
    r,g,b,al=a[...,0],a[...,1],a[...,2],a[...,3]
    skin=(al>0)&(r>190)&(g>150)&(b>120)&(r>=b)&(r-b<90)
    skin[int(h*.55):]=False
    seen=np.zeros_like(skin);best=None
    for y0 in range(h):
        for x0 in range(w):
            if not skin[y0,x0] or seen[y0,x0]:continue
            q=deque([(y0,x0)]);seen[y0,x0]=1;pts=[]
            while q:
                y,x=q.popleft();pts.append((y,x))
                for dy,dx in((1,0),(-1,0),(0,1),(0,-1)):
                    Y,X=y+dy,x+dx
                    if 0<=Y<h and 0<=X<w and skin[Y,X] and not seen[Y,X]:seen[Y,X]=1;q.append((Y,X))
            if not best or len(pts)>len(best):best=pts
    if not best or len(best)<12:return None
    ys=[p[0] for p in best];xs=[p[1] for p in best]
    return min(xs),min(ys),max(xs),max(ys),np.median(a[ys,xs,:3],axis=0).astype(int)
def draw_face(img,gender,view):
    box=face_box(img)
    if not box:return img
    x0,y0,x1,y1,skin=box;a=np.array(img);fw,fh=x1-x0+1,y1-y0+1
    shade=np.clip(skin*np.array([.88,.78,.76]),0,255).astype(int)
    eye_y=y0+int(fh*.42)
    # wipe painted features in the eye/mouth band so the drawn face reads cleanly
    for y in range(eye_y-1,min(y1,eye_y+int(fh*.45))):
        for x in range(x0,x1+1):
            if a[y,x,3] and (abs(int(a[y,x,0])-skin[0])+abs(int(a[y,x,1])-skin[1])+abs(int(a[y,x,2])-skin[2])>40 or True):
                # keep outline/hair at the edges of the face
                inside=x0<x<x1
                if inside and not (a[y,x,0]<70 and a[y,x,1]<70 and a[y,x,2]<70 and (x<=x0+1 or x>=x1-1)):a[y,x,:3]=skin
    iris=(170,30,40) if gender=='Nu' else (40,58,122);hi=(255,255,255);dark=(28,20,36);blush=(240,150,150)
    def eye(cx):
        for dy in range(3):
            for dx in range(2):a[eye_y+dy,cx+dx,:3]=iris
        a[eye_y-1,cx,:3]=dark;a[eye_y-1,cx+1,:3]=dark
        if gender=='Nu':a[eye_y-1,cx-1 if cx<(x0+x1)/2 else cx+2,:3]=dark
        a[eye_y,cx+(1 if cx<(x0+x1)/2 else 0),:3]=hi
        a[eye_y+2,cx,:3]=tuple(int(v*.6) for v in iris);a[eye_y+2,cx+1,:3]=tuple(int(v*.6) for v in iris)
    cx=(x0+x1)//2
    if view=='truoc':
        gap=max(2,int(fw*.18));eye(cx-gap-2);eye(cx+gap)
        by=eye_y+3
        for x in (cx-gap-3,cx-gap-2,cx+gap+1,cx+gap+2):
            if x0<x<x1:a[by,x,:3]=blush
        my=eye_y+5
        if my<y1:a[my,cx-1,:3]=(170,70,80);a[my,cx,:3]=(170,70,80)
    else:
        right=view=='phai' if False else None
    return Image.fromarray(a)
