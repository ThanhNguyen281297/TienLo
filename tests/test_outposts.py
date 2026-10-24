"""Tông môn chiến: guardian spawns in war windows, guild damage race, capture and holder perks."""
import json
import sys
import tempfile
import time
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server, outposts, engagement, equipment


def at(text):
    return datetime.strptime(text, '%Y-%m-%d %H:%M').replace(tzinfo=engagement.VN).timestamp()


WAR = at('2026-10-24 20:10')   # a Saturday


class OutpostTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'; server.init_db(); self.db = server.connect()
        for uid in (1, 2, 3):
            self.db.execute('INSERT INTO users(id,username,password,created_at) VALUES(?,?,?,0)', (uid, f'p{uid}', 'x'))
            p = dict(nm=f'H{uid}', ap=dict(w=0, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=0, level=40, levelXp=0, x=1000, y=1100,
                     world=dict(map='field-bamboo', bag=[], equip={}, essence=0))
            equipment.normalize(p); server.progression.normalize(p)
            self.db.execute('INSERT INTO characters VALUES(?,?,?,?,?)', (uid, f'c{uid}', json.dumps(p), 1, 0))
        for gid, leader in (('g1', 1), ('g2', 2)):
            self.db.execute('INSERT INTO guilds(id,name,leader,points,created) VALUES(?,?,?,0,0)', (gid, 'Tong' + gid, leader))
        self.db.execute("INSERT INTO guild_members(user_id,guild_id,contribution,joined) VALUES(1,'g1',0,0),(3,'g1',0,0),(2,'g2',0,0)")
        self.db.commit(); outposts.DAMAGE.clear(); server.ROOMS.clear(); server.PEERS.clear()

    def tearDown(self):
        self.db.close(); server.DATABASE = self.old; self.temp.cleanup(); outposts.DAMAGE.clear(); server.ROOMS.clear(); server.PEERS.clear()

    def test_war_windows(self):
        self.assertIsNotNone(outposts.war(WAR)); self.assertIsNone(outposts.war(at('2026-10-24 20:31')))
        self.assertIsNone(outposts.war(at('2026-10-23 20:10')))           # Friday
        self.assertGreater(outposts.next_war(at('2026-10-24 21:00')), at('2026-10-24 21:00'))

    def test_guardian_damage_race_capture_and_perks(self):
        room = {'mobs': [], 'updated': 0}
        outposts.sync(self.db, room, 'field-bamboo', WAR)
        guardian = room['mobs'][-1]; self.assertTrue(guardian['outpost'])
        outposts.sync(self.db, room, 'field-meadow', WAR)                 # not an outpost field
        self.assertEqual(len(room['mobs']), 1)
        outposts.record_damage(self.db, guardian, 1, 900); outposts.record_damage(self.db, guardian, 3, 300); outposts.record_damage(self.db, guardian, 2, 1000)
        gid = outposts.on_kill(self.db, guardian, present={1, 2})
        self.assertEqual(gid, 'g1', 'guild totals decide, not the best single player')
        self.assertEqual(outposts.owner(self.db, 'truc-hai')['guild_name'], 'Tongg1')
        mails = [r[0] for r in self.db.execute('SELECT user_id FROM community_rewards')]
        self.assertEqual(mails, [1])
        self.assertEqual(outposts.bonus(self.db, 1, 'field-bamboo'), 1.1); self.assertEqual(outposts.bonus(self.db, 2, 'field-bamboo'), 1)
        self.assertEqual(self.db.execute("SELECT points FROM guilds WHERE id='g1'").fetchone()[0], 501)
        # Captured this war: no new guardian, and it leaves the room when the war ends.
        room2 = {'mobs': [], 'updated': 0}; outposts.sync(self.db, room2, 'field-bamboo', WAR); self.assertEqual(room2['mobs'], [])
        outposts.sync(self.db, room, 'field-bamboo', at('2026-10-24 20:40')); self.assertEqual(room['mobs'], [])

    def test_window_end_settles_for_top_damage(self):
        room = {'mobs': [], 'updated': 0}
        outposts.sync(self.db, room, 'field-marsh', WAR)
        outposts.record_damage(self.db, room['mobs'][0], 2, 50)
        outposts.sync(self.db, room, 'field-marsh', at('2026-10-24 20:31'))
        self.assertEqual(outposts.owner(self.db, 'van-mong')['guild_name'], 'Tongg2')

    def test_server_kill_path_uses_guild_damage(self):
        with patch('outposts.war', return_value=('war:test', WAR, WAR + 1800)):
            room = server.room_mobs('field-bamboo:0')
            guardian = next(m for m in room['mobs'] if m.get('outpost'))
            now = time.monotonic()
            server.PEERS.update({uid: dict(id=uid, map='field-bamboo', seen=now, x=1000, y=1050, hp=100) for uid in (1, 2)})
            server.damage_mob(guardian, 400, 2, now, 'field-bamboo:0')
            server.damage_mob(guardian, 10 ** 9, 1, now, 'field-bamboo:0')
        with server.connect() as db:
            self.assertEqual(outposts.owner(db, 'truc-hai')['guild_name'], 'Tongg1')


if __name__ == '__main__':
    unittest.main()
