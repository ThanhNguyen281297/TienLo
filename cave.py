"""Động phủ: each player's private cave garden and spirit beast (server-owned).

- Ruộng linh dược: plots grow seeds on the server clock, so crops ripen while offline.
  Linh Thảo seeds are free; Huyết Sâm seeds cost Linh Thạch; Ngọc Linh Chi seeds come from
  the guild shop (and sometimes from a Huyết Sâm harvest) and yield Thăng Vị Đan.
- Linh tuyền: once a day, water the garden to cut 30 minutes off every growing plot.
- Tụ Linh Thú: gathers Linh Thạch every hour, up to 12 hours (offline income); feed it
  Linh Nguyên and Linh Thạch to level it up.
"""
import json
import secrets
import time

import adventure
import engagement

SEEDS = {
    'linhthao': dict(name='Linh Thảo', grow=3600, price=0, reward={'essence': 25, 'gold': 120}, xp=60),
    'huyetsam': dict(name='Huyết Sâm', grow=4 * 3600, price=300, reward={'essence': 90, 'gold': 300}, xp=240, bonusSeed=.15),
    'ngocchi': dict(name='Ngọc Linh Chi', grow=10 * 3600, price=None, reward={'essence': 150, 'shards': 3}, xp=500, thangViDan=1),
}
START_PLOTS, MAX_PLOTS = 3, 6
PLOT_PRICE = {4: 2000, 5: 5000, 6: 12000}
WATER_CUT = 1800
BEAST_CAP_HOURS = 12
BEAST_MAX = 10


def beast_rate(level):
    return 60 + 30 * level                      # Linh Thạch per hour


def beast_cost(level):
    return dict(essence=80 * level, gold=400 * level)


def init_db(db):
    db.execute('CREATE TABLE IF NOT EXISTS caves(user_id INTEGER PRIMARY KEY,data TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS cave_ops(user_id INTEGER NOT NULL,id TEXT NOT NULL,PRIMARY KEY(user_id,id))')


def load(db, uid, at=None):
    now = time.time() if at is None else at
    row = db.execute('SELECT data FROM caves WHERE user_id=?', (uid,)).fetchone()
    if row:
        return json.loads(row['data'])
    return dict(plots=[None] * START_PLOTS, seeds={'huyetsam': 0, 'ngocchi': 0}, beast=dict(level=1, since=now), watered='')


def store(db, uid, cave):
    db.execute('INSERT INTO caves VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data', (uid, json.dumps(cave)))


def add_seeds(db, uid, seeds):
    cave = load(db, uid)
    for kind, qty in seeds.items():
        if kind in SEEDS and kind != 'linhthao':
            cave['seeds'][kind] = min(999, cave['seeds'].get(kind, 0) + int(qty))
    store(db, uid, cave)


def beast_stock(cave, now):
    b = cave['beast']
    hours = min(BEAST_CAP_HOURS, max(0, now - b['since']) / 3600)
    return int(hours * beast_rate(b['level']))


def view(db, uid, at=None):
    now = time.time() if at is None else at
    cave = load(db, uid, now)
    plots = []
    for i, p in enumerate(cave['plots']):
        if not p:
            plots.append(dict(index=i, empty=True))
            continue
        seed = SEEDS[p['seed']]
        left = max(0, p['ready'] - now)
        plots.append(dict(index=i, seed=p['seed'], name=seed['name'], left=round(left), total=seed['grow'], ripe=left <= 0))
    b = cave['beast']
    nxt = len(cave['plots']) + 1
    return dict(
        plots=plots, seeds=dict(cave['seeds'], linhthao=None),
        catalog={k: dict(name=v['name'], grow=v['grow'], price=v['price'], reward=v['reward'], xp=v['xp'], thangViDan=v.get('thangViDan', 0)) for k, v in SEEDS.items()},
        nextPlot=dict(index=nxt, price=PLOT_PRICE[nxt]) if nxt <= MAX_PLOTS else None,
        watered=cave.get('watered') == engagement.today(now), waterCut=WATER_CUT,
        beast=dict(level=b['level'], max=BEAST_MAX, rate=beast_rate(b['level']), stock=beast_stock(cave, now),
                   cap=BEAST_CAP_HOURS * beast_rate(b['level']), cost=beast_cost(b['level']) if b['level'] < BEAST_MAX else None,
                   full=now - b['since'] >= BEAST_CAP_HOURS * 3600))


def _harvest(db, uid, player, cave, plot, now):
    seed = SEEDS[plot['seed']]
    reward = dict(seed['reward'])
    world = player.setdefault('world', {})
    engagement.grant(db, uid, player, reward)
    adventure.gain(player, seed['xp'])
    got = [f"{seed['name']}: +{reward.get('essence', 0)} Linh Nguyên"]
    if reward.get('gold'):
        got.append(f"+{reward['gold']} Linh Thạch")
    if seed.get('thangViDan'):
        world['thangViDan'] = int(world.get('thangViDan', 0)) + seed['thangViDan']
        got.append(f"+{seed['thangViDan']} Thăng Vị Đan")
    if reward.get('shards'):
        got.append(f"+{reward['shards']} mảnh trang bị")
    if seed.get('bonusSeed') and secrets.randbelow(1000) < seed['bonusSeed'] * 1000:
        cave['seeds']['ngocchi'] = cave['seeds'].get('ngocchi', 0) + 1
        got.append('+1 Hạt Ngọc Linh Chi')
    return got


