"""Persistent story, sect merit and crafting. Economic actions are atomic and replay safe."""
import json
import secrets
import time
from datetime import datetime, timezone, timedelta
import equipment
import progression

QUALITIES=(('pham','Thường','#d4cbb6',10,1),('huyen','Hiếm','#70df9c',15,10),('linh','Cực hiếm','#6fc8ff',20,25),('tien','Siêu phẩm','#cf9cff',25,45),('than','Thần phẩm','#ffcc70',30,70))
MAIN=[
 ('awakening','Duyên khởi Thiên Vân','Sư phụ phát hiện linh mạch phía bắc đang suy yếu. Trước hết, hãy làm quen thân pháp.', 'walk',120,1,120,30,0),
 ('first-blood','Dấu vết yêu khí','Hạ yêu thú ngoài sân tông môn, tìm dấu vết của U Minh Giáo.','kills',5,1,400,60,0),
 ('city','Mật thư của Sư phụ','Mang tin đến Thiên Vân Thành; Vân Châu đang chờ bên quảng trường.','visit:hub',1,1,600,80,5),
 ('watch','Giữ bình yên sơn môn','Bảo vệ đệ tử mới khỏi làn sóng yêu thú.','kills',20,1,1200,100,5),
 ('wood-gate','Vết nứt phương Đông','Đạt cấp 10 và bước vào Thanh Mộc Linh Cảnh để truy nguồn độc khí.','visit:rift-wood',1,10,1500,150,2),
 ('wood-seal','Phong ấn Mộc Linh','Hạ Độc Giác Thiềm Vương. Mảnh ngọc tìm được hé lộ một long uyên bị nguyền rủa.','boss:rift-wood',1,10,2200,180,3),
 ('forging','Khôi phục linh khí','Ghép một món trang bị tại Luyện Khí Phường bằng mảnh linh khí.','craft',1,10,1500,100,2),
 ('tide-seal','Tiếng gọi Long Uyên','Hạ thủ lĩnh Huyền Thủy Long Uyên, thu hồi ngọc ấn thứ hai.','boss:rift-tide',1,25,9000,350,4),
 ('fire-gate','Tro tàn Xích Diệm','Khám phá Xích Diệm Hoang Vực. U Minh Giáo đã đánh thức linh hỏa.','visit:rift-fire',1,45,22000,450,3),
 ('fire-seal','Phượng hỏa tái sinh','Đánh bại phượng hoàng bị yêu khí chi phối; bảo vệ ngọc ấn thứ ba.','boss:rift-fire',1,45,30000,550,5),
 ('void-gate','Đường vào U Minh','Theo ba ngọc ấn đến U Minh Cốt Giới, tìm kẻ đứng sau đại loạn.','visit:rift-void',1,70,65000,700,4),
 ('final-seal','Bốn ấn quy nguyên','Hạ Cốt Long, khép vết nứt hư không và giữ lại bình yên cho Thiên Vân.','boss:rift-void',1,70,90000,1000,8),
]
SIDE=[
 ('hunter','Dược điền bị quấy phá','Giúp dân thành dọn yêu thú để mở lại đường hái thuốc.','kills',12,1,650,80,1),
 ('veteran','Đường núi an yên','Hạ 60 yêu thú. Những chuyến hàng đầu tiên đã về đến thành.','kills',60,10,2200,160,2),
 ('wanderer','Tứ phái đồng tâm','Ghé sân của cả bốn phái, nối lại liên lạc giữa các sơn môn.','sects',4,1,900,100,2),
 ('artisan','Linh khí thành hình','Ghép ba món, giúp thợ rèn khôi phục bí thuật đã thất truyền.','craft',3,10,2200,180,3),
 ('refiner','Tinh luyện hộ thân','Tẩy luyện một pháp bảo hoặc hộ thuẫn.','reforge',1,10,1800,160,2),
 ('guardian','Lá chắn sinh tử','Dùng kỹ năng hộ thuẫn ba lần.','shield',3,10,1800,160,2),
 ('rift-hunter','Trừ yêu tứ cảnh','Hạ 100 yêu thú trong bí cảnh.','riftKills',100,25,8500,320,4),
 ('champion','Bốn linh ấn','Hạ thủ lĩnh tại cả bốn bí cảnh.','seals',4,70,45000,700,5),
]
DAILY=[('sect-patrol','Tuần sơn','Bảo vệ bãi luyện công của sư môn.','sectKills',15,1,500,40,20),('sect-hunt','Trừ yêu sư môn','Hạ yêu thú trong bất kỳ bí cảnh nào.','riftKills',12,10,1800,70,30),('sect-boss','Trấn áp yêu vương','Tham chiến hạ một thủ lĩnh bí cảnh.','riftBosses',1,10,2500,100,40)]
SECT_MAPS=('sword','moon','thunder','mystic')

def day():return datetime.now(timezone(timedelta(hours=7))).date().isoformat()

def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS adventure_wallet(user_id INTEGER PRIMARY KEY REFERENCES users(id),fragments INTEGER NOT NULL DEFAULT 0,merit INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS adventure_counters(user_id INTEGER NOT NULL REFERENCES users(id),key TEXT NOT NULL,value REAL NOT NULL,PRIMARY KEY(user_id,key));
    CREATE TABLE IF NOT EXISTS adventure_claims(user_id INTEGER NOT NULL REFERENCES users(id),quest TEXT NOT NULL,day TEXT NOT NULL,PRIMARY KEY(user_id,quest,day));
    CREATE TABLE IF NOT EXISTS adventure_events(user_id INTEGER NOT NULL REFERENCES users(id),id TEXT NOT NULL,PRIMARY KEY(user_id,id));
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
    if scene=='duel':return
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
    for group,rows in (('main',MAIN),('side',SIDE),('sect',DAILY)):
        for row in rows:
            ident,title,story,key,target,level,xp,gold,extra=row;today=day() if group=='sect' else '';done=(ident,today) in claimed
            value=progress(db,uid,key,group=='sect');unlocked=progression.level(player)>=level and (prior if group=='main' else True)
            result.append(dict(id=ident,title=title,story=story,kind=group,key=key,target=target,value=min(target,int(value)),level=level,claimed=done,unlocked=unlocked,ready=unlocked and value>=target and not done,xp=xp,gold=gold,fragments=extra if group!='sect' else 0,merit=extra if group=='sect' else 0))
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
    return dict(**wallet(db,uid),quests=quests(db,uid,player),recipes=recipes(player),shop=shop(player),qualities=[dict(id=q[0],name=q[1],color=q[2],cost=q[3],level=q[4]) for q in QUALITIES],tutorial={key:count(db,uid,key) for key in ('walk','attack','ui:bag','ui:attrs','meditate')})

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
        db.execute('INSERT INTO adventure_claims VALUES(?,?,?)',(uid,quest['id'],day() if quest['kind']=='sect' else ''))
        player['gold']=min(10**9,player['gold']+quest['gold']);gain(player,quest['xp']);grant_fragments(db,uid,quest['fragments']);db.execute('UPDATE adventure_wallet SET merit=merit+? WHERE user_id=?',(quest['merit'],uid))
    else:raise ValueError('Thao tác không hợp lệ.')
    equipment.validate(player,db,uid);revision=row['revision']+1
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),uid))
    db.execute('INSERT INTO adventure_ops VALUES(?,?)',(uid,opid))
    return dict(character=dict(id=row['id'],player=player,revision=revision),adventure=snapshot(db,uid,player))
