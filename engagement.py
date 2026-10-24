"""Retention systems: daily check-in, offline cultivation, timed events,
achievements with titles and weekly leaderboards.

Every reward here is computed and written by the server (never by a client
save), so it does not pass through the economy budget clamp.
Times follow Vietnam time (GMT+7), like the daily quests in adventure.py.
"""
import json
import secrets
import time
from datetime import datetime, timedelta, timezone

import adventure
import equipment
import progression

VN = timezone(timedelta(hours=7))
OFFLINE_CAP = 12 * 3600          # seconds of offline cultivation that can be banked
OFFLINE_MIN_GAP = 300            # a gap shorter than this is just a reconnect
OFFLINE_MIN_CLAIM = 60

# Day 1..7 of the login cycle. 'items' are material ids from equipment.TEMPLATES.
CHECKIN = (
    dict(gold=200, essence=10),
    dict(fragments=5, items={'cuong-hoa-thach': 2}),
    dict(gold=400, essence=20),
    dict(fragments=10),
    dict(gold=600, items={'cuong-hoa-thach': 3}),
    dict(fragments=15, items={'tinh-luyen-thach': 1}),
    dict(gold=2000, fragments=25, items={'tinh-luyen-thach': 2}),
)

# (id, name, start hour, end hour, weekdays or None, effect)
EVENTS = (
    dict(id='linh-trieu-trua', name='Linh Triều', start=12, end=13, days=None, effect='kill', mult=2,
         desc='Yêu thú cho gấp đôi EXP và Linh Thạch.'),
    dict(id='linh-trieu-toi', name='Linh Triều', start=20, end=21, days=None, effect='kill', mult=2,
         desc='Yêu thú cho gấp đôi EXP và Linh Thạch.'),
    dict(id='huyet-ma-no', name='Huyết Ma Nộ', start=21, end=22, days=None, effect='boss', mult=2,
         desc='Rương Thái Cổ Huyết Ma nhân đôi.'),
    dict(id='chinh-ta-trua', name='Chính – Tà Chi Chiến', start=12.5, end=12.75, days=None, effect='battle', mult=1,
         desc='Chiến trường phe: chiếm cờ, hạ địch, nhận rương theo hạng.'),
    dict(id='chinh-ta-toi', name='Chính – Tà Chi Chiến', start=21, end=21.25, days=None, effect='battle', mult=1,
         desc='Chiến trường phe: chiếm cờ, hạ địch, nhận rương theo hạng.'),
    dict(id='tong-mon-chien', name='Tông Môn Chiến', start=20, end=20.5, days=(2, 5), effect='outpost', mult=1,
         desc='Tranh 4 cứ điểm Sơn Hà: tông môn gây nhiều sát thương nhất lên Trấn Thủ chiếm giữ cả tuần.'),
    dict(id='song-hy', name='Song Hỷ Cuối Tuần', start=0, end=24, days=(5, 6), effect='fragments', mult=2,
         desc='Bí Cảnh rơi gấp đôi mảnh linh khí cả ngày thứ Bảy và Chủ nhật.'),
)

