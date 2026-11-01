"""Vạn Tầng Tháp: entering from the city or a sect court, leaving back to the city."""
import json, sys, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import tower
from test_premium_shards_mail import Base


class TowerTests(Base):
    def act(self, action, **kw):
        r = tower.action(self.db, 1, dict(action=action, opId=self.op(), revision=self.rev(), **kw))
        self.db.execute('UPDATE characters SET player=?,revision=? WHERE user_id=1', (json.dumps(r['character']['player']), r['character']['revision']))
        return r

    def place(self, scene, x=1500, y=840):
        p = self.player(); p['world']['map'] = scene; p['x'], p['y'] = x, y
        self.db.execute('UPDATE characters SET player=? WHERE user_id=1', (json.dumps(p),))

    def test_enter_from_city_anywhere_and_leave(self):
        self.place('hub', 1500, 840)
        r = self.act('start', floor=1)
        self.assertEqual(r['character']['player']['world']['map'], 'tower')
        self.assertEqual(r['tower']['run']['floor'], 1)
        r = self.act('leave')
        self.assertEqual(r['character']['player']['world']['map'], 'hub')
        self.assertEqual((r['character']['player']['x'], r['character']['player']['y']), tower.GATE)

    def test_enter_from_sect_court(self):
        self.place('moon', 910, 1125)
        self.assertEqual(self.act('start', floor=1)['character']['player']['world']['map'], 'tower')

    def test_not_from_hunting_grounds(self):
        self.place('rift-wood', 1000, 1380)
        with self.assertRaises(ValueError):
            self.act('start', floor=1)


if __name__ == '__main__':
    unittest.main()
