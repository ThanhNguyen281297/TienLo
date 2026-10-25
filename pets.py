"""Linh thú (pets). Ownership and tiers live in player['world']['petBook'] and are
written only by the server (saves copy the stored value back). Each owned pet also
exists as a bound item ('pet-<id>', slot 'linhthu'); the one worn in the Linh thú
gear slot follows the player, casts its skill (Item/pet-skills.json) and gives flat
HP/attack. Pets are bought and raised at the Ngự Thú Sư in Thiên Vân Thành.

The former mounts (Thú cưỡi) are now pets; `sync` migrates old saves once:
world.mounts / mount items, the old client-side pet list and pet eggs."""
import json
import secrets
import time

import equipment

PETS = [
    dict(id='duong-lang', name='Linh Đường Lang', species='BoNgua', level=1, gold=1000, hp=20, atk=3, rarity='pham',
         desc='Bọ ngựa linh tính, lưỡi liềm sắc bén.'),
    dict(id='nguyet-tho', name='Nguyệt Thố', species='Tho', level=1, gold=1000, hp=40, atk=1, rarity='pham',
         desc='Thỏ ngọc dưới trăng, chuyên hồi phục cho chủ nhân.'),
    dict(id='huyet-nhen', name='Huyết Nhện', species='Nhen', level=8, gold=3000, hp=40, atk=4, rarity='huyen',
         desc='Nhện máu giăng tơ độc.'),
    dict(id='bang-doi', name='Băng Dực Dơi', species='Doi', level=8, gold=3000, hp=50, atk=4, rarity='huyen',
         desc='Dơi cánh băng, thổi hàn khí làm chậm địch.'),
    dict(id='doc-thiem', name='Độc Giác Thiềm', species='Ech', level=5, gold=1500, hp=30, atk=2, rarity='pham',
         desc='Cóc độc giáp gai, chậm rãi nhưng bền bỉ.'),
    dict(id='bang-lang', name='Hàn Băng Lang', species='Soi', level=15, gold=8000, hp=80, atk=5, rarity='huyen',
         desc='Sói băng phương Bắc, gầm lên đóng băng cả bầy địch.'),
    dict(id='loi-te', name='Lôi Giác Tê', species='TeGiac', level=25, gold=30000, hp=160, atk=9, rarity='linh',
         desc='Tê giác mang lôi điện, giáp dày như tường thành.'),
    dict(id='diem-hat', name='Xích Diệm Hạt', species='BoCap', level=25, fragments=120, hp=140, atk=12, rarity='linh',
         desc='Bọ cạp lửa, đổi bằng mảnh linh khí.'),
    dict(id='thuy-long', name='Huyền Thủy Long', species='RongNuoc', level=35, gold=90000, hp=260, atk=16, rarity='tien',
         desc='Rồng nước cuộn sóng, che chở và hồi phục cho chủ nhân.'),
    dict(id='phan-phuong', name='Phần Thiên Phượng', species='PhuongHoang', level=40, fragments=400, hp=320, atk=22, rarity='tien',
         desc='Phượng hoàng lửa, linh thú của bậc đại năng.'),
    dict(id='cot-long', name='Cốt Long Minh Vương', species='RongXuong', level=30, hp=360, atk=26, rarity='than',
         source='Rơi từ rương Huyết Trì Ma Quật (3%) hoặc đổi Thú Hồn.',
         desc='Cốt long lửa xanh, chỉ những tổ đội phá Ma Quật mới có cơ duyên thu phục.'),
]
BY_ID = {p['id']: p for p in PETS}
BY_SPECIES = {p['species']: p for p in PETS}
MAX_TIER = 5
DUPLICATE_GOLD = 20000          # a raid drop of a pet you already own becomes Linh Thạch
SLOT = 'linhthu'


def item_id(pid):
    return 'pet-' + pid


def data(player):
    """The stored pet record, normalised (never trusts unknown ids)."""
    raw = player.get('world', {}).get('petBook')
    owned = {}
    if isinstance(raw, dict) and isinstance(raw.get('owned'), dict):
        for pid, tier in raw['owned'].items():
            if pid in BY_ID and type(tier) is int:
                owned[pid] = max(1, min(MAX_TIER, tier))
    worn = (player.get('world', {}).get('equip') or {}).get(SLOT)
    active = worn.get('petId') if isinstance(worn, dict) else None
    return dict(owned=owned, active=active if active in owned else None)


