"""Server-authoritative drops, consensual PvP, clocks, isolation and spectators."""
import copy
import json
import math
import struct
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
import equipment
import expeditions
import duels

class ExpeditionDuels(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old=server.DATABASE;server.DATABASE=Path(self.temp.name)/'test.sqlite3';server.init_db()
        self.peers={};self.player=dict(nm='Dao Huu',ap=dict(w=0,gender='Nam'),r=0,stage=1,hp=100,mp=60,xp=0,gold=0,level=80,levelXp=0,world=dict(bag=[],attrs=dict(luc=0,the=0,nhanh=0,linh=0)))
        equipment.normalize(self.player)
        with server.connect() as db:
            for uid in range(1,5):
                p=copy.deepcopy(self.player);p['nm']='Dao Huu '+str(uid)
                db.execute('INSERT INTO users VALUES(?,?,?,?)',(uid,'user_'+str(uid),'unused',0))
                db.execute('INSERT INTO characters VALUES(?,?,?,?,?)',(uid,str(uid),json.dumps(p),1,0))
                self.peers[uid]=dict(id=uid,name=p['nm'],map='hub',seen=time.monotonic(),x=1000,y=1100)
        self.db=server.connect()
    def tearDown(self):self.db.close();server.DATABASE=self.old;self.temp.cleanup()
    def action(self,uid,op,**args):return duels.action(self.db,uid,dict(action=op,**args),self.peers,server.player_max_hp,server.player_attack)
    def start(self,a=1,b=2):
        with patch('duels.time.time',return_value=1000):
            data=self.action(a,'invite',target=b);invite=next(i for i in data['invites'] if i['target']==b)
            return self.action(b,'accept',id=invite['id'])['current']
    def move(self,uid,stamp,events=None,x=None,y=None):
        m=duels.current(self.db,uid);f=m['fighters'].get(str(uid),{})
        body=dict(map='duel',x=x if x is not None else f.get('x',1000),y=y if y is not None else f.get('y',1430),hp=10**9,duelAttacks=events or [])
        with patch('duels.time.time',return_value=stamp):return duels.world_step(self.db,uid,body,self.peers)
    def close_range(self):
        m=duels.current(self.db,1);m['fighters']['1'].update(x=950,y=1100);m['fighters']['2'].update(x=980,y=1100);duels.save(self.db,m)
    def test_four_gates_and_all_twelve_species(self):
        self.assertEqual([m['level'] for m in expeditions.MAPS.values()],[10,25,45,70])
        self.assertEqual({m['direction'] for m in expeditions.MAPS.values()},{'Đông','Tây','Nam','Bắc'})
        skins=set()
        for scene,rule in expeditions.MAPS.items():
            mobs=expeditions.room(scene,100)['mobs'];self.assertEqual(len(mobs),25);self.assertEqual(sum(m['boss'] for m in mobs),1)
            for mob in mobs:
                self.assertTrue(expeditions.inside(mob['x'],mob['y']));self.assertFalse(expeditions.safe(mob['x'],mob['y']));skins.add(mob['skin'])
            for cls in range(4):
                for iid in expeditions.equipment_pool(scene,cls):
                    item=equipment.TEMPLATES[iid];self.assertEqual(item['classIndex'],cls);self.assertEqual(item['req'],rule['level'])
        self.assertEqual(skins,set(expeditions.RULES['species']))
    def test_monster_metadata_and_rgba(self):
        root=Path(__file__).resolve().parents[1];data=json.loads((root/'Character/Monsters/animation-frames.json').read_text(encoding='utf-8'))
        runtime=(root/'js/35n-monster-frames.js').read_text(encoding='utf-8').split('window.newMonsterFrames=',1)[1].strip().removesuffix(';')
        self.assertEqual(json.loads(runtime),data)
        rules=(root/'js/35n-expedition-rules.js').read_text(encoding='utf-8').split('window.expeditionRules=',1)[1].strip().removesuffix(';')
        self.assertEqual(json.loads(rules),expeditions.RULES)
        self.assertEqual(set(data),set(expeditions.RULES['species']))
        for name,meta in data.items():
            png=(root/meta['file']).read_bytes();self.assertEqual(png[25],6);self.assertEqual(list(struct.unpack('>II',png[16:24])),meta['size']);self.assertEqual(len(meta['frames']),20)
            for f in meta['frames']:
                x,y,w,h=f['rect'];self.assertTrue(w>30 and h>30 and x>=0 and y>=0 and x+w<=meta['size'][0] and y+h<=meta['size'][1]);self.assertTrue(0<=f['anchor'][0]<=w and 0<f['anchor'][1]<=h)
    def test_drop_own_class_correct_tier_and_exactly_once(self):
        mob=expeditions.room('rift-fire',0)['mobs'][-1]
        expeditions.queue_drop(self.db,1,mob,'event-a');expeditions.queue_drop(self.db,1,mob,'event-a');self.db.commit()
        self.assertEqual(expeditions.pending(self.db,1),1);self.assertEqual(expeditions.pending(self.db,2),0)
        first=expeditions.claim(self.db,1,dict(revision=1));self.assertEqual(len(first['claimed']),1);self.assertEqual(first['claimed'][0]['req'],45);self.assertEqual(first['claimed'][0]['classIndex'],0)
        second=expeditions.claim(self.db,1,dict(revision=2));self.assertEqual(second['claimed'],[]);self.assertEqual(len(second['character']['player']['world']['bag']),1)
    def test_full_bag_keeps_pending_and_revision_conflicts(self):
        p=copy.deepcopy(self.player);p['world']['bag']=[dict(equipment.TEMPLATES['moc-kiem-class-0'],uid=str(i)) for i in range(30)]
        self.db.execute('UPDATE characters SET player=? WHERE user_id=1',(json.dumps(p),));expeditions.queue_drop(self.db,1,expeditions.room('rift-wood',0)['mobs'][-1],'event-b')
        self.assertTrue(expeditions.claim(self.db,1,dict(revision=0))['conflict']);result=expeditions.claim(self.db,1,dict(revision=1));self.assertEqual(result['claimed'],[]);self.assertEqual(result['pending'],1)
    def test_low_level_cannot_receive_high_tier_drop(self):
        p=copy.deepcopy(self.player);p['level']=1;self.db.execute('UPDATE characters SET player=? WHERE user_id=1',(json.dumps(p),));expeditions.queue_drop(self.db,1,expeditions.room('rift-void',0)['mobs'][-1],'blocked');self.assertEqual(expeditions.pending(self.db,1),0)
    def test_consent_countdown_and_duration(self):
        self.action(1,'invite',target=2);invite=self.db.execute('SELECT id FROM duel_invites').fetchone()['id']
        with self.assertRaises(ValueError):self.action(3,'accept',id=invite)
        self.db.execute('DELETE FROM duel_invites')
        m=self.start();self.assertEqual(m['endsAt']-m['startsAt'],600);self.assertEqual(m['startsAt'],1003);self.assertEqual(len(m['fighters']),2)
        with self.assertRaises(ValueError):self.action(1,'invite',target=3)
    def test_no_self_or_offline_invites(self):
        with self.assertRaises(ValueError):self.action(1,'invite',target=1)
        self.peers[2]['seen']-=20
        with self.assertRaises(ValueError):self.action(1,'invite',target=2)
    def test_expired_and_declined_invites(self):
        with patch('duels.time.time',return_value=1000):data=self.action(1,'invite',target=2)
        with patch('duels.time.time',return_value=1061):
            with self.assertRaises(ValueError):self.action(2,'accept',id=data['invites'][0]['id'])
        self.action(1,'invite',target=3);invite=self.db.execute('SELECT id FROM duel_invites WHERE target=3').fetchone()['id'];self.action(3,'decline',id=invite);self.assertIsNone(duels.current(self.db,3))
    def test_spectators_are_outside_and_cannot_attack(self):
        m=self.start();self.action(3,'watch',id=m['id']);before=duels.current(self.db,1)['fighters']
        result=self.move(3,1004,[dict(id='hack',slot=4,power=1e20)],x=1000,y=1100)
        self.assertTrue(result['viewer']);self.assertGreaterEqual(math.hypot((result['x']-1000)/420,(result['y']-1100)/255),1.18)
        after=duels.current(self.db,1)['fighters'];self.assertEqual([f['hp'] for f in before.values()],[f['hp'] for f in after.values()]);self.assertEqual(duels.current(self.db,1)['pending'],[])
    def test_server_damage_health_cooldown_and_replay(self):
        self.start();self.close_range();event=dict(id='swing-a',slot=0,x=980,y=1100,power=10**12)
        self.move(1,1004,[event,event]);first=duels.current(self.db,1);self.assertEqual(len(first['pending']),1);self.move(2,1004.2)
        after=duels.current(self.db,1);damage=after['fighters']['1']['damage'];self.assertTrue(1<=damage<100);self.assertEqual(after['fighters']['2']['hp'],after['fighters']['2']['maxHp']-damage)
        self.move(1,1005,[event]);self.move(2,1005.2);self.assertEqual(duels.current(self.db,1)['fighters']['1']['damage'],damage)
    def test_countdown_and_unlearned_skills_are_blocked(self):
        self.start();self.close_range();self.move(1,1001,[dict(id='early',slot=0,x=980,y=1100)]);self.assertEqual(duels.current(self.db,1)['pending'],[])
        m=duels.current(self.db,1);m['fighters']['1']['level']=1;duels.save(self.db,m);self.move(1,1004,[dict(id='locked',slot=4,x=980,y=1100)]);self.assertEqual(duels.current(self.db,1)['pending'],[])
    def test_evade_and_aim_are_real(self):
        self.start();self.close_range();self.move(1,1004,[dict(id='swing',slot=0,x=980,y=1100)]);self.move(2,1004.05,[dict(id='evade',slot=2,x=950,y=1100)]);self.move(1,1004.2);self.assertEqual(duels.current(self.db,1)['fighters']['1']['damage'],0)
    def test_timeout_uses_damage_and_ties_draw(self):
        self.start();m=duels.current(self.db,1);m['fighters']['1']['damage']=101;m['fighters']['2']['damage']=100;duels.tick(self.db,m,1604);self.assertEqual(m['winner'],1);self.assertEqual(m['reason'],'timeout')
        m['status']='active';m['fighters']['1']['damage']=100;duels.tick(self.db,m,1604);self.assertIsNone(m['winner'])
    def test_last_attack_before_deadline_is_counted(self):
        self.start();self.close_range();m=duels.current(self.db,1);m['pending']=[dict(id='last',owner=1,target=2,slot=0,x=980,y=1100,ox=950,oy=1100,range=100,radius=42,power=1,at=m['endsAt']-.01)];duels.tick(self.db,m,m['endsAt']+.1);self.assertEqual(m['winner'],1);self.assertGreater(m['fighters']['1']['damage'],0)
    def test_disconnect_and_both_disconnect(self):
        self.start();m=duels.current(self.db,1);m['fighters']['1']['lastSeen']=1032;duels.tick(self.db,m,1032);self.assertEqual(m['winner'],1);self.assertEqual(m['reason'],'disconnect')
        m['status']='active';m['fighters']['1']['lastSeen']=1000;duels.tick(self.db,m,1033);self.assertIsNone(m['winner'])
    def test_surrender_and_match_room_isolation(self):
        a=self.start();b=self.start(3,4);self.assertNotEqual(a['id'],b['id']);self.assertNotEqual(server.room_for(dict(map='duel',duelId=a['id'])),server.room_for(dict(map='duel',duelId=b['id'])))
        with patch('duels.time.time',return_value=1005):self.action(1,'surrender')
        self.assertEqual(duels.load(self.db,a['id'])['winner'],2);self.assertEqual(duels.load(self.db,b['id'])['status'],'active')
    def test_state_survives_database_reopen(self):
        m=self.start();self.db.commit();self.db.close();self.db=server.connect();self.assertEqual(duels.current(self.db,1)['id'],m['id'])
    def test_extreme_move_is_bounded(self):
        self.start();result=self.move(1,1004,x=1700,y=1500);f=duels.current(self.db,1)['fighters']['1'];self.assertLess(math.hypot(f['x']-870,f['y']-1100),90);self.assertLess(math.hypot((f['x']-1000)/350,(f['y']-1100)/210),1)

if __name__=='__main__':unittest.main()
