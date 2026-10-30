"""Persistent story quests and fragment crafting. Economic actions are atomic and replay safe."""
import json
import secrets
import time
from datetime import datetime, timezone, timedelta
import equipment
import progression

QUALITIES=(('pham','Thường','#d4cbb6',10,1),('huyen','Hiếm','#70df9c',15,10),('linh','Cực hiếm','#6fc8ff',20,25),('tien','Siêu phẩm','#cf9cff',25,45),('than','Thần phẩm','#ffcc70',30,70))
MAIN=[
 ('awakening','Duyên khởi Thiên Vân','Dạo bước quanh quảng trường, gặp Vân Châu để bắt đầu hành trình.','walk',120,1,120,30,0),
 ('first-blood','Dấu vết yêu khí','Đến Thanh Phong Nguyên và hạ 10 yêu thú từ cấp 1.','hunt:1',10,1,500,80,1),
 ('watch','Con đường tu tiên','Hạ 25 yêu thú từ cấp 3 trong các vùng săn.','hunt:3',25,3,1200,120,2),
 ('city','Mật thư Thiên Vân','Đạt cấp 5 rồi trở lại Thiên Vân Thành.','visit:hub',1,5,1500,150,2),
 ('wood-gate','Thanh Mộc trừ yêu','Hạ 50 yêu thú từ cấp 10 để lần theo vết nứt phương Đông.','hunt:10',50,10,4500,250,3),
 ('wood-seal','Phong ấn Mộc Linh','Tham chiến hạ thủ lĩnh Thanh Mộc Linh Cảnh.','boss:rift-wood',1,10,6000,300,5),
 ('forging','Linh khí thành hình','Tới NPC Luyện Khí trong thành để ghép một trang bị.','craft',1,10,3000,200,2),
 ('mountain-hunt','Vượt núi tìm đạo','Hạ 100 yêu thú từ cấp 20.','hunt:20',100,20,10000,450,5),
 ('tide-seal','Tiếng gọi Long Uyên','Hạ thủ lĩnh Huyền Thủy Long Uyên.','boss:rift-tide',1,25,15000,550,6),
 ('snow-hunt','Phong tuyết vô ngại','Hạ 150 yêu thú từ cấp 30 tại Hàn Sương Lĩnh.','hunt:35',150,35,24000,650,7),
 ('fire-gate','Tro tàn Xích Diệm','Hạ 200 yêu thú từ cấp 45 rồi tìm tới Xích Diệm Hoang Vực.','hunt:45',200,45,36000,800,8),
 ('fire-seal','Phượng hỏa tái sinh','Hạ phượng hoàng trong bí cảnh Xích Diệm.','boss:rift-fire',1,45,42000,900,10),
 ('void-gate','Đường vào U Minh','Hạ 300 yêu thú từ cấp 60.','hunt:60',300,60,65000,1200,12),
 ('final-seal','Bốn ấn quy nguyên','Hạ Cốt Long tại U Minh Cốt Giới để giữ bình yên Thiên Vân.','boss:rift-void',1,70,90000,1800,15),
 ('immortal-hunt','Tiên lộ vô cùng','Hạ 500 yêu thú từ cấp 65 tại U Minh Cổ Địa.','hunt:80',500,80,140000,2400,20),
]
# Side quests: one-time, unlocked by level only (no chain), each with a giver line.
SIDE=[
 ('side-forge-1','Lửa lò đầu tiên','Thợ rèn: "Đạo hữu mang trang bị tới lò, ta giúp tôi luyện một lần cho quen tay."','enhance',1,1,300,50,0),
 ('side-meadow','Cỏ xanh nhuốm yêu khí','Vệ binh vùng săn: "Bọ ngựa và thỏ yêu tràn khắp Thanh Phong Nguyên. Hạ giúp ta 40 con."','zone:field-meadow',40,1,400,60,1),
 ('side-visit-sword','Bái phỏng Vạn Kiếm Sơn','Vân Châu: "Muốn hiểu kiếm đạo, hãy tới Vạn Kiếm Sơn một chuyến."','visit:sword',1,5,300,50,0),
 ('side-visit-moon','Bái phỏng Minh Nguyệt Tông','Vân Châu: "Nguyệt Hồ về đêm rất đẹp. Đạo hữu ghé qua cho biết."','visit:moon',1,5,300,50,0),
 ('side-visit-thunder','Bái phỏng Lôi Thương Tông','Vân Châu: "Lôi Vân Phong quanh năm sấm chớp, người yếu bóng vía đừng ở lâu."','visit:thunder',1,5,300,50,0),
 ('side-visit-mystic','Bái phỏng Thiên Cơ Môn','Vân Châu: "Thiên Cơ Môn giữ nhiều cổ trận. Tới đó học hỏi đôi điều."','visit:mystic',1,5,300,50,0),
 ('side-bamboo','Trúc hải âm u','Vệ binh vùng săn: "Nhện độc giăng tơ khắp Trúc Hải U Cốc. Diệt 40 con cho đường thông."','zone:field-bamboo',40,6,1800,160,2),
 ('side-wood','Dò đường Thanh Mộc','Trưởng lão: "Vết nứt phía Đông có linh khí lạ. Vào Thanh Mộc Linh Cảnh hạ 20 yêu thú."','zone:rift-wood',20,10,3000,200,3),
 ('side-forge-10','Bách luyện thành cương','Thợ rèn: "Một món đồ tốt phải qua trăm lần tôi luyện. Cường hóa đủ 10 lần đi."','enhance',10,10,3000,300,2),
 ('side-marsh','Sương mù Vân Mộng','Vệ binh vùng săn: "Sứa u linh làm lạc đường lữ khách. Hạ 50 yêu thú ở Vân Mộng Trạch."','zone:field-marsh',50,15,5200,320,3),
 ('side-tide','Sóng ngầm Long Uyên','Trưởng lão: "Long Uyên dậy sóng. Vào hạ 20 yêu thú để dò xét."','zone:rift-tide',20,25,9000,400,4),
 ('side-frost','Hàn băng thú triều','Vệ binh vùng săn: "Sói băng kéo đàn xuống núi. Hạ 60 con ở Hàn Sương Lĩnh."','zone:field-frost',60,25,12000,520,4),
 ('side-ember','Lửa hoang không tắt','Vệ binh vùng săn: "Xích Diệm Hoang cháy mãi không tàn. Diệt 70 yêu thú giữ lửa."','zone:field-ember',70,40,30000,800,6),
 ('side-fire','Tro tàn Xích Diệm','Trưởng lão: "Bí cảnh Xích Diệm vừa mở rộng. Hạ 20 yêu thú trong đó."','zone:rift-fire',20,45,26000,700,6),
 ('side-abyss','Bóng tối U Minh','Vệ binh vùng săn: "U Minh Cổ Địa không thấy ánh mặt trời. Hạ 80 yêu thú ở đó."','zone:field-abyss',80,60,70000,1300,9),
 ('side-void','Cốt giới hoang lương','Trưởng lão: "U Minh Cốt Giới là nơi nguy hiểm nhất. Hạ 20 yêu thú để mở đường."','zone:rift-void',20,70,60000,1100,8),
]
DAILY=[
 ('daily-rift','Khám phá bí cảnh','Tham gia một bí cảnh trong ngày.','riftVisits',1,10,1500,150,2),
 ('daily-explorer','Dấu chân tam cảnh','Tham gia ba bí cảnh khác nhau trong ngày.','riftVisits',3,45,8000,500,5),
 ('daily-hunter','Thiên yêu trảm','Hạ 1.000 quái trong ngày.','kills',1000,1,6000,500,5),
 ('daily-ten-thousand','Vạn yêu trảm','Hạ 10.000 quái trong ngày.','kills',10000,10,30000,1800,15),
 ('daily-tower','Phá trận đăng tháp','Nhận thưởng ba tầng tháp khác nhau trong ngày.','towerFloors',3,1,3000,300,4),
 ('daily-boss','Bí cảnh trấn yêu','Hạ một thủ lĩnh bí cảnh trong ngày.','riftBosses',1,10,3500,250,3),
]
SECT_MAPS=('sword','moon','thunder','mystic')
HUNT_FLOORS=((1,1),(3,3),(10,10),(20,20),(35,30),(45,45),(60,60),(80,65))

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
    # The legacy merit column stays in the table (sect merit was retired) but is never read.
    row=db.execute('SELECT fragments FROM adventure_wallet WHERE user_id=?',(uid,)).fetchone()
    if row:return dict(row)
    db.execute('INSERT OR IGNORE INTO adventure_wallet(user_id) VALUES(?)',(uid,))
    return dict(db.execute('SELECT fragments FROM adventure_wallet WHERE user_id=?',(uid,)).fetchone())

