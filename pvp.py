"""Server-authoritative PvP for many fighters (battleground, field PK).

Clients send skill intent (slot, aim point, event id) in body['duelAttacks'],
exactly like the 1v1 lôi đài; the server checks cooldown, mana, level and range,
queues the hit and resolves it after the cast delay against every hostile fighter
still inside the area. HP lives on the server.
"""
import math
import secrets

import progression
from duels import BASIC, COOLDOWNS

CAST_DELAY = (.12, .28, .18, .42, .6)
RANGE = (0, 350, 180, 260, 520)   # skill 3 is aimed like the ultimate
RADIUS = (42, 58, 65, 105, 130)
POWER = (0, 3.2, 1.0, 2.2, 6.0)
MANA = (0, 8, 10, 16, 24)


def fighter(uid, player, max_hp, attack, team, x, y, now):
    gear = player.get('world', {}).get('equip', {})
    attrs = player.get('world', {}).get('attrs', {})
    hp = max_hp(player)
    mp = round(60 + (progression.level(player) - 1) * 3 + attrs.get('linh', 0) * 10 + sum((g or {}).get('mp', 0) for g in gear.values()))
    armor = sum((g or {}).get('armor', 0) * (1 + .05 * (g or {}).get('enhance', 0)) for g in gear.values()) + attrs.get('the', 0) * .15
    return dict(id=uid, name=player['nm'], ap=player['ap'], team=team, level=progression.level(player), hp=hp, maxHp=hp, mp=mp, maxMp=mp,
                attack=attack(player), armor=armor, speed=150 + player['r'] * 10, x=x, y=y, lastSeen=now, manaAt=now,
                ready=[0] * 5, seen=[], combo=0, evadeUntil=0, deadUntil=0, kills=0, deaths=0, damage=0, score=0.0)


def alive(f, now):
    return f['hp'] > 0 and now >= f['deadUntil']


def move(f, x, y, now, events, bounds):
    """Limit movement by server time (dash allowed when its skill is ready)."""
    if not alive(f, now):
        return f['x'], f['y']
    distance = math.hypot(x - f['x'], y - f['y'])
    limit = max(8, min(.5, max(0, now - f['lastSeen'])) * f.get('speed', 165))
    if any(isinstance(e, dict) and e.get('slot') == 2 and isinstance(e.get('id'), str) and e['id'] not in f['seen'] for e in events) \
            and now >= f['ready'][2] and f['level'] >= progression.SKILL_LEVELS[1] and f['mp'] >= MANA[2]:
        limit += 145
    if distance > limit:
        x, y = f['x'] + (x - f['x']) * limit / distance, f['y'] + (y - f['y']) * limit / distance
    x, y = bounds(x, y)
    f.update(x=x, y=y, lastSeen=now)
    return x, y


def regen(f, now):
    elapsed = max(0, min(2, now - f.get('manaAt', now)))
    f['mp'] = min(f['maxMp'], f['mp'] + elapsed * f['maxMp'] * .015)
    f['manaAt'] = now


def queue(arena, f, events, now):
    """Validate client intents and add pending hits. Returns the number queued."""
    if not isinstance(events, list) or len(events) > 8:
        raise ValueError('Dữ liệu giao chiến không hợp lệ.')
    if not alive(f, now):
        return 0
    queued = 0
    for event in events:
        if not isinstance(event, dict):
            continue
        eid, slot = event.get('id'), event.get('slot')
        if not isinstance(eid, str) or not 1 <= len(eid) <= 80 or eid in f['seen'] or type(slot) is not int or slot not in range(5):
            continue
        f['seen'] = (f['seen'] + [eid])[-64:]
        if f['ready'][slot] > now or (slot and f['level'] < progression.SKILL_LEVELS[slot - 1]) or f['mp'] < MANA[slot]:
            continue
        cls = f['ap']['w']
        interval, basic_range, powers = BASIC[cls]
        f['ready'][slot] = now + (interval if slot == 0 else COOLDOWNS[cls][slot - 1])
        f['mp'] -= MANA[slot]
        if slot == 2:
            f['evadeUntil'] = now + .24
        power = powers[f['combo'] % len(powers)] if slot == 0 else POWER[slot]
        if slot == 0:
            f['combo'] += 1
        reach = basic_range + 12 if slot == 0 else RANGE[slot]
        tx, ty = event.get('x'), event.get('y')
        if any(type(v) not in (int, float) or not math.isfinite(v) for v in (tx, ty)):
            continue
        if math.hypot(tx - f['x'], ty - f['y']) > reach + RADIUS[slot]:
            continue
        arena['pending'].append(dict(id=eid, owner=f['id'], slot=slot, x=tx, y=ty, ox=f['x'], oy=f['y'], range=reach,
                                     radius=RADIUS[slot], power=power, at=now + CAST_DELAY[slot]))
        queued += 1
    return queued


def damage_of(owner, target, power):
    return max(1, round((owner['attack'] * power - target['armor'] * .65) * .55))


def resolve(arena, now, hostile, protected=lambda f: False, on_hit=None):
    """Apply due hits. Basic attacks strike the nearest enemy, skills every enemy in the area.
    Returns a list of (killer_id, victim_id)."""
    due = [a for a in arena['pending'] if a['at'] <= now]
    arena['pending'] = [a for a in arena['pending'] if a['at'] > now]
    kills = []
    for attack in sorted(due, key=lambda a: a['at']):
        owner = arena['fighters'].get(attack['owner'])
        if not owner or not alive(owner, attack['at'] - .001):
            continue
        targets = [t for t in arena['fighters'].values() if t['id'] != owner['id'] and hostile(owner, t) and alive(t, now)
                   and not protected(t) and t['evadeUntil'] < attack['at']
                   and math.hypot(t['x'] - attack['x'], t['y'] - attack['y']) <= attack['radius']
                   and math.hypot(t['x'] - attack['ox'], t['y'] - attack['oy']) <= attack['range'] + attack['radius']]
        if attack['slot'] == 0:
            targets = sorted(targets, key=lambda t: math.hypot(t['x'] - attack['x'], t['y'] - attack['y']))[:1]
        for target in targets:
            dealt = min(target['hp'], damage_of(owner, target, attack['power']))
            target['hp'] -= dealt
            owner['damage'] += dealt
            arena['events'] = (arena['events'] + [dict(id=secrets.token_hex(6), owner=owner['id'], target=target['id'], amount=dealt,
                                                       x=target['x'], y=target['y'], at=now)])[-40:]
            if on_hit:
                on_hit(owner, target, dealt)
            if target['hp'] <= 0:
                target['deaths'] += 1
                owner['kills'] += 1
                kills.append((owner['id'], target['id']))
    return kills


def public(f, now):
    return dict(id=f['id'], name=f['name'], team=f['team'], level=f['level'], hp=max(0, round(f['hp'])), maxHp=f['maxHp'],
                kills=f['kills'], deaths=f['deaths'], score=int(f['score']), dead=max(0, round(f['deadUntil'] - now, 1)) if not alive(f, now) else 0)
