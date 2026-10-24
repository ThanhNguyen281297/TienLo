"""Bundle the browser scripts of a CI checkout into two files.

index.html loads ~100 classic scripts that share one global scope. In a release
they are concatenated in the same order into:
  js/boot.bundle.js  - scripts in <head> (protection, WebP swap)
  js/app.bundle.js   - every script in <body>, placed where the last one was
Run before deploy/stamp-release.py (which then versions the bundle URLs).
The development checkout keeps the individual files.
"""
import argparse
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
args = parser.parse_args()
index = args.root / 'index.html'
html = index.read_text(encoding='utf-8-sig')
tag = re.compile(r'<script src="(js/[^"?]+)(?:\?[^"]*)?"></script>\n?')
head, body = html.split('<body>', 1)


def bundle(part, name):
    files = tag.findall(part)
    if not files:
        return part, 0
    chunks = []
    for file in files:
        code = (args.root / file).read_text(encoding='utf-8-sig').rstrip()
        chunks.append(f'/* {file} */\n{code}\n;')
    (args.root / 'js' / name).write_text('\n'.join(chunks) + '\n', encoding='utf-8', newline='\n')
    marker = '\x00BUNDLE\x00'
    last = list(tag.finditer(part))[-1]
    part = part[:last.start()] + marker + part[last.end():]
    part = tag.sub('', part).replace(marker, f'<script src="js/{name}"></script>\n')
    return part, len(files)


head, a = bundle(head, 'boot.bundle.js')
body, b = bundle(body, 'app.bundle.js')
index.write_text(head + '<body>' + body, encoding='utf-8', newline='\n')
print(f'Bundled {a} head and {b} body scripts')
