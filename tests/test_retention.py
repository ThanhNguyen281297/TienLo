"""Daily activity (Năng động), solo Ma Quật and the world boss scaling."""
import json, sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import adventure, community, engagement, raid, progression
from test_premium_shards_mail import Base


class RetentionTests(Base):
    def test_activity_points_and_chests(self):
        a = engagement.activity(self.db, 1)
        self.assertEqual(a['points'], 0)
        d = adventure.day()
        adventure.add(self.db, 1, f'daily:{d}:kills', 30)
        adventure.add(self.db, 1, f'daily:{d}:riftVisits')
        a = engagement.activity(self.db, 1)
        self.assertEqual(a['points'], 20)
        self.assertTrue(a['chests'][0]['ready'])
        r = engagement.action(self.db, 1, dict(action='activity', points=20, opId='op-activity-1', revision=self.rev()))
        self.assertIn('Rương năng động 20', r['message'])
        self.db.execute('UPDATE characters SET player=?,revision=? WHERE user_id=1', (json.dumps(r['character']['player']), r['character']['revision']))
        with self.assertRaises(ValueError):
            engagement.action(self.db, 1, dict(action='activity', points=20, opId='op-activity-2', revision=self.rev()))
        with self.assertRaises(ValueError):
            engagement.action(self.db, 1, dict(action='activity', points=40, opId='op-activity-3', revision=self.rev()))

    def test_solo_raid_chest_and_rules(self):
        self.assertEqual(raid.RULE['minParty'], 1)
        self.assertEqual(raid.chest(30, 0, solo=True)['shards'], {'phapbao': 3})
        self.assertEqual(raid.chest(30, 0)['shards'], {'phapbao': 7})

    def test_world_boss_scales_with_online_players(self):
        self.assertEqual(community.new_boss(1)['maxHp'], 12000)
        self.assertEqual(community.new_boss(5)['maxHp'], 30000)
        self.assertEqual(community.new_boss(50)['maxHp'], 90000)

    def test_early_skills(self):
        self.assertEqual(progression.SKILL_LEVELS, (2, 6, 12, 20))


if __name__ == '__main__':
    unittest.main()
