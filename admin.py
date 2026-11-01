"""Tiên Lộ admin panel (GM only).

Runs inside the game server process on its own port so it sees the live world
(online players) and shares the database locks. By default it listens on
127.0.0.1:19999; Nginx publishes it over HTTPS on port 9999 (deploy/nginx.conf).

Sign-in uses an existing game account that has GM rights (deploy/set-gm.py); no
separate password exists. Sessions live in memory (12 h), every write needs the
session's CSRF token, and every change is written to admin_log.

What a GM can do:
- see who is online (name, sect, level, realm, map, HP) and server totals;
- search players and open a character sheet (currencies, bag, equipment, shards, mail);
- mail rewards to one player, everyone online or every character: Linh Thạch,
  Linh Nguyên, EXP, Linh Quang, typed shards, materials, gear and pets;
- edit a character directly: level, realm/tầng, Linh Thạch, Linh Nguyên, đạo hạnh,
  Đột Phá Đan, Thăng Vị Đan, Hộ Kiếp Phù, Linh Quang and shards;
- grant/revoke GM, and post a system message to every chat.
"""
import hmac
import json
import os
import re
import secrets
import threading
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import engagement
import equipment
import pets
import premium
import progression
import shards

ROOT = Path(__file__).resolve().parent
SESSIONS = {}                       # token -> dict(uid, username, csrf, expires)
SESSION_TTL = 12 * 3600
LOGIN_LIMIT = defaultdict(deque)
CTX = {}                            # filled by start(): PEERS, CHAT, ANNOUNCE, DB_LOCK, WORLD_LOCK, connect, password_hash, SECTS
REALMS = re.search(r"const R=\[([^\]]*)\]", (ROOT / 'js/01-core-game.js').read_text(encoding='utf-8')).group(1).replace("'", '').split(',')
LIMITS = dict(gold=10 ** 9, essence=10 ** 8, xp=10 ** 9, lq=10 ** 6, shard=99999, item=9999)
EDIT_FIELDS = {  # key -> (where, min, max)
    'level': ('p', 1, progression.MAX_LEVEL), 'r': ('p', 0, len(REALMS) - 1), 'stage': ('p', 1, 10),
    'gold': ('p', 0, LIMITS['gold']), 'xp': ('p', 0, LIMITS['xp']),
    'essence': ('w', 0, LIMITS['essence']), 'breakthroughPills': ('w', 0, 9999), 'thangViDan': ('w', 0, 9999), 'tribCharms': ('w', 0, 99),
}


def init_db(db):
    db.execute('CREATE TABLE IF NOT EXISTS admin_log(id INTEGER PRIMARY KEY AUTOINCREMENT,at REAL NOT NULL,admin TEXT NOT NULL,action TEXT NOT NULL,target TEXT,detail TEXT)')


def log(db, admin, action, target, detail):
    db.execute('INSERT INTO admin_log(at,admin,action,target,detail) VALUES(?,?,?,?,?)',
               (time.time(), admin, action, str(target)[:200], json.dumps(detail, ensure_ascii=False)[:4000]))


def online(now=None):
    now = time.monotonic() if now is None else now
    out = []
    for uid, p in list(CTX['PEERS'].items()):
        if now - p.get('seen', -1000) < 15:
            out.append(dict(id=uid, name=p.get('name'), sect=CTX['SECTS'][p['ap']['w']] if p.get('ap') else '', level=p.get('level'),
                            realm=f"{REALMS[int(p.get('r', 0))]} {p.get('stage', 1)}", map=p.get('map'), hp=round(p.get('hp', 0)),
                            maxHp=round(p.get('maxHp', 0)), auto=bool(p.get('auto', True))))
    return sorted(out, key=lambda r: -(r['level'] or 0))


def catalog():
    gear = [dict(id=k, name=t.get('name', k), slot=t.get('slot', 'material'), rarity=t.get('rarity', ''), req=t.get('req', 0))
            for k, t in equipment.TEMPLATES.items() if t.get('slot') != 'linhthu']
    return dict(gear=sorted(gear, key=lambda g: (g['slot'], g['req'], g['name'])), slots=equipment.RULES.get('slots', {}),
                pets=[dict(id=p['id'], name=p['name'], rarity=p['rarity']) for p in pets.PETS],
                shards={k: v['name'] for k, v in shards.KINDS.items()}, realms=REALMS, sects=list(CTX['SECTS']))


