"""Consistent SQLite backup including committed WAL data. Run while server is online."""
import argparse
import sqlite3
from datetime import datetime,timezone
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--database',default='/var/lib/tienlo/tienlo.sqlite3')
parser.add_argument('--output',default='/var/lib/tienlo/backups')
args=parser.parse_args()
source=Path(args.database).resolve()
if not source.is_file():raise SystemExit('Database does not exist: '+str(source))
folder=Path(args.output).resolve();folder.mkdir(parents=True,exist_ok=True)
target=folder/('tienlo-'+datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S-%f')+'.sqlite3')
with sqlite3.connect(source.as_uri()+'?mode=ro',uri=True) as src:
    with sqlite3.connect(target) as dst:
        target.chmod(0o600)
        src.backup(dst)
print(target)