def store(player, record):
    player.setdefault('world', {})['petBook'] = dict(owned=record['owned'])


def located(player, pid):
    """'equip', 'bag' or None: where the bound item of an owned pet is."""
    w = player.get('world', {})
    worn = (w.get('equip') or {}).get(SLOT)
    if isinstance(worn, dict) and worn.get('id') == item_id(pid):
        return 'equip'
    if any(isinstance(i, dict) and i.get('id') == item_id(pid) for i in w.get('bag', [])):
        return 'bag'
    return None


def new_item(pid, uid=None):
    return dict(equipment.TEMPLATES[item_id(pid)], uid=uid or secrets.token_hex(16))


def give_item(player, pid, wear=False):
    """Put the bound item of an owned pet into the bag (or straight into the slot)."""
    w = player.setdefault('world', {})
    equip, bag = w.setdefault('equip', {}), w.setdefault('bag', [])
    item = new_item(pid)
    if wear and not equip.get(SLOT):
        equip[SLOT] = item
        return item
    if len(bag) >= equipment.capacity(w):
        raise ValueError('Túi đầy. Dọn một ô để nhận linh thú.')
    bag.append(item)
    return item


OLD_SPECIES = {'BoNgua': 'duong-lang', 'Tho': 'nguyet-tho', 'Nhen': 'huyet-nhen', 'Doi': 'bang-doi'}


def sync(player):
    """One-time migration from mounts and the old client pet list. True when changed."""
    w = player.get('world')
    if not isinstance(w, dict):
        return False
    legacy = any(k in w for k in ('mounts', 'pets', 'activePet', 'hatching')) or 'thucuoi' in (w.get('equip') or {}) \
        or any(isinstance(i, dict) and (i.get('type') == 'egg' or str(i.get('id', '')).startswith('mount-')) for i in w.get('bag', []))
    if not legacy:
        return False
    owned = dict(data(player)['owned'])
    old = w.get('mounts')
    if isinstance(old, dict) and isinstance(old.get('owned'), dict):
        for pid, tier in old['owned'].items():
            if pid in BY_ID and type(tier) is int:
                owned[pid] = max(owned.get(pid, 1), max(1, min(MAX_TIER, tier)))
    equip = w.setdefault('equip', {})
    bag = w.setdefault('bag', [])
    worn = equip.pop('thucuoi', None)
    # Mount items keep their uid and become pet items.
    for item in [worn] + bag:
        if isinstance(item, dict) and str(item.get('id', '')).startswith('mount-'):
            pid = item['id'][6:]
            if pid in BY_ID:
                owned.setdefault(pid, 1)
                uid = item.get('uid') or secrets.token_hex(16)
                item.clear()
                item.update(new_item(pid, uid=uid))
    if isinstance(worn, dict) and worn.get('slot') == SLOT and not equip.get(SLOT):
        equip[SLOT] = worn
    bag[:] = [i for i in bag if not (isinstance(i, dict) and i.get('slot') == 'thucuoi')]
    # Old companions and unhatched eggs become owned pets.
    active_species = None
    for pet in w.get('pets') or []:
        if isinstance(pet, dict) and pet.get('species') in OLD_SPECIES:
            owned.setdefault(OLD_SPECIES[pet['species']], 1)
            if pet.get('id') == w.get('activePet'):
                active_species = pet['species']
    for item in list(bag):
        if isinstance(item, dict) and item.get('type') == 'egg':
            bag.remove(item)
            if item.get('species') in OLD_SPECIES:
                owned.setdefault(OLD_SPECIES[item['species']], 1)
    hatch = w.get('hatching')
    if isinstance(hatch, dict) and hatch.get('species') in OLD_SPECIES:
        owned.setdefault(OLD_SPECIES[hatch['species']], 1)
    for key in ('mounts', 'pets', 'activePet', 'hatching'):
        w.pop(key, None)
    store(player, dict(owned=owned))
    equip.setdefault(SLOT, None)
    # Every owned pet gets its item once; the previously active one is worn.
    prefer = OLD_SPECIES.get(active_species) or (old.get('active') if isinstance(old, dict) else None)
    for pid in sorted(owned, key=lambda p: p != prefer):
        if located(player, pid):
            continue
        try:
            give_item(player, pid, wear=True)
        except ValueError:
            break       # bag full: Ngự Thú Sư hands it out later
    return True


