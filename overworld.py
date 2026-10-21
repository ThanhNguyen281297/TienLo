"""Shared level-based outdoor regions. Geometry is mirrored in Map/overworld.json."""
import json
import math
import time
from pathlib import Path

RULES=json.loads((Path(__file__).parent/'Map/overworld.json').read_text(encoding='utf-8'))
MAPS={m['id']:m for m in RULES['maps']}
NAMES={k:v['name'] for k,v in json.loads((Path(__file__).parent/'Map/expeditions.json').read_text(encoding='utf-8'))['species'].items()}
NAMES.update(BoNgua='Bọ Ngựa',Tho='Nguyệt Thố',Nhen='Huyết Nhện',Doi='Băng Dực Dơi')

def inside(x,y):return 85<=x<=1915 and 85<=y<=1915
def safe(x,y):return math.hypot(x-1000,y-1770)<115

def room(scene):
    rule=MAPS[scene];mobs=[]
    for ci,camp in enumerate(RULES['camps']):
        for n in range(8):
            angle=n*math.tau/8;level=rule['level']+ci%3
            x=camp['x']+math.cos(angle)*85;y=camp['y']+math.sin(angle)*65
            hp=round(28+level*9+level*level*.08)
            species=rule['species'][ci%len(rule['species'])]
            mobs.append(dict(id=f'{scene}:0:{ci}:{n}',t=[0,1,3,4][ci%4],skin=species,name=NAMES[species],
              level=level,x=x,y=y,hx=x,hy=y,hp=hp,maxHp=hp,dead=0,cd=1,fr=0,fl=0,
              worldMap=True,network=True,map=scene,camp='field-'+str(ci),campX=camp['x'],campY=camp['y'],
              campRX=190,campRY=150,attackScale=.55+level*.045,xpReward=18+level*7,
              materialYield=1+level//20,contributors={}))
    return dict(mobs=mobs,updated=time.monotonic())
