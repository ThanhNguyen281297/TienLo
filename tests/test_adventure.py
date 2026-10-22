"""Economy, authorization, level story, daily quests and locked affix tests."""
import copy
import json
import sys
import tempfile
import threading
import unittest
import struct
from pathlib import Path
from functools import partial
from unittest.mock import patch
from http.client import HTTPConnection
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server,adventure,equipment,expeditions

class AdventureTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old=server.DATABASE;server.DATABASE=Path(self.temp.name)/'game.sqlite3';server.init_db();self.db=server.connect()
        self.db.execute("INSERT INTO users(id,username,password,created_at) VALUES(1,'hero','unused',0)")
        self.player=dict(nm='Hero',ap=dict(w=0,gender='Nam'),r=0,stage=1,hp=100,mp=20,xp=0,gold=3000,level=80,levelXp=0,x=1000,y=1100,world=dict(map='hub',bag=[],equip={},essence=500))
        equipment.normalize(self.player);server.progression.normalize(self.player)
        self.db.execute('INSERT INTO characters VALUES(?,?,?,?,?)',(1,'hero-char',json.dumps(self.player),1,0));adventure.wallet(self.db,1);self.db.commit()
    def tearDown(self):self.db.close();server.DATABASE=self.old;self.temp.cleanup()
    def act(self,op,gm=False,**args):
        rev=self.db.execute('SELECT revision FROM characters WHERE user_id=1').fetchone()[0]
        return adventure.action(self.db,1,dict(action=op,opId='test-operation-'+str(rev),revision=rev,**args),gm)
    def test_gm_defaults_to_zero_and_cannot_self_grant(self):
        self.assertEqual(self.db.execute('SELECT gm FROM users').fetchone()[0],0)
        with self.assertRaises(PermissionError):self.act('gm_item',id='back-class-0')
        self.assertEqual(adventure.wallet(self.db,1)['fragments'],0)
    def test_all_motion_sprites_have_complete_registered_frames(self):
        root=Path(__file__).resolve().parents[1];data=json.loads((root/'Character/Motion/frames.json').read_text(encoding='utf-8'))
        runtime=(root/'js/35q-motion-frames.js').read_text(encoding='utf-8').split('window.characterMotionFrames=',1)[1].strip().removesuffix(';')
        self.assertEqual(json.loads(runtime),data);self.assertEqual(len(data),8)
        for key,meta in data.items():
            png=(root/meta['file']).read_bytes();self.assertEqual(png[25],6);self.assertEqual(list(struct.unpack('>II',png[16:24])),meta['size']);self.assertEqual(len(meta['frames']),20)
            for f in meta['frames']:
                x,y,w,h=f['rect'];self.assertGreater(w,30);self.assertGreater(h,30);self.assertTrue(0<=x<x+w<=meta['size'][0] and 0<=y<y+h<=meta['size'][1]);self.assertTrue(0<=f['anchor'][0]<=w and 0<f['anchor'][1]<=h)
    def test_training_templates_are_only_three_level_ten_slots(self):
        items=[i for i in equipment.TEMPLATES.values() if i.get('training')]
        self.assertEqual(len(items),12);self.assertEqual({i['slot'] for i in items},{'daobao','chan','giay'});self.assertEqual({i['req'] for i in items},{10});self.assertEqual({i['rarity'] for i in items},{'pham'})
        for i in items:self.assertIn(i['classIndex'],range(4))
    def test_real_training_kills_queue_only_level_ten_armor(self):
        old_peers=copy.deepcopy(server.PEERS);old_events=copy.deepcopy(server.EVENTS);server.PEERS.clear();server.EVENTS.clear()
        now=__import__('time').monotonic();server.PEERS[1]=dict(id=1,map='sword',trainingRealm=0,hp=100,x=1000,y=1100,seen=now)
        try:
            for slot in ('daobao','chan','giay'):
                mob=dict(id=slot,t=0,map='sword',hp=1,maxHp=1,x=1000,y=1100,contributors={},dead=0)
                with patch('server.secrets.randbelow',return_value=0),patch('server.secrets.choice',return_value=slot):server.damage_mob(mob,10,1,now,'sword:0')
            ids=[r['item_id'] for r in self.db.execute('SELECT item_id FROM expedition_drops WHERE user_id=1')]
            self.assertEqual(set(ids),{'train-10-'+slot+'-class-0' for slot in ('daobao','chan','giay')}|{'cuong-hoa-thach'})
            self.assertEqual(adventure.count(self.db,1,'kills'),3)
        finally:server.PEERS.clear();server.PEERS.update(old_peers);server.EVENTS.clear();server.EVENTS.update(old_events)
    def test_gm_grant_and_realm_are_server_actions(self):
        item=self.act('gm_item',True,id='back-class-0')['character']['player']['world']['bag'][0];self.assertEqual(len(item['affixes']),5)
        p=self.act('gm_realm',True,realm=12,stage=7)['character']['player'];self.assertEqual((p['r'],p['stage'],p['level']),(12,7,80))
    def test_five_quality_costs_and_class_gender_recipes(self):
        self.assertEqual([q[3] for q in adventure.QUALITIES],[10,15,20,25,30])
        for offer in adventure.recipes(self.player):
            item=equipment.TEMPLATES[offer['id']];self.assertEqual(item.get('classIndex',0),0);self.assertNotEqual(item.get('gender'),'Nu')
        self.assertTrue(any(r['quality']=='than' for r in adventure.recipes(self.player)))
    def test_craft_currency_level_canonical_and_replay(self):
        adventure.grant_fragments(self.db,1,100);result=self.act('craft',id='moc-kiem-class-0');self.assertEqual(result['adventure']['fragments'],90)
        self.assertEqual(result['character']['player']['world']['bag'][0]['atk'],equipment.TEMPLATES['moc-kiem-class-0']['atk'])
        replay=adventure.action(self.db,1,dict(action='craft',id='moc-kiem-class-0',opId='test-operation-1',revision=1));self.assertEqual(replay['adventure']['fragments'],90);self.assertEqual(len(replay['character']['player']['world']['bag']),1)
    def test_craft_rejects_wrong_class_or_gender(self):
        adventure.grant_fragments(self.db,1,100)
        for iid in ('moc-kiem-class-1','mask-nu-1'):
            with self.assertRaises(ValueError):self.act('craft',id=iid)
        self.assertEqual(adventure.wallet(self.db,1)['fragments'],100)
    def test_full_bag_insufficient_fragments_no_spending(self):
        with self.assertRaises(ValueError):self.act('craft',id='moc-kiem-class-0')
        p=copy.deepcopy(self.player);p['world']['bag']=[dict(equipment.TEMPLATES['moc-kiem-class-0'],uid=str(i)) for i in range(30)];self.db.execute('UPDATE characters SET player=?',(json.dumps(p),));adventure.grant_fragments(self.db,1,20)
        with self.assertRaises(ValueError):self.act('craft',id='moc-kiem-class-0')
        self.assertEqual(adventure.wallet(self.db,1)['fragments'],20)
    def test_level_and_revision_guards(self):
        p=copy.deepcopy(self.player);p['level']=1;self.db.execute('UPDATE characters SET player=?',(json.dumps(p),));adventure.grant_fragments(self.db,1,100)
        with self.assertRaises(ValueError):self.act('craft',id='mythic-back-class-0')
        self.assertTrue(adventure.action(self.db,1,dict(action='craft',id='moc-kiem-class-0',opId='bad-revision',revision=0))['conflict'])
    def test_boss_fragments_no_direct_equipment_and_no_duplicate(self):
        mob=expeditions.room('rift-void',0)['mobs'][-1]
        expeditions.queue_drop(self.db,1,mob,'kill-one');expeditions.queue_drop(self.db,1,mob,'kill-one')
        self.assertEqual(adventure.wallet(self.db,1)['fragments'],6);self.assertEqual(expeditions.pending(self.db,1),0)
    def test_daily_and_kill_deduplication(self):
        mob=dict(map='sword');adventure.record_kill(self.db,1,mob,'same');adventure.record_kill(self.db,1,mob,'same')
        self.assertEqual(adventure.count(self.db,1,'kills'),1);self.assertEqual(adventure.progress(self.db,1,'sectKills',True),1)
        with patch('adventure.day',return_value='2099-01-01'):self.assertEqual(adventure.progress(self.db,1,'sectKills',True),0)
    def test_main_story_order_and_claim_once(self):
        adventure.add(self.db,1,'walk',120)
        with self.assertRaises(ValueError):self.act('quest_claim',id='first-blood')
        result=self.act('quest_claim',id='awakening');self.assertEqual(result['character']['player']['gold'],3030)
        with self.assertRaises(ValueError):self.act('quest_claim',id='awakening')
        for i in range(10):adventure.record_kill(self.db,1,dict(map='sword',level=1),'story-'+str(i))
        latest=adventure.snapshot(self.db,1,result['character']['player'])
        self.assertTrue(next(q for q in latest['quests'] if q['id']=='first-blood')['ready'])
    def test_only_main_and_daily_quests_remain(self):
        snapshot=adventure.snapshot(self.db,1,self.player)
        self.assertEqual({q['kind'] for q in snapshot['quests']},{'main','daily'})
        self.assertEqual(snapshot['shop'],[])
        with self.assertRaises(ValueError):self.act('sect_buy',id='sect-vukhi-class-0')
        self.assertEqual(adventure.wallet(self.db,1)['merit'],0)
    def test_locked_lines_stay_exact_and_cost_gold_only(self):
        item=dict(equipment.TEMPLATES['back-class-0'],uid='back',affixes=equipment.defaults(dict(slot='phapbao')));self.player['world']['equip']['phapbao']=item;self.db.execute('UPDATE characters SET player=?',(json.dumps(self.player),))
        a=equipment.action(self.db,1,dict(action='lock',uid='back',index=1,opId='lock-line-1',revision=1));p=a['character']['player'];self.assertEqual(p['gold'],2960);line=copy.deepcopy(p['world']['equip']['phapbao']['affixes'][1])
        a=equipment.action(self.db,1,dict(action='reforge',uid='back',opId='roll-line-2',revision=2));p=a['character']['player'];self.assertEqual(p['gold'],2875);self.assertEqual(p['world']['essence'],500);self.assertEqual(p['world']['equip']['phapbao']['affixes'][1],line);equipment.validate(p,self.db,1)
        p['world']['equip']['phapbao']['locks']=[]
        with self.assertRaises(ValueError):equipment.validate(p,self.db,1)
    def test_all_locked_rejects_reforge_and_unlock_is_free(self):
        item=dict(equipment.TEMPLATES['shield-1'],uid='shield',affixes=equipment.defaults(dict(slot='ngoc')));self.player['world']['equip']['ngoc']=item;self.db.execute('UPDATE characters SET player=?',(json.dumps(self.player),))
        for i in range(5):equipment.action(self.db,1,dict(action='lock',uid='shield',index=i,opId='lock-all-'+str(i),revision=i+1))
        with self.assertRaises(ValueError):equipment.action(self.db,1,dict(action='reforge',uid='shield',opId='all-blocked',revision=6))
        p=equipment.action(self.db,1,dict(action='lock',uid='shield',index=2,opId='free-unlock',revision=6))['character']['player']
        self.assertEqual(p['gold'],2800);self.assertEqual(p['world']['equip']['ngoc']['locks'],[0,1,3,4])
    def test_sql_privilege_changes_apply_without_trusting_request_flags(self):
        self.db.execute('INSERT INTO sessions VALUES(?,?,?,?)',(server.session_key('token'),'1','csrf',int(__import__('time').time())+100));self.db.commit()
        http=server.GameServer(('127.0.0.1',0),partial(server.GameHandler,directory=str(server.ROOT)));thread=threading.Thread(target=http.serve_forever,daemon=True);thread.start()
        def request(path,body=None):
            c=HTTPConnection('127.0.0.1',http.server_port);c.request('POST' if body is not None else 'GET',path,json.dumps(body) if body is not None else None,{'Cookie':'tienlo_session=token','Content-Type':'application/json'});r=c.getresponse();data=json.loads(r.read());c.close();return r.status,data
        try:
            self.assertFalse(request('/api/session')[1]['user']['gm']);body=dict(action='gm_item',gm=True,id='back-class-0',revision=1,opId='forged-admin',csrf='csrf')
            self.assertEqual(request('/api/adventure',body)[0],403)
            self.db.execute('UPDATE users SET gm=1 WHERE id=1');self.db.commit();self.assertTrue(request('/api/session')[1]['user']['gm']);self.assertEqual(request('/api/adventure',body)[0],200)
            self.db.execute('UPDATE users SET gm=0 WHERE id=1');self.db.commit();body.update(opId='revoked-admin',revision=2);self.assertEqual(request('/api/adventure',body)[0],403)
        finally:http.shutdown();http.server_close();thread.join()

if __name__=='__main__':unittest.main()
