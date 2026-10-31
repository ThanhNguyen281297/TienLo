"""Typed equipment shards (Mảnh Pháp Bảo, Pháp Trận, Hộ Thuẫn, Thú Hồn, Bước Chân,
Mặt Nạ, Nhẫn, Thần Binh). Kept in a server table, never in the player JSON, so saves cannot
forge them. Each activity pays its own kind (see SOURCE): battleground → Hộ Thuẫn, bí cảnh →
Bước Chân, party raid → Pháp Bảo, tower → Pháp Trận, quests → Mặt Nạ, guild war →
Nhẫn, hunting fields → Thú Hồn, world boss → Thần Binh. Kỳ Trân Các and welfare
chests still give random kinds. Exchanged with any sect master (Trưởng môn) for gear."""
import json
import math
import secrets
import time

import equipment

KINDS = {
    'phapbao': dict(name='Mảnh Pháp Bảo', icon='Item/PhapBao/1.png', weight=18, source='Bí cảnh tổ đội · Huyết Trì Ma Quật'),
    'phaptran': dict(name='Mảnh Pháp Trận', icon='Item/PhapTran/1.png', weight=18, source='Tháp thí luyện · mỗi tầng qua trong ngày'),
    'hothuan': dict(name='Mảnh Hộ Thuẫn', icon='Item/Thuan/1.png', weight=18, source='Chiến trường Chính – Tà'),
    'buocchan': dict(name='Mảnh Bước Chân', icon='Item/DiChuyen/1.png', weight=14, source='Bí cảnh · yêu thú và thủ lĩnh'),
    'matna': dict(name='Mảnh Mặt Nạ', icon='Item/MatNa/slot.svg', weight=14, source='Nhiệm vụ · hằng ngày, chính tuyến, phụ tuyến'),
    'nhan': dict(name='Mảnh Nhẫn', icon='Item/Nhan/gioi.png', weight=10, source='Tông môn chiến · chiếm cứ điểm'),
    'thuhon': dict(name='Thú Hồn', icon='Character/Monsters/Soi/thumb.webp', weight=8, source='Bãi săn · tinh anh và thủ lĩnh'),
    'thanbinh': dict(name='Mảnh Thần Binh', icon='Item/VuKhi/Forms/manh-than-binh.png', weight=8, source='Boss thế giới · Thái Cổ Huyết Ma'),
}
# Every activity pays its own shard, so each piece of gear has one place to farm it.
SOURCE = dict(battle='hothuan', rift='buocchan', raid='phapbao', tower='phaptran', quest='matna', outpost='nhan', field='thuhon', boss='thanbinh')
SECT_MAPS = ('sword', 'moon', 'thunder', 'mystic')
MASTER = (910, 1125)   # mentor NPC position in every sect map (js/20-sect-layout-arena.js)

# Pet exchange costs (Thú Hồn).
PET_COST = {'duong-lang': 10, 'nguyet-tho': 10, 'doc-thiem': 15, 'huyet-nhen': 20, 'bang-doi': 20, 'bang-lang': 40, 'loi-te': 80, 'diem-hat': 80,
            'thuy-long': 160, 'phan-phuong': 200, 'cot-long': 300}


def catalog():
    """All exchange offers: id, shard kind, cost and what is granted."""
    T = equipment.RULES
    offers = []
    for t in T['backs']:
        if not t['id'].startswith('mythic-'):
            offers.append(dict(id=t['id'], kind='phapbao', cost=60 if t['rarity'] == 'huyen' else 120))
    for t in T['formations']:
        if not t['id'].startswith('mythic-'):
            offers.append(dict(id=t['id'], kind='phaptran', cost=40))
    for t in T['shields']:
        if not t['id'].startswith('mythic-'):
            offers.append(dict(id=t['id'], kind='hothuan', cost={'huyen': 50, 'linh': 100, 'tien': 160, 'than': 240}.get(t['rarity'], 100)))
    # Thần binh: per-class divine weapons (Item/equipment.json, source 'thanbinh').
    for t in T['classGear']:
        if t.get('source') == 'thanbinh':
            offers.append(dict(id=t['id'], kind='thanbinh', cost=120 if t['req'] < 90 else 240))
    for n, t in enumerate(T['trails']):
        offers.append(dict(id=t['id'], kind='buocchan', cost=60 + n * 10))
    for t in T['masks']:
        offers.append(dict(id=t['id'], kind='matna', cost=50))
    for t, cost in zip([t for t in T['rings'] if not t['id'].startswith('mythic-')], (20, 50, 100, 180)):
        offers.append(dict(id=t['id'], kind='nhan', cost=cost))
    for pid, cost in PET_COST.items():
        offers.append(dict(id='pet-' + pid, kind='thuhon', cost=cost, pet=pid))
    return offers


