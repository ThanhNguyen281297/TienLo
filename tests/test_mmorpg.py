"""Regressions for fixed-level maps, atomic forge costs and automatic loot delivery."""
import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server,equipment,expeditions,overworld,forging

class MMORPGTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old=server.DATABASE;server.DATABASE=Path(self.temp.name)/'game.sqlite3';server.init_db();self.db=server.connect()
        self.db.execute("INSERT INTO users(id,username,password,created_at) VALUES(1,'hero','unused',0)")
        self.p=dict(nm='Hero',ap=dict(w=0,gender='Nam'),r=0,stage=1,hp=100,mp=20,xp=0,gold=3000,level=80,levelXp=0,x=1200,y=1100,world=dict(map='hub',bag=[],equip={},essence=50000))
        equipment.normalize(self.p);server.progression.normalize(self.p)
        self.p['world']['equip']['vukhi']=dict(equipment.TEMPLATES['moc-kiem-class-0'],uid='sword')
        for iid in equipment.MATERIALS:self.p['world']['bag'].append(dict(equipment.MATERIALS[iid],uid=iid,qty=1000))
        self.save(self.p);self.db.commit()
    def tearDown(self):self.db.close();server.DATABASE=self.old;self.temp.cleanup()
    def save(self,p,revision=1):self.db.execute('INSERT OR REPLACE INTO characters VALUES(?,?,?,?,?)',(1,'hero-character',json.dumps(p),revision,0))
    def get(self):return json.loads(self.db.execute('SELECT player FROM characters WHERE user_id=1').fetchone()[0])
    def forge(self,**kwargs):
        revision=self.db.execute('SELECT revision FROM characters WHERE user_id=1').fetchone()[0]
        return forging.action(self.db,1,dict(action='enhance',uid='sword',materials={iid:iid for iid in equipment.MATERIALS},opId='forge-operation-'+str(revision),revision=revision,**kwargs))
    def test_regions_have_48_monsters_and_monotonic_fixed_levels(self):
        self.assertEqual(len(overworld.MAPS),6);last=0
        for m in overworld.MAPS.values():
            mobs=overworld.room(m['id'])['mobs'];self.assertEqual(len(mobs),48)
            self.assertEqual(len({i['camp'] for i in mobs}),6)
            self.assertGreater(min(i['level'] for i in mobs),last);last=max(i['level'] for i in mobs)
            for i in mobs:self.assertTrue(overworld.inside(i['x'],i['y']));self.assertFalse(overworld.safe(i['x'],i['y']))
        self.assertEqual(server.room_for(dict(map='field-meadow',trainingRealm=14)),'field-meadow:0')
        self.assertEqual(server.room_for(dict(map='sword',trainingRealm=14)),'sword:0')
    def test_shared_manifest_matches_browser(self):
        runtime=(server.ROOT/'js/35r-overworld-rules.js').read_text(encoding='utf-8').split('window.overworldRules=',1)[1].strip().removesuffix(';')
        self.assertEqual(json.loads(runtime),overworld.RULES)
    def test_forge_all_15_levels_debits_exact_materials_not_gold(self):
        stone=refined=essence=0
        for n in range(1,16):
            cost=forging.cost(n);stone+=cost['stone'];refined+=cost['refined'];essence+=cost['essence']
            result=self.forge();self.assertEqual(result['character']['player']['world']['equip']['vukhi']['enhance'],n)
        p=self.get();bag={i['id']:i['qty'] for i in p['world']['bag']}
        self.assertEqual((bag['cuong-hoa-thach'],bag['tinh-luyen-thach'],p['world']['essence'],p['gold']),(1000-stone,1000-refined,50000-essence,3000))
        with self.assertRaises(ValueError):self.forge()
    def test_missing_inserted_materials_and_insufficient_essence_do_not_charge(self):
        with self.assertRaises(ValueError):forging.action(self.db,1,dict(action='enhance',uid='sword',materials={},opId='missing-material',revision=1))
        p=self.get();self.assertEqual(p,self.p);p['world']['essence']=0;self.save(p)
        with self.assertRaises(ValueError):self.forge()
        self.assertEqual(self.get(),p)
    def test_npc_distance_map_class_shared_slot_and_cap_guards(self):
        for changes in ({'x':1000},{'world':{**self.p['world'],'map':'field-meadow'}}):
            p=copy.deepcopy(self.p);p.update(changes);self.save(p)
            with self.assertRaises(ValueError):self.forge()
        p=copy.deepcopy(self.p);p['world']['equip']['vukhi']=dict(equipment.TEMPLATES['moc-kiem-class-1'],uid='sword');self.save(p)
        with self.assertRaises(ValueError):self.forge()
    def test_client_free_flag_does_not_grant_gm_and_replay_no_double_spending(self):
        a=self.forge(free=True);p=a['character']['player'];self.assertEqual(p['world']['essence'],50000-forging.cost(1)['essence'])
        before=copy.deepcopy(p);r=forging.action(self.db,1,dict(action='enhance',uid='sword',opId='forge-operation-1',revision=1));self.assertEqual(r['character']['player'],before)
    def test_real_gm_free_still_requires_npc(self):
        r=forging.action(self.db,1,dict(action='enhance',uid='sword',free=True,opId='gm-free-forge',revision=1),True)
        self.assertEqual(r['character']['player']['world']['essence'],50000)
        self.assertEqual(r['character']['player']['world']['bag'],self.p['world']['bag'])
    def test_drop_options_persist_and_cannot_be_forged_or_removed(self):
        self.db.execute("INSERT INTO expedition_drops VALUES('drop-one',1,'field-meadow','train-10-daobao-class-0',0,NULL)")
        r=expeditions.claim(self.db,1,dict(revision=1));p=r['character']['player'];item=p['world']['bag'][-1]
        self.assertTrue(1<=len(item['options'])<=3);equipment.validate(p,self.db,1)
        self.assertEqual(expeditions.claim(self.db,1,dict(revision=2))['claimed'],[])
        item['options'][0]['value']=999
        with self.assertRaises(ValueError):equipment.validate(p,self.db,1)
        item['options']=[]
        with self.assertRaises(ValueError):equipment.validate(p,self.db,1)
    def test_full_bag_preserves_gear_but_stacks_material_without_extra_slot(self):
        p=copy.deepcopy(self.p);p['world']['bag'] += [dict(equipment.TEMPLATES['train-10-giay-class-0'],uid='fill-'+str(i)) for i in range(28)];self.save(p)
        for uid,iid in [('gear','train-10-daobao-class-0'),('stone','cuong-hoa-thach')]:self.db.execute('INSERT INTO expedition_drops VALUES(?,1,?,?,0,NULL)',(uid,'field-meadow',iid))
        r=expeditions.claim(self.db,1,dict(revision=1));self.assertEqual([i['id'] for i in r['claimed']],['cuong-hoa-thach']);self.assertEqual(r['pending'],1)
        p=r['character']['player'];p['world']['bag'].pop();self.save(p,2)
        r=expeditions.claim(self.db,1,dict(revision=2));self.assertEqual(len(r['claimed']),1);self.assertEqual(r['pending'],0)
    def test_outdoor_drops_scale_armor_level_and_include_materials(self):
        with patch('expeditions.secrets.randbelow',return_value=0):
            for n in (1,25,45,70):expeditions.queue_farm_drop(self.db,1,dict(map='field-meadow',level=n),str(n))
        ids=[r[0] for r in self.db.execute('SELECT item_id FROM expedition_drops')]
        self.assertTrue(any(i.startswith('exp-70-') for i in ids));self.assertIn('cuong-hoa-thach',ids);self.assertIn('tinh-luyen-thach',ids)
        self.assertTrue(all(equipment.TEMPLATES[i].get('slot') in ('daobao','chan','giay',None) for i in ids))
    def test_full_bag_old_equipment_backlog_does_not_block_material_stacking(self):
        p=copy.deepcopy(self.p);p['world']['bag'] += [dict(equipment.TEMPLATES['train-10-giay-class-0'],uid='fill-'+str(i)) for i in range(28)];self.save(p)
        for n in range(65):self.db.execute('INSERT INTO expedition_drops VALUES(?,1,?,?,0,NULL)',('gear-'+str(n),'field-meadow','train-10-daobao-class-0'))
        self.db.execute("INSERT INTO expedition_drops VALUES('new-stone',1,'field-meadow','cuong-hoa-thach',100,NULL)")
        result=expeditions.claim(self.db,1,dict(revision=1));self.assertEqual([i['id'] for i in result['claimed']],['cuong-hoa-thach']);self.assertEqual(result['pending'],65)

if __name__=='__main__':unittest.main()
