"""Thú cưỡi: owned mounts and their tiers live in player['world']['mounts'] and are
written only by the server (saves copy the stored value back). Each owned mount
also exists as a bound item ('mount-<id>', slot 'thucuoi'); the one worn in the
Thú cưỡi gear slot is the active mount. It gives flat HP/attack whether ridden or
not; riding (sent with the world heartbeat) gives the speed bonus and the mounted
look other players see."""
import json
import time

import equipment

MOUNTS = [
    dict(id='doc-thiem', name='Độc Giác Thiềm', species='Ech', level=5, gold=1500, speed=1.20, hp=30, atk=2,
         desc='Cóc độc giáp gai, chậm rãi nhưng bền bỉ. Thú cưỡi nhập môn.'),
    dict(id='bang-lang', name='Hàn Băng Lang', species='Soi', level=15, gold=8000, speed=1.30, hp=80, atk=5,
         desc='Sói băng phương Bắc, lướt nhanh trên tuyết.'),
    dict(id='loi-te', name='Lôi Giác Tê', species='TeGiac', level=25, gold=30000, speed=1.35, hp=160, atk=9,
         desc='Tê giác mang lôi điện, giáp dày như tường thành.'),
    dict(id='diem-hat', name='Xích Diệm Hạt', species='BoCap', level=25, fragments=120, speed=1.35, hp=140, atk=12,
         desc='Bọ cạp lửa, đổi bằng mảnh linh khí.'),
    dict(id='thuy-long', name='Huyền Thủy Long', species='RongNuoc', level=35, gold=90000, speed=1.45, hp=260, atk=16, fly=True,
         desc='Rồng nước cuộn sóng, lướt trên mặt đất như cưỡi mây.'),
    dict(id='phan-phuong', name='Phần Thiên Phượng', species='PhuongHoang', level=40, fragments=400, speed=1.50, hp=320, atk=22, fly=True,
         desc='Phượng hoàng lửa, thú cưỡi bay của bậc đại năng.'),
    dict(id='cot-long', name='Cốt Long Minh Vương', species='RongXuong', level=30, speed=1.50, hp=360, atk=26, fly=True,
         source='Rơi từ rương Huyết Trì Ma Quật (3%).',
         desc='Cốt long lửa xanh, chỉ những tổ đội phá Ma Quật mới có cơ duyên thu phục.'),
]
BY_ID = {m['id']: m for m in MOUNTS}
MAX_TIER = 5
SPEED_CAP = 1.6
DUPLICATE_GOLD = 20000          # a raid drop of a mount you already own becomes Linh Thạch
NO_RIDE = ('arena', 'battle', 'raid', 'tower', 'worldboss')


def data(player):
    """The stored mount record, normalised (never trusts unknown ids)."""
    raw = player.get('world', {}).get('mounts')
    owned = {}
    if isinstance(raw, dict) and isinstance(raw.get('owned'), dict):
        for mid, tier in raw['owned'].items():
            if mid in BY_ID and type(tier) is int:
                owned[mid] = max(1, min(MAX_TIER, tier))
    worn = (player.get('world', {}).get('equip') or {}).get('thucuoi')
    active = worn.get('mountId') if isinstance(worn, dict) else None
    return dict(owned=owned, active=active if active in owned else None)


def item_id(mid):
    return 'mount-' + mid


def located(player, mid):
    """'equip', 'bag' or None: where the bound item of an owned mount is."""
    w = player.get('world', {})
    worn = (w.get('equip') or {}).get('thucuoi')
    if isinstance(worn, dict) and worn.get('id') == item_id(mid):
        return 'equip'
    if any(isinstance(i, dict) and i.get('id') == item_id(mid) for i in w.get('bag', [])):
        return 'bag'
    return None


def give_item(player, mid, wear=False):
    """Put the bound item of an owned mount into the bag (or straight into the slot)."""
    import secrets
    w = player.setdefault('world', {})
    equip, bag = w.setdefault('equip', {}), w.setdefault('bag', [])
    item = dict(equipment.TEMPLATES[item_id(mid)], uid=secrets.token_hex(16))
    if wear and not equip.get('thucuoi'):
        equip['thucuoi'] = item
        return item
    if len(bag) >= equipment.capacity(w):
        raise ValueError('Túi đầy. Dọn một ô để nhận thú cưỡi.')
    bag.append(item)
    return item


