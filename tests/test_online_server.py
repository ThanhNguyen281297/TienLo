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
    def social_user(self,name,realm=0):
        cookie,csrf=self.register(name);p=self.player(name);p.update(gold=1000,r=realm,x=1000,y=1100);p['world']['map']='hub'
        self.assertEqual(self.request('/api/characters',{'csrf':csrf,'revision':0,'player':p},cookie)[0],201)
        return cookie,csrf

    def social_action(self,auth,action,**values):
        cookie,csrf=auth;saved=self.request('/api/characters',cookie=cookie)[1]['character']
        return self.request('/api/community',{'csrf':csrf,'action':action,'operationId':server.secrets.token_hex(12),'revision':saved['revision'],**values},cookie)

    def test_party_permissions_capacity_transfer_and_persistence(self):
        users=[self.social_user('party_'+str(i)) for i in range(5)]
        ids=[self.request('/api/session',cookie=c)[1]['user']['id'] for c,_ in users]
        self.assertEqual(self.social_action(users[0],'party_create')[0],200)
        party=self.request('/api/community',cookie=users[0][0])[1]['party'];gid=party['id']
        for i in range(1,4):
            self.assertEqual(self.social_action(users[0],'party_invite',target=ids[i])[0],200)
            self.assertEqual(self.social_action(users[i],'party_accept',id=gid)[0],200)
        self.assertEqual(self.social_action(users[0],'party_invite',target=ids[4])[0],409)
        self.assertEqual(self.social_action(users[1],'party_kick',target=ids[0])[0],409)
        self.assertEqual(self.social_action(users[4],'party_accept',id=gid)[0],409)
        self.assertEqual(self.social_action(users[0],'party_promote',target=ids[1])[0],200)
        self.assertEqual(self.social_action(users[0],'party_leave')[0],200)
        server.init_db();data=self.request('/api/community',cookie=users[1][0])[1]
        self.assertEqual(data['party']['leader'],ids[1]);self.assertEqual(len(data['party']['members']),3)
        self.assertEqual(self.social_action(users[1],'party_leave')[0],200)
        self.assertEqual(self.request('/api/community',cookie=users[2][0])[1]['party']['leader'],ids[2])
        self.assertEqual(self.request('/api/community',{'action':'party_create'},users[4][0])[0],403)

    def test_guild_transactions_tasks_permissions_and_once_daily_claims(self):
        owner=self.social_user('guild_owner');member=self.social_user('guild_member')
        mid=self.request('/api/session',cookie=member[0])[1]['user']['id'];uid=self.request('/api/session',cookie=owner[0])[1]['user']['id']
        op='create-one';created=self.social_action(owner,'guild_create',name='Vân Hải Minh',operationId=op)
        self.assertEqual(created[0],200);self.assertEqual(created[1]['character']['player']['gold'],800)
        duplicate=self.social_action(owner,'guild_create',name='Vân Hải Minh',operationId=op)
        self.assertEqual(duplicate[1]['character']['player']['gold'],800)
        guild=self.request('/api/community',cookie=owner[0])[1]['guild'];gid=guild['id']
        self.assertEqual(self.social_action(member,'guild_request',id=gid)[0],200)
        self.assertEqual(self.social_action(member,'guild_accept',target=mid)[0],409)
        self.assertEqual(self.social_action(owner,'guild_accept',target=mid)[0],200)
        for _ in range(5):self.assertEqual(self.social_action(member,'guild_donate')[0],200)
        self.assertEqual(self.social_action(member,'guild_donate')[0],409)
        data=self.request('/api/community',cookie=owner[0])[1]['guild'];self.assertEqual(data['points'],50)
        self.assertEqual(next(m for m in data['members'] if m['id']==mid)['contribution'],50)
        with server.connect() as db:
            for _ in range(20):server.community.record_kill(db,{uid,mid})
        self.assertEqual(self.request('/api/community',cookie=owner[0])[1]['guild']['tasks']['kills'],20)
        claimed=self.social_action(member,'task_claim',task='kills');self.assertEqual(claimed[0],200)
        self.assertEqual(claimed[1]['character']['player']['world']['riftShards'],1)
        self.assertEqual(self.social_action(member,'task_claim',task='kills')[0],409)
        self.assertEqual(self.social_action(member,'guild_kick',target=uid)[0],409)
        stale=self.social_action(owner,'guild_donate',revision=0);self.assertEqual(stale[0],409);self.assertTrue(stale[1]['conflict'])
        self.assertEqual(self.social_action(owner,'guild_promote',target=mid)[0],200)
        self.assertEqual(self.social_action(owner,'guild_leave')[0],200)
        self.assertEqual(self.request('/api/community',cookie=member[0])[1]['guild']['leader'],mid)

    def test_party_nearby_rewards_and_private_chat_channels(self):
        import time
        a=self.social_user('team_a');b=self.social_user('team_b');outsider=self.social_user('team_other')
        bid=self.request('/api/session',cookie=b[0])[1]['user']['id']
        self.social_action(a,'party_create');gid=self.request('/api/community',cookie=a[0])[1]['party']['id'];self.social_action(a,'party_invite',target=bid);self.social_action(b,'party_accept',id=gid)
        def frame(auth,**extra):
            time.sleep(.14);status,data,_=self.request('/api/world',{'csrf':auth[1],'map':'sword','x':1105,'y':490,'hp':100,'batch':server.secrets.token_hex(8),**extra},auth[0]);self.assertEqual(status,200);return data
        first=frame(a);frame(b);frame(outsider);mob=first['mobs'][0]
        killed=frame(a,hits=[{'id':mob['id'],'power':40}]);self.assertTrue(killed['rewards'])
        self.assertTrue(frame(b)['rewards']);self.assertEqual(frame(outsider)['rewards'],[])
        self.assertEqual(self.request('/api/chat',{'csrf':a[1],'text':'Đội riêng','channel':'party'},a[0])[0],200)
        self.assertTrue(any(m['text']=='Đội riêng' for m in frame(b)['chat']))
        self.assertFalse(any(m['text']=='Đội riêng' for m in frame(outsider)['chat']))
        self.assertEqual(self.request('/api/chat',{'csrf':outsider[1],'text':'hack','channel':'party'},outsider[0])[0],409)

    def test_world_boss_shared_phases_telegraphs_rewards_and_restart(self):
        import time
        cooldowns=server.re.findall(r'cooldowns:\[([^\]]+)\]',(server.ROOT/'js/13b-combat-balance.js').read_text(encoding='utf-8'))
        self.assertEqual(tuple(int(row.split(',')[1]) for row in cooldowns),server.EVASION_COOLDOWNS)
        a=self.social_user('raid_a',14);b=self.social_user('raid_b');watcher=self.social_user('raid_view')
        def frame(auth,**extra):
            time.sleep(.14);status,data,_=self.request('/api/world',{'csrf':auth[1],'map':'worldboss','x':1000,'y':1210,'hp':100,'batch':server.secrets.token_hex(8),**extra},auth[0]);self.assertEqual(status,200);return data
        first=frame(a);second=frame(b);frame(watcher)
        self.assertEqual(first['mobs'][0]['id'],second['mobs'][0]['id']);self.assertEqual(second['boss']['required'],48)
        boss=server.ROOMS['worldboss:0']['mobs'][0];boss_id=boss['id']
        frame(a,hits=[{'id':boss_id,'power':1000}]);frame(b,hits=[{'id':boss_id,'power':48} for _ in range(7)])
        owner=next(p for p in server.PEERS.values() if p['name']=='raid_a')
        boss['hp']=15001;server.damage_mob(boss,999999,owner['id'],time.monotonic(),'worldboss:0');self.assertEqual((boss['hp'],boss['phase']),(15000,2))
        server.damage_mob(boss,999999,owner['id'],time.monotonic(),'worldboss:0');self.assertEqual(boss['hp'],15000)
        boss['_enrageUntil']=0;boss['_nextCast']=0;warning=frame(a)
        self.assertEqual(len(warning['boss']['marks']),3);self.assertEqual(warning['bossEvents'],[])
        frame(b,paused=True)
        frame(a,cast={'id':'verified-evade','index':1,'x':1000,'y':1210})
        for mark in boss['_cast']['marks']:mark['start']=time.time()-mark['duration']-.01
        evaded=frame(a);self.assertTrue(evaded['bossEvents']);self.assertTrue(all(e['dodged'] for e in evaded['bossEvents']))
        struck=frame(b);self.assertTrue(any(not e['dodged'] and e['amount']>0 for e in struck['bossEvents']))
        ids=[e['id'] for e in evaded['bossEvents']];self.assertEqual(frame(a,ackBoss=ids)['bossEvents'],[])
        boss['hp']=1;boss['_enrageUntil']=0;finished=frame(a,hits=[{'id':boss_id,'power':100}]);self.assertEqual(finished['boss']['hp'],0)
        self.assertGreater(finished['boss']['respawn'],290);self.assertEqual(finished['boss']['marks'],[])
        chest=self.request('/api/community',cookie=a[0])[1]['rewards'];self.assertEqual(len(chest),1)
        self.assertEqual(len(self.request('/api/community',cookie=b[0])[1]['rewards']),1)
        self.assertEqual(self.request('/api/community',cookie=watcher[0])[1]['rewards'],[])
        self.assertEqual(self.social_action(a,'reward_claim',id=chest[0]['id'])[0],409)
        server.ROOMS.clear();reloaded=frame(a);self.assertEqual(reloaded['boss']['hp'],0);self.assertGreater(reloaded['boss']['respawn'],290)
        saved=self.request('/api/characters',cookie=a[0])[1]['character'];player=saved['player'];player['world']['map']='hub'
        self.request('/api/characters',{'csrf':a[1],'player':player,'revision':saved['revision']},a[0]);time.sleep(.14)
        self.request('/api/world',{'csrf':a[1],'map':'hub','x':1000,'y':1100},a[0])
        claimed=self.social_action(a,'reward_claim',id=chest[0]['id'],operationId='claim-one');self.assertEqual(claimed[0],200)
        self.assertEqual(claimed[1]['character']['player']['gold'],1250)
        duplicate=self.social_action(a,'reward_claim',id=chest[0]['id'],operationId='claim-one');self.assertEqual(duplicate[1]['character']['player']['gold'],1250)
        self.assertEqual(self.social_action(a,'reward_claim',id=chest[0]['id'])[0],409)
        self.assertEqual(self.social_action(watcher,'reward_claim',id=chest[0]['id'])[0],409)

    def test_collection_catalog_stats_mixed_sets_and_validation(self):
        source=(server.ROOT/'js/24b-build-catalog.js').read_text(encoding='utf-8')
        self.assertEqual(json.loads(source.split('window.buildCatalog=',1)[1].strip().removesuffix(';')),server.BUILD_RULES)
        p=self.player();slots=list(server.BUILD_RULES['slots'])
        for set_id in ('phong','kim','nguyet','linh'):
            for level in (0,10,25,45):
                p['world']['equip']={slot:{**server.collection_item(f'rift-{set_id}-{slot}-{level}'),'uid':slot} for slot in slots}
                server.valid_player(p)
            result=server.collection_bonuses(p)
            self.assertTrue(result)
            if set_id=='linh':self.assertEqual((result['petPower'],result['petCooldown']),(.25,.2))
            if set_id=='phong':self.assertAlmostEqual(server.player_attack(p),(8+25)*1.06)
        p['world']['equip']={slot:{**server.collection_item(f'rift-{"phong" if i<4 else "kim"}-{slot}-0'),'uid':slot} for i,slot in enumerate(slots)}
        mixed=server.collection_bonuses(p);self.assertEqual((mixed['atkPercent'],mixed['crit'],mixed['hpPercent']),(.06,.03,.1));self.assertEqual(mixed['skill'],0)
        p['world']['equip']['vukhi']['atk']=999
        with self.assertRaises(ValueError):server.valid_player(p)
        p['world']['equip']['vukhi']={'id':'moc-kiem','uid':'fake','rarity':'pham','setId':'phong'}
        with self.assertRaises(ValueError):server.valid_player(p)

    def test_authenticated_pet_damage_cooldown_poison_frost_and_peer_metadata(self):
        import time
        cookie,csrf=self.register('pet_fighter');observer,ocsrf=self.register('pet_observer');p=self.player();q=self.player('Observer')
        q['world']['map']='sword';self.assertEqual(self.request('/api/characters',{'csrf':ocsrf,'revision':0,'player':q},observer)[0],201)
        revision=0
        def frame(c=cookie,token=csrf,**extra):
            time.sleep(.14)
            status,data,_=self.request('/api/world',{'csrf':token,'map':'sword','x':1105,'y':490,'batch':server.secrets.token_hex(8),**extra},c)
            self.assertEqual(status,200);return data
        for species in ('BoNgua','Nhen','Doi'):
            p['world'].update(pets=[{'id':'pet-one','species':species,'name':'Companion'}],activePet='pet-one')
            self.assertEqual(self.request('/api/characters',{'csrf':csrf,'revision':revision,'player':p},cookie)[0],201);revision+=1
            initial=frame();mob_id=initial['mobs'][0]['id'];owner=next(v for v in server.PEERS.values() if v['name']==p['nm']);mob=next(m for m in server.ROOMS[server.room_for(owner)]['mobs'] if m['id']==mob_id)
            with server.WORLD_LOCK:mob.update(hp=500,maxHp=500,dead=0);mob.pop('_petEffects',None);mob['petEffects']=[]
            with server.connect() as db:db.execute('CREATE TABLE IF NOT EXISTS pet_skill_cooldowns(user_id INTEGER PRIMARY KEY,ready_at REAL NOT NULL,cast_id TEXT NOT NULL)');db.execute('DELETE FROM pet_skill_cooldowns')
            spoof=frame(petCast={'id':'spoof','species':'Dragon','target':mob_id});self.assertEqual(next(m for m in spoof['mobs'] if m['id']==mob_id)['hp'],500)
            cast={'id':'cast-'+species,'species':species,'target':mob_id}
            response=frame(petCast=cast);hp=next(m for m in response['mobs'] if m['id']==mob_id)['hp']
            if species!='Nhen':self.assertLess(hp,500)
            else:
                effect=mob['_petEffects'][owner['id']];effect['next']=time.monotonic()-5
                server.tick_pet_effects(mob,time.monotonic(),server.room_for(owner));self.assertEqual(mob['hp'],470);self.assertNotIn(owner['id'],mob['_petEffects'])
                hp=mob['hp']
            duplicate=frame(petCast={**cast,'id':'second-'+species});self.assertEqual(next(m for m in duplicate['mobs'] if m['id']==mob_id)['hp'],hp)
            if species=='Doi':
                self.assertEqual(server.field_speed(mob),.7)
                # Public cast visuals last one second. Control the snapshot clock
                # instead of relying on HTTP round trips completing before expiry.
                cast_at=server.PEERS[owner['id']]['petCastAt']
                with patch.object(server.time,'monotonic',return_value=cast_at+.5):
                    peer_view=frame(observer,ocsrf)
                peer=next(v for v in peer_view['players'] if v['name']==p['nm']);self.assertEqual(peer['petCast']['species'],'Doi')
                with patch.object(server.time,'monotonic',return_value=cast_at+1.1):
                    expired_view=frame(observer,ocsrf)
                self.assertIsNone(next(v for v in expired_view['players'] if v['name']==p['nm'])['petCast'])
            # A fresh peer stream still cannot bypass the SQLite cooldown.
            server.PEERS.pop(owner['id']);fresh=frame(petCast={**cast,'id':'fresh-'+species})
            self.assertEqual(next(m for m in fresh['mobs'] if m['id']==mob_id)['hp'],hp)

    def test_enhancement_levels_set_tiers_and_pet_validation(self):
        player=self.player()
        slots=('vukhi','daobao','ngoc','gioi','giay','phapbao')
        player['world']['equip']={slot:dict(id=slot,uid=slot,slot=slot,rarity='pham',atk=2,enhance=0) for slot in slots}
        for level,tier,multiplier in [(0,0,1),(8,0,1),(9,9,1.05),(11,11,1.1),(13,13,1.15),(14,13,1.15),(15,15,1.2)]:
            for item in player['world']['equip'].values():item['enhance']=level
            server.valid_player(player)
            attack,bonus,actual_tier=server.equipment_stats(player)
            self.assertEqual((actual_tier,bonus),(tier,multiplier))
            self.assertAlmostEqual(attack,12*(1+.05*level))
        player['world']['equip']['giay']=None
        self.assertEqual(server.equipment_stats(player)[1],1)
        for invalid in (16,-1,1.5,True):
            player['world']['equip']['vukhi']['enhance']=invalid
            with self.assertRaises(ValueError):server.valid_player(player)
        player['world']['equip']['vukhi']['enhance']=15
        player['world']['pets']=[dict(id='pet-one',species='Tho',name='Nguyệt Thố')]
        player['world']['activePet']='pet-one';server.valid_player(player)
        player['world']['activePet']='other-account-pet'
        with self.assertRaises(ValueError):server.valid_player(player)
        player['world']['activePet']='pet-one';player['world']['pets'][0]['species']='Dragon'
        with self.assertRaises(ValueError):server.valid_player(player)

    def test_field_profiles_exposure_resistance_and_composition(self):
        rules_source=(server.ROOT/'js/13c-field-rules.js').read_text(encoding='utf-8')
        self.assertEqual(json.loads(rules_source.split('window.fieldRules=',1)[1].strip().removesuffix(';')),server.FIELD_RULES)
        for sect,rule in enumerate(server.FIELD_RULES):
            with self.subTest(sect=sect):
                mob=dict(t=0,x=1000,y=1000,hp=100,dead=0)
                field=dict(owner=1,id='one',sect=sect,x=1000,y=1000,until=20)
                clock=0
                for _ in range(int(rule['threshold']*100)+2):
                    clock+=.01;server.update_mob_fields(mob,[field],clock,.01)
                self.assertEqual(mob['fieldEffects'][0]['key'],rule['key'])
                self.assertEqual(server.field_attack_blocked(mob),bool(rule['hardDuration']))
                self.assertEqual(server.field_speed(mob),0 if rule['hardDuration'] and sect!=3 else rule['slow'])
                self.assertAlmostEqual(server.field_vulnerability(mob),rule['vulnerability'])
                self.assertAlmostEqual(server.field_outgoing(mob),rule['outgoing'])
                self.assertNotIn('_fieldExposure',server.public_mob(mob))
                mob['x']=1200;server.update_mob_fields(mob,[field],clock+.01,.01)
                self.assertEqual(mob['fieldEffects'],[])
                mob['x']=1000;server.update_mob_fields(mob,[field],clock+.02,.01)
                self.assertFalse(server.field_attack_blocked(mob),'Re-entry cannot retrigger control')
                server.update_mob_fields(mob,[],clock+.03,.01)
                self.assertEqual(server.field_speed(mob),1)
        boss=dict(t=2,x=1000,y=1000,hp=100,dead=0)
        field=dict(owner=1,id='boss',sect=1,x=1000,y=1000,until=20)
        server.update_mob_fields(boss,[field],2,1.3)
        self.assertAlmostEqual(boss['fieldEffects'][0]['hard'],.26)
        mob=dict(t=0,x=1000,y=1000,hp=100,dead=0)
        fields=[dict(owner=n,id=str(n),sect=0,x=1000,y=1000,until=20) for n in (1,2)]
        server.update_mob_fields(mob,fields,1,.1)
        self.assertAlmostEqual(server.field_vulnerability(mob),1.12,'Vulnerability uses the strongest source, never exponential stacking')

    def test_field_registration_and_shared_frost_snapshots(self):
        import time
        caster,csrf=self.register('frost_caster');watcher,watch_csrf=self.register('frost_watcher')
        for cookie,token,w in ((caster,csrf,1),(watcher,watch_csrf,0)):
            player=self.player();player['ap']['w']=w
            self.assertEqual(self.request('/api/characters',{'csrf':token,'player':player,'revision':0},cookie)[0],201)
        point={'x':1105,'y':490}
        def frame(cookie,token,**extra):
            time.sleep(.14)
            status,data,_=self.request('/api/world',{'csrf':token,'map':'sword',**point,**extra},cookie)
            self.assertEqual(status,200);return data
        initial=frame(caster,csrf);point.update(x=initial['mobs'][0]['x'],y=initial['mobs'][0]['y'])
        descriptor=dict(id='frost-one',**point)
        cast=frame(caster,csrf,field=descriptor)
        owner=next(v for v in server.PEERS.values() if v['ap']['w']==1)
        until=owner['skillField']['until']
        frame(caster,csrf,field=descriptor)
        self.assertEqual(owner['skillField']['until'],until,'Same field ID does not refresh lifetime')
        for _ in range(9):snapshot=frame(watcher,watch_csrf)
        target=snapshot['mobs'][0]
        self.assertEqual(snapshot['fields'][0]['sect'],1,'Observers receive the persistent field as well as mob states')
        self.assertTrue(any(effect['key']=='moonFrost' and effect['hard']>0 for effect in target['fieldEffects']))
        self.assertFalse(any(key.startswith('_') for key in target),'Private control timers stay on server')
        self.assertEqual(snapshot['damage'],0,'A frozen shared monster cannot attack the observer')
        cancelled=frame(caster,csrf,field=None)
        self.assertEqual(cancelled['mobs'][0]['fieldEffects'],[])
        rejected=frame(caster,csrf,field=dict(descriptor,id='cooldown-bypass'))
        self.assertEqual(rejected['mobs'][0]['fieldEffects'],[],'A new ID cannot bypass cooldown')

    def test_expanded_farms_and_validated_two_way_portals(self):
        import time
        browser_source=(server.ROOT/'js/19c-farm-layout.js').read_text(encoding='utf-8')
        self.assertEqual(json.loads(browser_source.split('window.farmLayout=',1)[1].strip().removesuffix(';')),server.FARM_LAYOUT)
        for scene in server.FARM_LAYOUT['main']:
            room=server.room_mobs(scene+':0');size=server.FARM_LAYOUT['valley' if scene=='valley' else 'camp']
            self.assertEqual(len(room['mobs']),36 if scene=='valley' else 48)
            self.assertEqual(len({m['id'] for m in room['mobs']}),len(room['mobs']))
            for mob in room['mobs']:
                self.assertLess(abs(mob['hx']-mob['campX'])/size['rx']+abs(mob['hy']-mob['campY'])/size['ry'],.9)
            for a,b in server.farm_portal_routes(scene):
                self.assertTrue(server.valid_farm_teleport(scene,{'x':a[0],'y':a[1]},b))
                self.assertTrue(server.valid_farm_teleport(scene,{'x':b[0],'y':b[1]},a))
                self.assertFalse(server.valid_farm_teleport(scene,{'x':100,'y':100},b))
        cookie,csrf=self.register('portal_user')
        self.assertEqual(self.request('/api/characters',{'csrf':csrf,'player':self.player(),'revision':0},cookie)[0],201)
        a,b=server.farm_portal_routes('sword')[0]
        def frame(point):
            time.sleep(.15)
            status,data,_=self.request('/api/world',{'csrf':csrf,'map':'sword','x':point[0],'y':point[1]},cookie)
            self.assertEqual(status,200)
            return data
        frame(a)
        result=frame(b);self.assertEqual((result['x'],result['y']),b)
        result=frame((1500,800));self.assertEqual((result['x'],result['y']),b,'Arbitrary long jumps must remain blocked')
        time.sleep(.8)
        result=frame(a);self.assertEqual((result['x'],result['y']),a)

    def test_airborne_visual_metadata_is_bounded_and_cleared(self):
        import time
        one,csrf=self.register('flying_user');two,other_csrf=self.register('watching_user')
        for cookie,token in ((one,csrf),(two,other_csrf)):
            self.assertEqual(self.request('/api/characters',{'csrf':token,'player':self.player(),'revision':0},cookie)[0],201)
        def frame(cookie,token,**values):
            time.sleep(.14)
            status,data,_=self.request('/api/world',{'csrf':token,'map':'sword','x':1000,'y':1100,**values},cookie)
            self.assertEqual(status,200)
            return data
        for value,expected in ((65,65),(9999,80),(-10,0),(float('inf'),0),('invalid',0)):
            frame(one,csrf,airborne=value)
            peer=frame(two,other_csrf)['players'][0]
            self.assertEqual(peer['airborne'],expected)
        frame(one,csrf,map='hub',airborne=65)
        self.assertEqual(frame(two,other_csrf,map='hub')['players'][0]['airborne'],0)

    def test_public_item_artwork(self):
        for name in ('daobao','ngoc','gioi','giay','phapbao','consume'):
            path='/MAP/items/'+name+'.png?v=release-test'
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