def player_row(db, uid):
    row = db.execute("SELECT u.id,u.username,u.gm,u.created_at,c.player,c.revision,c.updated_at FROM users u LEFT JOIN characters c ON c.user_id=u.id WHERE u.id=?", (uid,)).fetchone()
    if not row:
        raise ValueError('Không tìm thấy tài khoản.')
    return row


def summary(row):
    p = json.loads(row['player']) if row['player'] else None
    base = dict(id=row['id'], username=row['username'], gm=bool(row['gm']), created=row['created_at'], online=row['id'] in {o['id'] for o in online()})
    if not p:
        return dict(base, character=None)
    w = p.get('world', {})
    return dict(base, character=dict(name=p.get('nm'), sect=CTX['SECTS'][p['ap']['w']], gender=p['ap'].get('gender'), level=p.get('level'),
                                     r=p.get('r'), stage=p.get('stage'), realm=f"{REALMS[int(p.get('r', 0))]} {p.get('stage', 1)}", gold=p.get('gold', 0),
                                     xp=p.get('xp', 0), essence=w.get('essence', 0), breakthroughPills=w.get('breakthroughPills', 0),
                                     thangViDan=w.get('thangViDan', 0), tribCharms=w.get('tribCharms', 0), map=w.get('map'),
                                     updated=row['updated_at'], revision=row['revision']))


def detail(db, uid):
    row = player_row(db, uid)
    out = summary(row)
    if row['player']:
        p = json.loads(row['player'])
        w = p.get('world', {})
        out['bag'] = [dict(name=i.get('name', i.get('id')), id=i.get('id'), slot=i.get('slot', i.get('type', '')), qty=i.get('qty', 1), enhance=i.get('enhance', 0), rarity=i.get('rarity', '')) for i in w.get('bag', [])]
        out['equip'] = {slot: dict(name=i.get('name'), id=i.get('id'), enhance=i.get('enhance', 0), rarity=i.get('rarity', '')) for slot, i in (w.get('equip') or {}).items() if isinstance(i, dict)}
        out['capacity'] = equipment.capacity(w)
        out['pets'] = list(pets.data(p)['owned'].keys())
    out['shards'] = shards.wallet(db, uid)
    out['lq'] = premium.balance(db, uid)['lq']
    g = db.execute('SELECT g.name,m.contribution FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.user_id=?', (uid,)).fetchone()
    out['guild'] = dict(g) if g else None
    out['mail'] = [dict(title=r['title'], claimed=bool(r['claimed']), at=r['created']) for r in db.execute('SELECT title,claimed,created FROM community_rewards WHERE user_id=? ORDER BY created DESC LIMIT 15', (uid,))]
    return out


def clean_reward(r):
    """Validate a mail payload built in the UI."""
    if not isinstance(r, dict):
        raise ValueError('Phần thưởng không hợp lệ.')
    out = {}
    for key in ('gold', 'essence', 'xp', 'lq'):
        v = r.get(key, 0)
        if v in (None, ''):
            continue
        if type(v) is not int or not 0 <= v <= LIMITS[key]:
            raise ValueError(f'{key} phải là số nguyên 0–{LIMITS[key]}.')
        if v:
            out[key] = v
    sh = {}
    for k, v in (r.get('shards') or {}).items():
        if k not in shards.KINDS or type(v) is not int or not 0 <= v <= LIMITS['shard']:
            raise ValueError('Mảnh không hợp lệ.')
        if v:
            sh[k] = v
    if sh:
        out['shards'] = sh
    items, gear = {}, []
    for entry in r.get('gear') or []:
        iid, qty = (entry.get('id'), entry.get('qty', 1)) if isinstance(entry, dict) else (entry, 1)
        t = equipment.TEMPLATES.get(iid)
        if not t or t.get('slot') == 'linhthu' or type(qty) is not int or not 1 <= qty <= (LIMITS['item'] if t.get('type') == 'material' else 20):
            raise ValueError(f'Vật phẩm không hợp lệ: {iid}')
        if t.get('type') == 'material':
            items[iid] = items.get(iid, 0) + qty
        else:
            gear += [iid] * qty
    if items:
        out['items'] = items
    if gear:
        out['gear'] = gear
    if r.get('pet'):
        if r['pet'] not in pets.BY_ID:
            raise ValueError('Linh thú không hợp lệ.')
        out['pet'] = r['pet']
    if not out:
        raise ValueError('Thư chưa có phần thưởng nào.')
    return out


