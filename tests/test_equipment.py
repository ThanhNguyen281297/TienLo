"""Equipment migration, bounded server rolls and persistent shield clocks."""
import copy
import json
import re
import struct
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
import equipment

class EquipmentTest(unittest.TestCase):
    def test_seven_shared_formations_preserve_existing_items(self):
        formations=[f for f in equipment.RULES['formations'] if not f['id'].startswith('mythic-')]
        self.assertEqual([f['id'] for f in formations],[f'formation-{i}' for i in range(7)])
        self.assertEqual([f['art'] for f in formations[:4]],[
            'Item/PhapTran/5.png','Item/PhapTran/6.png','Item/PhapTran/8.png','Item/PhapTran/7.png'])
        self.assertEqual(len({f['art'] for f in formations}),7)
        for cls in range(4):
            self.player['ap']['w']=cls
            equipment.normalize(self.player)
            for formation in formations:
                self.player['world']['equip']['phaptran']=self.make(formation['id'])
                server.valid_player(self.player)
                self.assertEqual(equipment.TEMPLATES[formation['id']]['art'],formation['art'])

    def test_five_colored_outfits_are_canonical_class_gear(self):
        styles=equipment.RULES['outfitStyles']
        self.assertEqual(len(styles),5)
        gear=[t for t in equipment.RULES['classGear'] if t['id'].startswith('outfit-')]
        self.assertEqual(len(gear),60)
        png=(server.ROOT/equipment.RULES['outfitIconAtlas']).read_bytes()
        self.assertEqual(png[:8],b'\x89PNG\r\n\x1a\n')
        self.assertEqual(png[25],6)
        width,height=struct.unpack('>II',png[16:24])
        self.assertEqual(len({tuple(t['iconRect']) for t in gear}),15)
        for item in gear:
            x,y,w,h=item['iconRect']
            self.assertTrue(x>=0 and y>=0 and w>150 and h>150 and x+w<=width and y+h<=height)
        for cls in range(4):
            for style in styles:
                matching=[g for g in gear if g['classIndex']==cls and g['outfitStyle']==style['id']]
                self.assertEqual({g['slot'] for g in matching},{'daobao','chan','giay'})
                for item in matching:
                    self.assertEqual(item['req'],0)
                    self.assertNotIn('setId',item)
        equipment.normalize(self.player)
        self.player['ap'].update(face=7,outfitStyle=styles[0]['id'])
        robe=self.make('outfit-'+styles[0]['id']+'-daobao-class-0')
        self.player['world']['equip']['daobao']=robe
        server.valid_player(self.player)
        robe['outfitStyle']=styles[1]['id']
        with self.assertRaises(ValueError):server.valid_player(self.player)

    def test_creation_face_and_color_bounds(self):
        for face in (0,11,True,1.5,'1'):
            self.player['ap']['face']=face
            with self.assertRaises(ValueError):server.valid_player(self.player)
        self.player['ap'].update(face=10,outfitStyle='unknown')
        with self.assertRaises(ValueError):server.valid_player(self.player)
        self.player['ap']['outfitStyle']='class'
        server.valid_player(self.player)

    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.location=patch.object(server,'DATABASE',Path(self.temp.name)/'test.sqlite3');self.location.start();server.init_db()
        self.player=dict(nm='Tester',ap=dict(w=0,gender='Nam'),r=0,stage=1,gold=1000,xp=0,hp=100,mp=20,x=1000,y=1100,world=dict(map='hub',bag=[],equip={},essence=1000))
        with server.connect() as db:db.execute("INSERT INTO users(id,username,password,created_at) VALUES(1,'tester','unused',0)")
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
        self.assertEqual(len(equipment.RULES['combatSlots']),4)
        self.assertEqual(len(equipment.RULES['slots']),10)
        self.assertEqual(len(equipment.RULES['trails']),6)
        self.assertEqual([r['realm'] for r in equipment.RULES['realmEffects']],list(range(3,15)))
        for aura in equipment.RULES['realmEffects']:self.assertIn(aura['art'],exact)
        self.assertEqual([t['realm'] for t in equipment.RULES['realmTitles']],list(range(1,15)))
        for title in equipment.RULES['realmTitles']:self.assertIn(title['art'],exact)

    def test_v4_adds_empty_cosmetic_slot_preserving_items_and_rolls(self):
        equipment.normalize(self.player)
        belt=self.make('chan-2-class-0');belt.pop('art')
        back=self.make('back-class-1');back['affixes']=[dict(key=r['key'],value=r['max']) for r in equipment.RULES['offense'][:5]]
        self.player['world'].update(equipmentVersion=4,equip={'chan':belt,'phapbao':back})
        original=copy.deepcopy(back);equipment.normalize(self.player)
        self.assertEqual(self.player['world']['equip']['phapbao'],original)
        self.assertEqual(belt['art'],'Item/Chan/dai-v2.png')
        self.assertIsNone(self.player['world']['equip']['dichuyen'])
        for cls in range(4):
            self.player['ap']['w']=cls;self.player['world']['equip']={'dichuyen':self.make('footstep-6')}
            server.valid_player(self.player)
        self.assertFalse(equipment.normalize(self.player))
    def test_twenty_cosmetic_masks_require_gender_and_allow_every_class(self):
        self.assertEqual(len(equipment.RULES['masks']),20)
        for gender in ('Nam','Nu'):
            masks=[m for m in equipment.RULES['masks'] if m['gender']==gender]
            self.assertEqual([m['variant'] for m in masks],list(range(1,11)))
            for meta in masks:
                self.assertEqual(meta['art'],f"Item/MatNa/{gender}/{meta['variant']}.png")
                self.assertFalse(set(meta)&set(equipment.STAT_KEYS))
                for cls in range(4):
                    p=copy.deepcopy(self.player);p['ap'].update(w=cls,gender=gender)
                    p['world']['equip']['matna']=self.make(meta['id'])
                    server.valid_player(p)
                    self.assertEqual(equipment.bonuses(p),{})
                    p['ap']['gender']='Nu' if gender=='Nam' else 'Nam'
                    with self.assertRaisesRegex(ValueError,'giới tính'):server.valid_player(p)
        # Owning another gender's mask is allowed; altering its catalog gender isn't.
        self.player['world']['bag']=[self.make('mask-nu-1')]
        server.valid_player(self.player)
        self.player['world']['bag'][0]['gender']='Nam'
        with self.assertRaises(ValueError):server.valid_player(self.player)
    def test_v5_adds_empty_mask_without_changing_gear_or_currency(self):
        equipment.normalize(self.player)
        self.player['world']['equip']['dichuyen']=self.make('footstep-6')
        self.player['world']['bag']=[self.make('back-class-1')]
        self.player['world']['equip'].pop('matna')
        self.player['world'].update(equipmentVersion=5,riftShards=7)
        expected=copy.deepcopy(self.player)
        expected['world']['equip']['matna']=None
        expected['world']['equipmentVersion']=6
        self.assertTrue(equipment.normalize(self.player))
        self.assertEqual(self.player,expected)
        self.assertFalse(equipment.normalize(self.player))
    def test_public_nginx_allows_current_asset_roots(self):
        config=(server.ROOT/'deploy/nginx.conf').read_text(encoding='utf-8')
        match=re.search(r'location ~ (\^/\([^\n]+\)/)',config)
        self.assertIsNotNone(match)
        for root in ('js','css','Character','Map','Item','Skill'):
            self.assertRegex('/'+root+'/example.png',match[1])
    def test_v2_asset_move_preserves_reforged_lines_and_enhancement(self):
        equipment.normalize(self.player,server.collection_item)
        self.player['world']['equip']['phapbao']=self.make('back-class-0')
        item=self.player['world']['equip']['phapbao'];item['enhance']=15
        item['affixes']=[dict(key=r['key'],value=r['max']) for r in equipment.RULES['offense'][-5:]]
        original=copy.deepcopy(item);item['art']='Item/PhapBao/Class/Kiem.png'
        self.player['world']['equipmentVersion']=2
        self.assertTrue(equipment.normalize(self.player,server.collection_item))
        self.assertEqual(item,original)
        self.assertEqual(self.player['world']['equipmentVersion'],equipment.RULES['version'])
        self.assertFalse(equipment.normalize(self.player,server.collection_item))
    def test_migrate_old_collection_ring_gem_and_back_without_losing_items(self):
        old=copy.deepcopy(self.player);old['ap']['w']=3
        old['world']['equip']={
            'gioi':dict(id='rift-phong-gioi-10',setId='phong',slot='gioi',uid='old-ring',rarity='huyen',atk=8,enhance=13),
            'ngoc':dict(id='thach-ngoc',slot='ngoc',uid='old-gem',rarity='pham',mp=15,skill=.03,enhance=9),
            'phapbao':dict(id='ho-tam-kinh',slot='phapbao',uid='old-back',rarity='huyen',armor=3,enhance=15)}
        old['world']['bag']=[dict(id='moc-kiem',slot='vukhi',name='Sword',uid='sword',rarity='pham',atk=3)]
        self.insert(old);server.init_db();p=self.saved();equip=p['world']['equip']
        self.assertEqual((equip['chan']['id'],equip['chan']['uid'],equip['chan']['enhance']),('chan-1-class-3','old-ring',13))
        self.assertIsNone(equip['gioi']);self.assertEqual(equipment.capacity(p['world']),30)
        self.assertEqual((equip['ngoc']['id'],equip['ngoc']['enhance']),('shield-1',9))
        self.assertEqual((equip['phapbao']['id'],equip['phapbao']['enhance']),('back-class-3',15))
        self.assertIsNone(equip['phaptran']);self.assertEqual([i['uid'] for i in p['world']['bag']],[i['uid'] for i in old['world']['bag']])
        server.valid_player(p)
        with server.connect() as db:
            self.assertEqual(json.loads(db.execute('SELECT player FROM equipment_migration_backup').fetchone()[0]),old)
            self.assertEqual(db.execute('SELECT revision FROM characters').fetchone()[0],2)
        server.init_db();self.assertEqual(self.saved(),p)
    def test_ring_capacity_and_shared_class_equipment(self):
        equipment.normalize(self.player,server.collection_item)
        p=self.player;p['world']['equip']['gioi']=self.make('dong-gioi')
        self.assertEqual(equipment.capacity(p['world']),40)
        p['world']['bag']=[dict(self.make('moc-kiem-class-0'),uid=str(i)) for i in range(40)]
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
    def test_new_character_has_no_bag_items_or_equipped_gear(self):
        equipment.normalize(self.player)
        self.assertEqual(self.player['world']['bag'],[])
        self.assertTrue(all(i is None for i in self.player['world']['equip'].values()))
        self.insert();server.init_db();self.assertEqual(self.saved()['world']['bag'],[])
        self.assertTrue(all(i is None for i in self.saved()['world']['equip'].values()))
    def test_left_gear_requires_its_class_and_has_canonical_stats(self):
        equipment.normalize(self.player)
        for cls in range(4):
            self.player['ap']['w']=cls
            for meta in equipment.RULES['classGear']:
                self.player['world']['equip']={k:None for k in equipment.RULES['slots']}
                self.player['world']['equip'][meta['slot']]=self.make(meta['id'])
                if meta['classIndex']==cls:server.valid_player(self.player)
                else:
                    with self.assertRaises(ValueError):server.valid_player(self.player)
        self.player['ap']['w']=0;self.player['world']['equip']={k:None for k in equipment.RULES['slots']}
        self.player['world']['bag']=[self.make('moc-kiem-class-0')];self.player['world']['bag'][0]['atk']=999
        with self.assertRaises(ValueError):server.valid_player(self.player)
    def test_retired_shards_and_pending_item_are_migrated_once(self):
        self.player['world'].update(equipmentVersion=3,riftShards=7,riftFocus='kim',riftPendingItem='rift-kim-ngoc-10')
        self.insert();server.init_db();p=self.saved();self.assertEqual(p['gold'],1140)
        self.assertEqual(p['world']['bag'][0]['id'],'shield-6')
        self.assertFalse(any(k in p['world'] for k in ('riftShards','riftFocus','riftPendingItem')))
        server.init_db();self.assertEqual(self.saved(),p)
    def test_right_slots_never_gain_enhancement_stats(self):
        equipment.normalize(self.player)
        for item_id in ('back-class-0','shield-1','formation-0','dong-gioi'):
            item=self.make(item_id);self.player['world']['equip'][item['slot']]=item
        before=(server.player_attack(self.player),server.player_max_hp(self.player))
        for item in self.player['world']['equip'].values():
            if item:item['enhance']=15
        self.assertEqual((server.player_attack(self.player),server.player_max_hp(self.player)),before)
    def test_collection_reforge_survives_id_migration(self):
        old=self.make('shield-6','old-shield');old.update(id='rift-kim-ngoc-10',slot='ngoc',setId='kim',source='rift')
        old['affixes']=[dict(key=r['key'],value=r['max']) for r in equipment.RULES['defense'][:5]]
        self.player['world'].update(equipmentVersion=3,equip={'ngoc':old})
        self.insert()
        with server.connect() as db:db.execute('INSERT INTO equipment_rolls VALUES(?,?,?,?)',(1,old['uid'],old['id'],json.dumps(old['affixes'])))
        server.init_db();p=self.saved();self.assertEqual(p['world']['equip']['ngoc']['id'],'shield-6')
        self.assertEqual(p['world']['equip']['ngoc']['affixes'],old['affixes'])
        with server.connect() as db:equipment.validate(p,db,1)
    def test_reforge_transaction_replay_and_tamper_protection(self):
        equipment.normalize(self.player,server.collection_item);self.player['world']['equip']['phapbao']=self.make('back-class-0');self.insert()
        uid=self.player['world']['equip']['phapbao']['uid']
        request=dict(action='reforge',uid=uid,opId='operation-1',revision=1)
        with server.connect() as db:result=equipment.action(db,1,request)
        p=result['character']['player'];self.assertEqual((p['gold'],p['world']['essence']),(940,1000))
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
            self.assertEqual((state['activeUntil'],state['readyAt']),(1020,1090))
            with self.assertRaises(ValueError):equipment.action(db,1,dict(action='shield',revision=1))
        server.init_db()
        with patch.object(equipment.time,'time',return_value=1010),server.connect() as db:
            self.assertEqual(equipment.shield_state(db,1,self.player)['activeUntil'],1020)
            other=copy.deepcopy(self.player);other['world']['equip']['ngoc']=self.make('shield-2')
            self.assertEqual(equipment.shield_state(db,1,other)['activeUntil'],0)
            self.assertEqual(equipment.shield_state(db,1,other)['readyAt'],1090)
        with patch.object(equipment.time,'time',return_value=1020),server.connect() as db:
            self.assertEqual(equipment.shield_state(db,1,self.player)['activeUntil'],0)
            with self.assertRaises(ValueError):equipment.action(db,1,dict(action='shield',revision=1))
        with patch.object(equipment.time,'time',return_value=1089.99),server.connect() as db:
            with self.assertRaises(ValueError):equipment.action(db,1,dict(action='shield',revision=1))
        with patch.object(equipment.time,'time',return_value=1090),server.connect() as db:
            state=equipment.action(db,1,dict(action='shield',revision=1))['shield']
            self.assertEqual((state['activeUntil'],state['readyAt']),(1110,1180))
            equipment.action(db,1,dict(action='shield_end'))
            self.assertEqual(equipment.shield_state(db,1,self.player)['activeUntil'],0)
            self.assertEqual(equipment.shield_state(db,1,self.player)['readyAt'],1180)

if __name__=='__main__':unittest.main()