def preserve(old, new):
    """Called on every client save: the pet record is server-owned."""
    world = new.setdefault('world', {})
    stored = old.get('world', {}).get('petBook') if old is not None else None
    if stored:
        world['petBook'] = dict(stored)
    else:
        world.pop('petBook', None)
    for key in ('mounts', 'pets', 'activePet', 'hatching'):   # retired client-side fields
        world.pop(key, None)


def tier_mult(tier):
    return 1 + .3 * (tier - 1)


def bonus(player):
    """Flat stats of the worn pet (counted by player_attack / player_max_hp)."""
    record = data(player)
    pid = record['active']
    if not pid:
        return dict(hp=0, atk=0)
    p, mult = BY_ID[pid], tier_mult(record['owned'][pid])
    return dict(hp=round(p['hp'] * mult), atk=round(p['atk'] * mult))


def upgrade_cost(pid, tier):
    rank = 1 + sorted(BY_ID[x]['hp'] for x in BY_ID).index(BY_ID[pid]['hp'])
    return 2500 * tier * rank


def grant(player, pid):
    """Give a pet (raid chest, shard exchange). Returns a message; duplicates become gold."""
    record = data(player)
    if pid in record['owned']:
        player['gold'] = min(10 ** 9, player.get('gold', 0) + DUPLICATE_GOLD)
        return f'Đã có {BY_ID[pid]["name"]}: đổi thành {DUPLICATE_GOLD} ◈'
    record['owned'][pid] = 1
    store(player, record)
    try:
        give_item(player, pid, wear=True)
    except ValueError:
        return f'Thu phục {BY_ID[pid]["name"]}! Túi đầy: nhận tại Ngự Thú Sư.'
    return f'Thu phục {BY_ID[pid]["name"]}!'


def peer_pet(player):
    """What other players see following this player."""
    pid = data(player)['active']
    return dict(id=pid, species=BY_ID[pid]['species'], name=BY_ID[pid]['name']) if pid else None


def view(player, wallet_fragments=0):
    import progression
    record = data(player)
    level = progression.level(player)
    rows = []
    for p in PETS:
        tier = record['owned'].get(p['id'])
        mult = tier_mult(tier or 1)
        rows.append(dict(id=p['id'], name=p['name'], species=p['species'], level=p['level'], desc=p['desc'], rarity=p['rarity'],
                         gold=p.get('gold'), fragments=p.get('fragments'), source=p.get('source'),
                         owned=tier is not None, tier=tier or 0, active=record['active'] == p['id'], where=located(player, p['id']) if tier else None,
                         hp=round(p['hp'] * mult), atk=round(p['atk'] * mult),
                         nextHp=round(p['hp'] * tier_mult(tier + 1)) if tier and tier < MAX_TIER else None,
                         nextAtk=round(p['atk'] * tier_mult(tier + 1)) if tier and tier < MAX_TIER else None,
                         upgrade=upgrade_cost(p['id'], tier) if tier and tier < MAX_TIER else None,
                         locked=level < p['level']))
    return dict(pets=rows, active=record['active'], maxTier=MAX_TIER, gold=player.get('gold', 0),
                fragments=wallet_fragments, level=level)


def init_db(db):
    db.execute('CREATE TABLE IF NOT EXISTS mount_ops(user_id INTEGER NOT NULL,id TEXT NOT NULL,PRIMARY KEY(user_id,id))')


