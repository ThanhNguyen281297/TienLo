"""Tiên Lộ: SQLite accounts, sessions, characters and shared online maps. Python 3.11+."""
import community
import equipment as equipment_rules
import progression
import expeditions
import duels
import adventure
import overworld
import forging
import trade
import tower
import economy
import engagement
import raid
import hashlib
import hmac
import json
import math
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from functools import partial
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import RLock
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
SECT_MAPS = ('sword', 'moon', 'thunder', 'mystic')
FIELD_RULES = json.loads((ROOT / 'Map' / 'field-effects.json').read_text(encoding='utf-8'))
PET_RULES = json.loads((ROOT / 'Item' / 'pet-skills.json').read_text(encoding='utf-8'))
DATABASE = Path(os.environ.get('TIENLO_DB', str(ROOT / 'data' / 'tienlo.sqlite3')))
PUBLIC_ORIGIN = os.environ.get('TIENLO_ORIGIN', '').rstrip('/')
SECURE_COOKIE = PUBLIC_ORIGIN.startswith('https://')
DB_LOCK = RLock()
WORLD_LOCK = RLock()
AUTH_LIMIT = defaultdict(deque)
AUTH_WORK = __import__('threading').BoundedSemaphore(2)
PEERS, ROOMS, EVENTS = {}, {}, defaultdict(list)
CHAT = deque(maxlen=100)
SECTS = ('Kiếm Tông', 'Minh Nguyệt Tông', 'Lôi Thương Tông', 'Thiên Cơ Môn')
STATIC_FILES = {p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
MAPS = ('hub', 'sword', 'moon', 'thunder', 'mystic', 'tower', 'worldboss', 'duel', 'raid', *expeditions.MAPS, *overworld.MAPS)
EVASION_COOLDOWNS = (6,5,8,5)


class ClosingConnection(sqlite3.Connection):
    def __exit__(self,*args):
        try:return super().__exit__(*args)
        finally:self.close()

def connect():
    DATABASE.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DATABASE, timeout=10, factory=ClosingConnection)
    db.row_factory = sqlite3.Row
    db.execute('PRAGMA foreign_keys=ON')
    return db


def init_db():
    with DB_LOCK, connect() as db:
        db.execute('PRAGMA journal_mode=WAL')
        db.executescript('''
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL, created_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
          csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS characters(user_id INTEGER PRIMARY KEY REFERENCES users(id),
          id TEXT UNIQUE NOT NULL, player TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
        ''')
        if 'gm' not in {r['name'] for r in db.execute('PRAGMA table_info(users)')}:
            db.execute('ALTER TABLE users ADD COLUMN gm INTEGER NOT NULL DEFAULT 0 CHECK(gm IN (0,1))')
        community.init_db(db)
        trade.init_db(db)
        equipment_rules.init_db(db,collection_item)
        expeditions.init_db(db)
        duels.init_db(db)
        adventure.init_db(db)
        tower.init_db(db)
        economy.init_db(db)
        engagement.init_db(db)
        raid.init_db(db)


def password_hash(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=5, maxmem=64*1024*1024).hex()
    return salt + ':' + digest


def session_key(token):
    return hashlib.sha256(token.encode()).hexdigest()


def valid_player(p):
    if not isinstance(p, dict) or not isinstance(p.get('nm'), str) or not 3 <= len(p['nm'].strip()) <= 12:
        raise ValueError('Đạo hiệu cần 3–12 ký tự.')
    ap = p.get('ap')
    if not isinstance(ap, dict) or type(ap.get('w')) is not int or ap['w'] not in range(4) or ap.get('gender') not in ('Nam', 'Nu'):
        raise ValueError('Tông môn hoặc giới tính không hợp lệ.')
    if 'face' in ap and (type(ap['face']) is not int or not 1<=ap['face']<=10):
        raise ValueError('Dung mạo không hợp lệ.')
    if 'outfitStyle' in ap and ap['outfitStyle'] not in ['class',*[s['id'] for s in equipment_rules.RULES['outfitStyles']]]:
        raise ValueError('Màu trang phục không hợp lệ.')
    for key, low, high in [('r',0,14),('stage',1,10),('gold',0,10**9),('xp',0,10**9),('hp',0,10**7),('mp',0,10**7),('x',0,2000),('y',0,2000)]:
        value = p.get(key)
        if type(value) not in (int,float) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError('Chỉ số nhân vật không hợp lệ: ' + key)
        if key in ('r','stage','gold') and value != int(value):
            raise ValueError('Chỉ số nguyên không hợp lệ.')
    progression.validate(p)
    world = p.get('world', {})
    if not isinstance(world, dict) or world.get('map', 'sword') not in MAPS or not isinstance(world.get('bag', []), list) or len(world.get('bag', [])) > equipment_rules.capacity(world):
        raise ValueError('Túi đồ hoặc bản đồ không hợp lệ.')
    attrs=world.get('attrs',{})
    if not isinstance(attrs,dict) or set(attrs)-set(progression.ATTRIBUTES) or any(type(v) is not int or not 0<=v<=1000 for v in attrs.values()):
        raise ValueError('Thuộc tính không hợp lệ.')
    points=world.get('attrPoints',0)
    if type(points) is not int or not 0<=points<=100000:
        raise ValueError('Điểm thuộc tính không hợp lệ.')
    credited=world.get('attributeLevel')
    if credited is not None and (type(credited) is not int or not 1<=credited<=progression.level(p)):
        raise ValueError('Mốc nhận điểm thuộc tính không hợp lệ.')
    equipment=world.get('equip',{})
    if not isinstance(equipment,dict) or set(equipment)-set(equipment_rules.RULES['slots']):
        raise ValueError('Ô trang bị không hợp lệ.')
    for item in world.get('bag',[])+[v for v in equipment.values() if v is not None]:
        if not isinstance(item,dict) or not isinstance(item.get('id'),str) or not isinstance(item.get('uid'),str):
            raise ValueError('Vật phẩm không hợp lệ.')
        if type(item.get('enhance',0)) is not int or not 0<=item.get('enhance',0)<=15:raise ValueError('Cường hóa chỉ từ +0 đến +15.')
        if item['id'].startswith('rift-') or item.get('setId'):raise ValueError('Bộ trang bị đã ngừng sử dụng.')
        if item.get('rarity') not in ('pham','huyen','linh','tien','than'):raise ValueError('Phẩm chất không hợp lệ.')
        for key in ('atk','hp','mp','armor','crit','dodge','skill','heal','mana','xp','price','req','qty'):
            if key in item and (type(item[key]) not in (int,float) or not math.isfinite(item[key]) or not 0<=item[key]<=10000):
                raise ValueError('Chỉ số vật phẩm không hợp lệ.')
    equipment_rules.validate(p)
    pets=world.get('pets',[])
    species={'BoNgua','Tho','Nhen','Doi'}
    if not isinstance(pets,list) or len(pets)>20:raise ValueError('Linh thú không hợp lệ.')
    if any(not isinstance(pet,dict) or not isinstance(pet.get('id'),str) or not 1<=len(pet['id'])<=80 or pet.get('species') not in species or not isinstance(pet.get('name'),str) or len(pet['name'])>40 for pet in pets):raise ValueError('Linh thú không hợp lệ.')
    pet_ids=[pet['id'] for pet in pets]
    if len(set(pet_ids))!=len(pet_ids) or (world.get('activePet') is not None and world['activePet'] not in pet_ids):raise ValueError('Linh thú xuất chiến không hợp lệ.')
    hatch=world.get('hatching')
    if hatch is not None and (not isinstance(hatch,dict) or not isinstance(hatch.get('id'),str) or not 1<=len(hatch['id'])<=80 or hatch.get('species') not in species or type(hatch.get('readyAt')) not in (int,float) or not math.isfinite(hatch['readyAt']) or not 0<=hatch['readyAt']<=10000000000000):raise ValueError('Trứng đang ấp không hợp lệ.')
    for key in ('learnedSkills','skillLevels'):
        if key in world and (not isinstance(world[key],list) or len(world[key])!=4):raise ValueError('Kỹ năng không hợp lệ.')
    def inspect(value,depth=0):
        if depth>12:raise ValueError('Dữ liệu quá sâu.')
        if isinstance(value,dict):
            if set(value)&{'__proto__','prototype','constructor'}:raise ValueError('Khóa không hợp lệ.')
            for child in value.values():inspect(child,depth+1)
        elif isinstance(value,list):
            for child in value:inspect(child,depth+1)
    inspect(p)
    json.dumps(p, allow_nan=False)


