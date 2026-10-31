"""Chính – Tà Chi Chiến: a timed faction battleground (Tống Kim style).

Windows (Vietnam time): 12:30–12:45 and 21:00–21:15 daily; a GM can open one.
Players join from Thiên Vân Thành and are sorted into the smaller faction.
Score: a kill gives the killer 10 and the faction 5; each held banner gives its
faction 1 point every 5 seconds and the players standing on it a little personal
score. Bases are safe for their own faction. At the end everyone with some score
gets a chest by mail; the winning faction and the top three get more.
State is in memory (one server process); results go to the mailbox and counters.
"""
import math
import time
from datetime import timedelta

import adventure
import engagement
import progression
import pvp

WINDOWS = ((12, 30, 15), (21, 0, 15))          # (hour, minute, minutes) in GMT+7
JOIN_CLOSES = 180                               # seconds before the end
RESPAWN = 6
CAPTURE_TIME = 6.0
CENTER = (1000, 1100)
RX, RY = 760, 460
TEAMS = {'chinh': dict(name='Chính Phái', base=(430, 1100), color='#6fb6ff'), 'ta': dict(name='Tà Phái', base=(1570, 1100), color='#ff6b5a')}
BASE_RADIUS = 95
FLAGS = (dict(id='bac', name='Cờ Bắc', x=1000, y=830), dict(id='trung', name='Cờ Trung', x=1000, y=1100), dict(id='nam', name='Cờ Nam', x=1000, y=1370))
FLAG_RADIUS = 80

STATE = {'battle': None, 'last': None}


def window(at=None):
    """(start, end) epoch seconds of the active window, else None."""
    stamp = time.time() if at is None else at
    moment = engagement.now_vn(stamp)
    for hour, minute, minutes in WINDOWS:
        start = moment.replace(hour=hour, minute=minute, second=0, microsecond=0)
        end = start + timedelta(minutes=minutes)
        if start.timestamp() <= stamp < end.timestamp():
            return start.timestamp(), end.timestamp()
    return None


def next_window(at=None):
    stamp = time.time() if at is None else at
    moment = engagement.now_vn(stamp)
    starts = []
    for day in (0, 1):
        for hour, minute, _ in WINDOWS:
            start = (moment + timedelta(days=day)).replace(hour=hour, minute=minute, second=0, microsecond=0).timestamp()
            if start > stamp:
                starts.append(start)
    return min(starts)


def inside(x, y):
    return ((x - CENTER[0]) / RX) ** 2 + ((y - CENTER[1]) / RY) ** 2 < .97


def bounds(x, y):
    if inside(x, y):
        return x, y
    dx, dy = x - CENTER[0], y - CENTER[1]
    k = .97 ** .5 / math.hypot(dx / RX, dy / RY)
    return CENTER[0] + dx * k * .99, CENTER[1] + dy * k * .99


def in_base(f):
    bx, by = TEAMS[f['team']]['base']
    return math.hypot(f['x'] - bx, (f['y'] - by) * 1.4) < BASE_RADIUS


def current(at=None, gm_open=False):
    """The running battle, created/finished as windows open and close."""
    stamp = time.time() if at is None else at
    b = STATE['battle']
    if b and stamp >= b['end']:
        return None
    if not b:
        w = window(stamp)
        if gm_open and not w:
            w = (stamp, stamp + 600)
        if not w:
            return None
        b = STATE['battle'] = dict(id=f'battle:{int(w[0])}', start=w[0], end=w[1], arena=dict(fighters={}, pending=[], events=[]),
                                   teams={t: dict(score=0.0) for t in TEAMS},
                                   flags=[dict(f, owner=None, progress=0.0, team=None) for f in FLAGS], tick=stamp, feed=[])
    return b


