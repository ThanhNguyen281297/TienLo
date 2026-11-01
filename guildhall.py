"""Tông môn (player guild) hall: contribution shop and the weekly guild boss.

Contribution (cống hiến) is earned by donating, finishing guild tasks and fighting the
guild boss; it is stored as guild_members.contribution (lifetime, per membership) and
spent here (guild_wallet.spent), so leaving a guild forfeits the unspent balance.

Hộ Sơn Thần Thú: every guild has its own boss in a private room ('guildboss:<guild>').
Its HP is shared by all members for the ISO week and persisted, so members can chip
at it at any time, together or alone. Damage is certified by server.damage_mob. When it
falls every contributor is mailed a chest by damage rank, the boss gets one level
stronger for next week and the guild earns building points.
"""
import json
import math
import time

import community
import engagement

CONTRIB_TASK = 15                 # guild task claim (kills/bosses) -> personal contribution
BOSS_CONTRIB_POOL = 400           # contribution shared out by damage share over the whole boss
BOSS_KILL_CONTRIB = 30            # extra contribution for every contributor at the kill
BOSS_SKINS = ('TeGiac', 'RongNuoc', 'PhuongHoang', 'RongXuong')
BOSS_NAMES = ('Lôi Giác Hộ Sơn Thú', 'Bích Thủy Hộ Sơn Long', 'Xích Vũ Hộ Sơn Điểu', 'Cốt Long Hộ Sơn Thú')
BOSS_X, BOSS_Y = 1000, 1080

# id -> name, cost (contribution), weekly limit, reward (engagement.grant payload or a special key)
SHOP = {
    'essence': dict(name='Linh Nguyên ×80', cost=40, limit=5, reward={'essence': 80}, icon='essence'),
    'gold': dict(name='Linh Thạch ×600', cost=30, limit=5, reward={'gold': 600}, icon='gold'),
    'nhan': dict(name='Mảnh Nhẫn ×5', cost=60, limit=3, reward={'shards': {'nhan': 5}}, icon='shard'),
    'cuonghoa': dict(name='Cường Hóa Thạch ×5', cost=50, limit=4, reward={'items': {'cuong-hoa-thach': 5}}, icon='stone'),
    'tinhluyen': dict(name='Tinh Luyện Thạch ×2', cost=90, limit=2, reward={'items': {'tinh-luyen-thach': 2}}, icon='stone2'),
    'charm': dict(name='Hộ Kiếp Phù ×1', cost=80, limit=2, reward={'tribCharms': 1}, icon='charm',
                  desc='Đỡ một tia sét khi Độ Thiên Kiếp.'),
    'seed': dict(name='Hạt Ngọc Linh Chi ×1', cost=60, limit=3, reward={'seeds': {'ngocchi': 1}}, icon='seed',
                 desc='Trồng ở Động phủ, thu Thăng Vị Đan.'),
}