def action(db, uid, body, at=None):
    now = time.time() if at is None else at
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    player = json.loads(row['player'])
    opid = body.get('opId')
    if not isinstance(opid, str) or not 8 <= len(opid) <= 100:
        raise ValueError('Thiếu mã giao dịch.')
    if db.execute('SELECT 1 FROM cave_ops WHERE user_id=? AND id=?', (uid, opid)).fetchone():
        return dict(character=dict(id=row['id'], player=player, revision=row['revision']), cave=view(db, uid, now))
    if body.get('revision') != row['revision']:
        return dict(conflict=True, error='Nhân vật đã thay đổi. Hãy thử lại.')
    cave = load(db, uid, now)
    op = body.get('action')
    index = body.get('index')
    message = ''
    if op == 'plant':
        kind = body.get('seed')
        if kind not in SEEDS:
            raise ValueError('Hạt giống không hợp lệ.')
        if type(index) is not int or not 0 <= index < len(cave['plots']) or cave['plots'][index]:
            raise ValueError('Ô ruộng không trống.')
        seed = SEEDS[kind]
        if kind == 'huyetsam' and cave['seeds'].get(kind, 0) <= 0:
            if player.get('gold', 0) < seed['price']:
                raise ValueError(f"Cần {seed['price']} Linh Thạch để mua hạt {seed['name']}.")
            player['gold'] -= seed['price']
        elif kind == 'huyetsam':
            cave['seeds'][kind] -= 1
        elif kind == 'ngocchi':
            if cave['seeds'].get(kind, 0) <= 0:
                raise ValueError('Chưa có Hạt Ngọc Linh Chi. Đổi ở cửa hàng tông môn.')
            cave['seeds'][kind] -= 1
        cave['plots'][index] = dict(seed=kind, planted=now, ready=now + seed['grow'])
        message = f"Đã gieo {seed['name']}."
    elif op in ('harvest', 'harvest_all'):
        targets = range(len(cave['plots'])) if op == 'harvest_all' else [index]
        got = []
        for i in targets:
            if type(i) is not int or not 0 <= i < len(cave['plots']):
                raise ValueError('Ô ruộng không hợp lệ.')
            plot = cave['plots'][i]
            if not plot or plot['ready'] > now:
                if op == 'harvest':
                    raise ValueError('Linh dược chưa chín.')
                continue
            got += _harvest(db, uid, player, cave, plot, now)
            cave['plots'][i] = None
        if not got:
            raise ValueError('Chưa có linh dược nào chín.')
        message = ' · '.join(got)
    elif op == 'water':
        today = engagement.today(now)
        if cave.get('watered') == today:
            raise ValueError('Hôm nay đã tưới linh tuyền.')
        if not any(cave['plots']):
            raise ValueError('Hãy gieo hạt trước khi tưới.')
        for p in cave['plots']:
            if p:
                p['ready'] = max(now, p['ready'] - WATER_CUT)
        cave['watered'] = today
        message = 'Linh tuyền thấm đất: mọi ô ruộng chín sớm 30 phút.'
    elif op == 'unlock':
        nxt = len(cave['plots']) + 1
        if nxt > MAX_PLOTS:
            raise ValueError('Động phủ đã mở đủ ô ruộng.')
        if player.get('gold', 0) < PLOT_PRICE[nxt]:
            raise ValueError(f'Cần {PLOT_PRICE[nxt]} Linh Thạch.')
        player['gold'] -= PLOT_PRICE[nxt]
        cave['plots'].append(None)
        message = f'Đã khai hoang ô ruộng thứ {nxt}.'
    elif op == 'collect':
        stock = beast_stock(cave, now)
        if stock <= 0:
            raise ValueError('Tụ Linh Thú chưa gom được Linh Thạch.')
        engagement.grant(db, uid, player, {'gold': stock})
        cave['beast']['since'] = now
        message = f'Tụ Linh Thú dâng {stock} Linh Thạch.'
    elif op == 'feed':
        level = cave['beast']['level']
        if level >= BEAST_MAX:
            raise ValueError('Tụ Linh Thú đã đạt cấp tối đa.')
        cost = beast_cost(level)
        world = player.setdefault('world', {})
        if world.get('essence', 0) < cost['essence'] or player.get('gold', 0) < cost['gold']:
            raise ValueError(f"Cần {cost['essence']} Linh Nguyên và {cost['gold']} Linh Thạch.")
        # Pay out what it has gathered at the old rate first.
        stock = beast_stock(cave, now)
        world['essence'] -= cost['essence']
        player['gold'] = player['gold'] - cost['gold'] + stock
        cave['beast'] = dict(level=level + 1, since=now)
        message = f'Tụ Linh Thú lên cấp {level + 1}' + (f' · nhận {stock} Linh Thạch đã gom' if stock else '') + '.'
    else:
        raise ValueError('Thao tác không hợp lệ.')
    store(db, uid, cave)
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?', (json.dumps(player, ensure_ascii=False), revision, int(now), uid))
    db.execute('INSERT INTO cave_ops VALUES(?,?)', (uid, opid))
    return dict(character=dict(id=row['id'], player=player, revision=revision), cave=view(db, uid, now), message=message)
