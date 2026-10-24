"""Adds the Mũ (helmet) and Thú cưỡi (mount) equipment slots. Idempotent.

Helmets are class gear in four qualities (crafted at Luyện Khí, the plain one is
part of the starter set); their colour follows the robe being worn. Mount items
are the bag/slot form of mounts owned in mounts.py (bought at Mã Phu)."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
path = ROOT/'Item/equipment.json'
rules = json.loads(path.read_text(encoding='utf-8'))
rules['version'] = max(rules['version'], 7)
slots = {k: v for k, v in rules['slots'].items() if k not in ('mu', 'thucuoi')}
rules['slots'] = {**slots, 'mu': 'Mũ', 'thucuoi': 'Thú cưỡi'}
rules['sharedSlots'] = [s for s in rules['sharedSlots'] if s != 'thucuoi'] + ['thucuoi']
STYLE = ['Búi tóc', 'Nón lá', 'Chiến khôi', 'Đạo quan']
NAMES = [
    ['Mộc Trâm Búi Tóc', 'Huyền Ngọc Phát Quan', 'Linh Quang Phát Quan', 'Cửu Tiêu Kim Quan'],
    ['Trúc Bện Nón Lá', 'Hàn Sương Nón Lá', 'Nguyệt Ảnh Tiên Lạp', 'Minh Nguyệt Thiên Lạp'],
    ['Thiết Diệp Chiến Khôi', 'Huyền Thiết Chiến Khôi', 'Lôi Văn Chiến Khôi', 'Cửu Tiêu Lôi Khôi'],
    ['Bố Cân Đạo Quan', 'Huyền Cơ Đạo Quan', 'Linh Phù Đạo Quan', 'Thiên Cơ Tiên Quan'],
]
TIERS = [('pham', 0, 1, 10, 20), ('huyen', 10, 2, 30, 90), ('linh', 25, 4, 55, 200), ('tien', 45, 6, 80, 300)]
gear = [i for i in rules['classGear'] if i.get('slot') != 'mu']
for cls, sect in enumerate(rules['classes']):
    for tier, (rarity, req, armor, hp, price) in enumerate(TIERS):
        gear.append(dict(id=f'mu-{tier}-class-{cls}', slot='mu', name=f'{sect} · {NAMES[cls][tier]}', rarity=rarity, req=req,
                         armor=armor, hp=hp, price=price, baseId=f'mu-{tier}', classIndex=cls, helmet=cls, tier=tier,
                         desc=f'{STYLE[cls]} của {sect}. Màu theo đạo bào đang mặc.'))
rules['classGear'] = gear
import mounts
RARITY = {'doc-thiem': 'pham', 'bang-lang': 'huyen', 'loi-te': 'linh', 'diem-hat': 'linh', 'thuy-long': 'tien', 'phan-phuong': 'tien', 'cot-long': 'than'}
rules['mountItems'] = [dict(id='mount-'+m['id'], slot='thucuoi', mountId=m['id'], species=m['species'], name=m['name'], rarity=RARITY[m['id']],
                            req=m['level'], price=0, bound=True, art=f"Character/Monsters/{m['species']}/thumb.webp",
                            desc=m['desc']+' Mặc vào ô Thú cưỡi để cưỡi; thuần hóa tại Mã Phu.') for m in mounts.MOUNTS]
path.write_text(json.dumps(rules, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT/'js/24c-equipment-rules.js').write_text('/* Generated from Item/equipment.json. */\nwindow.equipmentRules='+json.dumps(rules, ensure_ascii=False, separators=(',', ':'))+';\n', encoding='utf-8')
print('helmets', sum(1 for i in gear if i['slot'] == 'mu'), 'mount items', len(rules['mountItems']))
