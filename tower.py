"""Private, persistent tower floors; rewards and kills are certified by the server."""
import json
import math
import secrets
import time
import adventure
import equipment
import progression

MAX_FLOOR=200
GATE=(1240,1385)

def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS tower_progress(user_id INTEGER PRIMARY KEY REFERENCES users(id),best INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS tower_runs(user_id INTEGER PRIMARY KEY REFERENCES users(id),token TEXT NOT NULL,floor INTEGER NOT NULL,status TEXT NOT NULL,expires REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS tower_kills(user_id INTEGER NOT NULL,token TEXT NOT NULL,mob TEXT NOT NULL,PRIMARY KEY(user_id,token,mob));
    CREATE TABLE IF NOT EXISTS tower_rewards(user_id INTEGER NOT NULL REFERENCES users(id),floor INTEGER NOT NULL,day TEXT NOT NULL,PRIMARY KEY(user_id,floor,day));
    CREATE TABLE IF NOT EXISTS tower_ops(user_id INTEGER NOT NULL REFERENCES users(id),token TEXT NOT NULL,PRIMARY KEY(user_id,token));
    ''')

def reward(floor):return 2+floor//3+(3+floor//5 if floor%5==0 else 0)
def total(floor):return 1 if floor%5==0 else min(8,3+floor//15)
def run(db,uid):
    r=db.execute('SELECT * FROM tower_runs WHERE user_id=?',(uid,)).fetchone()
    if r and r['status']=='fighting' and r['expires']<time.time():
        db.execute("UPDATE tower_runs SET status='expired' WHERE user_id=?",(uid,));r=db.execute('SELECT * FROM tower_runs WHERE user_id=?',(uid,)).fetchone()
    return r

def snapshot(db,uid):
    best=db.execute('SELECT best FROM tower_progress WHERE user_id=?',(uid,)).fetchone()
    r=run(db,uid)
    return dict(best=best['best'] if best else 0,max=MAX_FLOOR,run=dict(r) if r else None,kills=db.execute('SELECT COUNT(*) FROM tower_kills WHERE user_id=? AND token=?',(uid,r['token'])).fetchone()[0] if r else 0,total=total(r['floor']) if r else 0,reward=reward(r['floor']) if r else 0)

def record_kill(db,uid,mob):
    r=run(db,uid)
    if not r or r['status']!='fighting' or mob.get('towerToken')!=r['token']:return
    db.execute('INSERT OR IGNORE INTO tower_kills VALUES(?,?,?)',(uid,r['token'],mob['id']))
    n=db.execute('SELECT COUNT(*) FROM tower_kills WHERE user_id=? AND token=?',(uid,r['token'])).fetchone()[0]
    if n>=total(r['floor']):db.execute("UPDATE tower_runs SET status='cleared' WHERE user_id=?",(uid,))

def room(db,uid,token):
    r=run(db,uid);mobs=[]
    if not r or r['token']!=token or r['status']!='fighting':return dict(mobs=[],updated=time.monotonic())
    dead={row['mob'] for row in db.execute('SELECT mob FROM tower_kills WHERE user_id=? AND token=?',(uid,token))}
    floor=r['floor'];boss=floor%5==0;species=['BoNgua','Tho','Nhen','Doi','Ech','Soi','TeGiac','QuyLiem']
    for i in range(total(floor)):
        angle=i*math.tau/total(floor);x=1000+math.cos(angle)*110;y=1100+math.sin(angle)*65
        ident=f'tower:{uid}:{token}:{i}';hp=round((40+floor*12+floor*floor*.7)*(3 if boss else 1))
        mobs.append(dict(id=ident,t=2 if boss else [0,1,3,4][i%4],skin='RongXuong' if boss else species[(floor+i)%len(species)],name=('Trấn Tháp Yêu Vương' if boss else 'Tháp Vệ')+' · Tầng '+str(floor),x=x,y=y,hx=x,hy=y,hp=0 if ident in dead else hp,maxHp=hp,dead=10**30 if ident in dead else 0,cd=1,fr=0,fl=0,level=max(1,floor*2),boss=boss,elite=boss,tower=True,towerToken=token,network=True,worldMap=True,map='tower',camp='tower',campX=1000,campY=1100,campRX=400,campRY=260,attackScale=.5+floor*.035,xpReward=0,materialYield=0,contributors={}))
    return dict(mobs=mobs,updated=time.monotonic())

def action(db,uid,body):
    row=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not row:raise ValueError('Hãy tạo nhân vật trước.')
    p=json.loads(row['player']);op=body.get('action');token=body.get('opId')
    if not isinstance(token,str) or not 8<=len(token)<=100:raise ValueError('Thiếu mã thao tác.')
    if db.execute('SELECT 1 FROM tower_ops WHERE user_id=? AND token=?',(uid,token)).fetchone():return dict(character=dict(id=row['id'],player=p,revision=row['revision']),tower=snapshot(db,uid))
    if body.get('revision')!=row['revision']:raise ValueError('Nhân vật đã thay đổi. Hãy thử lại.')
    r=run(db,uid)
    if op=='start':
        if p['world'].get('map')!='hub' or math.hypot(p['x']-GATE[0],p['y']-GATE[1])>100:raise ValueError('Hãy đến NPC Trấn Tháp trong thành.')
        best=snapshot(db,uid)['best'];floor=body.get('floor',min(MAX_FLOOR,best+1))
        if type(floor) is not int or not 1<=floor<=min(MAX_FLOOR,best+1):raise ValueError('Chưa mở tầng này.')
        if progression.level(p)<max(1,(floor+1)//2):raise ValueError('Cấp nhân vật chưa đủ để vào tầng này.')
        db.execute('DELETE FROM tower_kills WHERE user_id=?',(uid,))
        db.execute('INSERT OR REPLACE INTO tower_runs VALUES(?,?,?,?,?)',(uid,secrets.token_hex(12),floor,'fighting',time.time()+600))
        p['world']['map']='tower';p['x'],p['y']=1000,1380
    elif op=='claim':
        if not r or r['status']!='cleared':raise ValueError('Phải hạ hết quái trong tầng trước khi nhận thưởng.')
        inserted=db.execute('INSERT OR IGNORE INTO tower_rewards VALUES(?,?,?)',(uid,r['floor'],adventure.day())).rowcount
        if inserted:
            adventure.grant_fragments(db,uid,reward(r['floor']));p['gold']=min(10**9,p['gold']+40+r['floor']*15);adventure.add(db,uid,'daily:'+adventure.day()+':towerFloors')
        db.execute('INSERT INTO tower_progress VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET best=MAX(best,excluded.best)',(uid,r['floor']))
        __import__('engagement').record_tower(db,uid,r['floor'])
        db.execute("UPDATE tower_runs SET status='claimed' WHERE user_id=?",(uid,))
    elif op=='next':
        if not r or r['status']!='claimed' or p['world'].get('map')!='tower':raise ValueError('Nhận thưởng tầng hiện tại trước.')
        floor=r['floor']+1
        if floor>MAX_FLOOR:raise ValueError('Đã chinh phục tầng cao nhất.')
        if progression.level(p)<(floor+1)//2:raise ValueError('Cần lên thêm cấp trước khi khiêu chiến tầng tiếp theo.')
        db.execute('DELETE FROM tower_kills WHERE user_id=?',(uid,))
        db.execute('UPDATE tower_runs SET token=?,floor=?,status=?,expires=? WHERE user_id=?',(secrets.token_hex(12),floor,'fighting',time.time()+600,uid));p['x'],p['y']=1000,1380
    elif op=='leave':
        if p['world'].get('map')!='tower':raise ValueError('Bạn chưa ở trong tháp.')
        if r and r['status']=='fighting':db.execute("UPDATE tower_runs SET status='left' WHERE user_id=?",(uid,))
        p['world']['map']='hub';p['x'],p['y']=GATE
    else:raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(p,db,uid);revision=row['revision']+1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(p,ensure_ascii=False),revision,int(time.time()),uid));db.execute('INSERT INTO tower_ops VALUES(?,?)',(uid,token))
    return dict(character=dict(id=row['id'],player=p,revision=revision),tower=snapshot(db,uid))
