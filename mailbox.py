"""Hòm thư: one place for every server mail (community_rewards): raid and battle
chests, leaderboard prizes, auction deliveries, top-up notices and gifts."""
import json
import time

import engagement


def view(db, uid):
    unread = [dict(id=r['id'], title=r['title'], created=r['created'], claimed=False, reward=json.loads(r['payload']))
              for r in db.execute('SELECT * FROM community_rewards WHERE user_id=? AND claimed=0 ORDER BY created DESC LIMIT 60', (uid,))]
    read = [dict(id=r['id'], title=r['title'], created=r['created'], claimed=True, reward=json.loads(r['payload']))
            for r in db.execute('SELECT * FROM community_rewards WHERE user_id=? AND claimed=1 ORDER BY created DESC LIMIT 15', (uid,))]
    for m in unread + read:
        m['text'] = describe(m['reward'])
    return dict(mails=unread + read, unread=len(unread))


def describe(reward):
    if 'lot' in reward:
        item = reward['lot'].get('item') if isinstance(reward['lot'], dict) else None
        return 'Vật phẩm đấu giá' + (f": {item.get('name')}" if isinstance(item, dict) and item.get('name') else '')
    return engagement.describe(reward) or 'Thông báo'


def action(db, uid, body):
    row = db.execute('SELECT * FROM characters WHERE user_id=?', (uid,)).fetchone()
    if not row:
        raise ValueError('Hãy tạo nhân vật trước.')
    if body.get('revision') != row['revision']:
        return dict(conflict=True, error='Nhân vật đã thay đổi. Hãy thử lại.')
    player = json.loads(row['player'])
    op = body.get('action')
    if op == 'claim':
        rows = db.execute('SELECT * FROM community_rewards WHERE id=? AND user_id=? AND claimed=0', (body.get('id'), uid)).fetchall()
        if not rows:
            raise ValueError('Thư đã nhận hoặc không tồn tại.')
    elif op == 'claim_all':
        rows = db.execute('SELECT * FROM community_rewards WHERE user_id=? AND claimed=0 ORDER BY created LIMIT 60', (uid,)).fetchall()
        if not rows:
            raise ValueError('Không có thư chưa nhận.')
    else:
        raise ValueError('Thao tác không hợp lệ.')
    claimed, stopped = [], None
    for r in rows:
        backup = json.loads(json.dumps(player))
        try:
            db.execute('SAVEPOINT mail')
            engagement.grant(db, uid, player, json.loads(r['payload']))
            db.execute('UPDATE community_rewards SET claimed=1 WHERE id=?', (r['id'],))
            db.execute('RELEASE mail')
            claimed.append(r['title'])
        except ValueError as error:   # bag full: keep the rest unread
            db.execute('ROLLBACK TO mail')
            db.execute('RELEASE mail')
            player.clear(); player.update(backup)
            stopped = str(error)
            break
    if not claimed:
        raise ValueError(stopped or 'Không nhận được thư.')
    import equipment
    equipment.validate(player, db, uid)
    revision = row['revision'] + 1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?', (json.dumps(player, ensure_ascii=False), revision, int(time.time()), uid))
    message = f'Đã nhận {len(claimed)} thư.' + (f' {stopped}' if stopped else '')
    return dict(character=dict(id=row['id'], player=player, revision=revision), mail=view(db, uid), message=message)
