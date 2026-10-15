/* NPC theo vai trò và monster sprite sheet: không đọc pixel Canvas. */
(function(){
  const ready=image=>image.complete&&image.naturalWidth>0;
  const image=src=>{const img=new Image();img.src=src;return img;};
  const npcImages=Object.fromEntries(['nhiemvu','thoren','dautruong','bxh'].map(key=>[key,image('NPC/'+key+'.png')]));
  const npcRoles={quest:'nhiemvu',shop:'thoren',forge:'thoren',arena:'dautruong',rank:'bxh'};
  // 1 idle, 2 move, 3 attack, 4 hurt, 5 death (BoNgua/Tho).
  // Nhen/Doi: 1 idle/move, 2 attack, 3 hurt, 4 death. Hurt sheets have five frames.
  const species={
    BoNgua:{height:90,sheets:[6,6,6,5,6],idle:1,move:2,attack:3,hurt:4,death:5},
    Tho:{height:84,sheets:[6,6,6,5,6],idle:1,move:2,attack:3,hurt:4,death:5},
    Nhen:{height:76,sheets:[6,6,5,6],idle:1,move:1,attack:2,hurt:3,death:4},
    Doi:{height:84,sheets:[6,6,5,6],idle:1,move:1,attack:2,hurt:3,death:4}
  };
  for(const [key,kind]of Object.entries(species)){
    kind.poses=spriteCatalog.monsterFrames[key].map(sheet=>sheet.map(meta=>({...meta,image:image(artworkURL(meta.src))})));
    kind.images=kind.poses.flat().map(pose=>pose.image);
  }
  Object.assign(T[0],{n:'Bọ Ngựa',skin:'BoNgua',sp:40});
  Object.assign(T[1],{n:'Nguyệt Thố',skin:'Tho',sp:65,c:'#aadfff'});
  Object.assign(T[2],{n:'Huyết Nhện Vương',skin:'Nhen',sp:90,c:'#e76054'});
  T[3]={n:'Băng Dực Dơi',skin:'Doi',hp:40,at:6,xp:18,c:'#b4d9f1',s:12,sp:70};
  T[4]={n:'Huyết Nhện',skin:'Nhen',hp:80,at:10,xp:32,c:'#e65b4c',s:15,sp:48};
  const states=new WeakMap(),corpses=[];
  let clock=0,activeScene=worldMap.state.scene;
  function state(e){if(!states.has(e))states.set(e,{moving:false,attack:0,hurt:0,attackAge:0,hurtAge:0,phase:Math.abs(e.hx||0)%7});return states.get(e);}
  const skin=e=>species[e.skin||T[e.t].skin]||species.BoNgua;
  function frame(e){const kind=skin(e),s=state(e);let mode='idle',age=clock+s.phase,fps=6;
    if(e.corpse){mode='death';age=e.age;fps=8;}
    else if(s.hurt>0){mode='hurt';age=s.hurtAge;fps=13;}
    else if(s.attack>0){mode='attack';age=s.attackAge;fps=10;}
    else if(s.moving){mode='move';fps=9;}
    const sheet=kind[mode],count=kind.sheets[sheet-1],index=['hurt','attack','death'].includes(mode)?Math.min(count-1,Math.floor(age*fps)):Math.floor(age*fps)%count;
    const pose=kind.poses[sheet-1][index];
    return {kind,mode,sheet,index,image:pose.image,count,rect:pose.rect,sourceHeight:pose.sourceHeight,padding:pose.padding};
  }
  function drawNpc(ctx,service){const img=npcImages[npcRoles[service.id]];if(!img)return false;if(!ready(img))return true;
    const h=service.id==='rank'?68:60,w=h*img.naturalWidth/img.naturalHeight;
    ctx.save();ctx.fillStyle='rgba(10,24,28,.22)';ctx.beginPath();ctx.ellipse(service.x,service.y,12,4,0,0,Math.PI*2);ctx.fill();
    renderArtwork(ctx,img,service.x-w/2,service.y-h,w,h);ctx.restore();return true;
  }
  function decorateDialog(title){const key=title.includes('Thiên Vân Bảng')?'bxh':title.includes('Đấu trường')?'dautruong':title.includes('Luyện Khí')||title.includes('Bảo Khí')?'thoren':title.includes('Vân Châu')?'nhiemvu':null;
    let portrait=$('npc-dialog-portrait');if(portrait)portrait.remove();if(!key)return;
    portrait=document.createElement('img');portrait.id='npc-dialog-portrait';portrait.src=npcImages[key].src;portrait.alt='NPC '+title;portrait.width=70;portrait.height=95;$('world-title').before(portrait);
  }
  mon=function(e){const f=frame(e);if(!ready(f.image))return;
    const height=f.kind.height*(e.t===2?1.45:e.elite?1.2:1),rect=f.rect,scale=height/f.sourceHeight,width=rect.w*scale,bob=(e.skin||T[e.t].skin)==='Doi'&&!e.corpse?Math.sin(clock*5+state(e).phase)*2-5:0;
    g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';if(e.corpse)g.globalAlpha=Math.min(1,(.95-e.age)*3);
    g.fillStyle='rgba(6,15,21,.24)';g.beginPath();g.ellipse(e.x,e.y+3,Math.max(10,width*.38),4,0,0,Math.PI*2);g.fill();
    g.translate(Math.round(e.x*Z)/Z,Math.round((e.y+bob)*Z)/Z);if(P.x>e.x+3)g.scale(-1,1);renderArtwork(g,f.image,-width/2-f.padding*scale,-height*.93+(rect.y-f.padding)*scale,f.image.naturalWidth*scale,f.image.naturalHeight*scale);g.restore();
    if(e.corpse)return;
    const barWidth=e.t===2?58:34,y=e.y-height*.79+bob,ratio=Math.max(0,Math.min(1,e.hp/(e.maxHp||T[e.t].hp)));
    g.save();g.fillStyle='#14202add';g.fillRect(e.x-barWidth/2-1,y-4,barWidth+2,5);g.fillStyle=e.t===2?'#e6a853':'#cb6554';g.fillRect(e.x-barWidth/2,y-3,barWidth*ratio,3);
    g.font=(e.t===2?'bold 11px':'9px')+' Georgia,serif';g.textAlign='center';g.strokeStyle='#112029';g.lineWidth=2;const name=e.name||T[e.t].n;g.strokeText(name,e.x,y-7);g.fillStyle=e.t===2?'#ffe2a4':'#ebf2ec';g.fillText(name,e.x,y-7);g.restore();
  };
  const previousHit=hit;
  hit=function(e,power){if(e.dead||e.hp<=0)return;const s=state(e),origin={x:e.x,y:e.y};previousHit(e,power);
    if(e.worldMap){const end=worldMap.traceMove(origin,e);e.x=end.x;e.y=end.y;}
    if(e.hp<=0){corpses.push({...e,corpse:true,age:0});s.attack=0;}
    else{s.hurt=.38;s.hurtAge=0;}
  };
  const previousUp=up;
  up=function(dt){if(paused()||worldMap.dialog.isOpen())return previousUp(dt);
    if(activeScene!==worldMap.state.scene){corpses.length=0;activeScene=worldMap.state.scene;}
    clock+=dt;for(const e of E){const s=state(e);s.attack=Math.max(0,s.attack-dt);s.hurt=Math.max(0,s.hurt-dt);s.attackAge+=dt;s.hurtAge+=dt;}
    for(let i=corpses.length-1;i>=0;i--){corpses[i].age+=dt;if(corpses[i].age>=.95)corpses.splice(i,1);}
    const positions=new Map(E.map(e=>[e,{x:e.x,y:e.y}]));previousUp(dt);
    for(const e of E){const old=positions.get(e);state(e).moving=!!old&&Math.hypot(e.x-old.x,e.y-old.y)>.01;}
  };
  const previousActors=worldMap.queueActors;
  worldMap.queueActors=function(items,cx,cy,vw,vh){previousActors(items,cx,cy,vw,vh);for(const e of corpses)if(e.x>cx-80&&e.x<cx+vw+80&&e.y>cy-80&&e.y<cy+vh+80)items.push([e.y,()=>mon(e)]);};
  const previousRespawn=classCombat.onRespawn;classCombat.onRespawn=function(){corpses.length=0;return previousRespawn();};
  const css=document.createElement('style');css.textContent='.v{background:none!important}#npc-dialog-portrait{float:right;width:70px;height:95px;object-fit:contain;margin:0 22px 10px 16px;filter:drop-shadow(0 3px 5px #0005)}';document.head.appendChild(css);
  window.creatureArt={species,npcImages,corpses,frame,drawNpc,decorateDialog,npcHeight:s=>npcRoles[s.id]?(s.id==='rank'?68:60):36,
    onNetworkDamage(e,dead){const s=state(e);s.hurt=.25;s.hurtAge=0;e.fl=.1;if(dead&&!corpses.some(c=>c.id===e.id&&c.age<.95)){corpses.push({...e,corpse:true,age:0});s.attack=0;}},
    onAttack(e){const s=state(e);s.attack=.6;s.attackAge=0;},ready:()=>Object.values(npcImages).every(ready)&&Object.values(species).every(s=>s.images.every(ready))};
})();
