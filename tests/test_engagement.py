"""Check-in, offline cultivation, events, achievements/titles, weekly boards, mailbox and party raid."""
import json
import sys
import tempfile
import time
import unittest
from datetime import datetime
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server, adventure, community, engagement, equipment, raid


def at(text):
    """Unix time for a Vietnam-time 'YYYY-MM-DD HH:MM'."""
    return datetime.strptime(text, '%Y-%m-%d %H:%M').replace(tzinfo=engagement.VN).timestamp()


class EngagementTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'; server.init_db(); self.db = server.connect()
        for uid in (1, 2, 3):
            self.db.execute('INSERT INTO users(id,username,password,created_at) VALUES(?,?,?,0)', (uid, f'hero{uid}', 'unused'))
            player = dict(nm=f'Hero{uid}', ap=dict(w=uid % 4, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=0, level=30, levelXp=0,
                          x=1000, y=1100, world=dict(map='hub', bag=[], equip={}, essence=0))
            equipment.normalize(player); server.progression.normalize(player)
            self.db.execute('INSERT INTO characters VALUES(?,?,?,?,?)', (uid, f'char{uid}', json.dumps(player), 1, 0))
        self.db.commit(); server.PEERS.clear(); server.ROOMS.clear(); self.ops = 0

    def tearDown(self):
        self.db.close(); server.DATABASE = self.old; self.temp.cleanup(); server.PEERS.clear(); server.ROOMS.clear()

    def player(self, uid=1):
        return json.loads(self.db.execute('SELECT player FROM characters WHERE user_id=?', (uid,)).fetchone()[0])

    def act(self, op, uid=1, stamp=None, **args):
        self.ops += 1
        rev = self.db.execute('SELECT revision FROM characters WHERE user_id=?', (uid,)).fetchone()[0]
        return engagement.action(self.db, uid, dict(action=op, opId=f'op-{self.ops:06d}', revision=rev, **args), stamp)

    def test_checkin_cycle_resets_after_a_missed_day(self):
        first = self.act('checkin', stamp=at('2026-10-19 09:00'))
        self.assertEqual(first['engagement']['checkin']['streak'], 1); self.assertEqual(self.player()['gold'], 200)
        with self.assertRaises(ValueError): self.act('checkin', stamp=at('2026-10-19 23:00'))
        self.act('checkin', stamp=at('2026-10-20 08:00'))
        bag = self.player()['world']['bag']
        self.assertEqual(next(i for i in bag if i['id'] == 'cuong-hoa-thach')['qty'], 2)
        self.assertEqual(adventure.wallet(self.db, 1)['fragments'], 5)
        result = self.act('checkin', stamp=at('2026-10-22 08:00'))          # skipped the 21st
        self.assertEqual(result['engagement']['checkin']['streak'], 1)

    def test_offline_bank_requires_a_real_gap_and_caps_at_twelve_hours(self):
        start = at('2026-10-20 08:00')
        engagement.touch(self.db, 1, start); engagement.touch(self.db, 1, start + 120)
        self.assertEqual(engagement.state(self.db, 1)['offline_bank'], 0, 'short reconnect banks nothing')
        engagement.touch(self.db, 1, start + 120 + 30 * 3600)
        self.assertEqual(engagement.state(self.db, 1)['offline_bank'], engagement.OFFLINE_CAP)
        before = self.player()
        result = self.act('offline')
        after = self.player()
        self.assertGreater(after['gold'], before['gold'])
        self.assertTrue(after['level'] > before['level'] or after['levelXp'] > before['levelXp'])
        self.assertIn('Bế quan 720 phút', result['message'])
        with self.assertRaises(ValueError): self.act('offline')

    def test_event_windows_and_multipliers(self):
        self.assertEqual(engagement.multiplier('kill', at('2026-10-20 12:30')), 2)
        self.assertEqual(engagement.multiplier('kill', at('2026-10-20 13:00')), 1)
        self.assertEqual(engagement.multiplier('boss', at('2026-10-20 21:10')), 2)
        self.assertEqual(engagement.multiplier('fragments', at('2026-10-24 10:00')), 2)   # Saturday
        self.assertEqual(engagement.multiplier('fragments', at('2026-10-23 10:00')), 1)
        events = engagement.schedule(at('2026-10-20 12:30'))
        self.assertTrue(events[0]['active']); self.assertEqual(events[0]['endsIn'], 1800)

    def test_achievement_claim_unlocks_title_once(self):
        with self.assertRaises(ValueError): self.act('achievement', id='so-nhap')
        adventure.add(self.db, 1, 'kills', 50)
        self.act('achievement', id='so-nhap')
        self.assertEqual(self.player()['gold'], 300)
        with self.assertRaises(ValueError): self.act('achievement', id='so-nhap')
        with self.assertRaises(ValueError): self.act('title', title='Trảm Yêu Sư')
        result = self.act('title', title='Tân Tu Sĩ')
        self.assertEqual(result['engagement']['title'], 'Tân Tu Sĩ'); self.assertEqual(engagement.title_of(self.db, 1), 'Tân Tu Sĩ')

    def test_weekly_board_settles_once_into_mailbox_and_claims_rich_rewards(self):
        last_week = at('2026-10-14 10:00')
        for uid, kills in ((1, 30), (2, 50)):
            adventure.add(self.db, uid, engagement.board_value_key('kills', engagement.week(last_week)), kills)
        engagement.settle(self.db, at('2026-10-20 10:00')); engagement.settle(self.db, at('2026-10-21 10:00'))
        mails = self.db.execute('SELECT user_id,payload FROM community_rewards ORDER BY user_id').fetchall()
        self.assertEqual([(m[0], json.loads(m[1])['gold']) for m in mails], [(1, 1500), (2, 3000)])
        reward_id = self.db.execute('SELECT id FROM community_rewards WHERE user_id=1').fetchone()[0]
        community.action(self.db, 1, dict(action='reward_claim', id=reward_id, operationId='claim-000001', revision=1), {})
        self.assertEqual(adventure.wallet(self.db, 1)['fragments'], 15)

    def test_party_raid_phases_slam_and_chests(self):
        self.db.execute("INSERT INTO parties VALUES('p1',1,0)")
        for uid in (1, 2): self.db.execute('INSERT INTO party_members VALUES(?,?,?)', (uid, 'p1', uid))
        now = time.monotonic()
        server.PEERS.update({uid: dict(id=uid, map='hub', seen=now, x=1000, y=1100, hp=100) for uid in (1, 2)})
        with self.assertRaises(ValueError): raid.start(self.db, 2, server.PEERS)              # not leader
        server.PEERS[2]['map'] = 'field-meadow'
        with self.assertRaises(ValueError): raid.start(self.db, 1, server.PEERS)              # member not in city
        server.PEERS[2]['map'] = 'hub'
        snap = raid.start(self.db, 1, server.PEERS)
        token = snap['run']['token']; self.assertEqual(raid.run_for(self.db, 2)['token'], token)
        key = 'raid:' + token; server.ROOMS[key] = room = raid.room(self.db, token)
        for uid in (1, 2): server.PEERS[uid].update(map='raid', raidToken=token, x=1000, y=1000)
        self.assertEqual(len(room['mobs']), 8)
        for mob in room['mobs']: mob['dead'] = 10 ** 30; mob['hp'] = 0
        members = list(server.PEERS.values())
        raid.tick(room, room['mobs'], members, now, lambda v: False)
        boss = room['mobs'][-1]; self.assertTrue(boss['boss']); self.assertEqual(room['raid']['phase'], 2)
        raid.tick(room, room['mobs'], members, now + 5, lambda v: False)
        self.assertEqual(len(room['raid']['slams']), 1)
        slam = room['raid']['slams'][0]; server.PEERS[1].update(x=slam['x'], y=slam['y']); server.PEERS[2].update(x=slam['x'] + 400, y=slam['y'])
        hits = raid.tick(room, room['mobs'], members, now + 5 + raid.SLAM_DELAY, lambda v: False)
        self.assertIn(1, hits); self.assertNotIn(2, hits)
        boss['hp'] = boss['maxHp'] // 2
        raid.tick(room, room['mobs'], members, now + 9, lambda v: False)
        self.assertTrue(room['raid']['enraged']); self.assertEqual(len(room['mobs']), 13)
        self.db.commit(); server.damage_mob(boss, 10 ** 9, 1, now + 10, key)
        self.assertEqual(self.db.execute("SELECT status FROM raid_runs").fetchone()[0], 'cleared')
        with server.connect() as db:
            chests = db.execute("SELECT user_id FROM community_rewards WHERE title='Rương Huyết Trì Ma Quật' ORDER BY user_id").fetchall()
        self.assertEqual([c[0] for c in chests], [1, 2])
        self.assertIsNone(raid.run_for(self.db, 1))


    def test_raid_party_finder_groups_waiting_players(self):
        now = time.monotonic(); stamp = time.time()
        server.PEERS.update({uid: dict(id=uid, map='hub', seen=now, x=1000, y=1100, hp=100) for uid in (1, 2, 3)})
        raid.QUEUE.clear()
        raid.enqueue(self.db, 1, server.PEERS, stamp)
        self.assertIsNone(raid.run_for(self.db, 1), 'one player waits')
        raid.enqueue(self.db, 2, server.PEERS, stamp + 1)
        self.assertIsNone(raid.run_for(self.db, 1), 'two players wait for more first')
        snap = raid.snapshot(self.db, 1, server.PEERS, stamp + raid.MATCH_WAIT + 2)
        run = raid.run_for(self.db, 1, stamp + raid.MATCH_WAIT + 2)
        self.assertIsNotNone(run); self.assertEqual(sorted(run['members']), [1, 2]); self.assertTrue(snap['party'])
        self.assertEqual(raid.QUEUE, {})
        with self.assertRaises(ValueError): raid.enqueue(self.db, 1, server.PEERS, stamp + 30)   # already in a party
        raid.QUEUE.clear()

if __name__ == '__main__':
    unittest.main()
