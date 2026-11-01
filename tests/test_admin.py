"""Admin panel: reward validation, character edits and mail."""
import json, sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import admin, server, shards, premium
from test_premium_shards_mail import Base


class AdminTests(Base):
    def setUp(self):
        super().setUp()
        admin.CTX.update(PEERS={}, CHAT=server.CHAT, DB_LOCK=server.DB_LOCK, WORLD_LOCK=server.WORLD_LOCK, connect=server.connect,
                         password_hash=server.password_hash, SECTS=server.SECTS)
        admin.init_db(self.db)

    def test_reward_validation(self):
        r = admin.clean_reward({'gold': 100, 'gear': [{'id': 'shield-2', 'qty': 2}, {'id': 'cuong-hoa-thach', 'qty': 5}], 'shards': {'nhan': 3}, 'pet': 'nguyet-tho'})
        self.assertEqual(r['gear'], ['shield-2', 'shield-2'])
        self.assertEqual(r['items'], {'cuong-hoa-thach': 5})
        for bad in ({}, {'gold': -1}, {'gold': 1.5}, {'gear': ['nope']}, {'shards': {'xx': 1}}, {'pet': 'nope'}):
            with self.assertRaises(ValueError):
                admin.clean_reward(bad)

    def test_edit_and_mail(self):
        out = admin.edit(self.db, 'gm', {'id': 1, 'set': {'level': 60, 'r': 3}, 'add': {'gold': 500, 'essence': 20}, 'lq': 50, 'shards': {'nhan': 7}})
        p = self.player()
        self.assertEqual((p['level'], p['r'], p['gold'], p['world']['essence']), (60, 3, 1500, 20))
        self.assertEqual(premium.balance(self.db, 1)['lq'], 50)
        self.assertEqual(shards.wallet(self.db, 1)['nhan'], 7)
        self.assertEqual(self.rev(), 2)
        with self.assertRaises(ValueError):
            admin.edit(self.db, 'gm', {'id': 1, 'set': {'hp': 5}})
        r = admin.send_mail(self.db, 'gm', {'targets': 'all', 'title': 'Quà', 'reward': {'gold': 10}})
        self.assertEqual(r['sent'], 2)
        self.assertEqual(self.db.execute("SELECT COUNT(*) FROM admin_log").fetchone()[0], 2)


if __name__ == '__main__':
    unittest.main()