OFFERS = {o['id']: o for o in catalog()}


def init_db(db):
    db.execute('CREATE TABLE IF NOT EXISTS shard_wallet(user_id INTEGER NOT NULL,kind TEXT NOT NULL,qty INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,kind))')
    db.execute('CREATE TABLE IF NOT EXISTS shard_ops(user_id INTEGER NOT NULL,id TEXT NOT NULL,PRIMARY KEY(user_id,id))')


def wallet(db, uid):
    have = {r['kind']: r['qty'] for r in db.execute('SELECT kind,qty FROM shard_wallet WHERE user_id=?', (uid,))}
    return {k: int(have.get(k, 0)) for k in KINDS}


def add(db, uid, kind, qty):
    if kind not in KINDS or qty <= 0:
        return
    db.execute('INSERT INTO shard_wallet VALUES(?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET qty=MIN(99999,qty+excluded.qty)', (uid, kind, int(qty)))


def spend(db, uid, kind, qty):
    return db.execute('UPDATE shard_wallet SET qty=qty-? WHERE user_id=? AND kind=? AND qty>=?', (qty, uid, kind, qty)).rowcount == 1


def random_kind(rng=secrets.randbelow):
    total = sum(k['weight'] for k in KINDS.values())
    roll = rng(total)
    for kind, meta in KINDS.items():
        roll -= meta['weight']
        if roll < 0:
            return kind
    return 'phapbao'


def grant_random(db, uid, count):
    """`count` shards of random kinds. Returns {kind: qty}."""
    got = {}
    for _ in range(max(0, int(count))):
        kind = random_kind()
        got[kind] = got.get(kind, 0) + 1
    for kind, qty in got.items():
        add(db, uid, kind, qty)
    return got


def on_kill(db, uid, mob):
    """Drops from a kill (called for every certified kill). Returns {kind: qty}.
    Bí cảnh pays Mảnh Bước Chân, the hunting fields pay Thú Hồn; party raid, tower,
    battleground, guild war and world boss pay through their own rewards."""
    scene = mob.get('map', '')
    if mob.get('tower') or mob.get('raid') or mob.get('outpost') or mob.get('worldBoss'):
        return {}
    got = {}
    if scene.startswith('rift-'):
        kind = SOURCE['rift']
        if mob.get('boss'):
            got[kind] = 3 + secrets.randbelow(3)
        elif (mob.get('elite') or mob.get('t') == 2) and secrets.randbelow(100) < 25:
            got[kind] = 1
        elif secrets.randbelow(1000) < 40:
            got[kind] = 1
    elif scene.startswith('field-'):
        kind = SOURCE['field']
        if mob.get('boss'):
            got[kind] = 2
        elif mob.get('elite') or mob.get('t') == 2:
            got[kind] = 1 if secrets.randbelow(100) < 6 else 0
        elif mob.get('level', 1) >= 10 and secrets.randbelow(1000) < 5:
            got[kind] = 1
    got = {k: q for k, q in got.items() if q}
    for kind, qty in got.items():
        add(db, uid, kind, qty)
    return got


