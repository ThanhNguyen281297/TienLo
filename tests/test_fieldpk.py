"""Consensual field PK: only PK-on players, never party members or the safe zone; kills give sát khí."""
import json
import sys
import tempfile
import time
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server, fieldpk, equipment, adventure


class FieldPkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'; server.init_db(); self.db = server.connect()
        self.players = {}
        for uid in (1, 2, 3):
            self.db.execute('INSERT INTO users(id,username,password,created_at) VALUES(?,?,?,0)', (uid, f'p{uid}', 'x'))
            p = dict(nm=f'H{uid}', ap=dict(w=0, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=0, level=40, levelXp=0, x=1000, y=1100,
                     world=dict(map='field-meadow', bag=[], equip={}, essence=0))
            equipment.normalize(p); server.progression.normalize(p); self.players[uid] = p
            self.db.execute('INSERT INTO characters VALUES(?,?,?,?,?)', (uid, f'c{uid}', json.dumps(p), 1, 0))
        self.db.commit(); fieldpk.ARENAS.clear(); fieldpk.STATE.clear()
        self.peers = {uid: dict(id=uid, map='field-meadow', x=1000, y=1100, hp=300, maxHp=300) for uid in (1, 2, 3)}

    def tearDown(self):
        self.db.close(); server.DATABASE = self.old; self.temp.cleanup(); fieldpk.ARENAS.clear(); fieldpk.STATE.clear()

    def step(self, uid, now, events=()):
        return fieldpk.step(self.db, 'field-meadow:0', 'field-meadow', uid, self.peers[uid], dict(duelAttacks=list(events)), self.players[uid],
                            lambda p: 300, lambda p: 200, self.peers, now)

    def test_only_pk_players_fight_and_kills_give_red_name(self):
        now = time.time()
        with self.assertRaises(ValueError): fieldpk.toggle(1, True, 'hub', now)
        for uid in (1, 2): fieldpk.toggle(uid, True, 'field-meadow', now)
        self.peers[2].update(x=1040)
        for uid in (1, 2, 3): self.step(uid, now)
        self.step(1, now + .1, [dict(id='a1', slot=0, x=1040, y=1100)])
        owed, _ = self.step(2, now + .5)
        self.assertGreater(owed, 0)
        owed3, _ = self.step(3, now + .6)
        self.assertEqual(owed3, 0, 'a player without PK is never hit')
        with self.assertRaises(ValueError): fieldpk.toggle(2, False, 'field-meadow', now + 1)   # still in combat
        # Finish B off.
        fieldpk.ARENAS['field-meadow:0']['fighters'][1]['attack'] = 10 ** 6
        fieldpk.ARENAS['field-meadow:0']['fighters'][1]['ready'] = [0] * 5
        self.step(1, now + 2, [dict(id='a2', slot=0, x=1040, y=1100)])
        self.step(1, now + 2.5)
        self.assertEqual(fieldpk.public(1, now + 3)['sat'], 1)
        self.assertEqual(adventure.count(self.db, 1, 'pkKills'), 1)
        self.assertEqual(fieldpk.public(1, now + 3 + fieldpk.DECAY + 1)['sat'], 0, 'sát khí decays')

    def test_party_members_and_safe_zone_are_protected(self):
        now = time.time()
        self.db.execute("INSERT INTO parties VALUES('p',1,0)"); self.db.execute("INSERT INTO party_members VALUES(1,'p',0),(2,'p',0)")
        for uid in (1, 2, 3): fieldpk.toggle(uid, True, 'field-meadow', now)
        self.peers[2].update(x=1040); self.peers[3].update(x=1000, y=1770)          # 3 stands in the spawn safe zone
        for uid in (1, 2, 3): self.step(uid, now)
        self.step(1, now + .1, [dict(id='b1', slot=0, x=1040, y=1100)])
        self.assertEqual(self.step(2, now + .5)[0], 0)
        fieldpk.ARENAS['field-meadow:0']['fighters'][1].update(x=1000, y=1740, ready=[0] * 5)
        self.peers[1].update(x=1000, y=1740)
        self.step(1, now + 1, [dict(id='b2', slot=0, x=1000, y=1770)])
        self.assertEqual(self.step(3, now + 1.5)[0], 0)


if __name__ == '__main__':
    unittest.main()
