"""Add a fifth quality from existing equipment art; preserve all owned template IDs."""
import copy
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'Item/equipment.json'
rules=json.loads(path.read_text(encoding='utf-8'))
rules['reforge'].update(gold=60,essence=0,lockGold=40,perLockedGold=25)
rules['qualities']=[dict(id=i,name=n,color=c,cost=cost,level=level) for i,n,c,cost,level in (
 ('pham','Thường','#d4cbb6',10,1),('huyen','Hiếm','#70df9c',15,10),('linh','Cực hiếm','#6fc8ff',20,25),('tien','Siêu phẩm','#cf9cff',25,45),('than','Thần phẩm','#ffcc70',30,70))]
rules['classGear']=[i for i in rules['classGear'] if not i['id'].startswith(('train-10-','sect-'))]
for item in list(rules['classGear']):
    if item['id'].startswith('exp-10-') and item['slot'] in ('daobao','chan','giay'):
        item['rarity']='huyen' # Preserve the published template's existing rarity.
        training=copy.deepcopy(item);training.update(id=item['id'].replace('exp-10-','train-10-'),rarity='pham',training=True)
        rules['classGear'].append(training)
for item in list(rules['classGear']):
    if item['id'].startswith('exp-25-'):
        sect=copy.deepcopy(item);sect.update(id=item['id'].replace('exp-25-','sect-'),name='Trấn Sơn · '+item['name'],source='sect')
        rules['classGear'].append(sect)
for group in ('classGear','backs','shields','formations','rings'):
    rules[group]=[i for i in rules[group] if not i['id'].startswith('mythic-')]
    source=([i for i in rules[group] if i['id'].startswith('exp-70-')] if group=='classGear' else rules[group][-1:] if group=='rings' else list(rules[group]))
    for base in source:
        item=copy.deepcopy(base);item.update(id='mythic-'+base['id'],name='Thái Cổ · '+base['name'],rarity='than',req=max(70,base.get('req',0)),price=max(600,base.get('price',0)))
        for key in ('atk','hp','mp','armor'): 
            if key in item:item[key]=round(item[key]*1.15,2)
        if group=='rings':item['capacity']=40
        rules[group].append(item)
path.write_text(json.dumps(rules,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'js/24c-equipment-rules.js').write_text('/* Generated from Item/equipment.json. */\nwindow.equipmentRules='+json.dumps(rules,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Five equipment qualities; canonical templates:',sum(len(rules[g]) for g in ('classGear','backs','shields','formations','rings','trails','masks')))
