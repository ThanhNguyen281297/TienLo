"""Tiên Lộ: SQLite accounts, sessions, characters and shared online maps. Python 3.11+."""
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
from datetime import datetime, timezone, timedelta
from functools import partial
from http.cookies import SimpleCookie
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import RLock
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
FARM_LAYOUT = json.loads((ROOT / 'MAP' / 'farm-layout.json').read_text(encoding='utf-8'))
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
MAPS = ('hub', 'sword', 'moon', 'thunder', 'mystic', 'valley', 'arena')


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
        CREATE TABLE IF NOT EXISTS arena_visits(user_id INTEGER NOT NULL REFERENCES users(id), day TEXT NOT NULL,
          used INTEGER NOT NULL, PRIMARY KEY(user_id, day));
        CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
        ''')


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
    for key, low, high in [('r',0,14),('stage',1,10),('gold',0,10**9),('xp',0,10**9),('hp',0,10**7),('mp',0,10**7),('x',0,2000),('y',0,2000)]:
        value = p.get(key)
        if type(value) not in (int,float) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError('Chỉ số nhân vật không hợp lệ: ' + key)
        if key in ('r','stage','gold') and value != int(value):
            raise ValueError('Chỉ số nguyên không hợp lệ.')
    world = p.get('world', {})
    if not isinstance(world, dict) or world.get('map', 'sword') not in MAPS or not isinstance(world.get('bag', []), list) or len(world.get('bag', [])) > 30:
        raise ValueError('Túi đồ hoặc bản đồ không hợp lệ.')
    attrs=world.get('attrs',{})
    if not isinstance(attrs,dict) or any(type(v) is not int or not 0<=v<=1000 for v in attrs.values()):
        raise ValueError('Thuộc tính không hợp lệ.')
    equipment=world.get('equip',{})
    if not isinstance(equipment,dict) or set(equipment)-{'vukhi','daobao','ngoc','gioi','giay','phapbao'}:
        raise ValueError('Ô trang bị không hợp lệ.')
    for item in world.get('bag',[])+[v for v in equipment.values() if v is not None]:
        if not isinstance(item,dict) or not isinstance(item.get('id'),str) or not isinstance(item.get('uid'),str):
            raise ValueError('Vật phẩm không hợp lệ.')
        if item.get('rarity') not in ('pham','huyen','linh','tien'):raise ValueError('Phẩm chất không hợp lệ.')
        for key in ('atk','hp','mp','armor','crit','dodge','skill','heal','mana','xp','price','req','qty'):
            if key in item and (type(item[key]) not in (int,float) or not math.isfinite(item[key]) or not 0<=item[key]<=10000):
                raise ValueError('Chỉ số vật phẩm không hợp lệ.')
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


def room_for(peer):
    return peer['map'] + ':' + str(peer.get('trainingRealm', 0))


def farm_portal_routes(scene):
    if scene not in FARM_LAYOUT['main']: return []
    main_rx,main_ry=FARM_LAYOUT['main'][scene]; size=FARM_LAYOUT['valley' if scene=='valley' else 'camp']
    result=[]
    for camp in FARM_LAYOUT['mines' if scene=='valley' else 'camps']:
        dx,dy=camp['x']-1000,camp['y']-1100
        t=.62/(abs(dx)/main_rx+abs(dy)/main_ry);u=.66/(abs(dx)/size['rx']+abs(dy)/size['ry'])
        result.append(((1000+dx*t,1100+dy*t),(camp['x']-dx*u,camp['y']-dy*u)))
    return result


def valid_farm_teleport(scene,previous,destination):
    for a,b in farm_portal_routes(scene):
        for start,end in ((a,b),(b,a)):
            if math.hypot(previous['x']-start[0],previous['y']-start[1])<=62 and math.dist(destination,end)<=3:return True
    return False


def room_mobs(key):
    if key not in ROOMS:
        scene, rank = key.split(':'); rank = int(rank)
        camps = FARM_LAYOUT['mines' if scene=='valley' else 'camps']
        size = FARM_LAYOUT['valley' if scene=='valley' else 'camp']
        base = {0:(20,10),1:(60,28),3:(40,18),4:(80,32)}
        mobs = []
        for ci,entry in enumerate(camps):
            cx,cy,t,camp = (entry[k] for k in ('x','y','t','id'))
            level=rank*10+([0,3,6,9][ci] if scene!='valley' else 0)
            hp=round(base[t][0]*(1+level*.11)*(1.15 if scene=='valley' else 1))
            for slot,offset in enumerate(FARM_LAYOUT['slots'][:size['perCamp']]):
                x=cx+offset['x']*size['rx']; y=cy+offset['y']*size['ry']
                mobs.append(dict(id=f'{key}:{ci}:{slot}',t=t,x=x,y=y,hx=x,hy=y,hp=hp,maxHp=hp,dead=0,cd=1,fr=0,fl=0,
                    worldMap=True,network=True,map=scene,camp=camp,campX=cx,campY=cy,campRX=size['rx'],campRY=size['ry'],attackScale=(1+level*.04)*(1.15 if scene=='valley' else 1),
                    xpReward=round(base[t][1]*(1+level*.08)*(1.2 if scene=='valley' else 1)),materialYield=(1+rank//3)*(2 if scene=='valley' else 1),contributors={}))
        ROOMS[key] = {'mobs':mobs,'updated':time.monotonic()}
    return ROOMS[key]


class GameServer(ThreadingHTTPServer):
    request_queue_size=128
    daemon_threads=True


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
            return db.execute('SELECT s.*, u.username FROM sessions s JOIN users u ON u.id=s.user_id WHERE token=? AND expires_at>?', (session_key(token),int(time.time()))).fetchone()

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
            if path=='/api/session': return self.reply(200,{'user':{'id':user['user_id'],'username':user['username']} if user else None,'csrf':user['csrf'] if user else None})
            if not user: return self.reply(401,{'error':'Vui lòng đăng nhập.'})
            if path=='/api/characters':
                with connect() as db: row=db.execute('SELECT * FROM characters WHERE user_id=?',(user['user_id'],)).fetchone()
                return self.reply(200,{'character':{'id':row['id'],'player':json.loads(row['player']),'revision':row['revision']} if row else None})
            if path=='/api/arena': return self.arena(user,False)
            if path=='/api/rankings':
                with connect() as db: rows=db.execute("SELECT json_extract(player,'$.nm') AS name, json_extract(player,'$.ap.w') AS sect, json_extract(player,'$.r') AS realm, json_extract(player,'$.stage') AS stage, COALESCE(json_extract(player,'$.world.kills'),0) AS kills FROM characters ORDER BY realm DESC,stage DESC,kills DESC LIMIT 50").fetchall()
                return self.reply(200,[dict(name=r['name'],sect=SECTS[r['sect']],realm=r['realm'],stage=r['stage'],kills=r['kills']) for r in rows])
            return self.reply(404,{'error':'API không tồn tại.'})
        requested=Path(self.translate_path(self.path))
        target=requested.resolve()
        relative=target.relative_to(ROOT) if target.is_relative_to(ROOT) else None
        if relative is None or (relative.parts and relative.parts[0] not in ('js','css','CHARACTER','MAP','MONTERS','NPC')) and relative.as_posix()!='index.html' and path!='/':
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
        if path=='/api/arena': return self.arena(user,True)
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
                CHAT.append({'id':secrets.token_hex(8),'map':peer['map'],'name':peer['name'],'text':text.strip(),'at':int(time.time())})
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
                with WORLD_LOCK:PEERS.pop(uid,None)
                token=secrets.token_urlsafe(32); csrf=secrets.token_urlsafe(24)
                # One active session prevents concurrent devices overwriting the same character.
                db.execute('DELETE FROM sessions WHERE user_id=? OR expires_at<=?',(uid,now))
                db.execute('INSERT INTO sessions VALUES(?,?,?,?)',(session_key(token),uid,csrf,now+604800))
            return self.reply(200,{'user':{'id':uid,'username':username},'csrf':csrf},self.cookie(token))
        finally: AUTH_WORK.release()

    def save_character(self,user,body):
        player=body.get('player'); valid_player(player)
        uid=user['user_id']; revision=body.get('revision',0)
        if type(revision) is not int: raise ValueError()
        with DB_LOCK, connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
            if row and row['revision']!=revision: return self.reply(409,{'error':'Nhân vật đã được cập nhật ở phiên khác. Tải lại để tiếp tục.','conflict':True})
            if row:
                old=json.loads(row['player'])
                if old['ap']!=player['ap'] or old['nm']!=player['nm']: return self.reply(400,{'error':'Không thể đổi phái, giới tính hoặc đạo hiệu của nhân vật.'})
                cid=row['id']; rev=revision+1
                db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False,allow_nan=False),rev,int(time.time()),uid))
            else:
                if revision!=0: return self.reply(409,{'error':'Bản lưu không tồn tại.','conflict':True})
                cid=secrets.token_hex(16); rev=1
                db.execute('INSERT INTO characters VALUES(?,?,?,?,?)',(uid,cid,json.dumps(player,ensure_ascii=False,allow_nan=False),rev,int(time.time())))
        return self.reply(201,{'saved':True,'id':cid,'revision':rev})

    def arena(self,user,consume):
        day=datetime.now(timezone(timedelta(hours=7))).date().isoformat(); uid=user['user_id']
        with DB_LOCK, connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT used FROM arena_visits WHERE user_id=? AND day=?',(uid,day)).fetchone(); used=row['used'] if row else 0
            if consume and used<2:
                used+=1; db.execute('INSERT INTO arena_visits VALUES(?,?,?) ON CONFLICT(user_id,day) DO UPDATE SET used=excluded.used',(uid,day,used))
            elif consume: return self.reply(429,{'error':'Hôm nay đã dùng hết 2 lượt đấu trường.','day':day,'used':used,'remaining':0})
        return self.reply(200,{'day':day,'used':used,'remaining':max(0,2-used)})

    def world(self,user,body):
        uid=user['user_id']; now=time.monotonic()
        with connect() as db: character=db.execute('SELECT player FROM characters WHERE user_id=?',(uid,)).fetchone()
        if not character: return self.reply(409,{'error':'Hãy tạo nhân vật trước.'})
        p=json.loads(character['player']); scene=body.get('map','hub')
        if scene not in MAPS: raise ValueError()
        x,y=body.get('x'),body.get('y')
        if any(type(v) not in (int,float) or not math.isfinite(v) or not 0<=v<=2000 for v in (x,y)): raise ValueError()
        with WORLD_LOCK:
            for key in list(PEERS):
                if now-PEERS[key]['seen']>15: PEERS.pop(key,None); EVENTS.pop(key,None)
            previous=PEERS.get(uid,{})
            if previous and now-previous['seen']<.12: return self.reply(429,{'error':'Cập nhật quá nhanh.'})
            stream=body.get('stream','legacy')
            if not isinstance(stream,str) or len(stream)>80:raise ValueError()
            if previous.get('map')==scene and previous.get('stream','legacy')==stream:
                delta=now-previous['seen']
                if math.hypot(x-previous['x'],y-previous['y'])>max(240,delta*400) and math.hypot(x-1000,y-1100)>150:
                    if now-previous.get('portalAt',0)>=.8 and valid_farm_teleport(scene,previous,(x,y)):
                        previous['portalAt']=now
                    else:x,y=previous['x'],previous['y']
            rank=max(0,min(int(p['r']),int(p.get('world',{}).get('trainingRealm',0))))
            peer={**previous,'id':uid,'stream':stream,'name':p['nm'],'ap':{**p['ap'],'weaponRarity':(p.get('world',{}).get('equip',{}).get('vukhi') or {}).get('rarity','pham')},'r':p['r'],'stage':p['stage'],'map':scene,'trainingRealm':rank,'x':x,'y':y,'dir':max(0,min(2,int(body.get('dir',0)))),'f':-1 if body.get('f')==-1 else 1,'seen':now,'med':bool(body.get('med'))}
            # Presentation only: height grants no speed exception or damage immunity.
            airborne=body.get('airborne',0)
            peer['airborne']=max(0,min(80,airborne)) if scene in ('sword','moon','thunder','mystic','valley') and type(airborne) in (int,float) and math.isfinite(airborne) else 0
            emote=body.get('emote')
            if emote in ('wave','heart','ready') and now-previous.get('emoteAt',0)>2: peer['emote']=emote; peer['emoteAt']=now
            cast=body.get('cast')
            if isinstance(cast,dict) and type(cast.get('index')) is int and cast['index'] in range(4) and isinstance(cast.get('id'),str) and len(cast['id'])<64 and now-peer.get('castAt',0)>.3:
                if all(type(cast.get(k)) in (int,float) and math.isfinite(cast[k]) and 0<=cast[k]<=2000 for k in ('x','y')):
                    peer['cast']={k:cast[k] for k in ('id','index','x','y')};peer['castAt']=now
            PEERS[uid]=peer; key=room_for(peer)
            shared=scene in ('sword','moon','thunder','mystic','valley')
            mobs=[]
            if shared:
                room=room_mobs(key); mobs=room['mobs']
                dt=min(.3,max(0,now-room['updated']));room['updated']=now
                members=[v for v in PEERS.values() if room_for(v)==key]
                for mob in mobs:
                    if not mob['dead']:
                        nearest=min(members,key=lambda v:math.hypot(v['x']-mob['x'],v['y']-mob['y']),default=None)
                        tx,ty=mob['hx'],mob['hy']
                        if nearest and math.hypot(nearest['x']-mob['x'],nearest['y']-mob['y'])<190 and math.hypot(nearest['x']-mob['hx'],nearest['y']-mob['hy'])<110: tx,ty=nearest['x'],nearest['y']
                        distance=math.hypot(tx-mob['x'],ty-mob['y'])
                        if distance>20:
                            step=min(distance,45*dt);nx=mob['x']+(tx-mob['x'])/distance*step;ny=mob['y']+(ty-mob['y'])/distance*step
                            rx,ry=mob['campRX'],mob['campRY']; dx,dy=abs(nx-mob['campX'])/rx,abs(ny-mob['campY'])/ry; cut=min(.3,max(.14,24/ry))
                            if dx+dy<.96 and dx<1-cut-.025 and dy<1-cut-.025:mob['x'],mob['y']=nx,ny
                    if mob['dead'] and now>=mob['dead']: mob['hp']=mob['maxHp'];mob['dead']=0;mob['contributors']={}
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
                    level=p['r']*10+p['stage']-1; attrs=p.get('world',{}).get('attrs',{}); equipment=p.get('world',{}).get('equip',{})
                    attack=8+level*1.3+max(0,min(1000,attrs.get('luc',0)))*2+sum(max(0,min(100,item.get('atk',0))) for item in equipment.values() if isinstance(item,dict))
                    damage=max(1,round(min(power,attack*6))); mob['hp']=max(0,mob['hp']-damage); mob['contributors'][uid]=now; hit_times.append(now)
                    if mob['hp']==0:
                        mob['dead']=now+8
                        for contributor,stamp in mob['contributors'].items():
                            other=PEERS.get(contributor)
                            if other and room_for(other)==key and now-stamp<15:
                                EVENTS[contributor].append({k:v for k,v in mob.items() if k not in ('contributors','dead')} | {'eventId':secrets.token_hex(12)})
                                EVENTS[contributor]=EVENTS[contributor][-100:]
                peer['hitTimes']=hit_times
            peers=[{k:v for k,v in other.items() if k in ('id','name','ap','r','stage','x','y','dir','f','med','airborne','emote','emoteAt','cast')} | {'emote':other.get('emote') if now-other.get('emoteAt',0)<3 else None,'cast':other.get('cast') if now-other.get('castAt',0)<2 else None} for other in PEERS.values() if other['id']!=uid and other['map']==scene and scene!='arena']
            damage=0
            shapes=FARM_LAYOUT['main']
            rx,ry=shapes.get(scene,(0,0));safe=bool(rx) and abs((x-1000)/(rx+5))+abs((y-1100)/(ry+5))<1
            if shared and not safe and now-peer.get('damageAt',0)>=1:
                for m in mobs:
                    if not m['dead'] and math.hypot(m['x']-x,m['y']-y)<30:
                        damage+=max(1,round({0:4,1:9,3:6,4:10}[m['t']]*m['attackScale']-p['r']*1.5))
                if damage:peer['damageAt']=now
            result={'damage':damage,'players':peers,'mobs':[{k:v for k,v in m.items() if k!='contributors'} | {'dead':max(0,m['dead']-now) if m['dead'] else 0} for m in mobs], 'rewards':EVENTS[uid][:],'chat':[m for m in CHAT if m['map']==scene],'shared':shared,'online':len(PEERS),'x':x,'y':y}
        return self.reply(200,result)


if __name__=='__main__':
    init_db()
    host=os.environ.get('TIENLO_HOST','127.0.0.1'); port=int(os.environ.get('TIENLO_PORT','8080'))
    print(f'Tiên Lộ Online: http://{host}:{port}',flush=True)
    GameServer((host,port),partial(GameHandler,directory=str(ROOT))).serve_forever()