def targets(db, spec):
    if spec == 'online':
        return [o['id'] for o in online()]
    if spec == 'all':
        return [r[0] for r in db.execute('SELECT user_id FROM characters')]
    if isinstance(spec, list) and spec and all(type(x) is int for x in spec) and len(spec) <= 500:
        return [x for x in spec if db.execute('SELECT 1 FROM characters WHERE user_id=?', (x,)).fetchone()]
    raise ValueError('Chọn người nhận.')


def send_mail(db, admin, body):
    title = str(body.get('title') or '').strip()[:80] or 'Quà từ Ban quản trị'
    reward = clean_reward(body.get('reward'))
    uids = targets(db, body.get('targets'))
    if not uids:
        raise ValueError('Không có người nhận.')
    stamp = secrets.token_hex(6)
    for uid in uids:
        engagement.mail(db, uid, title, reward, f'admin:{stamp}:{uid}')
    log(db, admin, 'mail', body.get('targets') if not isinstance(body.get('targets'), list) else ','.join(map(str, uids[:50])), dict(title=title, reward=reward, count=len(uids)))
    return dict(ok=True, sent=len(uids), message=f'Đã gửi thư cho {len(uids)} nhân vật.')


def edit(db, admin, body):
    uid = body.get('id')
    if type(uid) is not int:
        raise ValueError('Thiếu nhân vật.')
    row = player_row(db, uid)
    if not row['player']:
        raise ValueError('Tài khoản chưa tạo nhân vật.')
    p = json.loads(row['player'])
    w = p.setdefault('world', {})
    changes = {}
    for mode in ('set', 'add'):
        for key, value in (body.get(mode) or {}).items():
            if key not in EDIT_FIELDS:
                raise ValueError(f'Không sửa được trường {key}.')
            if value in (None, ''):
                continue
            if type(value) is not int:
                raise ValueError(f'{key} phải là số nguyên.')
            where, lo, hi = EDIT_FIELDS[key]
            box = p if where == 'p' else w
            new = value if mode == 'set' else int(box.get(key, 0) or 0) + value
            new = max(lo, min(hi, new))
            if key == 'level' and new != p.get('level'):
                p['levelXp'] = 0
            box[key] = new
            changes[key] = new
    if 'level' in changes:
        progression.normalize(p)
    lq = body.get('lq')
    if lq not in (None, '', 0):
        if type(lq) is not int or abs(lq) > LIMITS['lq']:
            raise ValueError('Linh Quang không hợp lệ.')
        if lq > 0:
            premium.credit(db, uid, lq, 'admin')
        else:
            premium.debit(db, uid, -lq, 'admin')
        changes['lq'] = lq
    for kind, qty in (body.get('shards') or {}).items():
        if kind not in shards.KINDS or type(qty) is not int or abs(qty) > LIMITS['shard']:
            raise ValueError('Mảnh không hợp lệ.')
        if qty:
            have = shards.wallet(db, uid).get(kind, 0)
            db.execute('INSERT INTO shard_wallet VALUES(?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET qty=excluded.qty', (uid, kind, max(0, min(LIMITS['shard'], have + qty))))
            changes['shard:' + kind] = qty
    if not changes:
        raise ValueError('Chưa có thay đổi nào.')
    # Bump the revision: an online client gets a conflict on its next save and reloads the server copy.
    db.execute('UPDATE characters SET player=?,revision=revision+1,updated_at=? WHERE user_id=?', (json.dumps(p, ensure_ascii=False), int(time.time()), uid))
    log(db, admin, 'edit', uid, changes)
    return dict(ok=True, player=detail(db, uid), message='Đã cập nhật nhân vật' + (' (người chơi đang online sẽ tự tải lại).' if summary(row)['online'] else '.'))


def set_gm(db, admin, body):
    uid, gm = body.get('id'), body.get('gm')
    if type(uid) is not int or type(gm) is not bool:
        raise ValueError('Yêu cầu không hợp lệ.')
    if not gm and uid == admin_uid(admin, db):
        raise ValueError('Không thể tự gỡ quyền GM của mình.')
    if db.execute('UPDATE users SET gm=? WHERE id=?', (int(gm), uid)).rowcount != 1:
        raise ValueError('Không tìm thấy tài khoản.')
    log(db, admin, 'gm', uid, dict(gm=gm))
    return dict(ok=True, message=('Đã cấp' if gm else 'Đã gỡ') + ' quyền GM.')


