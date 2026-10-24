"""Versioned, two-sided trades; item certificates move atomically with ownership."""
import json
import math
import secrets
import time
import equipment
import community
import progression


class Conflict(ValueError):
    pass


def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS player_trades(id TEXT PRIMARY KEY,a INTEGER NOT NULL REFERENCES users(id),b INTEGER NOT NULL REFERENCES users(id),status TEXT NOT NULL,version INTEGER NOT NULL,offers TEXT NOT NULL,expires REAL NOT NULL,created REAL NOT NULL,CHECK(a<>b));
    CREATE INDEX IF NOT EXISTS player_trade_a ON player_trades(a,status);
    CREATE INDEX IF NOT EXISTS player_trade_b ON player_trades(b,status);
    CREATE TABLE IF NOT EXISTS player_operations(uid INTEGER NOT NULL,op TEXT NOT NULL,PRIMARY KEY(uid,op));
    ''')


def character(db, uid):
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    if not row:
        raise ValueError('Không tìm thấy nhân vật.')
    return row, json.loads(row['player'])


def online(peers, uid):
    return time.monotonic() - peers.get(uid, {}).get('seen', -1000) < 15


def public(db, uid, peers, detail=False):
    _, p = character(db, uid)
    guild = community.group(db, uid, 'guild')
    result = dict(id=uid, name=p['nm'], ap=p['ap'], level=progression.level(p), realm=p['r'],
                  stage=p.get('stage', 1), online=online(peers, uid),
                  guild=guild['name'] if guild else None)
    if detail:
        result['equip'] = p.get('world', {}).get('equip', {})
        result['stats'] = dict(hp=__import__('server').player_max_hp(p), attack=__import__('server').player_attack(p))
    return result


def locked(db, uid):
    for row in db.execute("SELECT * FROM player_trades WHERE (a=? OR b=?) AND status='open' AND expires>?", (uid, uid, time.time())):
        if json.loads(row['offers'])[str(uid)]['locked']:
            return True
    return False


def nearby(db, a, b, peers):
    for uid in (a, b):
        _, p = character(db, uid)
        if not online(peers, uid) or peers[uid].get('map') != 'hub' or p.get('world', {}).get('map') != 'hub' or p.get('hp', 0) <= 0:
            raise ValueError('Hai người cần ở gần nhau trong Thiên Vân Thành.')
    if math.hypot(peers[a]['x']-peers[b]['x'], peers[a]['y']-peers[b]['y']) > 200:
        raise ValueError('Đạo hữu ở quá xa để giao dịch.')


def trade_view(db, row, uid, peers):
    offers = json.loads(row['offers'])
    return dict(id=row['id'], status=row['status'], version=row['version'], expires=row['expires'],
                a=row['a'], b=row['b'], players=[public(db, i, peers) for i in (row['a'], row['b'])], offers=offers)


def snapshot(db, uid, peers=None):
    peers = peers or {}
    now = time.time()
    db.execute("UPDATE player_trades SET status='expired' WHERE status IN ('pending','open') AND expires<?", (now,))
    trades = [trade_view(db, r, uid, peers) for r in db.execute("SELECT * FROM player_trades WHERE (a=? OR b=?) AND (status IN ('pending','open') OR expires>?) ORDER BY created DESC LIMIT 8", (uid, uid, now-180))]
    row, _ = character(db, uid)
    return dict(trades=trades, currentRevision=row['revision'])


def certificates(db, source, target, item):
    for table, column in [('equipment_drop_rolls', 'options'), ('equipment_rolls', 'lines'), ('equipment_locks', 'indices')]:
        row = db.execute(f'SELECT * FROM {table} WHERE user_id=? AND item_uid=?', (source, item['uid'])).fetchone()
        if row:
            db.execute(f'DELETE FROM {table} WHERE user_id=? AND item_uid=?', (target, item['uid']))
            db.execute(f'UPDATE {table} SET user_id=? WHERE user_id=? AND item_uid=?', (target, source, item['uid']))


def complete(db, row, offers, peers):
    ids = (row['a'], row['b'])
    offered_uids = [i['uid'] for offer in offers.values() for i in offer['items']]
    if len(set(offered_uids)) != len(offered_uids):
        raise ValueError('Mã vật phẩm bị trùng.')
    nearby(db, *ids, peers)
    data = {uid: character(db, uid) for uid in ids}
    for uid in ids:
        _, p = data[uid]
        offer = offers[str(uid)]
        bag = p['world']['bag']
        if p['gold'] < offer['gold'] or any(next((i for i in bag if i['uid'] == item['uid']), None) != item for item in offer['items']):
            raise ValueError('Vật phẩm hoặc số dư đã thay đổi. Hãy mở khóa và đặt lại.')
        equipment.validate(p, db, uid)
    # Remove outgoing goods from BOTH bags before adding incoming goods.
    for uid in ids:
        p = data[uid][1]
        offer = offers[str(uid)]
        outgoing = {i['uid'] for i in offer['items']}
        p['world']['bag'] = [i for i in p['world']['bag'] if i['uid'] not in outgoing]
        p['gold'] -= offer['gold']
    for uid, other in ((ids[0], ids[1]), (ids[1], ids[0])):
        p = data[uid][1]
        incoming = offers[str(other)]
        if p['gold'] + incoming['gold'] > 10**9 or len(p['world']['bag']) + len(incoming['items']) > equipment.capacity(p['world']):
            raise ValueError('Túi hoặc số dư người nhận không còn chỗ.')
        owned = {i['uid'] for i in equipment.items(p)}
        if any(i['uid'] in owned for i in incoming['items']):
            raise ValueError('Mã vật phẩm bị trùng.')
        p['gold'] += incoming['gold']
        for item in incoming['items']:
            item = dict(item)
            item.pop('cell', None)
            p['world']['bag'].append(item)
            certificates(db, other, uid, item)
    for uid in ids:
        equipment.validate(data[uid][1], db, uid)
        db.execute('UPDATE characters SET player=?,revision=revision+1,updated_at=? WHERE user_id=?', (json.dumps(data[uid][1], ensure_ascii=False), int(time.time()), uid))


def action(db, uid, body, peers):
    op = body.get('action')
    if not isinstance(op, str):
        raise ValueError('Thao tác không hợp lệ.')
    token = body.get('opId', body.get('operationId'))
    if not isinstance(token, str) or not 8 <= len(token) <= 100:
        raise ValueError('Thiếu mã thao tác.')
    if db.execute('SELECT 1 FROM player_operations WHERE uid=? AND op=?', (uid, token)).fetchone():
        result = snapshot(db, uid, peers)
        row, p = character(db, uid)
        result['character'] = dict(id=row['id'], player=p, revision=row['revision'])
        return result
    target = body.get('target')
    if op == 'trade_invite':
        if type(target) is not int or target == uid:
            raise ValueError('Chọn đạo hữu khác.')
        character(db, target)
        nearby(db, uid, target, peers)
        if db.execute("SELECT 1 FROM player_trades WHERE (a IN (?,?) OR b IN (?,?)) AND status IN ('pending','open') AND expires>?", (uid, target, uid, target, time.time())).fetchone():
            raise ValueError('Một người đang có giao dịch khác.')
        offers = {str(i): dict(items=[], gold=0, locked=False, confirmed=False) for i in (uid, target)}
        db.execute('INSERT INTO player_trades VALUES(?,?,?,?,?,?,?,?)', (secrets.token_hex(16), uid, target, 'pending', 1, json.dumps(offers), time.time()+120, time.time()))
    elif op.startswith('trade_'):
        row = db.execute('SELECT * FROM player_trades WHERE id=? AND (a=? OR b=?)', (body.get('id'), uid, uid)).fetchone()
        if not row or row['status'] not in ('pending', 'open') or row['expires'] <= time.time():
            raise ValueError('Giao dịch đã kết thúc hoặc hết hạn.')
        if body.get('version') != row['version']:
            raise Conflict('Nội dung giao dịch đã thay đổi. Kiểm tra lại trước khi xác nhận.')
        offers = json.loads(row['offers'])
        mine = offers[str(uid)]
        status = row['status']
        if op == 'trade_cancel':
            status = 'cancelled'
        elif op == 'trade_accept' and uid == row['b'] and status == 'pending':
            nearby(db, row['a'], row['b'], peers)
            status = 'open'
        elif status != 'open':
            raise ValueError('Chưa được chấp nhận giao dịch.')
        elif op == 'trade_offer':
            if mine['locked']:
                raise ValueError('Mở khóa trước khi sửa vật phẩm.')
            saved, p = character(db, uid)
            if body.get('revision') != saved['revision']:
                raise Conflict('Nhân vật đã thay đổi. Hãy đồng bộ lại.')
            selected, gold = body.get('items'), body.get('gold')
            if not isinstance(selected, list) or len(selected) > 8 or any(not isinstance(i, str) for i in selected) or len(set(selected)) != len(selected) or type(gold) is not int or not 0 <= gold <= p['gold']:
                raise ValueError('Vật phẩm hoặc Linh Thạch không hợp lệ.')
            items = [next((i for i in p['world']['bag'] if i['uid'] == item), None) for item in selected]
            if any(i is None or i.get('id') not in equipment.TEMPLATES for i in items):
                raise ValueError('Chỉ giao dịch vật phẩm trong túi, không phải đồ đang mặc.')
            if any(equipment.TEMPLATES[i['id']].get('bound') for i in items):
                raise ValueError('Thú cưỡi đã khế ước, không thể giao dịch.')
            equipment.validate(p, db, uid)
            mine.update(items=items, gold=gold)
            for offer in offers.values():
                offer.update(locked=False, confirmed=False)
        elif op == 'trade_lock':
            nearby(db, row['a'], row['b'], peers)
            mine['locked'] = not mine['locked']
            for offer in offers.values():
                offer['confirmed'] = False
        elif op == 'trade_confirm':
            if not all(o['locked'] for o in offers.values()):
                raise ValueError('Hai người phải khóa vật phẩm trước.')
            mine['confirmed'] = True
            if all(o['confirmed'] for o in offers.values()):
                complete(db, row, offers, peers)
                status = 'completed'
        else:
            raise ValueError('Thao tác không hợp lệ.')
        db.execute('UPDATE player_trades SET offers=?,status=?,version=version+1 WHERE id=?', (json.dumps(offers, ensure_ascii=False), status, row['id']))
    else:
        raise ValueError('Thao tác không hợp lệ.')
    db.execute('INSERT INTO player_operations VALUES(?,?)', (uid, token))
    result = snapshot(db, uid, peers)
    if op == 'trade_confirm':
        row, p = character(db, uid)
        result['character'] = dict(id=row['id'], player=p, revision=row['revision'])
    return result