# metric -> how it is read. Titles are cosmetic and shown over the player name.
ACHIEVEMENTS = (
    dict(id='so-nhap', name='Sơ Nhập Tiên Lộ', desc='Hạ 50 yêu thú.', metric='kills', target=50, gold=300, title='Tân Tu Sĩ'),
    dict(id='tram-yeu', name='Trảm Yêu Bách Chiến', desc='Hạ 1.000 yêu thú.', metric='kills', target=1000, gold=1500, fragments=10, title='Trảm Yêu Sư'),
    dict(id='van-yeu', name='Vạn Yêu Đồ Lục', desc='Hạ 10.000 yêu thú.', metric='kills', target=10000, gold=8000, fragments=40, title='Vạn Yêu Tôn'),
    dict(id='tu-phuong', name='Tứ Phương Phá Ấn', desc='Hạ thủ lĩnh cả bốn Bí Cảnh.', metric='seals', target=4, gold=2000, fragments=20, title='Phá Cảnh Giả'),
    dict(id='thap-20', name='Đăng Tháp', desc='Vượt tầng 20 Vạn Tầng Tháp.', metric='tower', target=20, gold=1200, title='Đăng Tháp Khách'),
    dict(id='thap-60', name='Thông Thiên Tháp', desc='Vượt tầng 60 Vạn Tầng Tháp.', metric='tower', target=60, gold=6000, fragments=30, title='Thông Thiên Tháp Chủ'),
    dict(id='luyen-khi', name='Lô Hỏa Thuần Thanh', desc='Cường hóa 30 lần.', metric='enhance', target=30, gold=1000, items={'tinh-luyen-thach': 2}, title='Luyện Khí Sư'),
    dict(id='xao-thu', name='Xảo Thủ Thiên Công', desc='Ghép 5 món trang bị.', metric='craft', target=5, gold=800, title='Xảo Thủ'),
    dict(id='diet-ma', name='Diệt Ma Vệ Đạo', desc='Góp sức hạ Thái Cổ Huyết Ma 5 lần.', metric='worldBoss', target=5, gold=2500, fragments=15, title='Diệt Ma Giả'),
    dict(id='ma-quat', name='Huyết Trì Chinh Phạt', desc='Cùng tổ đội phá Huyết Trì Ma Quật 3 lần.', metric='raidClears', target=3, gold=3000, fragments=20, title='Ma Quật Chinh Phục'),
    dict(id='cap-50', name='Kim Đan Thành Tựu', desc='Đạt cấp 50.', metric='level', target=50, gold=2000, title='Kim Đan Chân Nhân'),
    dict(id='cap-100', name='Nguyên Anh Xuất Khiếu', desc='Đạt cấp 100.', metric='level', target=100, gold=6000, fragments=30, title='Nguyên Anh Lão Tổ'),
    dict(id='chuyen-can', name='Chuyên Cần Tu Đạo', desc='Điểm danh 7 ngày.', metric='checkins', target=7, gold=1000, title='Chuyên Cần'),
    dict(id='be-quan', name='Bế Quan Khổ Tu', desc='Tích lũy 24 giờ bế quan.', metric='offlineHours', target=24, gold=1500, title='Bế Quan Tu Sĩ'),
)
ACHIEVEMENT_IDS = {a['id']: a for a in ACHIEVEMENTS}

BOARDS = (
    dict(id='kills', name='Săn Yêu Tuần', unit='yêu thú'),
    dict(id='tower', name='Vạn Tầng Tháp Tuần', unit='tầng'),
    dict(id='battle', name='Chiến Trường Tuần', unit='điểm'),
    dict(id='pk', name='Sát Thần Tuần', unit='mạng'),
)
BOARD_REWARDS = ((1, 3000, 30), (3, 1500, 15), (10, 600, 6))   # (up to rank, gold, fragments)