def equipment_stats(player):
    gear=player.get('world',{}).get('equip',{})
    attack=equipment_rules.bonuses(player).get('atk',0)+sum(max(0,min(100,item.get('atk',0)))*(1+.05*item.get('enhance',0) if slot in equipment_rules.RULES['enhanceSlots'] else 1) for slot,item in gear.items() if isinstance(item,dict))
    return attack,1,0


# Kept only to decode old saves during the equipment migration.
def collection_item(item_id):return equipment_rules.legacy_collection(item_id)


def player_attack(player):
    level=player['r']*10+player['stage']-1
    gear,multiplier,_=equipment_stats(player)
    strength=max(0,min(1000,player.get('world',{}).get('attrs',{}).get('luc',0)))
    return (8+level*1.3+(progression.level(player)-1)*.8+strength*2+gear+equipment_rules.bonuses(player).get('attackFlat',0))*multiplier*(1+equipment_rules.bonuses(player).get('attackPercent',0))


def player_max_hp(player):
    world=player.get('world',{});attrs=world.get('attrs',{});equipment=world.get('equip',{})
    hp=equipment_rules.bonuses(player).get('hp',0)+sum(max(0,min(10000,item.get('hp',0)))*(1+.05*item.get('enhance',0) if slot in equipment_rules.RULES['enhanceSlots'] else 1) for slot,item in equipment.items() if isinstance(item,dict))
    _,multiplier,_=equipment_stats(player)
    return round((100+(player['r']*10+player['stage']-1)*6+(progression.level(player)-1)*6+attrs.get('the',0)*15+hp)*multiplier*(1+equipment_rules.bonuses(player).get('hpPercent',0)))


