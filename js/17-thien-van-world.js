/* Thiên Vân Thành: atlas MAP, hub an toàn, các tuyến đường và dịch vụ cục bộ. */
(function(){
  const HUB={x:1000,y:1100},CITY={left:620,right:1380,top:600,bottom:1430};
  const regions=[
    {id:'hub',name:'Thiên Vân Thành',x:1000,y:1100,description:'Hub an toàn · nhiệm vụ, giao dịch và truyền tống'},
    {id:'gate',name:'Thiên Môn',x:1000,y:180,description:'Cổng trời phía bắc'},
    {id:'sword',name:'Vạn Kiếm Sơn',x:400,y:580,description:'Sơn môn Kiếm Tông'},
    {id:'moon',name:'Nguyệt Hồ Cung',x:1600,y:580,description:'Cung điện bên hồ của Minh Nguyệt Tông'},
    {id:'valley',name:'Linh Mạch Cốc',x:1000,y:1590,description:'Linh thảo và yêu thú · nơi kiếm đạo hạnh'},
    {id:'dungeon',name:'Huyền Thiên Bí Cảnh',x:1000,y:1860,description:'Hổ Yêu trấn giữ · vùng nguy hiểm'}
  ];
  const roads=[[[1000,1100],[780,1100],[400,850],[400,580],[400,350],[1000,350],[1000,180]],
    [[1000,1100],[1220,1100],[1600,850],[1600,580],[1600,350],[1000,350]],
    [[1000,1100],[1000,1370],[1000,1590],[1000,1860]]];
  // Vùng cắt chuẩn hóa theo kích thước atlas, giữ alpha gốc của từng vật thể.
  const definitions={
    palace:[1,.01,0,.632,.466],gate:[1,.637,.004,.361,.428],school:[1,.013,.439,.342,.279],
    market:[1,.356,.440,.322,.280],forge:[1,.679,.433,.318,.294],tower:[1,.185,.665,.276,.332],garden:[1,.506,.663,.365,.332],
    portal:[0,.635,.436,.222,.325],arena:[0,.663,.055,.335,.407],board:[0,.845,.464,.153,.283],
    platform:[2,.26,.484,.178,.16],tile:[2,780/1448,95/1086,48/1448,24/1086],bridge:[2,.133,.651,.238,.15],
    lantern:[3,.003,.002,.07,.222],tree:[3,.38,.412,.153,.211],tree2:[3,.279,.412,.128,.20],sakura:[3,.005,.404,.214,.222],
    rock:[3,.686,.444,.105,.143],pond:[3,.532,.709,.278,.154],stall:[3,.013,.598,.112,.151],
    statue:[3,.095,.222,.124,.198],cloud:[3,.548,.854,.29,.144]
  };
  const atlases=[]; // Legacy raster atlases retained on disk, never loaded by the vector renderer.
  const ready=img=>img.complete&&img.naturalWidth>0;
  const cleaned=new Map();
  // PNG alpha đã tách riêng từ các atlas MAP gốc, không đọc pixel lúc chạy.
  function isolate(key){
    if(!definitions[key])return null;
    if(!cleaned.has(key)){
      const img=new Image();img.src=artworkURL('Map/sprites/'+key+'.png');
      img.onerror=()=>msg('Không tải được asset bản đồ '+key+'.');cleaned.set(key,img);
    }
    const img=cleaned.get(key);return ready(img)?img:null;
  }
  function preloadSprites(){Object.keys(definitions).forEach(isolate);}
  preloadSprites();
  const spriteMetadata=new Map(spriteCatalog.maps.map(asset=>[asset.id,asset]));
  function placement(key,x,y,width,height){
    const img=isolate(key);if(!img)return null;
    const h=height||width*img.naturalHeight/img.naturalWidth;
    const [l,t,r,b]=spriteMetadata.get(key)?.bounds||[0,0,img.naturalWidth,img.naturalHeight];
    const sx=width/img.naturalWidth,sy=h/img.naturalHeight,left=x-width/2,top=y-b*sy;
    return {img,left,top,width,height:h,bounds:{left:left+l*sx,right:left+r*sx,top:top+t*sy,bottom:y}};
  }
  function spriteBounds(key,x,y,width,height){return placement(key,x,y,width,height)?.bounds||null;}
  function sprite(ctx,key,x,y,width,height,alpha=1){
    const p=placement(key,x,y,width,height);if(!p)return;
    ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.shadowBlur=ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.shadowColor='transparent';ctx.filter='none';
    // Anchor the visible foot to the ground while drawing the complete PNG.
    renderArtwork(ctx,p.img,p.left,p.top,p.width,p.height);ctx.restore();
  }
  const buildings=[
    {key:'palace',x:1000,y:865,w:310,solid:[-110,-36,110,0]},
    {key:'school',x:800,y:885,w:175,solid:[-60,-28,60,-2]},
    {key:'board',x:1260,y:875,w:105,solid:[-40,-20,40,-2]},
    {key:'market',x:800,y:1070,w:175,solid:[-60,-26,60,-2]},
    {key:'forge',x:1200,y:1070,w:175,solid:[-60,-26,60,-2]},
    {key:'arena',x:1250,y:1320,w:190,ground:true},
    {key:'portal',x:1000,y:1250,w:95},
    {key:'garden',x:790,y:1290,w:160,solid:[-50,-28,50,-5]},
    {key:'gate',x:1000,y:245,w:260},
    {key:'palace',x:400,y:555,w:310,solid:[-108,-38,108,-2]},
    {key:'garden',x:1600,y:560,w:275,solid:[-84,-34,84,-2]},
    {key:'tower',x:1000,y:1810,w:110},
    {key:'stall',x:1070,y:1530,w:100,solid:[-28,-16,28,-2]}
  ];
  const services=[
    {id:'quest',name:'Vân Châu · Nhiệm vụ',x:1000,y:930,color:'#d7bf8e',npc:true},
    {id:'shop',name:'Bảo Khí Các',x:800,y:1100,color:'#dcc294',npc:true},
    {id:'forge',name:'Luyện Khí Phường',x:1200,y:1100,color:'#ffce96',npc:true},
    {id:'teleport',name:'Truyền Tống Trận',x:1000,y:1280,color:'#c7eff2'},
    {id:'arena',name:'Đấu trường',x:1250,y:1340,color:'#dfbc8a',npc:true},
    {id:'rank',name:'Thiên Vân Bảng',x:1260,y:900,color:'#e5d4a8',npc:true},
    {id:'skills',name:'Truyền Công Các',x:800,y:915,color:'#d9e6e6',npc:true}
  ];
  const decor=[];let seed=193;const random=()=>((seed=seed*16807%2147483647)/2147483647);
  function safeRect(p){return p.x>CITY.left&&p.x<CITY.right&&p.y>CITY.top&&p.y<CITY.bottom;}
  function roadDistance(p){let best=Infinity;for(const route of roads)for(let i=1;i<route.length;i++)best=Math.min(best,kiemCombat.segmentDistance(p,{x:route[i-1][0],y:route[i-1][1]},{x:route[i][0],y:route[i][1]}));return best;}
  for(let i=0;i<180;i++){
    const p={x:60+random()*1880,y:60+random()*1880};
    if(safeRect(p)||roadDistance(p)<64||regions.some(r=>Math.hypot(r.x-p.x,r.y-p.y)<170))continue;
    const choice=random();decor.push({...p,key:choice<.35?'tree':choice<.7?'tree2':'rock',w:45+random()*30});
  }
  for(const x of [650,1350])for(const y of [780,950,1180,1340])decor.push({key:'lantern',x,y,w:24});
  for(const [x,y]of [[680,1240],[1330,770],[675,750]])decor.push({key:'sakura',x,y,w:90});
  decor.push({key:'statue',x:910,y:890,w:42},{key:'statue',x:1090,y:890,w:42});
  const state={near:null,arena:null,region:'hub',scene:'hub',ready:false};
  const defaults=()=>({quest:'none',kills:0,questKills:0,weapon:0,armor:0,upgrade:0,potions:0,tutorial:true,bestArena:null,attrs:{luc:0,the:0,nhanh:0,linh:0},attrPoints:0,bag:[],equip:{vukhi:null,daobao:null,ngoc:null,gioi:null,giay:null,phapbao:null},thangViDan:0});
  function progress(){if(!P.world)P.world=defaults();// Legacy saves bypass the retired onboarding gate.
    const p=P.world;p.tutorial=true;p.attrs??={luc:0,the:0,nhanh:0,linh:0};p.attrPoints??=0;p.bag??=[];p.equip??={vukhi:null,daobao:null,ngoc:null,gioi:null,giay:null,phapbao:null};p.thangViDan??=0;return p;}
  function isSafe(p){if(state.scene!=='hub'&&window.worldMap?.sceneSafety)return window.worldMap.sceneSafety(p);const d=window.worldMap?.hubDeck;return d?Math.abs(p.x-1000)/d.rx+Math.abs(p.y-1100)/d.ry<1:safeRect(p);}
  const floor=document.createElement('canvas');floor.width=floor.height=M;
  function rebuild(){floor.getContext('2d').clearRect(0,0,M,M);state.ready=atlases.every(ready);}
  atlases.forEach(img=>{img.onload=rebuild;img.onerror=()=>msg('Không tải được '+img.src.split('/').pop()+'.');});rebuild();
  drawGround=function(cx,cy,vw,vh){g.imageSmoothingEnabled=true;g.drawImage(floor,cx,cy,Math.min(vw,M-cx),Math.min(vh,M-cy),cx,cy,Math.min(vw,M-cx),Math.min(vh,M-cy));};
  function drawGroundDetails(ctx,cx,cy,vw,vh){
    const details=[{key:'platform',x:1000,y:1144,w:160,h:96},
      {key:'pond',x:1740,y:740,w:210,h:95},{key:'pond',x:830,y:1550,w:180,h:75},
      ...regions.filter(r=>r.id!=='hub').map(r=>({key:'platform',x:r.x,y:r.y+50,w:210,h:110})),...buildings.filter(b=>b.ground)];
    for(const item of details)if(item.x>cx-item.w&&item.x<cx+vw+item.w&&item.y>cy-30&&item.y<cy+vh+item.w)sprite(ctx,item.key,item.x,item.y,item.w,item.h);
  }
  const npcImage=new Image();npcImage.src='Character/Kiem/Nam/truoc.png';
  function npc(service){
    if(window.creatureArt?.drawNpc(g,service))return;
    g.save();g.fillStyle='rgba(43,40,31,.18)';g.beginPath();g.ellipse(service.x,service.y,10,4,0,0,Math.PI*2);g.fill();
    if(ready(npcImage)){const w=36*npcImage.naturalWidth/npcImage.naturalHeight;g.drawImage(npcImage,service.x-w/2,service.y-36,w,36);}
    g.restore();
  }
  function queueActors(items,cx,cy,vw,vh){
    for(const item of [...buildings.filter(b=>!b.ground),...decor.filter(safeRect)])if(item.x>cx-item.w&&item.x<cx+vw+item.w&&item.y>cy-30&&item.y<cy+vh+item.w)items.push([item.y,()=>{
      g.save();g.fillStyle='rgba(34,43,36,.13)';g.beginPath();g.ellipse(item.x,item.y-3,item.w*.32,item.w*.06,0,0,Math.PI*2);g.fill();g.restore();sprite(g,item.key,item.x,item.y,item.w);
    }]);
    for(const service of services)if(service.npc&&Math.abs(service.x-P.x)<700&&Math.abs(service.y-P.y)<500)items.push([service.y,()=>npc(service)]);
  }
  function resolve(point){
    for(const b of buildings)if(b.solid){const [l,t,r,bt]=b.solid,left=b.x+l-8,top=b.y+t-5,right=b.x+r+8,bottom=b.y+bt+5;
      if(point.x>left&&point.x<right&&point.y>top&&point.y<bottom){const choices=[{d:point.x-left,x:left,y:point.y},{d:right-point.x,x:right,y:point.y},{d:point.y-top,x:point.x,y:top},{d:bottom-point.y,x:point.x,y:bottom}];choices.sort((a,b)=>a.d-b.d);point.x=choices[0].x;point.y=choices[0].y;}
    }
    point.x=Math.max(20,Math.min(M-20,point.x));point.y=Math.max(20,Math.min(M-20,point.y));return point;
  }
  const oldSpawn=spawn;
  spawn=function(index){
    oldSpawn(index);const e=E[index],zones=e.t===2?[regions[5]]:e.t===1?[regions[2],regions[3],regions[4]]:[regions[4],regions[2],regions[3]];
    const region=zones[index%zones.length],angle=Math.random()*Math.PI*2,radius=e.t===2?50+Math.random()*70:150+Math.random()*95;
    e.x=Math.max(35,Math.min(M-35,region.x+Math.cos(angle)*radius));e.y=Math.max(35,Math.min(M-35,region.y+Math.sin(angle)*radius));
    if(safeRect(e)){e.x=region.x<1000?CITY.left-100:CITY.right+100;}
    e.hx=e.x;e.hy=e.y;e.worldMap=true;
  };for(let i=0;i<E.length;i++)spawn(i);
  const oldSpeed=classCombat.enemySpeed;classCombat.enemySpeed=e=>e.worldMap&&!e.arena&&isSafe(P)?0:oldSpeed(e);
  const oldHit=hit;
  hit=function(e,power){const alive=!e.dead&&e.hp>0;const p=progress();oldHit(e,power*(1+p.weapon*.08+p.upgrade*.05));
    if(alive&&e.hp<=0&&e.worldMap&&!e.arena){p.kills++;if(p.quest==='active')p.questKills=Math.min(5,p.questKills+1);}
  };
  const modal=document.createElement('div');modal.id='world-dialog';modal.hidden=true;modal.innerHTML='<section role="dialog" aria-modal="true" aria-labelledby="world-title"><button class="world-close" aria-label="Đóng">×</button><small class="world-eyebrow">THIÊN VÂN THÀNH</small><h2 id="world-title"></h2><p id="world-description"></p><div id="world-content"></div></section>';document.body.appendChild(modal);
  const previousPaused=paused;
  // Chặn cập nhật ở wrapper khi mở dịch vụ để giữ toàn bộ cooldown và animation.
  let dialogOpen=false,returnFocus=null;
  cv.tabIndex=0;cv.setAttribute('aria-label','Bản đồ game');
  function close(){const heldFocus=modal.contains(document.activeElement);dialogOpen=false;modal.hidden=true;K={};ptr=null;updateInterface();
    // A hidden dialog must not keep swallowing the next game shortcut.
    if(heldFocus){const target=returnFocus?.isConnected&&returnFocus.getClientRects().length&&returnFocus.matches('button:not(:disabled),a[href],[tabindex]')?returnFocus:cv;target.focus({preventScroll:true});}
  }
  modal.querySelector('.world-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close();});
  function show(title,description){window.skillAim?.cancel();if(!dialogOpen)returnFocus=document.activeElement;modal.querySelector('section').classList.remove('inventory-dialog');dialogOpen=true;modal.hidden=false;modal.querySelector('.world-eyebrow').textContent=window.worldMap?.sceneTitle?.()||'THIÊN VÂN THÀNH';$('world-title').textContent=title;$('world-description').textContent=description;$('world-content').replaceChildren();window.creatureArt?.decorateDialog(title);K={};ptr=null;modal.querySelector('.world-close').focus();}
  function action(label,callback,disabled=false){const button=document.createElement('button');button.textContent=label;button.disabled=disabled;button.onclick=callback;$('world-content').appendChild(button);return button;}
  function line(text){const p=document.createElement('p');p.className='world-line';p.textContent=text;$('world-content').appendChild(p);}
  function pay(amount,change,reopen){if(P.gold<amount){line('Cần thêm '+(amount-P.gold)+' Linh Thạch.');return;}P.gold-=amount;change();saveCharacter();reopen();}
  function openQuest(){const p=progress();show('Vân Châu · Hộ thành','Yêu thú xuất hiện bên ngoài thành. Hãy giúp bảo vệ các tuyến đường.');
    if(p.quest==='none'){line('Nhiệm vụ: hạ 5 yêu thú ngoài thành. Thưởng 80 Linh Thạch, 40 EXP và 40 tu vi.');action('Nhận nhiệm vụ',()=>{p.quest='active';p.questKills=0;saveCharacter();openQuest();});}
    else if(p.quest==='active'){line('Đã hạ '+p.questKills+'/5 yêu thú.');action('Nhận thưởng',()=>{if(p.quest!=='active'||p.questKills<5)return;p.quest='claimed';P.gold+=80;gainExperience(40);saveCharacter();openQuest();},p.questKills<5);}
    else line('Đã hoàn thành Hộ thành. Cảm ơn đạo hữu đã bảo vệ Thiên Vân Thành.');
  }
  function openShop(){show('Bảo Khí Các','Trang bị đúng class và các món dùng chung. Linh Thạch: '+P.gold+' ◈');}
  function openForge(){window.equipmentProgression?.open();}
  function openSkills(){if(window.cultivation)return cultivation.openTrainer();const sword=P.ap.w===0;show('Truyền Công Các',sword?'Kiếm Tông · Kiếm khí và tốc độ':'Minh Nguyệt Tông · Nguyệt nhận và khống chế');
    const names=sword?['Phi Kiếm Quyết','Kiếm Ảnh Bộ','Bát Quái Kiếm Trận','Vạn Kiếm Quy Tông']:['Tam Nguyệt Trảm','Nguyệt Ảnh Bộ','Nguyệt Luân Trận','Minh Nguyệt Giáng Thế'];
    names.forEach((name,i)=>line((i+1)+'. '+name+' · '+(P.r>=i?'Đã lĩnh hội': 'Mở tại '+R[i])));
    line('Chuột để ngắm; giữ/kéo/thả nút skill trên điện thoại. Trận pháp đặt dưới chân. Tông môn được giữ cố định.');
    action('Ôn luyện · hồi đầy linh lực miễn phí',()=>{P.mp=mmp();saveCharacter();close();msg('Linh lực đã đầy. Hãy luyện kỹ năng ngoài thành hoặc trong đấu trường.');});
  }
  function travel(id){if(window.worldMap?.switchScene)return window.worldMap.switchScene(id);const region=regions.find(r=>r.id===id);if(!region)return;classCombat.onRespawn();P.x=region.x;P.y=region.y;P.med=0;resolve(P);K={};ptr=null;kiemCombat.state.aim=moonCombat.state.aim=null;skillAim.state.visible=false;close();saveCharacter();msg('Đã truyền tống tới '+region.name+'.');}
  function openTravel(){show('Truyền Tống Trận','Chọn điểm đến. Truyền tống từ thành miễn phí.');regions.forEach(r=>action(r.name+' · '+r.description,()=>travel(r.id)));}
  async function openRank(){show('Thiên Vân Bảng','Xếp hạng đạo hữu theo cảnh giới, tầng tu luyện và số yêu thú đã hạ.');line('Đang đọc bảng xếp hạng…');
    const content=$('world-content');try{const response=await fetch('/api/rankings');if(!response.ok)throw new Error('unavailable');const result=await response.json();if(modal.hidden||$('world-title').textContent!=='Thiên Vân Bảng')return;content.replaceChildren();
      if(!result.length)line('Chưa có nhân vật được lưu.');result.forEach((r,i)=>line((i+1)+'. '+r.name+' · '+r.sect+' · '+R[Math.max(0,Math.min(R.length-1,r.realm))]+' '+(r.stage||1)+' · '+r.kills+' yêu thú'));
    }catch{if(!modal.hidden&&$('world-title').textContent==='Thiên Vân Bảng'){content.replaceChildren();line('Không tải được bảng xếp hạng. Kiểm tra kết nối và phiên đăng nhập.');line('Phiên hiện tại: '+P.nm+' · '+R[P.r]+' · '+progress().kills+' yêu thú');}}
  }
  function beginWave(){const arena=state.arena;if(!arena)return;arena.wave++;arena.enemies=[];P.hp=mhp();P.mp=mmp();
    for(let i=0;i<(arena.wave===3?1:2);i++){const t=arena.wave===3?2:arena.wave-1,x=1250+(i===0?-35:35),y=1225;
      const e={t,x,y,hx:x,hy:y,hp:T[t].hp,dead:0,cd:1,fr:0,fl:0,worldMap:true,arena:true};E.push(e);arena.enemies.push(e);}
    msg('Đấu trường · đợt '+arena.wave+'/3.');
  }
  function stopArena(){for(let i=E.length-1;i>=0;i--)if(E[i].arena)E.splice(i,1);state.arena=null;}
  function openArena(){window.worldMap.openArena();}
  const openers={quest:openQuest,shop:openShop,forge:openForge,teleport:openTravel,arena:openArena,rank:openRank,skills:openSkills};
  function interact(){if(previousPaused()||dialogOpen||!state.near)return;if(window.worldMap?.handleService?.(state.near.id))return;openers[state.near.id]?.();}
  const interactButton=document.createElement('button');interactButton.id='world-interact';interactButton.hidden=true;interactButton.onclick=interact;document.body.appendChild(interactButton);
  const mapButton=document.createElement('button');mapButton.id='world-minimap';mapButton.setAttribute('aria-label','Mở bản đồ thế giới');mapButton.innerHTML='<canvas width="200" height="200"></canvas>';document.body.appendChild(mapButton);
  const minimap=mapButton.querySelector('canvas').getContext('2d');
  function miniature(ctx,size=200){
    ctx.clearRect(0,0,size,size);ctx.fillStyle='#172c30';ctx.fillRect(0,0,size,size);ctx.lineWidth=2;ctx.strokeStyle='#a99c7d';
    for(const road of roads){ctx.beginPath();road.forEach(([x,y],i)=>i?ctx.lineTo(x/M*size,y/M*size):ctx.moveTo(x/M*size,y/M*size));ctx.stroke();}
    ctx.fillStyle='#dbd2b9';ctx.fillRect(CITY.left/M*size,CITY.top/M*size,(CITY.right-CITY.left)/M*size,(CITY.bottom-CITY.top)/M*size);
    regions.forEach(r=>{ctx.fillStyle=r.id==='hub'?'#efe5c9':r.id==='dungeon'?'#ed9686':'#93ced0';ctx.beginPath();ctx.arc(r.x/M*size,r.y/M*size,3,0,Math.PI*2);ctx.fill();});
    if(size>200){ctx.font='11px Georgia,serif';ctx.textAlign='center';ctx.fillStyle='#efe5c9';regions.forEach(r=>ctx.fillText(r.name,r.x/M*size,r.y/M*size-12));}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(P.x/M*size,P.y/M*size,2.5,0,Math.PI*2);ctx.fill();
  }
  function openMap(){if(previousPaused()||dialogOpen)return;show('Bản đồ tiên lộ','Thiên Môn ở phía bắc, hai tông môn ở hai nhánh, Linh Mạch Cốc và Bí Cảnh phía nam.');
    if(window.worldMap?.openOverview){window.worldMap.openOverview();return;}
    const c=document.createElement('canvas');c.className='world-overview';c.width=c.height=360;$('world-content').appendChild(c);miniature(c.getContext('2d'),360);
    regions.forEach(r=>line(r.name+' · '+r.description));line('Đi theo đường đá hoặc tới Truyền Tống Trận trong thành để dịch chuyển.');
  }mapButton.onclick=openMap;
  const tag=document.createElement('div');tag.id='world-region';document.body.appendChild(tag);
  function updateInterface(){
    const hidden=previousPaused();mapButton.hidden=tag.hidden=hidden;interactButton.hidden=hidden||dialogOpen||!state.near;
    if(state.near)interactButton.textContent=state.near.name+' · E';
    const region=regions.find(r=>r.id===state.scene)||regions[0];state.region=state.scene;tag.textContent=(window.worldMap?.sceneTitle?.()||region.name)+(isSafe(P)?' · An toàn':'');if(window.worldMap?.renderMini)window.worldMap.renderMini(minimap,200);else miniature(minimap);
  }
  const originalSkill=skill;skill=function(index){if(dialogOpen)return;originalSkill(index);resolve(P);if(moonCombat.state.blink)moonCombat.state.blink.end={x:P.x,y:P.y};};
  const originalUp=up;
  up=function(dt){if(dialogOpen){hud();updateInterface();return;}if(previousPaused()){updateInterface();return;}
    for(const e of E)if(e.worldMap&&!e.arena&&isSafe(e)){e.x=e.hx;e.y=e.hy;}
    if(state.scene==='hub'){stopArena();E.length=0;}originalUp(dt);const unblocked={x:P.x,y:P.y};resolve(P);
    if(kiemCombat.state.dash&&(P.x!==unblocked.x||P.y!==unblocked.y))kiemCombat.state.dash=null;
    state.near=services.reduce((best,s)=>Math.hypot(s.x-P.x,s.y-P.y)<62&&(!best||Math.hypot(s.x-P.x,s.y-P.y)<Math.hypot(best.x-P.x,best.y-P.y))?s:best,null);
    if(state.arena&&!state.arena.separate){const a=state.arena;a.age+=dt;if(Math.hypot(P.x-1250,P.y-1260)>145||P.hp<=0){stopArena();msg('Đã rời đấu trường.');}
      else if(a.enemies.every(e=>e.dead||e.hp<=0)){for(let i=E.length-1;i>=0;i--)if(E[i].arena)E.splice(i,1);
        if(a.wave<3)beginWave();else{const elapsed=a.age,p=progress();p.bestArena=p.bestArena===null?elapsed:Math.min(p.bestArena,elapsed);P.gold+=80;stopArena();P.hp=mhp();P.mp=mmp();saveCharacter();msg('Thắng đấu trường! +80 Linh Thạch · '+elapsed.toFixed(1)+' giây.');}}
    }
    updateInterface();
  };
  const originalDraw=dr;
  dr=function(){originalDraw();if(previousPaused())return;const {x:cx,y:cy}=gameCamera();g.save();g.setTransform(Z,0,0,Z,-cx*Z,-cy*Z);
    for(const s of services){const y=s.y+(s.farmPortal?18:12);if(Math.abs(s.x-P.x)>W/Z||y<cy||y>cy+H/Z)continue;drawWorldCaption(g,serviceCaption(s),s.x,y,s.color);
      if(state.near===s){g.strokeStyle='#f3db9b';g.lineWidth=1;g.beginPath();g.ellipse(s.x,s.y+3,18,7,0,0,Math.PI*2);g.stroke();}}
    g.restore();
  };
  const create=$('ok').onclick;$('ok').onclick=()=>{create();if(!P.ap||cr.style.display!=='none')return;P.world=defaults();P.x=HUB.x;P.y=HUB.y;stopArena();saveCharacter();updateInterface();};
  addEventListener('keydown',event=>{if(event.target instanceof HTMLInputElement)return;if(event.key==='Escape'){close();return;}if(event.key.toLowerCase()==='e'&&!event.repeat)interact();if(event.key.toLowerCase()==='m'&&!event.repeat)openMap();});
  // Không truyền thao tác trong hộp thoại sang điều khiển nhân vật.
  modal.addEventListener('keydown',event=>{if(event.key!=='Escape')event.stopPropagation();});
  const css=document.createElement('style');css.textContent=`
    #world-minimap{position:fixed;right:12px;top:12px;width:126px;height:126px;box-sizing:border-box;padding:5px;border:1px solid #b3a17e;background:#1c2d32dd;z-index:2;border-radius:12px}
    #world-minimap canvas{position:static;width:100%;height:100%;image-rendering:auto;border-radius:7px}
    #world-region{position:fixed;right:12px;top:145px;font-size:11px;color:#f2e3c5;background:#18292ee6;padding:7px 10px;border-radius:8px;pointer-events:none}
    #world-interact{position:fixed;bottom:84px;left:50%;transform:translateX(-50%);z-index:3;border:1px solid #e1c990;background:#243635f2;color:#f3e4c9;font-size:13px;max-width:90vw;min-height:42px}
    #world-dialog{position:fixed;inset:0;z-index:15;background:#0b151bdd;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;touch-action:pan-y}
    #world-dialog[hidden],#world-region[hidden],#world-minimap[hidden],#world-interact[hidden]{display:none!important}
    #world-dialog > section{position:relative;width:min(480px,100%);max-height:85vh;overflow:auto;box-sizing:border-box;border:1px solid #8b9b94;border-radius:16px;background:#1b2b31;padding:28px;color:#e4e5d4}
    #world-dialog h2{font-size:23px;color:#ead3a2;margin:8px 30px 12px 0}#world-description{font-size:13px;line-height:1.8;color:#b1c6c5}
    #world-dialog .world-close{position:absolute;right:10px;top:10px;width:38px;min-height:38px;padding:0;font-size:24px;background:#1a252a}
    .world-eyebrow{font-size:10px;letter-spacing:1.8px;color:#9bb3b0}#world-content{display:grid;gap:10px;margin-top:20px}
    #world-content button{text-align:left;background:#263c41;border:1px solid #607d7c;font-size:13px;line-height:1.6}
    #world-content button:hover:not(:disabled){background:#354e50}.world-line{margin:0;font-size:13px;line-height:1.9;border-bottom:1px solid #ffffff10;padding-bottom:8px}
    .world-overview{position:static;width:min(100%,300px);height:auto;aspect-ratio:1;margin:auto;border:1px solid #768f87;border-radius:10px;image-rendering:auto}
    @media(max-width:700px){#world-minimap{width:82px;height:82px;right:8px;top:8px}#world-region{top:96px;right:8px;font-size:10px;max-width:130px}#world-interact{bottom:260px;font-size:12px}#world-dialog{padding:12px}#world-dialog > section{padding:22px;max-height:90vh}}
  `;document.head.appendChild(css);
  function serviceCaption(s){
    if(s.farmPortal)return s.reverse?'Về đài':'Bãi '+s.route.name.split(' · ')[0];
    return {quest:'Nhiệm vụ',shop:'Bảo khí',forge:'Luyện khí',teleport:'Truyền tống',arena:'Đấu trường',boss:'Đấu trường',rank:'Bảng xếp hạng',skills:'Truyền công',sectSkills:'Truyền công',mentor:'Sư phụ','valley-info':'Linh mạch'}[s.id]||s.name.split(' · ')[0];
  }
  window.worldMap={state,regions,services,buildings,isSafe,queueActors,drawGroundDetails,resolve,travel,interact,openMap,progress,atlases,definitions,sprite,spriteBounds,asset:isolate,city:CITY,preloadSprites,npc,rebuild,stopArena,updateInterface,serviceCaption,dialog:{show,close,line,action,isOpen:()=>dialogOpen}};updateInterface();
})();
