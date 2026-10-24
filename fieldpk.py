"""Consensual PK in Sơn Hà.

A player turns PK on with /api/pk; only PK-on players in the same hunting field can
hurt each other (party members never), never inside the spawn safe zone. Damage is
computed on the server from skill intents (pvp.py) and sent to the victim as
'pvpDamage'. The victim's HP stays client-side (monsters hit it too), so the server
mirrors it from the last report minus PvP damage of the last second.
A kill gives the killer sát khí (red name, decays 1 every 5 minutes online) and
counts for the weekly 'Sát Thần' board.
"""
import time

import adventure
import community
import engagement
import overworld
import pvp

OFF_COOLDOWN = 30
DECAY = 300
ARENAS = {}          # room key -> arena
STATE = {}           # uid -> dict(on, since, lastFight, sat, satAt)


def info(uid):
    return STATE.setdefault(uid, dict(on=False, since=0, lastFight=0, sat=0, satAt=time.time()))


def decay(s, now):
    while s['sat'] > 0 and now - s['satAt'] >= DECAY:
        s['sat'] -= 1
        s['satAt'] += DECAY
    if s['sat'] == 0:
        s['satAt'] = now


def toggle(uid, on, scene, at=None):
    now = time.time() if at is None else at
    s = info(uid)
    if on:
        if scene not in overworld.MAPS:
            raise ValueError('Chỉ bật PK được ở Sơn Hà.')
        s.update(on=True, since=now)
    else:
        if now - s['lastFight'] < OFF_COOLDOWN:
            raise ValueError(f"Đang giao chiến, đợi {int(OFF_COOLDOWN - (now - s['lastFight']))} giây để tắt PK.")
        s['on'] = False
    return public(uid, now)


def public(uid, now=None):
    s = info(uid)
    decay(s, time.time() if now is None else now)
    return dict(on=s['on'], sat=s['sat'], red=s['sat'] >= 3, cooldown=max(0, round(OFF_COOLDOWN - ((time.time() if now is None else now) - s['lastFight']))))


def step(db, key, scene, uid, peer, body, player, max_hp, attack, peers, at=None):
    """Returns PvP damage (int) this request must apply to `uid`."""
    now = time.time() if at is None else at
    arena = ARENAS.setdefault(key, dict(fighters={}, pending=[], events=[], hits={}))
    s = info(uid)
    decay(s, now)
    fighters = arena['fighters']
    if not s['on'] or scene not in overworld.MAPS:
        fighters.pop(uid, None)
    else:
        f = fighters.get(uid)
        if not f:
            f = fighters[uid] = pvp.fighter(uid, player, max_hp, attack, 'pk', peer['x'], peer['y'], now)
        recent = sum(a for t, a in arena['hits'].get(uid, []) if now - t < 1)
        f.update(x=peer['x'], y=peer['y'], lastSeen=now, maxHp=peer.get('maxHp', f['maxHp']))
        if now >= f['deadUntil']:
            f['hp'] = max(0, peer.get('hp', f['hp']) - recent)
        pvp.regen(f, now)
        try:
            pvp.queue(arena, f, body.get('duelAttacks', []), now)
        except ValueError:
            pass
    for other in list(fighters):
        if other not in peers or peers[other].get('map') != scene or not info(other)['on']:
            fighters.pop(other, None)
    allies = {}

    def hostile(a, b):
        if a['id'] not in allies:
            allies[a['id']] = community.party_allies(db, {a['id']}) | {a['id']}
        return b['id'] not in allies[a['id']]

    def protected(f):
        return overworld.safe(f['x'], f['y'])

    def on_hit(owner, target, dealt):
        arena['hits'].setdefault(target['id'], []).append((now, dealt))
        arena.setdefault('owed', {}).setdefault(target['id'], 0)
        arena['owed'][target['id']] += dealt
        info(owner['id'])['lastFight'] = now
        info(target['id'])['lastFight'] = now

    for killer, victim in pvp.resolve(arena, now, hostile, protected, on_hit):
        k = info(killer)
        k['sat'] += 1
        k['satAt'] = now if k['sat'] == 1 else k['satAt']
        fighters[victim]['deadUntil'] = now + 6
        adventure.add(db, killer, 'pkKills')
        adventure.add(db, killer, engagement.board_value_key('pk', engagement.week(now)))
        arena['events'] = (arena['events'] + [dict(id=f'kill:{killer}:{victim}:{int(now)}', owner=killer, target=victim, amount=0, kill=True, at=now)])[-40:]
    for victim in list(arena['hits']):
        arena['hits'][victim] = [(t, a) for t, a in arena['hits'][victim] if now - t < 2]
    owed = arena.get('owed', {}).pop(uid, 0)
    return owed, [e for e in arena['events'] if now - e['at'] < 2]
