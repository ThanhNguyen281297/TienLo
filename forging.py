"""NPC-only, atomic material/essence enhancement; replay-safe +0 to +15."""
import json
import math
import time
import equipment
import adventure

def cost(next_level):
    return dict(stone=2+next_level*2,refined=max(0,next_level-9),essence=30+next_level*next_level*15)

def action(db,owner,body,gm=False):
    row=db.execute('SELECT * FROM characters WHERE user_id=?',(owner,)).fetchone()
    if not row:raise ValueError('Hãy tạo nhân vật trước.')
    player=json.loads(row['player']);opid=body.get('opId')
    if not isinstance(opid,str) or not 8<=len(opid)<=100:raise ValueError('Thiếu mã giao dịch.')
    if db.execute('SELECT 1 FROM equipment_ops WHERE user_id=? AND op_id=?',(owner,opid)).fetchone():return dict(character=dict(id=row['id'],player=player,revision=row['revision']))
    if body.get('revision')!=row['revision']:return dict(conflict=True,error='Nhân vật đã cập nhật. Hãy thử lại.')
    w=player['world']
    # Keep server-side proximity in sync with the forge NPC coordinates in
    # js/20-sect-layout-arena.js; otherwise the forge opens but every request
    # is rejected by the server.
    if w.get('map')!='hub' or math.hypot(player.get('x',0)-1240,player.get('y',0)-1210)>110:raise ValueError('Hãy tới NPC Luyện Khí trong Thiên Vân Thành.')
    item=next((i for i in equipment.items(player) if i['uid']==body.get('uid')),None)
    if not item or item.get('slot') not in equipment.RULES['enhanceSlots'] or item.get('classIndex')!=player['ap']['w']:raise ValueError('Chọn trang bị bên trái đúng class.')
    n=item.get('enhance',0)+1
    if n>15:raise ValueError('Trang bị đã đạt +15.')
    price=cost(n);free=gm and body.get('free') is True
    if not free:
        chosen=body.get('materials')
        if not isinstance(chosen,dict):raise ValueError('Hãy đặt nguyên liệu vào lò rèn.')
        for iid,amount in [('cuong-hoa-thach',price['stone']),('tinh-luyen-thach',price['refined'])]:
            if not amount:continue
            material=next((i for i in w['bag'] if i['uid']==chosen.get(iid) and i['id']==iid),None)
            if not material or material.get('qty',1)<amount:raise ValueError('Chưa đặt đủ '+equipment.MATERIALS[iid]['name']+'.')
        # Phù Cường Hóa (Kỳ Trân Các) pays the Linh Nguyên of this enhancement.
        if body.get('charm') is True:
            if not __import__('premium').take_material(player,'phu-cuong-hoa'):raise ValueError('Không có Phù Cường Hóa trong túi.')
        else:
            if w.get('essence',0)<price['essence']:raise ValueError('Chưa đủ Linh Nguyên.')
            w['essence']-=price['essence']
        for iid,amount in [('cuong-hoa-thach',price['stone']),('tinh-luyen-thach',price['refined'])]:
            if not amount:continue
            material=next(i for i in w['bag'] if i['uid']==chosen[iid]);material['qty']-=amount
            if material['qty']<=0:w['bag'].remove(material)
    item['enhance']=n;revision=row['revision']+1
    adventure.add(db,owner,'enhance')
    equipment.validate(player,db,owner)
    db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(time.time()),owner))
    result=dict(character=dict(id=row['id'],player=player,revision=revision),enhanced=item['uid'])
    db.execute('INSERT INTO equipment_ops VALUES(?,?,?)',(owner,opid,json.dumps(result)))
    return result