def add(db,uid,key,amount=1):
    db.execute('INSERT INTO adventure_counters VALUES(?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=value+excluded.value',(uid,key,amount))

def count(db,uid,key):
    row=db.execute('SELECT value FROM adventure_counters WHERE user_id=? AND key=?',(uid,key)).fetchone()
    return row['value'] if row else 0

def record_kill(db,uid,mob,event):
    if db.execute('SELECT 1 FROM adventure_events WHERE user_id=? AND id=?',(uid,event)).fetchone():return
    db.execute('INSERT INTO adventure_events VALUES(?,?)',(uid,event));wallet(db,uid)
    scene=mob.get('map','');add(db,uid,'kills')
    if scene:add(db,uid,'zone:'+scene)
    # Counter name -> lowest monster level that counts. hunt:35 and hunt:80 accept
    # Hàn Sương Lĩnh (30+) and U Minh Cổ Địa (65+): no reachable monster existed above them.
    for name,minimum in HUNT_FLOORS:
        if mob.get('level',1)>=minimum:add(db,uid,'hunt:'+str(name))
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

def spend_fragments(db,uid,amount):
    wallet(db,uid)
    return db.execute('UPDATE adventure_wallet SET fragments=fragments-? WHERE user_id=? AND fragments>=?',(amount,uid,amount)).rowcount==1

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

