"""Linh thú (Ngự Thú Sư, stats, migration from mounts, raid drop, save protection) and Tụ Bảo Các auction house."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server, sect_potential, adventure, auction, community, equipment, pets


class Base(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.old = server.DATABASE
        server.DATABASE = Path(self.temp.name) / 'game.sqlite3'; server.init_db(); self.db = server.connect()
        for uid in (1, 2, 3):
            self.db.execute('INSERT INTO users(id,username,password,created_at) VALUES(?,?,?,0)', (uid, f'hero{uid}', 'unused'))
            player = dict(nm=f'Hero{uid}', ap=dict(w=uid % 4, gender='Nam'), r=0, stage=1, hp=100, mp=20, xp=0, gold=100000, level=30, levelXp=0,
                          x=1000, y=1100, world=dict(map='hub', bag=[], equip={}, essence=0))
            equipment.normalize(player); server.progression.normalize(player)
            self.db.execute('INSERT INTO characters VALUES(?,?,?,?,?)', (uid, f'char{uid}', json.dumps(player), 1, 0))
        self.db.commit(); self.ops = 0

    def tearDown(self):
        self.db.close(); server.DATABASE = self.old; self.temp.cleanup()

    def player(self, uid=1):
        return json.loads(self.db.execute('SELECT player FROM characters WHERE user_id=?', (uid,)).fetchone()[0])

    def write(self, uid, player):
        self.db.execute('UPDATE characters SET player=?,revision=revision+1 WHERE user_id=?', (json.dumps(player), uid))

    def rev(self, uid):
        return self.db.execute('SELECT revision FROM characters WHERE user_id=?', (uid,)).fetchone()[0]

    def op(self):
        self.ops += 1
        return f'op-{self.ops:06d}'


class PetTests(Base):
    def act(self, op, uid=1, **args):
        return pets.action(self.db, uid, dict(action=op, opId=self.op(), revision=self.rev(uid), **args))

    def test_buy_equip_upgrade_and_stats(self):
        base_hp, base_atk = server.player_max_hp(self.player()), server.player_attack(self.player())
        with self.assertRaises(ValueError): self.act('buy', id='phan-phuong')        # level 40
        with self.assertRaises(ValueError): self.act('buy', id='cot-long')           # raid only
        with self.assertRaises(ValueError): self.act('buy', id='diem-hat')           # no fragments
        result = self.act('buy', id='loi-te')
        p = self.player()
        self.assertEqual(p['gold'], 100000 - 30000)
        self.assertEqual(p['world']['petBook']['owned'], {'loi-te': 1})
        self.assertEqual(p['world']['equip']['linhthu']['id'], 'pet-loi-te')   # first pet is worn
        self.assertAlmostEqual(server.player_max_hp(p), base_hp + 160 * (1 + sect_potential.stat(p, 'hpPercent')), delta=1)  # sect HP% scales pet HP too
        self.assertAlmostEqual(server.player_attack(p), base_atk + 9)
        self.assertEqual(result['stable']['active'], 'loi-te')
        with self.assertRaises(ValueError): self.act('buy', id='loi-te')
        self.act('upgrade', id='loi-te')
        p = self.player()
        self.assertEqual(p['world']['petBook']['owned']['loi-te'], 2)
        self.assertEqual(p['gold'], 70000 - pets.upgrade_cost('loi-te', 1))
        self.assertEqual(pets.bonus(p), dict(hp=208, atk=12))
        adventure.grant_fragments(self.db, 1, 130)
        self.act('buy', id='diem-hat')
        self.assertEqual(adventure.wallet(self.db, 1)['fragments'], 10)
        p = self.player()
        self.assertEqual([i['id'] for i in p['world']['bag']], ['pet-diem-hat'])           # second goes to the bag
        self.act('equip', id='diem-hat'); p = self.player()
        self.assertEqual(pets.data(p)['active'], 'diem-hat')
        self.assertEqual([i['id'] for i in p['world']['bag']], ['pet-loi-te'])
        self.act('unequip'); p = self.player()
        self.assertEqual(pets.bonus(p), dict(hp=0, atk=0))
        self.assertEqual(sorted(i['id'] for i in p['world']['bag']), ['pet-diem-hat', 'pet-loi-te'])
        # A lost item can be taken again from the stable, never duplicated.
        p['world']['bag'] = [i for i in p['world']['bag'] if i['id'] != 'pet-loi-te']; self.write(1, p)
        self.act('take', id='loi-te')
        with self.assertRaises(ValueError): self.act('take', id='loi-te')
        self.assertEqual(sorted(i['id'] for i in self.player()['world']['bag']), ['pet-diem-hat', 'pet-loi-te'])

    def test_pet_items_are_bound_and_old_mounts_pets_and_eggs_migrate(self):
        self.act('buy', id='doc-thiem'); self.act('buy', id='bang-lang')
        p = self.player(); item = p['world']['bag'][0]
        self.assertTrue(item['bound'])
        self.assertFalse(any(r['id'].startswith('pet-') for r in adventure.recipes(p)))
        with self.assertRaises(ValueError):
            auction.action(self.db, 1, dict(action='sell', uid=item['uid'], start=100, hours=12, opId=self.op(), revision=self.rev(1)))
        worn = dict(equipment.RULES['petItems'][0], id='mount-loi-te', slot='thucuoi', uid='keep-uid')
        old = dict(nm='Old', ap=dict(w=0), world=dict(
            bag=[dict(id='egg-Doi', type='egg', species='Doi', name='Trứng', uid='egg')],
            equip={'thucuoi': worn}, mounts=dict(owned={'loi-te': 2, 'doc-thiem': 1}),
            pets=[dict(id='p1', species='Tho', name='Nguyệt Thố')], activePet='p1'))
        self.assertTrue(pets.sync(old))
        w = old['world']
        self.assertEqual((w['equip']['linhthu']['id'], w['equip']['linhthu']['uid']), ('pet-loi-te', 'keep-uid'))
        self.assertNotIn('thucuoi', w['equip'])
        self.assertEqual(sorted(i['id'] for i in w['bag']), ['pet-bang-doi', 'pet-doc-thiem', 'pet-nguyet-tho'])
        self.assertEqual(pets.data(old)['owned'], {'loi-te': 2, 'doc-thiem': 1, 'nguyet-tho': 1, 'bang-doi': 1})
        for key in ('mounts', 'pets', 'activePet'):
            self.assertNotIn(key, w)
        self.assertFalse(pets.sync(old))

    def test_skills_cover_every_pet(self):
        rules = json.loads((server.ROOT / 'Item' / 'pet-skills.json').read_text(encoding='utf-8'))
        for p in pets.PETS:
            self.assertIn(rules[p['species']]['kind'], ('strike', 'heal', 'poison', 'area'))
        self.assertEqual(pets.peer_pet(self.player()), None)

    def test_saves_cannot_forge_pets(self):
        self.act('buy', id='doc-thiem')
        old = self.player(); forged = json.loads(json.dumps(old))
        forged['world']['petBook'] = dict(owned={'cot-long': 5, 'doc-thiem': 1})
        forged['world']['pets'] = [dict(id='x', species='Tho', name='x')]
        pets.preserve(old, forged)
        self.assertEqual(forged['world']['petBook'], dict(owned={'doc-thiem': 1}))
        self.assertNotIn('pets', forged['world'])
        fresh = dict(world=dict(petBook=dict(owned={'cot-long': 5})))
        pets.preserve(None, fresh); self.assertNotIn('petBook', fresh['world'])

    def test_raid_chest_pet_and_duplicate(self):
        engagement = __import__('engagement')
        p = self.player()
        engagement.grant(self.db, 1, p, dict(pet='cot-long'))
        self.assertEqual(p['world']['petBook']['owned'], {'cot-long': 1})
        self.assertEqual(p['world']['equip']['linhthu']['id'], 'pet-cot-long')
        gold = p['gold']; engagement.grant(self.db, 1, p, dict(pet='cot-long'))
        self.assertEqual(p['gold'], gold + pets.DUPLICATE_GOLD)


class AuctionTests(Base):
    def setUp(self):
        super().setUp()
        p = self.player(1)
        sword = dict(equipment.TEMPLATES['train-10-daobao-class-1'], uid='sword-uid-0001', enhance=3)
        stones = dict(equipment.TEMPLATES['cuong-hoa-thach'], uid='stone-uid-0001', qty=10)
        p['world']['bag'] = [sword, stones]
        self.write(1, p)
        # A server certificate (option roll) follows the item to its buyer.
        self.db.execute('INSERT INTO equipment_drop_rolls VALUES(1,?,?,?)', ('sword-uid-0001', sword['id'], json.dumps([dict(key='atk', value=2)])))
        p = self.player(1); p['world']['bag'][0]['options'] = [dict(key='atk', value=2)]; self.write(1, p)
        self.now = 1_800_000_000

    def act(self, op, who=1, at=None, **args):
        return auction.action(self.db, who, dict(action=op, opId=self.op(), revision=self.rev(who), **args), None, at or self.now)

    def lot(self):
        return self.db.execute('SELECT * FROM auction_lots ORDER BY created DESC').fetchone()

    def test_sell_bid_outbid_and_settle(self):
        result = self.act('sell', uid='sword-uid-0001', start=1000, buyout=5000, hours=12)
        self.assertEqual(len(self.player(1)['world']['bag']), 1)
        self.assertEqual(self.player(1)['gold'], 100000 - 20)                         # 2% fee
        self.assertEqual(result['selling'][0]['name'], self.lot()['name'])
        lid = self.lot()['id']
        with self.assertRaises(ValueError): self.act('bid', who=1, id=lid, amount=2000)  # own lot
        with self.assertRaises(ValueError): self.act('bid', who=2, id=lid, amount=999)
        self.act('bid', who=2, id=lid, amount=1000)
        self.assertEqual(self.player(2)['gold'], 99000)
        with self.assertRaises(ValueError): self.act('bid', who=3, id=lid, amount=1040)  # < +5%
        self.act('bid', who=3, id=lid, amount=1200, at=self.now + 12 * 3600 - 30)   # late bid extends
        self.assertEqual(self.player(3)['gold'], 98800)
        self.assertEqual(self.lot()['ends'], self.now + 12 * 3600 - 30 + auction.SNIPE)
        refund = self.db.execute("SELECT payload FROM community_rewards WHERE user_id=2").fetchone()
        self.assertEqual(json.loads(refund[0]), dict(gold=1000))
        with self.assertRaises(ValueError): self.act('cancel', id=lid)                 # has bids
        auction.settle(self.db, self.now + 13 * 3600)
        self.assertEqual(self.lot()['status'], 'sold')
        # Buyer claims the item from the auction mailbox; its option certificate moves too.
        self.act('claim', who=3)
        bag = self.player(3)['world']['bag']
        self.assertEqual([i['uid'] for i in bag], ['sword-uid-0001']); self.assertEqual(bag[0]['enhance'], 3)
        self.assertTrue(self.db.execute("SELECT 1 FROM equipment_drop_rolls WHERE user_id=3 AND item_uid='sword-uid-0001'").fetchone())
        equipment.validate(self.player(3), self.db, 3)
        self.act('claim', who=1)
        self.assertEqual(self.player(1)['gold'], 100000 - 20 + 1200 - 60)            # 5% tax
        self.act('claim', who=2); self.assertEqual(self.player(2)['gold'], 100000)
        with self.assertRaises(ValueError): self.act('claim', who=2)

    def test_buyout_partial_material_stack_and_community_claim(self):
        self.act('sell', uid='stone-uid-0001', qty=4, start=100, buyout=300, hours=24)
        self.assertEqual(next(i for i in self.player(1)['world']['bag'] if i['id'] == 'cuong-hoa-thach')['qty'], 6)
        lid = self.lot()['id']
        self.act('bid', who=2, id=lid, amount=120)
        self.act('bid', who=3, id=lid, amount=999)                                   # >= buyout -> buy now
        self.assertEqual(self.player(3)['gold'], 100000 - 300)
        self.assertEqual(self.lot()['status'], 'sold'); self.assertEqual(self.lot()['price'], 300)
        reward = self.db.execute("SELECT id FROM community_rewards WHERE user_id=3").fetchone()[0]
        community.action(self.db, 3, dict(action='reward_claim', id=reward, operationId='claim-000001', revision=self.rev(3)), {})
        self.assertEqual(next(i for i in self.player(3)['world']['bag'] if i['id'] == 'cuong-hoa-thach')['qty'], 4)
        self.assertEqual(auction.reference(self.db, 'cuong-hoa-thach', self.now), 75)

    def test_unsold_returns_cancel_limits_and_browse(self):
        self.act('sell', uid='sword-uid-0001', start=500, hours=12)
        snap = auction.browse(self.db, 2, dict(group='armor'), self.now)
        self.assertEqual(snap['total'], 1)
        self.assertEqual(auction.browse(self.db, 2, dict(group='weapon'), self.now)['total'], 0)
        self.assertEqual(auction.browse(self.db, 2, dict(text='zzz'), self.now)['total'], 0)
        with self.assertRaises(ValueError): self.act('buyout', who=2, id=self.lot()['id'])   # no buyout price
        auction.settle(self.db, self.now + 12 * 3600 + 1)
        self.assertEqual(self.lot()['status'], 'expired')
        self.act('claim')
        self.assertIn('sword-uid-0001', [i['uid'] for i in self.player(1)['world']['bag']])
        equipment.validate(self.player(1), self.db, 1)
        # Cancel without bids returns straight to the bag.
        self.act('sell', uid='sword-uid-0001', start=500, hours=48, at=self.now + 50000)
        self.act('cancel', id=self.lot()['id'], at=self.now + 50001)
        self.assertIn('sword-uid-0001', [i['uid'] for i in self.player(1)['world']['bag']])
        for bad in (dict(start=5, hours=12), dict(start=500, hours=6), dict(start=500, buyout=100, hours=12)):
            with self.assertRaises(ValueError): self.act('sell', uid='sword-uid-0001', **bad)

    def test_trade_lock_blocks_auction(self):
        offers = {str(i): dict(items=[], gold=0, locked=i == 1, confirmed=False) for i in (1, 2)}
        self.db.execute("INSERT INTO player_trades VALUES('t1',1,2,'open',1,?,?,0)", (json.dumps(offers), 10 ** 12))
        with self.assertRaises(ValueError): self.act('sell', uid='sword-uid-0001', start=500, hours=12)


if __name__ == '__main__':
    unittest.main()
