"""Integration checks against an isolated SQLite DB and real HTTP server."""
import concurrent.futures
import json
import os
import sys
import tempfile
import threading
import unittest
from functools import partial
from datetime import datetime,timezone
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server

class OnlineServerTest(unittest.TestCase):
    def test_public_item_artwork(self):
        for name in ('daobao','ngoc','gioi','giay','phapbao','consume'):
            path='/ITEMS/'+name+'.png?v=release-test'
            status, data, _ = self.request(path)
            self.assertEqual(status,200,path)
            self.assertTrue(data.startswith(b'\x89PNG\r\n\x1a\n'))
            connection=HTTPConnection('127.0.0.1',self.http.server_port,timeout=10)
            connection.request('HEAD',path)
            response=connection.getresponse()
            self.assertEqual(response.status,200)
            self.assertEqual(response.getheader('Content-Type'),'image/png')
            self.assertEqual(response.read(),b'')
            connection.close()

    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.patch=patch.object(server,'DATABASE',Path(self.temp.name)/'test.sqlite3');self.patch.start()
        server.AUTH_LIMIT.clear();server.PEERS.clear();server.ROOMS.clear();server.EVENTS.clear();server.CHAT.clear();server.init_db()
        self.http=server.GameServer(('127.0.0.1',0),partial(server.GameHandler,directory=str(server.ROOT)))
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.thread.join();self.patch.stop();self.temp.cleanup()
    def request(self,path,body=None,cookie='',headers=None):
        connection=HTTPConnection('127.0.0.1',self.http.server_port,timeout=10)
        h={'Cookie':cookie,'Content-Type':'application/json',**(headers or {})}
        connection.request('POST' if body is not None else 'GET',path,json.dumps(body) if body is not None else None,h)
        response=connection.getresponse();raw=response.read();status=response.status;set_cookie=response.getheader('Set-Cookie');connection.close()
        try:data=json.loads(raw)
        except ValueError:data=raw
        return status,data,set_cookie
    def register(self,name):
        status,data,cookie=self.request('/api/register',{'username':name,'password':'test-password-123'})
        self.assertEqual(status,200);return cookie.split(';')[0],data['csrf']
    def player(self,name='Đạo Hữu'):
        return {'nm':name,'ap':{'w':0,'gender':'Nam'},'r':0,'stage':1,'gold':0,'xp':0,'hp':100,'mp':20,'x':1105,'y':490,'world':{'map':'sword','bag':[],'kills':0,'trainingRealm':0}}
    def test_account_save_ownership_revision_and_restart(self):
        cookie,csrf=self.register('first_user');other,other_csrf=self.register('other_user')
        self.assertIn('HttpOnly',cookie if ';' in cookie else self.request('/api/login',{'username':'first_user','password':'test-password-123'})[2])
        # Login rotates the first session.
        status,login,set_cookie=self.request('/api/login',{'username':'first_user','password':'test-password-123'});cookie=set_cookie.split(';')[0];csrf=login['csrf']
        self.assertEqual(self.request('/api/characters')[0],401)
        self.assertEqual(self.request('/api/characters',{'player':self.player(),'revision':0},cookie)[0],403)
        self.assertEqual(self.request('/api/characters',{'player':self.player(),'revision':0,'csrf':csrf},cookie)[0],201)
        self.assertIsNone(self.request('/api/characters',cookie=other)[1]['character'])
        self.assertEqual(self.request('/api/characters',{'player':self.player(),'revision':0,'csrf':csrf},cookie)[0],409)
        server.init_db();saved=self.request('/api/characters',cookie=cookie)[1]['character'];self.assertEqual(saved['player']['nm'],'Đạo Hữu');self.assertEqual(saved['revision'],1)
        bad=self.player();bad['r']=100
        self.assertEqual(self.request('/api/characters',{'player':bad,'revision':1,'csrf':csrf},cookie)[0],400)
        self.assertEqual(self.request('/data/tienlo.sqlite3',cookie=cookie)[0],403)
        self.assertEqual(self.request('/server.py',cookie=cookie)[0],403)
        self.assertEqual(self.request('/api/logout',{'csrf':csrf},cookie)[0],200)
        self.assertEqual(self.request('/api/characters',cookie=cookie)[0],401)
        with server.connect() as db:self.assertNotIn('test-password',db.execute('SELECT password FROM users LIMIT 1').fetchone()[0])
    def test_arena_transaction_concurrency(self):
        cookie,csrf=self.register('arena_user')
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            statuses=list(pool.map(lambda _:self.request('/api/arena',{'csrf':csrf},cookie)[0],range(4)))
        self.assertEqual(sorted(statuses),[200,200,429,429]);self.assertEqual(self.request('/api/arena',cookie=cookie)[1]['remaining'],0)
        other,other_csrf=self.register('arena_other');self.assertEqual(self.request('/api/arena',cookie=other)[1]['remaining'],2)
        with patch.object(server,'datetime') as clock:
            clock.now.return_value=datetime(2040,1,2,tzinfo=timezone.utc)
            self.assertEqual(self.request('/api/arena',cookie=cookie)[1]['remaining'],2)
            self.assertEqual(self.request('/api/arena',{'csrf':csrf},cookie)[1]['remaining'],1)
    def test_world_shared_hp_rewards_idempotent_chat_and_emote(self):
        a,ca=self.register('world_a');b,cb=self.register('world_b')
        for cookie,csrf,name in [(a,ca,'Kiếm Một'),(b,cb,'Kiếm Hai')]:self.assertEqual(self.request('/api/characters',{'player':self.player(name),'revision':0,'csrf':csrf},cookie)[0],201)
        def frame(cookie,csrf,**extra):
            import time;time.sleep(.14)
            return self.request('/api/world',{'csrf':csrf,'map':'sword','x':1105,'y':490,'batch':extra.pop('batch',server.secrets.token_hex(8)),**extra},cookie)
        initial=frame(a,ca)[1];mob=initial['mobs'][0]
        second=frame(b,cb,emote='wave')[1];self.assertEqual(second['players'][0]['name'],'Kiếm Một')
        first=frame(a,ca,hits=[{'id':mob['id'],'power':10}],batch='hit-one')[1];self.assertEqual(first['mobs'][0]['hp'],10)
        replay=frame(a,ca,hits=[{'id':mob['id'],'power':10}],batch='hit-one')[1];self.assertEqual(replay['mobs'][0]['hp'],10)
        killed=frame(b,cb,hits=[{'id':mob['id'],'power':10}])[1];self.assertEqual(killed['mobs'][0]['hp'],0);self.assertEqual(len(killed['rewards']),1)
        reward=frame(a,ca)[1]['rewards'];self.assertEqual(len(reward),1)
        acknowledged=frame(a,ca,ack=[reward[0]['eventId']])[1];self.assertEqual(acknowledged['rewards'],[])
        self.assertEqual(self.request('/api/chat',{'csrf':ca,'text':'Xin chào <script>'},a)[0],200)
        self.assertEqual(frame(b,cb)[1]['chat'][0]['text'],'Xin chào <script>')
        self.assertEqual(self.request('/api/world',{'csrf':ca,'map':'sword','x':float('inf'),'y':490},a)[0],400)
    def test_cross_origin_and_bad_login(self):
        cookie,csrf=self.register('safe_user')
        self.assertEqual(self.request('/api/login',{'username':'safe_user','password':'wrong-password'})[0],401)
        self.assertEqual(self.request('/api/logout',{'csrf':csrf},cookie,{'Origin':'https://evil.example'})[0],403)

if __name__=='__main__':unittest.main()
