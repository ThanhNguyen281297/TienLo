"""Each activity pays its own shard kind."""
import sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import shards, raid, battle
from test_premium_shards_mail import Base


class ShardSourceTests(Base):
    def test_every_kind_has_exactly_one_activity(self):
        self.assertEqual(sorted(shards.SOURCE.values()), sorted(shards.KINDS))
        for meta in shards.KINDS.values():
            self.assertTrue(meta['source'])

    def test_rift_pays_steps_and_fields_pay_beast_souls(self):
        boss = shards.on_kill(self.db, 1, dict(map='rift-wood', boss=True, level=10))
        self.assertEqual(set(boss), {'buocchan'})
        self.assertGreaterEqual(boss['buocchan'], 3)
        kinds = set()
        for _ in range(400):
            kinds |= set(shards.on_kill(self.db, 1, dict(map='rift-tide', level=25)))
            kinds |= set(shards.on_kill(self.db, 1, dict(map='field-frost', level=40, elite=True)))
        self.assertEqual(kinds, {'buocchan', 'thuhon'})
        self.assertEqual(shards.on_kill(self.db, 1, dict(map='rift-wood', boss=True, raid=True)), {})

    def test_event_rewards(self):
        self.assertEqual(set(shards.battle_reward(200, 1, True)), {'hothuan'})
        self.assertGreater(shards.battle_reward(200, 1, True)['hothuan'], shards.battle_reward(200, 9, False)['hothuan'])
        self.assertEqual(raid.chest(30, 0)['shards'], {'phapbao': 7})
        self.assertEqual(shards.tower_reward(10), {'phaptran': 4})
        self.assertEqual(shards.quest_reward('daily'), {'matna': 2})
        self.assertEqual(shards.quest_reward('main'), {'matna': 1})
        self.assertEqual(shards.outpost_reward(), {'nhan': 6})
        self.assertEqual(shards.boss_reward(1), {'thanbinh': 10})
        self.assertEqual(shards.boss_reward(50), {'thanbinh': 2})

    def test_battle_mail_carries_shield_shards(self):
        import engagement
        engagement.mail(self.db, 1, 'Chiến trường', dict(gold=1, shards=shards.battle_reward(80, 2, True)), 'b1')
        payload = self.db.execute("SELECT payload FROM community_rewards WHERE id='b1'").fetchone()[0]
        self.assertIn('hothuan', payload)
        self.assertIn('Hộ Thuẫn', engagement.describe(dict(shards=shards.battle_reward(80, 2, True))))


if __name__ == '__main__':
    unittest.main()
