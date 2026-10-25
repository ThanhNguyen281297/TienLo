"""Linh Quang (premium currency), Kỳ Trân Các shop and bank top-up requests.

Linh Quang only comes from top-ups: 1.000 VND = 1 Linh Quang. A player creates a
request (amount + transfer code), pays with the VietQR code, then a GM checks the
bank statement and approves it; only then is Linh Quang credited. The wallet lives
in its own table, never in the saved player JSON."""
import json
import secrets
import time

import equipment

VND_PER_LQ = 1000
MIN_VND, MAX_VND = 10_000, 10_000_000
PACKAGES = (20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000)
BANK = dict(bank='Techcombank', qr='Item/KyTran/qr-techcombank.jpg')

# Server-issued consumables (type 'material', so client saves cannot create or change them).
ITEMS = {
    'song-boi-phu': dict(name='Song Bội Kinh Nghiệm Phù', rarity='linh', desc='Dùng: x2 EXP và Linh Thạch khi hạ quái trong 1 giờ (cộng dồn thời gian).'),
    'phu-cuong-hoa': dict(name='Phù Cường Hóa', rarity='linh', desc='Đặt vào lò rèn: miễn toàn bộ Linh Nguyên của một lần cường hóa.'),
    'khoa-tay-luyen': dict(name='Khóa Tẩy Luyện', rarity='huyen', desc='Cần để khóa dòng thứ hai trở đi khi tẩy luyện (mỗi dòng một khóa).'),
    'be-quan-lenh': dict(name='Bế Quan Lệnh', rarity='linh', desc='Dùng: cộng thêm 4 giờ ủy thác bế quan offline (tối đa 24 giờ).'),
    'ruong-manh': dict(name='Rương Mảnh Thần Binh', rarity='tien', desc='Dùng: nhận 6 mảnh trang bị ngẫu nhiên (pháp bảo, pháp trận, hộ thuẫn, bước chân, mặt nạ, nhẫn, thú hồn).'),
    'thu-hon-bao': dict(name='Thú Hồn Bao', rarity='tien', desc='Dùng: nhận 12 Thú Hồn để đổi linh thú tại Trưởng môn.'),
    'tui-linh-thach': dict(name='Túi Linh Thạch', rarity='huyen', desc='Dùng: nhận 30.000 Linh Thạch.'),
    'linh-nguyen-dan': dict(name='Linh Nguyên Đan', rarity='linh', desc='Dùng: nhận 600 Linh Nguyên.'),
}
for iid, meta in ITEMS.items():
    equipment.MATERIALS[iid] = dict(id=iid, type='material', price=0, bound=True, art=f'Item/KyTran/{iid}.png', premium=True, **meta)
    equipment.TEMPLATES[iid] = equipment.MATERIALS[iid]

# Shop: price in Linh Quang, what it gives, optional daily limit.
SHOP = [
    dict(id='song-boi-phu', price=10, give={'song-boi-phu': 1}, limit=None, tag='Hot'),
    dict(id='phu-cuong-hoa', price=8, give={'phu-cuong-hoa': 1}, limit=None),
    dict(id='khoa-tay-luyen', price=5, give={'khoa-tay-luyen': 1}, limit=None),
    dict(id='be-quan-lenh', price=10, give={'be-quan-lenh': 1}, limit=3),
    dict(id='ruong-manh', price=15, give={'ruong-manh': 1}, limit=5),
    dict(id='thu-hon-bao', price=20, give={'thu-hon-bao': 1}, limit=3),
    dict(id='tui-linh-thach', price=15, give={'tui-linh-thach': 1}, limit=3),
    dict(id='linh-nguyen-dan', price=12, give={'linh-nguyen-dan': 1}, limit=3),
    dict(id='cuong-hoa-thach-20', price=10, give={'cuong-hoa-thach': 20}, limit=5, name='Cường Hóa Thạch ×20'),
    dict(id='tinh-luyen-thach-5', price=12, give={'tinh-luyen-thach': 5}, limit=5, name='Tinh Luyện Thạch ×5'),
    dict(id='nguyet-tap', price=99, card=30, limit=None, name='Nguyệt Tạp 30 ngày', tag='Lời nhất',
         desc='Mỗi ngày nhận 8 Linh Quang và 10.000 Linh Thạch trong 30 ngày (tổng 240 Linh Quang).'),
]
SHOP_BY_ID = {s['id']: s for s in SHOP}
CARD_DAILY = dict(lq=8, gold=10_000)
FIRST_TOPUP_GIFT = {'song-boi-phu': 2, 'phu-cuong-hoa': 2, 'ruong-manh': 1}


