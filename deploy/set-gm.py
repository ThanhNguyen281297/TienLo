"""Run as the DB owner. Never accepts passwords, creates accounts or initializes a DB."""
import argparse
import sqlite3
from pathlib import Path
p=argparse.ArgumentParser(description='Grant/revoke Tiên Lộ GM for an existing account.')
p.add_argument('username');p.add_argument('--db',type=Path,default=Path('/var/lib/tienlo/tienlo.sqlite3'))
g=p.add_mutually_exclusive_group(required=True);g.add_argument('--enable',action='store_true');g.add_argument('--disable',action='store_true')
a=p.parse_args()
if not a.db.is_file():p.error('Database does not exist: '+str(a.db))
with sqlite3.connect(str(a.db)) as db:
    if 'gm' not in {r[1] for r in db.execute('PRAGMA table_info(users)')}:p.error('Deploy the GM migration before using this command.')
    cur=db.execute('UPDATE users SET gm=? WHERE username=?',(int(a.enable),a.username.lower()))
    if cur.rowcount!=1:p.error('Account not found. No account was created.')
    row=db.execute('SELECT id,username,gm FROM users WHERE username=?',(a.username.lower(),)).fetchone()
    print('id=%s username=%s gm=%s'%row)
print('Log out and log in again to refresh the game UI. Server authorization is immediate.')