def battle_reward(score, rank, won):
    """Mảnh Hộ Thuẫn for a battleground result."""
    qty = 4 + min(8, int(score) // 40)
    if won:
        qty = qty * 3 // 2
    if rank <= 3:
        qty += (8, 5, 3)[rank - 1]
    return {SOURCE['battle']: qty}


def raid_reward(level):
    """Mảnh Pháp Bảo in the party raid chest."""
    return {SOURCE['raid']: 5 + level // 15}


def tower_reward(floor):
    """Mảnh Pháp Trận for the first clear of a floor each day."""
    return {SOURCE['tower']: 1 + floor // 10 + (2 if floor % 5 == 0 else 0)}


def quest_reward(kind):
    """Mảnh Mặt Nạ for every quest handed in (daily quests pay more)."""
    return {SOURCE['quest']: 2 if kind == 'daily' else 1}


def outpost_reward():
    return {SOURCE['outpost']: 6}


def boss_reward(rank):
    """Mảnh Thần Binh from the world boss, by damage rank (1-based)."""
    return {SOURCE['boss']: (10, 8, 6, 5, 5, 4, 4, 3, 3, 3)[rank - 1] if rank <= 10 else 2}


def grant(db, uid, got):
    for kind, qty in got.items():
        add(db, uid, kind, qty)
    return got


def view(db, uid, player):
    w = wallet(db, uid)
    cls = player['ap']['w']
    gender = player['ap'].get('gender', 'Nam')
    import pets
    owned = pets.data(player)['owned']
    rows = []
    for o in OFFERS.values():
        meta = equipment.TEMPLATES[o['id']]
        if meta.get('gender') and meta['gender'] != gender:
            continue
        rows.append(dict(o, name=meta['name'], rarity=meta.get('rarity'), slot=meta.get('slot'), req=meta.get('req', 0),
                         owned=bool(o.get('pet') and o['pet'] in owned), forClass=meta.get('classIndex') in (None, cls)))
    return dict(wallet=w, kinds={k: dict(name=v['name'], icon=v['icon'], source=v['source']) for k, v in KINDS.items()}, offers=rows)


def action(db, uid, body):
    import adventure
    import pets
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    if not row:
        raise ValueError('Hãy tạo nhân vật trước.')
    player = json.loads(row['player'])
    opid = body.get('opId')
    if not isinstance(opid, str) or not 8 <= len(opid) <= 100:
        raise ValueError('Thiếu mã giao dịch.')
    if db.execute('SELECT 1 FROM shard_ops WHERE user_id=? AND id=?', (uid, opid)).fetchone():
        return dict(character=dict(id=row['id'], player=player, revision=row['revision']), shards=view(db, uid, player))
    if body.get('revision') != row['revision']:
        return dict(conflict=True, error='Nhân vật đã thay đổi. Hãy thử lại.')
    if body.get('action') != 'exchange':
        raise ValueError('Thao tác không hợp lệ.')
    w = player.get('world', {})
    if w.get('map') not in SECT_MAPS or math.hypot(player.get('x', 0) - MASTER[0], player.get('y', 0) - MASTER[1]) > 160:
        raise ValueError('Hãy tới gặp Trưởng môn ở một tông môn để đổi mảnh.')
    offer = OFFERS.get(body.get('id'))
    if not offer:
        raise ValueError('Vật phẩm không có trong danh sách đổi.')
    meta = equipment.TEMPLATES[offer['id']]
    if meta.get('gender') and meta['gender'] != player['ap'].get('gender', 'Nam'):
        raise ValueError('Mặt nạ không phù hợp giới tính.')
    if offer.get('pet') and offer['pet'] in pets.data(player)['owned']:
        raise ValueError('Bạn đã sở hữu linh thú này.')
    if len(w.get('bag', [])) >= equipment.capacity(w) and not (offer.get('pet') and not (w.get('equip') or {}).get('linhthu')):
        raise ValueError('Túi đầy. Dọn một ô trước khi đổi.')
    if not spend(db, uid, offer['kind'], offer['cost']):
        raise ValueError(f"Chưa đủ {KINDS[offer['kind']]['name']} ({offer['cost']}).")
    if offer.get('pet'):
        message = pets.grant(player, offer['pet'])
    else:
        adventure.grant_item(db, uid, player, offer['id'])
        message = f"Đã đổi {meta['name']}."
    equipment.validate(player, db, uid)
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?', (json.dumps(player, ensure_ascii=False), revision, int(time.time()), uid))
    db.execute('INSERT INTO shard_ops VALUES(?,?)', (uid, opid))
    return dict(character=dict(id=row['id'], player=player, revision=revision), shards=view(db, uid, player), message=message)


def describe(got):
    return ' · '.join(f"{q} {KINDS[k]['name']}" for k, q in got.items() if q)
