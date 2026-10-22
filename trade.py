"""Hệ thống giao dịch giữa người chơi (server-side, atomic, replay-safe)."""
import json
import secrets
import time

def init_db(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS trade_offers(
      id TEXT PRIMARY KEY,
      from_user_id INTEGER NOT NULL REFERENCES users(id),
      to_user_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      items_from TEXT NOT NULL DEFAULT '[]',
      items_to TEXT NOT NULL DEFAULT '[]',
      created_at REAL NOT NULL,
      expires_at REAL NOT NULL
    );
    CREATE INDEX IF NOT EXISTS trade_to_status ON trade_offers(to_user_id,status);
    CREATE INDEX IF NOT EXISTS trade_from_status ON trade_offers(from_user_id,status);
    CREATE TABLE IF NOT EXISTS trade_ops(user_id INTEGER NOT NULL,operation_id TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(user_id,operation_id));
    ''')

def snapshot(db,uid):
    now=time.time()
    db.execute('DELETE FROM trade_offers WHERE expires_at<? AND status=?',(now,'pending'))
    sent=[dict(r) for r in db.execute('SELECT * FROM trade_offers WHERE from_user_id=? ORDER BY created_at DESC LIMIT 30',(uid,))]
    received=[dict(r) for r in db.execute('SELECT * FROM trade_offers WHERE to_user_id=? AND status=? ORDER BY created_at DESC LIMIT 30',(uid,'pending'))]
    for lst in (sent,received):
        for r in lst:
            r['items_from']=json.loads(r['items_from'])
            r['items_to']=json.loads(r['items_to'])
    return {'trade':{'sent':sent,'received':received}}

def _item_of(player,uid):
    w=player.get('world',{})
    for i in w.get('bag',[]):
        if i.get('uid')==uid:return i
    for slot,i in (w.get('equip') or {}).items():
        if isinstance(i,dict) and i.get('uid')==uid:return i
    return None

def _remove_item(player,uid):
    w=player.get('world',{})
    w['bag']=[i for i in w.get('bag',[]) if i.get('uid')!=uid]
    equip=w.get('equip') or {}
    for slot in list(equip.keys()):
        if isinstance(equip[slot],dict) and equip[slot].get('uid')==uid:
            equip[slot]=None

def action(db,uid,body,peers):
    op=body.get('action');operation=body.get('operationId');now=time.time()
    if not isinstance(operation,str) or not 1<=len(operation)<=80:raise ValueError('Thiếu mã thao tác.')
    saved=db.execute('SELECT * FROM characters WHERE user_id=?',(uid,)).fetchone()
    if not saved:raise ValueError('Hãy tạo nhân vật trước.')
    replay=db.execute('SELECT result FROM trade_ops WHERE user_id=? AND operation_id=?',(uid,operation)).fetchone()
    if replay:return json.loads(replay['result'])
    player=json.loads(saved['player'])
    if body.get('revision')!=saved['revision']:raise ValueError('Nhân vật đã thay đổi. Đồng bộ lại.')

    if op=='trade_offer':
        target=body.get('target')
        if type(target) is not int or target==uid:raise ValueError('Chọn đối tượng giao dịch hợp lệ.')
        if not db.execute('SELECT 1 FROM characters WHERE user_id=?',(target,)).fetchone():raise ValueError('Không tìm thấy người chơi.')
        if not __import__('community').safe(player):raise ValueError('Cả hai bên phải ở vùng an toàn.')
        target_player_row=db.execute('SELECT player FROM characters WHERE user_id=?',(target,)).fetchone()
        target_player=json.loads(target_player_row['player'])
        if not __import__('community').safe(target_player):raise ValueError('Đối phương chưa ở vùng an toàn.')
        items_from=body.get('items_from',[]);items_to=body.get('items_to',[])
        if not isinstance(items_from,list) or not isinstance(items_to,list):raise ValueError('Dữ liệu vật phẩm không hợp lệ.')
        offered=[]
        for iuid in items_from:
            it=_item_of(player,iuid)
            if not it:raise ValueError('Bạn không sở hữu vật phẩm '+str(iuid))
            offered.append(iuid)
        if len(set(offered))!=len(offered):raise ValueError('Vật phẩm bị trùng.')
        tid=secrets.token_hex(12)
        db.execute('INSERT INTO trade_offers VALUES(?,?,?,?,?,?,?,?)',
            (tid,uid,target,'pending',json.dumps(items_from),json.dumps(items_to),now,now+300))
        db.execute('INSERT INTO trade_ops VALUES(?,?,?)',(uid,operation,json.dumps({'ok':True,'offerId':tid})))
        revision=saved['revision']+1
        db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player,ensure_ascii=False),revision,int(now),uid))
        return {'ok':True,'offerId':tid,'character':{'id':saved['id'],'player':player,'revision':revision}}

def _remove_item(player,uid):
    w=player.get('world',{})
    w['bag']=[i for i in w.get('bag',[]) if i.get('uid')!=uid]
    equip=w.get('equip') or {}
    for slot in list(equip.keys()):
        if isinstance(equip[slot],dict) and equip[slot].get('uid')==uid:
            equip[slot]=None

    if op=='trade_accept':
        offer_id=body.get('id')
        if not isinstance(offer_id,str):raise ValueError('Mã giao dịch không hợp lệ.')
        offer=db.execute('SELECT * FROM trade_offers WHERE id=? AND to_user_id=? AND status=? AND expires_at>?',(offer_id,uid,'pending',now)).fetchone()
        if not offer:raise ValueError('Lệnh mời giao dịch không tồn tại hoặc đã hết hạn.')
        from_uid=offer['from_user_id']
        items_to=body.get('items_to',[])
        if not isinstance(items_to,list):raise ValueError('Dữ liệu vật phẩm không hợp lệ.')
        for iuid in items_to:
            it=_item_of(player,iuid)
            if not it:raise ValueError('Bạn không sở hữu vật phẩm '+str(iuid)+' để trao.')
        if len(set(items_to))!=len(items_to):raise ValueError('Vật phẩm bị trùng.')
        items_from=json.loads(offer['items_from'])
        from_row=db.execute('SELECT player,revision FROM characters WHERE user_id=?',(from_uid,)).fetchone()
        if not from_row:raise ValueError('Người gửi không tồn tại.')
        from_player=json.loads(from_row['player'])
        if not __import__('community').safe(player):raise ValueError('Bạn phải ở vùng an toàn.')
        if not __import__('community').safe(from_player):raise ValueError('Đối phương phải ở vùng an toàn.')
        for iuid in items_from:_remove_item(from_player,iuid)
        for iuid in items_to:_remove_item(player,iuid)
        from_player2=json.loads(db.execute('SELECT player FROM characters WHERE user_id=?',(from_uid,)).fetchone()['player'])
        player2=json.loads(db.execute('SELECT player FROM characters WHERE user_id=?',(uid,)).fetchone()['player'])
        for iuid in items_from:
            it=next((i for i in (from_player2.get('world',{}).get('bag',[]))+[v for v in (from_player2.get('world',{}).get('equip') or {}).values() if isinstance(v,dict)] if i.get('uid')==iuid),None)
            if it:_remove_item(from_player2,iuid);player2.setdefault('world',{}).setdefault('bag',[]).append(it)
        for iuid in items_to:
            it=next((i for i in (player2.get('world',{}).get('bag',[]))+[v for v in (player2.get('world',{}).get('equip') or {}).values() if isinstance(v,dict)] if i.get('uid')==iuid),None)
            if it:_remove_item(player2,iuid);from_player2.setdefault('world',{}).setdefault('bag',[]).append(it)
        import equipment as equipment_rules
        equipment_rules.validate(from_player2,db,from_uid)
        equipment_rules.validate(player2,db,uid)
        db.execute('UPDATE trade_offers SET status=? WHERE id=?',('accepted',offer_id))
        rev1=from_row['revision']+1
        db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(from_player2,ensure_ascii=False),rev1,int(now),from_uid))
        rev2=saved['revision']+1
        db.execute('UPDATE characters SET player=?,revision=?,updated_at=? WHERE user_id=?',(json.dumps(player2,ensure_ascii=False),rev2,int(now),uid))
        db.execute('INSERT INTO trade_ops VALUES(?,?,?)',(uid,operation,json.dumps({'ok':True})))
        db.execute('INSERT OR IGNORE INTO trade_ops VALUES(?,?,?)',(from_uid,'trade_accept:'+offer_id,json.dumps({'ok':True})))
        return {'ok':True}

    if op=='trade_reject':
        offer_id=body.get('id')
        if not isinstance(offer_id,str):raise ValueError('Mã giao dịch không hợp lệ.')
        db.execute('UPDATE trade_offers SET status=? WHERE id=? AND to_user_id=? AND status=?',('rejected',offer_id,uid,'pending'))
        db.execute('INSERT INTO trade_ops VALUES(?,?,?)',(uid,operation,json.dumps({'ok':True})))
        return {'ok':True}

    if op=='trade_cancel':
        offer_id=body.get('id')
        if not isinstance(offer_id,str):raise ValueError('Mã giao dịch không hợp lệ.')
        db.execute('UPDATE trade_offers SET status=? WHERE id=? AND from_user_id=? AND status=?',('cancelled',offer_id,uid,'pending'))
        db.execute('INSERT INTO trade_ops VALUES(?,?,?)',(uid,operation,json.dumps({'ok':True})))
        return {'ok':True}

    raise ValueError('Thao tác giao dịch không hợp lệ.')