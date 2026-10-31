"""Tông môn chiến: weekly guild war for four Sơn Hà outposts.

During a war window (Wednesday and Saturday 20:00–20:30, Vietnam time) each outpost
field spawns a Trấn Thủ guardian. Only damage from guild members counts, summed per
guild. When the guardian falls (or the window ends) the guild with the most damage
holds the outpost until the next war. Holders get +10% EXP/Linh Thạch from kills in
that field, and every kill there by a holder adds a guild point.
"""
import time
from datetime import timedelta

import adventure
import engagement

WARS = ((2, 20, 0, 30), (5, 20, 0, 30))      # (weekday, hour, minute, minutes); Mon=0
POINT = (1000, 1050)
OUTPOSTS = (
    dict(id='truc-hai', map='field-bamboo', name='Trúc Hải Cứ Điểm', skin='TrauQuy', hp=25000),
    dict(id='van-mong', map='field-marsh', name='Vân Mộng Cứ Điểm', skin='DungNham', hp=45000),
    dict(id='han-suong', map='field-frost', name='Hàn Sương Cứ Điểm', skin='SuaQuy', hp=70000),
    dict(id='xich-diem', map='field-ember', name='Xích Diệm Cứ Điểm', skin='PhuongHoang', hp=100000),
)
BY_MAP = {o['map']: o for o in OUTPOSTS}
BY_ID = {o['id']: o for o in OUTPOSTS}
DAMAGE = {}   # war id -> outpost id -> guild id -> damage (in memory during a war)


def init_db(db):
    db.execute('''CREATE TABLE IF NOT EXISTS outposts(id TEXT PRIMARY KEY, guild_id TEXT, guild_name TEXT, war TEXT NOT NULL, captured_at REAL NOT NULL)''')


def war(at=None):
    """(war id, start, end) of the running war window, else None."""
    stamp = time.time() if at is None else at
    moment = engagement.now_vn(stamp)
    for weekday, hour, minute, minutes in WARS:
        if moment.weekday() != weekday:
            continue
        start = moment.replace(hour=hour, minute=minute, second=0, microsecond=0)
        end = start + timedelta(minutes=minutes)
        if start.timestamp() <= stamp < end.timestamp():
            return f'war:{start.date().isoformat()}', start.timestamp(), end.timestamp()
    return None


def next_war(at=None):
    stamp = time.time() if at is None else at
    moment = engagement.now_vn(stamp)
    best = None
    for day in range(8):
        d = moment + timedelta(days=day)
        for weekday, hour, minute, _ in WARS:
            if d.weekday() == weekday:
                start = d.replace(hour=hour, minute=minute, second=0, microsecond=0).timestamp()
                if start > stamp and (best is None or start < best):
                    best = start
    return best


def owner(db, outpost_id):
    row = db.execute('SELECT guild_id,guild_name FROM outposts WHERE id=?', (outpost_id,)).fetchone()
    return dict(row) if row and row['guild_id'] else None


def guild_of(db, uid):
    row = db.execute('SELECT g.id,g.name FROM guild_members m JOIN guilds g ON g.id=m.guild_id WHERE m.user_id=?', (uid,)).fetchone()
    return dict(row) if row else None


def guardian(outpost, war_id):
    level = {'field-bamboo': 18, 'field-marsh': 28, 'field-frost': 40, 'field-ember': 55}[outpost['map']]
    x, y = POINT
    return dict(id=f"{outpost['map']}:outpost:{war_id}", t=4, skin=outpost['skin'], name='Trấn Thủ · ' + outpost['name'], level=level,
                x=x, y=y, hx=x, hy=y, hp=outpost['hp'], maxHp=outpost['hp'], dead=0, cd=1, fr=0, fl=0, worldMap=True, network=True,
                map=outpost['map'], camp='outpost', campX=x, campY=y, campRX=130, campRY=90, attackScale=1.2 + level * .03,
                xpReward=level * 30, materialYield=3, boss=True, elite=True, outpost=outpost['id'], war=war_id, contributors={})