def day(at=None):
    return time.strftime('%Y-%m-%d', time.gmtime((time.time() if at is None else at) + 7 * 3600))


def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS premium_wallet(user_id INTEGER PRIMARY KEY,lq INTEGER NOT NULL DEFAULT 0,topped INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS premium_log(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,delta INTEGER NOT NULL,reason TEXT NOT NULL,at REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS premium_buffs(user_id INTEGER PRIMARY KEY,exp_until REAL NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS premium_card(user_id INTEGER PRIMARY KEY,until REAL NOT NULL DEFAULT 0,last_day TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS premium_daily(user_id INTEGER NOT NULL,day TEXT NOT NULL,item TEXT NOT NULL,n INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(user_id,day,item));
    CREATE TABLE IF NOT EXISTS premium_ops(user_id INTEGER NOT NULL,id TEXT NOT NULL,PRIMARY KEY(user_id,id));
    CREATE TABLE IF NOT EXISTS topups(id TEXT PRIMARY KEY,user_id INTEGER NOT NULL,vnd INTEGER NOT NULL,lq INTEGER NOT NULL,code TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,created REAL NOT NULL,decided REAL,decided_by INTEGER,note TEXT NOT NULL DEFAULT '');''')


# ---------------------------------------------------------------- wallet
def balance(db, uid):
    row = db.execute('SELECT lq,topped FROM premium_wallet WHERE user_id=?', (uid,)).fetchone()
    return dict(lq=row['lq'], topped=row['topped']) if row else dict(lq=0, topped=0)


def credit(db, uid, amount, reason, topped=0):
    db.execute('INSERT INTO premium_wallet(user_id,lq,topped) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET lq=lq+excluded.lq,topped=topped+excluded.topped',
               (uid, int(amount), int(topped)))
    db.execute('INSERT INTO premium_log(user_id,delta,reason,at) VALUES(?,?,?,?)', (uid, int(amount), reason, time.time()))


def debit(db, uid, amount, reason):
    db.execute('INSERT OR IGNORE INTO premium_wallet(user_id) VALUES(?)', (uid,))
    if db.execute('UPDATE premium_wallet SET lq=lq-? WHERE user_id=? AND lq>=?', (amount, uid, amount)).rowcount != 1:
        raise ValueError('Không đủ Linh Quang. Nạp thêm để mua.')
    db.execute('INSERT INTO premium_log(user_id,delta,reason,at) VALUES(?,?,?,?)', (uid, -int(amount), reason, time.time()))


# ---------------------------------------------------------------- buffs used by the server
def exp_mult(db, uid, at=None):
    row = db.execute('SELECT exp_until FROM premium_buffs WHERE user_id=?', (uid,)).fetchone()
    return 2 if row and row['exp_until'] > (time.time() if at is None else at) else 1


def take_material(player, iid, qty=1):
    """Consume `qty` of a server material from the bag. Returns False when missing."""
    bag = player['world'].get('bag', [])
    stack = next((i for i in bag if i.get('id') == iid and i.get('type') == 'material' and i.get('qty', 1) >= qty), None)
    if not stack:
        return False
    stack['qty'] = stack.get('qty', 1) - qty
    if stack['qty'] <= 0:
        bag.remove(stack)
    return True


# ---------------------------------------------------------------- views
def state(db, uid, gm=False, at=None):
    now = time.time() if at is None else at
    buff = db.execute('SELECT exp_until FROM premium_buffs WHERE user_id=?', (uid,)).fetchone()
    card = db.execute('SELECT until,last_day FROM premium_card WHERE user_id=?', (uid,)).fetchone()
    bought = {r['item']: r['n'] for r in db.execute('SELECT item,n FROM premium_daily WHERE user_id=? AND day=?', (uid, day(now)))}
    shop = []
    for s in SHOP:
        meta = ITEMS.get(s['id']) or {}
        shop.append(dict(id=s['id'], name=s.get('name') or meta.get('name'), price=s['price'], limit=s.get('limit'), bought=bought.get(s['id'], 0),
                         desc=s.get('desc') or meta.get('desc') or '', tag=s.get('tag'), icon=f"Item/KyTran/{next(iter(s['give']))}.png" if s.get('give') and next(iter(s['give'])) in ITEMS else
                         ('Item/NguyenLieu/cuong-hoa-v1.png' if s['id'].startswith('cuong') else 'Item/NguyenLieu/tinh-luyen-v1.png' if s['id'].startswith('tinh') else 'Item/KyTran/nguyet-tap.png'),
                         rarity=meta.get('rarity', 'tien')))
    requests = [dict(r) for r in db.execute('SELECT id,vnd,lq,code,status,created FROM topups WHERE user_id=? ORDER BY created DESC LIMIT 8', (uid,))]
    result = dict(wallet=balance(db, uid), rate=VND_PER_LQ, packages=PACKAGES, min=MIN_VND, bank=BANK, shop=shop, requests=requests,
                  expUntil=buff['exp_until'] if buff and buff['exp_until'] > now else 0,
                  card=dict(until=card['until'], claimable=card['until'] > now and card['last_day'] != day(now)) if card and card['until'] > now else None,
                  firstGift=balance(db, uid)['topped'] == 0, gift=FIRST_TOPUP_GIFT, now=now)
    if gm:
        result['pending'] = [dict(r) | dict(name=r['name']) for r in db.execute(
            "SELECT t.id,t.user_id,t.vnd,t.lq,t.code,t.status,t.created,u.username AS name FROM topups t JOIN users u ON u.id=t.user_id "
            "WHERE t.status IN ('pending','submitted') ORDER BY t.status DESC,t.created LIMIT 50")]
    return result


# ---------------------------------------------------------------- actions
def action(db, uid, body, gm=False, at=None):
    now = time.time() if at is None else at
    op = body.get('action')
    opid = body.get('opId')
    if not isinstance(op, str) or not isinstance(opid, str) or not 8 <= len(opid) <= 100:
        raise ValueError('Thao tác không hợp lệ.')
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    if not row:
        raise ValueError('Hãy tạo nhân vật trước.')
    player = json.loads(row['player'])
    done = lambda **extra: dict(character=dict(id=row['id'], player=player, revision=row['revision']), premium=state(db, uid, gm, now), **extra)
    if db.execute('SELECT 1 FROM premium_ops WHERE user_id=? AND id=?', (uid, opid)).fetchone():
        return done()
    message, changed = '', False

    if op == 'topup_create':
        vnd = body.get('vnd')
        if type(vnd) is not int or not MIN_VND <= vnd <= MAX_VND or vnd % VND_PER_LQ:
            raise ValueError(f'Số tiền từ {MIN_VND:,} đến {MAX_VND:,} VND, chia hết cho 1.000.'.replace(',', '.'))
        if db.execute("SELECT COUNT(*) FROM topups WHERE user_id=? AND status IN ('pending','submitted')", (uid,)).fetchone()[0] >= 3:
            raise ValueError('Bạn đang có 3 yêu cầu nạp chờ duyệt. Hãy đợi GM xác nhận.')
        code = f'TL{uid}{secrets.randbelow(9000) + 1000}'
        db.execute("INSERT INTO topups VALUES(?,?,?,?,?,'pending',?,NULL,NULL,'')", (secrets.token_hex(8), uid, vnd, vnd // VND_PER_LQ, code, now))
        message = f'Đã tạo mã nạp {code}. Chuyển khoản đúng nội dung để được cộng Linh Quang.'
    elif op == 'topup_submit':
        n = db.execute("UPDATE topups SET status='submitted' WHERE id=? AND user_id=? AND status='pending'", (body.get('id'), uid)).rowcount
        if not n:
            raise ValueError('Yêu cầu nạp không còn chờ.')
        message = 'Đã báo chuyển khoản. Linh Quang sẽ được cộng ngay khi GM xác nhận giao dịch.'
    elif op == 'topup_cancel':
        n = db.execute("UPDATE topups SET status='cancelled',decided=? WHERE id=? AND user_id=? AND status IN ('pending','submitted')", (now, body.get('id'), uid)).rowcount
        if not n:
            raise ValueError('Không hủy được yêu cầu này.')
        message = 'Đã hủy yêu cầu nạp.'
    elif op in ('gm_approve', 'gm_reject'):
        if not gm:
            raise PermissionError('Chỉ GM được duyệt nạp.')
        t = db.execute("SELECT * FROM topups WHERE id=? AND status IN ('pending','submitted')", (body.get('id'),)).fetchone()
        if not t:
            raise ValueError('Yêu cầu đã được xử lý.')
        status = 'approved' if op == 'gm_approve' else 'rejected'
        db.execute('UPDATE topups SET status=?,decided=?,decided_by=?,note=? WHERE id=?', (status, now, uid, str(body.get('note') or '')[:120], t['id']))
        import engagement
        if status == 'approved':
            first = balance(db, t['user_id'])['topped'] == 0
            credit(db, t['user_id'], t['lq'], 'topup:' + t['code'], topped=t['vnd'])
            engagement.mail(db, t['user_id'], f"Nạp thành công {t['lq']} Linh Quang", dict(gold=0), f"topup:{t['id']}")
            if first:
                engagement.mail(db, t['user_id'], 'Quà nạp đầu', dict(items=dict(FIRST_TOPUP_GIFT)), f"first-topup:{t['user_id']}")
            message = f"Đã cộng {t['lq']} Linh Quang cho mã {t['code']}."
        else:
            engagement.mail(db, t['user_id'], f"Yêu cầu nạp {t['code']} chưa được xác nhận", dict(gold=0), f"topup:{t['id']}")
            message = f"Đã từ chối mã {t['code']}."
    elif op == 'buy':
        s = SHOP_BY_ID.get(body.get('id'))
        qty = body.get('qty', 1)
        if not s or type(qty) is not int or not 1 <= qty <= 20:
            raise ValueError('Vật phẩm không hợp lệ.')
        today = day(now)
        if s.get('limit'):
            used = db.execute('SELECT n FROM premium_daily WHERE user_id=? AND day=? AND item=?', (uid, today, s['id'])).fetchone()
            if (used['n'] if used else 0) + qty > s['limit']:
                raise ValueError(f"Mỗi ngày chỉ mua tối đa {s['limit']} lần.")
        if s.get('card'):
            if qty != 1:
                raise ValueError('Mỗi lần mua một Nguyệt Tạp.')
            debit(db, uid, s['price'], 'buy:' + s['id'])
            card = db.execute('SELECT until FROM premium_card WHERE user_id=?', (uid,)).fetchone()
            until = max(now, card['until'] if card else 0) + s['card'] * 86400
            db.execute("INSERT INTO premium_card VALUES(?,?,'') ON CONFLICT(user_id) DO UPDATE SET until=excluded.until", (uid, until))
            message = 'Đã kích hoạt Nguyệt Tạp. Nhận thưởng mỗi ngày trong Kỳ Trân Các.'
        else:
            import engagement
            debit(db, uid, s['price'] * qty, f"buy:{s['id']}x{qty}")
            for iid, n in s['give'].items():
                engagement.add_material(player, iid, n * qty)
            changed = True
            message = f"Đã mua {qty} × {s.get('name') or ITEMS[s['id']]['name']}. Vật phẩm ở túi đồ."
        if s.get('limit'):
            db.execute('INSERT INTO premium_daily VALUES(?,?,?,?) ON CONFLICT(user_id,day,item) DO UPDATE SET n=n+excluded.n', (uid, today, s['id'], qty))
    elif op == 'card_claim':
        card = db.execute('SELECT until,last_day FROM premium_card WHERE user_id=?', (uid,)).fetchone()
        if not card or card['until'] <= now:
            raise ValueError('Chưa có Nguyệt Tạp hoặc đã hết hạn.')
        if card['last_day'] == day(now):
            raise ValueError('Hôm nay đã nhận thưởng Nguyệt Tạp.')
        db.execute('UPDATE premium_card SET last_day=? WHERE user_id=?', (day(now), uid))
        credit(db, uid, CARD_DAILY['lq'], 'card')
        player['gold'] = min(10 ** 9, player.get('gold', 0) + CARD_DAILY['gold'])
        changed = True
        message = f"Nguyệt Tạp: +{CARD_DAILY['lq']} Linh Quang, +{CARD_DAILY['gold']:,} Linh Thạch.".replace(',', '.')
    elif op == 'use':
        item = next((i for i in player['world'].get('bag', []) if i.get('uid') == body.get('uid')), None)
        if not item or item.get('id') not in ITEMS:
            raise ValueError('Chọn vật phẩm Kỳ Trân trong túi.')
        iid = item['id']
        if iid in ('phu-cuong-hoa', 'khoa-tay-luyen'):
            raise ValueError('Vật phẩm này được dùng tự động tại lò rèn / khi tẩy luyện.')
        take_material(player, iid)
        if iid == 'song-boi-phu':
            buff = db.execute('SELECT exp_until FROM premium_buffs WHERE user_id=?', (uid,)).fetchone()
            until = max(now, buff['exp_until'] if buff else 0) + 3600
            db.execute('INSERT INTO premium_buffs VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET exp_until=excluded.exp_until', (uid, until))
            message = 'Song Bội Kinh Nghiệm: x2 EXP và Linh Thạch khi hạ quái.'
        elif iid == 'be-quan-lenh':
            import engagement
            engagement.state(db, uid)
            db.execute('UPDATE engagement_state SET offline_bank=MIN(?,offline_bank+?) WHERE user_id=?', (24 * 3600, 4 * 3600, uid))
            message = 'Cộng 4 giờ ủy thác bế quan. Nhận tại Phúc lợi › Bế quan.'
        elif iid == 'ruong-manh':
            import shards
            got = shards.grant_random(db, uid, 6)
            message = 'Mở rương: ' + shards.describe(got)
        elif iid == 'thu-hon-bao':
            import shards
            shards.add(db, uid, 'thuhon', 12)
            message = 'Nhận 12 Thú Hồn.'
        elif iid == 'tui-linh-thach':
            player['gold'] = min(10 ** 9, player.get('gold', 0) + 30_000)
            message = 'Nhận 30.000 Linh Thạch.'
        elif iid == 'linh-nguyen-dan':
            player['world']['essence'] = min(10 ** 9, player['world'].get('essence', 0) + 600)
            message = 'Nhận 600 Linh Nguyên.'
        changed = True
    else:
        raise ValueError('Thao tác không hợp lệ.')

    revision = row['revision']
    if changed:
        if body.get('revision') != row['revision']:
            raise ValueError('Nhân vật đã thay đổi. Hãy thử lại.')
        equipment.validate(player, db, uid)
        revision += 1
        db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?', (json.dumps(player, ensure_ascii=False), revision, int(now), uid))
    db.execute('INSERT INTO premium_ops VALUES(?,?)', (uid, opid))
    return dict(character=dict(id=row['id'], player=player, revision=revision), premium=state(db, uid, gm, now), message=message)
