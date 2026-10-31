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
# Artwork is versioned by its own content (git tree ids of the art folders), not by the
# commit: a deploy that changes only code keeps every image URL, so players' caches stay
# valid instead of re-downloading ~17 MB of art after each release.
import hashlib,subprocess
try:art=subprocess.run(['git','-C',str(args.root),'rev-parse',*[f'HEAD:{d}' for d in ('Character','Map','Item','Skill')]],capture_output=True,text=True,check=True).stdout
except Exception:art=args.revision
art_rev=hashlib.sha1(art.encode()).hexdigest()[:12]
text=re.sub(r'<meta name="tienlo-art"[^>]*>\n?','',text)
text=text.replace('<head>','<head><meta name="tienlo-art" content="'+art_rev+'">\n',1) if '<head>' in text else text.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="tienlo-art" content="'+art_rev+'">',1)
index.write_text(text,encoding='utf-8',newline='\n')
print('Versioned '+str(count)+' asset URLs for '+args.revision)
