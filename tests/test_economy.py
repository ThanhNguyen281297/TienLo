"""Income budget: saves may only add server-explained gold, essence and EXP."""
import json
import sys
import tempfile
import threading
import time
import unittest
from functools import partial
from http.client import HTTPConnection
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server, economy, equipment, progression


class EconomyUnitTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'
        server.init_db()
        self.db = server.connect()
        self.db.execute("INSERT INTO users(id,username,password,created_at) VALUES(1,'hero','x',0)")

    def tearDown(self):
        self.db.close(); server.DATABASE = self.old; self.temp.cleanup()

    def player(self, **change):
        p = dict(nm='Hero', ap=dict(w=0, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=100, level=5, levelXp=10,
                 x=1000, y=1100, world=dict(map='hub', bag=[], equip={}, essence=20))
        progression.normalize(p); p.update(change); return p

    def enforce(self, old, new, elapsed=5):
        return economy.enforce(self.db, 1, old, new, elapsed, equipment.items(old), equipment.items(new))

    def test_cheated_gold_is_clamped_but_spending_is_free(self):
        old, new = self.player(), self.player(gold=10**9)
        self.assertEqual(self.enforce(old, new), ['gold']); self.assertEqual(new['gold'], 100)
        new = self.player(gold=0)
        self.assertEqual(self.enforce(old, new), []); self.assertEqual(new['gold'], 0)

    def test_server_confirmed_kills_fund_income(self):
        old = self.player()
        new = self.player(gold=100 + 5000)
        self.assertEqual(self.enforce(old, new), ['gold'])
        for _ in range(40): economy.credit_kill(self.db, 1, dict(xpReward=487, level=67, materialYield=4))
        new = self.player(gold=100 + 5000)
        self.assertEqual(self.enforce(old, new), []); self.assertEqual(new['gold'], 5100)
        # The budget was spent and cannot be reused.
        self.assertLess(economy.budget(self.db, 1)['gold'], 40 * (122 * 2 + 5) - 4000)

    def test_level_jump_reverts_level_and_points(self):
        old = self.player()
        new = self.player(level=150, levelXp=0); progression.normalize(new)
        self.assertGreater(new['world']['attrPoints'], old['world']['attrPoints'])
        self.assertEqual(self.enforce(old, new), ['level'])
        self.assertEqual(new['level'], 5); self.assertEqual(new['world']['attrPoints'], old['world']['attrPoints'])

    def test_normal_play_within_time_allowance(self):
        old = self.player()
        new = self.player(gold=250, levelXp=300); new['world']['essence'] = 12  # Linh Nguyên is scarce: ~0.15/s allowance
        self.assertEqual(self.enforce(old, new), [])

    def test_selling_items_explains_gold(self):
        item = dict(id='hoi-huyet-dan', uid='u' * 32, type='consume', name='Hồi Huyết Đan', rarity='pham', price=12000, qty=1)
        old = self.player(); old['world']['bag'] = [item]
        new = self.player(gold=100 + 2400)              # sells for 20%
        self.assertEqual(self.enforce(old, new), [])
        new = self.player(gold=100 + 6000)              # the old 50% is no longer explained
        self.assertEqual(self.enforce(old, new), ['gold'])

    def test_refining_gear_explains_essence(self):
        gear = [dict(id='x', uid=str(n) * 32, slot='vukhi', rarity='than', price=10, enhance=4) for n in range(3)]
        old = self.player(); old['world']['bag'] = gear
        new = self.player(); new['world']['essence'] = new['world'].get('essence', 0) + 3 * (120 + 20)
        self.assertEqual(self.enforce(old, new), [])


class EconomyHttpTests(unittest.TestCase):
    """The real save endpoint clamps and tells the client to reload."""
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'; server.init_db()
        self.httpd = server.GameServer(('127.0.0.1', 0), partial(server.GameHandler, directory=str(server.ROOT)))
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.port = self.httpd.server_address[1]; self.cookie = ''

    def tearDown(self):
        self.httpd.shutdown(); self.httpd.server_close(); server.DATABASE = self.old; self.temp.cleanup()

    def call(self, path, body=None):
        c = HTTPConnection('127.0.0.1', self.port)
        headers = {'Content-Type': 'application/json', 'Cookie': self.cookie}
        c.request('POST' if body is not None else 'GET', path, json.dumps(body) if body is not None else None, headers)
        r = c.getresponse(); data = json.loads(r.read() or b'{}')
        cookie = r.getheader('Set-Cookie')
        if cookie: self.cookie = cookie.split(';')[0]
        return r.status, data

    def test_save_endpoint_clamps_gold(self):
        status, data = self.call('/api/register', dict(username='econ_user', password='longpassword123'))
        self.assertEqual(status, 200); csrf = data['csrf']
        p = dict(nm='Kinh Te', ap=dict(w=0, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=0, x=1000, y=1100,
                 world=dict(map='hub', bag=[], equip={}))
        status, data = self.call('/api/characters', dict(csrf=csrf, revision=0, player=p)); self.assertEqual(status, 201)
        p['gold'] = 999999999
        status, data = self.call('/api/characters', dict(csrf=csrf, revision=1, player=p))
        self.assertEqual(status, 201); self.assertEqual(data.get('corrected'), ['gold'])
        status, data = self.call('/api/characters')
        self.assertEqual(data['character']['player']['gold'], 0)


if __name__ == '__main__':
    unittest.main()
