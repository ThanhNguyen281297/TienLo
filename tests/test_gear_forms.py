import re, sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import equipment, shards

ROOT = Path(__file__).resolve().parents[1]


class GearFormsTest(unittest.TestCase):
    def test_new_divine_weapons_and_shields(self):
        weapons = [t for t in equipment.RULES['classGear'] if t.get('source') == 'thanbinh']
        self.assertEqual(len(weapons), 8)
        self.assertEqual(sorted({t['classIndex'] for t in weapons}), [0, 1, 2, 3])
        source = (ROOT / 'js/76-gear-forms.js').read_text(encoding='utf-8')
        for t in weapons:
            self.assertTrue((ROOT / t['art']).exists(), t['art'])
            self.assertIn("'" + t['form'] + "':{name:", source)
            self.assertEqual(shards.OFFERS[t['id']]['kind'], 'thanbinh')
        self.assertFalse([t for t in equipment.RULES['shields'] if t['variant'] >= 8])   # withdrawn in v10
        self.assertTrue((ROOT / shards.KINDS['thanbinh']['icon']).exists())

    def test_retired_shields_are_removed_and_refunded(self):
        p = dict(world=dict(bag=[dict(id='shield-9', uid='a'), dict(id='shield-1', uid='b')], equip=dict(ngoc=dict(id='shield-10', uid='c'))))
        self.assertEqual(equipment.drop_retired(p), 400)
        self.assertEqual([i['id'] for i in p['world']['bag']], ['shield-1'])
        self.assertIsNone(p['world']['equip']['ngoc'])

    def test_tier_icons_exist(self):
        for cls in range(4):
            for form in ('moc', 'thiet', 'tien', 'than'):
                self.assertTrue((ROOT / f'Item/VuKhi/Forms/{cls}-{form}.png').exists())

    def test_client_rules_regenerated(self):
        text = (ROOT / 'js/24c-equipment-rules.js').read_text(encoding='utf-8')
        self.assertIn('than-binh-90-class-3', text)
        self.assertNotIn('"shield-10"', text)


if __name__ == '__main__':
    unittest.main()
