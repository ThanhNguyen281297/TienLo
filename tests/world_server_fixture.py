"""Legacy world suites: isolated SQLite fixtures, with a test-only authenticated handler."""
import json
import sys
import tempfile
import time
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

with tempfile.TemporaryDirectory() as directory:
    server.DATABASE=Path(directory)/'world.sqlite3';server.init_db()
    with server.connect() as db:
        for uid,name,w,realm,kills in [(1,'Vân Kiếm',0,3,7),(2,'Nguyệt Hoa',1,2,9)]:
            db.execute('INSERT INTO users VALUES(?,?,?,?)',(uid,'fixture_'+str(uid),'unused-test-password',int(time.time())))
            player={'nm':name,'ap':{'w':w,'gender':'Nam'},'r':realm,'stage':1,'world':{'kills':kills}}
            db.execute('INSERT INTO characters VALUES(?,?,?,?,?)',(uid,str(uid),json.dumps(player,ensure_ascii=False),1,int(time.time())))
    class FixtureHandler(server.GameHandler):
        def identity(self):
            uid=2 if 'fixture-user=2' in self.headers.get('Cookie','') else 1
            return {'user_id':uid,'username':'fixture_'+str(uid),'csrf':'test-only','token':'test-only'}
        def post_route(self):
            # Old arena tests send bare {} and test the ledger mechanics, not auth.
            if self.path=='/api/arena':
                self.rfile.read(int(self.headers.get('Content-Length','0')));return self.arena(self.identity(),True)
            return super().post_route()
    http=server.GameServer(('127.0.0.1',0),partial(FixtureHandler,directory=str(server.ROOT)))
    print(http.server_port,flush=True);http.serve_forever()
