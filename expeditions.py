"""Shared level-gated farming maps and durable, server-issued equipment drops."""
import json
import math
import secrets
import time
from pathlib import Path
import equipment
import progression

RULES=json.loads((Path(__file__).parent/'Map/expeditions.json').read_text(encoding='utf-8'))
MAPS={m['id']:m for m in RULES['maps']}

def init_db(db):
    db.execute('''CREATE TABLE IF NOT EXISTS expedition_drops(
      id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),map TEXT NOT NULL,
      item_id TEXT NOT NULL,created_at REAL NOT NULL,claimed_at REAL)''')
    db.execute('CREATE INDEX IF NOT EXISTS expedition_owner ON expedition_drops(user_id,claimed_at)')

def inside(x,y):return ((x-1000)/620)**2+((y-1100)/340)**2<.97
def safe(x,y):return math.hypot(x-1000,y-1380)<65

def room(scene,now):
    rule=MAPS[scene];mobs=[]
    for i in range(25):
        boss=i==24;normal=[s for s in rule['species'] if s!=rule['boss']]
        skin=rule['boss'] if boss else normal[i%len(normal)]
        centers=((730,1035),(1270,1035),(825,1210),(1175,1210))
        offsets=((-70,-25),(0,-50),(70,-25),(-70,25),(0,50),(70,25))
        cx,cy=centers[i//6] if not boss else (1000,850)
        ox,oy=offsets[i%6] if not boss else (0,0)
        x,y=cx+ox,cy+oy
        level=rule['level']+(10 if boss else i%5);hp=round((90+level*7)*(4 if boss else 1))
        mobs.append(dict(id=f'{scene}:0:{i}',t=4 if boss else [0,1,3,4][i%4],skin=skin,
          name=RULES['species'][skin]['name']+(' · Thủ lĩnh' if boss else ''),level=level,
          x=x,y=y,hx=x,hy=y,hp=hp,maxHp=hp,dead=0,cd=1,fr=0,fl=0,worldMap=True,network=True,
          map=scene,expedition=True,boss=boss,elite=boss,camp='expedition',campX=1000,campY=1100,
          campRX=620,campRY=340,attackScale=(1+level*.04)*(1.6 if boss else 1),
          xpReward=round(level*(12 if boss else 2.4)),materialYield=0,contributors={}))
    return dict(mobs=mobs,updated=now)

def equipment_pool(scene,cls):
    level=MAPS[scene]['level']
    return [f'exp-{level}-{slot}-class-{cls}' for slot in equipment.RULES['enhanceSlots']]

def queue_drop(db,uid,mob,event_id):
    if mob.get('map') not in MAPS:return
    rule=MAPS[mob['map']]
    if not mob.get('boss') and secrets.randbelow(100)>=rule['dropRate']:return
    row=db.execute('SELECT player FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not row:return
    player=json.loads(row['player'])
    if progression.level(player)<rule['level']:return
    item_id=secrets.choice(equipment_pool(mob['map'],player['ap']['w']))
    db.execute('INSERT OR IGNORE INTO expedition_drops VALUES(?,?,?,?,?,NULL)',(event_id,uid,mob['map'],item_id,time.time()))

def pending(db,uid):
    return db.execute('SELECT COUNT(*) FROM expedition_drops WHERE user_id=? AND claimed_at IS NULL',(uid,)).fetchone()[0]

def claim(db,uid,body):
    row=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not row:raise ValueError('Hãy tạo nhân vật trước.')
    if body.get('revision')!=row['revision']:return {'conflict':True,'error':'Nhân vật đã cập nhật. Vui lòng thử lại.'}
    player=json.loads(row['player']);world=player.setdefault('world',{});bag=world.setdefault('bag',[])
    count=max(0,equipment.capacity(world)-len(bag));claimed=[]
    for drop in db.execute('SELECT * FROM expedition_drops WHERE user_id=? AND claimed_at IS NULL ORDER BY created_at,id LIMIT ?', (uid,min(30,count))).fetchall():
        item=dict(equipment.TEMPLATES[drop['item_id']],uid=drop['id'])
        bag.append(item);claimed.append(item)
        db.execute('UPDATE expedition_drops SET claimed_at=? WHERE id=? AND claimed_at IS NULL',(time.time(),drop['id']))
    if claimed:
        equipment.validate(player,db,uid)
        revision=row['revision']+1
        db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),uid))
    else:revision=row['revision']
    return dict(character=dict(player=player,revision=revision,id=row['id']),claimed=claimed,pending=pending(db,uid))