FIELDS=(('field-meadow',1,1),('field-bamboo',8,6),('field-marsh',18,15),('field-frost',30,25),('field-ember',45,40),('field-abyss',65,60))
RIFTS=(('rift-wood',10),('rift-tide',25),('rift-fire',45),('rift-void',70))
CAMP=(440,1320)
def camp(scene):
    """First hunting camp of an outdoor zone (each zone has its own layout)."""
    import overworld
    c=(overworld.MAPS.get(scene) or {}).get('camps') or [dict(x=CAMP[0],y=CAMP[1])]
    return c[0]['x'],c[0]['y']

MAP_NAMES={'hub':'Thiên Vân Thành','sword':'Vạn Kiếm Sơn','moon':'Minh Nguyệt Tông','thunder':'Lôi Thương Tông','mystic':'Thiên Cơ Môn',
 'field-meadow':'Thanh Phong Nguyên','field-bamboo':'Trúc Hải U Cốc','field-marsh':'Vân Mộng Trạch','field-frost':'Hàn Sương Lĩnh','field-ember':'Xích Diệm Hoang','field-abyss':'U Minh Cổ Địa',
 'rift-wood':'Thanh Mộc Linh Cảnh','rift-tide':'Huyền Thủy Long Uyên','rift-fire':'Xích Diệm Hoang Vực','rift-void':'U Minh Cốt Giới'}

def goal(key,player):
    result=_goal(key,player)
    if result:result['name']=MAP_NAMES.get(result['map'],result['map'])
    return result

def _goal(key,player):
    """Where a quest is done: map id plus a point, an NPC service id, and whether to fight there."""
    lv=progression.level(player)
    if key=='walk':return dict(map='hub',npc='quest')
    if key in ('craft','enhance'):return dict(map='hub',npc='forge')
    if key.startswith('visit:'):
        scene=key[6:];return dict(map=scene,npc='mentor') if scene in SECT_MAPS else dict(map=scene)
    if key.startswith('zone:field-'):x,y=camp(key[5:]);return dict(map=key[5:],x=x,y=y,auto=True)
    if key.startswith('zone:rift-'):return dict(map=key[5:],x=1000,y=1100,auto=True)
    if key.startswith('boss:'):return dict(map=key[5:],x=1000,y=930,auto=True)
    if key.startswith('hunt:'):
        need=dict(HUNT_FLOORS).get(int(key[5:]),int(key[5:]));field=next((f for f in FIELDS if f[1]+2>=need),FIELDS[-1])
        x,y=camp(field[0]);return dict(map=field[0],x=x,y=y,auto=True)
    if key in ('kills','sectKills'):
        field=[f for f in FIELDS if f[2]<=lv][-1];x,y=camp(field[0]);return dict(map=field[0],x=x,y=y,auto=True)
    if key in ('riftVisits','riftBosses','riftKills'):
        rift=[r for r in RIFTS if r[1]<=lv]
        if not rift:return None
        return dict(map=rift[-1][0],x=1000,y=930 if key=='riftBosses' else 1100,auto=True)
    return None