def finish(db, at=None):
    """Close a battle whose window ended: mail chests once and keep the result."""
    stamp = time.time() if at is None else at
    b = STATE['battle']
    if not b or stamp < b['end']:
        return None
    STATE['battle'] = None
    scores = {t: round(v['score']) for t, v in b['teams'].items()}
    winner = None if scores['chinh'] == scores['ta'] else max(scores, key=scores.get)
    ranking = sorted(b['arena']['fighters'].values(), key=lambda f: (-f['score'], -f['kills'], f['deaths']))
    for rank, f in enumerate(ranking, 1):
        if f['score'] < 5:
            continue
        reward = dict(gold=300 + int(f['score']) * 8, essence=30, fragments=6)
        if f['team'] == winner:
            reward = {k: int(v * 1.5) for k, v in reward.items()}
        if rank <= 3:
            reward['fragments'] += (10, 6, 4)[rank - 1]
            reward['gold'] += (1500, 900, 500)[rank - 1]
        reward['shards'] = __import__('shards').battle_reward(f['score'], rank, f['team'] == winner)
        engagement.mail(db, f['id'], f"Chính – Tà Chi Chiến · Hạng {rank}" + (' · Thắng' if f['team'] == winner else ''), reward, f"{b['id']}:{f['id']}")
        adventure.add(db, f['id'], 'battles')
        adventure.add(db, f['id'], 'daily:' + adventure.day() + ':battles')
        if f['team'] == winner:
            adventure.add(db, f['id'], 'battleWins')
        adventure.add(db, f['id'], engagement.board_value_key('battle', engagement.week(stamp)), int(f['score']))
    STATE['last'] = dict(id=b['id'], end=b['end'], winner=winner, scores=scores,
                         ranking=[pvp.public(f, stamp) for f in ranking[:10]], shown=stamp)
    return STATE['last']


def join(uid, player, peer, max_hp, attack, at=None, gm=False):
    stamp = time.time() if at is None else at
    b = current(stamp, gm_open=gm)
    if not b:
        raise ValueError('Chiến trường chưa mở. Giờ mở: 12:30 và 21:00 mỗi ngày.')
    fighters = b['arena']['fighters']
    if uid in fighters:
        return b
    if stamp > b['end'] - JOIN_CLOSES:
        raise ValueError('Chiến trường sắp kết thúc, không nhận thêm người.')
    if not peer or peer.get('map') != 'hub':
        raise ValueError('Hãy vào chiến trường từ Thiên Vân Thành.')
    if progression.level(player) < 15:
        raise ValueError('Cần cấp 15 để tham chiến.')
    sizes = {t: [f for f in fighters.values() if f['team'] == t] for t in TEAMS}
    team = min(TEAMS, key=lambda t: (len(sizes[t]), sum(f['level'] for f in sizes[t])))
    bx, by = TEAMS[team]['base']
    fighters[uid] = pvp.fighter(uid, player, max_hp, attack, team, bx, by, stamp)
    b['feed'] = (b['feed'] + [f"{player['nm']} gia nhập {TEAMS[team]['name']}"])[-8:]
    return b


def leave(uid, at=None):
    b = current(at)
    if b and uid in b['arena']['fighters']:
        f = b['arena']['fighters'][uid]
        f['left'] = True


def hostile(a, b):
    return a['team'] != b['team']


def advance(b, now):
    """Flags, faction score and respawns since the previous tick."""
    dt = max(0, min(1.0, now - b['tick']))
    b['tick'] = now
    fighters = [f for f in b['arena']['fighters'].values() if not f.get('left')]
    for f in fighters:
        if f['hp'] <= 0 and now >= f['deadUntil'] and f['deadUntil']:
            bx, by = TEAMS[f['team']]['base']
            f.update(hp=f['maxHp'], mp=f['maxMp'], x=bx, y=by, deadUntil=0)
        pvp.regen(f, now)
    for flag in b['flags']:
        present = {t: [f for f in fighters if f['team'] == t and pvp.alive(f, now) and math.hypot(f['x'] - flag['x'], (f['y'] - flag['y']) * 1.4) < FLAG_RADIUS] for t in TEAMS}
        teams = [t for t in TEAMS if present[t]]
        if len(teams) == 1:
            team = teams[0]
            if flag['owner'] != team:
                if flag['team'] != team:
                    flag['progress'] = max(0, flag['progress'] - dt / CAPTURE_TIME * 2)
                    if flag['progress'] == 0:
                        flag['team'] = team
                else:
                    flag['progress'] = min(1, flag['progress'] + dt / CAPTURE_TIME * (1 + .25 * (len(present[team]) - 1)))
                    if flag['progress'] >= 1:
                        flag['owner'] = team
                        b['feed'] = (b['feed'] + [f"{TEAMS[team]['name']} chiếm {flag['name']}"])[-8:]
                        for f in present[team]:
                            f['score'] += 5
            else:
                for f in present[team]:
                    f['score'] += dt * .4
        if flag['owner']:
            b['teams'][flag['owner']]['score'] += dt / 5