def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS guild_wallet(user_id INTEGER NOT NULL,guild_id TEXT NOT NULL,spent INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,guild_id));
    CREATE TABLE IF NOT EXISTS guild_shop_log(user_id INTEGER NOT NULL,week TEXT NOT NULL,item TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(user_id,week,item));
    CREATE TABLE IF NOT EXISTS guild_boss(guild_id TEXT PRIMARY KEY,week TEXT NOT NULL,level INTEGER NOT NULL,hp INTEGER NOT NULL,max_hp INTEGER NOT NULL,killed REAL);
    CREATE TABLE IF NOT EXISTS guild_boss_damage(guild_id TEXT NOT NULL,week TEXT NOT NULL,user_id INTEGER NOT NULL,damage INTEGER NOT NULL DEFAULT 0,credited INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(guild_id,week,user_id));
    CREATE TABLE IF NOT EXISTS guildhall_ops(user_id INTEGER NOT NULL,id TEXT NOT NULL,PRIMARY KEY(user_id,id));
    ''')


# ---------------------------------------------------------------- contribution wallet
def balance(db, uid):
    member = community.membership(db, uid, 'guild')
    if not member:
        return None, 0
    row = db.execute('SELECT spent FROM guild_wallet WHERE user_id=? AND guild_id=?', (uid, member['guild_id'])).fetchone()
    return member, max(0, member['contribution'] - (row['spent'] if row else 0))


def earn(db, uid, amount):
    if amount > 0:
        db.execute('UPDATE guild_members SET contribution=contribution+? WHERE user_id=?', (int(amount), uid))


def spend(db, uid, guild_id, amount):
    db.execute('INSERT INTO guild_wallet VALUES(?,?,?) ON CONFLICT(user_id,guild_id) DO UPDATE SET spent=spent+excluded.spent',
               (uid, guild_id, int(amount)))


def bought(db, uid, item, wk=None):
    row = db.execute('SELECT count FROM guild_shop_log WHERE user_id=? AND week=? AND item=?', (uid, wk or engagement.week(), item)).fetchone()
    return row['count'] if row else 0


# ---------------------------------------------------------------- boss
def boss_hp(level, members):
    return round(60000 * 1.35 ** (level - 1) * max(1, min(4, members / 5)))


def boss_row(db, guild_id, at=None):
    """This week's boss for the guild, created (one level up if last week's fell) on first access."""
    wk = engagement.week(at)
    row = db.execute('SELECT * FROM guild_boss WHERE guild_id=?', (guild_id,)).fetchone()
    if row and row['week'] == wk:
        return row
    level = 1
    if row:
        level = max(1, row['level'] + (1 if row['killed'] else -1))
    count = db.execute('SELECT COUNT(*) FROM guild_members WHERE guild_id=?', (guild_id,)).fetchone()[0]
    hp = boss_hp(level, count)
    db.execute('INSERT INTO guild_boss VALUES(?,?,?,?,?,NULL) ON CONFLICT(guild_id) DO UPDATE SET week=excluded.week,level=excluded.level,hp=excluded.hp,max_hp=excluded.max_hp,killed=NULL',
               (guild_id, wk, level, hp, hp))
    return db.execute('SELECT * FROM guild_boss WHERE guild_id=?', (guild_id,)).fetchone()


def boss_mob(row):
    level = row['level']
    i = (level - 1) % len(BOSS_SKINS)
    return dict(id=f"guildboss:{row['guild_id']}:{row['week']}", t=4, skin=BOSS_SKINS[i], name=f'{BOSS_NAMES[i]} · Cấp {level}', level=10 + level * 8,
                x=BOSS_X, y=BOSS_Y, hx=BOSS_X, hy=BOSS_Y, hp=row['hp'], maxHp=row['max_hp'], dead=10 ** 30 if row['hp'] <= 0 else 0, cd=1, fr=0, fl=0,
                worldMap=True, network=True, map='guildboss', camp='guildboss', campX=BOSS_X, campY=BOSS_Y, campRX=420, campRY=230,
                attackScale=1 + level * .25, xpReward=0, materialYield=0, boss=True, elite=True, guildBoss=row['guild_id'], week=row['week'],
                contributors={})


def room(db, guild_id):
    return {'mobs': [boss_mob(boss_row(db, guild_id))], 'updated': time.monotonic()}


def record_damage(db, mob, uid, amount):
    """Store certified damage, pay out contribution by damage share and persist HP."""
    gid, wk = mob['guildBoss'], mob['week']
    if amount <= 0:
        return
    db.execute('INSERT INTO guild_boss_damage(guild_id,week,user_id,damage) VALUES(?,?,?,?) ON CONFLICT(guild_id,week,user_id) DO UPDATE SET damage=damage+excluded.damage',
               (gid, wk, uid, int(amount)))
    row = db.execute('SELECT damage,credited FROM guild_boss_damage WHERE guild_id=? AND week=? AND user_id=?', (gid, wk, uid)).fetchone()
    due = int(row['damage'] * BOSS_CONTRIB_POOL / max(1, mob['maxHp'])) - row['credited']
    if due > 0 and community.membership(db, uid, 'guild') and community.membership(db, uid, 'guild')['guild_id'] == gid:
        earn(db, uid, due)
        db.execute('UPDATE guild_boss_damage SET credited=credited+? WHERE guild_id=? AND week=? AND user_id=?', (due, gid, wk, uid))
    db.execute('UPDATE guild_boss SET hp=? WHERE guild_id=? AND week=?', (max(0, int(mob['hp'])), gid, wk))


def chest(level, rank):
    top = 1.5 if rank == 1 else 1.25 if rank <= 3 else 1
    return {'gold': round((500 + level * 250) * top), 'essence': round((80 + level * 30) * top), 'shards': {'nhan': 4 + level + (3 if rank <= 3 else 0)}}


def on_kill(db, mob):
    gid, wk = mob['guildBoss'], mob['week']
    if db.execute('UPDATE guild_boss SET hp=0,killed=? WHERE guild_id=? AND week=? AND killed IS NULL', (time.time(), gid, wk)).rowcount == 0:
        return []
    row = db.execute('SELECT level FROM guild_boss WHERE guild_id=?', (gid,)).fetchone()
    ranked = [r['user_id'] for r in db.execute('SELECT user_id FROM guild_boss_damage WHERE guild_id=? AND week=? AND damage>0 ORDER BY damage DESC', (gid, wk))]
    name = mob['name'].split(' · ')[0]
    for rank, uid in enumerate(ranked, 1):
        engagement.mail(db, uid, f'Rương {name} · Hạng {rank}', chest(row['level'], rank), f'guildboss:{gid}:{wk}:{uid}')
        if community.membership(db, uid, 'guild') and community.membership(db, uid, 'guild')['guild_id'] == gid:
            earn(db, uid, BOSS_KILL_CONTRIB)
    db.execute('UPDATE guilds SET points=points+? WHERE id=?', (100 + row['level'] * 20, gid))
    return ranked


def boss_view(db, uid, guild_id):
    row = boss_row(db, guild_id)
    ranks = [dict(r) for r in db.execute(
        "SELECT d.user_id id,d.damage,json_extract(c.player,'$.nm') name FROM guild_boss_damage d JOIN characters c ON c.user_id=d.user_id WHERE d.guild_id=? AND d.week=? ORDER BY d.damage DESC LIMIT 10",
        (guild_id, row['week']))]
    mine = db.execute('SELECT damage FROM guild_boss_damage WHERE guild_id=? AND week=? AND user_id=?', (guild_id, row['week'], uid)).fetchone()
    i = (row['level'] - 1) % len(BOSS_SKINS)
    return dict(name=BOSS_NAMES[i], skin=BOSS_SKINS[i], level=row['level'], hp=row['hp'], maxHp=row['max_hp'], killed=bool(row['killed']),
                week=row['week'], ranks=ranks, mine=mine['damage'] if mine else 0, chest=chest(row['level'], 99))


# ---------------------------------------------------------------- API
def snapshot(db, uid):
    member, have = balance(db, uid)
    if not member:
        return dict(guild=None)
    guild = db.execute('SELECT id,name,points FROM guilds WHERE id=?', (member['guild_id'],)).fetchone()
    shop = [dict(id=k, name=v['name'], cost=v['cost'], limit=v['limit'], bought=bought(db, uid, k), icon=v['icon'], desc=v.get('desc', ''))
            for k, v in SHOP.items()]
    return dict(guild=dict(guild), contribution=have, lifetime=member['contribution'], shop=shop, boss=boss_view(db, uid, member['guild_id']))


def apply(db, uid, player, reward):
    world = player.setdefault('world', {})
    special = {k: reward[k] for k in ('tribCharms', 'seeds') if k in reward}
    rest = {k: v for k, v in reward.items() if k not in special}
    if rest:
        engagement.grant(db, uid, player, rest)
    if special.get('tribCharms'):
        world['tribCharms'] = min(99, int(world.get('tribCharms', 0)) + special['tribCharms'])
    if special.get('seeds'):
        __import__('cave').add_seeds(db, uid, special['seeds'])


def action(db, uid, body):
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    player = json.loads(row['player'])
    opid = body.get('opId')
    if not isinstance(opid, str) or not 8 <= len(opid) <= 100:
        raise ValueError('Thiếu mã giao dịch.')
    if db.execute('SELECT 1 FROM guildhall_ops WHERE user_id=? AND id=?', (uid, opid)).fetchone():
        return dict(character=dict(id=row['id'], player=player, revision=row['revision']), hall=snapshot(db, uid))
    if body.get('revision') != row['revision']:
        return dict(conflict=True, error='Nhân vật đã thay đổi. Hãy thử lại.')
    if body.get('action') != 'buy':
        raise ValueError('Thao tác không hợp lệ.')
    item = SHOP.get(body.get('id'))
    if not item:
        raise ValueError('Vật phẩm không có trong cửa hàng tông môn.')
    member, have = balance(db, uid)
    if not member:
        raise ValueError('Bạn chưa có tông môn.')
    wk = engagement.week()
    if bought(db, uid, body['id'], wk) >= item['limit']:
        raise ValueError(f"Tuần này đã đổi đủ {item['limit']} lần.")
    if have < item['cost']:
        raise ValueError(f"Cần {item['cost']} cống hiến (đang có {have}).")
    apply(db, uid, player, item['reward'])
    spend(db, uid, member['guild_id'], item['cost'])
    db.execute('INSERT INTO guild_shop_log VALUES(?,?,?,1) ON CONFLICT(user_id,week,item) DO UPDATE SET count=count+1', (uid, wk, body['id']))
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?', (json.dumps(player, ensure_ascii=False), revision, int(time.time()), uid))
    db.execute('INSERT INTO guildhall_ops VALUES(?,?)', (uid, opid))
    return dict(character=dict(id=row['id'], player=player, revision=revision), hall=snapshot(db, uid), message=f"Đã đổi {item['name']}.")
