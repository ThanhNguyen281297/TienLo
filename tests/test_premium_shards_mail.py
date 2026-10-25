"""Linh Quang top-ups (GM approved), Kỳ Trân Các, typed shards exchange and the mailbox."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server, premium, shards, mailbox, engagement, equipment, forging, pets


class Base(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'; server.init_db(); self.db = server.connect()
        for uid, gm in ((1, 0), (2, 1)):
            self.db.execute('INSERT INTO users(id,username,password,created_at,gm) VALUES(?,?,?,0,?)', (uid, f'hero{uid}', 'unused', gm))
            player = dict(nm=f'Hero{uid}', ap=dict(w=0, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=1000, level=30, levelXp=0,
                          x=910, y=1125, world=dict(map='sword', bag=[], equip={}, essence=0))
            equipment.normalize(player); server.progression.normalize(player)
            self.db.execute('INSERT INTO characters VALUES(?,?,?,?,?)', (uid, f'char{uid}', json.dumps(player), 1, 0))
        self.db.commit(); self.n = 0

    def tearDown(self):
        self.db.close(); server.DATABASE = self.old; self.temp.cleanup()

    def player(self, uid=1):
        return json.loads(self.db.execute('SELECT player FROM characters WHERE user_id=?', (uid,)).fetchone()[0])

    def rev(self, uid=1):
        return self.db.execute('SELECT revision FROM characters WHERE user_id=?', (uid,)).fetchone()[0]

    def op(self):
        self.n += 1
        return f'op-{self.n:08d}'

    def premium(self, action, who=1, gm=False, **args):
        return premium.action(self.db, who, dict(action=action, opId=self.op(), revision=self.rev(who), **args), gm)


class TopupTests(Base):
    def test_only_a_gm_approval_credits_linh_quang(self):
        r = self.premium('topup_create', vnd=50_000)
        req = r['premium']['requests'][0]
        self.assertEqual((req['lq'], req['status']), (50, 'pending'))
        self.assertTrue(req['code'].startswith('TL1'))
        self.premium('topup_submit', id=req['id'])
        self.assertEqual(premium.balance(self.db, 1)['lq'], 0)
        with self.assertRaises(PermissionError):
            self.premium('gm_approve', id=req['id'])
        view = premium.state(self.db, 2, gm=True)
        self.assertEqual([p['code'] for p in view['pending']], [req['code']])
        self.premium('gm_approve', who=2, gm=True, id=req['id'])
        self.assertEqual(premium.balance(self.db, 1), dict(lq=50, topped=50_000))
        with self.assertRaises(ValueError):
            self.premium('gm_approve', who=2, gm=True, id=req['id'])        # once only
        titles = [m['title'] for m in mailbox.view(self.db, 1)['mails']]
        self.assertIn('Quà nạp đầu', titles)
        for bad in (5_000, 10_500, 'x'):
            with self.assertRaises(ValueError):
                self.premium('topup_create', vnd=bad)

class ShopTests(Base):
    def setUp(self):
        super().setUp(); premium.credit(self.db, 1, 200, 'test')

    def test_buy_use_limits_and_card(self):
        self.premium('buy', id='song-boi-phu')
        item = next(i for i in self.player()['world']['bag'] if i['id'] == 'song-boi-phu')
        self.assertTrue(item['bound'])
        self.assertEqual(premium.exp_mult(self.db, 1), 1)
        self.premium('use', uid=item['uid'])
        self.assertEqual(premium.exp_mult(self.db, 1), 2)
        self.assertEqual(premium.balance(self.db, 1)['lq'], 190)
        for _ in range(3):
            self.premium('buy', id='tui-linh-thach')
        with self.assertRaises(ValueError):
            self.premium('buy', id='tui-linh-thach')                    # daily limit 3
        bag = self.player()['world']['bag']
        self.premium('use', uid=next(i for i in bag if i['id'] == 'tui-linh-thach')['uid'])
        self.assertEqual(self.player()['gold'], 1000 + 30_000)
        self.premium('buy', id='nguyet-tap')
        self.premium('card_claim')
        with self.assertRaises(ValueError):
            self.premium('card_claim')
        self.assertEqual(premium.balance(self.db, 1)['lq'], 200 - 10 - 45 - 99 + 8)
        premium.debit(self.db, 1, 54, 'drain')
        with self.assertRaises(ValueError):
            self.premium('buy', id='ruong-manh')                        # 0 LQ left

    def test_charm_pays_essence_and_lock_key(self):
        self.premium('buy', id='phu-cuong-hoa')
        p = self.player(); p['world']['map'] = 'hub'; p['x'], p['y'] = 1240, 1210
        weapon = dict(equipment.TEMPLATES['moc-kiem-class-0'], uid='w1'); p['world']['equip']['vukhi'] = weapon
        stone = dict(equipment.TEMPLATES['cuong-hoa-thach'], uid='s1', qty=10); p['world']['bag'].append(stone)
        self.db.execute('UPDATE characters SET player=?,revision=revision+1 WHERE user_id=1', (json.dumps(p),))
        forging.action(self.db, 1, dict(action='enhance', uid='w1', materials={'cuong-hoa-thach': 's1'}, charm=True, opId=self.op(), revision=self.rev()))
        p = self.player()
        self.assertEqual(p['world']['equip']['vukhi']['enhance'], 1)
        self.assertFalse(any(i['id'] == 'phu-cuong-hoa' for i in p['world']['bag']))
        # Second locked line needs a Khóa Tẩy Luyện.
        back = dict(equipment.TEMPLATES['back-1'], uid='b1'); back['affixes'] = equipment.defaults(back); p['world']['bag'].append(back)
        self.db.execute('UPDATE characters SET player=?,revision=revision+1 WHERE user_id=1', (json.dumps(p),))
        lock = lambda i: equipment.action(self.db, 1, dict(action='lock', uid='b1', index=i, opId=self.op(), revision=self.rev()))
        def apply(result):
            self.db.execute('UPDATE characters SET player=?,revision=? WHERE user_id=1', (json.dumps(result['character']['player']), result['character']['revision']))
        apply(lock(0))
        with self.assertRaises(ValueError):
            lock(1)
        self.premium('buy', id='khoa-tay-luyen')
        apply(lock(1))
        self.assertEqual(sorted(next(i for i in self.player()['world']['bag'] if i['uid'] == 'b1')['locks']), [0, 1])


class ShardTests(Base):
    def act(self, oid, uid=1):
        return shards.action(self.db, uid, dict(action='exchange', id=oid, opId=self.op(), revision=self.rev(uid)))

    def test_exchange_at_a_sect_master(self):
        with self.assertRaises(ValueError):
            self.act('formation-1')                                        # no shards
        shards.add(self.db, 1, 'phaptran', 45); shards.add(self.db, 1, 'thuhon', 25)
        self.act('formation-1')
        self.assertEqual(shards.wallet(self.db, 1)['phaptran'], 5)
        self.assertIn('formation-1', [i['id'] for i in self.player()['world']['bag']])
        self.act('pet-doc-thiem')
        p = self.player()
        self.assertEqual(p['world']['equip']['linhthu']['id'], 'pet-doc-thiem')
        with self.assertRaises(ValueError):
            self.act('pet-doc-thiem')                                    # already owned
        p['world']['map'] = 'hub'
        self.db.execute('UPDATE characters SET player=?,revision=revision+1 WHERE user_id=1', (json.dumps(p),))
        shards.add(self.db, 1, 'phaptran', 40)
        with self.assertRaises(ValueError):
            self.act('formation-2')                                        # not at a sect master
        with self.assertRaises(ValueError):
            self.act('mask-nu-1')                                          # wrong gender (and place)

    def test_drops_are_rare_and_rift_bosses_give_shards(self):
        got = sum(sum(shards.on_kill(self.db, 1, dict(map='field-meadow', level=5)).values()) for _ in range(500))
        self.assertEqual(got, 0)                                           # newbie field: never
        boss = shards.on_kill(self.db, 1, dict(map='rift-wood', boss=True, level=10))
        self.assertGreaterEqual(sum(boss.values()), 2)
        engagement.grant(self.db, 1, self.player(), dict(shards={'matna': 3}, lq=7))
        self.assertGreaterEqual(shards.wallet(self.db, 1)['matna'], 3)
        self.assertEqual(premium.balance(self.db, 1)['lq'], 7)


class MailTests(Base):
    def test_claim_one_and_all(self):
        engagement.mail(self.db, 1, 'A', dict(gold=100), 'a')
        engagement.mail(self.db, 1, 'B', dict(shards={'nhan': 2}, essence=5), 'b')
        engagement.mail(self.db, 1, 'C', dict(items={'cuong-hoa-thach': 3}), 'c')
        view = mailbox.view(self.db, 1)
        self.assertEqual(view['unread'], 3)
        r = mailbox.action(self.db, 1, dict(action='claim', id='a', revision=self.rev()))
        self.db.execute('UPDATE characters SET player=?,revision=? WHERE user_id=1', (json.dumps(r['character']['player']), r['character']['revision']))
        self.assertEqual(self.player()['gold'], 1100)
        r = mailbox.action(self.db, 1, dict(action='claim_all', revision=self.rev()))
        self.assertEqual(r['mail']['unread'], 0)
        self.assertEqual(shards.wallet(self.db, 1)['nhan'], 2)
        with self.assertRaises(ValueError):
            mailbox.action(self.db, 1, dict(action='claim_all', revision=r['character']['revision']))


if __name__ == '__main__':
    unittest.main()
