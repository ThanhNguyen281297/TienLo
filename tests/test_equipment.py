"""Equipment migration, bounded server rolls and persistent shield clocks."""
import copy
import json
import re
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
import equipment

class EquipmentTest(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.location=patch.object(server,'DATABASE',Path(self.temp.name)/'test.sqlite3');self.location.start();server.init_db()
        self.player=dict(nm='Tester',ap=dict(w=0,gender='Nam'),r=0,stage=1,gold=1000,xp=0,hp=100,mp=20,x=1000,y=1100,world=dict(map='hub',bag=[],equip={},essence=1000))
        with server.connect() as db:db.execute("INSERT INTO users VALUES(1,'tester','unused',0)")
    def tearDown(self):
        self.location.stop();self.temp.cleanup()
    def insert(self,player=None):
        with server.connect() as db:db.execute('INSERT INTO characters VALUES(?,?,?,?,?)',(1,'character',json.dumps(player or self.player),1,0))
    def make(self,iid,uid=None):
        item=dict(equipment.TEMPLATES[iid],uid=uid or iid)
        if equipment.pool(item):item['affixes']=equipment.defaults(item)
        return item
    def saved(self):
        with server.connect() as db:return json.loads(db.execute('SELECT player FROM characters WHERE user_id=1').fetchone()[0])
    def test_catalog_matches_browser_and_assets_are_exact_case(self):
        source=(server.ROOT/'js/24c-equipment-rules.js').read_text(encoding='utf-8')
        self.assertEqual(json.loads(source.split('=',1)[1].strip().removesuffix(';')),equipment.RULES)
        exact={p.relative_to(server.ROOT).as_posix() for folder in ('Item','Character','Map','Skill') for p in (server.ROOT/folder).rglob('*') if p.is_file()}
        for meta in equipment.TEMPLATES.values():
            if meta.get('art'):self.assertIn(meta['art'],exact)
        self.assertEqual(len(equipment.RULES['combatSlots']),6)
        self.assertEqual(len(equipment.RULES['slots']),8)
    def test_public_nginx_allows_current_asset_roots(self):
        config=(server.ROOT/'deploy/nginx.conf').read_text(encoding='utf-8')
        match=re.search(r'location ~ (\^/\([^\n]+\)/)',config)
        self.assertIsNotNone(match)
        for root in ('js','css','Character','Map','Item','Skill'):
            self.assertRegex('/'+root+'/example.png',match[1])
    def test_v2_asset_move_preserves_reforged_lines_and_enhancement(self):
        equipment.normalize(self.player,server.collection_item)
        item=self.player['world']['equip']['phapbao'];item['enhance']=15
        item['affixes']=[dict(key=r['key'],value=r['max']) for r in equipment.RULES['offense'][-5:]]
        original=copy.deepcopy(item);item['art']='Item/PhapBao/Class/Kiem.png'
        self.player['world']['equipmentVersion']=2
        self.assertTrue(equipment.normalize(self.player,server.collection_item))
        self.assertEqual(item,original)
        self.assertEqual(self.player['world']['equipmentVersion'],3)
        self.assertFalse(equipment.normalize(self.player,server.collection_item))
    def test_migrate_old_collection_ring_gem_and_back_without_losing_items(self):
        old=copy.deepcopy(self.player);old['ap']['w']=3
        old['world']['equip']={
            'gioi':dict(id='rift-phong-gioi-10',setId='phong',slot='gioi',uid='old-ring',rarity='huyen',atk=8,enhance=13),
            'ngoc':dict(id='thach-ngoc',slot='ngoc',uid='old-gem',rarity='pham',mp=15,skill=.03,enhance=9),
            'phapbao':dict(id='ho-tam-kinh',slot='phapbao',uid='old-back',rarity='huyen',armor=3,enhance=15)}
        old['world']['bag']=[dict(id='moc-kiem',slot='vukhi',name='Sword',uid='sword',rarity='pham',atk=3)]
        self.insert(old);server.init_db();p=self.saved();equip=p['world']['equip']
        self.assertEqual((equip['chan']['id'],equip['chan']['uid'],equip['chan']['enhance']),('rift-phong-chan-10','old-ring',13))
        self.assertIsNone(equip['gioi']);self.assertEqual(equipment.capacity(p['world']),30)
        self.assertEqual((equip['ngoc']['id'],equip['ngoc']['enhance']),('shield-1',9))
        self.assertEqual((equip['phapbao']['id'],equip['phapbao']['enhance']),('back-class-3',15))
        self.assertEqual(equip['phaptran']['classIndex'],3);self.assertEqual([i['uid'] for i in p['world']['bag']],[i['uid'] for i in old['world']['bag']])
        server.valid_player(p)
        with server.connect() as db:
            self.assertEqual(json.loads(db.execute('SELECT player FROM equipment_migration_backup').fetchone()[0]),old)
            self.assertEqual(db.execute('SELECT revision FROM characters').fetchone()[0],2)
        server.init_db();self.assertEqual(self.saved(),p)
    def test_ring_capacity_and_shared_class_equipment(self):
        equipment.normalize(self.player,server.collection_item)
        p=self.player;p['world']['equip']['gioi']=self.make('dong-gioi')
        self.assertEqual(equipment.capacity(p['world']),40)
        p['world']['bag']=[dict(id='moc-kiem',slot='vukhi',uid=str(i),rarity='pham',atk=3) for i in range(40)]
        server.valid_player(p);p['world']['equip']['gioi']=None
        with self.assertRaises(ValueError):server.valid_player(p)
        p['world']['bag']=[];p['world']['equip']['gioi']=self.make('dong-gioi');p['world']['equip']['gioi']['capacity']=999
        with self.assertRaises(ValueError):server.valid_player(p)
        p['world']['equip']['gioi']=None;p['world']['equip']['phapbao']=self.make('back-class-1')
        server.valid_player(p)
        for cls in range(4):
            p['ap']['w']=cls
            for group in ('backs','shields','formations','rings'):
                for meta in equipment.RULES[group]:
                    p['world']['equip'][meta['slot']]=self.make(meta['id'])
                    server.valid_player(p)
        p['world']['equip']['ngoc']=self.make('back-class-0')
        with self.assertRaises(ValueError):server.valid_player(p)
    def test_collection_shields_have_item_specific_appearance(self):
        equipment.normalize(self.player,server.collection_item)
        for cls in range(4):
            self.player['ap']['w']=cls
            for set_id,style in equipment.RULES['collectionAppearance'].items():
                self.player['world']['equip']['ngoc']=dict(server.collection_item(f'rift-{set_id}-ngoc-0'),uid='set-shield')
                with server.connect() as db:
                    state=equipment.shield_state(db,1,self.player)
                self.assertEqual(state['variant'],style['shield'])
                self.assertEqual(state['buff'],equipment.TEMPLATES['shield-'+str(style['shield'])]['buff'])
    def test_reforge_transaction_replay_and_tamper_protection(self):
        equipment.normalize(self.player,server.collection_item);self.insert()
        uid=self.player['world']['equip']['phapbao']['uid']
        request=dict(action='reforge',uid=uid,opId='operation-1',revision=1)
        with server.connect() as db:result=equipment.action(db,1,request)
        p=result['character']['player'];self.assertEqual((p['gold'],p['world']['essence']),(940,988))
        lines=p['world']['equip']['phapbao']['affixes'];self.assertEqual(len(lines),5);self.assertEqual(len({r['key'] for r in lines}),5)
        with server.connect() as db:
            equipment.validate(p,db,1)
            replay=equipment.action(db,1,request)
            self.assertEqual(replay['character']['revision'],2);self.assertEqual(replay['character']['player']['gold'],940)
            forged=copy.deepcopy(p);forged['world']['equip']['phapbao']['affixes']=equipment.defaults(forged['world']['equip']['phapbao'])
            if forged!=p:
                with self.assertRaises(ValueError):equipment.validate(forged,db,1)
        self.assertEqual(self.saved(),p)
        bad=copy.deepcopy(p);bad['world']['equip']['phapbao']['affixes'][0]['value']=100000
        with self.assertRaises(ValueError):server.valid_player(bad)
    def test_shield_duration_cooldown_swap_death_and_restart(self):
        equipment.normalize(self.player,server.collection_item);self.player['world']['equip']['ngoc']=self.make('shield-1');self.insert()
        with patch.object(equipment.time,'time',return_value=1000),server.connect() as db:
            state=equipment.action(db,1,dict(action='shield',revision=1))['shield']
            self.assertEqual((state['activeUntil'],state['readyAt']),(1060,1180))
            with self.assertRaises(ValueError):equipment.action(db,1,dict(action='shield',revision=1))
        server.init_db()
        with patch.object(equipment.time,'time',return_value=1030),server.connect() as db:
            self.assertEqual(equipment.shield_state(db,1,self.player)['activeUntil'],1060)
            other=copy.deepcopy(self.player);other['world']['equip']['ngoc']=self.make('shield-2')
            self.assertEqual(equipment.shield_state(db,1,other)['activeUntil'],0)
            self.assertEqual(equipment.shield_state(db,1,other)['readyAt'],1180)
            equipment.action(db,1,dict(action='shield_end'))
            self.assertEqual(equipment.shield_state(db,1,self.player)['activeUntil'],0)
        with patch.object(equipment.time,'time',return_value=1180),server.connect() as db:
            self.assertEqual(equipment.action(db,1,dict(action='shield',revision=1))['shield']['readyAt'],1360)

if __name__=='__main__':unittest.main()
