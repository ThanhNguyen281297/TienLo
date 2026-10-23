"""List or permanently delete Tiên Lộ accounts and everything they own.

Dry-run by default; add --yes to delete. A backup copy of the database is
written next to it before anything is removed.

  python3 delete-accounts.py --list
  python3 delete-accounts.py --delete alice bob            # preview
  python3 delete-accounts.py --delete alice bob --yes      # delete
  python3 delete-accounts.py --all-except admin --yes      # wipe every other account
"""
import argparse
import sqlite3
import time
from pathlib import Path

# Columns that hold a user id, per table (anything not listed is left alone).
USER_COLUMNS = ('user_id', 'uid', 'friend_id', 'from_user_id', 'to_user_id', 'challenger', 'target')
TRADE_COLUMNS = ('a', 'b')

p = argparse.ArgumentParser(description='List or delete Tiên Lộ accounts.')
p.add_argument('--db', type=Path, default=Path('/var/lib/tienlo/tienlo.sqlite3'))
mode = p.add_mutually_exclusive_group(required=True)
mode.add_argument('--list', action='store_true', help='show every account')
mode.add_argument('--delete', nargs='+', metavar='USERNAME', help='delete these accounts')
mode.add_argument('--all-except', nargs='*', metavar='USERNAME', help='delete every account except these')
p.add_argument('--yes', action='store_true', help='really delete (otherwise only preview)')
a = p.parse_args()
if not a.db.is_file():
    p.error('Database does not exist: ' + str(a.db))

db = sqlite3.connect(str(a.db), timeout=30)
db.row_factory = sqlite3.Row
rows = db.execute('''SELECT u.id,u.username,u.gm,u.created_at,json_extract(c.player,'$.nm') nm,json_extract(c.player,'$.level') level
    FROM users u LEFT JOIN characters c ON c.user_id=u.id ORDER BY u.id''').fetchall()

if a.list:
    print(f'{"id":>5}  {"username":<24} {"gm":<3} {"created":<16} nhân vật (cấp)')
    for r in rows:
        created = time.strftime('%Y-%m-%d %H:%M', time.localtime(r['created_at']))
        print(f"{r['id']:>5}  {r['username']:<24} {'GM' if r['gm'] else '':<3} {created:<16} {r['nm'] or '-'} ({r['level'] or '-'})")
    print(f'{len(rows)} tài khoản.')
    raise SystemExit

names = {r['username']: r for r in rows}
if a.delete:
    missing = [n for n in a.delete if n.lower() not in names]
    if missing:
        p.error('Không tìm thấy: ' + ', '.join(missing))
    targets = [names[n.lower()] for n in a.delete]
else:
    keep = {n.lower() for n in a.all_except}
    missing = [n for n in keep if n not in names]
    if missing:
        p.error('Không tìm thấy tài khoản cần giữ: ' + ', '.join(missing))
    targets = [r for r in rows if r['username'] not in keep]

if not targets:
    print('Không có tài khoản nào để xóa.')
    raise SystemExit
print('Sẽ xóa %d tài khoản:' % len(targets))
for r in targets:
    print(f"  id={r['id']} {r['username']} · {r['nm'] or '-'}{' · GM' if r['gm'] else ''}")
if not a.yes:
    print('\nChỉ xem trước. Thêm --yes để xóa thật.')
    raise SystemExit

backup = a.db.with_name(a.db.stem + time.strftime('-before-delete-%Y%m%d-%H%M%S') + a.db.suffix)
with sqlite3.connect(str(backup)) as copy:
    db.backup(copy)
print('Đã sao lưu: ' + str(backup))

ids = [r['id'] for r in targets]
marks = ','.join('?' for _ in ids)
tables = [t['name'] for t in db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")]
db.execute('PRAGMA foreign_keys=ON')
with db:
    # Groups led by a deleted account are dissolved first (members, invites, requests).
    for kind, members, extra in (('parties', 'party_members', ('party_invites',)), ('guilds', 'guild_members', ('guild_requests', 'guild_daily'))):
        if kind not in tables:
            continue
        led = [r[0] for r in db.execute(f'SELECT id FROM {kind} WHERE leader IN ({marks})', ids)]
        if led:
            lm = ','.join('?' for _ in led)
            key = 'party_id' if kind == 'parties' else 'guild_id'
            for table in (members, *extra):
                if table in tables:
                    db.execute(f'DELETE FROM {table} WHERE {key} IN ({lm})', led)
            db.execute(f'DELETE FROM {kind} WHERE id IN ({lm})', led)
    if 'raid_runs' in tables:
        db.execute(f'DELETE FROM raid_runs WHERE leader IN ({marks})', ids)
    removed = 0
    for table in tables:
        if table == 'users':
            continue
        columns = {c[1] for c in db.execute(f'PRAGMA table_info({table})')}
        wanted = [c for c in USER_COLUMNS if c in columns] + ([c for c in TRADE_COLUMNS if c in columns] if table == 'player_trades' else [])
        for column in wanted:
            removed += db.execute(f'DELETE FROM {table} WHERE {column} IN ({marks})', ids).rowcount
    db.execute(f'DELETE FROM users WHERE id IN ({marks})', ids)
print(f'Đã xóa {len(ids)} tài khoản và {removed} dòng dữ liệu liên quan.')
print('Khởi động lại game server để xóa trạng thái online còn trong bộ nhớ.')
