"""Equipment catalog, conservative affixes and persistent shield cooldowns."""
import json
import community
import secrets
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RULES = json.loads((ROOT/'Item'/'equipment.json').read_text(encoding='utf-8'))
TEMPLATES = {t['id']: t for group in ('classGear','rings','shields','backs','formations','trails') for t in RULES[group]}
STAT_KEYS = ('atk','hp','mp','armor','crit','dodge','skill')

def pool(item):
    return RULES['offense'] if item.get('slot')=='phapbao' else RULES['defense'] if item.get('slot')=='ngoc' else []

def defaults(item):
    return [{'key':r['key'],'value':r['min']} for r in pool(item)[:5]]

def items(player):
    w=player.get('world',{})
    return w.get('bag',[])+[i for i in w.get('equip',{}).values() if i]

def capacity(world):
    equip=world.get('equip',{}) if isinstance(world,dict) else {}
    ring=(equip.get('gioi') or {}) if isinstance(equip,dict) else {}
    if not isinstance(ring,dict):return 30
    meta=TEMPLATES.get(ring.get('id'),{})
    return 30+(meta.get('capacity',0) if meta.get('slot')=='gioi' else 0)

def legacy_collection(item_id):
    match=re.fullmatch(r'rift-([a-z]+)-([a-z]+)-(0|10|25|45)',item_id)
    if not match:return None
    set_id,slot,level=match.groups();legacy=RULES['legacyCollection']
    slot='chan' if slot=='gioi' else slot
    if set_id not in {t['id'] for t in legacy['sets']} or slot not in legacy['slots']:return None
    grade=next(g for g in legacy['grades'] if g['req']==int(level))
    stats={k:round(v*(1 if k in ('crit','dodge','skill') else grade['scale']),2) for k,v in legacy['baseStats'][slot].items()}
    return dict(id=item_id,setId=set_id,slot=slot,req=int(level),rarity=grade['rarity'],**stats)


def canonical_id(item_id, cls):
    if item_id in TEMPLATES:return item_id
    if item_id in {t['baseId'] for t in RULES['classGear']}:return item_id+'-class-'+str(cls)
    if item_id in ('thach-ngoc','tu-linh-ngoc','minh-nguyet-ngoc'):return 'shield-'+str(1+('thach-ngoc','tu-linh-ngoc','minh-nguyet-ngoc').index(item_id))
    if item_id in ('ho-tam-kinh','tu-linh-chau','cuu-chuyen-dinh'):return 'back-class-'+str(cls)
    meta=legacy_collection(item_id)
    if not meta:return item_id
    if meta['slot'] in RULES['classSlots']:
        tier=(0,10,25,45).index(meta['req'])
        return RULES['legacySlotTiers'][meta['slot']][tier]+'-class-'+str(cls)
    style=RULES['collectionAppearance'][meta['setId']]
    return style['back'] if meta['slot']=='phapbao' else 'shield-'+str(style['shield'])


def normalize(player, collection=None):
    """Migrate owned gear, never grant starting items. Keep UIDs and reforge lines."""
    if not isinstance(player.get('ap'),dict) or not isinstance(player.get('world',{}),dict):return False
    w=player.setdefault('world',{});equip=w.setdefault('equip',{});w.setdefault('bag',[])
    if not isinstance(equip,dict) or not isinstance(w['bag'],list) or any(not isinstance(i,dict) for i in w['bag']+[i for i in equip.values() if i is not None]):return False
    if w.get('equipmentVersion',0)>=RULES['version']:return False
    cls=player['ap'].get('w')
    if type(cls) is not int or cls not in range(4):return False
    if w.get('equipmentVersion',0)>=4:
        for item in items(player):
            meta=TEMPLATES.get(item.get('id'))
            if item.get('slot')=='chan' and meta:item['art']=meta['art']
        for slot in RULES['slots']:equip.setdefault(slot,None)
        w['equipmentVersion']=RULES['version']
        return True
    oldring=equip.get('gioi')
    if oldring and isinstance(oldring.get('id'),str) and oldring['id'].startswith('rift-'):
        equip['chan']=oldring;equip['gioi']=None
    def convert(item):
        iid=item.get('id','')
        if not isinstance(iid,str):return
        meta=TEMPLATES.get(canonical_id(iid,cls))
        if meta:
            for key in (*STAT_KEYS,'classIndex','art','capacity','variant','setId','source','baseId'):item.pop(key,None)
            item.update(meta)
            if pool(item) and not item.get('affixes'):item['affixes']=defaults(item)
        else:
            item.pop('setId',None);item.pop('source',None)
    for item in items(player):convert(item)
    pending=w.get('riftPendingItem')
    if isinstance(pending,str):
        item=dict(id=pending,uid=secrets.token_hex(16));convert(item)
        if item['id'] in TEMPLATES:
            if len(w['bag'])<capacity(w):w['bag'].append(item)
            else:player['gold']=min(10**9,player.get('gold',0)+max(1,item.get('price',60)))
    fragments=w.pop('thangViFragments',0)
    if type(fragments) is int and fragments>0:player['gold']=min(10**9,player.get('gold',0)+fragments)
    shards=w.get('riftShards',0)
    if type(shards) is int and shards>0:
        converted=min(10**9,shards*20);player['gold']=min(10**9,player.get('gold',0)+converted);w['retiredShardGold']=w.get('retiredShardGold',0)+converted
    for key in ('riftShards','riftFocus','riftPendingItem'):w.pop(key,None)
    for slot in RULES['slots']:equip.setdefault(slot,None)
    w['equipmentVersion']=RULES['version']
    return True


