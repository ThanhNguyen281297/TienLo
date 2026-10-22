"""Trades use real SQLite transactions, ownership certificates and both confirmations."""
import copy
import json
from pathlib import Path
import sys
import sqlite3
import tempfile
import time
import unittest
import uuid
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server,trade,community,equipment,expeditions


class SocialTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.previous=server.DATABASE;server.DATABASE=Path(self.temp.name)/'db.sqlite3';server.init_db();self.db=sqlite3.connect(server.DATABASE);self.db.row_factory=sqlite3.Row;self.db.execute('PRAGMA foreign_keys=ON')
        self.peers={i:dict(id=i,name='Hero'+str(i),map='hub',x=1000+i*10,y=1100,seen=time.monotonic()) for i in (1,2,3)}
        for uid in (1,2,3):
            self.db.execute('INSERT INTO users(id,username,password,created_at) VALUES(?,?,?,0)',(uid,'hero'+str(uid),'unused'))
            p=dict(nm='Hero'+str(uid),ap=dict(w=uid-1,gender='Nam'),r=0,stage=1,hp=100,mp=20,xp=0,gold=1000,level=80,levelXp=0,x=1000+uid*10,y=1100,world=dict(map='hub',bag=[],equip={}))
            equipment.normalize(p);server.progression.normalize(p)
            p['world']['bag']=[dict(equipment.TEMPLATES['train-10-giay-class-'+str(uid-1)],uid='gear-'+str(uid),enhance=9,options=[dict(key='atk',value=2)])]
            self.db.execute('INSERT INTO equipment_drop_rolls VALUES(?,?,?,?)',(uid,'gear-'+str(uid),p['world']['bag'][0]['id'],json.dumps(p['world']['bag'][0]['options'])))
            self.db.execute('INSERT INTO characters VALUES(?,?,?,?,0)',(uid,'character-'+str(uid),json.dumps(p),1))
        self.db.commit()
    def tearDown(self):self.db.close();server.DATABASE=self.previous;self.temp.cleanup()
    def p(self,uid):return json.loads(self.db.execute('SELECT player FROM characters WHERE user_id=?',(uid,)).fetchone()[0])
    def revision(self,uid):return self.db.execute('SELECT revision FROM characters WHERE user_id=?',(uid,)).fetchone()[0]
    def act(self,uid,op,**values):
        body=dict(action=op,opId=str(uuid.uuid4()),revision=self.revision(uid));body.update(values)
        if op!='trade_invite':
            current=trade.snapshot(self.db,uid,self.peers)['trades'][0];body.setdefault('id',current['id']);body.setdefault('version',current['version'])
        with self.db:return trade.action(self.db,uid,body,self.peers)
    def begin(self):self.act(1,'trade_invite',target=2);self.act(2,'trade_accept')
    def offers(self):self.begin();self.act(1,'trade_offer',items=['gear-1'],gold=120);self.act(2,'trade_offer',items=['gear-2'],gold=20)
    def lock(self):self.act(1,'trade_lock');self.act(2,'trade_lock')
    def test_invalid_action_returns_validation_error(self):
        for op in (None,1,[],{}):
            with self.subTest(op=op),self.assertRaises(ValueError):
                trade.action(self.db,1,dict(action=op,opId=str(uuid.uuid4())),self.peers)
    def test_mutual_friend_consent_and_request_ids(self):
        with self.db:community.action(self.db,1,dict(action='friend_add',target=2,operationId='friend-request'),self.peers)
        data=community.snapshot(self.db,2,self.peers);self.assertEqual(data['friends'],[]);request=data['friendRequests'][0];self.assertEqual(request['playerId'],1)
        with self.db:community.action(self.db,2,dict(action='friend_accept',id=request['id'],operationId='friend-accept'),self.peers)
        self.assertEqual(community.snapshot(self.db,1,self.peers)['friends'][0]['id'],2)
        self.assertEqual(community.snapshot(self.db,2,self.peers)['friends'][0]['id'],1)
    def test_exchange_requires_both_locks_and_confirmations(self):
        self.offers()
        with self.assertRaises(ValueError):self.act(1,'trade_confirm')
        self.lock();self.assertTrue(trade.locked(self.db,1));self.act(1,'trade_confirm');self.assertEqual(self.p(1)['gold'],1000)
        self.act(2,'trade_confirm');self.assertEqual(self.p(1)['gold'],900);self.assertEqual(self.p(2)['gold'],1100)
        self.assertEqual(self.p(1)['world']['bag'][0]['uid'],'gear-2');self.assertEqual(self.p(2)['world']['bag'][0]['uid'],'gear-1')
        self.assertEqual(self.p(2)['world']['bag'][0]['enhance'],9)
        for uid in (1,2):equipment.validate(self.p(uid),self.db,uid)
        self.assertFalse(trade.locked(self.db,1))
        self.assertEqual(self.db.execute('SELECT user_id FROM equipment_drop_rolls WHERE item_uid=?',('gear-1',)).fetchone()[0],2)
    def test_offer_change_resets_both_locks_and_confirmation(self):
        self.offers();self.act(1,'trade_lock');self.act(2,'trade_offer',items=['gear-2'],gold=30)
        self.assertFalse(any(o['locked'] or o['confirmed'] for o in trade.snapshot(self.db,1,self.peers)['trades'][0]['offers'].values()))
    def test_stale_confirmation_cannot_accept_changed_offer(self):
        self.offers();old=trade.snapshot(self.db,1,self.peers)['trades'][0]['version'];self.lock()
        with self.assertRaises(trade.Conflict):self.act(1,'trade_confirm',version=old)
        self.assertEqual(self.p(1)['gold'],1000)
    def test_duplicate_retries_do_not_transfer_twice(self):
        self.offers();self.lock();self.act(1,'trade_confirm');token=str(uuid.uuid4());self.act(2,'trade_confirm',opId=token)
        before=copy.deepcopy(self.p(2));self.act(2,'trade_confirm',opId=token);self.assertEqual(self.p(2),before)
    def test_cancel_never_moves_goods(self):
        self.offers();self.lock();self.act(1,'trade_cancel');self.assertEqual(self.p(1)['world']['bag'][0]['uid'],'gear-1');self.assertFalse(trade.locked(self.db,1))
    def test_bag_full_rolls_back_every_transfer_and_certificate(self):
        self.offers();p=self.p(2);p['world']['bag'] += [dict(equipment.TEMPLATES['train-10-giay-class-1'],uid='filler-'+str(i)) for i in range(29)]
        self.db.execute('UPDATE characters SET player=? WHERE user_id=2',(json.dumps(p),));self.db.commit()
        self.act(1,'trade_offer',items=['gear-1'],gold=0);self.act(2,'trade_offer',items=[],gold=0);self.lock();self.act(1,'trade_confirm')
        with self.assertRaises(ValueError):self.act(2,'trade_confirm')
        self.assertEqual(self.p(1)['world']['bag'][0]['uid'],'gear-1');self.assertEqual(self.p(1)['gold'],1000)
        self.assertEqual(self.db.execute('SELECT user_id FROM equipment_drop_rolls WHERE item_uid=?',('gear-1',)).fetchone()[0],1)
    def test_sold_or_changed_item_cannot_be_transferred(self):
        self.offers();p=self.p(1);p['world']['bag']=[];self.db.execute('UPDATE characters SET player=? WHERE user_id=1',(json.dumps(p),));self.db.commit();self.lock();self.act(1,'trade_confirm')
        with self.assertRaises(ValueError):self.act(2,'trade_confirm')
        self.assertEqual(self.p(2)['world']['bag'][0]['uid'],'gear-2')
    def test_foreign_and_duplicate_item_ids_rejected(self):
        self.begin()
        for items in (['gear-2'],['gear-1','gear-1']):
            with self.assertRaises(ValueError):self.act(1,'trade_offer',items=items,gold=0)
    def test_outsider_cannot_accept_another_players_trade(self):
        self.begin();t=trade.snapshot(self.db,1,self.peers)['trades'][0]
        with self.assertRaises(ValueError):
            with self.db:trade.action(self.db,3,dict(action='trade_cancel',id=t['id'],version=t['version'],opId=str(uuid.uuid4())),self.peers)
    def test_offline_distance_and_expiry(self):
        self.peers[2]['x']=1800
        with self.assertRaises(ValueError):self.act(1,'trade_invite',target=2)
        self.peers[2]['x']=1020;self.peers[2]['seen']-=20
        with self.assertRaises(ValueError):self.act(1,'trade_invite',target=2)
        self.peers[2]['seen']=time.monotonic();self.begin();self.db.execute('UPDATE player_trades SET expires=0');self.db.commit();self.assertEqual(trade.snapshot(self.db,1,self.peers)['trades'],[])
    def test_inspection_excludes_wallet_inventory_and_auth(self):
        result=trade.public(self.db,2,self.peers,True)
        for secret in ('gold','bag','password','username','csrf'):self.assertNotIn(secret,result)
        self.assertEqual(result['name'],'Hero2');self.assertIn('equip',result)
    def test_reforged_locked_affixes_and_material_stacks_follow_the_owner(self):
        p=self.p(1);back=dict(equipment.TEMPLATES['back-class-0'],uid='reforged-back',locks=[0]);back['affixes']=equipment.defaults(back);back['affixes'][0]['value']=equipment.pool(back)[0]['max']
        p['world']['bag'] += [back,dict(equipment.MATERIALS['cuong-hoa-thach'],uid='stack',qty=50)]
        self.db.execute('INSERT INTO equipment_rolls VALUES(?,?,?,?)',(1,back['uid'],back['id'],json.dumps(back['affixes'])))
        self.db.execute('INSERT INTO equipment_locks VALUES(?,?,?)',(1,back['uid'],'[0]'))
        self.db.execute('UPDATE characters SET player=? WHERE user_id=1',(json.dumps(p),));self.db.commit();self.begin();self.act(1,'trade_offer',items=['reforged-back','stack'],gold=0);self.lock();self.act(1,'trade_confirm');self.act(2,'trade_confirm')
        equipment.validate(self.p(2),self.db,2);received=next(i for i in self.p(2)['world']['bag'] if i['uid']=='reforged-back');self.assertEqual(received['affixes'],back['affixes']);self.assertEqual(received['locks'],[0]);self.assertEqual(next(i for i in self.p(2)['world']['bag'] if i['uid']=='stack')['qty'],50)
        self.assertEqual(self.db.execute('SELECT user_id FROM equipment_locks WHERE item_uid=?',('reforged-back',)).fetchone()[0],2)
    def test_drops_are_random_across_all_classes_not_recipient_class(self):
        for cls in range(4):
            with patch('expeditions.secrets.randbelow',side_effect=lambda n:cls if n==4 else 0):expeditions.queue_farm_drop(self.db,1,dict(map='field-meadow',level=10),str(cls))
        ids=[r[0] for r in self.db.execute("SELECT item_id FROM expedition_drops WHERE id LIKE '%-gear'")]
        self.assertEqual({int(i[-1]) for i in ids},set(range(4)))


if __name__=='__main__':unittest.main()