def on_kill(b, killer, victim, now):
    k, v = b['arena']['fighters'][killer], b['arena']['fighters'][victim]
    k['score'] += 10
    b['teams'][k['team']]['score'] += 5
    v['deadUntil'] = now + RESPAWN
    b['feed'] = (b['feed'] + [f"{k['name']} hạ {v['name']}"])[-8:]


def step(uid, body, at=None):
    """World heartbeat for a fighter on map 'battle'. Returns (view, x, y) or None."""
    now = time.time() if at is None else at
    b = current(now)
    if not b or uid not in b['arena']['fighters']:
        return None
    f = b['arena']['fighters'][uid]
    f.pop('left', None)
    events = body.get('duelAttacks', [])
    x, y = body.get('x'), body.get('y')
    if body.get('map') == 'battle':
        x, y = pvp.move(f, x, y, now, events if isinstance(events, list) else [], bounds)
    else:
        x, y = f['x'], f['y']
    advance(b, now)
    pvp.queue(b['arena'], f, events, now)
    for killer, victim in pvp.resolve(b['arena'], now, hostile, protected=in_base):
        on_kill(b, killer, victim, now)
    return view(b, uid, now), f['x'], f['y']


def view(b, uid, now):
    f = b['arena']['fighters'].get(uid)
    ranking = sorted(b['arena']['fighters'].values(), key=lambda g: -g['score'])
    return dict(id=b['id'], now=now, end=b['end'], teams={t: dict(score=int(v['score']), name=TEAMS[t]['name'], color=TEAMS[t]['color'],
                                                                     base=TEAMS[t]['base'], players=sum(1 for g in b['arena']['fighters'].values() if g['team'] == t and not g.get('left')))
                                                       for t, v in b['teams'].items()},
                flags=[dict(id=g['id'], name=g['name'], x=g['x'], y=g['y'], owner=g['owner'], team=g['team'], progress=round(g['progress'], 2)) for g in b['flags']],
                me=pvp.public(f, now) | dict(mp=round(f['mp']), maxMp=f['maxMp'], x=f['x'], y=f['y']) if f else None,
                fighters=[pvp.public(g, now) | dict(x=round(g['x']), y=round(g['y'])) for g in b['arena']['fighters'].values() if not g.get('left')],
                ranking=[pvp.public(g, now) for g in ranking[:5]], events=b['arena']['events'][-20:],
                pending=[dict(x=a['x'], y=a['y'], r=a['radius'], at=a['at'], slot=a['slot']) for a in b['arena']['pending'] if a['slot'] >= 3],
                feed=b['feed'][-5:], flagRadius=FLAG_RADIUS, baseRadius=BASE_RADIUS)


def snapshot(uid, at=None):
    now = time.time() if at is None else at
    b = current(now)
    last = STATE['last'] if STATE['last'] and now - STATE['last']['shown'] < 600 else None
    return dict(open=bool(b), joined=bool(b and uid in b['arena']['fighters']), end=b['end'] if b else None, now=now,
                next=next_window(now), windows=[f'{h:02d}:{m:02d}' for h, m, _ in WINDOWS], minutes=WINDOWS[0][2],
                players=len(b['arena']['fighters']) if b else 0, last=last)
