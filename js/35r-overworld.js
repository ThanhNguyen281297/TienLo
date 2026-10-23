/* Large continuous outdoor maps: shared geometry, seeded sprite placement and roads. */
(function(){
 const world=worldMap,d=world.dialog,rules=overworldRules,maps=new Map(rules.maps.map(m=>[m.id,m])),cache=new Map(),previewLoads=new WeakSet();
 const current=()=>maps.get(world.state.scene),ready=i=>i?.complete&&i.naturalWidth>0;
 const spawn={x:1000,y:1770};
 const ground=new Image();ground.src=artworkURL('Map/Terrain/meadow-v1.png');const dirt=new Image();dirt.src=artworkURL('Map/Terrain/dirt-v1.png');const roadLayers=new Map();
 const paths=[[[1000,1860],[1000,1450],[970,1120],[1040,700],[1000,120]],[[1000,1400],[440,1320]],[[1000,1400],[1500,1320]],[[985,950],[430,850]],[[985,950],[1500,850]],[[1030,490],[550,370]],[[1030,490],[1430,370]]];
 // Per-zone identity: ground/road colour, flora and small ground details.
 const PLANTS=new Set(['pineTree','whiteBlossom','theme-14-035','theme-14-036','theme-14-038','theme-14-045','theme-14-063','theme-12-017','theme-13-012']);
 const STYLE={
  'field-meadow':{base:'#596c3f',ground:'none',road:'none',plants:['pineTree','whiteBlossom','pineTree','theme-14-036'],small:['theme-14-055','theme-14-056','theme-14-060']},
  'field-bamboo':{base:'#33503a',ground:'hue-rotate(18deg) saturate(.85) brightness(.74) contrast(1.06)',road:'saturate(.5) brightness(.66) hue-rotate(28deg)',plants:['theme-14-035','theme-14-038','theme-14-045','theme-14-063','pineTree'],small:['theme-14-057','theme-14-058','theme-14-061','theme-14-062']},
  'field-marsh':{base:'#4a6763',ground:'hue-rotate(58deg) saturate(.6) brightness(.8)',road:'saturate(.35) brightness(.82) hue-rotate(60deg)',plants:['theme-12-017','theme-12-024','theme-12-020','whiteBlossom'],small:['theme-12-021','theme-12-033','theme-14-060','theme-14-061']},
  'field-frost':{base:'#9baea7',ground:'saturate(.15) brightness(1.5)',road:'saturate(.2) brightness(1.25)',plants:['theme-10-058','theme-10-059','pineTree','theme-10-015'],small:['theme-10-034','theme-10-035','theme-10-052','theme-10-053']},
  'field-ember':{base:'#3a2620',ground:'sepia(1) saturate(1.6) hue-rotate(-25deg) brightness(.5) contrast(1.15)',road:'sepia(.6) saturate(1.2) hue-rotate(-20deg) brightness(.55)',plants:['theme-15-046','theme-15-047','theme-15-039','theme-13-012','theme-15-045'],small:['theme-15-032','theme-15-051','theme-15-002','theme-15-010']},
  'field-abyss':{base:'#241f30',ground:'grayscale(.5) sepia(.3) hue-rotate(210deg) saturate(.7) brightness(.42) contrast(1.1)',road:'grayscale(.6) hue-rotate(220deg) brightness(.45)',plants:['theme-11-057','theme-11-038','theme-11-050','theme-11-047'],small:['theme-11-069','theme-11-070','theme-11-073','theme-11-049']}
 };
 const style=m=>STYLE[m.id]||STYLE['field-meadow'];
 const roadDistance=p=>Math.min(...paths.flatMap(route=>route.slice(1).map((b,i)=>kiemCombat.segmentDistance(p,{x:route[i][0],y:route[i][1]},{x:b[0],y:b[1]}))));
 for(const m of rules.maps){world.sectMaps[m.id]={...m,spawn};world.mapThemes.themes[m.id]={...world.mapThemes.themes[m.theme],name:m.name};world.atmosphere.profiles[m.id]={...world.atmosphere.profiles[m.theme]};}
 world.regions.splice(0,world.regions.length,...world.regions.filter(r=>r.id!=='valley'),...rules.maps.map(m=>({...m,...spawn,description:'Quái Lv.'+m.level+'–'+(m.level+2)+' · Yêu cầu Lv.'+m.entry})));
 function props(m){if(cache.has(m.id))return cache.get(m.id);let seed=rules.maps.indexOf(m)+317;const random=()=>((seed=seed*16807%2147483647)/2147483647),result=[];
  const look=style(m),plants=look.plants;
  for(let n=0;n<520;n++){
   const p={x:110+random()*1780,y:110+random()*1780},nearCamp=rules.camps.some(c=>Math.hypot((p.x-c.x)/1.2,p.y-c.y)<150),nearSpawn=Math.hypot(p.x-spawn.x,p.y-spawn.y)<155;
   if(roadDistance(p)<64||nearCamp||nearSpawn||result.some(b=>Math.hypot(b.x-p.x,b.y-p.y)<43))continue;
   const small=random()<.58,key=small?look.small[n%look.small.length]:plants[n%plants.length],w=small?20+random()*14:72+random()*55;
   result.push({...p,key,w,plant:PLANTS.has(key),solid:small?null:[-10,-6,10,5]});
  }
  // Landmarks occupy the edges, leaving paths and combat circles clear.
  result.push({key:'lantern',x:930,y:1760,w:24},{key:'lantern',x:1070,y:1760,w:24},{key:'portal',x:1000,y:1840,w:40},
   {key:'rock',x:820,y:610,w:58,solid:[-18,-8,18,6]},{key:'lotusPond',x:1780,y:600,w:105},
   {key:'rock',x:190,y:1070,w:85,solid:[-22,-10,22,6]});
  cache.set(m.id,result);return result;
 }
 function services(m){const index=rules.maps.indexOf(m),list=[{id:'field-home',name:'Thiên Vân Thành',x:1000,y:1825,color:'#e4cea0'},{id:'field-road',name:'Bản đồ vùng săn',x:1100,y:1760,npc:true,color:m.color}];
  if(index<rules.maps.length-1){const next=rules.maps[index+1];list.push({id:'field-next',name:next.name+' · Lv.'+next.entry,x:1000,y:140,color:next.color});}
  if(index>0)list.push({id:'field-prev',name:rules.maps[index-1].name,x:900,y:1830,color:'#b5d4b1'});return list;
 }
 function reset(){classCombat.onRespawn();autoCombat.toggle(false);B.length=SP.length=V.length=LT.length=X.length=PT.length=0;K={};ptr=null;P.med=0;world.state.near=null;}
 const change=world.switchScene;world.switchScene=function(id,initial=false){
  if(id==='valley')id='field-bamboo';
  const m=maps.get(id);if(!m){const result=change(id,initial);if(world.isSectMap(world.state.scene)){for(const s of world.services)if(s.id==='training')s.name='Đường ra Thanh Phong';}return result;}
  if(window.duelArena?.fighting()&&!initial)return msg('Hãy kết thúc trận đấu trước khi rời lôi đài.');
  if(characterLevel()<m.entry){msg(m.name+' yêu cầu cấp '+m.entry+'.');if(initial)return world.switchScene('hub',true);return;}
  const same=world.state.scene===id;
  if(!same||!initial){reset();E=[];if(window.onlineWorld){onlineWorld.state.shared=false;onlineWorld.state.hits=[];}}
  world.state.scene=id;P.world.map=id;world.state.arena=null;world.buildings.splice(0,world.buildings.length,...props(m));world.services.splice(0,world.services.length,...services(m));
  for(const name of m.species)creatureArt.ensureSpecies(name);
  if(!same||!initial){P.x=spawn.x;P.y=spawn.y;}
  d.close();world.updateInterface();if(!initial)saveCharacter();
 };
 const walk=world.canWalk;world.canWalk=p=>!current()?walk(p):p.x>=85&&p.x<=1915&&p.y>=85&&p.y<=1915&&!world.buildings.some(b=>b.solid&&p.x>b.x+b.solid[0]&&p.x<b.x+b.solid[2]&&p.y>b.y+b.solid[1]&&p.y<b.y+b.solid[3]);
 const trace=world.traceMove;world.traceMove=function(a,b){if(!current())return trace(a,b);let end={...a};const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/4));for(let n=1;n<=steps;n++){const p={x:a.x+(b.x-a.x)*n/steps,y:a.y+(b.y-a.y)*n/steps};if(!world.canWalk(p))break;end=p;}return end;};
 const safety=world.sceneSafety;world.sceneSafety=p=>current()?Math.hypot(p.x-spawn.x,p.y-spawn.y)<115:safety(p);
 const camera=world.camera;world.camera=(vw,vh)=>current()?{x:Math.max(45,Math.min(1955-vw,P.x-vw/2)),y:Math.max(45,Math.min(1955-vh,P.y-vh/2)),vw,vh}:camera(vw,vh);
 const view=gameCamera;gameCamera=(vw=W/Z,vh=H/Z)=>current()?world.camera(vw,vh):view(vw,vh);
 const title=world.sceneTitle;world.sceneTitle=()=>current()?current().name+' · Quái Lv.'+current().level+'–'+(current().level+2):title();
 const floor=drawGround,patterns=new Map();
 function texture(m){if(!ready(ground))return null;if(patterns.has(m.id))return patterns.get(m.id);const c=document.createElement('canvas');c.width=c.height=384;const ctx=c.getContext('2d');ctx.filter=style(m).ground;ctx.drawImage(ground,0,0,384,384);ctx.filter='none';const p=g.createPattern(c,'repeat');patterns.set(m.id,p);return p;}
 function roadLayer(m){if(!ready(dirt))return null;const key=m.id;if(roadLayers.has(key))return roadLayers.get(key);
  const c=document.createElement('canvas'),mask=document.createElement('canvas');c.width=c.height=mask.width=mask.height=1000;const ctx=c.getContext('2d'),mc=mask.getContext('2d');
  ctx.scale(.5,.5);ctx.filter=style(m).road;ctx.fillStyle=ctx.createPattern(dirt,'repeat');ctx.fillRect(0,0,2000,2000);ctx.filter='none';
  mc.scale(.5,.5);mc.filter='blur(3px)';mc.strokeStyle='#fff';mc.lineWidth=82;mc.lineJoin=mc.lineCap='round';mc.beginPath();for(const route of paths)route.forEach(([x,y],n)=>n?mc.lineTo(x,y):mc.moveTo(x,y));mc.stroke();
  ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,2000,2000);roadLayers.set(key,c);return c;
 }
 drawGround=function(cx,cy,vw,vh){const m=current();if(!m)return floor(cx,cy,vw,vh);
  g.save();g.fillStyle=style(m).base;g.fillRect(cx,cy,vw,vh);const pattern=texture(m);if(pattern){g.fillStyle=pattern;g.fillRect(cx,cy,vw,vh);}
  const roads=roadLayer(m);if(roads)g.drawImage(roads,0,0,2000,2000);window.mapIdentity?.drawField(g,m,cx,cy,vw,vh);g.restore();
 };
 const details=world.drawGroundDetails;world.drawGroundDetails=function(ctx,...args){if(!current())return details(ctx,...args);};
 const actors=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){const m=current();if(!m)return actors(items,cx,cy,vw,vh);
  onlineWorld.queuePeers(items,cx,cy,vw,vh);for(const e of creatureArt.corpses)items.push([e.y,()=>mon(e)]);
  for(const b of world.buildings)if(b.x>cx-b.w&&b.x<cx+vw+b.w&&b.y>cy-20&&b.y<cy+vh+b.w)items.push([b.y,()=>{if(b.plant&&world.living.foliage(g,b.key,b.x,b.y,b.w,undefined,1))return;world.sprite(g,b.key,b.x,b.y,b.w);}]);
  for(const s of world.services)if(s.npc)items.push([s.y,()=>creatureArt.drawNpc(g,s)]);
 };
 const respawn=world.respawn;world.respawn=function(){if(!current())return respawn();reset();P.x=spawn.x;P.y=spawn.y;};
 const service=world.handleService;world.handleService=function(id){if(id==='training'||id==='field-road'||id==='teleport'&&world.state.scene==='hub'){openRoutes();return true;}if(id==='field-home'){world.switchScene('hub');return true;}if(id==='field-next'||id==='field-prev'){const i=rules.maps.indexOf(current())+(id==='field-next'?1:-1);if(rules.maps[i])world.switchScene(rules.maps[i].id);return true;}return service(id);};
 function openRoutes(){for(const m of rules.maps){const image=creatureArt.ensureSpecies(m.species[0]);if(image&&!image.complete&&!previewLoads.has(image)){previewLoads.add(image);image.addEventListener('load',()=>{if(d.isOpen()&&$('world-title').textContent==='Sơn Hà · Vùng săn')openRoutes();},{once:true});}}d.show('Sơn Hà · Vùng săn','Quái có cấp cố định theo vùng. Đồ rơi tự vào túi; không còn chọn tầng theo tu vi.');const root=$('world-content');for(const m of rules.maps){const {body}=visualUI.panel(m.name,creatureArt.thumbnail(m.species[0]),root);visualUI.chips([['Quái','Lv.'+m.level+'–'+(m.level+2)],['Vào từ','Lv.'+m.entry],['Bãi săn',6],['Quái',48]],body);const local=world.state.scene,canTravel=world.isSafe(P)&&local!=='duel';visualUI.action(body,local===m.id?'Đang ở đây':characterLevel()<m.entry?'Chưa đủ cấp':'Khởi hành',()=>world.switchScene(m.id),!canTravel||characterLevel()<m.entry||local===m.id);}d.action('Thiên Vân Thành',()=>world.switchScene('hub'),!world.isSafe(P)||world.state.scene==='duel');for(const id of world.sectIds)d.action(world.sectMaps[id].name,()=>world.switchScene(id),!world.isSafe(P)||world.state.scene==='duel');}
 const mini=world.renderMini;world.renderMini=function(ctx,size){if(!current())return mini(ctx,size);ctx.fillStyle=current().ground==='frost'?'#8b9d99':current().ground==='ember'?'#504338':'#46583c';ctx.fillRect(0,0,size,size);ctx.save();ctx.scale(size/2000,size/2000);ctx.lineCap='round';ctx.strokeStyle='#c5b995';ctx.lineWidth=28;for(const route of paths){ctx.beginPath();route.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}for(const c of rules.camps){ctx.fillStyle='#dc897a';ctx.beginPath();ctx.arc(c.x,c.y,38,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#fff5ba';ctx.beginPath();ctx.arc(P.x,P.y,22,0,Math.PI*2);ctx.fill();ctx.restore();};
 const overview=world.openOverview;world.openOverview=function(){if(!current())return overview();d.show(world.sceneTitle(),'Đường sáng nối các bãi săn. Trạm phía nam là vùng an toàn; đường phía bắc dẫn sang vùng mạnh hơn.');const c=document.createElement('canvas');c.width=c.height=330;c.className='world-overview';$('world-content').append(c);world.renderMini(c.getContext('2d'),330);d.action('Các vùng săn',openRoutes);};
 const button=document.createElement('button');button.id='field-maps-button';button.textContent='Vùng săn';button.onclick=openRoutes;$('bt').append(button);
 window.overworldGame={maps,props,paths,openRoutes,roadDistance,current};
})();
