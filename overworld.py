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

# Balanced against an average build (half the attribute points in Lực, gear of the
# level's tier, light enhancement) and ~3.4x attack per second from skills + basics:
# a same-level mob takes ~4 s to kill; three mobs at once down that player in ~20-35 s.
def mob_hp(level):return round(60+70*level+.15*level*level)
def mob_attack(level):return (.69+.124*level)*min(1,.6+.04*level)  # newbie camps (lv<10) hit softer   # x {4,9,6,10} per type, per second in melee

def room(scene):
    rule=MAPS[scene];mobs=[]
    for ci,camp in enumerate(rule.get('camps') or RULES['camps']):
        for n in range(8):
            angle=n*math.tau/8;level=rule['level']+ci%3
            x=camp['x']+math.cos(angle)*85;y=camp['y']+math.sin(angle)*65
            hp=mob_hp(level)
            species=rule['species'][ci%len(rule['species'])]
            mobs.append(dict(id=f'{scene}:0:{ci}:{n}',t=[0,1,3,4][ci%4],skin=species,name=NAMES[species],
              level=level,x=x,y=y,hx=x,hy=y,hp=hp,maxHp=hp,dead=0,cd=1,fr=0,fl=0,
              worldMap=True,network=True,map=scene,camp='field-'+str(ci),campX=camp['x'],campY=camp['y'],
              campRX=190,campRY=150,attackScale=mob_attack(level),xpReward=round((18+level*7)*1.5),
              materialYield=1+level//25,contributors={}))
    return dict(mobs=mobs,updated=time.monotonic())
