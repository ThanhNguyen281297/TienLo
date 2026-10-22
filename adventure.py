"""Persistent story, sect merit and crafting. Economic actions are atomic and replay safe."""
import json
import secrets
import time
from datetime import datetime, timezone, timedelta
import equipment
import progression

QUALITIES=(('pham','Thường','#d4cbb6',10,1),('huyen','Hiếm','#70df9c',15,10),('linh','Cực hiếm','#6fc8ff',20,25),('tien','Siêu phẩm','#cf9cff',25,45),('than','Thần phẩm','#ffcc70',30,70))
MAIN=[
 ('awakening','Duyên khởi Thiên Vân','Dạo bước quanh quảng trường, gặp Vân Châu để bắt đầu hành trình.','walk',120,1,120,30,0),
 ('first-blood','Dấu vết yêu khí','Đến Thanh Phong Trúc Lâm và hạ 10 yêu thú từ cấp 1.','hunt:1',10,1,500,80,1),
 ('watch','Con đường tu tiên','Hạ 25 yêu thú từ cấp 3 trong các vùng săn.','hunt:3',25,3,1200,120,2),
 ('city','Mật thư Thiên Vân','Đạt cấp 5 rồi trở lại Thiên Vân Thành.','visit:hub',1,5,1500,150,2),
 ('wood-gate','Thanh Mộc trừ yêu','Hạ 50 yêu thú từ cấp 10 để lần theo vết nứt phương Đông.','hunt:10',50,10,4500,250,3),
 ('wood-seal','Phong ấn Mộc Linh','Tham chiến hạ thủ lĩnh Thanh Mộc Linh Cảnh.','boss:rift-wood',1,10,6000,300,5),
 ('forging','Linh khí thành hình','Tới NPC Luyện Khí trong thành để ghép một trang bị.','craft',1,10,3000,200,2),
 ('mountain-hunt','Vượt núi tìm đạo','Hạ 100 yêu thú từ cấp 20.','hunt:20',100,20,10000,450,5),
 ('tide-seal','Tiếng gọi Long Uyên','Hạ thủ lĩnh Huyền Thủy Long Uyên.','boss:rift-tide',1,25,15000,550,6),
 ('snow-hunt','Phong tuyết vô ngại','Hạ 150 yêu thú từ cấp 35.','hunt:35',150,35,24000,650,7),
 ('fire-gate','Tro tàn Xích Diệm','Hạ 200 yêu thú từ cấp 45 rồi tìm tới Xích Diệm Hoang Vực.','hunt:45',200,45,36000,800,8),
 ('fire-seal','Phượng hỏa tái sinh','Hạ phượng hoàng trong bí cảnh Xích Diệm.','boss:rift-fire',1,45,42000,900,10),
 ('void-gate','Đường vào U Minh','Hạ 300 yêu thú từ cấp 60.','hunt:60',300,60,65000,1200,12),
 ('final-seal','Bốn ấn quy nguyên','Hạ Cốt Long tại U Minh Cốt Giới để giữ bình yên Thiên Vân.','boss:rift-void',1,70,90000,1800,15),
 ('immortal-hunt','Tiên lộ vô cùng','Hạ 500 yêu thú từ cấp 80.','hunt:80',500,80,140000,2400,20),
]
SIDE=[]
DAILY=[
 ('daily-rift','Khám phá bí cảnh','Tham gia một bí cảnh trong ngày.','riftVisits',1,10,1500,150,2),
 ('daily-explorer','Dấu chân tam cảnh','Tham gia ba bí cảnh khác nhau trong ngày.','riftVisits',3,45,8000,500,5),
 ('daily-hunter','Thiên yêu trảm','Hạ 1.000 quái trong ngày.','kills',1000,1,6000,500,5),
 ('daily-ten-thousand','Vạn yêu trảm','Hạ 10.000 quái trong ngày.','kills',10000,10,30000,1800,15),
 ('daily-tower','Phá trận đăng tháp','Nhận thưởng ba tầng tháp khác nhau trong ngày.','towerFloors',3,1,3000,300,4),
 ('daily-boss','Bí cảnh trấn yêu','Hạ một thủ lĩnh bí cảnh trong ngày.','riftBosses',1,10,3500,250,3),
]
SECT_MAPS=('sword','moon','thunder','mystic')

def day():return datetime.now(timezone(timedelta(hours=7))).date().isoformat()

