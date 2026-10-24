"""Chính – Tà battleground: windows, faction balance, PvP kills, banners, bases and rewards."""
import json
import sys
import tempfile
import time
import unittest
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server, battle, engagement, equipment, adventure, pvp


def at(text):
    return datetime.strptime(text, '%Y-%m-%d %H:%M').replace(tzinfo=engagement.VN).timestamp()


class BattleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'; server.init_db(); self.db = server.connect()
        self.players = {}
        for uid in (1, 2, 3):
            self.db.execute('INSERT INTO users(id,username,password,created_at) VALUES(?,?,?,0)', (uid, f'p{uid}', 'x'))
            p = dict(nm=f'Hero{uid}', ap=dict(w=uid % 4, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=0, level=30, levelXp=0,
                     x=1000, y=1100, world=dict(map='hub', bag=[], equip={}, essence=0))
            equipment.normalize(p); server.progression.normalize(p); self.players[uid] = p
            self.db.execute('INSERT INTO characters VALUES(?,?,?,?,?)', (uid, f'c{uid}', json.dumps(p), 1, 0))
        self.db.commit(); battle.STATE.update(battle=None, last=None)
        self.peer = dict(map='hub')

    def tearDown(self):
        battle.STATE.update(battle=None, last=None); self.db.close(); server.DATABASE = self.old; self.temp.cleanup()

    def join(self, uid, now):
        return battle.join(uid, self.players[uid], self.peer, server.player_max_hp, server.player_attack, now)

    def test_windows_and_join_rules(self):
        self.assertIsNone(battle.window(at('2026-10-24 12:29')))
        self.assertIsNotNone(battle.window(at('2026-10-24 21:05')))
        with self.assertRaises(ValueError): self.join(1, at('2026-10-24 13:00'))
        now = at('2026-10-24 21:01')
        self.join(1, now); self.join(2, now); self.join(3, now)
        teams = [f['team'] for f in battle.STATE['battle']['arena']['fighters'].values()]
        self.assertEqual(sorted(teams.count(t) for t in ('chinh', 'ta')), [1, 2])
        with self.assertRaises(ValueError): battle.join(9, self.players[1], dict(map='field-meadow'), server.player_max_hp, server.player_attack, now)
        battle.STATE['battle'] = None
        with self.assertRaises(ValueError): self.join(1, at('2026-10-24 21:13'))   # join closes 3 minutes before the end

    def test_kill_scoring_base_protection_and_respawn(self):
        now = at('2026-10-24 21:02')
        self.join(1, now); self.join(2, now)
        b = battle.STATE['battle']; f1, f2 = b['arena']['fighters'][1], b['arena']['fighters'][2]
        self.assertNotEqual(f1['team'], f2['team'])
        # In the enemy's base nobody can hurt you.
        f1.update(x=f2['x'] + 20, y=f2['y']); f1['attack'] = 10 ** 6
        pvp.queue(b['arena'], f1, [dict(id='hit-in-base', slot=0, x=f2['x'], y=f2['y'])], now)
        pvp.resolve(b['arena'], now + 1, battle.hostile, battle.in_base)
        self.assertEqual(f2['hp'], f2['maxHp'])
        f2.update(x=1000, y=1100); f1.update(x=1030, y=1100); f1['ready'] = [0] * 5
        pvp.queue(b['arena'], f1, [dict(id='hit-open', slot=0, x=1000, y=1100)], now + 2)
        for killer, victim in pvp.resolve(b['arena'], now + 3, battle.hostile, battle.in_base): battle.on_kill(b, killer, victim, now + 3)
        self.assertLessEqual(f2['hp'], 0); self.assertEqual(f1['kills'], 1); self.assertEqual(f1['score'], 10)
        self.assertEqual(round(b['teams'][f1['team']]['score']), 5)
        battle.advance(b, now + 3 + battle.RESPAWN + .1)
        self.assertEqual(f2['hp'], f2['maxHp']); self.assertEqual((f2['x'], f2['y']), battle.TEAMS[f2['team']]['base'])

    def test_banner_capture_scores_and_finish_mails_rewards(self):
        start = at('2026-10-24 21:00'); self.join(1, start + 30); self.join(2, start + 30)
        b = battle.STATE['battle']; f1 = b['arena']['fighters'][1]
        f1.update(x=1000, y=830); b['tick'] = start + 40
        for i in range(1, 25): battle.advance(b, start + 40 + i * .5)
        flag = next(f for f in b['flags'] if f['id'] == 'bac')
        self.assertEqual(flag['owner'], f1['team'])
        battle.advance(b, start + 70); battle.advance(b, start + 71)
        self.assertGreater(b['teams'][f1['team']]['score'], 0); self.assertGreaterEqual(f1['score'], 5)
        result = battle.finish(self.db, b['end'] + 1)
        self.assertEqual(result['winner'], f1['team'])
        mails = self.db.execute('SELECT user_id,title,payload FROM community_rewards').fetchall()
        self.assertEqual([m[0] for m in mails], [1])
        self.assertIn('Thắng', mails[0][1]); self.assertGreaterEqual(json.loads(mails[0][2])['fragments'], 19)
        self.assertEqual(adventure.count(self.db, 1, 'battleWins'), 1)
        self.assertIsNone(battle.finish(self.db, b['end'] + 2), 'rewards are mailed once')

    def test_world_step_moves_with_server_speed(self):
        now = at('2026-10-24 21:02'); self.join(1, now)
        f = battle.STATE['battle']['arena']['fighters'][1]; start = (f['x'], f['y'])
        view, x, y = battle.step(1, dict(map='battle', x=1500, y=1100, duelAttacks=[]), now + .2)
        self.assertLess(abs(x - start[0]), 60); self.assertEqual(view['me']['id'], 1)


if __name__ == '__main__':
    unittest.main()