def validate(player, db=None, owner=None):
    w=player.get('world',{}); equip=w.get('equip',{})
    if len(w.get('bag',[]))>capacity(w):raise ValueError('Túi vượt sức chứa của nhẫn trữ vật.')
    seen=set()
    for item in items(player):
        uid=item.get('uid')
        if not isinstance(uid,str) or not 1<=len(uid)<=100 or uid in seen:raise ValueError('Mã vật phẩm không hợp lệ hoặc trùng lặp.')
        seen.add(uid)
        meta=TEMPLATES.get(item.get('id'))
        if meta:
            for key in ('slot','classIndex','capacity','variant','art','req','rarity','price',*STAT_KEYS):
                if item.get(key,0)!=meta.get(key,0):raise ValueError('Chỉ số trang bị không hợp lệ.')
        elif item.get('slot') in RULES['slots']:raise ValueError('Trang bị tiện ích không hợp lệ.')
        allowed=pool(item)
        if not allowed:
            if item.get('affixes'):raise ValueError('Trang bị không có dòng tẩy luyện.')
            continue
        lines=item.get('affixes',[]);lookup={r['key']:r for r in allowed}
        if not isinstance(lines,list) or len(lines)!=5:raise ValueError('Pháp bảo và hộ thuẫn cần đúng 5 dòng.')
        if any(not isinstance(line,dict) or set(line)!={'key','value'} or line.get('key') not in lookup or type(line.get('value')) is not int or not lookup[line['key']]['min']<=line['value']<=lookup[line['key']]['max'] for line in lines):raise ValueError('Dòng tẩy luyện vượt giới hạn.')
        if len({line['key'] for line in lines})!=5:raise ValueError('Không được trùng dòng tẩy luyện.')
        if db is not None:
            roll=db.execute('SELECT item_id,lines FROM equipment_rolls WHERE user_id=? AND item_uid=?',(owner,uid)).fetchone()
            expected=json.loads(roll['lines']) if roll else defaults(item)
            if (roll and roll['item_id']!=item['id']) or lines!=expected:raise ValueError('Dòng tẩy luyện phải do server cấp.')
    for slot,item in equip.items():
        if item and (item.get('slot')!=slot or (slot not in RULES['sharedSlots'] and item.get('classIndex',player['ap']['w'])!=player['ap']['w'])):raise ValueError('Trang bị không phù hợp ô hoặc class.')

def bonuses(player):
    result={}
    for item in player.get('world',{}).get('equip',{}).values():
        if not item:continue
        for line in item.get('affixes',[]):
            rule=next((r for r in pool(item) if r['key']==line.get('key')),None)
            if rule:result[line['key']]=result.get(line['key'],0)+line['value']/(10000 if rule['percent'] else 100 if rule['key']=='regen' else 1)
    return result

def init_db(db, collection):
    db.executescript('''CREATE TABLE IF NOT EXISTS equipment_rolls(user_id INTEGER NOT NULL REFERENCES users(id),item_uid TEXT NOT NULL,item_id TEXT NOT NULL,lines TEXT NOT NULL,PRIMARY KEY(user_id,item_uid));
    CREATE TABLE IF NOT EXISTS shield_cooldowns(user_id INTEGER PRIMARY KEY REFERENCES users(id),ready_at REAL NOT NULL,active_until REAL NOT NULL,source_uid TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS equipment_migration_versions(user_id INTEGER NOT NULL,revision INTEGER NOT NULL,player TEXT NOT NULL,PRIMARY KEY(user_id,revision));
    CREATE TABLE IF NOT EXISTS equipment_ops(user_id INTEGER NOT NULL,op_id TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,op_id));''')
    for row in db.execute('SELECT * FROM characters').fetchall():
        player=json.loads(row['player'])
        if normalize(player,collection):
            # Original JSON stays recoverable alongside the migrated character.
            db.execute('CREATE TABLE IF NOT EXISTS equipment_migration_backup(user_id INTEGER PRIMARY KEY,player TEXT NOT NULL,revision INTEGER NOT NULL)')
            db.execute('INSERT OR IGNORE INTO equipment_migration_backup VALUES(?,?,?)',(row['user_id'],row['player'],row['revision']))
            db.execute('INSERT OR IGNORE INTO equipment_migration_versions VALUES(?,?,?)',(row['user_id'],row['revision'],row['player']))
            for item in items(player):
                db.execute('UPDATE equipment_rolls SET item_id=? WHERE user_id=? AND item_uid=?',(item['id'],row['user_id'],item['uid']))
            db.execute('UPDATE characters SET player=?,revision=revision+1 WHERE user_id=?',(json.dumps(player,ensure_ascii=False),row['user_id']))

