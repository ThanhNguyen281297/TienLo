"""Equipment catalog, conservative affixes and persistent shield cooldowns."""
import json
import community
import secrets
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RULES = json.loads((ROOT/'Item'/'equipment.json').read_text(encoding='utf-8'))
TEMPLATES = {t['id']: t for group in ('classGear','rings','shields','backs','formations','trails','masks','mountItems') for t in RULES[group]}
STAT_KEYS = ('atk','hp','mp','armor','crit','dodge','skill')
MATERIALS={
 'cuong-hoa-thach':dict(id='cuong-hoa-thach',type='material',name='Cường Hóa Thạch',rarity='huyen',price=8,art='Item/NguyenLieu/cuong-hoa-v1.png',desc='Nguyên liệu đặt vào lò rèn để cường hóa trang bị.'),
 'tinh-luyen-thach':dict(id='tinh-luyen-thach',type='material',name='Tinh Luyện Thạch',rarity='linh',price=20,art='Item/NguyenLieu/tinh-luyen-v1.png',desc='Nguyên liệu bổ sung cho cường hóa từ +10 đến +15.')}
TEMPLATES.update(MATERIALS)
DROP_OPTIONS={'atk':(1,3),'hp':(5,20),'mp':(3,12),'armor':(1,2),'crit':(2,8),'dodge':(2,6)}

def option_stats(item):
    return {line['key']:line['value']/(1000 if line['key'] in ('crit','dodge') else 1) for line in item.get('options',[])}

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
            for key in ('type','slot','classIndex','gender','capacity','variant','art','req','rarity','price','outfitStyle',*STAT_KEYS):
                if item.get(key,0)!=meta.get(key,0):raise ValueError('Chỉ số trang bị không hợp lệ.')
        elif item.get('slot') in RULES['slots']:raise ValueError('Trang bị tiện ích không hợp lệ.')
        if item.get('id') in MATERIALS and (type(item.get('qty',1)) is not int or not 1<=item.get('qty',1)<=9999):raise ValueError('Số lượng nguyên liệu không hợp lệ.')
        options=item.get('options',[])
        if options:
            if not isinstance(options,list) or not 1<=len(options)<=6:raise ValueError('Option trang bị cần từ 1 đến 6 dòng.')
            if any(not isinstance(v,dict) or set(v)!={'key','value'} or v.get('key') not in DROP_OPTIONS or type(v.get('value')) is not int or not DROP_OPTIONS[v['key']][0]<=v['value']<=DROP_OPTIONS[v['key']][1] for v in options):raise ValueError('Option vượt giới hạn.')
            if len({v['key'] for v in options})!=len(options):raise ValueError('Option không được trùng.')
        if db is not None:
            rolled=db.execute('SELECT item_id,options FROM equipment_drop_rolls WHERE user_id=? AND item_uid=?',(owner,uid)).fetchone()
            if options!=(json.loads(rolled['options']) if rolled else []) or (rolled and rolled['item_id']!=item['id']):raise ValueError('Option phải do server cấp.')
        allowed=pool(item)
        if not allowed:
            if item.get('affixes'):raise ValueError('Trang bị không có dòng tẩy luyện.')
            continue
        lines=item.get('affixes',[]);lookup={r['key']:r for r in allowed}
        if not isinstance(lines,list) or not 1<=len(lines)<=6:raise ValueError('Pháp bảo và hộ thuẫn cần từ 1 đến 6 dòng.')
        if any(not isinstance(line,dict) or set(line)!={'key','value'} or line.get('key') not in lookup or type(line.get('value')) is not int or not lookup[line['key']]['min']<=line['value']<=lookup[line['key']]['max'] for line in lines):raise ValueError('Dòng tẩy luyện vượt giới hạn.')
        if len({line['key'] for line in lines})!=len(lines):raise ValueError('Không được trùng dòng tẩy luyện.')
        if db is not None:
            lock=db.execute('SELECT indices FROM equipment_locks WHERE user_id=? AND item_uid=?',(owner,uid)).fetchone()
            if item.get('locks',[])!=(json.loads(lock['indices']) if lock else []):raise ValueError('Khóa dòng phải do server cấp.')
            roll=db.execute('SELECT item_id,lines FROM equipment_rolls WHERE user_id=? AND item_uid=?',(owner,uid)).fetchone()
            expected=json.loads(roll['lines']) if roll else defaults(item)
            if (roll and roll['item_id']!=item['id']) or lines!=expected:raise ValueError('Dòng tẩy luyện phải do server cấp.')
    for slot,item in equip.items():
        if item and (item.get('slot')!=slot or (slot not in RULES['sharedSlots'] and item.get('classIndex',player['ap']['w'])!=player['ap']['w'])):raise ValueError('Trang bị không phù hợp ô hoặc class.')
        if item and item.get('gender') and item['gender']!=player['ap'].get('gender','Nam'):raise ValueError('Mặt nạ không phù hợp giới tính nhân vật.')

