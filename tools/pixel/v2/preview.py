import sys,os;sys.path.insert(0,os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from render_preview import grid,sheet
d=os.path.dirname(os.path.abspath(__file__))
ns={}
for f in ('pal.py','male.py','female.py'):
    p=os.path.join(d,f)
    if os.path.exists(p):exec(open(p).read(),ns)
mir=lambda a:'\n'.join(r+r[::-1] for r in a.strip('\n').split('\n'))
ims=[]
for k in sys.argv[2:]:
    a=ns[k];ims.append(grid(mir(a) if k.endswith('HALF') or k in('M_FRONT','M_BACK','F_FRONT','F_BACK') else a,ns['PAL']))
sheet(ims,6).save(sys.argv[1])
