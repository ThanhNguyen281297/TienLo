"""Tụ Bảo Các: player auction house.

Selling moves the item out of the seller's bag into auction_lots (its server
certificates stay registered to the seller until a buyer claims it). Bids
escrow the bidder's Linh Thạch immediately; an outbid player is refunded by
mail. Everything that leaves the auction (sold item, proceeds, refunds,
unsold/cancelled items) is delivered as a mailbox entry, claimed from the
auction's "Hòm nhận" tab or the Đội / Tông môn mailbox."""
import json
import math
import secrets
import time

import equipment
import trade

DURATIONS = (12, 24, 48)                  # hours
MAX_LOTS = 10                             # open lots per seller
MIN_PRICE, MAX_PRICE = 10, 100_000_000
FEE_RATE, FEE_MIN = .02, 5                # listing fee (never refunded)
TAX_RATE = .05                            # taken from the final price
STEP = .05                                # minimum raise over the current bid
SNIPE = 120                               # a late bid extends the lot to 2 minutes
PAGE = 30
GROUPS = {
    'weapon': ('vukhi',),
    'armor': ('daobao', 'chan', 'giay', 'mu'),
    'treasure': ('phapbao', 'ngoc', 'phaptran'),
    'accessory': ('gioi', 'dichuyen', 'matna'),
    'material': ('material',),
}
SORTS = {
    'ending': 'ends ASC',
    'new': 'created DESC',
    'cheap': 'MAX(bid,start) ASC',
    'expensive': 'MAX(bid,start) DESC',
}


