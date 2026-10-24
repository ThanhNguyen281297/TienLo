"""Adds the Thú cưỡi (mount) equipment slot and the bound mount items. Idempotent.

Mount items are the bag/slot form of mounts owned in mounts.py (bought at Mã Phu).
Version 8 retired the short-lived Mũ (helmet) slot; equipment.normalize removes
helmet items from older saves."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
path = ROOT/'Item/equipment.json'
rules = json.loads(path.read_text(encoding='utf-8'))
rules['version'] = max(rules['version'], 8)
rules['slots'] = {**{k: v for k, v in rules['slots'].items() if k not in ('mu', 'thucuoi')}, 'thucuoi': 'Thú cưỡi'}
rules['sharedSlots'] = [s for s in rules['sharedSlots'] if s != 'thucuoi'] + ['thucuoi']
rules['classGear'] = [i for i in rules['classGear'] if i.get('slot') != 'mu']
import mounts
RARITY = {'doc-thiem': 'pham', 'bang-lang': 'huyen', 'loi-te': 'linh', 'diem-hat': 'linh', 'thuy-long': 'tien', 'phan-phuong': 'tien', 'cot-long': 'than'}
rules['mountItems'] = [dict(id='mount-'+m['id'], slot='thucuoi', mountId=m['id'], species=m['species'], name=m['name'], rarity=RARITY[m['id']],
                            req=m['level'], price=0, bound=True, art=f"Character/Monsters/{m['species']}/thumb.webp",
                            desc=m['desc']+' Mặc vào ô Thú cưỡi để cưỡi; thuần hóa tại Mã Phu.') for m in mounts.MOUNTS]
path.write_text(json.dumps(rules, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT/'js/24c-equipment-rules.js').write_text('/* Generated from Item/equipment.json. */\nwindow.equipmentRules='+json.dumps(rules, ensure_ascii=False, separators=(',', ':'))+';\n', encoding='utf-8')
print('version', rules['version'], 'slots', len(rules['slots']), 'mount items', len(rules['mountItems']))
