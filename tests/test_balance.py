"""Balance guards: field monster curves, rare drops and Linh Nguyên prices."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import economy, expeditions, forging, overworld


def average_build(level):
    """Same model the curves were tuned with: half the attribute points in Lực, 30% in Thể."""
    points = 3 * (level - 1)
    weapon = 3 if level < 10 else 8 if level < 25 else 15 if level < 45 else 28
    gear_hp = 50 if level < 10 else 140 if level < 25 else 275 if level < 45 else 400
    armor = 3 if level < 10 else 7 if level < 25 else 12 if level < 45 else 19
    enhance = 1 + .05 * min(10, level // 8)
    attack = 8 + level * 1.3 + (level - 1) * .8 + points * .5 * 2 + weapon * enhance
    hp = 100 + level * 6 + (level - 1) * 6 + points * .3 * 15 + gear_hp * enhance
    return attack, hp, armor * enhance


class BalanceTests(unittest.TestCase):
    def test_same_level_mob_takes_three_to_five_seconds(self):
        for level in (1, 10, 25, 45, 60, 80, 100):
            attack, hp, armor = average_build(level)
            ttk = overworld.mob_hp(level) / (3.4 * attack)
            self.assertTrue(2.5 <= ttk <= 5, (level, ttk))

    def test_a_pack_of_three_is_dangerous_but_survivable(self):
        for level in (5, 20, 45, 80):
            attack, hp, armor = average_build(level)
            per_mob = max(1, 7.25 * overworld.mob_attack(level) - level / 12 * 1.5 - armor)
            self.assertTrue(12 <= hp / (3 * per_mob) <= 45, level)

    def test_rift_mobs_follow_the_field_curve(self):
        mobs = expeditions.room('rift-fire', 0)['mobs']
        normal = next(m for m in mobs if not m['boss']); boss = next(m for m in mobs if m['boss'])
        self.assertEqual(normal['hp'], round(overworld.mob_hp(normal['level']) * .8))
        self.assertGreater(boss['hp'], normal['hp'] * 5)

    def test_drops_are_rare_and_linh_nguyen_is_expensive(self):
        self.assertLessEqual(expeditions.GEAR_PERMIL, 30)
        self.assertLessEqual(expeditions.STONE_PERMIL, 80)
        self.assertLessEqual(expeditions.REFINED_PERMIL, 30)
        self.assertEqual(forging.cost(10)['essence'], 30 + 100 * 15)
        self.assertLess(economy.ESSENCE_PER_SEC, 1)


if __name__ == '__main__':
    unittest.main()
