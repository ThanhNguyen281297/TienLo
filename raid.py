"""Huyết Trì Ma Quật: a 2-4 player party raid.

Flow: the party leader opens the raid from Thiên Vân Thành while every member is
online in the city. Members then enter the private room ('raid:<token>').
Phase 1 is a wave of elites; phase 2 is Huyết Trì Ma Long, which telegraphs
ground slams and enrages (with adds) under half health. Kills are certified
by server.damage_mob; chests are mailed to members present at the kill.
"""
import json
import math
import secrets
import time

import adventure
import community
import progression

RULE = dict(id='raid', name='Huyết Trì Ma Quật', level=20, minParty=2, maxParty=4, daily=3, duration=900,
            boss='RongXuong', species=['DungNham', 'TrauQuy', 'Soi', 'RongXuong'], color='#ff7a6b')
WAVE = (('DungNham', 'Dung Nham Ma Vệ'), ('TrauQuy', 'Huyết Trì Ngưu Ma'))
ADDS = ('Soi', 'Huyết Lang')
GEAR_TIERS = (10, 25, 45, 70)
SLAM_DELAY = 1.8


def init_db(db):
    db.execute('''CREATE TABLE IF NOT EXISTS raid_runs(token TEXT PRIMARY KEY, party_id TEXT NOT NULL, leader INTEGER NOT NULL,
        members TEXT NOT NULL, level INTEGER NOT NULL, status TEXT NOT NULL, created REAL NOT NULL, expires REAL NOT NULL)''')
    db.execute('CREATE INDEX IF NOT EXISTS raid_party ON raid_runs(party_id,status)')


def _expire(db, at):
    db.execute("UPDATE raid_runs SET status='failed' WHERE status='active' AND expires<?", (at,))


def run_for(db, uid, at=None, statuses=('active',)):
    """The run this user belongs to (active by default; the world also keeps a cleared room open until expiry)."""
    at = time.time() if at is None else at
    _expire(db, at)
    for row in db.execute(f"SELECT * FROM raid_runs WHERE status IN ({','.join('?' for _ in statuses)}) AND expires>=? ORDER BY created DESC", (*statuses, at)).fetchall():
        if uid in json.loads(row['members']):
            return dict(row, members=json.loads(row['members']))
    return None


def clears_today(db, uid):
    return int(adventure.count(db, uid, 'daily:' + adventure.day() + ':raidClears'))


def _names(db, ids):
    rows = db.execute(f"SELECT user_id,json_extract(player,'$.nm') nm FROM characters WHERE user_id IN ({','.join('?' for _ in ids)})", ids).fetchall()
    names = {r['user_id']: r['nm'] for r in rows}
    return [dict(id=i, name=names.get(i, '?')) for i in ids]


def snapshot(db, uid, peers, at=None):
    at = time.time() if at is None else at
    run = run_for(db, uid, at)
    party = community.group(db, uid, 'party')
    result = dict(rule=RULE, clearsToday=clears_today(db, uid), run=None, party=bool(party),
                  leader=bool(party) and party['leader'] == uid)
    run = run or run_for(db, uid, at, ('cleared',))
    if run:
        result['run'] = dict(token=run['token'], level=run['level'], members=_names(db, run['members']), status=run['status'],
                             expiresIn=max(0, round(run['expires'] - at)), leader=run['leader'])
    return result