def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS adventure_wallet(user_id INTEGER PRIMARY KEY REFERENCES users(id),fragments INTEGER NOT NULL DEFAULT 0,merit INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS adventure_counters(user_id INTEGER NOT NULL REFERENCES users(id),key TEXT NOT NULL,value REAL NOT NULL,PRIMARY KEY(user_id,key));
    CREATE TABLE IF NOT EXISTS adventure_claims(user_id INTEGER NOT NULL REFERENCES users(id),quest TEXT NOT NULL,day TEXT NOT NULL,PRIMARY KEY(user_id,quest,day));
    CREATE TABLE IF NOT EXISTS adventure_events(user_id INTEGER NOT NULL REFERENCES users(id),id TEXT NOT NULL,PRIMARY KEY(user_id,id));
    CREATE TABLE IF NOT EXISTS adventure_quest_starts(user_id INTEGER NOT NULL REFERENCES users(id),quest TEXT NOT NULL,baseline REAL NOT NULL,PRIMARY KEY(user_id,quest));
    CREATE TABLE IF NOT EXISTS adventure_ops(user_id INTEGER NOT NULL REFERENCES users(id),id TEXT NOT NULL,PRIMARY KEY(user_id,id));
    ''')

def wallet(db,uid):
    row=db.execute('SELECT fragments,merit FROM adventure_wallet WHERE user_id=?',(uid,)).fetchone()
    if row:return dict(row)
    db.execute('INSERT OR IGNORE INTO adventure_wallet(user_id) VALUES(?)',(uid,))
    return dict(db.execute('SELECT fragments,merit FROM adventure_wallet WHERE user_id=?',(uid,)).fetchone())

def add(db,uid,key,amount=1):
    db.execute('INSERT INTO adventure_counters VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=value+excluded.value',(uid,key,amount))

def count(db,uid,key):
    row=db.execute('SELECT value FROM adventure_counters WHERE user_id=? AND key=?',(uid,key)).fetchone()
    return row['value'] if row else 0

def record_kill(db,uid,mob,event):
    if db.execute('SELECT 1 FROM adventure_events WHERE user_id=? AND id=?',(uid,event)).fetchone():return
    db.execute('INSERT INTO adventure_events VALUES(?,?)',(uid,event));wallet(db,uid)
    scene=mob.get('map','');add(db,uid,'kills')
    for minimum in (1,3,10,20,35,45,60,80):
        if mob.get('level',1)>=minimum:add(db,uid,'hunt:'+str(minimum))
    add(db,uid,'daily:'+day()+':kills')
    if scene.startswith('rift-'):
        for key in ('riftKills','daily:'+day()+':riftKills'):add(db,uid,key)
        if mob.get('boss'):
            for key in ('boss:'+scene,'riftBosses','daily:'+day()+':riftBosses'):add(db,uid,key)
    row=db.execute('SELECT player FROM characters WHERE user_id=?',(uid,)).fetchone()
    if row and (scene.startswith('field-') or scene==SECT_MAPS[json.loads(row['player'])['ap']['w']]):
        add(db,uid,'daily:'+day()+':sectKills')

def grant_fragments(db,uid,amount):
    wallet(db,uid);db.execute('UPDATE adventure_wallet SET fragments=fragments+? WHERE user_id=?',(amount,uid))

def record_world(db,uid,scene,x,y,previous,med):
    if scene in ('duel','tower'):return
    if scene.startswith('rift-') and previous.get('map')!=scene:
        key='daily:'+day()+':visit:'+scene
        if not count(db,uid,key):add(db,uid,key);add(db,uid,'daily:'+day()+':riftVisits')
    if count(db,uid,'visit:'+scene)==0:add(db,uid,'visit:'+scene)
    if previous.get('map')==scene:
        distance=__import__('math').hypot(x-previous['x'],y-previous['y'])
        if 0<distance<100 and count(db,uid,'walk')<120:add(db,uid,'walk',distance)
        if med and count(db,uid,'meditate')<3:add(db,uid,'meditate',min(.5,max(0,time.monotonic()-previous['seen'])))

def progress(db,uid,key,daily=False):
    if key=='sects':return sum(count(db,uid,'visit:'+scene)>0 for scene in SECT_MAPS)
    if key=='seals':return sum(count(db,uid,'boss:'+scene)>0 for scene in ('rift-wood','rift-tide','rift-fire','rift-void'))
    return count(db,uid,('daily:'+day()+':' if daily else '')+key)

def quests(db,uid,player):
    claimed={(r['quest'],r['day']) for r in db.execute('SELECT quest,day FROM adventure_claims WHERE user_id=?',(uid,))};result=[];prior=True
    for group,rows in (('main',MAIN),('daily',DAILY)):
        for row in rows:
            ident,title,story,key,target,level,xp,gold,extra=row;today=day() if group=='daily' else '';done=(ident,today) in claimed
            value=progress(db,uid,key,group=='daily');unlocked=progression.level(player)>=level and (prior if group=='main' else True)
            if group=='main' and key.startswith('hunt:'):
                baseline=db.execute('SELECT baseline FROM adventure_quest_starts WHERE user_id=? AND quest=?',(uid,ident)).fetchone()
                if unlocked and baseline is None:
                    db.execute('INSERT INTO adventure_quest_starts VALUES(?,?,?)',(uid,ident,value));baseline={'baseline':value}
                value=max(0,value-(baseline['baseline'] if baseline else value))
            result.append(dict(id=ident,title=title,story=story,kind=group,key=key,target=target,value=min(target,int(value)),level=level,claimed=done,unlocked=unlocked,ready=unlocked and value>=target and not done,xp=xp,gold=gold,fragments=extra,merit=0))
            if group=='main':prior=prior and done
    return result

def recipes(player):
    result=[];cls=player['ap']['w'];gender=player['ap'].get('gender','Nam')
    for item in equipment.TEMPLATES.values():
        if item.get('source')=='sect' or item.get('type')=='material':continue
        if item.get('classIndex',cls)!=cls or item.get('gender',gender)!=gender:continue
        quality=next((q for q in QUALITIES if q[0]==item['rarity']),QUALITIES[0])
        result.append(dict(id=item['id'],cost=quality[3],level=max(quality[4],item.get('req',0)),quality=quality[0]))
    return result

def shop(player):
    cls=player['ap']['w']
    return [dict(id=f'sect-{slot}-class-{cls}',merit=180 if slot=='vukhi' else 120) for slot in ('vukhi','daobao','chan','giay')]

def snapshot(db,uid,player):
    return dict(**wallet(db,uid),quests=quests(db,uid,player),recipes=recipes(player),shop=[],qualities=[dict(id=q[0],name=q[1],color=q[2],cost=q[3],level=q[4]) for q in QUALITIES],tutorial={key:count(db,uid,key) for key in ('walk','attack','ui:bag','ui:attrs','meditate')})

def grant_item(db,uid,player,iid):
    bag=player['world']['bag']
    if len(bag)>=equipment.capacity(player['world']):raise ValueError('Túi đầy. Hãy dọn một ô trước khi nhận trang bị.')
    item=dict(equipment.TEMPLATES[iid],uid=secrets.token_hex(16))
    if equipment.pool(item):item['affixes']=equipment.defaults(item)
    if item.get('type')=='material':item['qty']=1
    bag.append(item);return item

def gain(player,xp):
    progression.normalize(player);player['levelXp']+=xp
    while player['level']<progression.MAX_LEVEL and player['levelXp']>=progression.required(player['level']):
        player['levelXp']-=progression.required(player['level']);player['level']+=1
    if player['level']==progression.MAX_LEVEL:player['levelXp']=0
    progression.normalize(player)

def action(db,uid,body,gm=False):
    row=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not row:raise ValueError('Hãy tạo nhân vật trước.')
    player=json.loads(row['player']);op=body.get('action');wallet(db,uid)
    if not isinstance(op,str):raise ValueError('Thao tác không hợp lệ.')
    if op=='tutorial':
        key=body.get('key')
        if key not in ('bag','attrs','target'):raise ValueError('Thao tác hướng dẫn không hợp lệ.')
        if not count(db,uid,'ui:'+key):add(db,uid,'ui:'+key)
        return snapshot(db,uid,player)
    opid=body.get('opId')
    if not isinstance(opid,str) or not 8<=len(opid)<=100:raise ValueError('Thiếu mã giao dịch.')
    if db.execute('SELECT 1 FROM adventure_ops WHERE user_id=? AND id=?',(uid,opid)).fetchone():return dict(character=dict(id=row['id'],player=player,revision=row['revision']),adventure=snapshot(db,uid,player))
    if body.get('revision')!=row['revision']:return dict(conflict=True,error='Nhân vật đã thay đổi. Hãy thử lại.')
    if op.startswith('gm_'):
        if not gm:raise PermissionError('Tài khoản không có quyền GM.')
        if op=='gm_item':
            iid=body.get('id')
            if iid in equipment.TEMPLATES:grant_item(db,uid,player,iid)
            else:
                extras={'hoi-huyet-dan':dict(type='consume',name='Hồi Huyết Đan',rarity='pham',price=12,heal=80),'hoi-linh-dan':dict(type='consume',name='Hồi Linh Đan',rarity='pham',price=12,mana=40),'tu-vi-dan':dict(type='consume',name='Tu Vi Đan',rarity='huyen',price=25,xp=30)}
                extras.update({'egg-'+s:dict(type='egg',species=s,name='Trứng '+n,rarity='huyen',price=0) for s,n in (('BoNgua','Linh Đường Lang'),('Tho','Nguyệt Thố'),('Nhen','Huyết Nhện'),('Doi','Băng Dực Dơi'))})
                if iid not in extras:raise ValueError('Vật phẩm không hợp lệ.')
                bag=player['world']['bag'];existing=next((i for i in bag if i['id']==iid),None)
                if existing:existing['qty']=min(999,existing.get('qty',1)+1)
                else:
                    if len(bag)>=equipment.capacity(player['world']):raise ValueError('Túi đầy.')
                    bag.append(dict(extras[iid],id=iid,uid=secrets.token_hex(16),qty=1))
        elif op=='gm_realm':
            realm,stage=body.get('realm'),body.get('stage')
            if type(realm) is not int or realm not in range(15) or type(stage) is not int or stage not in range(1,11):raise ValueError('Cảnh giới không hợp lệ.')
            player['r']=realm;player['stage']=stage
        else:raise ValueError('Lệnh GM không hợp lệ.')
    elif op in ('craft','sect_buy'):
        if op=='sect_buy':raise ValueError('Nhiệm vụ và cửa hàng sư môn đã đóng.')
        if player['world'].get('map')!='hub' or __import__('math').hypot(player['x']-1240,player['y']-1210)>110:raise ValueError('Hãy tới NPC Luyện Khí để ghép trang bị.')
        if not __import__('community').safe(player):raise ValueError('Về vùng an toàn để ghép hoặc đổi đồ.')
        iid=body.get('id');offers=recipes(player) if op=='craft' else shop(player);offer=next((r for r in offers if r['id']==iid),None)
        if not offer:raise ValueError('Công thức không hợp lệ với class/giới tính.')
        level=offer.get('level',25)
        if progression.level(player)<level:raise ValueError('Cần cấp '+str(level)+'.')
        key='fragments' if op=='craft' else 'merit';cost=offer.get('cost',offer.get('merit'))
        if wallet(db,uid)[key]<cost:raise ValueError('Chưa đủ '+('mảnh linh khí' if op=='craft' else 'cống hiến sư môn')+'.')
        grant_item(db,uid,player,iid);db.execute('UPDATE adventure_wallet SET '+key+'='+key+'-? WHERE user_id=?',(cost,uid));add(db,uid,'craft' if op=='craft' else 'sectBuy')
    elif op=='quest_claim':
        quest=next((q for q in quests(db,uid,player) if q['id']==body.get('id')),None)
        if not quest or not quest['ready']:raise ValueError('Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng.')
        if not __import__('community').safe(player):raise ValueError('Về vùng an toàn để báo cáo nhiệm vụ.')
        db.execute('INSERT INTO adventure_claims VALUES(?,?,?)',(uid,quest['id'],day() if quest['kind']=='daily' else ''))
        player['gold']=min(10**9,player['gold']+quest['gold']);gain(player,quest['xp']);grant_fragments(db,uid,quest['fragments']);db.execute('UPDATE adventure_wallet SET merit=merit+? WHERE user_id=?',(quest['merit'],uid))
    else:raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(player,db,uid);revision=row['revision']+1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),uid))
    db.execute('INSERT INTO adventure_ops VALUES(?,?)',(uid,opid))
    return dict(character=dict(id=row['id'],player=player,revision=revision),adventure=snapshot(db,uid,player))
