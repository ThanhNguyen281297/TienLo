"""Shared level-gated farming maps and durable, server-issued equipment drops."""
import json
import overworld
import math
import secrets
import time
from pathlib import Path
import equipment
import progression
import adventure

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
        level=rule['level']+(5 if boss else i%5);hp=round(overworld.mob_hp(level)*(.8*7 if boss else .8))  # rifts: more mobs, a little softer each
        mobs.append(dict(id=f'{scene}:0:{i}',t=4 if boss else [0,1,3,4][i%4],skin=skin,
          name=RULES['species'][skin]['name']+(' · Thủ lĩnh' if boss else ''),level=level,
          x=x,y=y,hx=x,hy=y,hp=hp,maxHp=hp,dead=0,cd=1,fr=0,fl=0,worldMap=True,network=True,
          map=scene,expedition=True,boss=boss,elite=boss,camp='expedition',campX=1000,campY=1100,
          campRX=620,campRY=340,attackScale=overworld.mob_attack(level)*(1.5 if boss else .9),
          xpReward=round(level*(24 if boss else 5)*1.4),materialYield=0,contributors={}))
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
    fragment_event='fragment:'+event_id
    if db.execute('SELECT 1 FROM adventure_events WHERE user_id=? AND id=?',(uid,fragment_event)).fetchone():return
    db.execute('INSERT INTO adventure_events VALUES(?,?)',(uid,fragment_event))
    amount=(3+list(MAPS).index(mob['map']) if mob.get('boss') else 1)*__import__('engagement').multiplier('fragments')
    adventure.grant_fragments(db,uid,amount)

def pending(db,uid):
    return db.execute('SELECT COUNT(*) FROM expedition_drops WHERE user_id=? AND claimed_at IS NULL',(uid,)).fetchone()[0]

GEAR_PERMIL,STONE_PERMIL,REFINED_PERMIL=30,80,30

def queue_farm_drop(db,uid,mob,event_id):
    if mob.get('tower'):return
    row=db.execute('SELECT 1 FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not row:return
    level=mob.get('level',1)
    # Rare by design: gear 3%, Cường Hóa Thạch 8%, Tinh Luyện Thạch 3% (bosses always drop stones).
    if not mob.get('expedition') and secrets.randbelow(1000)<GEAR_PERMIL:
        tier=max((t for t in (10,25,45,70) if t<=max(10,level)),default=10)
        rand_cls=secrets.randbelow(4)
        iid=f'exp-{tier}-{secrets.choice(("daobao","chan","giay"))}-class-{rand_cls}' if tier>10 else f'train-10-{secrets.choice(("daobao","chan","giay"))}-class-{rand_cls}'
        db.execute('INSERT OR IGNORE INTO expedition_drops VALUES(?,?,?,?,?,NULL)',(event_id+'-gear',uid,mob['map'],iid,time.time()))
    if secrets.randbelow(1000)<STONE_PERMIL or mob.get('boss'):
        db.execute('INSERT OR IGNORE INTO expedition_drops VALUES(?,?,?,?,?,NULL)',(event_id+'-stone',uid,mob['map'],'cuong-hoa-thach',time.time()))
    if level>=30 and (mob.get('boss') or secrets.randbelow(1000)<REFINED_PERMIL):
        db.execute('INSERT OR IGNORE INTO expedition_drops VALUES(?,?,?,?,?,NULL)',(event_id+'-refined',uid,mob['map'],'tinh-luyen-thach',time.time()))

DROP_TTL=60

def discard(db,drop):
    db.execute('UPDATE expedition_drops SET claimed_at=-1 WHERE id=? AND claimed_at IS NULL',(drop['id'],))

def claim(db,uid,body):
    row=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not row:raise ValueError('Hãy tạo nhân vật trước.')
    if body.get('revision')!=row['revision']:return {'conflict':True,'error':'Nhân vật đã cập nhật. Vui lòng thử lại.'}
    player=json.loads(row['player']);world=player.setdefault('world',{});bag=world.setdefault('bag',[])
    claimed=[];now=time.time()
    # A full bag does not pick anything up and nothing is kept for later:
    # drops that do not fit (or waited longer than DROP_TTL) are discarded.
    for drop in db.execute("SELECT * FROM expedition_drops WHERE user_id=? AND claimed_at IS NULL ORDER BY (item_id IN ('cuong-hoa-thach','tinh-luyen-thach')) DESC,created_at,id LIMIT 200", (uid,)).fetchall():
        if now-drop['created_at']>DROP_TTL:
            discard(db,drop);continue
        item=dict(equipment.TEMPLATES[drop['item_id']],uid=drop['id'])
        stack=next((i for i in bag if i['id']==item['id'] and i.get('type')=='material' and i.get('qty',1)<9999),None)
        if stack:stack['qty']=stack.get('qty',1)+1;item['qty']=1
        else:
            if len(bag)>=equipment.capacity(world):
                discard(db,drop);continue
            if item.get('type')=='material':item['qty']=1
            elif item.get('slot') in equipment.RULES['enhanceSlots']:
                keys=list(equipment.DROP_OPTIONS);lines=[]
                for _ in range(1+secrets.randbelow(3)):
                    key=keys.pop(secrets.randbelow(len(keys)));low,high=equipment.DROP_OPTIONS[key]
                    lines.append(dict(key=key,value=low+min(secrets.randbelow(high-low+1),secrets.randbelow(high-low+1))))
                item['options']=lines
                db.execute('INSERT OR REPLACE INTO equipment_drop_rolls VALUES(?,?,?,?)',(uid,item['uid'],item['id'],json.dumps(lines)))
            bag.append(item)
        claimed.append(item)
        db.execute('UPDATE expedition_drops SET claimed_at=? WHERE id=? AND claimed_at IS NULL',(time.time(),drop['id']))
    if claimed:
        equipment.validate(player,db,uid)
        revision=row['revision']+1
        db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),uid))
    else:revision=row['revision']
    return dict(character=dict(player=player,revision=revision,id=row['id']),claimed=claimed,pending=pending(db,uid))
