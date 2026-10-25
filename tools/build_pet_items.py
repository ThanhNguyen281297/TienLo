"""Builds the Linh thú equipment slot and the bound pet items from pets.py. Idempotent.

Version 9 turned the Thú cưỡi slot into Linh thú (pets.sync migrates saves);
version 8 retired the Mũ slot."""
import json
import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
path = ROOT/'Item/equipment.json'
rules = json.loads(path.read_text(encoding='utf-8'))
rules['version'] = max(rules['version'], 9)
rules['slots'] = {**{k: v for k, v in rules['slots'].items() if k not in ('mu', 'thucuoi', 'linhthu')}, 'linhthu': 'Linh thú'}
rules['sharedSlots'] = [s for s in rules['sharedSlots'] if s not in ('thucuoi', 'linhthu')] + ['linhthu']
rules['classGear'] = [i for i in rules['classGear'] if i.get('slot') != 'mu']
rules.pop('mountItems', None)
import pets
skills = json.loads((ROOT/'Item/pet-skills.json').read_text(encoding='utf-8'))
rules['petItems'] = [dict(id='pet-'+p['id'], slot='linhthu', petId=p['id'], species=p['species'], name=p['name'], rarity=p['rarity'],
                          req=p['level'], price=0, bound=True, art=(f"Character/Monsters/sprites/{p['species']}/1-01.png" if p['species'] in ('BoNgua', 'Tho', 'Nhen', 'Doi') else f"Character/Monsters/{p['species']}/thumb.webp"), baseHp=p['hp'], baseAtk=p['atk'],
                          skillName=skills[p['species']]['name'], skillDesc=skills[p['species']]['description'], skillCooldown=skills[p['species']]['cooldown'],
                          desc=p['desc']) for p in pets.PETS]
path.write_text(json.dumps(rules, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
(ROOT/'js/24c-equipment-rules.js').write_text('/* Generated from Item/equipment.json. */\nwindow.equipmentRules='+json.dumps(rules, ensure_ascii=False, separators=(',', ':'))+';\n', encoding='utf-8')
print('version', rules['version'], 'slots', len(rules['slots']), 'pet items', len(rules['petItems']))