def sync(player):
    """Migrate mounts owned before the gear slot existed: every owned mount gets its
    item, the previously active one is worn. Returns True when the player changed."""
    raw = player.get('world', {}).get('mounts')
    if not isinstance(raw, dict) or raw.get('items'):
        return False
    record = data(player)
    previous = raw.get('active')
    changed = False
    for mid in record['owned']:
        if located(player, mid):
            continue
        try:
            give_item(player, mid, wear=mid == previous)
            changed = True
        except ValueError:
            return changed
    store(player, dict(owned=record['owned'], items=True))
    return True


def store(player, record):
    player.setdefault('world', {})['mounts'] = dict(owned=record['owned'], items=True)


def preserve(old, new):
    """Called on every client save: mounts are server-owned."""
    world = new.setdefault('world', {})
    stored = old.get('world', {}).get('mounts') if old is not None else None
    if stored:
        world['mounts'] = dict(stored)
    else:
        world.pop('mounts', None)


def tier_mult(tier):
    return 1 + .3 * (tier - 1)


def speed(mid, tier):
    return round(min(SPEED_CAP, BY_ID[mid]['speed'] + .02 * (tier - 1)), 3)


def bonus(player):
    """Flat stats of the active mount (counted by player_attack / player_max_hp)."""
    record = data(player)
    mid = record['active']
    if not mid:
        return dict(hp=0, atk=0)
    m, mult = BY_ID[mid], tier_mult(record['owned'][mid])
    return dict(hp=round(m['hp'] * mult), atk=round(m['atk'] * mult))


def upgrade_cost(mid, tier):
    rank = MOUNTS.index(BY_ID[mid]) + 1
    return 2500 * tier * rank


def grant(player, mid):
    """Give a mount (raid chest). Returns a message; duplicates become gold."""
    record = data(player)
    if mid in record['owned']:
        player['gold'] = min(10 ** 9, player.get('gold', 0) + DUPLICATE_GOLD)
        return f'Đã có {BY_ID[mid]["name"]}: đổi thành {DUPLICATE_GOLD} ◈'
    record['owned'][mid] = 1
    store(player, record)
    try:
        give_item(player, mid, wear=True)
    except ValueError:
        return f'Thu phục {BY_ID[mid]["name"]}! Túi đầy: nhận thú tại Mã Phu.'
    return f'Thu phục {BY_ID[mid]["name"]}!'


