"""Typed equipment shards (Mảnh Pháp Bảo, Pháp Trận, Hộ Thuẫn, Thú Hồn, Bước Chân,
Mặt Nạ, Nhẫn, Thần Binh). Kept in a server table, never in the player JSON, so saves cannot
forge them. They drop rarely (rift bosses, elites, Ma Quật chests, daily quests,
Kỳ Trân Các) and are exchanged with any sect master (Trưởng môn) for gear."""
import json
import math
import secrets
import time

import equipment

KINDS = {
    'phapbao': dict(name='Mảnh Pháp Bảo', icon='Item/PhapBao/1.png', weight=18),
    'phaptran': dict(name='Mảnh Pháp Trận', icon='Item/PhapTran/1.png', weight=18),
    'hothuan': dict(name='Mảnh Hộ Thuẫn', icon='Item/Thuan/1.png', weight=18),
    'buocchan': dict(name='Mảnh Bước Chân', icon='Item/DiChuyen/1.png', weight=14),
    'matna': dict(name='Mảnh Mặt Nạ', icon='Item/MatNa/slot.svg', weight=14),
    'nhan': dict(name='Mảnh Nhẫn', icon='Item/Nhan/gioi.png', weight=10),
    'thuhon': dict(name='Thú Hồn', icon='Character/Monsters/Soi/thumb.webp', weight=8),
    'thanbinh': dict(name='Mảnh Thần Binh', icon='Item/VuKhi/Forms/manh-than-binh.png', weight=8),
}
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
    """Rare drops from a kill (called by adventure.record_kill). Returns {kind: qty}."""
    scene = mob.get('map', '')
    if mob.get('tower') or mob.get('raid') or mob.get('outpost') or mob.get('worldBoss'):
        return {}
    if scene.startswith('rift-'):
        if mob.get('boss'):
            got = grant_random(db, uid, 2 + secrets.randbelow(2))
            if secrets.randbelow(100) < 30:
                add(db, uid, 'thuhon', 1)
                got['thuhon'] = got.get('thuhon', 0) + 1
            return got
        return grant_random(db, uid, 1) if secrets.randbelow(1000) < 20 else {}
    if scene.startswith('field-'):
        elite = mob.get('elite') or mob.get('boss') or mob.get('t') == 2
        chance = 40 if elite else (4 if mob.get('level', 1) >= 10 else 0)
        return grant_random(db, uid, 1) if chance and secrets.randbelow(1000) < chance else {}
    return {}


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
    return dict(wallet=w, kinds={k: dict(name=v['name'], icon=v['icon']) for k, v in KINDS.items()}, offers=rows)


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
