import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import progression
import server


class CharacterProgressionTest(unittest.TestCase):
    def player(self):
        return dict(nm='Tester',ap=dict(w=0,gender='Nam'),r=0,stage=1,gold=0,xp=0,hp=100,mp=20,x=1000,y=1100,world=dict(map='hub',bag=[],equip={}))

    def test_curve_strictly_increases(self):
        values=[progression.required(n) for n in range(1,201)]
        self.assertEqual(values[:3],[100,157,238])
        self.assertTrue(all(b>a for a,b in zip(values,values[1:])))

    def test_legacy_preserves_cultivation(self):
        p=self.player();p.update(r=4,stage=7,xp=321)
        progression.normalize(p)
        self.assertEqual((p['level'],p['levelXp'],p['r'],p['stage'],p['xp']),(47,0,4,7,321))
        p['r']=5;progression.normalize(p)
        self.assertEqual(p['level'],47)

    def test_invalid_levels_and_exp(self):
        for key,value in [('level',0),('level',201),('level',True),('level',2.5),('level','2'),('levelXp',-1),('levelXp',100),('levelXp',float('nan')),('levelXp',True)]:
            p=self.player();p.update(level=1,levelXp=0);p[key]=value
            with self.subTest(key=key,value=value),self.assertRaises(ValueError):server.valid_player(p)
        p=self.player();p.update(level=200,levelXp=1)
        with self.assertRaises(ValueError):server.valid_player(p)

    def test_stats_and_independent_realm(self):
        p=self.player();p.update(level=1,levelXp=0);a=server.player_attack(p);hp=server.player_max_hp(p)
        p.update(level=10,levelXp=400)
        self.assertAlmostEqual(server.player_attack(p)-a,7.2);self.assertEqual(server.player_max_hp(p)-hp,54)
        p.update(r=1,stage=3);server.valid_player(p)
        self.assertEqual((p['level'],p['levelXp']),(10,400))
        self.assertAlmostEqual(server.player_attack(p),8+12*1.3+9*.8)

    def test_attribute_migration_and_once_only_level_grants(self):
        p=self.player();p.update(level=20,levelXp=0)
        p['world'].update(attrs=dict(luc=8,the=2,nhanh=0,linh=0),attrPoints=5)
        progression.normalize(p)
        self.assertEqual(p['world']['attrPoints'],47)
        original=copy.deepcopy(p);progression.normalize(p);self.assertEqual(p,original)
        p['world']['attrPoints']-=4;p['world']['attrs']['luc']+=4
        p['level']=23;progression.normalize(p)
        self.assertEqual(p['world']['attrPoints'],52)
        p.update(r=10,stage=10);progression.normalize(p)
        self.assertEqual(p['world']['attrPoints'],52)
        p['world'].pop('attributeLevel');p['world']['attrPoints']=200
        progression.normalize(p);self.assertEqual(p['world']['attrPoints'],200)

    def test_skill_milestones_ignore_cultivation_and_old_learn_flags(self):
        p=self.player();p.update(r=14,stage=10,level=1,levelXp=0)
        for rank in (1,9,10,19,20,29,30,39,40,200):
            p['level']=rank;p['world']['learnedSkills']=[True]*4;progression.normalize(p)
            self.assertEqual(p['world']['learnedSkills'],[rank>=n for n in (10,20,30,40)])

    def test_attribute_payload_validation(self):
        for field,value in [('attrPoints',-1),('attrPoints',True),('attrPoints',1.5),('attributeLevel',0),('attributeLevel',2),('attributeLevel',True),('attrs',dict(luc=1001)),('attrs',dict(fake=1))]:
            p=self.player();p.update(level=1,levelXp=0);p['world'][field]=value
            with self.subTest(field=field,value=value),self.assertRaises(ValueError):server.valid_player(p)


if __name__=='__main__':unittest.main()