def quests(db,uid,player):
    claimed={(r['quest'],r['day']) for r in db.execute('SELECT quest,day FROM adventure_claims WHERE user_id=?',(uid,))};result=[];prior=True
    for group,rows in (('main',MAIN),('side',SIDE),('daily',DAILY)):
        for row in rows:
            ident,title,story,key,target,level,xp,gold,extra=row;today=day() if group=='daily' else '';done=(ident,today) in claimed
            value=progress(db,uid,key,group=='daily');unlocked=progression.level(player)>=level and (prior if group=='main' else True)
            if group=='main' and key.startswith('hunt:'):
                baseline=db.execute('SELECT baseline FROM adventure_quest_starts WHERE user_id=? AND quest=?',(uid,ident)).fetchone()
                if unlocked and baseline is None:
                    db.execute('INSERT INTO adventure_quest_starts VALUES(?,?,?)',(uid,ident,value));baseline={'baseline':value}
                value=max(0,value-(baseline['baseline'] if baseline else value))
            result.append(dict(id=ident,title=title,story=story,kind=group,key=key,target=target,value=min(target,int(value)),level=level,claimed=done,unlocked=unlocked,ready=unlocked and value>=target and not done,xp=xp,gold=gold,fragments=extra,goal=goal(key,player)))
            if group=='main':prior=prior and done
    return result

def recipes(player):
    result=[];cls=player['ap']['w'];gender=player['ap'].get('gender','Nam')
    for item in equipment.TEMPLATES.values():
        if item.get('source')=='sect' or item.get('type')=='material' or item.get('bound'):continue
        if item.get('classIndex',cls)!=cls or item.get('gender',gender)!=gender:continue
        quality=next((q for q in QUALITIES if q[0]==item['rarity']),QUALITIES[0])
        result.append(dict(id=item['id'],cost=quality[3],level=max(quality[4],item.get('req',0)),quality=quality[0]))
    return result

def snapshot(db,uid,player):
    return dict(**wallet(db,uid),quests=quests(db,uid,player),recipes=recipes(player),qualities=[dict(id=q[0],name=q[1],color=q[2],cost=q[3],level=q[4]) for q in QUALITIES],tutorial={key:count(db,uid,key) for key in ('walk','attack','ui:bag','ui:attrs','meditate')})

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
    elif op=='craft':
        if player['world'].get('map')!='hub' or __import__('math').hypot(player['x']-1240,player['y']-1210)>110:raise ValueError('Hãy tới NPC Luyện Khí để ghép trang bị.')
        if not __import__('community').safe(player):raise ValueError('Về vùng an toàn để ghép hoặc đổi đồ.')
        iid=body.get('id');offers=recipes(player);offer=next((r for r in offers if r['id']==iid),None)
        if not offer:raise ValueError('Công thức không hợp lệ với class/giới tính.')
        level=offer.get('level',25)
        if progression.level(player)<level:raise ValueError('Cần cấp '+str(level)+'.')
        cost=offer['cost']
        if wallet(db,uid)['fragments']<cost:raise ValueError('Chưa đủ mảnh linh khí.')
        grant_item(db,uid,player,iid);db.execute('UPDATE adventure_wallet SET fragments=fragments-? WHERE user_id=?',(cost,uid));add(db,uid,'craft')
    elif op=='quest_claim':
        quest=next((q for q in quests(db,uid,player) if q['id']==body.get('id')),None)
        if not quest or not quest['ready']:raise ValueError('Nhiệm vụ chưa hoàn thành hoặc đã nhận thưởng.')
        if not __import__('community').safe(player):raise ValueError('Về vùng an toàn để báo cáo nhiệm vụ.')
        db.execute('INSERT INTO adventure_claims VALUES(?,?,?)',(uid,quest['id'],day() if quest['kind']=='daily' else ''))
        player['gold']=min(10**9,player['gold']+quest['gold']);gain(player,quest['xp']);grant_fragments(db,uid,quest['fragments'])
        if quest['kind']=='daily':__import__('shards').grant_random(db,uid,1)  # one random equipment shard per daily quest
    else:raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(player,db,uid);revision=row['revision']+1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),uid))
    db.execute('INSERT INTO adventure_ops VALUES(?,?)',(uid,opid))
    return dict(character=dict(id=row['id'],player=player,revision=revision),adventure=snapshot(db,uid,player))