def start(db, uid, peers, gm=False, at=None):
    at = time.time() if at is None else at
    party = community.group(db, uid, 'party')
    if not party and not gm:
        raise ValueError('Cần lập tổ đội 2–4 người để vào Ma Quật.')
    if party and party['leader'] != uid:
        raise ValueError('Chỉ đội trưởng mới mở được Ma Quật.')
    ids = [r['user_id'] for r in db.execute('SELECT user_id FROM party_members WHERE party_id=? ORDER BY joined,user_id', (party['id'],))] if party else [uid]
    if len(ids) < RULE['minParty'] and not gm:
        raise ValueError('Ma Quật cần ít nhất 2 thành viên.')
    if len(ids) > RULE['maxParty']:
        raise ValueError('Tổ đội tối đa 4 người.')
    if any(run_for(db, m, at) for m in ids):
        raise ValueError('Một thành viên đang ở trong Ma Quật khác.')
    now = time.monotonic()
    levels = []
    for member in ids:
        peer = peers.get(member)
        if not peer or now - peer['seen'] > 15 or peer.get('map') != 'hub':
            raise ValueError('Mọi thành viên phải online và đứng trong Thiên Vân Thành.')
        row = db.execute('SELECT player FROM characters WHERE user_id=?', (member,)).fetchone()
        level = progression.level(json.loads(row['player']))
        if level < RULE['level']:
            raise ValueError(f"Mọi thành viên cần cấp {RULE['level']} trở lên.")
        levels.append(level)
    token = secrets.token_hex(12)
    db.execute('INSERT INTO raid_runs VALUES(?,?,?,?,?,?,?,?)',
               (token, party['id'] if party else 'solo:' + str(uid), uid, json.dumps(ids), round(sum(levels) / len(levels)), 'active', at, at + RULE['duration']))
    return snapshot(db, uid, peers, at)


def abandon(db, uid, at=None):
    run = run_for(db, uid, at)
    if not run:
        raise ValueError('Không có Ma Quật đang mở.')
    if run['leader'] != uid:
        raise ValueError('Chỉ đội trưởng mới đóng được Ma Quật.')
    db.execute("UPDATE raid_runs SET status='failed' WHERE token=?", (run['token'],))


# ---------------------------------------------------------------- room
def _mob(token, index, skin, name, level, x, y, hp, attack, xp, boss=False):
    return dict(id=f'raid:{token}:{index}', t=4 if boss else [0, 1, 3, 4][index % 4], skin=skin, name=name, level=level,
                x=x, y=y, hx=x, hy=y, hp=hp, maxHp=hp, dead=0, cd=1, fr=0, fl=0, worldMap=True, network=True, map='raid',
                raid=token, boss=boss, elite=True, camp='raid', campX=1000, campY=1100, campRX=620, campRY=340,
                attackScale=attack, xpReward=xp, materialYield=2 if boss else 1, contributors={})


def room(db, token, at=None):
    row = db.execute("SELECT * FROM raid_runs WHERE token=?", (token,)).fetchone()
    if not row or row['status'] != 'active':
        return dict(mobs=[], updated=time.monotonic(), raid=None)
    level = row['level']
    mobs = []
    for i in range(8):
        skin, name = WAVE[i % 2]
        angle = i * math.tau / 8
        x, y = 1000 + math.cos(angle) * 230, 1020 + math.sin(angle) * 120
        mobs.append(_mob(token, i, skin, name, level, x, y, round((65 + level * 5) * 2.5),
                         (1 + level * .025) * 1.1, level * 8))
    return dict(mobs=mobs, updated=time.monotonic(),
                raid=dict(token=token, level=level, size=len(json.loads(row['members'])), phase=1, enraged=False,
                          slams=[], nextSlam=0, pending={}, cleared=False, serial=8))


def _alive(mob):
    return not mob['dead'] and mob['hp'] > 0


