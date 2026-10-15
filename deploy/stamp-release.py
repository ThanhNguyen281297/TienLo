"""Version the JS/CSS URLs in a CI checkout; do not change application state."""
import argparse
from pathlib import Path
import re
parser=argparse.ArgumentParser()
parser.add_argument('revision')
parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
args=parser.parse_args()
if not re.fullmatch('[0-9a-f]{40}',args.revision):parser.error('Expected a 40-character Git commit SHA')
index=args.root/'index.html'
text=index.read_text(encoding='utf-8-sig')
pattern=re.compile(r'''((?:src|href)=["'])((?:js|css)/[^"'?]+)(?:\?[^"']*)?(["'])''')
text,count=pattern.subn(lambda m:m[1]+m[2]+'?v='+args.revision+m[3],text)
if count==0:raise SystemExit('No application assets found to version')
index.write_text(text,encoding='utf-8',newline='\n')
print('Versioned '+str(count)+' asset URLs for '+args.revision)