def bonuses(player):
    result={}
    for item in player.get('world',{}).get('equip',{}).values():
        if not item:continue
        for key,value in option_stats(item).items():result[key]=result.get(key,0)+value
        for line in item.get('affixes',[]):
            rule=next((r for r in pool(item) if r['key']==line.get('key')),None)
            if rule:result[line['key']]=result.get(line['key'],0)+line['value']/(10000 if rule['percent'] else 100 if rule['key']=='regen' else 1)
    return result

def init_db(db, collection):
    db.execute('CREATE TABLE IF NOT EXISTS equipment_drop_rolls(user_id INTEGER NOT NULL,item_uid TEXT NOT NULL,item_id TEXT NOT NULL,options TEXT NOT NULL,PRIMARY KEY(user_id,item_uid))')
    db.executescript('''CREATE TABLE IF NOT EXISTS equipment_rolls(user_id INTEGER NOT NULL REFERENCES users(id),item_uid TEXT NOT NULL,item_id TEXT NOT NULL,lines TEXT NOT NULL,PRIMARY KEY(user_id,item_uid));
    CREATE TABLE IF NOT EXISTS shield_cooldowns(user_id INTEGER PRIMARY KEY REFERENCES users(id),ready_at REAL NOT NULL,active_until REAL NOT NULL,source_uid TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS equipment_migration_versions(user_id INTEGER NOT NULL,revision INTEGER NOT NULL,player TEXT NOT NULL,PRIMARY KEY(user_id,revision));
    CREATE TABLE IF NOT EXISTS equipment_ops(user_id INTEGER NOT NULL,op_id TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,op_id));''')
    db.execute('CREATE TABLE IF NOT EXISTS equipment_locks(user_id INTEGER NOT NULL REFERENCES users(id),item_uid TEXT NOT NULL,indices TEXT NOT NULL,PRIMARY KEY(user_id,item_uid))')
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
    if body.get('action') in ('reforge','lock','transfer') and isinstance(body.get('opId'),str):
        prior=db.execute('SELECT result FROM equipment_ops WHERE user_id=? AND op_id=?',(owner,body['opId'])).fetchone()
        if prior:return json.loads(prior['result'])
    if body.get('revision')!=row['revision']:return {'conflict':True,'error':'Nhân vật đã thay đổi. Tải lại để tiếp tục.'}
    if op=='shield':
        shield=player.get('world',{}).get('equip',{}).get('ngoc')
        if not shield or player['hp']<=0:raise ValueError('Cần trang bị hộ thuẫn và còn sống.')
        state=shield_state(db,owner,player);now=time.time()
        if now<state['readyAt']:raise ValueError('Hộ thuẫn chưa hồi chiêu.')
        db.execute('INSERT INTO shield_cooldowns VALUES(?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET ready_at=excluded.ready_at,active_until=excluded.active_until,source_uid=excluded.source_uid',(owner,now+RULES['shield']['cooldown'],now+RULES['shield']['duration'],shield['uid']))
        __import__('adventure').add(db,owner,'shield')
        return {'shield':shield_state(db,owner,player)}
    if op not in ('reforge','lock','transfer'):raise ValueError('Thao tác không hợp lệ.')
    opid=body.get('opId')
    if not isinstance(opid,str) or not 8<=len(opid)<=100:raise ValueError('Thiếu mã giao dịch.')
    prior=db.execute('SELECT result FROM equipment_ops WHERE user_id=? AND op_id=?',(owner,opid)).fetchone()
    if prior:return json.loads(prior['result'])
    w=player.get('world',{})
    if not community.safe(player):raise ValueError('Về thành để tẩy luyện hoặc chuyển thuộc tính.')
    if op=='transfer':
        validate(player,db,owner)
        if player.get('world',{}).get('map')!='hub' or __import__('math').hypot(player['x']-1240,player['y']-1210)>110:raise ValueError('Hãy tới NPC Luyện Khí để chuyển thuộc tính.')
        bag=player.get('world',{}).get('bag',[]);source=next((i for i in bag if i['uid']==body.get('sourceUid')),None);target=next((i for i in bag if i['uid']==body.get('targetUid')),None)
        if not source or not target or source is target or source.get('slot')!=target.get('slot') or source.get('classIndex')!=target.get('classIndex'):raise ValueError('Chọn hai món cùng ô trang bị và cùng class trong túi.')
        mode='affixes' if pool(source) else 'options' if source.get('options') else None
        target_mode='affixes' if pool(target) else 'options' if target.get('options') or mode=='options' else None
        if not mode or mode!=target_mode:raise ValueError('Hai món cần cùng loại dòng thuộc tính.')
        source_lines=source.get(mode,[]);target_lines=target.get(mode,[]);si=body.get('sourceIndex');ti=body.get('targetIndex')
        if type(si) is not int or si not in range(len(source_lines)):raise ValueError('Dòng nguồn không hợp lệ.')
        if ti=='append':
            if len(target_lines)>=6:raise ValueError('Trang bị đã đủ 6 dòng.')
            ti=len(target_lines)
        if type(ti) is not int or ti not in range(len(target_lines)+1):raise ValueError('Dòng đích không hợp lệ.')
        line=dict(source_lines[si]);pool_rules=pool(target) if mode=='affixes' else [{'key':k,'min':v[0],'max':v[1]} for k,v in DROP_OPTIONS.items()];allowed={rule['key']:rule for rule in pool_rules};rule=allowed.get(line['key'])
        if not rule or not rule['min']<=line['value']<=rule['max'] or any(i!=ti and x['key']==line['key'] for i,x in enumerate(target_lines)):raise ValueError('Dòng thuộc tính không phù hợp món đích.')
        cost=100+int(target.get('req',0))*10
        if player.get('gold',0)<cost:raise ValueError('Cần '+str(cost)+' Linh Thạch để chuyển dòng.')
        player['gold']-=cost
        if ti<len(target_lines):target_lines[ti]=line
        else:target_lines.append(line)
        target[mode]=target_lines
        if mode=='affixes':target['locks']=[]
        bag.remove(source)
        for table in ('equipment_locks','equipment_rolls','equipment_drop_rolls'):db.execute('DELETE FROM '+table+' WHERE user_id=? AND item_uid=?',(owner,source['uid']))
        db.execute('DELETE FROM equipment_locks WHERE user_id=? AND item_uid=?',(owner,target['uid']))
        if mode=='affixes':db.execute('INSERT INTO equipment_rolls VALUES(?,?,?,?) ON CONFLICT(user_id,item_uid) DO UPDATE SET item_id=excluded.item_id,lines=excluded.lines',(owner,target['uid'],target['id'],json.dumps(target_lines)))
        else:db.execute('INSERT INTO equipment_drop_rolls VALUES(?,?,?,?) ON CONFLICT(user_id,item_uid) DO UPDATE SET item_id=excluded.item_id,options=excluded.options',(owner,target['uid'],target['id'],json.dumps(target_lines)))
        __import__('adventure').add(db,owner,'affixTransfer')
        validate(player,db,owner)
        revision=row['revision']+1
        db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),owner))
        result={'character':dict(id=row['id'],player=player,revision=revision),'transferred':line,'consumed':source['name'],'target':target['name'],'gold':cost}
        db.execute('INSERT INTO equipment_ops VALUES(?,?,?)',(owner,opid,json.dumps(result,ensure_ascii=False)))
        return result
    item=next((i for i in items(player) if i['uid']==body.get('uid')),None)
    if not item or not pool(item):raise ValueError('Chỉ tẩy luyện pháp bảo hoặc hộ thuẫn.')
    saved_locks=db.execute('SELECT indices FROM equipment_locks WHERE user_id=? AND item_uid=?',(owner,item['uid'])).fetchone()
    locked=json.loads(saved_locks['indices']) if saved_locks else []
    price=RULES['reforge']
    if op=='lock':
        index=body.get('index')
        if type(index) is not int or index not in range(len(item.get('affixes') or defaults(item))):raise ValueError('Dòng không hợp lệ.')
        cost=0 if index in locked else price['lockGold']
        if player['gold']<cost:raise ValueError('Cần '+str(cost)+' Linh Thạch để khóa dòng.')
        player['gold']-=cost
        locked.remove(index) if index in locked else locked.append(index);locked.sort();item['locks']=locked
        db.execute('INSERT INTO equipment_locks VALUES(?,?,?) ON CONFLICT(user_id,item_uid) DO UPDATE SET indices=excluded.indices',(owner,item['uid'],json.dumps(locked)))
    else:
        old=item.get('affixes') or defaults(item);line_count=len(old)
        if len(locked)>=line_count:raise ValueError('Đã khóa tất cả dòng. Hãy mở ít nhất một dòng để tẩy luyện.')
        cost=price['gold']+len(locked)*price['perLockedGold']
        if player['gold']<cost:raise ValueError('Cần '+str(cost)+' Linh Thạch.')
        player['gold']-=cost
        used={old[i]['key'] for i in locked};choices=[r for r in pool(item) if r['key'] not in used];lines=[]
        for i in range(line_count):
            if i in locked:lines.append(old[i]);continue
            rule=choices.pop(secrets.randbelow(len(choices)))
            value=rule['min']+min(secrets.randbelow(rule['max']-rule['min']+1),secrets.randbelow(rule['max']-rule['min']+1))
            lines.append(dict(key=rule['key'],value=value))
        item['affixes']=lines;item['locks']=locked
        db.execute('INSERT INTO equipment_rolls VALUES(?,?,?,?) ON CONFLICT(user_id,item_uid) DO UPDATE SET item_id=excluded.item_id,lines=excluded.lines',(owner,item['uid'],item['id'],json.dumps(lines)))
        __import__('adventure').add(db,owner,'reforge')
    revision=row['revision']+1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),owner))
    result={'character':dict(id=row['id'],player=player,revision=revision)}
    db.execute('INSERT INTO equipment_ops VALUES(?,?,?)',(owner,opid,json.dumps(result,ensure_ascii=False)))
    return result
