"""Persistent parties, player guilds, contribution tasks and reward inbox."""
import json
import math
import re
import secrets
import time
from datetime import datetime, timezone, timedelta


class Conflict(ValueError):
    pass


def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS parties(id TEXT PRIMARY KEY,leader INTEGER NOT NULL,created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS party_members(user_id INTEGER PRIMARY KEY REFERENCES users(id),party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,joined REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS party_invites(party_id TEXT NOT NULL REFERENCES parties(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id),expires REAL NOT NULL,PRIMARY KEY(party_id,user_id));
    CREATE TABLE IF NOT EXISTS guilds(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE,leader INTEGER NOT NULL,points INTEGER NOT NULL DEFAULT 0,created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS guild_members(user_id INTEGER PRIMARY KEY REFERENCES users(id),guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,contribution INTEGER NOT NULL DEFAULT 0,joined REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS guild_requests(guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,user_id INTEGER NOT NULL REFERENCES users(id),expires REAL NOT NULL,PRIMARY KEY(guild_id,user_id));
    CREATE TABLE IF NOT EXISTS guild_daily(guild_id TEXT NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,day TEXT NOT NULL,kills INTEGER NOT NULL DEFAULT 0,bosses INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,day));
    CREATE TABLE IF NOT EXISTS guild_donations(user_id INTEGER NOT NULL,day TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(user_id,day));
    CREATE TABLE IF NOT EXISTS guild_claims(user_id INTEGER NOT NULL,day TEXT NOT NULL,task TEXT NOT NULL,PRIMARY KEY(user_id,day,task));
    CREATE TABLE IF NOT EXISTS community_rewards(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),title TEXT NOT NULL,payload TEXT NOT NULL,claimed INTEGER NOT NULL DEFAULT 0,created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS community_ops(user_id INTEGER NOT NULL,operation_id TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,operation_id));
    CREATE TABLE IF NOT EXISTS world_boss_completions(encounter TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS world_boss_state(id TEXT PRIMARY KEY,state TEXT NOT NULL);
    ''')


def day():
    return datetime.now(timezone(timedelta(hours=7))).date().isoformat()


def membership(db,uid,kind):
    return db.execute(f'SELECT * FROM {kind}_members WHERE user_id=?',(uid,)).fetchone()


def group(db,uid,kind):
    member=membership(db,uid,kind)
    return db.execute(f'SELECT * FROM {"parties" if kind=="party" else "guilds"} WHERE id=?',(member[f'{kind}_id'],)).fetchone() if member else None


def members(db,group_id,kind,peers):
    rows=db.execute(f"SELECT m.*,json_extract(c.player,'$.nm') name,json_extract(c.player,'$.ap.w') sect FROM {kind}_members m JOIN characters c ON c.user_id=m.user_id WHERE m.{kind}_id=? ORDER BY m.joined,m.user_id",(group_id,)).fetchall()
    result=[]
    for row in rows:
        peer=peers.get(row['user_id'],{});online=time.monotonic()-peer.get('seen',-1000)<15
        result.append({'id':row['user_id'],'name':row['name'],'sect':row['sect'],'online':online,'map':peer.get('map') if online else None,'hp':peer.get('hp',0) if online else 0,'maxHp':peer.get('maxHp',100),'contribution':row['contribution'] if kind=='guild' else 0})
    return result


def snapshot(db,uid,peers):
    now=time.time();db.execute('DELETE FROM party_invites WHERE expires<?',(now,));db.execute('DELETE FROM guild_requests WHERE expires<?',(now,))
    party=group(db,uid,'party');guild=group(db,uid,'guild');today=day()
    result={'party':None,'guild':None,'day':today}
    if party:result['party']={**dict(party),'members':members(db,party['id'],'party',peers)}
    if guild:
        daily=db.execute('SELECT kills,bosses FROM guild_daily WHERE guild_id=? AND day=?',(guild['id'],today)).fetchone()
        claimed=[r['task'] for r in db.execute('SELECT task FROM guild_claims WHERE user_id=? AND day=?',(uid,today))]
        result['guild']={**dict(guild),'level':1+guild['points']//200,'members':members(db,guild['id'],'guild',peers),'tasks':dict(daily) if daily else {'kills':0,'bosses':0},'claimed':claimed}
        if guild['leader']==uid:result['guild']['requests']=[dict(r) for r in db.execute("SELECT q.user_id id,json_extract(c.player,'$.nm') name FROM guild_requests q JOIN characters c ON c.user_id=q.user_id WHERE q.guild_id=?",(guild['id'],))]
    boss=db.execute('SELECT state FROM world_boss_state WHERE id=?',('main',)).fetchone()
    boss=json.loads(boss['state']) if boss else {'hp':30000,'maxHp':30000,'phase':1,'respawnAt':0}
    ready=boss['hp']<=0 and now>=boss['respawnAt']
    result['worldBoss']={'hp':30000 if ready else boss['hp'],'maxHp':boss['maxHp'],'phase':1 if ready else boss['phase'],'respawn':max(0,boss['respawnAt']-now) if boss['hp']<=0 else 0}
    result['invites']=[dict(r) for r in db.execute("SELECT i.party_id,p.leader,json_extract(c.player,'$.nm') name FROM party_invites i JOIN parties p ON p.id=i.party_id JOIN characters c ON c.user_id=p.leader WHERE i.user_id=?",(uid,))]
    result['guilds']=[dict(r) for r in db.execute('SELECT g.id,g.name,g.points,COUNT(m.user_id) count FROM guilds g LEFT JOIN guild_members m ON m.guild_id=g.id GROUP BY g.id ORDER BY g.points DESC,g.created LIMIT 30')]
    result['rewards']=[{'id':r['id'],'title':r['title'],**json.loads(r['payload'])} for r in db.execute('SELECT * FROM community_rewards WHERE user_id=? AND claimed=0 ORDER BY created LIMIT 30',(uid,))]
    result['online']=[{'id':p['id'],'name':p['name'],'map':p['map']} for p in peers.values() if p['id']!=uid and time.monotonic()-p['seen']<15][:50]
    return result


def leave(db,uid,kind):
    current=group(db,uid,kind)
    if not current:raise ValueError('Bạn chưa tham gia.')
    db.execute(f'DELETE FROM {kind}_members WHERE user_id=?',(uid,))
    remaining=db.execute(f'SELECT user_id FROM {kind}_members WHERE {kind}_id=? ORDER BY joined,user_id',(current['id'],)).fetchall()
    table='parties' if kind=='party' else 'guilds'
    if not remaining:db.execute(f'DELETE FROM {table} WHERE id=?',(current['id'],))
    elif current['leader']==uid:db.execute(f'UPDATE {table} SET leader=? WHERE id=?',(remaining[0]['user_id'],current['id']))


def apply_reward(player,payload):
    player['gold']=min(10**9,player['gold']+payload.get('gold',0));world=player.setdefault('world',{})
    if payload.get('riftShards',0)>0:player['gold']=min(10**9,player['gold']+int(payload['riftShards'])*20)
    for key in ('essence',):world[key]=min(10**9,world.get(key,0)+payload.get(key,0))


def safe(player):
    scene=player.get('world',{}).get('map')
    if scene=='hub':return True
    return scene in ('sword','moon','thunder','mystic','valley') and abs(player['x']-1000)/300+abs(player['y']-1100)/160<.9


def action(db,uid,body,peers):
    op=body.get('action');now=time.time();operation=body.get('operationId')
    if not isinstance(operation,str) or not 1<=len(operation)<=80:raise ValueError('Thiếu mã thao tác.')
    saved=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not saved:raise ValueError('Hãy tạo nhân vật trước.')
    replay=db.execute('SELECT result FROM community_ops WHERE user_id=? AND operation_id=?',(uid,operation)).fetchone()
    if replay:
        result=json.loads(replay['result'])
        if result.get('changed'):result['character']={'player':json.loads(saved['player']),'revision':saved['revision'],'id':saved['id']}
        return result
    player=json.loads(saved['player']);changed=op in ('guild_create','guild_donate','task_claim','reward_claim')
    if changed:
        if body.get('revision')!=saved['revision']:raise Conflict('Bản lưu đã thay đổi. Đồng bộ lại trước khi nhận thưởng.')
        if not safe(player) or peers.get(uid,{}).get('map') in ('arena','worldboss'):raise ValueError('Về vùng an toàn để dùng ngân quỹ hoặc nhận thưởng.')
    if op in ('party_accept','party_decline','guild_request','reward_claim') and (not isinstance(body.get('id'),str) or not 1<=len(body['id'])<=120):raise ValueError('Mã tổ đội/tông môn/rương không hợp lệ.')
    target=body.get('target')
    if target is not None and (type(target) is not int or not db.execute('SELECT 1 FROM characters WHERE user_id=?',(target,)).fetchone()):raise ValueError('Không tìm thấy đạo hữu.')
    if op=='party_create':
        if membership(db,uid,'party'):raise ValueError('Bạn đã có tổ đội.')
        gid=secrets.token_hex(12);db.execute('INSERT INTO parties VALUES(?,?,?)',(gid,uid,now));db.execute('INSERT INTO party_members VALUES(?,?,?)',(uid,gid,now))
    elif op=='party_invite':
        party=group(db,uid,'party')
        if not party or party['leader']!=uid:raise ValueError('Chỉ đội trưởng được mời.')
        if target is None or target==uid or membership(db,target,'party'):raise ValueError('Đạo hữu đã có đội hoặc không hợp lệ.')
        if db.execute('SELECT COUNT(*) FROM party_members WHERE party_id=?',(party['id'],)).fetchone()[0]>=4:raise ValueError('Đội đã đủ 4 người.')
        if db.execute('SELECT COUNT(*) FROM party_invites WHERE party_id=?',(party['id'],)).fetchone()[0]>=8:raise ValueError('Đang có quá nhiều lời mời.')
        db.execute('INSERT OR REPLACE INTO party_invites VALUES(?,?,?)',(party['id'],target,now+120))
    elif op=='party_accept':
        gid=body.get('id');invite=db.execute('SELECT * FROM party_invites WHERE party_id=? AND user_id=? AND expires>?',(gid,uid,now)).fetchone()
        if not invite or membership(db,uid,'party'):raise ValueError('Lời mời hết hạn hoặc bạn đã có đội.')
        if db.execute('SELECT COUNT(*) FROM party_members WHERE party_id=?',(gid,)).fetchone()[0]>=4:raise ValueError('Đội đã đủ 4 người.')
        db.execute('INSERT INTO party_members VALUES(?,?,?)',(uid,gid,now));db.execute('DELETE FROM party_invites WHERE user_id=?',(uid,))
    elif op=='party_decline':db.execute('DELETE FROM party_invites WHERE party_id=? AND user_id=?',(body.get('id'),uid))
    elif op in ('party_leave','guild_leave'):leave(db,uid,op.split('_')[0])
    elif op in ('party_kick','party_promote','guild_kick','guild_promote'):
        kind,verb=op.split('_');current=group(db,uid,kind);member=membership(db,target,kind)
        if not current or current['leader']!=uid or target==uid or not member or member[kind+'_id']!=current['id']:raise ValueError('Chỉ trưởng nhóm được quản lý thành viên cùng nhóm.')
        if verb=='kick':db.execute(f'DELETE FROM {kind}_members WHERE user_id=?',(target,))
        else:db.execute(f'UPDATE {"parties" if kind=="party" else "guilds"} SET leader=? WHERE id=?',(target,current['id']))
    elif op=='guild_create':
        name=body.get('name','')
        if not isinstance(name,str) or not re.fullmatch(r'[\w ]{3,24}',name.strip()):raise ValueError('Tên tông môn cần 3–24 chữ/số/khoảng trắng.')
        if membership(db,uid,'guild'):raise ValueError('Bạn đã có tông môn.')
        if player['gold']<200:raise ValueError('Cần 200 Linh Thạch để lập tông môn.')
        if db.execute('SELECT 1 FROM guilds WHERE name=? COLLATE NOCASE',(name.strip(),)).fetchone():raise ValueError('Tên tông môn đã được dùng.')
        gid=secrets.token_hex(12);db.execute('INSERT INTO guilds VALUES(?,?,?,?,?)',(gid,name.strip(),uid,0,now));db.execute('INSERT INTO guild_members VALUES(?,?,?,?)',(uid,gid,0,now));player['gold']-=200
    elif op=='guild_request':
        gid=body.get('id')
        if membership(db,uid,'guild') or not db.execute('SELECT 1 FROM guilds WHERE id=?',(gid,)).fetchone():raise ValueError('Tông môn không hợp lệ hoặc bạn đã có tông môn.')
        db.execute('INSERT OR REPLACE INTO guild_requests VALUES(?,?,?)',(gid,uid,now+86400))
    elif op in ('guild_accept','guild_reject'):
        guild=group(db,uid,'guild')
        if not guild or guild['leader']!=uid or target is None:raise ValueError('Chỉ tông chủ được duyệt đơn.')
        request=db.execute('SELECT * FROM guild_requests WHERE guild_id=? AND user_id=? AND expires>?',(guild['id'],target,now)).fetchone()
        if not request:raise ValueError('Đơn đã hết hạn.')
        if op=='guild_accept':
            if membership(db,target,'guild'):raise ValueError('Đạo hữu đã vào tông môn khác.')
            if db.execute('SELECT COUNT(*) FROM guild_members WHERE guild_id=?',(guild['id'],)).fetchone()[0]>=30:raise ValueError('Tông môn đã đủ 30 người.')
            db.execute('INSERT INTO guild_members VALUES(?,?,?,?)',(target,guild['id'],0,now));db.execute('DELETE FROM guild_requests WHERE user_id=?',(target,))
        else:db.execute('DELETE FROM guild_requests WHERE guild_id=? AND user_id=?',(guild['id'],target))
    elif op=='guild_donate':
        guild=group(db,uid,'guild');today=day()
        if not guild:raise ValueError('Bạn chưa có tông môn.')
        count=db.execute('SELECT count FROM guild_donations WHERE user_id=? AND day=?',(uid,today)).fetchone()
        if count and count['count']>=5:raise ValueError('Hôm nay đã đóng góp đủ 5 lần.')
        if player['gold']<100:raise ValueError('Cần 100 Linh Thạch.')
        player['gold']-=100;db.execute('UPDATE guilds SET points=points+10 WHERE id=?',(guild['id'],));db.execute('UPDATE guild_members SET contribution=contribution+10 WHERE user_id=?',(uid,));db.execute('INSERT INTO guild_donations VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET count=count+1',(uid,today))
    elif op=='task_claim':
        guild=group(db,uid,'guild');task=body.get('task');today=day()
        if not guild or task not in ('kills','bosses'):raise ValueError('Nhiệm vụ không hợp lệ.')
        daily=db.execute('SELECT * FROM guild_daily WHERE guild_id=? AND day=?',(guild['id'],today)).fetchone()
        if not daily or daily[task]<(20 if task=='kills' else 1):raise ValueError('Nhiệm vụ chưa hoàn thành.')
        if db.execute('SELECT 1 FROM guild_claims WHERE user_id=? AND day=? AND task=?',(uid,today,task)).fetchone():raise ValueError('Đã nhận thưởng hôm nay, kể cả khi đổi tông môn.')
        apply_reward(player,{'gold':80,'essence':20} if task=='kills' else {'gold':150,'essence':30});db.execute('INSERT INTO guild_claims VALUES(?,?,?)',(uid,today,task))
    elif op=='reward_claim':
        reward=db.execute('SELECT * FROM community_rewards WHERE id=? AND user_id=? AND claimed=0',(body.get('id'),uid)).fetchone()
        if not reward:raise ValueError('Rương đã nhận hoặc không thuộc về bạn.')
        apply_reward(player,json.loads(reward['payload']));db.execute('UPDATE community_rewards SET claimed=1 WHERE id=?',(reward['id'],))
    else:raise ValueError('Thao tác không hợp lệ.')
    result={'ok':True,'changed':changed}
    if changed:
        revision=saved['revision']+1;db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(now),uid));result['character']={'id':saved['id'],'player':player,'revision':revision}
    db.execute('INSERT INTO community_ops VALUES(?,?,?)',(uid,operation,json.dumps({'ok':True,'changed':changed})))
    return result


def party_allies(db,uids):
    if not uids:return set()
    placeholders=','.join('?' for _ in uids)
    return {row['user_id'] for row in db.execute(f'SELECT user_id FROM party_members WHERE party_id IN (SELECT party_id FROM party_members WHERE user_id IN ({placeholders}))',list(uids))}


def record_kill(db,uids,boss=False):
    if not uids:return
    placeholders=','.join('?' for _ in uids)
    guilds={r['guild_id'] for r in db.execute(f'SELECT guild_id FROM guild_members WHERE user_id IN ({placeholders})',list(uids))}
    for gid in guilds:db.execute('INSERT INTO guild_daily VALUES(?,?,?,?) ON CONFLICT(guild_id,day) DO UPDATE SET kills=kills+excluded.kills,bosses=bosses+excluded.bosses',(gid,day(),0 if boss else 1,1 if boss else 0))


def new_boss():
    encounter=secrets.token_hex(12)
    return dict(id='worldboss:'+encounter,encounter=encounter,t=2,skin='Nhen',name='Thái Cổ Huyết Ma',x=1000,y=1100,hx=1000,hy=1100,hp=30000,maxHp=30000,phase=1,dead=0,cd=999,fr=0,fl=0,boss=True,elite=True,worldBoss=True,network=True,worldMap=True,map='worldboss',attackScale=1,xpReward=0,contributors={},_damage={},_lastDamage={},_nextCast=time.time()+3,respawnAt=0)


def save_boss(db,mob):
    state={k:mob[k] for k in ('id','encounter','hp','maxHp','phase','respawnAt','_damage','_lastDamage')}
    db.execute('INSERT INTO world_boss_state VALUES(?,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state',('main',json.dumps(state)))


def load_boss(db):
    row=db.execute('SELECT state FROM world_boss_state WHERE id=?',('main',)).fetchone();mob=new_boss()
    if row:
        state=json.loads(row['state']);mob.update(state);mob['_damage']={int(k):v for k,v in mob['_damage'].items()};mob['_lastDamage']={int(k):v for k,v in mob['_lastDamage'].items()}
        if mob['hp']<=0:mob['dead']=time.monotonic()+max(0,mob['respawnAt']-time.time())
    return mob


def boss_victory(db,mob,peers):
    now=time.monotonic();wall=time.time();eligible={uid for uid,damage in mob['_damage'].items() if damage>=min(math.ceil(mob['maxHp']*.01),math.ceil(peers.get(uid,{}).get('attack',8)*6)) and wall-mob['_lastDamage'].get(uid,0)<60 and uid in peers and peers[uid]['map']=='worldboss' and now-peers[uid]['seen']<15 and peers[uid].get('hp',1)>0}
    first=db.execute('INSERT OR IGNORE INTO world_boss_completions VALUES(?)',(mob['encounter'],)).rowcount
    if not first:return
    for uid in eligible:db.execute('INSERT OR IGNORE INTO community_rewards VALUES(?,?,?,?,0,?)',(f"boss:{mob['encounter']}:{uid}",uid,'Rương Thái Cổ Huyết Ma',json.dumps({'gold':250,'essence':60}),wall))
    record_kill(db,eligible,True);mob.pop('_cast',None);mob['respawnAt']=wall+300;save_boss(db,mob)


def tick_boss(mob,peers,field_blocked):
    wall=time.time();now=time.monotonic()
    if mob['hp']<=0:
        if wall>=mob['respawnAt']:mob.clear();mob.update(new_boss())
        return
    active=[p for p in peers.values() if p['map']=='worldboss' and now-p['seen']<3 and p.get('hp',1)>0]
    cast=mob.get('_cast')
    if cast and not cast.get('canceled') and field_blocked:
        cast['canceled']=True;mob['_nextCast']=wall+2
    if cast:
        for mark in cast['marks']:
            if mark.get('spent') or cast.get('canceled') or wall<mark['start']+mark['duration']:continue
            mark['spent']=True
            for peer in active:
                inside=math.hypot(peer['x']-mark['x'],peer['y']-mark['y'])<=mark['r']
                if not inside and peer['id']!=mark['target']:continue
                event={'id':mark['id'],'dodged':not inside or now<peer.get('evadeUntil',0),'amount':round(peer.get('maxHp',100)*(.28 if mob['phase']==2 else .22))}
                queue=peer.setdefault('bossEvents',[])
                if len(queue)<12:queue.append(event)
        if wall>=max(m['start']+m['duration'] for m in cast['marks'])+.4:mob.pop('_cast',None)
    if active and not mob.get('_cast') and wall>=mob.get('_nextCast',0) and wall>=mob.get('_enrageUntil',0) and not field_blocked:
        targets=sorted(active,key=lambda p:p['id']);count=3 if mob['phase']==2 else 1;marks=[]
        for i in range(count):
            target=targets[i%len(targets)];a=i*2.4
            marks.append({'id':secrets.token_hex(10),'target':target['id'],'x':target['x']+(math.cos(a)*24 if i else 0),'y':target['y']+(math.sin(a)*18 if i else 0),'r':60 if count==3 else 70,'start':wall+i*.3,'duration':1.1 if count==3 else 1.4})
        mob['_cast']={'id':secrets.token_hex(8),'marks':marks};mob['_nextCast']=wall+(4.8 if count==3 else 5.5)


def boss_view(mob,uid,attack=8):
    cast=mob.get('_cast');wall=time.time()
    return {'encounter':mob['encounter'],'hp':mob['hp'],'maxHp':mob['maxHp'],'phase':mob['phase'],'respawn':max(0,mob['respawnAt']-wall) if mob['hp']<=0 else 0,'contribution':mob['_damage'].get(uid,0),'required':min(math.ceil(mob['maxHp']*.01),math.ceil(attack*6)),'interrupted':bool(cast and cast.get('canceled')),'invulnerable':max(0,mob.get('_enrageUntil',0)-wall),'marks':[{k:m[k] for k in ('id','x','y','r','duration')}|{'age':wall-m['start'],'spent':m.get('spent',False)} for m in cast['marks']] if cast and not cast.get('canceled') else []}
