/* Thành và bốn map tông môn độc lập: nhân vật khởi hành ở tông môn, truyền tống tới hub. */
(function(){
  const world=worldMap,dialog=world.dialog,START={x:1000,y:1110};
  const maps={
    hub:{id:'hub',name:'Thiên Vân Thành',description:'Hub trung lập · nhiệm vụ, shop, cường hóa, đấu trường',spawn:{x:1000,y:1100}},
    sword:{id:'sword',name:'Vạn Kiếm Sơn',description:'Vạn Kiếm Đài · Thiên Kiếm · luyện công và thử thách',spawn:{...START},color:'#81dbc7',classIndex:0,mentor:'Thanh Huyền',dais:'Vạn Kiếm Đài'},
    moon:{id:'moon',name:'Nguyệt Hồ Cung',description:'Minh Nguyệt Đài · hồ trăng · luyện công và thử thách',spawn:{...START},color:'#c7eeff',classIndex:1,mentor:'Nguyệt Dao',dais:'Minh Nguyệt Đài'},
    thunder:{id:'thunder',name:'Lôi Vân Phong',description:'Lôi điện trên mây · võ đài trường thương',spawn:{...START},color:'#beacff',classIndex:2,mentor:'Lôi Chấn',dais:'Cửu Tiêu Lôi Đài'},
    mystic:{id:'mystic',name:'Thiên Cơ Các',description:'Linh phù, thư các và trận pháp giữa vườn ngọc',spawn:{...START},color:'#e9dc9b',classIndex:3,mentor:'Huyền Cơ',dais:'Bát Quái Thiên Cơ Đài'}
  };
  maps.valley={id:'valley',name:'Linh Mạch Cốc',description:'Mạch linh hội tụ · Linh Nguyên x2 · quái khỏe hơn',spawn:{...START},color:'#9fe8b8'};
  const sectIds=['sword','moon','thunder','mystic'];
  world.sectMaps=maps;world.sectIds=sectIds;world.sectMapFor=index=>sectIds[index]||'sword';world.isSectMap=id=>sectIds.includes(id);
  world.isValley=id=>id==='valley';world.valleyId='valley';
  const islands=[{x:1000,y:1100,rx:350,ry:215},{x:650,y:820,rx:180,ry:125},{x:1530,y:660,rx:225,ry:160},{x:1550,y:1380,rx:215,ry:145},{x:720,y:1250,rx:115,ry:85}];
  const bridges=[[{x:825,y:960},{x:650,y:820}], [{x:1215,y:950},{x:1530,y:660}], [{x:1245,y:1195},{x:1550,y:1380}], [{x:845,y:1200},{x:720,y:1250}]];
  const hubBuildings=world.buildings.slice(0,8).map(b=>({...b})),hubServices=world.services.map(s=>({...s}));
  const enemyCache={hub:[],valley:null,...Object.fromEntries(sectIds.map(id=>[id,null]))},challenge={active:null};
  world.enemyCache=enemyCache;
  let elapsed=0;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),scene=()=>world.state.scene;
  world.regions.splice(0,world.regions.length,...Object.values(maps).map(m=>({...m,...m.spawn})));
  Object.assign(world.definitions,{
    greatIsland:[2,0,0,.484,.486],island:[2,.472,0,.246,.319],peak:[2,.938,.789,.061,.209],
    waterfall:[3,.017,.760,.155,.238],moonFall:[0,.843,.754,.155,.241]
  });
  world.preloadSprites();
  const swordImage=new Image();swordImage.src='CHARACTER/Kiem/VuKhi/vukhi.png';
  const moonWeapon=new Image();moonWeapon.src='CHARACTER/Liem/VuKhi/vukhi.png';
  const swordRing=new Image();swordRing.src='CHARACTER/Kiem/Vong/vong.png';
  const moonRing=new Image();moonRing.src='CHARACTER/Liem/Vong/vong.png';
  const moonArt=new Image();moonArt.src='CHARACTER/Liem/skill/minhnguyetgiangthe.png';
  const npcBodies=[new Image(),new Image()];npcBodies[0].src='CHARACTER/Kiem/Nam/truoc.png';npcBodies[1].src='CHARACTER/Liem/Nam/truoc.png';
  const ready=i=>i.complete&&i.naturalWidth>0;
  function ellipse(point,island,margin=0){return ((point.x-island.x)/(island.rx-margin))**2+((point.y-island.y)/(island.ry-margin))**2<=1;}
  function bridgePlacement([a,b]){const img=world.asset('bridge'),ratio=img?img.height/img.width:.475,length=dist(a,b),width=length/Math.hypot(.8,.3*ratio),height=width*ratio,angle=Math.atan2(b.y-a.y,b.x-a.x)+Math.atan2(.3*height,.8*width);return {a,b,img,width,height,angle};}
  function bridgePoint(placement,t){const {a,width,height,angle}=placement,x=((1-t)*(1-t)*.12+2*(1-t)*t*.5+t*t*.92-.12)*width,y=((1-t)*(1-t)*.65+2*(1-t)*t*.2+t*t*.35-.65)*height;return {x:a.x+x*Math.cos(angle)-y*Math.sin(angle),y:a.y+x*Math.sin(angle)+y*Math.cos(angle)};}
  function bridgePath(pair){const placement=bridgePlacement(pair);return Array.from({length:25},(_,i)=>bridgePoint(placement,i/24));}
  world.bridgeRoutes=()=>bridges.map(bridgePath);
  function land(point){return islands.some(i=>ellipse(point,i,5))||bridges.some(pair=>{const path=bridgePath(pair);return path.some((p,i)=>i&&kiemCombat.segmentDistance(point,path[i-1],p)<26);});}
  function blocked(point){return world.buildings.some(b=>b.solid&&point.x>b.x+b.solid[0]-8&&point.x<b.x+b.solid[2]+8&&point.y>b.y+b.solid[1]-5&&point.y<b.y+b.solid[3]+5);}
  function canWalk(point){if(point.x<20||point.x>M-20||point.y<20||point.y>M-20||blocked(point))return false;
    return scene()==='hub'?point.x>world.city.left+35&&point.x<world.city.right-35&&point.y>world.city.top+60&&point.y<world.city.bottom-35:land(point);
  }
  function traceMove(from,to){if(!canWalk(from))return {...from};const distance=dist(from,to),steps=Math.max(1,Math.ceil(distance/4));let last={x:from.x,y:from.y};
    for(let i=1;i<=steps;i++){const point={x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps};if(!canWalk(point))break;last=point;}return last;
  }
  world.canWalk=canWalk;world.traceMove=traceMove;
  world.camera=(vw,vh)=>{const c=world.city,axis=(v,size,lo,hi)=>size>hi-lo?(lo+hi-size)/2:Math.max(lo,Math.min(hi-size,v-size/2));return scene()==='hub'?{x:axis(P.x,vw,c.left,c.right),y:axis(P.y,vh,c.top,c.bottom),vw,vh}:{x:axis(P.x,vw,0,M),y:axis(P.y,vh,0,M),vw,vh};};
  world.sceneSafety=p=>ellipse(p,islands[0])||ellipse(p,islands[1])||ellipse(p,islands[4]);
  world.sceneTitle=()=>maps[scene()].name;
  window.skillPower=(index,power)=>power*(1+(world.progress().skillLevels?.[index]||0)*.08);
  function portrait(ctx,service){if(window.creatureArt?.drawNpc(ctx,service))return;const image=npcBodies[scene()==='moon'?1:0];if(!ready(image))return;const width=36*image.naturalWidth/image.naturalHeight;ctx.drawImage(image,service.x-width/2,service.y-36,width,36);}
  function clanBuildings(id){return [
    {key:id==='sword'?'palace':'garden',x:1000,y:870,w:id==='sword'?350:300,solid:[-105,-30,105,-2]},
    {key:'school',x:650,y:805,w:170,solid:[-54,-22,54,-2]},
    {key:'portal',x:720,y:1240,w:80},
    {key:'arena',x:1530,y:710,w:240,ground:true},
    {key:'tower',x:1685,y:1330,w:110,solid:[-34,-20,34,-2]},
    {key:'statue',x:910,y:900,w:42},{key:'statue',x:1090,y:900,w:42}
  ];}
  function clanServices(id){return [
    {id:'mentor',name:maps[id].mentor+' · Sư phụ',x:1000,y:980,npc:true,color:maps[id].color},
    {id:'sectSkills',name:maps[id].dais+' · Truyền công',x:1200,y:1110,npc:true,color:maps[id].color},
    {id:'teleport',name:'Truyền tống · Thiên Vân Thành',x:720,y:1265,color:'#f4e1b8'},
    {id:'training',name:'Luyện công · Yêu thú',x:1550,y:1445,color:maps[id].color},
    {id:'boss',name:id==='sword'?'Thử thách Kiếm Linh':'Thử thách Nguyệt Linh',x:1530,y:745,color:'#efd0a0'}
  ];}
  // Nền lát trực tiếp bằng tile PNG gốc; cầu dùng nguyên ảnh asset MAP.
  const floorPatterns=new WeakMap();
  function paving(ctx){const tile=world.asset('tile');if(!tile)return null;if(!floorPatterns.has(ctx)){const pattern=ctx.createPattern(tile,'repeat');if(pattern)pattern.setTransform(new DOMMatrix().scale(48/tile.width,24/tile.height));floorPatterns.set(ctx,pattern);}return floorPatterns.get(ctx);}
  function drawBridge(ctx,pair){
    const path=bridgePath(pair),pattern=paving(ctx);if(!pattern)return;
    // Mask chỉ định phạm vi đường; toàn bộ mặt đường lấy từ ảnh gạch MAP.
    const edges=side=>path.map((point,i)=>{const before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)],dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;return {x:point.x-dy/length*24*side,y:point.y+dx/length*24*side};});
    const outline=[...edges(1),...edges(-1).reverse()];ctx.save();ctx.beginPath();outline.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.clip();ctx.fillStyle=pattern;ctx.fillRect(0,0,M,M);ctx.restore();
    // Giữ nguyên hình cầu, hạn chế phóng ảnh nhỏ thành cả đoạn đường dài.
    const length=dist(pair[0],pair[1]),span=Math.min(.5,190/length),center=.5;
    const p=bridgePlacement([bridgePoint(bridgePlacement(pair),center-span/2),bridgePoint(bridgePlacement(pair),center+span/2)]);
    if(!p.img)return;ctx.save();ctx.translate(p.a.x,p.a.y);ctx.rotate(p.angle);renderArtwork(ctx,p.img,-p.width*.12,-p.height*.65,p.width,p.height);ctx.restore();
  }
  drawGround=function(cx,cy,vw,vh){g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';const pattern=paving(g);
    if(scene()==='hub'){const c=world.city;g.beginPath();g.rect(c.left,c.top,c.right-c.left,c.bottom-c.top);g.clip();if(pattern){g.fillStyle=pattern;g.fillRect(c.left,c.top,c.right-c.left,c.bottom-c.top);}g.restore();return;}
    // Khoảng trống là màu nền, không dựng núi / mặt nước / đường bằng vector.
    g.fillStyle=scene()==='moon'?'#112a43':'#213c43';g.fillRect(cx,cy,vw,vh);
    if(scene()==='sword')for(const [x,y]of [[650,590],[1300,950],[1100,1500]])world.sprite(g,'cloud',x,y,420,undefined,.35);
    for(const i of islands)if(i!==islands[0]){const img=world.asset('island');if(img){const width=i.rx*2+20,height=width*img.height/img.width;renderArtwork(g,img,i.x-width/2,i.y-height*.32,width,height);}}
    if(pattern)for(const i of islands){g.save();g.beginPath();g.ellipse(i.x,i.y,i.rx,i.ry,0,0,Math.PI*2);g.clip();g.fillStyle=pattern;g.fillRect(i.x-i.rx,i.y-i.ry,i.rx*2,i.ry*2);g.restore();}
    for(const pair of bridges)drawBridge(g,pair);g.restore();
  };
  function ring(ctx,image,x,y,w,h,alpha=1){if(!ready(image))return;ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(image,x-w/2,y-h/2,w,h);ctx.restore();}
  function weapon(ctx,image,x,y,height,rotation=0,alpha=1){if(!ready(image))return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha*=alpha;ctx.shadowColor=scene()==='moon'?'#c9efff':'#99f1d3';ctx.shadowBlur=9;const width=height*image.naturalWidth/image.naturalHeight;ctx.drawImage(image,-width/2,-height/2,width,height);ctx.restore();}
  function moon(ctx,x,y,r,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();
    if(ready(moonArt))ctx.drawImage(moonArt,.48*moonArt.naturalWidth,.14*moonArt.naturalHeight,.087*moonArt.naturalWidth,.25*moonArt.naturalHeight,x-r,y-r,r*2,r*2);
ctx.restore();
  }
  const oldDetails=world.drawGroundDetails;
  world.drawGroundDetails=function(ctx,cx,cy,vw,vh){
    if(scene()==='hub'){
      world.sprite(ctx,'platform',1000,1144,160,96);for(const b of world.buildings)if(b.ground)world.sprite(ctx,b.key,b.x,b.y,b.w);return;
    }
    const id=scene();
    for(const i of islands){if(Math.abs(i.x-P.x)>vw+i.rx||Math.abs(i.y-P.y)>vh+i.ry)continue;
      if(i===islands[0])world.sprite(ctx,'platform',i.x,i.y+45,230,138,.9);
    }
    if(id==='sword'){
      ring(ctx,swordRing,1000,1100,185,110,.6);
      // Hàng trăm kiếm khí nhỏ tạo silhouette vòng đài, không phủ lên nhân vật.
      for(let i=0;i<48;i++){const a=i*Math.PI*2/48,r=300;weapon(ctx,swordImage,1000+Math.cos(a)*r,1100+Math.sin(a)*r*.57-12,24,Math.PI,.65);}
    }else{
      const bright=P.ap?.w===1&&dist(P,islands[0])<60;
      ring(ctx,moonRing,1000,1100,bright?210:190,120,bright?.8:.5);
      for(let i=0;i<3;i++){const a=elapsed*.3+i*Math.PI*2/3;weapon(ctx,moonWeapon,1000+Math.cos(a)*265,1100+Math.sin(a)*150-14,31,elapsed*.2,.7);}
      moon(ctx,1430,845,100,.95);
      ctx.save();ctx.translate(1430,1120);ctx.scale(1,.22);moon(ctx,0,0,100,.2);ctx.restore();
      for(const [x,y]of [[1310,1150],[1170,1380],[740,1070]])world.sprite(ctx,'pond',x,y,110,45,.9);
    }
    for(const b of world.buildings)if(b.ground)world.sprite(ctx,b.key,b.x,b.y,b.w);
  };
  const oldActors=world.queueActors;
  const decorations={sword:[],moon:[]};
  for(const id of ['sword','moon']){
    for(const [x,y]of [[715,1050],[1285,1060],[760,1200],[1260,1190]])decorations[id].push({key:'sakura',x,y,w:65});
    for(const [x,y]of [[830,965],[1210,965],[1230,1200]])decorations[id].push({key:'lantern',x,y,w:18});
  }
  islands.forEach((i,n)=>{
    if(n===0)return;
    decorations.moon.push({key:'sakura',x:i.x-i.rx*.6,y:i.y-30,w:105},{key:'moonFall',x:i.x+i.rx*.55,y:i.y+150,w:70});
  });
  world.queueActors=function(items,cx,cy,vw,vh){if(scene()==='hub')return oldActors(items,cx,cy,vw,vh);
    for(const item of [...world.buildings.filter(b=>!b.ground),...decorations[scene()]])if(item.x>cx-item.w&&item.x<cx+vw+item.w&&item.y>cy-40&&item.y<cy+vh+item.w)items.push([item.depth??item.y,()=>world.sprite(g,item.key,item.x,item.y,item.w)]);
    for(const service of world.services)if(service.npc)items.push([service.y,()=>portrait(g,service)]);
    if(scene()==='sword')items.push([965,()=>{
      weapon(g,swordImage,1000,755,390,Math.PI,.95);
    }]);
  };
  function generate(index){const id=scene();if(id==='hub')return;
    if(world.generateFarm)return world.generateFarm(index);
    const island=index%3===0?islands[2]:islands[3],a=index*2.39996,r=55+(index%4)*35,pool=id==='sword'?[0,3,4,0]:[1,3,1,4],t=pool[index%pool.length];
    E[index]={t,x:island.x+Math.cos(a)*r,y:island.y+Math.sin(a)*r*.5,hx:island.x+Math.cos(a)*r,hy:island.y+Math.sin(a)*r*.5,hp:T[t].hp,dead:0,cd:.5,fr:0,fl:0,worldMap:true,map:id};
  }
  spawn=generate;
  function sceneSwitch(id,initial=false){
    if(!maps[id])return msg('Khu vực này chưa mở.');
    if(!initial&&!world.progress().tutorial&&id!==scene())return msg('Hoàn tất hướng dẫn với Sư phụ trước khi truyền tống.');
    if(world.state.arena)world.stopArena();challenge.active=null;
    enemyCache[scene()]=scene()==='hub'?[]:E.filter(e=>e.worldMap&&!e.arena&&!e.challenge);
    world.state.scene=id;P.world.map=id;
    world.buildings.splice(0,world.buildings.length,...(id==='hub'?hubBuildings:clanBuildings(id)).map(b=>({...b})));
    world.services.splice(0,world.services.length,...(id==='hub'?hubServices:clanServices(id)).map(s=>({...s})));
    E=enemyCache[id]||[];if(id!=='hub'&&enemyCache[id]===null){E=[];for(let i=0;i<(world.farmPopulation?.()||24);i++)generate(i);enemyCache[id]=E;}
    classCombat.onRespawn();B.length=SP.length=V.length=LT.length=X.length=PT.length=0;
    P.x=maps[id].spawn.x;P.y=maps[id].spawn.y;P.med=0;P.sl=0;P.acd=.3;K={};ptr=null;
    kiemCombat.state.aim=moonCombat.state.aim=null;skillAim.state.visible=false;world.state.near=null;
    if(initial){world.state.guideStart={x:P.x,y:P.y};world.state.guideMove=world.state.guideSkill=false;}
    dialog.close();world.updateInterface();saveCharacter();msg(maps[id].name+' · '+(id==='hub'?'Hub an toàn. Gặp Vân Châu để nhận nhiệm vụ.':'Gặp Sư phụ ở sân phía tây hoặc đi tới khu luyện công.'));
  }
  world.switchScene=sceneSwitch;
  world.respawn=()=>{challenge.active=null;E=E.filter(e=>!e.challenge);P.x=maps[scene()].spawn.x;P.y=maps[scene()].spawn.y;};
  function mentor(){const p=world.progress();dialog.show(maps[scene()].mentor+' · Nhập môn','Luyện di chuyển và ngắm chiêu tại đài. Bốn bãi quái ở bốn hướng; truyền tống phía tây nam và đấu trường phía đông nam sân trung tâm.');
    if(!p.tutorial){dialog.line('Di chuyển: '+(world.state.guideMove?'Đã hoàn thành':'Chưa hoàn thành')+' · Học skill tại NPC trong thành sau khi nhập môn.');
      dialog.action('Hoàn tất hướng dẫn · +10 Linh Thạch',()=>{p.tutorial=true;P.gold+=10;P.hp=mhp();P.mp=mmp();saveCharacter();dialog.close();msg('Đã nhập môn. Tới Truyền Tống Trận phía tây nam để sang Thiên Vân Thành học kỹ năng.');},!world.state.guideMove);
    }
    if(!p.sectQuest)p.sectQuest={status:'none',kills:0};
    const q=p.sectQuest;if(q.status==='none'){dialog.line('Bài tập nhập môn: hạ 3 yêu thú tại bốn bãi luyện công. Thưởng 35 Linh Thạch và 20 đạo hạnh.');dialog.action('Nhận bài tập nhập môn',()=>{q.status='active';q.kills=0;saveCharacter();mentor();});}
    else if(q.status==='active'){dialog.line('Yêu thú: '+q.kills+'/3.');dialog.action('Nhận thưởng nhập môn',()=>{if(q.status!=='active'||q.kills<3)return;q.status='claimed';P.gold+=35;P.xp=Math.min(need()*3,P.xp+20);saveCharacter();mentor();},q.kills<3);}
    else dialog.line('Đã hoàn thành bài tập nhập môn. Hãy tới Thiên Vân Thành nhận nhiệm vụ Hộ thành.');
  }
  function teach(){const p=world.progress(),owner=scene()==='sword'?0:1,names=P.ap.w===0?['Phi Kiếm Quyết','Kiếm Ảnh Bộ','Bát Quái Kiếm Trận','Vạn Kiếm Quy Tông']:['Tam Nguyệt Trảm','Nguyệt Ảnh Bộ','Nguyệt Luân Trận','Minh Nguyệt Giáng Thế'];
    if(!p.skillLevels)p.skillLevels=[0,0,0,0];dialog.show(scene()==='sword'?'Truyền công · Vạn Kiếm Đài':'Truyền công · Minh Nguyệt Đài','Kỹ năng mở theo cảnh giới. Mỗi cấp tu luyện tăng 8% sát thương kỹ năng đó, tối đa 3 cấp.');
    names.forEach((name,i)=>{const level=p.skillLevels[i],cost=30*(level+1);dialog.line(name+' · '+R[i]+' · Tu luyện '+level+'/3');dialog.action('Tu luyện '+name+' · '+cost+' ◈',()=>{if(P.gold<cost){dialog.line('Chưa đủ Linh Thạch.');return;}P.gold-=cost;p.skillLevels[i]++;saveCharacter();teach();},owner!==P.ap.w||P.r<i||level>=3);});
    if(owner!==P.ap.w)dialog.line('Khách tông môn được tham quan; tu luyện kỹ năng tại tông môn của mình.');
    dialog.action('Ôn luyện · hồi đầy linh lực',()=>{P.mp=mmp();saveCharacter();dialog.close();});
  }
  function boss(){dialog.show(scene()==='sword'?'Bọ Ngựa Chúa · Thủ đài':'Nguyệt Thố Vương · Thủ hồ','Thử thách solo tại đảo đông bắc, cần Luyện Khí. Thắng nhận thêm 50 Linh Thạch. Rời đảo để dừng.');
    dialog.action('Bắt đầu thử thách tông môn',()=>{dialog.close();P.x=1530;P.y=740;P.hp=mhp();P.mp=mmp();classCombat.onRespawn();
      const e={t:2,skin:scene()==='sword'?'BoNgua':'Tho',name:scene()==='sword'?'Bọ Ngựa Chúa':'Nguyệt Thố Vương',x:1530,y:640,hx:1530,hy:640,hp:320,dead:0,cd:1,fr:0,fl:0,worldMap:true,challenge:true,map:scene()};E.push(e);challenge.active=e;msg('Thử thách bắt đầu. Ngắm kỹ năng và tránh tiếp xúc trực tiếp!');
    },P.r<1||!!challenge.active);
  }
  world.handleService=id=>{if(scene()==='hub')return false;if(id==='mentor'){mentor();return true;}if(id==='sectSkills'){teach();return true;}if(id==='boss'){boss();return true;}
    if(id==='training'){dialog.show('Khu luyện công','Yêu thú ở hai đảo phía đông. Di chuyển trên đài và cầu; skill có thể bay qua mặt nước / vực. Hạ yêu thú để kiếm đạo hạnh và Linh Thạch.');dialog.action('Về đài · hồi linh lực',()=>{P.x=START.x;P.y=START.y;P.mp=mmp();dialog.close();});return true;}
    return false;
  };
  const oldHit=hit;hit=function(e,power){const alive=!e.dead&&e.hp>0;oldHit(e,power);
    const q=world.progress().sectQuest;if(alive&&e.hp<=0&&e.worldMap&&!e.arena&&!e.challenge&&scene()!=='hub'&&q?.status==='active')q.kills=Math.min(3,q.kills+1);
  };
  const oldUp=up;
  up=function(dt){if(!paused()&&!dialog.isOpen()){elapsed+=dt;
      if(challenge.active){const e=challenge.active;if(e.dead||e.hp<=0){P.gold+=50;world.progress().bossWins=(world.progress().bossWins||0)+1;challenge.active=null;E=E.filter(q=>!q.challenge);saveCharacter();msg('Chiến thắng tông môn! +50 Linh Thạch.');}
        else if(!ellipse(P,islands[2])){challenge.active=null;E=E.filter(q=>!q.challenge);msg('Đã rời đảo thử thách.');}}
    }oldUp(dt);
  };
  world.renderMini=function(ctx,size){ctx.fillStyle=scene()==='moon'?'#142f50':'#213c3e';ctx.fillRect(0,0,size,size);ctx.save();ctx.scale(size/M,size/M);ctx.lineCap='round';ctx.strokeStyle='#c5cab2';ctx.lineWidth=24;
    if(scene()==='hub'){ctx.fillStyle='#d5cfb8';ctx.fillRect(world.city.left,world.city.top,world.city.right-world.city.left,world.city.bottom-world.city.top);world.services.forEach(s=>{ctx.fillStyle='#bd9862';ctx.beginPath();ctx.arc(s.x,s.y,16,0,Math.PI*2);ctx.fill();});}
    else{for(const pair of bridges){ctx.beginPath();bridgePath(pair).forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}ctx.fillStyle=scene()==='moon'?'#a8c2d2':'#8fac9b';islands.forEach(i=>{ctx.beginPath();ctx.ellipse(i.x,i.y,i.rx,i.ry,0,0,Math.PI*2);ctx.fill();});world.services.forEach(s=>{ctx.fillStyle=s.id==='teleport'?'#ffe3a4':'#68b9d0';ctx.beginPath();ctx.arc(s.x,s.y,18,0,Math.PI*2);ctx.fill();});}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(P.x,P.y,20,0,Math.PI*2);ctx.fill();ctx.restore();
  };
  world.openOverview=function(){dialog.show('Năm miền tiên lộ',maps[scene()].name+' · điểm trắng là vị trí hiện tại; điểm vàng là truyền tống.');const c=document.createElement('canvas');c.className='world-overview';c.width=c.height=360;$('world-content').appendChild(c);world.renderMini(c.getContext('2d'),360);
    Object.values(maps).forEach(m=>dialog.line(m.name+' · '+m.description));dialog.line('Sư phụ: sân phía tây · truyền công: phía đông · truyền tống: tây nam · luyện công: đảo đông nam · thử thách: đảo đông bắc.');dialog.line('Thiên Môn, Linh Mạch Cốc và Bí Cảnh sẽ mở ở phiên bản sau.');
  };
  const oldDraw=dr;dr=function(){oldDraw();if(paused()||scene()==='hub'||scene()==='arena'||world.customLayout)return;
    const {x:cx,y:cy}=gameCamera();g.save();g.setTransform(Z,0,0,Z,-cx*Z,-cy*Z);
    const label=scene()==='sword'?'VẠN KIẾM ĐÀI':'MINH NGUYỆT ĐÀI';g.font='12px Georgia,serif';g.textAlign='center';g.fillStyle=maps[scene()].color;g.globalAlpha=.8;g.fillText(label,1000,1260);

    g.restore();
  };
  const creator=$('ok').onclick;$('ok').onclick=()=>{creator();if(!P.ap||cr.style.display!=='none')return;world.progress().skillLevels=[0,0,0,0];sceneSwitch(world.sectMapFor(P.ap.w),true);};
  world.rebuild();
  // Khi chưa tạo nhân vật, chỉ tải nền hub; điểm xuất hiện do tông môn quyết định.
  world.state.scene='hub';
})();