def tick(state, mobs, members, now, safe):
    """Advance phases and boss slams. Returns {uid: damage} for players hit this tick."""
    raid = state.get('raid')
    if not raid or raid['cleared']:
        return {}
    level = raid['level']
    if raid['phase'] == 1 and not any(_alive(m) for m in mobs):
        raid['phase'] = 2
        hp = round((65 + level * 5) * 16 * max(2, raid['size']))
        mobs.append(_mob(raid['token'], raid['serial'], RULE['boss'], 'Huyết Trì Ma Long', level + 5,
                         1000, 960, hp, (1 + level * .025) * 1.6, level * 40, boss=True))
        raid['serial'] += 1
        raid['nextSlam'] = now + 4
    boss = next((m for m in mobs if m.get('boss')), None)
    if raid['phase'] == 2 and boss and _alive(boss) and not raid['enraged'] and boss['hp'] <= boss['maxHp'] / 2:
        raid['enraged'] = True
        boss['attackScale'] *= 1.3
        for n in range(4):
            angle = n * math.tau / 4 + .4
            mobs.append(_mob(raid['token'], raid['serial'], ADDS[0], ADDS[1], level,
                             boss['x'] + math.cos(angle) * 140, boss['y'] + math.sin(angle) * 80,
                             round((65 + level * 5) * 1.5), (1 + level * .025), level * 5))
            raid['serial'] += 1
    hits = {}
    if boss and _alive(boss):
        targets = [v for v in members if v.get('hp', 1) > 0 and not safe(v)]
        if targets and now >= raid['nextSlam']:
            target = targets[secrets.randbelow(len(targets))]
            radius = 120 if raid['enraged'] else 90
            raid['slams'].append(dict(id=secrets.token_hex(6), x=target['x'], y=target['y'], r=radius, at=now + SLAM_DELAY))
            raid['nextSlam'] = now + (5 if raid['enraged'] else 7)
        damage = round(14 * (1 + level * .04) * (1.3 if raid['enraged'] else 1))
        for slam in [s for s in raid['slams'] if s['at'] <= now]:
            for v in members:
                if v.get('hp', 1) > 0 and math.hypot(v['x'] - slam['x'], (v['y'] - slam['y']) * 1.6) <= slam['r'] and now >= v.get('evadeUntil', 0):
                    hits[v['id']] = hits.get(v['id'], 0) + damage
        raid['slams'] = [s for s in raid['slams'] if s['at'] > now]
    else:
        raid['slams'] = []
    return hits


def view(state, now):
    raid = state.get('raid')
    if not raid:
        return None
    return dict(phase=raid['phase'], enraged=raid['enraged'], cleared=raid['cleared'],
                slams=[dict(id=s['id'], x=s['x'], y=s['y'], r=s['r'], remain=round(max(0, s['at'] - now), 2), total=SLAM_DELAY) for s in raid['slams']])


def chest(level, cls):
    reward = dict(gold=400 + level * 20, essence=40, fragments=8 + level // 5, items={'cuong-hoa-thach': 3})
    if level >= 30:
        reward['items']['tinh-luyen-thach'] = 1
    if secrets.randbelow(100) < 35:
        tier = max(t for t in GEAR_TIERS if t <= max(10, level))
        slot = ('daobao', 'chan', 'giay')[secrets.randbelow(3)]
        reward['gear'] = [f'exp-{tier}-{slot}-class-{cls}' if tier > 10 else f'train-10-{slot}-class-{cls}']
    return reward


def on_kill(db, state, mob, present):
    """Called once when a raid mob dies. `present` = member ids in the room right now."""
    raid = state.get('raid')
    if not raid or not mob.get('boss') or raid['cleared']:
        return []
    raid['cleared'] = True
    run = db.execute('SELECT * FROM raid_runs WHERE token=?', (raid['token'],)).fetchone()
    if not run or run['status'] != 'active':
        return []
    db.execute("UPDATE raid_runs SET status='cleared' WHERE token=?", (raid['token'],))
    rewarded = []
    for uid in json.loads(run['members']):
        if uid not in present:
            continue
        adventure.add(db, uid, 'raidClears')
        if clears_today(db, uid) >= RULE['daily']:
            continue
        adventure.add(db, uid, 'daily:' + adventure.day() + ':raidClears')
        row = db.execute('SELECT player FROM characters WHERE user_id=?', (uid,)).fetchone()
        cls = json.loads(row['player'])['ap']['w'] if row else 0
        __import__('engagement').mail(db, uid, 'Rương Huyết Trì Ma Quật', chest(raid['level'], cls), f"raid:{raid['token']}:{uid}")
        rewarded.append(uid)
    return rewarded