def damage_mob(mob,damage,owner,now,key):
    if mob['dead']:return
    if mob.get('worldBoss'):
        if time.time()<mob.get('_enrageUntil',0):return
        amount=max(1,round(damage))
        if mob['phase']==1:amount=min(amount,max(0,mob['hp']-mob['maxHp']//2))
        amount=min(amount,mob['hp']);mob['_damage'][owner]=mob['_damage'].get(owner,0)+amount;mob['_lastDamage'][owner]=time.time();mob['hp']-=amount
        if mob['phase']==1 and mob['hp']<=mob['maxHp']//2:
            mob['phase']=2;mob['_enrageUntil']=time.time()+1.5;mob.pop('_cast',None);mob['_nextCast']=time.time()+2
        if mob['hp']<=0:mob['dead']=now+300
        with connect() as db:
            if mob['hp']<=0:community.boss_victory(db,mob,PEERS)
            else:community.save_boss(db,mob)
        return
    mob['hp']=max(0,mob['hp']-max(1,round(damage)));mob['contributors'][owner]=now
    if mob['hp']>0:return
    mob['dead']=10**30 if mob.get('tower') or mob.get('raid') else now+(90 if mob.get('expedition') and mob.get('boss') else 12 if mob.get('expedition') else 8)
    eligible={uid for uid,stamp in mob['contributors'].items() if uid in PEERS and room_for(PEERS[uid])==key and now-stamp<15}
    with connect() as db:
        for ally in community.party_allies(db,eligible):
            other=PEERS.get(ally)
            if other and room_for(other)==key and now-other['seen']<15 and other.get('hp',1)>0 and math.hypot(other['x']-mob['x'],other['y']-mob['y'])<=350:eligible.add(ally)
        community.record_kill(db,eligible)
        if mob.get('raid') and key in ROOMS:raid.on_kill(db,ROOMS[key],mob,{uid for uid,peer in PEERS.items() if room_for(peer)==key and now-peer['seen']<15})
    # Linh Triều: kill EXP/Linh Thạch x2 (the reward replay grants gold from EXP).
    bonus=engagement.multiplier('kill')
    with connect() as db:
        for contributor in eligible:
            event_id=secrets.token_hex(12)
            engagement.record_kill(db,contributor)
            expeditions.queue_drop(db,contributor,mob,event_id)
            economy.credit_kill(db,contributor,dict(mob,xpReward=(mob.get('xpReward') or 20+mob.get('level',1)*8)*bonus))
            adventure.record_kill(db,contributor,mob,event_id)
            if mob.get('tower'):tower.record_kill(db,contributor,mob)
            expeditions.queue_farm_drop(db,contributor,mob,event_id)
            EVENTS[contributor].append({k:v for k,v in public_mob(mob).items() if k!='dead'} | {'eventId':event_id} | ({'xpReward':(mob.get('xpReward') or 20+mob.get('level',1)*8)*bonus,'eventBonus':bonus} if bonus>1 else {}))
            EVENTS[contributor]=EVENTS[contributor][-100:]


def tick_pet_effects(mob,now,key):
    effects=mob.setdefault('_petEffects',{})
    for owner,effect in list(effects.items()):
        peer=PEERS.get(owner)
        if not peer or room_for(peer)!=key or mob['dead'] or (peer.get('pet') or {}).get('id')!=effect.get('petId'):
            effects.pop(owner,None);continue
        if effect['kind']=='poison':
            while effect['ticks']>0 and now>=effect['next'] and not mob['dead']:
                damage_mob(mob,effect['power']*field_vulnerability(mob),owner,now,key)
                effect['ticks']-=1;effect['next']+=1
            if effect['ticks']==0:effects.pop(owner,None)
        elif now>=effect['until']:effects.pop(owner,None)
    mob['petEffects']=[{'kind':e['kind'],'slow':e.get('slow',1)} for e in effects.values()]


def register_pet_cast(peer,body,player,now,mobs):
    request=body.get('petCast')
    if not isinstance(request,dict) or peer.get('paused'):return
    cast_id=request.get('id')
    if not isinstance(cast_id,str) or not 1<=len(cast_id)<=80 or cast_id==peer.get('lastPetCast'):return
    world=player.get('world',{})
    pet=next((v for v in world.get('pets',[]) if v['id']==world.get('activePet')),None)
    if not pet or request.get('species')!=pet['species']:return
    rule=PET_RULES[pet['species']]
    target=next((m for m in mobs if m['id']==request.get('target') and not m['dead']),None)
    if pet['species']!='Tho' and (not target or math.hypot(target['x']-peer['x'],target['y']-peer['y'])>rule['range']):return
    uid=peer['id'];wall=time.time()
    with connect() as db:
        db.execute('CREATE TABLE IF NOT EXISTS pet_skill_cooldowns(user_id INTEGER PRIMARY KEY,ready_at REAL NOT NULL,cast_id TEXT NOT NULL)')
        row=db.execute('SELECT * FROM pet_skill_cooldowns WHERE user_id=?',(uid,)).fetchone()
        if row and (row['ready_at']>wall or row['cast_id']==cast_id):return
        db.execute('INSERT INTO pet_skill_cooldowns VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET ready_at=excluded.ready_at,cast_id=excluded.cast_id',(uid,wall+rule['cooldown'],cast_id))
    peer['lastPetCast']=cast_id;peer['petCast']={'id':cast_id,'species':pet['species'],'x':target['x'] if target else peer['x'],'y':target['y'] if target else peer['y']};peer['petCastAt']=now
    if not target:return
    power=player_attack(player)*rule['power'];key=room_for(peer)
    if pet['species']=='Nhen':
        target.setdefault('_petEffects',{})[uid]={'kind':'poison','power':power,'ticks':5,'next':now+1,'petId':pet['id']}
    elif pet['species']=='Doi':
        for mob in mobs:
            if not mob['dead'] and math.hypot(mob['x']-target['x'],mob['y']-target['y'])<=rule['radius']:
                damage_mob(mob,power*field_vulnerability(mob),uid,now,key)
                mob.setdefault('_petEffects',{})[uid]={'kind':'frost','petId':pet['id'],'slow':.85 if mob.get('elite') or mob['t']==2 else rule['slow'],'until':now+rule['duration']}
    else:damage_mob(target,power*field_vulnerability(target),uid,now,key)


def room_for(peer):
    if peer['map']=='tower':return 'tower:'+str(peer['id'])+':'+peer['towerToken']
    if peer['map']=='duel':return 'duel:'+str(peer.get('duelId','lobby'))
    if peer['map']=='raid':return 'raid:'+peer.get('raidToken','none')
    if peer['map'] in expeditions.MAPS or peer['map'] in overworld.MAPS:return peer['map']+':0'
    return 'worldboss:0' if peer['map']=='worldboss' else peer['map'] + ':0'


def room_mobs(key):
    scene=key.split(':')[0]
    # Hub, duel lobby and the four sect courts are safe: no mobs.
    if scene in ('hub','duel',*SECT_MAPS):return dict(mobs=[],updated=time.monotonic())
    if scene not in MAPS:return dict(mobs=[],updated=time.monotonic())
    if key.startswith('tower:'):
        if key not in ROOMS:
            _,uid,token=key.split(':')
            with DB_LOCK, connect() as db:ROOMS[key]=tower.room(db,int(uid),token)
        return ROOMS[key]
    if scene=='raid':
        if key not in ROOMS:
            with DB_LOCK, connect() as db:ROOMS[key]=raid.room(db,key.split(':',1)[1])
        return ROOMS[key]
    if scene in overworld.MAPS:
        if key not in ROOMS:ROOMS[key]=overworld.room(scene)
        return ROOMS[key]
    if scene in expeditions.MAPS:
        if key not in ROOMS:ROOMS[key]=expeditions.room(scene,time.monotonic())
        return ROOMS[key]
    if scene=='worldboss':
        if key not in ROOMS:
            with connect() as db:boss=community.load_boss(db)
            ROOMS[key]={'mobs':[boss],'updated':time.monotonic()}
        return ROOMS[key]
    return dict(mobs=[],updated=time.monotonic())


class GameServer(ThreadingHTTPServer):
    request_queue_size=128
    daemon_threads=True



def register_skill_field(peer, body, now):
    """A field has a fixed class profile, ground position, lifetime and cooldown."""
    if 'field' not in body:
        return
    request = body['field']
    if request is None:
        peer.pop('skillField', None)
        return
    if not isinstance(request, dict) or not isinstance(request.get('id'), str) or not 1 <= len(request['id']) <= 64:
        return
    sect = peer['ap']['w']
    rule = FIELD_RULES[sect]
    current = peer.get('skillField')
    if current and current['id'] == request['id']:
        return  # A retried heartbeat never refreshes duration or control.
    if peer.get('lastFieldId') == request['id'] or now - peer.get('fieldAt', -1000) < rule['cooldown']:
        return
    x, y = request.get('x'), request.get('y')
    if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 2000 for v in (x, y)):
        return
    # A native dash/teleport can occur before the first 220 ms heartbeat.
    if math.hypot(x-peer['x'], y-peer['y']) > 240:
        return
    age=request.get('age',0)
    if type(age) not in (int,float) or not math.isfinite(age) or not 0<=age<rule['duration']:
        return
    peer['skillField'] = dict(id=request['id'], sect=sect, x=x, y=y, until=now+rule['duration']-age, room=room_for(peer))
    peer['lastFieldId'] = request['id']
    peer['fieldAt'] = now


def update_mob_fields(mob, fields, now, dt):
    """Continuous exposure resets on exit; hard control triggers once per field."""
    memory = mob.setdefault('_fieldExposure', {})
    live_keys = set()
    effects = []
    for field in fields:
        if mob['dead'] or field['until'] <= now:
            continue
        key = field['owner'], field['id']
        live_keys.add(key)
        record = memory.setdefault(key, dict(exposure=0, triggered=False, hardUntil=0))
        rule = FIELD_RULES[field['sect']]
        distance = math.hypot(mob['x']-field['x'], mob['y']-field['y'])
        if distance > rule['radius']:
            record['exposure'] = 0
            record['hardUntil'] = 0
            continue
        record['exposure'] = record['exposure']+dt if distance <= rule.get('centerRadius', rule['radius']) else 0
        resistant = mob['t'] == 2 or mob.get('elite', False)
        if rule['threshold'] and record['exposure'] >= rule['threshold'] and not record['triggered']:
            record['triggered'] = True
            record['hardUntil'] = now+rule['hardDuration']*(.4 if resistant else 1)
        effects.append({**rule, 'hard': max(0, record['hardUntil']-now),
                        'stacks': min(3, int(record['exposure'])) if field['sect'] == 2 else 0,
                        'vulnerability': 1+(rule['vulnerability']-1)*(.5 if resistant else 1)})
    for key in list(memory):
        if key not in live_keys:
            del memory[key]
    mob['fieldEffects'] = effects


def field_attack_blocked(mob):
    return any(effect['hard'] > 0 for effect in mob.get('fieldEffects', []))


def field_speed(mob):
    immobilized=any(effect['hard']>0 and effect['key']!='mysticSeal' for effect in mob.get('fieldEffects', []))
    return 0 if immobilized else min([1]+[effect['slow'] for effect in mob.get('fieldEffects', [])]+[effect.get('slow',1) for effect in mob.get('petEffects',[])])


def field_outgoing(mob):
    return min([1]+[effect['outgoing'] for effect in mob.get('fieldEffects', [])])


def field_vulnerability(mob):
    return max([1]+[effect['vulnerability'] for effect in mob.get('fieldEffects', [])])


def public_mob(mob):
    return {key: value for key, value in mob.items() if key != 'contributors' and not key.startswith('_')}


class GameHandler(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        if os.environ.get('TIENLO_QUIET') != '1': super().log_message(fmt,*args)

    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','same-origin')
        self.send_header('X-Frame-Options','DENY')
        super().end_headers()

    def reply(self, status, data, cookie=None):
        body=json.dumps(data,ensure_ascii=False,allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        if cookie is not None: self.send_header('Set-Cookie',cookie)
        self.end_headers()
        if self.command!='HEAD':self.wfile.write(body)

    def cookie(self, token='', clear=False):
        return f'tienlo_session={token}; Path=/; Max-Age={0 if clear else 604800}; HttpOnly; SameSite=Strict' + ('; Secure' if SECURE_COOKIE else '')

    def identity(self):
        cookie=SimpleCookie()
        try: cookie.load(self.headers.get('Cookie','')); token=cookie['tienlo_session'].value
        except (KeyError,ValueError): return None
        with connect() as db:
            return db.execute('SELECT s.*, u.username, u.gm FROM sessions s JOIN users u ON u.id=s.user_id WHERE token=? AND expires_at>?', (session_key(token),int(time.time()))).fetchone()

    def body(self):
        length=int(self.headers.get('Content-Length','0'))
        if not 0 < length <= 65536: raise ValueError('Dữ liệu gửi quá lớn hoặc rỗng.')
        value=json.loads(self.rfile.read(length))
        if not isinstance(value,dict): raise ValueError('JSON phải là object.')
        return value

    def do_GET(self):
        try: self.get_route()
        except (ValueError,TypeError,KeyError,OverflowError): self.reply(400,{'error':'Dữ liệu không hợp lệ.'})
        except sqlite3.Error: self.reply(503,{'error':'Database đang bận. Hãy thử lại.'})

    def get_route(self):
        path=urlsplit(self.path).path
        if path=='/api/health': return self.reply(200,{'ok':True,'storage':'sqlite'})
        if path.startswith('/api/'):
            user=self.identity()
            if path=='/api/session': return self.reply(200,{'user':{'id':user['user_id'],'username':user['username'],'gm':bool(user['gm'])} if user else None,'csrf':user['csrf'] if user else None})
            if not user: return self.reply(401,{'error':'Vui lòng đăng nhập.'})
            if path=='/api/characters':
                with connect() as db: row=db.execute('SELECT * FROM characters WHERE user_id=?',(user['user_id'],)).fetchone()
                return self.reply(200,{'character':{'id':row['id'],'player':progression.normalize(json.loads(row['player'])),'revision':row['revision']} if row else None})
            if path=='/api/equipment': return self.equipment(user)
            if path=='/api/community': return self.community(user)
            if path=='/api/trade': return self.trade(user)
            if path=='/api/duel': return self.duel(user)
            if path=='/api/expedition': return self.expedition(user)
            if path=='/api/adventure': return self.adventure(user)
            if path=='/api/arena': return self.reply(410,{'error':'Đấu trường cũ đã đóng. Hãy đến Vạn Tầng Tháp.'})
            if path=='/api/tower': return self.tower(user)
            if path=='/api/engagement': return self.engagement(user)
            if path=='/api/raid': return self.raid(user)
            if path=='/api/rankings':
                with connect() as db: rows=db.execute("SELECT json_extract(player,'$.nm') AS name, json_extract(player,'$.ap.w') AS sect, json_extract(player,'$.r') AS realm, json_extract(player,'$.stage') AS stage, COALESCE(json_extract(player,'$.world.kills'),0) AS kills FROM characters ORDER BY realm DESC,stage DESC,kills DESC LIMIT 50").fetchall()
                return self.reply(200,[dict(name=r['name'],sect=SECTS[r['sect']],realm=r['realm'],stage=r['stage'],kills=r['kills']) for r in rows])
            if path=='/api/player/info':
                from urllib.parse import parse_qs
                try:
                    target=int(parse_qs(urlsplit(self.path).query).get('id',['0'])[0])
                    with WORLD_LOCK, DB_LOCK, connect() as db:
                        result=trade.public(db,target,PEERS,True)
                except ValueError:return self.reply(404,{'error':'Không tìm thấy nhân vật.'})
                return self.reply(200,result)
            if path.startswith('/api/player/lookup'):
                qs=urlsplit(self.path).query
                from urllib.parse import parse_qs
                params=parse_qs(qs)
                name=params.get('name',[''])[0].strip()
                if not name or len(name)<2:return self.reply(400,{'error':'Nhập tên tìm kiếm (ít nhất 2 ký tự).'})
                with connect() as db: rows=db.execute("SELECT c.user_id id,json_extract(player,'$.nm') AS name, json_extract(player,'$.ap.w') AS sect, json_extract(player,'$.r') AS realm, json_extract(player,'$.stage') AS stage FROM characters c JOIN users u ON u.id=c.user_id WHERE json_extract(player,'$.nm') LIKE ? LIMIT 20",('%'+name+'%',)).fetchall()
                return self.reply(200,[dict(id=r['id'],name=r['name'],sect=SECTS[r['sect']],realm=r['realm'],stage=r['stage'],online=bool(PEERS.get(r['id']))) for r in rows])
            return self.reply(404,{'error':'API không tồn tại.'})
        requested=Path(self.translate_path(self.path))
        target=requested.resolve()
        relative=target.relative_to(ROOT) if target.is_relative_to(ROOT) else None
        if relative is None or (relative.parts and relative.parts[0] not in ('js','css','Character','Map','Item','Skill')) and relative.as_posix()!='index.html' and path!='/':
            return self.send_error(403)
        if target.is_dir() and path!='/': return self.send_error(403)
        if not target.is_dir() and requested.relative_to(ROOT).as_posix() not in STATIC_FILES:
            return self.send_error(404)
        super().do_HEAD() if self.command=="HEAD" else super().do_GET()

    def do_HEAD(self):
        # Same allowlist as GET; do not expose database/source through HEAD.
        self.do_GET()

    def do_POST(self):
        try: self.post_route()
        except (ValueError,TypeError,KeyError,OverflowError,json.JSONDecodeError): self.reply(400,{'error':'Dữ liệu không hợp lệ.'})
        except sqlite3.Error: self.reply(503,{'error':'Database đang bận. Hãy thử lại.'})

    def post_route(self):
        path=urlsplit(self.path).path
        origin=self.headers.get('Origin')
        allowed=PUBLIC_ORIGIN or 'http://'+self.headers.get('Host','')
        if origin and origin!=allowed: return self.reply(403,{'error':'Nguồn request không hợp lệ.'})
        if path in ('/api/register','/api/login'): return self.authenticate(path,self.body())
        user=self.identity()
        if not user: return self.reply(401,{'error':'Phiên đăng nhập hết hạn.'})
        body=self.body()
        if not hmac.compare_digest(str(body.pop('csrf','')),user['csrf']): return self.reply(403,{'error':'Phiên bảo mật không hợp lệ. Tải lại trang.'})
        if path=='/api/logout':
            with connect() as db: db.execute('DELETE FROM sessions WHERE token=?',(user['token'],))
            with WORLD_LOCK: PEERS.pop(user['user_id'],None); EVENTS.pop(user['user_id'],None)
            return self.reply(200,{'ok':True},self.cookie(clear=True))
        if path=='/api/equipment': return self.equipment(user,body)
        if path=='/api/community': return self.community(user,body)
        if path=='/api/trade': return self.trade(user,body)
        if path=='/api/duel': return self.duel(user,body)
        if path=='/api/expedition': return self.expedition(user,body)
        if path=='/api/adventure': return self.adventure(user,body)
        if path=='/api/arena': return self.reply(410,{'error':'Đấu trường cũ đã đóng. Hãy đến Vạn Tầng Tháp.'})
        if path=='/api/tower': return self.tower(user,body)
        if path=='/api/engagement': return self.engagement(user,body)
        if path=='/api/raid': return self.raid(user,body)
        if path=='/api/characters': return self.save_character(user,body)
        if path=='/api/world': return self.world(user,body)
        if path=='/api/chat':
            text=body.get('text','')
            if not isinstance(text,str) or not 1<=len(text.strip())<=160: return self.reply(400,{'error':'Tin nhắn cần 1–160 ký tự.'})
            with WORLD_LOCK:
                peer=PEERS.get(user['user_id'])
                if not peer: return self.reply(409,{'error':'Hãy vào game trước.'})
                now=time.monotonic()
                if now-peer.get('lastChat',0)<1: return self.reply(429,{'error':'Chờ một giây trước khi gửi tiếp.'})
                peer['lastChat']=now
                channel=body.get('channel','world');group_id=None
                if channel not in ('world','party','guild'):raise ValueError()
                if channel!='world':
                    with connect() as db:member=community.membership(db,user['user_id'],channel)
                    if not member:return self.reply(409,{'error':'Bạn chưa có đội/tông môn.'})
                    group_id=member[channel+'_id']
                CHAT.append({'id':secrets.token_hex(8),'map':peer['map'],'channel':channel,'group':group_id,'name':peer['name'],'text':text.strip(),'at':int(time.time())})
            return self.reply(200,{'ok':True})
        return self.reply(404,{'error':'API không tồn tại.'})

    def authenticate(self,path,body):
        username=body.get('username',''); password=body.get('password','')
        if not isinstance(username,str) or not re.fullmatch(r'[a-zA-Z0-9_]{3,24}',username) or not isinstance(password,str) or not 10<=len(password)<=128:
            return self.reply(400,{'error':'Tên đăng nhập 3–24 ký tự chữ/số/_. Mật khẩu 10–128 ký tự.'})
        username=username.lower(); now=int(time.time()); ip=self.client_address[0]
        if os.environ.get('TIENLO_TRUST_PROXY')=='1' and ip in ('127.0.0.1','::1'):
            ip=self.headers.get('X-Real-IP',ip)[:64]
        with DB_LOCK:
            bucket=AUTH_LIMIT[ip]
            while bucket and bucket[0]<now-300: bucket.popleft()
            if len(bucket)>=15: return self.reply(429,{'error':'Quá nhiều lần đăng nhập. Thử lại sau 5 phút.'})
            bucket.append(now)
            if len(AUTH_LIMIT)>10000:
                for key in list(AUTH_LIMIT):
                    if not AUTH_LIMIT[key] or AUTH_LIMIT[key][-1]<now-300: del AUTH_LIMIT[key]
        if not AUTH_WORK.acquire(blocking=False): return self.reply(503,{'error':'Đang xử lý đăng nhập. Thử lại sau ít giây.'})
        try:
            with connect() as db:
                row=db.execute('SELECT * FROM users WHERE username=?',(username,)).fetchone()
                if path=='/api/register':
                    if row: return self.reply(409,{'error':'Tên đăng nhập đã được sử dụng.'})
                    hashed=password_hash(password)
                    try: uid=db.execute('INSERT INTO users(username,password,created_at) VALUES(?,?,?)',(username,hashed,now)).lastrowid
                    except sqlite3.IntegrityError: return self.reply(409,{'error':'Tên đăng nhập đã được sử dụng.'})
                else:
                    # Also hash unknown accounts to avoid a cheap timing distinction.
                    stored=row['password'] if row else None
                    trial=password_hash(password,stored.split(':')[0] if stored else '0'*32)
                    if not stored or not hmac.compare_digest(trial,stored): return self.reply(401,{'error':'Tên đăng nhập hoặc mật khẩu không đúng.'})
                    uid=row['id']
                token=secrets.token_urlsafe(32); csrf=secrets.token_urlsafe(24)
                # One active session prevents concurrent devices overwriting the same character.
                db.execute('DELETE FROM sessions WHERE user_id=? OR expires_at<=?',(uid,now))
                db.execute('INSERT INTO sessions VALUES(?,?,?,?)',(session_key(token),uid,csrf,now+604800))
            with WORLD_LOCK:PEERS.pop(uid,None)
            return self.reply(200,{'user':{'id':uid,'username':username,'gm':bool(row['gm']) if path!='/api/register' else False},'csrf':csrf},self.cookie(token))
        finally: AUTH_WORK.release()

    def save_character(self,user,body):
        player=body.get('player')
        if isinstance(player,dict):equipment_rules.normalize(player,collection_item)
        valid_player(player)
        progression.normalize(player)
        uid=user['user_id']; revision=body.get('revision',0)
        if type(revision) is not int: raise ValueError()
        corrected=[]
        with DB_LOCK, connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
            if trade.locked(db,uid):return self.reply(409,{'error':'Mở khóa giao dịch trước khi đổi hành trang.'})
            if row and row['revision']!=revision: return self.reply(409,{'error':'Nhân vật đã được cập nhật ở phiên khác. Tải lại để tiếp tục.','conflict':True})
            equipment_rules.validate(player,db,uid)
            if not user['gm']:
                old_gear={i['uid']:i for i in equipment_rules.items(json.loads(row['player']))} if row else {}
                old_items={uid:i['id'] for uid,i in old_gear.items() if i.get('slot')}
                if row and any(i.get('enhance',0)!=old_gear.get(i['uid'],{}).get('enhance',0) for i in equipment_rules.items(player)):
                    return self.reply(403,{'error':'Cường hóa phải thực hiện tại NPC Luyện Khí.'})
                if row and any(i.get('type')=='material' and (i['id']!=old_gear.get(i['uid'],{}).get('id') or i.get('qty',1)!=old_gear.get(i['uid'],{}).get('qty',1)) for i in equipment_rules.items(player)):
                    return self.reply(403,{'error':'Nguyên liệu phải nhận và tiêu hao qua server.'})
                gear=[i for i in equipment_rules.items(player) if i.get('slot')]
                if row:
                    if any(old_items.get(i['uid'])!=i['id'] for i in gear):return self.reply(403,{'error':'Trang bị phải nhận từ quái, ghép mảnh hoặc đổi cống hiến trên server.'})
                else:
                    starter=player.get('world',{}).get('equip',{})
                    valid_starter=lambda i:i['slot'] in ('daobao','chan','giay') and (i['id'].startswith('outfit-') or i['id'] in {f'{base}-class-{player["ap"]["w"]}' for base in ('vai-bao','chan-0','vai-giay')})
                    if any(i.get('type')=='material' for i in equipment_rules.items(player)):
                        return self.reply(403,{'error':'Nhân vật mới chưa có nguyên liệu cường hóa.'})
                    if len(gear)>3 or any(not valid_starter(i) or (starter.get(i['slot']) or {}).get('uid')!=i['uid'] for i in gear):return self.reply(403,{'error':'Nhân vật mới chỉ có ba món trang phục khởi đầu.'})
            if row:
                old=json.loads(row['player'])
                if old['ap']!=player['ap'] or old['nm']!=player['nm']: return self.reply(400,{'error':'Không thể đổi phái, giới tính hoặc đạo hiệu của nhân vật.'})
                if not user['gm']:
                    progression.normalize(old)
                    corrected=economy.enforce(db,uid,old,player,int(time.time())-row['updated_at'],equipment_rules.items(old),equipment_rules.items(player))
                cid=row['id']; rev=revision+1
                db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False,allow_nan=False),rev,int(time.time()),uid))
            else:
                if revision!=0: return self.reply(409,{'error':'Bản lưu không tồn tại.','conflict':True})
                cid=secrets.token_hex(16); rev=1
                db.execute('INSERT INTO characters VALUES(?,?,?,?,?)',(uid,cid,json.dumps(player,ensure_ascii=False,allow_nan=False),rev,int(time.time())))
        return self.reply(201,{'saved':True,'id':cid,'revision':rev,**({'corrected':corrected} if corrected else {})})

    def equipment(self,user,body=None):
        try:
            with DB_LOCK, connect() as db:
                db.execute('BEGIN IMMEDIATE')
                if body is not None and trade.locked(db,user['user_id']):raise ValueError('Mở khóa giao dịch trước khi dùng dịch vụ.')
                row=db.execute('SELECT player FROM characters WHERE user_id=?',(user['user_id'],)).fetchone()
                if not row:raise ValueError('Hãy tạo nhân vật trước.')
                result=(forging.action(db,user['user_id'],body,bool(user['gm'])) if body.get('action')=='enhance' else equipment_rules.action(db,user['user_id'],body)) if body is not None else {'shield':equipment_rules.shield_state(db,user['user_id'],json.loads(row['player']))}
            return self.reply(409 if result.get('conflict') else 200,result)
        except ValueError as error:return self.reply(409,{'error':str(error)})

    def community(self,user,body=None):
        try:
            with WORLD_LOCK, DB_LOCK, connect() as db:
                db.execute('BEGIN IMMEDIATE')
                if body is not None and trade.locked(db,user['user_id']):raise ValueError('Mở khóa giao dịch trước khi dùng dịch vụ.')
                result=community.action(db,user['user_id'],body,PEERS) if body is not None else community.snapshot(db,user['user_id'],PEERS)
                # Gộp dữ liệu giao dịch vào snapshot khi GET
                if body is None:
                    result={**result,**trade.snapshot(db,user['user_id'],PEERS)}
            return self.reply(200,result)
        except community.Conflict as error:return self.reply(409,{'error':str(error),'conflict':True})
        except ValueError as error:return self.reply(409,{'error':str(error)})

    def trade(self,user,body=None):
        try:
            with WORLD_LOCK, DB_LOCK, connect() as db:
                db.execute('BEGIN IMMEDIATE')
                result=trade.snapshot(db,user['user_id'],PEERS) if body is None else trade.action(db,user['user_id'],body,PEERS)
            return self.reply(200,result)
        except trade.Conflict as error:return self.reply(409,{'error':str(error),'conflict':True})
        except ValueError as error:return self.reply(409,{'error':str(error)})

    def duel(self,user,body=None):
        with WORLD_LOCK, DB_LOCK, connect() as db:
            db.execute('BEGIN IMMEDIATE')
            result=duels.snapshot(db,user['user_id'],PEERS) if body is None else duels.action(db,user['user_id'],body,PEERS,player_max_hp,player_attack)
        return self.reply(200,result)

    def adventure(self,user,body=None):
        try:
            with DB_LOCK, connect() as db:
                db.execute('BEGIN IMMEDIATE')
                if body is not None and trade.locked(db,user['user_id']):raise ValueError('Mở khóa giao dịch trước khi dùng dịch vụ.')
                row=db.execute('SELECT player FROM characters WHERE user_id=?',(user['user_id'],)).fetchone()
                if not row:raise ValueError('Hãy tạo nhân vật trước.')
                result=adventure.snapshot(db,user['user_id'],json.loads(row['player'])) if body is None else adventure.action(db,user['user_id'],body,bool(user['gm']))
            return self.reply(409 if result.get('conflict') else 200,result)
        except PermissionError as error:return self.reply(403,{'error':str(error)})
        except ValueError as error:return self.reply(409,{'error':str(error)})

    def expedition(self,user,body=None):
        with DB_LOCK, connect() as db:
            db.execute('BEGIN IMMEDIATE')
            if body is not None and trade.locked(db,user['user_id']):raise ValueError('Mở khóa giao dịch trước khi dùng dịch vụ.')
            result={'pending':expeditions.pending(db,user['user_id']),'drops':[dict(equipment_rules.TEMPLATES[r['item_id']],dropId=r['id']) for r in db.execute('SELECT id,item_id FROM expedition_drops WHERE user_id=? AND claimed_at IS NULL ORDER BY created_at,id LIMIT 30',(user['user_id'],)).fetchall()]} if body is None else expeditions.claim(db,user['user_id'],body)
        return self.reply(409 if result.get('conflict') else 200,result)

    def tower(self,user,body=None):
        try:
            with WORLD_LOCK,DB_LOCK,connect() as db:
                db.execute('BEGIN IMMEDIATE')
                uid=user['user_id']
                if body is not None and trade.locked(db,uid):raise ValueError('Mở khóa giao dịch trước.')
                result=tower.snapshot(db,uid) if body is None else tower.action(db,uid,body)
                if body is not None:
                    for key in list(ROOMS):
                        if key.startswith('tower:'+str(uid)+':'):ROOMS.pop(key,None)
            return self.reply(200,result)
        except ValueError as error:return self.reply(409,{'error':str(error)})

    def engagement(self,user,body=None):
        try:
            with DB_LOCK, connect() as db:
                db.execute('BEGIN IMMEDIATE')
                uid=user['user_id']
                if body is not None and trade.locked(db,uid):raise ValueError('Mở khóa giao dịch trước khi nhận thưởng.')
                row=db.execute('SELECT player FROM characters WHERE user_id=?',(uid,)).fetchone()
                if not row:raise ValueError('Hãy tạo nhân vật trước.')
                result=engagement.snapshot(db,uid,json.loads(row['player'])) if body is None else engagement.action(db,uid,body)
            if body is not None and body.get('action')=='title' and uid in PEERS:PEERS[uid]['title']=result['engagement']['title']
            return self.reply(409 if result.get('conflict') else 200,result)
        except ValueError as error:return self.reply(409,{'error':str(error)})

    def raid(self,user,body=None):
        try:
            with WORLD_LOCK, DB_LOCK, connect() as db:
                db.execute('BEGIN IMMEDIATE')
                uid=user['user_id']
                if body is None:result=raid.snapshot(db,uid,PEERS)
                elif body.get('action')=='start':result=raid.start(db,uid,PEERS,bool(user['gm']))
                elif body.get('action')=='abandon':raid.abandon(db,uid);result=raid.snapshot(db,uid,PEERS)
                else:raise ValueError('Thao tác không hợp lệ.')
            return self.reply(200,result)
        except ValueError as error:return self.reply(409,{'error':str(error)})

    def world(self,user,body):
        uid=user['user_id']; now=time.monotonic()
        with connect() as db: character=db.execute('SELECT player FROM characters WHERE user_id=?',(uid,)).fetchone()
        if not character: return self.reply(409,{'error':'Hãy tạo nhân vật trước.'})
        p=json.loads(character['player']); scene=body.get('map','hub')
        if scene not in MAPS: raise ValueError()
        if scene in overworld.MAPS and progression.level(p)<overworld.MAPS[scene]['entry']:
            return self.reply(403,{'error':'Chưa đủ cấp vào vùng săn này.'})
        if scene in expeditions.MAPS and progression.level(p)<expeditions.MAPS[scene]['level']:
            return self.reply(403,{'error':'Chưa đủ cấp vào bí cảnh này.'})
        x,y=body.get('x'),body.get('y')
        if any(type(v) not in (int,float) or not math.isfinite(v) or not 0<=v<=2000 for v in (x,y)): raise ValueError()
        with WORLD_LOCK:
            for key in list(PEERS):
                if now-PEERS[key]['seen']>15: PEERS.pop(key,None); EVENTS.pop(key,None)
            previous=PEERS.get(uid,{})
            with DB_LOCK, connect() as db:
                duel=duels.world_step(db,uid,body,PEERS)
            if duel:
                scene='duel';x,y=duel['x'],duel['y']
            elif scene=='duel':return self.reply(409,{'error':'Bạn chưa tham gia trận đấu hoặc khán đài.'})
            raid_run=None
            if scene=='raid':
                with DB_LOCK,connect() as db:raid_run=raid.run_for(db,uid,statuses=('active','cleared'))
                if not raid_run:return self.reply(409,{'error':'Ma Quật đã đóng. Hãy trở về thành.'})
                if not expeditions.inside(x,y):x,y=1000,1380
            tower_run=None
            if scene=='tower':
                with DB_LOCK,connect() as db:tower_run=tower.run(db,uid)
                if not tower_run or tower_run['status'] not in ('fighting','cleared','claimed'):return self.reply(409,{'error':'Tầng tháp đã kết thúc. Hãy trở về thành.'})
                if not (610<=x<=1390 and 790<=y<=1480) or abs(x-1000)/460+abs(y-1100)/300>=.98:x,y=1000,1380
            if scene in expeditions.MAPS and not expeditions.inside(x,y):x,y=1000,1380
            if scene in overworld.MAPS and not overworld.inside(x,y):x,y=1000,1770
            if scene=='worldboss' and abs(x-1000)/300+abs(y-1100)/150>=1:
                x,y=1000,1210
            if previous and now-previous['seen']<.12: return self.reply(429,{'error':'Cập nhật quá nhanh.'})
            stream=body.get('stream','legacy')
            if not isinstance(stream,str) or len(stream)>80:raise ValueError()
            if previous.get('map')==scene and previous.get('stream','legacy')==stream:
                delta=now-previous['seen']
                if math.hypot(x-previous['x'],y-previous['y'])>max(240,delta*400) and math.hypot(x-1000,y-1100)>150:
                    x,y=previous['x'],previous['y']
            with DB_LOCK, connect() as db:
                adventure.record_world(db,uid,scene,x,y,previous,bool(body.get('med')))
                engagement.touch(db,uid)
                if 'title' not in previous:previous['title']=engagement.title_of(db,uid)
            rank=0
            peer={**previous,'id':uid,'stream':stream,'name':p['nm'],'ap':{**p['ap'],'weaponRarity':(p.get('world',{}).get('equip',{}).get('vukhi') or {}).get('rarity','pham')},'r':p['r'],'stage':p['stage'],'map':scene,'trainingRealm':rank,'x':x,'y':y,'dir':max(0,min(2,int(body.get('dir',0)))),'f':-1 if body.get('f')==-1 else 1,'seen':now,'med':bool(body.get('med'))}
            equipment=p.get('world',{}).get('equip',{})
            peer['ap'].update({name:(equipment.get(slot) or {}).get('enhance',0) for name,slot in [('weaponEnhance','vukhi'),('backEnhance','phapbao'),('bodyEnhance','daobao')]})
            peer['ap'].update({name:(equipment.get(slot) or {}).get('id') for name,slot in [('backId','phapbao'),('formationId','phaptran'),('shieldId','ngoc'),('ringId','gioi'),('weaponId','vukhi'),('trailId','dichuyen'),('maskId','matna')]})
            peer['ap']['robeId']=(equipment.get('daobao') or {}).get('id')
            peer['ap']['realm']=int(p['r'])
            peer['level']=progression.level(p)
            if duel:peer['duelId']=duel['id']
            with connect() as shield_db:peer['ap']['shieldState']=equipment_rules.shield_state(shield_db,uid,p)
            ack_sustain=body.get('ackSustain',[])
            if not isinstance(ack_sustain,list) or len(ack_sustain)>100:raise ValueError()
            peer['sustain']=[event for event in peer.get('sustain',[]) if event['id'] not in ack_sustain]
            peer['pet']=next((pet for pet in p.get('world',{}).get('pets',[]) if pet['id']==p.get('world',{}).get('activePet')),None)
            if tower_run:peer['towerToken']=tower_run['token']
            if raid_run:peer['raidToken']=raid_run['token']
            else:peer.pop('raidToken',None)
            peer['attack']=player_attack(p);peer['maxHp']=player_max_hp(p);health=body.get('hp',p['hp']);peer['hp']=max(0,min(peer['maxHp'],health)) if type(health) in (int,float) and math.isfinite(health) else 0
            if duel and not duel['viewer']:peer['hp']=duel['hp']
            # Presentation only: height grants no speed exception or damage immunity.
            airborne=body.get('airborne',0)
            peer['airborne']=max(0,min(80,airborne)) if scene in ('sword','moon','thunder','mystic') and type(airborne) in (int,float) and math.isfinite(airborne) else 0
            emote=body.get('emote')
            if emote in ('wave','heart','ready') and now-previous.get('emoteAt',0)>2: peer['emote']=emote; peer['emoteAt']=now
            cast=body.get('cast')
            if isinstance(cast,dict) and type(cast.get('index')) is int and cast['index'] in range(4) and isinstance(cast.get('id'),str) and len(cast['id'])<64 and now-peer.get('castAt',0)>.3:
                if all(type(cast.get(k)) in (int,float) and math.isfinite(cast[k]) and 0<=cast[k]<=2000 for k in ('x','y')):
                    peer['cast']={k:cast[k] for k in ('id','index','x','y')};peer['castAt']=now
                    if cast['index']==1 and now-peer.get('evadeAt',-1000)>=EVASION_COOLDOWNS[p['ap']['w']]:
                        peer['evadeAt']=now;peer['evadeUntil']=now+.22
            peer['paused']=bool(body.get('paused'))
            register_skill_field(peer,body,now)
            PEERS[uid]=peer; key=room_for(peer)
            combat_hits=[]
            shared=scene in ('sword','moon','thunder','mystic','worldboss','tower','raid') or scene in expeditions.MAPS or scene in overworld.MAPS
            raid_hits={}
            mobs=[];fields=[]
            if shared:
                room=room_mobs(key); mobs=room['mobs']
                dt=min(.3,max(0,now-room['updated']));room['updated']=now
                members=[v for v in PEERS.values() if room_for(v)==key]
                fields=[dict(v['skillField'],owner=v['id']) for v in members if v.get('skillField',{}).get('until',0)>now and v['skillField']['room']==key]
                for mob in mobs:
                    update_mob_fields(mob,fields,now,dt)
                    tick_pet_effects(mob,now,key)
                    if scene=='worldboss':
                        encounter=mob['encounter'];community.tick_boss(mob,PEERS,field_attack_blocked(mob))
                        if encounter!=mob['encounter']:
                            with connect() as db:community.save_boss(db,mob)
                        continue
                    if not mob['dead']:
                        nearest=min((v for v in members if v.get('hp',1)>0 and not ((scene in expeditions.MAPS or scene=='raid') and expeditions.safe(v['x'],v['y'])) and not (scene in overworld.MAPS and overworld.safe(v['x'],v['y']))),key=lambda v:math.hypot(v['x']-mob['x'],v['y']-mob['y']),default=None)
                        tx,ty=mob['hx'],mob['hy']
                        if nearest and math.hypot(nearest['x']-mob['x'],nearest['y']-mob['y'])<190 and math.hypot(nearest['x']-mob['hx'],nearest['y']-mob['hy'])<110: tx,ty=nearest['x'],nearest['y']
                        distance=math.hypot(tx-mob['x'],ty-mob['y'])
                        if distance>20:
                            step=min(distance,45*dt*field_speed(mob));nx=mob['x']+(tx-mob['x'])/distance*step;ny=mob['y']+(ty-mob['y'])/distance*step
                            rx,ry=mob['campRX'],mob['campRY']; dx,dy=abs(nx-mob['campX'])/rx,abs(ny-mob['campY'])/ry; cut=min(.3,max(.14,24/ry))
                            if dx+dy<.96 and dx<1-cut-.025 and dy<1-cut-.025:mob['x'],mob['y']=nx,ny
                    if mob['dead'] and now>=mob['dead']: mob['hp']=mob['maxHp'];mob['dead']=0;mob['contributors']={};mob.pop('_fieldExposure',None);mob['fieldEffects']=[];mob.pop('_petEffects',None);mob['petEffects']=[]
                if scene=='raid':
                    raid_hits=raid.tick(room,mobs,members,now,lambda v:expeditions.safe(v['x'],v['y']))
                    for hit_uid,amount in raid_hits.items():
                        if hit_uid in PEERS:PEERS[hit_uid]['raidDamage']=PEERS[hit_uid].get('raidDamage',0)+amount
                acks=body.get('ack',[])
                if not isinstance(acks,list) or len(acks)>100: raise ValueError()
                EVENTS[uid]=[e for e in EVENTS[uid] if e['eventId'] not in acks]
                batch=body.get('batch')
                hits=[] if batch and batch==peer.get('lastBatch') else body.get('hits',[])
                peer['lastBatch']=batch
                if not isinstance(hits,list) or len(hits)>32: raise ValueError()
                hit_times=peer.get('hitTimes',[]); hit_times=[v for v in hit_times if now-v<1]
                for event in hits:
                    if len(hit_times)>=24: break
                    mob=next((m for m in mobs if m['id']==event.get('id')),None)
                    if not mob or mob['dead'] or math.hypot(mob['x']-x,mob['y']-y)>550: continue
                    power=event.get('power',0)
                    if type(power) not in (int,float) or not math.isfinite(power) or power<=0: continue
                    attack=player_attack(p)
                    before=mob['hp']
                    stats=equipment_rules.bonuses(p);attrs=p.get('world',{}).get('attrs',{});gear=p.get('world',{}).get('equip',{})
                    chance=min(.35,stats.get('crit',0)+attrs.get('nhanh',0)*.006+sum((i or {}).get('crit',0) for i in gear.values()))
                    critical=secrets.randbelow(10000)<round(chance*10000)
                    multiplier=1.6+stats.get('critDamage',0) if critical else 1
                    damage_mob(mob,min(power,attack*6)*multiplier*field_vulnerability(mob),uid,now,key);hit_times.append(now)
                    dealt=max(0,before-mob['hp'])
                    if dealt:combat_hits.append(dict(id=mob['id'],x=mob['x'],y=mob['y'],amount=dealt,critical=critical))
                    if dealt:
                        with connect() as db:adventure.add(db,uid,'attack')
                    if dealt and len(peer['sustain'])<100:peer['sustain'].append({'id':secrets.token_hex(12),'amount':dealt})
                peer['hitTimes']=hit_times
                register_pet_cast(peer,body,p,now,mobs)
            peers=[{k:v for k,v in other.items() if k in ('id','name','ap','r','stage','x','y','dir','f','med','airborne','emote','emoteAt','cast','pet','petCast','hp','maxHp','title')} | {'emote':other.get('emote') if now-other.get('emoteAt',0)<3 else None,'cast':other.get('cast') if now-other.get('castAt',0)<2 else None,'petCast':other.get('petCast') if now-other.get('petCastAt',0)<1 else None} for other in PEERS.values() if other['id']!=uid and other['map']==scene and scene!='arena']
            damage=0
            if scene=='duel':peers=[other for other in peers if PEERS[other['id']].get('duelId')==duel['id']]
            safe=scene in SECT_MAPS
            if scene in expeditions.MAPS or scene=='raid':safe=expeditions.safe(x,y)
            if scene in overworld.MAPS:safe=overworld.safe(x,y)
            if shared and scene!='worldboss' and not safe and now-peer.get('damageAt',0)>=1:
                for m in mobs:
                    if not m['dead'] and not field_attack_blocked(m) and math.hypot(m['x']-x,m['y']-y)<30:
                        m['attackSerial']=m.get('attackSerial',0)+1
                        damage+=max(1,round({0:4,1:9,3:6,4:10}[m['t']]*m['attackScale']*field_outgoing(m)-p['r']*1.5))
                if damage:peer['damageAt']=now
            if scene=='raid':damage+=peer.pop('raidDamage',0)
            public_fields=[{k:f[k] for k in ('id','sect','x','y')} | {'age':max(0,now-f['until']+FIELD_RULES[f['sect']]['duration']),'duration':FIELD_RULES[f['sect']]['duration'],'radius':FIELD_RULES[f['sect']]['radius']} for f in fields if f['owner']!=uid]
            boss_ack=body.get('ackBoss',[])
            if not isinstance(boss_ack,list) or len(boss_ack)>100:raise ValueError()
            peer['bossEvents']=[e for e in peer.get('bossEvents',[]) if e['id'] not in boss_ack] if scene=='worldboss' else []
            with connect() as db:
                party=community.membership(db,uid,'party');guild=community.membership(db,uid,'guild')
            messages=[m for m in CHAT if (m.get('channel','world')=='world' and m['map']==scene) or (m.get('channel')=='party' and party and m.get('group')==party['party_id']) or (m.get('channel')=='guild' and guild and m.get('group')==guild['guild_id'])]
            result={'shield':peer['ap']['shieldState'],'sustain':peer.get('sustain',[]),'boss':community.boss_view(mobs[0],uid,peer['attack']) if scene=='worldboss' and mobs else None,'bossEvents':peer.get('bossEvents',[]),'damage':damage,'players':peers,'fields':public_fields,'mobs':[public_mob(m) | {'dead':max(0,m['dead']-now) if m['dead'] else 0} for m in mobs], 'rewards':EVENTS[uid][:],'chat':messages,'shared':shared,'online':len(PEERS),'x':x,'y':y}
            result['duel']=duel
            result['raid']=raid.view(ROOMS.get(key,{}),now) if scene=='raid' else None
            result['events']=[dict(id=e['id'],name=e['name'],effect=e['effect'],mult=e['mult']) for e in engagement.active_events()]
            result['combatHits']=combat_hits
            with connect() as db:
                result['pendingDrops']=expeditions.pending(db,uid)
                result['adventureWallet']=adventure.wallet(db,uid)
        return self.reply(200,result)


if __name__=='__main__':
    init_db()
    host=os.environ.get('TIENLO_HOST','127.0.0.1'); port=int(os.environ.get('TIENLO_PORT','8080'))
    print(f'Tiên Lộ Online: http://{host}:{port}',flush=True)
    GameServer((host,port),partial(GameHandler,directory=str(ROOT))).serve_forever()