def needs_sync(room, scene, at=None):
    return scene in BY_MAP and (war(at) is not None or any(m.get('outpost') for m in room['mobs']))


def sync(db, room, scene, at=None):
    """Add the guardian to a field room during a war; drop it afterwards (settling the result)."""
    outpost = BY_MAP.get(scene)
    if not outpost:
        return
    current = war(at)
    mobs = room['mobs']
    existing = next((m for m in mobs if m.get('outpost')), None)
    if existing and (not current or existing['war'] != current[0]):
        if not existing['dead']:
            settle(db, outpost, existing['war'], at)
        mobs.remove(existing)
        existing = None
    if current and not existing and not db.execute('SELECT 1 FROM outposts WHERE id=? AND war=?', (outpost['id'], current[0])).fetchone():
        mobs.append(guardian(outpost, current[0]))


def record_damage(db, mob, uid, amount):
    g = guild_of(db, uid)
    if not g:
        return
    table = DAMAGE.setdefault(mob['war'], {}).setdefault(mob['outpost'], {})
    entry = table.setdefault(g['id'], dict(name=g['name'], damage=0))
    entry['damage'] += amount


def settle(db, outpost, war_id, at=None, present=()):
    """Give the outpost to the top-damage guild for this war (once)."""
    if db.execute('SELECT 1 FROM outposts WHERE id=? AND war=?', (outpost['id'], war_id)).fetchone():
        return None
    table = DAMAGE.get(war_id, {}).get(outpost['id'], {})
    if not table:
        return None
    gid, entry = max(table.items(), key=lambda kv: kv[1]['damage'])
    stamp = time.time() if at is None else at
    db.execute('INSERT INTO outposts VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET guild_id=excluded.guild_id,guild_name=excluded.guild_name,war=excluded.war,captured_at=excluded.captured_at',
               (outpost['id'], gid, entry['name'], war_id, stamp))
    db.execute('UPDATE guilds SET points=points+500 WHERE id=?', (gid,))
    for uid in present:
        g = guild_of(db, uid)
        if g and g['id'] == gid:
            engagement.mail(db, uid, f"Chiếm {outpost['name']}", dict(gold=1500, essence=80, fragments=15, shards=__import__('shards').outpost_reward()), f"{war_id}:{outpost['id']}:{uid}")
            adventure.add(db, uid, 'outposts')
    return gid


def on_kill(db, mob, present):
    """Guardian died: settle immediately for the guild with the most damage."""
    if mob.get('outpost'):
        return settle(db, BY_ID[mob['outpost']], mob['war'], present=present)


def bonus(db, uid, scene):
    """Kill reward multiplier (and guild tax) for holders of this field's outpost."""
    outpost = BY_MAP.get(scene)
    if not outpost:
        return 1
    held = owner(db, outpost['id'])
    g = held and guild_of(db, uid)
    if g and g['id'] == held['guild_id']:
        db.execute('UPDATE guilds SET points=points+1 WHERE id=?', (g['id'],))
        return 1.1
    return 1


def snapshot(db, uid, at=None):
    stamp = time.time() if at is None else at
    current = war(stamp)
    mine = guild_of(db, uid)
    rows = []
    for o in OUTPOSTS:
        held = owner(db, o['id'])
        table = DAMAGE.get(current[0], {}).get(o['id'], {}) if current else {}
        top = sorted(table.values(), key=lambda e: -e['damage'])[:3]
        captured = bool(current and db.execute('SELECT 1 FROM outposts WHERE id=? AND war=?', (o['id'], current[0])).fetchone())
        rows.append(dict(id=o['id'], name=o['name'], map=o['map'], owner=held['guild_name'] if held else None,
                         mine=bool(held and mine and held['guild_id'] == mine['id']), top=[dict(name=e['name'], damage=e['damage']) for e in top], captured=captured))
    return dict(outposts=rows, war=bool(current), endsIn=round(current[2] - stamp) if current else None,
                next=next_war(stamp), now=stamp, guild=mine['name'] if mine else None, point=POINT)