def action(db, uid, body, at=None):
    import adventure
    import progression
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    if not row:
        raise ValueError('Hãy tạo nhân vật trước.')
    player = json.loads(row['player'])
    op, opid = body.get('action'), body.get('opId')
    if not isinstance(op, str) or not isinstance(opid, str) or not 8 <= len(opid) <= 100:
        raise ValueError('Thao tác không hợp lệ.')
    fragments = lambda: int(adventure.wallet(db, uid)['fragments'])
    if db.execute('SELECT 1 FROM mount_ops WHERE user_id=? AND id=?', (uid, opid)).fetchone():
        return dict(character=dict(id=row['id'], player=player, revision=row['revision']), stable=view(player, fragments()))
    if body.get('revision') != row['revision']:
        return dict(conflict=True, error='Nhân vật đã thay đổi. Hãy thử lại.')
    record = data(player)
    p = BY_ID.get(body.get('id'))
    if op != 'unequip' and not p:
        raise ValueError('Linh thú không tồn tại.')
    w = player['world']
    equip, bag = w.setdefault('equip', {}), w.setdefault('bag', [])
    if op == 'buy':
        if p['id'] in record['owned']:
            raise ValueError('Bạn đã sở hữu linh thú này.')
        if progression.level(player) < p['level']:
            raise ValueError(f'Cần đạt cấp {p["level"]}.')
        if p.get('gold'):
            if player.get('gold', 0) < p['gold']:
                raise ValueError('Không đủ Linh Thạch.')
            player['gold'] -= p['gold']
        elif p.get('fragments'):
            if not adventure.spend_fragments(db, uid, p['fragments']):
                raise ValueError('Không đủ mảnh linh khí.')
        else:
            raise ValueError('Linh thú này chỉ có thể thu phục trong Ma Quật hoặc đổi Thú Hồn.')
        record['owned'][p['id']] = 1
        store(player, record)
        worn = bool(equip.get(SLOT))
        give_item(player, p['id'], wear=not worn)
        message = f'Đã thu phục {p["name"]}!' + (' Đã xuất chiến trong ô Linh thú.' if not worn else ' Vật phẩm đã vào túi đồ.')
    elif op == 'equip':
        if p['id'] not in record['owned']:
            raise ValueError('Chưa sở hữu linh thú này.')
        if located(player, p['id']) != 'equip':
            item = next((i for i in bag if i.get('id') == item_id(p['id'])), None)
            if item:
                bag.remove(item)
            else:
                item = new_item(p['id'])
            current = equip.get(SLOT)
            if current:
                if len(bag) >= equipment.capacity(w):
                    raise ValueError('Túi đầy. Dọn một ô để đổi linh thú.')
                current.pop('cell', None)
                bag.append(current)
            item.pop('cell', None)
            equip[SLOT] = item
        message = f'{p["name"]} xuất chiến.'
    elif op == 'unequip':
        current = equip.get(SLOT)
        if current:
            if len(bag) >= equipment.capacity(w):
                raise ValueError('Túi đầy. Dọn một ô để thu hồi linh thú.')
            equip[SLOT] = None
            current.pop('cell', None)
            bag.append(current)
        message = 'Đã thu hồi linh thú (vật phẩm ở túi đồ).'
    elif op == 'take':
        if p['id'] not in record['owned']:
            raise ValueError('Chưa sở hữu linh thú này.')
        if located(player, p['id']):
            raise ValueError('Vật phẩm linh thú đã có trong hành trang.')
        give_item(player, p['id'])
        message = f'Đã nhận {p["name"]} vào túi đồ.'
    elif op == 'upgrade':
        tier = record['owned'].get(p['id'])
        if not tier:
            raise ValueError('Chưa sở hữu linh thú này.')
        if tier >= MAX_TIER:
            raise ValueError('Linh thú đã đạt bậc tối đa.')
        cost = upgrade_cost(p['id'], tier)
        if player.get('gold', 0) < cost:
            raise ValueError(f'Cần {cost} Linh Thạch để bồi dưỡng.')
        player['gold'] -= cost
        record['owned'][p['id']] = tier + 1
        store(player, record)
        message = f'{p["name"]} lên bậc {tier + 1}!'
    else:
        raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(player, db, uid)
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',
               (json.dumps(player, ensure_ascii=False), revision, int(time.time() if at is None else at), uid))
    db.execute('INSERT INTO mount_ops VALUES(?,?)', (uid, opid))
    return dict(character=dict(id=row['id'], player=player, revision=revision), stable=view(player, fragments()), message=message)