def shield_variant(item):
    meta=TEMPLATES.get(item.get('id'),{})
    style=RULES['collectionAppearance'].get(item.get('setId'),{}) if item.get('id','').startswith('rift-') else {}
    return meta.get('variant',style.get('shield',1))


def shield_state(db, owner, player):
    row=db.execute('SELECT * FROM shield_cooldowns WHERE user_id=?',(owner,)).fetchone()
    item=player.get('world',{}).get('equip',{}).get('ngoc') or {}
    now=time.time();active=bool(row and row['source_uid']==item.get('uid') and player.get('hp',0)>0 and row['active_until']>now)
    variant=shield_variant(item)
    buff=TEMPLATES.get('shield-'+str(variant),{}).get('buff',1)
    return dict(now=now,readyAt=row['ready_at'] if row else 0,activeUntil=row['active_until'] if active else 0,sourceUid=item.get('uid'),variant=variant,buff=buff)

def action(db, owner, body):
    row=db.execute('SELECT * FROM characters WHERE user_id=?',(owner,)).fetchone()
    if not row:raise ValueError('Hãy tạo nhân vật trước.')
    player=json.loads(row['player']);op=body.get('action')
    if body.get('action')=='shield_end':
        db.execute('UPDATE shield_cooldowns SET active_until=0 WHERE user_id=?',(owner,))
        return {'shield':shield_state(db,owner,player)}
    if body.get('action')=='reforge' and isinstance(body.get('opId'),str):
        prior=db.execute('SELECT result FROM equipment_ops WHERE user_id=? AND op_id=?',(owner,body['opId'])).fetchone()
        if prior:return {'character':dict(id=row['id'],player=player,revision=row['revision'])}
    if body.get('revision')!=row['revision']:return {'conflict':True,'error':'Nhân vật đã thay đổi. Tải lại để tiếp tục.'}
    if op=='shield':
        shield=player.get('world',{}).get('equip',{}).get('ngoc')
        if not shield or player['hp']<=0:raise ValueError('Cần trang bị hộ thuẫn và còn sống.')
        state=shield_state(db,owner,player);now=time.time()
        if now<state['readyAt']:raise ValueError('Hộ thuẫn chưa hồi chiêu.')
        db.execute('INSERT INTO shield_cooldowns VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET ready_at=excluded.ready_at,active_until=excluded.active_until,source_uid=excluded.source_uid',(owner,now+RULES['shield']['cooldown'],now+RULES['shield']['duration'],shield['uid']))
        return {'shield':shield_state(db,owner,player)}
    if op!='reforge':raise ValueError('Thao tác không hợp lệ.')
    opid=body.get('opId')
    if not isinstance(opid,str) or not 8<=len(opid)<=100:raise ValueError('Thiếu mã giao dịch.')
    prior=db.execute('SELECT result FROM equipment_ops WHERE user_id=? AND op_id=?',(owner,opid)).fetchone()
    if prior:return json.loads(prior['result'])
    w=player.get('world',{})
    if not community.safe(player):raise ValueError('Về thành để tẩy luyện.')
    item=next((i for i in items(player) if i['uid']==body.get('uid')),None)
    if not item or not pool(item):raise ValueError('Chỉ tẩy luyện pháp bảo hoặc hộ thuẫn.')
    price=RULES['reforge']
    if player['gold']<price['gold'] or w.get('essence',0)<price['essence']:raise ValueError('Cần 60 Linh Thạch và 12 Linh Nguyên.')
    player['gold']-=price['gold'];w['essence']-=price['essence']
    choices=list(pool(item));lines=[]
    for _ in range(5):
        rule=choices.pop(secrets.randbelow(len(choices)))
        # Lower rolls are common; max rolls stay possible but rare.
        value=rule['min']+min(secrets.randbelow(rule['max']-rule['min']+1),secrets.randbelow(rule['max']-rule['min']+1))
        lines.append(dict(key=rule['key'],value=value))
    item['affixes']=lines
    db.execute('INSERT INTO equipment_rolls VALUES(?,?,?,?) ON CONFLICT(user_id,item_uid) DO UPDATE SET item_id=excluded.item_id,lines=excluded.lines',(owner,item['uid'],item['id'],json.dumps(lines)))
    revision=row['revision']+1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),owner))
    result={'character':dict(id=row['id'],player=player,revision=revision)}
    db.execute('INSERT INTO equipment_ops VALUES(?,?,?)',(owner,opid,json.dumps(result,ensure_ascii=False)))
    return result
