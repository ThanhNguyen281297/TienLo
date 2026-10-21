"""Persistent consensual duels. Clients submit skill intent, never damage or HP."""
import json
import math
import secrets
import time
import progression
import equipment

DURATION=600
COUNTDOWN=3
DISCONNECT=30
COOLDOWNS=((7,6,18,32),(10,5,20,36),(5,8,14,28),(6,5,14,24))
BASIC=((.34,82,(.8,.85,1,1.8)),(.44,215,(.75,.85,1.25)),(.50,115,(1.1,1.2,1.25,1.65)),(.50,275,(.75,.9,1.25)))

def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS duel_invites(id TEXT PRIMARY KEY,challenger INTEGER NOT NULL REFERENCES users(id),target INTEGER NOT NULL REFERENCES users(id),expires REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS duel_matches(id TEXT PRIMARY KEY,status TEXT NOT NULL,data TEXT NOT NULL,created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS duel_members(user_id INTEGER PRIMARY KEY REFERENCES users(id),match_id TEXT NOT NULL REFERENCES duel_matches(id),viewer INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS duel_live ON duel_matches(status,created);
    ''')

def save(db,m):
    db.execute('UPDATE duel_matches SET status=?,data=? WHERE id=?',(m['status'],json.dumps(m,separators=(',',':'),ensure_ascii=False),m['id']))

def finish(m,winner,reason,now):
    if m['status']!='active':return
    m.update(status='finished',winner=winner,reason=reason,finishedAt=now,pending=[])

def load(db,mid):
    row=db.execute('SELECT data FROM duel_matches WHERE id=?',(mid,)).fetchone()
    return json.loads(row['data']) if row else None

def membership(db,uid):return db.execute('SELECT * FROM duel_members WHERE user_id=?',(uid,)).fetchone()

def current(db,uid):
    member=membership(db,uid)
    return load(db,member['match_id']) if member else None

def tick(db,m,now):
    if m['status']!='active':return
    expired=now>=m['endsAt']
    absent=[f for f in m['fighters'].values() if now-f['lastSeen']>DISCONNECT]
    if absent and not expired:
        remaining=[f for f in m['fighters'].values() if f not in absent]
        finish(m,remaining[0]['id'] if len(remaining)==1 else None,'disconnect',now);save(db,m);return
    for f in m['fighters'].values():
        elapsed=max(0,min(2,now-f.get('manaAt',now)));f['mp']=min(f['maxMp'],f['mp']+elapsed*f['maxMp']*.015);f['manaAt']=now
    due=[attack for attack in m['pending'] if attack['at']<=min(now,m['endsAt'])]
    m['pending']=[attack for attack in m['pending'] if attack['at']>now]
    for attack in sorted(due,key=lambda a:a['at']):
        if m['status']!='active':break
        owner=m['fighters'][str(attack['owner'])];target=m['fighters'][str(attack['target'])]
        if target.get('evadeUntil',0)>=attack['at']:continue
        if math.hypot(target['x']-attack['x'],target['y']-attack['y'])>attack['radius']:continue
        if math.hypot(target['x']-attack['ox'],target['y']-attack['oy'])>attack['range']:continue
        damage=max(1,round((owner['attack']*attack['power']-target['armor']*.65)*.55))
        shield=db.execute('SELECT active_until FROM shield_cooldowns WHERE user_id=?',(target['id'],)).fetchone()
        if shield and shield['active_until']>now:damage=max(1,round(damage*.72))
        dealt=min(target['hp'],damage);target['hp']-=dealt;owner['damage']+=dealt
        m['events'].append(dict(id=secrets.token_hex(8),owner=owner['id'],target=target['id'],amount=dealt,at=now))
        m['events']=m['events'][-24:]
        if target['hp']<=0:finish(m,owner['id'],'knockout',now)
    if expired and m['status']=='active':
        a,b=m['fighters'].values()
        finish(m,a['id'] if a['damage']>b['damage'] else b['id'] if b['damage']>a['damage'] else None,'timeout',now)
    save(db,m)

def bounded(x,y,viewer):
    rx,ry=(420,255) if viewer else (350,210)
    dx,dy=x-1000,y-1100;radius=math.hypot(dx/rx,dy/ry)
    lo,hi=(1.18,1.58) if viewer else (0,.97)
    if not radius:return (1000,1430) if viewer else (1000,1100)
    target=max(lo,min(hi,radius));return 1000+dx*target/radius,1100+dy*target/radius

def view(db,m,uid,viewer=False):
    fighters=[{k:f[k] for k in ('id','name','ap','level','hp','maxHp','mp','maxMp','damage','x','y')} for f in m['fighters'].values()]
    return dict(id=m['id'],status=m['status'],startsAt=m['startsAt'],endsAt=m['endsAt'],now=time.time(),
      duration=DURATION,viewer=viewer,fighters=fighters,winner=m.get('winner'),reason=m.get('reason'),
      spectators=db.execute('SELECT COUNT(*) FROM duel_members WHERE match_id=? AND viewer=1',(m['id'],)).fetchone()[0],
      pending=[{k:a[k] for k in ('id','slot','x','y','radius','at','owner')} for a in m['pending']],events=m['events'])

def snapshot(db,uid,peers):
    now=time.time();db.execute('DELETE FROM duel_invites WHERE expires<=?',(now,))
    live=[]
    for row in db.execute("SELECT data FROM duel_matches WHERE status='active' ORDER BY created DESC LIMIT 100").fetchall():
        m=json.loads(row['data']);tick(db,m,now)
        if m['status']=='active':live.append(view(db,m,uid,True))
    member=membership(db,uid);m=load(db,member['match_id']) if member else None
    if m and m['status']=='finished' and now-m['finishedAt']>30:
        db.execute('DELETE FROM duel_members WHERE user_id=?',(uid,));m=None
    def name(owner):
        row=db.execute('SELECT player FROM characters WHERE user_id=?',(owner,)).fetchone()
        return json.loads(row['player'])['nm'] if row else 'Đạo hữu'
    invites=[dict(id=r['id'],challenger=r['challenger'],target=r['target'],name=name(r['challenger']),targetName=name(r['target']),expires=r['expires']) for r in db.execute('SELECT * FROM duel_invites WHERE challenger=? OR target=?',(uid,uid)).fetchall()]
    return dict(current=view(db,m,uid,bool(member['viewer'])) if m else None,matches=live,invites=invites,
      online=[dict(id=p['id'],name=p['name'],level=p.get('level',1)) for p in peers.values() if p['id']!=uid and p['map']=='hub' and time.monotonic()-p['seen']<15],now=now)

def action(db,uid,body,peers,max_hp,attack):
    now=time.time();op=body.get('action');m=current(db,uid)
    if op=='invite':
        target=body.get('target')
        if type(target) is not int or target==uid:raise ValueError('Đối thủ không hợp lệ.')
        for owner in (uid,target):
            peer=peers.get(owner);existing=current(db,owner)
            if not peer or peer['map']!='hub' or time.monotonic()-peer['seen']>15:raise ValueError('Cả hai cần có mặt tại Thiên Vân Thành.')
            if existing and existing['status']=='active':raise ValueError('Một đạo hữu đang ở trong lôi đài.')
        if db.execute('SELECT 1 FROM duel_invites WHERE challenger=? AND target=? AND expires>?',(uid,target,now)).fetchone():raise ValueError('Lời mời trước vẫn còn hiệu lực.')
        if db.execute('SELECT COUNT(*) FROM duel_invites WHERE challenger=? AND expires>?',(uid,now)).fetchone()[0]>=3:raise ValueError('Đang có quá nhiều lời mời.')
        db.execute('INSERT INTO duel_invites VALUES(?,?,?,?)',(secrets.token_hex(12),uid,target,now+60))
    elif op in ('accept','decline','cancel'):
        invite=db.execute('SELECT * FROM duel_invites WHERE id=? AND expires>?',(body.get('id'),now)).fetchone()
        if not invite or (op!='cancel' and invite['target']!=uid) or (op=='cancel' and invite['challenger']!=uid):raise ValueError('Lời mời đã hết hạn hoặc không thuộc về bạn.')
        if op=='accept':
            fighters={}
            for i,owner in enumerate((invite['challenger'],uid)):
                existing=current(db,owner);peer=peers.get(owner)
                if existing and existing['status']=='active':raise ValueError('Đạo hữu đã tham gia trận khác.')
                if not peer or peer['map']!='hub' or time.monotonic()-peer['seen']>15:raise ValueError('Đối thủ đã rời Thiên Vân Thành.')
                row=db.execute('SELECT player FROM characters WHERE user_id=?',(owner,)).fetchone()
                if not row:raise ValueError('Không tìm thấy nhân vật.')
                p=json.loads(row['player']);hp=max_hp(p);gear=p.get('world',{}).get('equip',{});attrs=p.get('world',{}).get('attrs',{})
                mp=round(60+(progression.level(p)-1)*3+attrs.get('linh',0)*10+sum((g or {}).get('mp',0) for g in gear.values()))
                armor=sum((g or {}).get('armor',0)*(1+.05*(g or {}).get('enhance',0)) for g in gear.values())+attrs.get('the',0)*.15
                fighters[str(owner)]=dict(id=owner,name=p['nm'],ap=p['ap'],level=progression.level(p),hp=hp,maxHp=hp,mp=mp,maxMp=mp,attack=attack(p),armor=armor,speed=150+p['r']*10,damage=0,x=870+i*260,y=1100,lastSeen=now,manaAt=now,ready=[0]*5,seen=[],combo=0)
            mid=secrets.token_hex(12);m=dict(id=mid,status='active',startsAt=now+COUNTDOWN,endsAt=now+COUNTDOWN+DURATION,fighters=fighters,pending=[],events=[])
            db.execute('INSERT INTO duel_matches VALUES(?,?,?,?)',(mid,'active',json.dumps(m,ensure_ascii=False),now))
            for owner in fighters:db.execute('INSERT INTO duel_members VALUES(?,?,0) ON CONFLICT(user_id) DO UPDATE SET match_id=excluded.match_id,viewer=0',(int(owner),mid))
            db.execute('DELETE FROM duel_invites WHERE challenger IN (?,?) OR target IN (?,?)',(invite['challenger'],uid,invite['challenger'],uid))
        else:db.execute('DELETE FROM duel_invites WHERE id=?',(invite['id'],))
    elif op=='watch':
        if m and m['status']=='active' and str(uid) in m['fighters']:raise ValueError('Bạn đang thi đấu.')
        target=load(db,body.get('id'))
        if not target or target['status']!='active':raise ValueError('Trận đấu đã kết thúc.')
        db.execute('INSERT INTO duel_members VALUES(?,?,1) ON CONFLICT(user_id) DO UPDATE SET match_id=excluded.match_id,viewer=1',(uid,target['id']))
    elif op in ('leave','surrender'):
        if m and m['status']=='active' and str(uid) in m['fighters']:
            finish(m,next(f['id'] for f in m['fighters'].values() if f['id']!=uid),'surrender',now);save(db,m)
        db.execute('DELETE FROM duel_members WHERE user_id=?',(uid,))
    else:raise ValueError('Thao tác lôi đài không hợp lệ.')
    return snapshot(db,uid,peers)

def world_step(db,uid,body,peers):
    member=membership(db,uid)
    if not member:return None
    m=load(db,member['match_id']);now=time.time();viewer=bool(member['viewer'])
    if not m:return None
    if m['status']=='finished' and now-m['finishedAt']>30:
        db.execute('DELETE FROM duel_members WHERE user_id=?',(uid,));return None
    f=m['fighters'].get(str(uid));x,y=body['x'],body['y']
    if not viewer:
        if body.get('map')!='duel':x,y=f['x'],f['y']
        # Movement is independently bounded by elapsed server time, including dash.
        distance=math.hypot(x-f['x'],y-f['y']);limit=max(8,min(.5,max(0,now-f['lastSeen']))*f.get('speed',165))
        events=body.get('duelAttacks',[])
        if not isinstance(events,list) or len(events)>8:raise ValueError('Dữ liệu giao chiến không hợp lệ.')
        dash=any(isinstance(e,dict) and e.get('slot')==2 and isinstance(e.get('id'),str) and e['id'] not in f['seen'] for e in events) and now>=f['ready'][2] and f['level']>=20 and f['mp']>=10 and now>=m['startsAt']
        if dash:limit+=145
        if distance>limit:x,y=f['x']+(x-f['x'])*limit/distance,f['y']+(y-f['y'])*limit/distance
        x,y=bounded(x,y,False);f.update(x=x,y=y,lastSeen=now)
    else:x,y=bounded(x,y,True)
    tick(db,m,now)
    if not viewer and m['status']=='active' and now>=m['startsAt']:
        target=next(other for other in m['fighters'].values() if other['id']!=uid)
        for event in events:
            if not isinstance(event,dict):continue
            eid,slot=event.get('id'),event.get('slot')
            if not isinstance(eid,str) or not 1<=len(eid)<=80 or eid in f['seen'] or type(slot) is not int or slot not in range(5):continue
            f['seen']=(f['seen']+[eid])[-64:]
            if f['ready'][slot]>now or (slot and f['level']<progression.SKILL_LEVELS[slot-1]):continue
            cls=f['ap']['w'];cost=(0,8,10,16,24)[slot]
            if f['mp']<cost:continue
            interval,basic_range,powers=BASIC[cls]
            cooldown=interval if slot==0 else COOLDOWNS[cls][slot-1]
            f['ready'][slot]=now+cooldown;f['mp']-=cost
            if slot==2:f['evadeUntil']=now+.24
            power=powers[f['combo']%len(powers)] if slot==0 else (0,3.2,1.0,2.2,6.0)[slot]
            if slot==0:f['combo']+=1
            distance=basic_range+12 if slot==0 else (0,350,180,170,520)[slot]
            # Aim is fixed at launch; moving out of it avoids the attack.
            radius=(42,58,65,105,130)[slot]
            tx,ty=event.get('x',target['x']),event.get('y',target['y'])
            if any(type(v) not in (int,float) or not math.isfinite(v) for v in (tx,ty)):continue
            if math.hypot(tx-x,ty-y)>distance+radius:continue
            m['pending'].append(dict(id=eid,owner=uid,target=target['id'],slot=slot,x=tx,y=ty,ox=x,oy=y,range=distance,radius=radius,power=power,at=now+(.12,.28,.18,.42,.6)[slot]))
    save(db,m)
    result=view(db,m,uid,viewer);result.update(x=x,y=y,hp=f['hp'] if not viewer else None,mp=f['mp'] if not viewer else None)
    return result
