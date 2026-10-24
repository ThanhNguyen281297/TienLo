/* Large continuous outdoor maps: shared geometry, seeded sprite placement and roads. */
(function(){
 const world=worldMap,d=world.dialog,rules=overworldRules,maps=new Map(rules.maps.map(m=>[m.id,m])),cache=new Map(),previewLoads=new WeakSet();
 const current=()=>maps.get(world.state.scene),ready=i=>i?.complete&&i.naturalWidth>0;
 const spawn={x:1000,y:1770};
 const ground=new Image();ground.src=artworkURL('Map/Terrain/meadow-v1.png');const dirt=new Image();dirt.src=artworkURL('Map/Terrain/dirt-v1.png');
 // Organic road network: Catmull-Rom curves sampled every ~30 units. Every
 // consumer (layout, ornaments, detail layer, minimap) shares this geometry.
 function spline(points,step=30){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)],n=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
  for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;out.push([0,1].map(j=>Math.round(.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3))));}}
  out.push(points[points.length-1]);return out;}
 const MAIN_ROAD=spline([[1000,1890],[1000,1660],[940,1430],[1005,1170],[1070,900],[995,630],[1025,360],[1000,105]]);
 const mainAt=y=>MAIN_ROAD.reduce((b,q)=>Math.abs(q[1]-y)<Math.abs(b[1]-y)?q:b);
 // Each camp is a clearing reached by a curving side road that ends at its rim.
 const paths=[MAIN_ROAD,...rules.camps.map(c=>{const side=c.x<1000?-1:1,a=mainAt(c.y+30),end=[c.x-side*150,c.y+15];
  return spline([a,[(a[0]+end[0])/2,(a[1]+end[1])/2+55],end]);})];
 window.overworldRoads=paths;
 // Per-zone identity: ground/road colour, flora and small ground details.
 const PLANTS=new Set(['pineTree','whiteBlossom','theme-14-035','theme-14-036','theme-14-038','theme-14-045','theme-14-063','theme-12-017','theme-13-012']);
 const STYLE={
  'field-meadow':{base:'#596c3f',ground:'none',road:'none',plants:['pineTree','whiteBlossom','pineTree','theme-14-036'],small:['theme-14-055','theme-14-056','theme-14-060']},
  'field-bamboo':{base:'#33503a',ground:'hue-rotate(18deg) saturate(.85) brightness(.74) contrast(1.06)',road:'saturate(.5) brightness(.66) hue-rotate(28deg)',plants:['theme-14-035','theme-14-038','theme-14-045','theme-14-063','pineTree'],small:['theme-14-057','theme-14-058','theme-14-061','theme-14-062']},
  'field-marsh':{base:'#4a6763',ground:'hue-rotate(58deg) saturate(.6) brightness(.8)',road:'saturate(.35) brightness(.82) hue-rotate(60deg)',plants:['theme-12-017','theme-12-024','theme-12-020','whiteBlossom'],small:['theme-12-021','theme-12-033','theme-14-060','theme-14-061']},
  'field-frost':{base:'#9baea7',ground:'saturate(.15) brightness(1.5)',road:'saturate(.2) brightness(1.25)',plants:['theme-10-058','theme-10-059','pineTree','theme-10-015'],small:['theme-10-034','theme-10-035','theme-10-052','theme-10-053']},
  'field-ember':{base:'#3a2620',ground:'sepia(1) saturate(1.6) hue-rotate(-25deg) brightness(.5) contrast(1.15)',road:'sepia(.6) saturate(1.2) hue-rotate(-20deg) brightness(.55)',plants:['theme-15-046','theme-15-047','theme-15-039','theme-13-012','theme-15-045'],small:['theme-15-032','theme-15-051','theme-15-002','theme-15-010']},
  'field-abyss':{base:'#241f30',ground:'grayscale(.5) sepia(.3) hue-rotate(210deg) saturate(.7) brightness(.42) contrast(1.1)',road:'grayscale(.6) hue-rotate(220deg) brightness(.45)',plants:['theme-15-045','theme-11-047','theme-11-050','theme-15-033','theme-15-046'],small:['theme-11-069','theme-11-070','theme-11-073','theme-11-049']}
 };
 const KIT={
  'field-meadow':{tower:'theme-14-010',landmark:['theme-14-047','theme-14-069','theme-14-010'],rocks:['theme-14-052','theme-14-053','theme-14-054'],banner:'theme-14-024'},
  'field-bamboo':{tower:'theme-14-010',landmark:['theme-14-047','theme-14-025','theme-14-070'],rocks:['theme-14-052','theme-14-053','theme-14-054'],banner:'theme-14-022'},
  'field-marsh':{tower:'theme-12-023',landmark:['theme-12-009','theme-12-024','theme-12-015'],rocks:['theme-14-052','theme-14-053'],banner:'theme-14-024'},
  'field-frost':{tower:'theme-10-016',landmark:['theme-10-015','theme-10-058','theme-10-059'],rocks:['theme-10-052','theme-10-053','theme-10-054'],banner:'theme-14-033'},
  'field-ember':{tower:'theme-15-013',landmark:['theme-15-018','theme-15-035','theme-15-053'],rocks:['theme-15-032','theme-15-051','theme-15-010'],banner:'theme-15-014'},
  'field-abyss':{tower:'theme-11-026',landmark:['theme-11-010','theme-11-030','theme-11-057'],rocks:['theme-11-049','theme-11-073','theme-11-058'],banner:'theme-11-046'}
 };
 const style=m=>({...(STYLE[m.id]||STYLE['field-meadow']),...(KIT[m.id]||KIT['field-meadow'])});
 const roadDistance=p=>Math.min(...paths.flatMap(route=>route.slice(1).map((b,i)=>kiemCombat.segmentDistance(p,{x:route[i][0],y:route[i][1]},{x:b[0],y:b[1]}))));
 for(const m of rules.maps){world.sectMaps[m.id]={...m,spawn};world.mapThemes.themes[m.id]={...world.mapThemes.themes[m.theme],name:m.name};world.atmosphere.profiles[m.id]={...world.atmosphere.profiles[m.theme]};}
 world.regions.splice(0,world.regions.length,...world.regions.filter(r=>r.id!=='valley'),...rules.maps.map(m=>({...m,...spawn,description:'Quái Lv.'+m.level+'–'+(m.level+2)+' · Yêu cầu Lv.'+m.entry})));
 world.fieldLayoutV2=true;
 // Layout v2 - reads like a xianxia hunting ground: a fortified outpost at the
 // southern spawn, lantern-lined main road, six fenced clearings each with a
 // shrine/ruin at the back, woods in the open ground and a dense forest rim.
 function props(m){if(cache.has(m.id))return cache.get(m.id);
  let seed=rules.maps.indexOf(m)*7919+317;const random=()=>((seed=seed*16807%2147483647)/2147483647),look=style(m),out=[];
  const inCamp=(p,k=1)=>rules.camps.some(c=>((p.x-c.x)/(285*k))**2+((p.y-c.y)/(205*k))**2<1);
  const outpost=p=>Math.hypot(p.x-spawn.x,(p.y-spawn.y)*1.2)<270;
  const free=(p,gap,road=84)=>p.x>95&&p.x<1905&&p.y>95&&p.y<1905&&roadDistance(p)>road&&!inCamp(p)&&!outpost(p)&&out.every(b=>Math.hypot(b.x-p.x,(b.y-p.y)*1.35)>Math.max(gap,(b.w||30)*.42));
  const put=(o)=>{out.push(o);return o;};
  // Outpost: two watchtowers and banners frame the road out of the safe circle.
  for(const s of [-1,1]){put({key:look.tower,x:1000+s*150,y:1675,w:58,solid:[-12,-7,12,6]});put({key:look.banner,x:1000+s*82,y:1640,w:24});}
  put({key:'portal',x:1000,y:1840,w:40});
  out.push({key:'lantern',x:930,y:1760,w:24},{key:'lantern',x:1070,y:1760,w:24});
  // Lantern pairs along the main road every ~280 units.
  let walked=0;for(let i=1;i<MAIN_ROAD.length;i++){const [ax,ay]=MAIN_ROAD[i-1],[bx,by]=MAIN_ROAD[i],len=Math.hypot(bx-ax,by-ay);walked+=len;
   if(walked<280||by>1560||by<190)continue;walked=0;const nx=-(by-ay)/len,ny=(bx-ax)/len;
   for(const s of [-1,1])put({key:'lantern',x:bx+nx*62*s,y:by+ny*62*s,w:22,solid:[-5,-4,5,3]});}
  // Clearings: a ring of stones with a gap toward the road, a shrine at the back.
  rules.camps.forEach((c,ci)=>{const side=c.x<1000?-1:1,gate=Math.atan2(15,-side*150);
   for(let k=0;k<18;k++){const a=k/18*Math.PI*2;let diff=Math.abs(Math.atan2(Math.sin(a-gate),Math.cos(a-gate)));if(diff<.55)continue;
    put({key:look.rocks[(k+ci)%look.rocks.length],x:c.x+Math.cos(a)*262+(random()-.5)*14,y:c.y+Math.sin(a)*188+(random()-.5)*10,w:30+random()*12});}
   const back={x:c.x-side*205,y:c.y-95};put({key:look.landmark[ci%look.landmark.length],x:back.x,y:back.y,w:84,solid:[-16,-8,16,6],landmark:true});
  });
  // Woods: golden-angle groves on a loose grid, big trees inside, shrubs on the fringe.
  for(let gy=200;gy<1900;gy+=230)for(let gx=180+((gy/230|0)%2)*115;gx<1900;gx+=240){
   const ax=gx+(random()-.5)*70,ay=gy+(random()-.5)*50;if(!free({x:ax,y:ay},50,130))continue;
   const edge=Math.min(ax,ay,2000-ax,2000-ay)<260,count=(edge?7:4)+Math.floor(random()*3),spin=random()*6.28;let placed=0,reach=0;
   for(let i=0;i<count*3&&placed<count;i++){const r=i?34*Math.sqrt(i):0,a=spin+i*2.39996,p={x:ax+Math.cos(a)*r*1.25,y:ay+Math.sin(a)*r*.78};
    if(!free(p,36))continue;const key=look.plants[(placed+i)%look.plants.length];put({...p,key,w:(104-placed*7)*(.88+random()*.24),plant:PLANTS.has(key),solid:[-10,-6,10,5]});placed++;reach=Math.max(reach,r);}
   for(let i=0;placed&&i<4+placed;i++){const a=random()*6.28,r=reach+30+random()*24,p={x:ax+Math.cos(a)*r*1.25,y:ay+Math.sin(a)*r*.78};if(free(p,22,70))put({...p,key:look.small[i%look.small.length],w:18+random()*10,plant:false});}
  }
  // Forest rim: a staggered double tree line just inside the map edge.
  for(let d=120;d<1890;d+=62)for(const [x,y] of [[d,118],[d,1880],[118,d],[1880,d],[d+31,178],[d+31,1822],[178,d+31],[1822,d+31]]){
   const p={x:x+(random()-.5)*26,y:y+(random()-.5)*18};if(p.x<100||p.x>1900||p.y<100||p.y>1900||roadDistance(p)<90||outpost(p))continue;
   if(out.some(b=>Math.hypot(b.x-p.x,(b.y-p.y)*1.35)<46))continue;const key=look.plants[(x+y)%look.plants.length];put({...p,key,w:96+random()*26,plant:PLANTS.has(key),solid:[-10,-6,10,5]});}
  // Wildflowers on the road verges, alternating sides.
  for(const route of paths){let side=1,acc=0;for(let i=1;i<route.length;i++){const [ax,ay]=route[i-1],[bx,by]=route[i],len=Math.hypot(bx-ax,by-ay);acc+=len;if(acc<105)continue;acc=0;side=-side;
   const nx=-(by-ay)/len,ny=(bx-ax)/len,p={x:bx+nx*(70+random()*12)*side,y:by+ny*(70+random()*12)*side};if(free(p,20,62))put({...p,key:look.small[(i+side)%look.small.length],w:15+random()*8,plant:false});}}
  cache.set(m.id,out);return out;
 }
 world.fieldLayoutV2=true;
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
 const floor=drawGround;
 // Full-resolution tiles: the 1254 px textures are scaled into 384-unit world
 // tiles, so at 1.8x zoom on a 2x screen one texel is ~1 screen pixel (was ~3.6).
 const tiles=new Map();
 function tile(image,filter,key,size){if(!ready(image))return null;if(tiles.has(key))return tiles.get(key);
  const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;const ctx=c.getContext('2d');ctx.filter=filter||'none';ctx.drawImage(image,0,0);
  const p=g.createPattern(c,'repeat');p.setTransform(new DOMMatrix().scale(size/c.width));tiles.set(key,p);return p;}
 const texture=m=>tile(ground,style(m).ground,'g:'+m.id,384);
 let roadPath=null;
 function roads(){if(roadPath)return roadPath;const main=new Path2D(),side=new Path2D();paths.forEach((route,i)=>{const p=i?side:main;route.forEach(([x,y],n)=>n?p.lineTo(x,y):p.moveTo(x,y));});return roadPath=[main,side];}
 function drawRoads(m){const pattern=tile(dirt,style(m).road,'d:'+m.id,300);if(!pattern)return;
  g.save();g.lineJoin=g.lineCap='round';g.strokeStyle=pattern;
  // Clearings first, so the side roads run into them.
  for(const c of rules.camps){g.save();g.beginPath();g.ellipse(c.x,c.y,250,180,0,0,Math.PI*2);g.fillStyle=pattern;
   for(const [a,k] of [[.14,1],[.18,.8],[.24,.58]]){g.globalAlpha=a;g.beginPath();g.ellipse(c.x,c.y,205*k,145*k,0,0,Math.PI*2);g.fill();}g.restore();}
  // Main road wide, side roads narrower; three passes give a soft verge.
  const [main,side]=roads();
  for(const [w,a] of [[104,.2],[90,.45],[76,1]]){g.globalAlpha=a;g.lineWidth=w;g.stroke(main);}
  for(const [w,a] of [[68,.2],[58,.45],[48,1]]){g.globalAlpha=a;g.lineWidth=w;g.stroke(side);}
  g.restore();}
 drawGround=function(cx,cy,vw,vh){const m=current();if(!m)return floor(cx,cy,vw,vh);
  g.save();g.fillStyle=style(m).base;g.fillRect(cx,cy,vw,vh);const pattern=texture(m);if(pattern){g.fillStyle=pattern;g.fillRect(cx,cy,vw,vh);}
  drawRoads(m);window.mapIdentity?.drawField(g,m,cx,cy,vw,vh);g.restore();
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
