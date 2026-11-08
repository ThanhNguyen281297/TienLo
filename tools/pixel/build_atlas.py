"""Builds the pixel atlases for hand-authored classes.
Atlas layout per gender: 5 rows x 4 columns of 32x48 cells
rows: truoc (front), sau (back), trai (side facing right), phai (side facing left), meditate.
Run: python3 tools/pixel/build_atlas.py  (writes Pixel/Character/<Class>-<Gender>.png)"""
import os,sys
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
from render_preview import grid
CW,CH=32,48
def mirror(half):return '\n'.join(r+r[::-1] for r in half.strip('\n').split('\n'))
def feet(im,frame,side,_=None):
    """Redraw the last 4 rows (feet) for walk frame 0..3."""
    w,h=im.size;base=h-4
    cut=im.crop((0,base,w,h));im.paste(Image.new('RGBA',(w,4)),(0,base))
    cols=[x for x in range(w) if any(cut.getpixel((x,y))[3] for y in range(4))]
    mid=(min(cols)+max(cols))//2
    left=cut.crop((0,0,mid+1,4));right=cut.crop((mid+1,0,w,4))
    def put(part,x,y):
        layer=Image.new('RGBA',(w,h));layer.paste(part,(x,y));im.alpha_composite(layer)
    if side:
        d=[0,-2,0,2][frame];put(left,d,base);put(right,mid+1-d,base);return im
    up=[(0,0),(1,0),(0,0),(0,1)][frame]
    l=left.crop((0,1,left.width,4)) if up[0] else left;r=right.crop((0,1,right.width,4)) if up[1] else right
    put(l,0,base+4-l.height);put(r,mid+1,base+4-r.height);return im
def cell(img):
    c=Image.new('RGBA',(CW,CH));c.alpha_composite(img,((CW-img.width)//2,CH-img.height));return c
def walk(art,pal,side=False):
    out=[]
    for f in range(4):
        im=grid(art,pal);im=feet(im,f,side,None)
        if f in (1,3):  # bob: body up one pixel, feet stay
            body=im.crop((0,0,im.width,im.height-4));im2=Image.new('RGBA',im.size);im2.alpha_composite(body,(0,-1));im2.alpha_composite(im.crop((0,im.height-4,im.width,im.height)),(0,im.height-4));
            # fill the gap row under the body with the hem row
            im=im2
        out.append(cell(im))
    return out
def meditate(art,pal,cut_row,lap):
    """Upper body above cut_row, lotus legs (`lap` art rows) below, gentle breathing."""
    up=grid(art,pal).crop((0,0,32,cut_row));legs=grid(lap,pal);out=[]
    for f in range(4):
        b=[0,0,1,1][f];im=Image.new('RGBA',(32,cut_row+legs.height))
        im.alpha_composite(legs,(0,cut_row));im.alpha_composite(up,(0,b))
        out.append(cell(im))
    return out
def atlas(rows):
    a=Image.new('RGBA',(CW*4,CH*len(rows)))
    for y,row in enumerate(rows):
        for x,c in enumerate(row):a.alpha_composite(c,(x*CW,y*CH))
    return a

def kiem():
    ns={};exec(open(os.path.join(HERE,'kiem_art.py')).read(),ns);exec(open(os.path.join(HERE,'kiem_nam.py')).read(),ns);exec(open(os.path.join(HERE,'kiem_nu.py')).read(),ns)
    pal=ns['PAL'];out={}
    for g,F,B,S,lap,cut in (('Nam',ns['NAM_FRONT_HALF'],ns['NAM_BACK_HALF'],ns['NAM_SIDE'],ns['NAM_LAP'],31),('Nu',ns['NU_FRONT_HALF'],ns['NU_BACK_HALF'],ns['NU_SIDE'],ns['NU_LAP'],30)):
        front=mirror(F);back=mirror(B);right=S;left='\n'.join(r[::-1] for r in S.strip('\n').split('\n'))
        rows=[walk(front,pal),walk(back,pal),walk(right,pal,True),walk(left,pal,True),meditate(front,pal,cut,lap)]
        out[g]=atlas(rows)
    return out
if __name__=='__main__':
    root=os.path.normpath(os.path.join(HERE,'..','..'));os.makedirs(os.path.join(root,'Character','Pixel'),exist_ok=True)
    for g,a in kiem().items():a.save(os.path.join(root,'Character','Pixel',f'Kiem-{g}.png'),optimize=True)
    print('ok')
