"""Builds the pixel hero atlases (Pixel art style), v2 art in tools/pixel/v2.
Atlas per class+gender: 4 columns x 5 rows of 40x64 cells, figure 60 px tall:
rows = truoc (front), sau (back), trai (walking left, faces left), phai (faces right), meditation.
Run: python3 tools/pixel/build_atlas.py  -> Character/Pixel/<Class>-<Nam|Nu>.png"""
import os,sys
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,HERE)
from render_preview import grid
CW,CH,FEET=40,64,6
CLASS_PAL={
 'Kiem':{'nam':{},'nu':{}},
 'Liem':{'nam':{'W':'3bb3a5','g':'25877d','G':'1d6d65','B':'1f6b5e','b':'93dccb','n':'174a42'},
         'nu':{'h':'2f6b3f','H':'5fa864','d':'21502d','l':'d3efcb','L':'95d2a0','b':'2f7a4a'}},
 'Thuong':{'nam':{'h':'3a2347','H':'6c3f8c','d':'2a1736','W':'7a3cc0','g':'552a8c','G':'43206e','B':'201428','b':'d6b8f5','n':'140c1a','f':'b8862a'},
           'nu':{'h':'33243f','H':'634580','d':'22182c','l':'eadcf8','L':'b98ee9','b':'6b2fae'}},
 'Quat':{'nam':{'W':'f6eed8','g':'d9c79d','G':'bba774','B':'2a2230','b':'e8b84a','n':'1b1726'},
         'nu':{'l':'fbf4e2','L':'efe0b2','b':'c49a3c'}}}
def load():
    ns={}
    for f in ('pal.py','male.py','female.py','extras.py'):exec(open(os.path.join(HERE,'v2',f)).read(),ns)
    return ns
rows_of=lambda a:a.strip('\n').split('\n')
mirror=lambda half:'\n'.join(r+r[::-1] for r in rows_of(half))
flip=lambda art:'\n'.join(r[::-1] for r in rows_of(art))
def headgear(art,hat_full,clear,shift=0):
    rows=[list(r) for r in rows_of(art)];hat=rows_of(hat_full)
    for y in range(clear):rows[y]=['.']*len(rows[y])
    for y,line in enumerate(hat):
        for x,c in enumerate(line):
            if c!='.' and 0<=x+shift<len(rows[y]):rows[y][x+shift]=c
    return '\n'.join(''.join(r) for r in rows)
def put(im,part,x,y):
    layer=Image.new('RGBA',im.size);layer.paste(part,(x,y));im.alpha_composite(layer)
def feet(im,frame,side):
    w,h=im.size;base=h-FEET;cut=im.crop((0,base,w,h));im.paste(Image.new('RGBA',(w,FEET)),(0,base))
    cols=[x for x in range(w) if any(cut.getpixel((x,y))[3] for y in range(FEET))];mid=(min(cols)+max(cols))//2
    left=cut.crop((0,0,mid+1,FEET));right=cut.crop((mid+1,0,w,FEET))
    if side:d=[0,-3,0,3][frame];put(im,left,d,base);put(im,right,mid+1-d,base);return im
    up=[(0,0),(2,0),(0,0),(0,2)][frame]
    l=left.crop((0,up[0],left.width,FEET));r=right.crop((0,up[1],right.width,FEET))
    put(im,l,0,base+up[0]);put(im,r,mid+1,base+up[1]);return im
def cell(img):
    c=Image.new('RGBA',(CW,CH));c.alpha_composite(img,((CW-img.width)//2,CH-img.height));return c
def walk(art,pal,side=False):
    out=[]
    for f in range(4):
        im=feet(grid(art,pal),f,side)
        if f in (1,3):
            body=im.crop((0,0,im.width,im.height-FEET));im2=Image.new('RGBA',im.size);im2.alpha_composite(body,(0,-1))
            im2.alpha_composite(im.crop((0,im.height-FEET,im.width,im.height)),(0,im.height-FEET));im=im2
        out.append(cell(im))
    return out
def meditate(art,pal,cut,lap):
    up=grid(art,pal).crop((0,0,CW,cut));legs=grid(lap,pal);out=[]
    for f in range(4):
        b=[0,0,1,1][f];im=Image.new('RGBA',(CW,cut+legs.height));im.alpha_composite(legs,(0,cut));im.alpha_composite(up,(0,b));out.append(cell(im))
    return out
def atlas(rows):
    a=Image.new('RGBA',(CW*4,CH*len(rows)))
    for y,row in enumerate(rows):
        for x,c in enumerate(row):a.alpha_composite(c,(x*CW,y*CH))
    return a
def build(cls):
    ns=load();out={}
    for g,F,B,S,lap,cut in (('Nam',ns['M_FRONT'],ns['M_BACK'],ns['M_SIDE'],ns['M_LAP'],44),('Nu',ns['F_FRONT'],ns['F_BACK'],ns['F_SIDE'],ns['F_LAP'],43)):
        pal=dict(ns['PAL']);pal.update(CLASS_PAL[cls]['nam' if g=='Nam' else 'nu'])
        front=mirror(F);back=mirror(B);right=S          # side art faces right
        if g=='Nam' and cls in ns['HAT']:
            hat=mirror(ns['HAT'][cls]);front=headgear(front,hat,10);back=headgear(back,hat,10);right=headgear(right,hat,10,2)
        left=flip(right)
        out[g]=atlas([walk(front,pal),walk(back,pal),walk(left,pal,True),walk(right,pal,True),meditate(front,pal,cut,lap)])
    return out
if __name__=='__main__':
    root=os.path.normpath(os.path.join(HERE,'..','..'));dest=os.path.join(root,'Character','Pixel');os.makedirs(dest,exist_ok=True)
    for cls in ('Kiem','Liem','Thuong','Quat'):
        for g,a in build(cls).items():a.save(os.path.join(dest,f'{cls}-{g}.png'),optimize=True)
    print('ok')