def view(player, wallet_fragments=0):
    import progression
    record = data(player)
    level = progression.level(player)
    rows = []
    for m in MOUNTS:
        tier = record['owned'].get(m['id'])
        mult = tier_mult(tier or 1)
        rows.append(dict(id=m['id'], name=m['name'], species=m['species'], level=m['level'], desc=m['desc'],
                         gold=m.get('gold'), fragments=m.get('fragments'), source=m.get('source'), fly=bool(m.get('fly')),
                         owned=tier is not None, tier=tier or 0, active=record['active'] == m['id'], where=located(player, m['id']) if tier else None,
                         speed=speed(m['id'], tier or 1), hp=round(m['hp'] * mult), atk=round(m['atk'] * mult),
                         nextHp=round(m['hp'] * tier_mult(tier + 1)) if tier and tier < MAX_TIER else None,
                         nextAtk=round(m['atk'] * tier_mult(tier + 1)) if tier and tier < MAX_TIER else None,
                         upgrade=upgrade_cost(m['id'], tier) if tier and tier < MAX_TIER else None,
                         locked=level < m['level']))
    return dict(mounts=rows, active=record['active'], maxTier=MAX_TIER, gold=player.get('gold', 0),
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
    m = BY_ID.get(body.get('id'))
    if op != 'unequip' and not m:
        raise ValueError('Thú cưỡi không tồn tại.')
    if op == 'buy':
        if m['id'] in record['owned']:
            raise ValueError('Bạn đã sở hữu thú cưỡi này.')
        if progression.level(player) < m['level']:
            raise ValueError(f'Cần đạt cấp {m["level"]}.')
        if m.get('gold'):
            if player.get('gold', 0) < m['gold']:
                raise ValueError('Không đủ Linh Thạch.')
            player['gold'] -= m['gold']
        elif m.get('fragments'):
            if not adventure.spend_fragments(db, uid, m['fragments']):
                raise ValueError('Không đủ mảnh linh khí.')
        else:
            raise ValueError('Thú cưỡi này chỉ có thể thu phục trong Ma Quật.')
        record['owned'][m['id']] = 1
        store(player, record)
        worn = bool((player['world'].get('equip') or {}).get('thucuoi'))
        give_item(player, m['id'], wear=not worn)
        message = f'Đã thu phục {m["name"]}!' + (' Đã mặc vào ô Thú cưỡi · phím H để cưỡi.' if not worn else ' Vật phẩm đã vào túi đồ.')
    elif op == 'equip':
        # Wear the mount's item (from the bag, or a fresh copy if it was lost).
        if m['id'] not in record['owned']:
            raise ValueError('Chưa sở hữu thú cưỡi này.')
        w = player['world']
        equip, bag = w.setdefault('equip', {}), w.setdefault('bag', [])
        where = located(player, m['id'])
        if where != 'equip':
            item = next((i for i in bag if i.get('id') == item_id(m['id'])), None)
            if item:
                bag.remove(item)
            else:
                item = dict(equipment.TEMPLATES[item_id(m['id'])], uid=__import__('secrets').token_hex(16))
            current = equip.get('thucuoi')
            if current:
                if len(bag) >= equipment.capacity(w):
                    raise ValueError('Túi đầy. Dọn một ô để đổi thú cưỡi.')
                current.pop('cell', None)
                bag.append(current)
            item.pop('cell', None)
            equip['thucuoi'] = item
        message = f'{m["name"]} theo bạn xuất hành.'
    elif op == 'unequip':
        w = player['world']
        current = (w.get('equip') or {}).get('thucuoi')
        if current:
            if len(w.setdefault('bag', [])) >= equipment.capacity(w):
                raise ValueError('Túi đầy. Dọn một ô để tháo thú cưỡi.')
            w['equip']['thucuoi'] = None
            current.pop('cell', None)
            w['bag'].append(current)
        message = 'Đã cho thú cưỡi về chuồng (vật phẩm ở túi đồ).'
    elif op == 'take':
        # A lost or never-issued item (e.g. bag was full when the raid dropped it).
        if m['id'] not in record['owned']:
            raise ValueError('Chưa sở hữu thú cưỡi này.')
        if located(player, m['id']):
            raise ValueError('Vật phẩm thú cưỡi đã có trong hành trang.')
        give_item(player, m['id'])
        message = f'Đã nhận {m["name"]} vào túi đồ.'
    elif op == 'upgrade':
        tier = record['owned'].get(m['id'])
        if not tier:
            raise ValueError('Chưa sở hữu thú cưỡi này.')
        if tier >= MAX_TIER:
            raise ValueError('Thú cưỡi đã đạt bậc tối đa.')
        cost = upgrade_cost(m['id'], tier)
        if player.get('gold', 0) < cost:
            raise ValueError(f'Cần {cost} Linh Thạch để thuần hóa.')
        player['gold'] -= cost
        record['owned'][m['id']] = tier + 1
        store(player, record)
        message = f'{m["name"]} lên bậc {tier + 1}!'
    else:
        raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(player, db, uid)
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',
               (json.dumps(player, ensure_ascii=False), revision, int(time.time() if at is None else at), uid))
    db.execute('INSERT INTO mount_ops VALUES(?,?)', (uid, opid))
    return dict(character=dict(id=row['id'], player=player, revision=revision), stable=view(player, fragments()), message=message)


def riding(player, scene, wants):
    """What other players see: (mount id, tier) when riding is allowed here."""
    record = data(player)
    if not wants or not record['active'] or scene in NO_RIDE:
        return None
    return dict(id=record['active'], tier=record['owned'][record['active']])