def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS engagement_state(user_id INTEGER PRIMARY KEY REFERENCES users(id),
      last_seen REAL NOT NULL DEFAULT 0, offline_bank REAL NOT NULL DEFAULT 0,
      checkin_day TEXT NOT NULL DEFAULT '', streak INTEGER NOT NULL DEFAULT 0, title TEXT NOT NULL DEFAULT '');
    CREATE TABLE IF NOT EXISTS engagement_achievements(user_id INTEGER NOT NULL REFERENCES users(id), id TEXT NOT NULL,
      claimed_at REAL NOT NULL, PRIMARY KEY(user_id,id));
    CREATE TABLE IF NOT EXISTS engagement_settled(week TEXT NOT NULL, board TEXT NOT NULL, PRIMARY KEY(week,board));
    CREATE TABLE IF NOT EXISTS engagement_ops(user_id INTEGER NOT NULL REFERENCES users(id), id TEXT NOT NULL, PRIMARY KEY(user_id,id));
    ''')


# ---------------------------------------------------------------- time helpers
def now_vn(at=None):
    return datetime.fromtimestamp(time.time() if at is None else at, VN)


def today(at=None):
    return now_vn(at).date().isoformat()


def week(at=None):
    year, number, _ = now_vn(at).isocalendar()
    return f'{year}-W{number:02d}'


def previous_week(at=None):
    return week((time.time() if at is None else at) - 7 * 86400)


def active_events(at=None):
    moment = now_vn(at)
    return [e for e in EVENTS if (e['days'] is None or moment.weekday() in e['days']) and e['start'] <= moment.hour + moment.minute / 60 < e['end']]


def _hm(hours):
    return f'{int(hours):02d}:{round(hours % 1 * 60):02d}'


def multiplier(effect, at=None):
    return max([e['mult'] for e in active_events(at) if e['effect'] == effect], default=1)


def schedule(at=None):
    """Active events with seconds left, plus the next start of each event."""
    stamp = time.time() if at is None else at
    moment = now_vn(stamp)
    result = []
    for e in EVENTS:
        for offset in range(0, 8):
            day = (moment + timedelta(days=offset)).replace(hour=0, minute=0, second=0, microsecond=0)
            if e['days'] is not None and day.weekday() not in e['days']:
                continue
            start = day + timedelta(hours=e['start'])
            end = day + timedelta(hours=e['end'])
            if end.timestamp() <= stamp:
                continue
            result.append(dict(id=e['id'], name=e['name'], desc=e['desc'], effect=e['effect'], mult=e['mult'],
                               active=start.timestamp() <= stamp, startsIn=max(0, round(start.timestamp() - stamp)),
                               endsIn=round(end.timestamp() - stamp), hours=f"{_hm(e['start'])}–{_hm(e['end'] % 24)}",
                               weekend=e['days'] is not None))
            break
    return sorted(result, key=lambda e: (not e['active'], e['startsIn']))


# ---------------------------------------------------------------- state
def state(db, uid):
    db.execute('INSERT OR IGNORE INTO engagement_state(user_id) VALUES(?)', (uid,))
    return dict(db.execute('SELECT * FROM engagement_state WHERE user_id=?', (uid,)).fetchone())


def touch(db, uid, at=None):
    """Called from the world heartbeat. A long silence banks offline time."""
    stamp = time.time() if at is None else at
    row = state(db, uid)
    last = row['last_seen']
    if last and stamp - last < 60:
        return
    bank = row['offline_bank']
    if last and stamp - last >= OFFLINE_MIN_GAP:
        bank = min(OFFLINE_CAP, bank + (stamp - last))
    db.execute('UPDATE engagement_state SET last_seen=?,offline_bank=? WHERE user_id=?', (stamp, bank, uid))


def offline_rates(player):
    level = progression.level(player)
    return dict(xp=max(5, progression.required(level) / 1080), gold=4 + level // 4)


def offline_offer(player, seconds):
    minutes = int(seconds // 60)
    rates = offline_rates(player)
    return dict(minutes=minutes, xp=int(rates['xp'] * minutes), gold=int(rates['gold'] * minutes))


# ---------------------------------------------------------------- metrics
def metric(db, uid, player, name):
    if name == 'tower':
        row = db.execute('SELECT best FROM tower_progress WHERE user_id=?', (uid,)).fetchone()
        return row['best'] if row else 0
    if name == 'level':
        return progression.level(player)
    if name == 'seals':
        return adventure.progress(db, uid, 'seals')
    return adventure.count(db, uid, name)


def board_value_key(board, wk):
    return f'week:{wk}:{board}'


def record_kill(db, uid):
    adventure.add(db, uid, board_value_key('kills', week()))


def record_tower(db, uid, floor):
    key = board_value_key('tower', week())
    current = adventure.count(db, uid, key)
    if floor > current:
        adventure.add(db, uid, key, floor - current)


def board(db, board_id, wk, limit=10):
    rows = db.execute('''SELECT c.user_id,c.value,ch.player FROM adventure_counters c JOIN characters ch ON ch.user_id=c.user_id
        WHERE c.key=? AND c.value>0 ORDER BY c.value DESC,c.user_id LIMIT ?''', (board_value_key(board_id, wk), limit)).fetchall()
    return [dict(rank=i + 1, id=r['user_id'], name=json.loads(r['player'])['nm'], value=int(r['value'])) for i, r in enumerate(rows)]


def board_reward(rank):
    for top, gold, fragments in BOARD_REWARDS:
        if rank <= top:
            return dict(gold=gold, fragments=fragments)
    return None


def settle(db, at=None):
    """Mail last week's top-10 rewards once (lazy, first request of the new week)."""
    wk = previous_week(at)
    for b in BOARDS:
        if not db.execute('INSERT OR IGNORE INTO engagement_settled VALUES(?,?)', (wk, b['id'])).rowcount:
            continue
        for entry in board(db, b['id'], wk):
            reward = board_reward(entry['rank'])
            mail(db, entry['id'], f"{b['name']} {wk} · Hạng {entry['rank']}", reward, f"week:{wk}:{b['id']}:{entry['id']}")


def mail(db, uid, title, payload, key=None):
    """Mailbox = community_rewards; claimed from the Đội / Tông môn panel or the Phúc lợi panel."""
    db.execute('INSERT OR IGNORE INTO community_rewards VALUES(?,?,?,?,0,?)',
               (key or secrets.token_hex(12), uid, title, json.dumps(payload), time.time()))


# ---------------------------------------------------------------- rewards
def add_material(player, iid, qty):
    bag = player['world'].setdefault('bag', [])
    stack = next((i for i in bag if i.get('id') == iid and i.get('type') == 'material'), None)
    if stack:
        stack['qty'] = min(9999, stack.get('qty', 1) + qty)
        return
    if len(bag) >= equipment.capacity(player['world']):
        raise ValueError('Túi đầy. Dọn một ô trống rồi nhận lại.')
    bag.append(dict(equipment.TEMPLATES[iid], uid=secrets.token_hex(16), qty=qty))


def grant(db, uid, player, reward):
    """Apply a reward dict to the stored player. Raises ValueError when the bag is full."""
    for iid, qty in (reward.get('items') or {}).items():
        add_material(player, iid, qty)
    for iid in reward.get('gear') or []:
        adventure.grant_item(db, uid, player, iid)
    player['gold'] = min(10 ** 9, player.get('gold', 0) + reward.get('gold', 0))
    world = player.setdefault('world', {})
    world['essence'] = min(10 ** 9, world.get('essence', 0) + reward.get('essence', 0))
    if reward.get('xp'):
        adventure.gain(player, reward['xp'])
    if reward.get('fragments'):
        adventure.grant_fragments(db, uid, reward['fragments'])


def describe(reward):
    parts = []
    if reward.get('gold'): parts.append(f"{reward['gold']} ◈")
    if reward.get('xp'): parts.append(f"{reward['xp']} EXP")
    if reward.get('essence'): parts.append(f"{reward['essence']} Linh Nguyên")
    if reward.get('fragments'): parts.append(f"{reward['fragments']} mảnh linh khí")
    for iid, qty in (reward.get('items') or {}).items(): parts.append(f"{qty} {equipment.TEMPLATES[iid]['name']}")
    for iid in reward.get('gear') or []: parts.append(equipment.TEMPLATES[iid]['name'])
    return ' · '.join(parts)


# ---------------------------------------------------------------- snapshot / actions
def snapshot(db, uid, player, at=None):
    settle(db, at)
    row = state(db, uid)
    stamp = time.time() if at is None else at
    day = today(stamp)
    yesterday = today(stamp - 86400)
    streak = row['streak'] if row['checkin_day'] in (day, yesterday) else 0
    next_day = streak % 7 + 1 if row['checkin_day'] != day else None
    claimed = {r['id'] for r in db.execute('SELECT id FROM engagement_achievements WHERE user_id=?', (uid,))}
    achievements = []
    for a in ACHIEVEMENTS:
        value = metric(db, uid, player, a['metric'])
        achievements.append(dict(id=a['id'], name=a['name'], desc=a['desc'], title=a['title'], target=a['target'],
                                 value=min(a['target'], int(value)), claimed=a['id'] in claimed,
                                 reward=describe(a)))
    wk = week(stamp)
    boards = []
    for b in BOARDS:
        mine = int(adventure.count(db, uid, board_value_key(b['id'], wk)))
        top = board(db, b['id'], wk)
        rank = next((e['rank'] for e in top if e['id'] == uid), None)
        boards.append(dict(id=b['id'], name=b['name'], unit=b['unit'], top=top, mine=mine, rank=rank))
    offer = offline_offer(player, row['offline_bank'])
    return dict(
        checkin=dict(streak=streak, today=row['checkin_day'] == day, next=next_day,
                     rewards=[dict(day=i + 1, text=describe(r), **{k: v for k, v in r.items() if k != 'items'},
                                  items=[dict(id=iid, name=equipment.TEMPLATES[iid]['name'], art=equipment.TEMPLATES[iid].get('art'), qty=qty) for iid, qty in (r.get('items') or {}).items()]) for i, r in enumerate(CHECKIN)]),
        offline=dict(seconds=int(row['offline_bank']), cap=OFFLINE_CAP, **offer),
        events=schedule(stamp), achievements=achievements, title=row['title'],
        titles=[a['title'] for a in ACHIEVEMENTS if a['id'] in claimed],
        boards=boards, week=wk, weekEndsIn=_week_left(stamp),
        boardRewards=[dict(top=t, text=describe(dict(gold=g, fragments=f))) for t, g, f in BOARD_REWARDS])


def _week_left(stamp):
    moment = now_vn(stamp)
    monday = (moment + timedelta(days=7 - moment.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return round(monday.timestamp() - stamp)


def title_of(db, uid):
    row = db.execute('SELECT title FROM engagement_state WHERE user_id=?', (uid,)).fetchone()
    return row['title'] if row else ''


def action(db, uid, body, at=None):
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    if not row:
        raise ValueError('Hãy tạo nhân vật trước.')
    player = json.loads(row['player'])
    op = body.get('action')
    opid = body.get('opId')
    if not isinstance(op, str) or not isinstance(opid, str) or not 8 <= len(opid) <= 100:
        raise ValueError('Thao tác không hợp lệ.')
    character = lambda: dict(id=row['id'], player=player, revision=row['revision'])
    if db.execute('SELECT 1 FROM engagement_ops WHERE user_id=? AND id=?', (uid, opid)).fetchone():
        return dict(character=character(), engagement=snapshot(db, uid, player, at))
    if op == 'title':
        title = body.get('title')
        if title != '' and title not in snapshot(db, uid, player, at)['titles']:
            raise ValueError('Chưa mở khóa danh hiệu này.')
        state(db, uid)
        db.execute('UPDATE engagement_state SET title=? WHERE user_id=?', (title, uid))
        db.execute('INSERT INTO engagement_ops VALUES(?,?)', (uid, opid))
        return dict(engagement=snapshot(db, uid, player, at))
    if body.get('revision') != row['revision']:
        return dict(conflict=True, error='Nhân vật đã thay đổi. Hãy thử lại.')
    stamp = time.time() if at is None else at
    current = state(db, uid)
    message = ''
    if op == 'checkin':
        day = today(stamp)
        if current['checkin_day'] == day:
            raise ValueError('Hôm nay đã điểm danh.')
        streak = current['streak'] % 7 + 1 if current['checkin_day'] == today(stamp - 86400) else 1
        reward = CHECKIN[streak - 1]
        grant(db, uid, player, reward)
        db.execute('UPDATE engagement_state SET checkin_day=?,streak=? WHERE user_id=?', (day, streak, uid))
        adventure.add(db, uid, 'checkins')
        message = f'Điểm danh ngày {streak}: ' + describe(reward)
    elif op == 'offline':
        seconds = current['offline_bank']
        if seconds < OFFLINE_MIN_CLAIM:
            raise ValueError('Chưa có tu vi bế quan để nhận.')
        offer = offline_offer(player, seconds)
        grant(db, uid, player, dict(xp=offer['xp'], gold=offer['gold']))
        db.execute('UPDATE engagement_state SET offline_bank=0 WHERE user_id=?', (uid,))
        adventure.add(db, uid, 'offlineHours', seconds / 3600)
        message = f"Bế quan {offer['minutes']} phút: {offer['xp']} EXP · {offer['gold']} ◈"
    elif op == 'achievement':
        a = ACHIEVEMENT_IDS.get(body.get('id'))
        if not a:
            raise ValueError('Thành tựu không tồn tại.')
        if metric(db, uid, player, a['metric']) < a['target']:
            raise ValueError('Chưa đạt thành tựu.')
        if not db.execute('INSERT OR IGNORE INTO engagement_achievements VALUES(?,?,?)', (uid, a['id'], stamp)).rowcount:
            raise ValueError('Đã nhận thưởng thành tựu này.')
        grant(db, uid, player, a)
        message = f"Thành tựu {a['name']} · danh hiệu「{a['title']}」"
    else:
        raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(player, db, uid)
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',
               (json.dumps(player, ensure_ascii=False), revision, int(stamp), uid))
    db.execute('INSERT INTO engagement_ops VALUES(?,?)', (uid, opid))
    return dict(character=dict(id=row['id'], player=player, revision=revision), engagement=snapshot(db, uid, player, at), message=message)
