"""Tông môn hall (contribution shop, guild boss) and Động phủ (garden, spirit beast)."""
import json, sys, time, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import cave, community, engagement, guildhall
from test_premium_shards_mail import Base


class GuildHallTests(Base):
    def join(self, uid=1, contribution=0):
        if not self.db.execute('SELECT 1 FROM guilds WHERE id=?', ('g1',)).fetchone():
            self.db.execute('INSERT INTO guilds VALUES(?,?,?,?,?)', ('g1', 'Thanh Vân', uid, 0, 0))
        self.db.execute('INSERT INTO guild_members VALUES(?,?,?,?)', (uid, 'g1', contribution, 0))

    def save(self, r, uid=1):
        self.db.execute('UPDATE characters SET player=?,revision=? WHERE user_id=?', (json.dumps(r['character']['player']), r['character']['revision'], uid))

    def buy(self, item, uid=1):
        return guildhall.action(self.db, uid, dict(action='buy', id=item, opId=self.op(), revision=self.rev(uid)))

    def test_no_guild(self):
        self.assertIsNone(guildhall.snapshot(self.db, 1)['guild'])
        with self.assertRaises(ValueError):
            self.buy('essence')

    def test_shop_spends_contribution_with_weekly_limit(self):
        self.join(contribution=100)
        r = self.buy('essence'); self.save(r)
        self.assertEqual(r['character']['player']['world']['essence'], 80)
        self.assertEqual(r['hall']['contribution'], 60)
        with self.assertRaises(ValueError):
            self.buy('charm')                         # 80 > 60

    def test_charm_and_seed_rewards(self):
        self.join(contribution=500)
        r = self.buy('charm'); self.save(r)
        self.assertEqual(r['character']['player']['world']['tribCharms'], 1)
        r = self.buy('seed'); self.save(r)
        self.assertEqual(cave.load(self.db, 1)['seeds']['ngocchi'], 1)
        self.assertEqual(r['hall']['contribution'], 500 - 80 - 60)

    def test_cost_and_limit_enforced(self):
        self.join(contribution=1000)
        with self.assertRaises(ValueError):
            for _ in range(6):
                self.save(self.buy('gold'))
        self.assertEqual(guildhall.bought(self.db, 1, 'gold'), 5)
        self.db.execute('UPDATE guild_members SET contribution=? WHERE user_id=1', (guildhall.SHOP['gold']['cost'] * 5 + 10,))
        with self.assertRaises(ValueError):
            self.buy('tinhluyen')                     # 90 > 10 left

    def test_boss_damage_contribution_and_kill(self):
        self.join(1); self.join(2)
        mob = guildhall.room(self.db, 'g1')['mobs'][0]
        self.assertEqual(mob['maxHp'], guildhall.boss_hp(1, 2))
        mob['hp'] -= mob['maxHp'] // 2
        guildhall.record_damage(self.db, mob, 1, mob['maxHp'] // 2)
        self.assertEqual(guildhall.balance(self.db, 1)[1], guildhall.BOSS_CONTRIB_POOL // 2)
        rest = mob['hp']; mob['hp'] = 0
        guildhall.record_damage(self.db, mob, 2, rest)
        ranked = guildhall.on_kill(self.db, mob)
        self.assertEqual(ranked, [1, 2] if mob['maxHp'] // 2 >= rest else [2, 1])
        self.assertEqual(guildhall.on_kill(self.db, mob), [])          # once
        mails = self.db.execute("SELECT COUNT(*) FROM community_rewards WHERE id LIKE 'guildboss:%'").fetchone()[0]
        self.assertEqual(mails, 2)
        view = guildhall.snapshot(self.db, 1)['boss']
        self.assertTrue(view['killed'])
        # Next week the boss is one level stronger.
        nxt = guildhall.boss_row(self.db, 'g1', time.time() + 7 * 86400)
        self.assertEqual(nxt['level'], 2)


class CaveTests(Base):
    def act(self, op, at, **args):
        r = cave.action(self.db, 1, dict(action=op, opId=self.op(), revision=self.rev(), **args), at)
        self.db.execute('UPDATE characters SET player=?,revision=? WHERE user_id=1', (json.dumps(r['character']['player']), r['character']['revision']))
        return r

    def test_plant_water_harvest(self):
        t = 1_000_000.0
        self.act('plant', t, index=0, seed='linhthao')
        with self.assertRaises(ValueError):
            self.act('harvest', t + 10, index=0)
        self.act('water', t + 10)
        with self.assertRaises(ValueError):
            self.act('water', t + 20)
        r = self.act('harvest_all', t + 3600 - 1800 + 11)
        p = r['character']['player']
        self.assertEqual(p['world']['essence'], 25)
        self.assertEqual(p['gold'], 1000 + 120)
        self.assertTrue(r['cave']['plots'][0]['empty'])

    def test_paid_and_guild_seeds(self):
        t = 2_000_000.0
        self.act('plant', t, index=0, seed='huyetsam')
        self.assertEqual(self.player()['gold'], 700)
        with self.assertRaises(ValueError):
            self.act('plant', t, index=1, seed='ngocchi')
        cave.add_seeds(self.db, 1, {'ngocchi': 1})
        self.act('plant', t, index=1, seed='ngocchi')
        r = self.act('harvest', t + 10 * 3600, index=1)
        self.assertEqual(r['character']['player']['world']['thangViDan'], 1)

    def test_beast_offline_income_and_feed(self):
        t = 3_000_000.0
        cave.store(self.db, 1, cave.load(self.db, 1, t))
        v = cave.view(self.db, 1, t + 100 * 3600)
        self.assertEqual(v['beast']['stock'], 12 * cave.beast_rate(1))         # capped at 12 h
        r = self.act('collect', t + 100 * 3600)
        self.assertEqual(r['character']['player']['gold'], 1000 + 12 * cave.beast_rate(1))
        p = self.player(); p['world']['essence'] = 500
        self.db.execute('UPDATE characters SET player=? WHERE user_id=1', (json.dumps(p),))
        r = self.act('feed', t + 100 * 3600 + 5)
        self.assertEqual(r['cave']['beast']['level'], 2)

    def test_unlock_plot(self):
        p = self.player(); p['gold'] = 5000
        self.db.execute('UPDATE characters SET player=? WHERE user_id=1', (json.dumps(p),))
        r = self.act('unlock', 1.0)
        self.assertEqual(len(r['cave']['plots']), 4)
        with self.assertRaises(ValueError):
            self.act('unlock', 2.0)               # 5000 for the fifth > 3000 left


if __name__ == '__main__':
    unittest.main()
