import json, re, unittest
from pathlib import Path
import sect_potential, server

ROOT = Path(__file__).resolve().parents[1]


def player(w, **attrs):
    return {'ap': {'w': w, 'gender': 'Nam'}, 'r': 1, 'stage': 1, 'nm': 't',
            'world': {'attrs': {'luc': 0, 'the': 0, 'nhanh': 0, 'linh': 0, **attrs}, 'equip': {}}}


class SectPotentialTest(unittest.TestCase):
    def test_client_copy_matches_rules(self):
        source = (ROOT / 'js/25e-sect-potential.js').read_text(encoding='utf-8')
        data = json.loads(re.search(r'const DATA=(\{.*?\});\n', source).group(1))
        self.assertEqual(data, sect_potential.RULES)

    def test_each_sect_has_a_distinct_strength(self):
        sects = sect_potential.RULES['sects']
        self.assertEqual(len(sects), 4)
        crit = [s['stats']['critCap'] for s in sects]; hp = [s['stats']['hpPercent'] for s in sects]; skill = [s['stats']['skill'] for s in sects]
        self.assertEqual(crit.index(max(crit)), 0)   # Kiếm Tông: bạo
        self.assertEqual(skill.index(max(skill)), 1)  # Minh Nguyệt: skill
        self.assertEqual(hp.index(max(hp)), 2)        # Lôi Thương: máu
        for s in sects:
            self.assertEqual(set(s['suggest']), {'luc', 'the', 'nhanh', 'linh'})

    def test_server_formulas_follow_sect(self):
        self.assertGreater(server.player_max_hp(player(2, the=50)), server.player_max_hp(player(0, the=50)))
        self.assertGreater(server.player_attack(player(0, luc=50)), server.player_attack(player(1, luc=50)))
        self.assertAlmostEqual(sect_potential.crit_chance(player(0, nhanh=10)), .06 + 10 * .008)
        self.assertEqual(sect_potential.crit_chance(player(0, nhanh=1000)), .5)
        self.assertEqual(sect_potential.crit_chance(player(2, nhanh=1000)), .35)
        self.assertEqual(sect_potential.crit_chance({'world': {}}), 0)


if __name__ == '__main__':
    unittest.main()