def admin_uid(name, db):
    row = db.execute('SELECT id FROM users WHERE username=?', (name,)).fetchone()
    return row[0] if row else None


def broadcast(admin, body):
    text = str(body.get('text') or '').strip()
    if not 1 <= len(text) <= 200:
        raise ValueError('Thông báo 1–200 ký tự.')
    secs = body.get('seconds', 10)
    if type(secs) is not int or not 3 <= secs <= 60:
        raise ValueError('Thời gian hiển thị 3–60 giây.')
    now = time.time()
    with CTX['WORLD_LOCK']:
        # Shown as a banner in the middle of every online player's screen (not in chat).
        # Kept for 2 minutes so players who are loading in still see it once.
        CTX['ANNOUNCE'].append({'id': secrets.token_hex(8), 'text': text, 'seconds': secs, 'at': now, 'until': now + 120})
    with CTX['connect']() as db:
        log(db, admin, 'broadcast', '*', dict(text=text, seconds=secs))
    return dict(ok=True, message=f'Đã phát thông báo giữa màn hình cho {len(online())} người đang online.')


class AdminHandler(BaseHTTPRequestHandler):
    server_version = 'TienLoAdmin'

    def log_message(self, *args):
        pass

    def reply(self, code, data, headers=None):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def ip(self):
        ip = self.client_address[0]
        return self.headers.get('X-Real-IP', ip)[:64] if ip in ('127.0.0.1', '::1') else ip

    def session(self):
        raw = self.headers.get('Cookie', '')
        token = next((c.split('=', 1)[1] for c in raw.split('; ') if c.startswith('tienlo_admin=')), None)
        s = SESSIONS.get(token) if token else None
        if not s or s['expires'] < time.time():
            return None, None
        with CTX['connect']() as db:
            row = db.execute('SELECT gm FROM users WHERE id=?', (s['uid'],)).fetchone()
        if not row or not row['gm']:
            SESSIONS.pop(token, None)
            return None, None
        return token, s

    def body(self):
        n = int(self.headers.get('Content-Length', '0') or 0)
        if n > 200_000:
            raise ValueError('Yêu cầu quá lớn.')
        return json.loads(self.rfile.read(n) or b'{}')

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ('/', '/index.html'):
            html = (ROOT / 'deploy/admin.html').read_bytes()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Frame-Options', 'DENY')
            self.send_header('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:")
            self.send_header('Content-Length', str(len(html)))
            self.end_headers()
            self.wfile.write(html)
            return
        _, s = self.session()
        if path == '/api/me':
            return self.reply(200, dict(user=s and dict(username=s['username'], csrf=s['csrf'])))
        if not s:
            return self.reply(401, dict(error='Hãy đăng nhập bằng tài khoản GM.'))
        q = parse_qs(urlsplit(self.path).query)
        try:
            with CTX['DB_LOCK'], CTX['connect']() as db:
                if path == '/api/overview':
                    count = lambda sql: db.execute(sql).fetchone()[0]
                    return self.reply(200, dict(online=online(), users=count('SELECT COUNT(*) FROM users'), characters=count('SELECT COUNT(*) FROM characters'),
                                                guilds=count('SELECT COUNT(*) FROM guilds'), gms=count('SELECT COUNT(*) FROM users WHERE gm=1'),
                                                log=[dict(r) for r in db.execute('SELECT at,admin,action,target,detail FROM admin_log ORDER BY id DESC LIMIT 30')]))
                if path == '/api/catalog':
                    return self.reply(200, catalog())
                if path == '/api/players':
                    term = (q.get('q', [''])[0] or '').strip()[:40]
                    like = f'%{term}%'
                    rows = db.execute("SELECT u.id,u.username,u.gm,u.created_at,c.player,c.revision,c.updated_at FROM users u LEFT JOIN characters c ON c.user_id=u.id "
                                      "WHERE ?='' OR u.username LIKE ? OR json_extract(c.player,'$.nm') LIKE ? OR CAST(u.id AS TEXT)=? ORDER BY c.updated_at DESC LIMIT 60",
                                      (term, like, like, term)).fetchall()
                    return self.reply(200, dict(players=[summary(r) for r in rows]))
                if path == '/api/player':
                    return self.reply(200, detail(db, int(q.get('id', ['0'])[0])))
        except (ValueError, KeyError) as e:
            return self.reply(409, dict(error=str(e)))
        return self.reply(404, dict(error='Không có API này.'))

    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            body = self.body()
        except (ValueError, json.JSONDecodeError):
            return self.reply(400, dict(error='Dữ liệu không hợp lệ.'))
        if path == '/api/login':
            return self.login(body)
        token, s = self.session()
        if not s:
            return self.reply(401, dict(error='Hãy đăng nhập bằng tài khoản GM.'))
        if not hmac.compare_digest(str(self.headers.get('X-Admin-Token', '')), s['csrf']):
            return self.reply(403, dict(error='Phiên quản trị không hợp lệ. Tải lại trang.'))
        if path == '/api/logout':
            SESSIONS.pop(token, None)
            return self.reply(200, dict(ok=True), {'Set-Cookie': 'tienlo_admin=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict'})
        try:
            if path == '/api/broadcast':
                return self.reply(200, broadcast(s['username'], body))
            with CTX['DB_LOCK'], CTX['connect']() as db:
                db.execute('BEGIN IMMEDIATE')
                if path == '/api/mail':
                    return self.reply(200, send_mail(db, s['username'], body))
                if path == '/api/edit':
                    return self.reply(200, edit(db, s['username'], body))
                if path == '/api/gm':
                    return self.reply(200, set_gm(db, s['username'], body))
        except (ValueError, KeyError) as e:
            return self.reply(409, dict(error=str(e)))
        return self.reply(404, dict(error='Không có API này.'))

    def login(self, body):
        username, password = body.get('username', ''), body.get('password', '')
        if not isinstance(username, str) or not isinstance(password, str) or not re.fullmatch(r'[a-zA-Z0-9_]{3,24}', username) or not 10 <= len(password) <= 128:
            return self.reply(400, dict(error='Tên hoặc mật khẩu không hợp lệ.'))
        now = time.time()
        bucket = LOGIN_LIMIT[self.ip()]
        while bucket and bucket[0] < now - 600:
            bucket.popleft()
        if len(bucket) >= 8:
            return self.reply(429, dict(error='Thử sai quá nhiều lần. Đợi 10 phút.'))
        bucket.append(now)
        with CTX['connect']() as db:
            row = db.execute('SELECT * FROM users WHERE username=?', (username.lower(),)).fetchone()
            stored = row['password'] if row else None
            trial = CTX['password_hash'](password, stored.split(':')[0] if stored else '0' * 32)
            if not stored or not hmac.compare_digest(trial, stored):
                return self.reply(401, dict(error='Sai tên đăng nhập hoặc mật khẩu.'))
            if not row['gm']:
                return self.reply(403, dict(error='Tài khoản này không có quyền GM.'))
            log(db, row['username'], 'login', self.ip(), {})
        for t, s in list(SESSIONS.items()):
            if s['expires'] < now:
                SESSIONS.pop(t, None)
        token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(24)
        SESSIONS[token] = dict(uid=row['id'], username=row['username'], csrf=csrf, expires=now + SESSION_TTL)
        secure = '; Secure' if self.headers.get('X-Forwarded-Proto') == 'https' else ''
        return self.reply(200, dict(user=dict(username=row['username'], csrf=csrf)),
                          {'Set-Cookie': f'tienlo_admin={token}; Path=/; Max-Age={SESSION_TTL}; HttpOnly; SameSite=Strict{secure}'})


class AdminServer(ThreadingHTTPServer):
    daemon_threads = True


def start(**context):
    """Start the admin panel in a background thread (called from server.py)."""
    CTX.update(context)
    with CTX['connect']() as db:
        init_db(db)
    host = os.environ.get('TIENLO_ADMIN_HOST', '127.0.0.1')
    port = int(os.environ.get('TIENLO_ADMIN_PORT', '19999'))
    if port <= 0:
        return None
    httpd = AdminServer((host, port), AdminHandler)
    threading.Thread(target=httpd.serve_forever, name='admin', daemon=True).start()
    print(f'Tiên Lộ admin: http://{host}:{port}', flush=True)
    return httpd