def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS auction_lots(id TEXT PRIMARY KEY,seller INTEGER NOT NULL REFERENCES users(id),item TEXT NOT NULL,
        item_id TEXT NOT NULL,name TEXT NOT NULL,category TEXT NOT NULL,rarity TEXT NOT NULL,qty INTEGER NOT NULL,
        start INTEGER NOT NULL,buyout INTEGER NOT NULL,bid INTEGER NOT NULL DEFAULT 0,bidder INTEGER,bids INTEGER NOT NULL DEFAULT 0,
        created REAL NOT NULL,ends REAL NOT NULL,status TEXT NOT NULL,price INTEGER NOT NULL DEFAULT 0,closed REAL);
    CREATE INDEX IF NOT EXISTS auction_open ON auction_lots(status,ends);
    CREATE INDEX IF NOT EXISTS auction_seller ON auction_lots(seller,status);
    CREATE INDEX IF NOT EXISTS auction_bidder ON auction_lots(bidder,status);
    CREATE INDEX IF NOT EXISTS auction_price ON auction_lots(item_id,status,closed);
    CREATE TABLE IF NOT EXISTS auction_ops(user_id INTEGER NOT NULL,id TEXT NOT NULL,PRIMARY KEY(user_id,id));
    ''')


def mail(db, uid, title, payload, key=None):
    __import__('engagement').mail(db, uid, title, payload, key or 'auc:' + secrets.token_hex(12))


def item_name(item):
    name = item.get('name') or equipment.TEMPLATES.get(item.get('id'), {}).get('name', 'Vật phẩm')
    return name + (f" +{item['enhance']}" if item.get('enhance') else '') + (f" x{item['qty']}" if item.get('type') == 'material' and item.get('qty', 1) > 1 else '')


def category(item):
    if item.get('type') == 'material':
        return 'material'
    return item.get('slot', 'other')


def min_bid(lot):
    return lot['start'] if not lot['bids'] else max(lot['bid'] + 1, math.ceil(lot['bid'] * (1 + STEP)))


# ---------------------------------------------------------------- settlement
def close(db, lot, now):
    if lot['bidder']:
        db.execute("UPDATE auction_lots SET status='sold',price=bid,closed=? WHERE id=?", (now, lot['id']))
        sell(db, lot, lot['bid'], lot['bidder'], now)
    else:
        db.execute("UPDATE auction_lots SET status='expired',closed=? WHERE id=?", (now, lot['id']))
        item = json.loads(lot['item'])
        mail(db, lot['seller'], f'Đấu giá · Không ai mua: trả lại {item_name(item)}', dict(lot=item, **{'from': lot['seller']}), f"auc:back:{lot['id']}")


def sell(db, lot, price, buyer, now):
    item = json.loads(lot['item'])
    tax = math.floor(price * TAX_RATE)
    mail(db, buyer, f'Đấu giá · Mua được {item_name(item)}', dict(lot=item, **{'from': lot['seller']}), f"auc:item:{lot['id']}")
    mail(db, lot['seller'], f'Đấu giá · Đã bán {item_name(item)}: {price - tax} ◈ (thuế {tax})', dict(gold=price - tax), f"auc:gold:{lot['id']}")


def settle(db, now=None):
    now = time.time() if now is None else now
    for lot in db.execute("SELECT * FROM auction_lots WHERE status='open' AND ends<=?", (now,)).fetchall():
        close(db, lot, now)


# ---------------------------------------------------------------- delivery (mail claim)
def deliver(db, uid, player, item, source):
    """Put a mailed auction item into the bag, moving its server certificates."""
    item = dict(item)
    item.pop('cell', None)
    bag = player['world'].setdefault('bag', [])
    if item.get('type') == 'material':
        stack = next((i for i in bag if i.get('id') == item['id'] and i.get('type') == 'material'), None)
        if stack:
            stack['qty'] = min(9999, stack.get('qty', 1) + item.get('qty', 1))
            return
    if len(bag) >= equipment.capacity(player['world']):
        raise ValueError('Túi đầy. Dọn một ô trống rồi nhận lại.')
    if any(i.get('uid') == item['uid'] for i in equipment.items(player)):
        item['uid'] = secrets.token_hex(16)  # only materials can collide (split stacks)
    if type(source) is int and source != uid:
        trade.certificates(db, source, uid, item)
    bag.append(item)


# ---------------------------------------------------------------- views
def lot_view(db, lot, uid, now):
    seller = db.execute("SELECT json_extract(player,'$.nm') FROM characters WHERE user_id=?", (lot['seller'],)).fetchone()
    return dict(id=lot['id'], item=json.loads(lot['item']), name=lot['name'], category=lot['category'], rarity=lot['rarity'],
                start=lot['start'], buyout=lot['buyout'], bid=lot['bid'], bids=lot['bids'], minBid=min_bid(lot),
                endsIn=max(0, round(lot['ends'] - now)), status=lot['status'], price=lot['price'],
                seller=seller[0] if seller else '?', mine=lot['seller'] == uid, leading=lot['bidder'] == uid and lot['bids'] > 0)


def reference(db, item_id, now):
    """Average of recent sales of the same item (per unit for materials)."""
    rows = db.execute("SELECT price,qty FROM auction_lots WHERE item_id=? AND status='sold' AND closed>? ORDER BY closed DESC LIMIT 10",
                      (item_id, now - 14 * 86400)).fetchall()
    if not rows:
        return None
    return round(sum(r['price'] / max(1, r['qty']) for r in rows) / len(rows))


def browse(db, uid, query=None, now=None):
    now = time.time() if now is None else now
    settle(db, now)
    query = query if isinstance(query, dict) else {}
    where, args = ["status='open'"], []
    group = query.get('group')
    if group in GROUPS:
        where.append(f"category IN ({','.join('?' * len(GROUPS[group]))})")
        args += GROUPS[group]
    rarity = query.get('rarity')
    if rarity in ('pham', 'huyen', 'linh', 'tien', 'than'):
        where.append('rarity=?')
        args.append(rarity)
    text = query.get('text')
    if isinstance(text, str) and text.strip():
        where.append('name LIKE ?')
        args.append('%' + text.strip()[:40].replace('%', '').replace('_', '') + '%')
    order = SORTS.get(query.get('sort'), SORTS['ending'])
    page = query.get('page') if type(query.get('page')) is int and 0 <= query.get('page') <= 100 else 0
    total = db.execute(f"SELECT COUNT(*) FROM auction_lots WHERE {' AND '.join(where)}", args).fetchone()[0]
    rows = db.execute(f"SELECT * FROM auction_lots WHERE {' AND '.join(where)} ORDER BY {order} LIMIT ? OFFSET ?",
                      args + [PAGE, page * PAGE]).fetchall()
    return dict(lots=[lot_view(db, r, uid, now) for r in rows], total=total, page=page, pages=max(1, math.ceil(total / PAGE)))


def snapshot(db, uid, query=None, now=None):
    now = time.time() if now is None else now
    result = browse(db, uid, query, now)
    row = db.execute('SELECT player FROM characters WHERE user_id=?', (uid,)).fetchone()
    player = json.loads(row['player']) if row else {}
    selling = db.execute("SELECT * FROM auction_lots WHERE seller=? AND (status='open' OR closed>?) ORDER BY status='open' DESC,ends DESC LIMIT 30",
                         (uid, now - 86400)).fetchall()
    bidding = db.execute("SELECT * FROM auction_lots WHERE bidder=? AND status='open' ORDER BY ends LIMIT 30", (uid,)).fetchall()
    mails = db.execute("SELECT id,title,payload FROM community_rewards WHERE user_id=? AND claimed=0 AND id LIKE 'auc:%' ORDER BY created LIMIT 50", (uid,)).fetchall()
    refs = {}
    for item in player.get('world', {}).get('bag', []):
        if item.get('id') in equipment.TEMPLATES and item['id'] not in refs:
            refs[item['id']] = reference(db, item['id'], now)
    return dict(result, selling=[lot_view(db, r, uid, now) for r in selling], bidding=[lot_view(db, r, uid, now) for r in bidding],
                mail=[dict(id=m['id'], title=m['title'], **json.loads(m['payload'])) for m in mails], refs=refs,
                gold=player.get('gold', 0), rules=dict(durations=DURATIONS, maxLots=MAX_LOTS, feeRate=FEE_RATE, feeMin=FEE_MIN,
                                                        taxRate=TAX_RATE, step=STEP, minPrice=MIN_PRICE, maxPrice=MAX_PRICE))


# ---------------------------------------------------------------- actions
def price(value, low=MIN_PRICE):
    if type(value) is not int or not low <= value <= MAX_PRICE:
        raise ValueError(f'Giá cần từ {low} đến {MAX_PRICE:,} Linh Thạch.'.replace(',', '.'))
    return value


def action(db, uid, body, peers=None, now=None):
    now = time.time() if now is None else now
    op, opid = body.get('action'), body.get('opId')
    if op == 'browse':
        return browse(db, uid, body.get('query'), now)
    if not isinstance(op, str) or not isinstance(opid, str) or not 8 <= len(opid) <= 100:
        raise ValueError('Thao tác không hợp lệ.')
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    if not row:
        raise ValueError('Hãy tạo nhân vật trước.')
    player = json.loads(row['player'])
    character = lambda revision: dict(id=row['id'], player=player, revision=revision)
    if db.execute('SELECT 1 FROM auction_ops WHERE user_id=? AND id=?', (uid, opid)).fetchone():
        return dict(snapshot(db, uid, body.get('query'), now), character=character(row['revision']))
    if body.get('revision') != row['revision']:
        return dict(conflict=True, error='Nhân vật đã thay đổi. Hãy thử lại.')
    if trade.locked(db, uid):
        raise ValueError('Mở khóa giao dịch trước khi dùng Tụ Bảo Các.')
    settle(db, now)
    message = ''
    if op == 'sell':
        bag = player['world'].get('bag', [])
        item = next((i for i in bag if i.get('uid') == body.get('uid')), None)
        if not item or item.get('id') not in equipment.TEMPLATES:
            raise ValueError('Chọn một trang bị hoặc nguyên liệu trong túi.')
        if item['id'].startswith('outfit-'):
            raise ValueError('Trang phục khởi đầu không thể bán đấu giá.')
        if item.get('bound') or equipment.TEMPLATES[item['id']].get('bound'):
            raise ValueError('Thú cưỡi đã khế ước, không thể bán đấu giá.')
        if db.execute("SELECT COUNT(*) FROM auction_lots WHERE seller=? AND status='open'", (uid,)).fetchone()[0] >= MAX_LOTS:
            raise ValueError(f'Mỗi người chỉ treo tối đa {MAX_LOTS} món cùng lúc.')
        start = price(body.get('start'))
        buyout = body.get('buyout') or 0
        if buyout:
            price(buyout, start)
        hours = body.get('hours')
        if hours not in DURATIONS:
            raise ValueError('Chọn thời gian 12, 24 hoặc 48 giờ.')
        fee = max(FEE_MIN, math.floor(start * FEE_RATE))
        if player.get('gold', 0) < fee:
            raise ValueError(f'Cần {fee} Linh Thạch phí treo bán.')
        if item.get('type') == 'material':
            qty = body.get('qty', item.get('qty', 1))
            if type(qty) is not int or not 1 <= qty <= item.get('qty', 1):
                raise ValueError('Số lượng không hợp lệ.')
            if qty < item.get('qty', 1):
                item['qty'] -= qty
                lot_item = dict(item, qty=qty, uid=secrets.token_hex(16))
            else:
                bag.remove(item)
                lot_item = dict(item)
        else:
            bag.remove(item)
            lot_item = dict(item)
        lot_item.pop('cell', None)
        player['gold'] -= fee
        db.execute('INSERT INTO auction_lots(id,seller,item,item_id,name,category,rarity,qty,start,buyout,created,ends,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)',
                   (secrets.token_hex(12), uid, json.dumps(lot_item, ensure_ascii=False), lot_item['id'], item_name(lot_item),
                    category(lot_item), lot_item.get('rarity', 'pham'), lot_item.get('qty', 1), start, buyout, now, now + hours * 3600, 'open'))
        message = f'Đã treo bán {item_name(lot_item)} (phí {fee} ◈).'
    elif op in ('bid', 'buyout'):
        lot = db.execute("SELECT * FROM auction_lots WHERE id=? AND status='open'", (body.get('id'),)).fetchone()
        if not lot or lot['ends'] <= now:
            raise ValueError('Món hàng đã kết thúc đấu giá.')
        if lot['seller'] == uid:
            raise ValueError('Không thể mua món của chính mình.')
        if op == 'buyout':
            if not lot['buyout']:
                raise ValueError('Món này không có giá mua ngay.')
            amount = lot['buyout']
        else:
            amount = price(body.get('amount'))
            if amount < min_bid(lot):
                raise ValueError(f'Giá đặt tối thiểu {min_bid(lot)} Linh Thạch.')
            if lot['buyout'] and amount >= lot['buyout']:
                amount, op = lot['buyout'], 'buyout'
        # The current leader raising their own bid only pays the difference.
        held = lot['bid'] if lot['bidder'] == uid else 0
        if player.get('gold', 0) < amount - held:
            raise ValueError('Không đủ Linh Thạch.')
        player['gold'] -= amount - held
        if lot['bidder'] and lot['bidder'] != uid:
            mail(db, lot['bidder'], f"Đấu giá · Bị trả giá cao hơn: hoàn {lot['bid']} ◈ ({lot['name']})", dict(gold=lot['bid']))
        if op == 'buyout':
            db.execute("UPDATE auction_lots SET bid=?,bidder=?,bids=bids+1,status='sold',price=?,closed=? WHERE id=?", (amount, uid, amount, now, lot['id']))
            sell(db, lot, amount, uid, now)
            message = f"Đã mua ngay {lot['name']}! Nhận ở Hòm nhận."
        else:
            ends = max(lot['ends'], now + SNIPE)
            db.execute('UPDATE auction_lots SET bid=?,bidder=?,bids=bids+1,ends=? WHERE id=?', (amount, uid, ends, lot['id']))
            message = f"Đã đặt giá {amount} ◈ cho {lot['name']}."
    elif op == 'cancel':
        lot = db.execute("SELECT * FROM auction_lots WHERE id=? AND status='open' AND seller=?", (body.get('id'), uid)).fetchone()
        if not lot:
            raise ValueError('Không tìm thấy món đang treo bán.')
        if lot['bids']:
            raise ValueError('Đã có người đặt giá, không thể hủy.')
        db.execute("UPDATE auction_lots SET status='cancelled',closed=? WHERE id=?", (now, lot['id']))
        item = json.loads(lot['item'])
        deliver(db, uid, player, item, uid)
        message = f'Đã hủy và nhận lại {item_name(item)}.'
    elif op == 'claim':
        wanted = body.get('id')
        rows = db.execute("SELECT * FROM community_rewards WHERE user_id=? AND claimed=0 AND id LIKE 'auc:%' ORDER BY created LIMIT 50", (uid,)).fetchall()
        if isinstance(wanted, str):
            rows = [r for r in rows if r['id'] == wanted]
        if not rows:
            raise ValueError('Hòm nhận trống.')
        got = 0
        for reward in rows:
            payload = json.loads(reward['payload'])
            try:
                if payload.get('lot'):
                    deliver(db, uid, player, payload['lot'], payload.get('from'))
                player['gold'] = min(10 ** 9, player.get('gold', 0) + payload.get('gold', 0))
            except ValueError:
                if not got:
                    raise
                break
            db.execute('UPDATE community_rewards SET claimed=1 WHERE id=?', (reward['id'],))
            got += 1
        message = f'Đã nhận {got} món từ Hòm nhận.' + (' Túi đầy, phần còn lại vẫn chờ.' if got < len(rows) else '')
    else:
        raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(player, db, uid)
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',
               (json.dumps(player, ensure_ascii=False), revision, int(now), uid))
    db.execute('INSERT INTO auction_ops VALUES(?,?)', (uid, opid))
    return dict(snapshot(db, uid, body.get('query'), now), character=character(revision), message=message)
