"""Server-side income budget for character saves.

The browser still simulates combat, so saves report gold, Linh Nguyên and level
EXP. A save may only *add* what the server can explain:

* a budget credited when the server itself confirms a kill (with a 2x margin
  for party/zone multipliers),
* a small time allowance for client-only content (solo rifts, cultivation UI),
* the sell value of items that left the bag.

Spending is never limited. Anything above the allowance is clamped back to
the stored value and the client is told to reload the authoritative state.
Quest, forge, trade and boss rewards are written by the server directly and
therefore never pass through this check.
"""
import math

import progression

GOLD_PER_SEC, XP_PER_SEC, ESSENCE_PER_SEC = 30, 150, 3
GOLD_SLACK, XP_SLACK, ESSENCE_SLACK = 400, 1000, 50
MAX_ELAPSED = 300


def init_db(db):
    db.execute('''CREATE TABLE IF NOT EXISTS economy_budget(user_id INTEGER PRIMARY KEY REFERENCES users(id),
        gold REAL NOT NULL DEFAULT 0, xp REAL NOT NULL DEFAULT 0, essence REAL NOT NULL DEFAULT 0)''')


def budget(db, uid):
    row = db.execute('SELECT gold,xp,essence FROM economy_budget WHERE user_id=?', (uid,)).fetchone()
    return dict(gold=row[0], xp=row[1], essence=row[2]) if row else dict(gold=0, xp=0, essence=0)


def credit_kill(db, uid, mob):
    """Called for every contributor the server rewards for a kill."""
    xp = mob.get('xpReward') or 20 + mob.get('level', 1) * 8
    gold = math.ceil(xp / 4)
    essence = mob.get('materialYield', 0)
    db.execute('''INSERT INTO economy_budget(user_id,gold,xp,essence) VALUES(?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET gold=gold+excluded.gold,xp=xp+excluded.xp,essence=essence+excluded.essence''',
               (uid, gold * 2 + 5, xp * 2 + 10, (essence + 1) * 3))


def total_xp(player):
    rank = progression.level(player)
    return sum(progression.required(n) for n in range(1, rank)) + player.get('levelXp', 0)


def sold_value(old_items, new_items):
    kept = {item['uid'] for item in new_items}
    value = 0
    for item in old_items:
        if item['uid'] not in kept and item.get('type') != 'material':
            value += max(1, math.floor(item.get('price', 10) * .5)) * item.get('qty', 1)
    return value


LEVEL_FIELDS = ('level', 'levelXp')
LEVEL_WORLD_FIELDS = ('attrs', 'attrPoints', 'attributeLevel', 'learnedSkills')


def enforce(db, uid, old, new, elapsed, old_items, new_items):
    """Clamp unexplained income in `new` (mutated). Returns the corrected keys."""
    elapsed = max(0, min(MAX_ELAPSED, elapsed))
    have = budget(db, uid)
    corrected = []

    def allow(name, delta, banked, rate, slack, extra=0):
        free = rate * elapsed + slack + extra
        if delta <= free + banked:
            used = max(0, delta - free)
            return True, banked - used
        return False, banked

    ok, have['gold'] = allow('gold', new.get('gold', 0) - old.get('gold', 0), have['gold'], GOLD_PER_SEC, GOLD_SLACK,
                             sold_value(old_items, new_items))
    if not ok:
        new['gold'] = old.get('gold', 0)
        corrected.append('gold')

    ow, nw = old.get('world', {}), new.get('world', {})
    ok, have['essence'] = allow('essence', nw.get('essence', 0) - ow.get('essence', 0), have['essence'],
                                ESSENCE_PER_SEC, ESSENCE_SLACK)
    if not ok:
        nw['essence'] = ow.get('essence', 0)
        corrected.append('essence')

    ok, have['xp'] = allow('xp', total_xp(new) - total_xp(old), have['xp'], XP_PER_SEC, XP_SLACK)
    if not ok:
        # Level, EXP and the attribute points they grant go back together.
        for key in LEVEL_FIELDS:
            if key in old:
                new[key] = old[key]
        for key in LEVEL_WORLD_FIELDS:
            if key in ow:
                nw[key] = ow[key]
        corrected.append('level')

    db.execute('''INSERT INTO economy_budget(user_id,gold,xp,essence) VALUES(?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET gold=excluded.gold,xp=excluded.xp,essence=excluded.essence''',
               (uid, max(0, have['gold']), max(0, have['xp']), max(0, have['essence'])))
    return corrected
