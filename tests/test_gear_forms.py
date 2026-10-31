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
        new_shields = [t for t in equipment.RULES['shields'] if t['variant'] >= 8]
        self.assertEqual([t['variant'] for t in new_shields], [8, 9, 10])
        for t in new_shields:
            self.assertTrue((ROOT / t['art']).exists())
            self.assertEqual(t['buff'], t['variant'])
            self.assertTrue((ROOT / f"Item/BuffThuan/{t['buff']}.png").exists())   # painted barrier ring
            self.assertIn(t['id'], shards.OFFERS)
        self.assertTrue((ROOT / shards.KINDS['thanbinh']['icon']).exists())

    def test_tier_icons_exist(self):
        for cls in range(4):
            for form in ('moc', 'thiet', 'tien', 'than'):
                self.assertTrue((ROOT / f'Item/VuKhi/Forms/{cls}-{form}.png').exists())

    def test_client_rules_regenerated(self):
        text = (ROOT / 'js/24c-equipment-rules.js').read_text(encoding='utf-8')
        self.assertIn('than-binh-90-class-3', text)
        self.assertIn('"shield-10"', text)


if __name__ == '__main__':
    unittest.main()
