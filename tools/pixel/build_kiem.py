import sys;sys.path.insert(0,'.')
from render_preview import grid,sheet
exec(open('kiem_art.py').read());exec(open('kiem_nam.py').read())
def mirror(half):
    rows=half.strip('\n').split('\n');return '\n'.join(r+r[::-1] for r in rows)
def fix_front(art):
    # eyes should not be mirrored identically for highlight: keep as is (symmetric is fine)
    return art
F=mirror(NAM_FRONT_HALF);B=mirror(NAM_BACK_HALF);Sd=NAM_SIDE
ims=[grid(F,PAL),grid(B,PAL),grid(Sd,PAL),grid(Sd,PAL).transpose(0)]
sheet(ims,7).save(sys.argv[1])
exec(open('kiem_nu.py').read())
F2=mirror(NU_FRONT_HALF);B2=mirror(NU_BACK_HALF)
for a in (NU_FRONT_HALF,NU_BACK_HALF):
    r=a.strip('\n').split('\n');assert len(r)==44 and all(len(x)==16 for x in r),[(i,len(x)) for i,x in enumerate(r) if len(x)!=16]
r=NU_SIDE.strip('\n').split('\n');assert len(r)==44 and all(len(x)==32 for x in r),(len(r),[(i,len(x)) for i,x in enumerate(r) if len(x)!=32])
ims2=[grid(F2,PAL),grid(B2,PAL),grid(NU_SIDE,PAL),grid(NU_SIDE,PAL).transpose(0)]
sheet(ims+ims2,6).save(sys.argv[1])
