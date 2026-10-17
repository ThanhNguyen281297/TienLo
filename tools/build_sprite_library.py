"""Export reusable PNG pieces and monster poses; preserve existing source pixels."""
import json
from io import BytesIO
import time
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PAD = 8
catalog = {'maps': [], 'modules': {}, 'monsterFrames': {}, 'monsters': [],
           'skills': [], 'characters': [], 'items': [], 'npcs': []}


def save_png(image, path):
    buffer = BytesIO()
    image.save(buffer, format='PNG')
    data = buffer.getvalue()
    if path.exists() and path.read_bytes() == data:
        return
    temporary = path.with_suffix('.png.tmp')
    temporary.write_bytes(data)
    for attempt in range(5):
        try:
            temporary.replace(path)
            return
        except OSError:
            if attempt == 4:
                raise
            time.sleep(.05)


def record(path, key=None, **extra):
    image = Image.open(ROOT / path)
    return dict(id=key or Path(path).stem, src=path, width=image.width,
                height=image.height, **extra)


# Individual reusable pieces, not resized or redrawn. Paving, stairs, trees,
# statues and buildings remain separate PNGs in Map/sprites.
pieces = {
    'cliff': ('Map/hd/cliff-rock.png', (0, 0, 1254, 1254)),
    'flow': ('Map/sprites/waterfall.png', (70, 80, 140, 250)),
    'arch': ('Map/sprites/bridge.png', (58, 68, 286, 139)),
    'railPost': ('Map/sprites/bridgeRail.png', (0, 0, 10, 13)),
}
folder = ROOT / 'Map/modules'
folder.mkdir(exist_ok=True)
for key, (source, box) in pieces.items():
    image = Image.open(ROOT / source).convert('RGBA').crop(box)
    save_png(image, folder / (key + '.png'))
    catalog['modules'][key] = record('Map/modules/' + key + '.png', key,
                                     source=source, sourceBox=box)
cloud = Image.open(ROOT / 'Map/sprites/cloud.png').convert('RGBA')
box = cloud.getchannel('A').getbbox()
save_png(cloud.crop(box), folder / 'cloud.png')
catalog['modules']['cloud'] = record('Map/modules/cloud.png', 'cloud',
                                     source='Map/sprites/cloud.png', sourceBox=box)

for path in sorted((ROOT / 'Map/sprites').glob('*.png')):
    bounds = Image.open(path).convert('RGBA').getchannel('A').getbbox()
    catalog['maps'].append(record(path.relative_to(ROOT).as_posix(), anchor=[.5, 1], bounds=list(bounds)))

# Keep original timing / origin, while exporting whole PNG poses with alpha padding.
text = (ROOT / 'Character/Monsters/frames.js').read_text(encoding='utf-8')
frames = json.loads(text.split('=', 1)[1].strip().rstrip(';'))
for species, sheets in frames.items():
    catalog['monsterFrames'][species] = []
    dest = ROOT / 'Character/Monsters/sprites' / species
    dest.mkdir(parents=True, exist_ok=True)
    for sheet, poses in enumerate(sheets, 1):
        source = f'Character/Monsters/{species}/{sheet}.png'
        image = Image.open(ROOT / source).convert('RGBA')
        entries = []
        for index, rect in enumerate(poses):
            x, y, w, h = (rect[k] for k in ('x', 'y', 'w', 'h'))
            pose = Image.new('RGBA', (w + PAD * 2, h + PAD * 2))
            pose.paste(image.crop((x, y, x + w, y + h)), (PAD, PAD))
            name = f'{sheet}-{index+1:02}.png'
            save_png(pose, dest / name)
            entry = record(f'Character/Monsters/sprites/{species}/{name}', f'{species}/{sheet}/{index+1}',
                           source=source, rect=rect, sourceHeight=image.height, padding=PAD)
            entries.append(entry)
            catalog['monsters'].append(entry)
        catalog['monsterFrames'][species].append(entries)

skill_manifest = json.loads((ROOT / 'Skill/Class/manifest.json').read_text())
for sect, skills in skill_manifest.items():
    for skill, poses in skills.items():
        for i, pose in enumerate(poses):
            catalog['skills'].append(record(pose['src'], f'{sect}/{skill}/{i+1}', bounds=pose['bounds']))
for sect in ('Kiem', 'Liem', 'Thuong', 'Quat'):
    for kind in ('Nam', 'Nu'):
        for path in sorted((ROOT / 'Character' / sect / kind).glob('*.png')):
            catalog['characters'].append(record(path.relative_to(ROOT).as_posix(), f'{sect}/{kind}/{path.stem}'))
for path in sorted((ROOT / 'Item').rglob('*.png')):
    if not (path.parent.name=='PhapTran' and path.stem in ('1','2','3','4')):catalog['items'].append(record(path.relative_to(ROOT).as_posix(),path.relative_to(ROOT/'Item').with_suffix('').as_posix()))
for path in sorted((ROOT / 'Character/NPC').glob('*.png')):
    catalog['npcs'].append(record(path.relative_to(ROOT).as_posix()))

(ROOT / 'Map/sprite-catalog.json').write_text(json.dumps(catalog, indent=2) + '\n', encoding='utf-8')
(ROOT / 'js/10b-sprite-catalog.js').write_text('window.spriteCatalog=' + json.dumps(catalog, separators=(',', ':')) + ';\n', encoding='utf-8')
print({key: len(value) for key, value in catalog.items()})
