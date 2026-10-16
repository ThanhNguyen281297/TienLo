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
  function react(e){const s=state(e),dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;
    if(s.hurt<=0||s.hurtAge>=.16){s.hurt=.32;s.hurtAge=0;}
    s.impact=.2;s.recoilX=dx/d*(e.t===2||e.elite?1.6:4);s.recoilY=dy/d*2;
  }
  const skin=e=>species[e.skin||T[e.t].skin]||species.BoNgua;
  function frame(e){const kind=skin(e),s=state(e);let mode='idle',age=clock+s.phase,fps=6;
    if(e.corpse){mode='death';age=e.age;fps=8;}
    else if(window.fieldEffects?.immobilized(e)){mode='idle';age=0;}
    else if(s.hurt>0){mode='hurt';age=s.hurtAge;fps=13;}
    else if(s.attack>0&&!window.fieldEffects?.blocksAttack(e)){mode='attack';age=s.attackAge;fps=10;}
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
  // Rasterize at the actual screen resolution once per pose/zoom. Contrast is
  // applied to the art, never as a per-frame filter over the whole battle.
  const rasters=new WeakMap();let contactShadow;
  function raster(image,height){
    const key=Math.max(16,Math.min(1024,Math.round(height*Z/2)*2));
    let variants=rasters.get(image);if(!variants){variants=new Map();rasters.set(image,variants);}
    if(variants.has(key))return variants.get(key);
    const c=document.createElement('canvas');c.height=key;c.width=Math.max(1,Math.round(key*image.naturalWidth/image.naturalHeight));
    const ctx=c.getContext('2d');ctx.imageSmoothingQuality='high';ctx.filter='contrast(1.09) saturate(1.06)';ctx.drawImage(image,0,0,c.width,c.height);ctx.filter='none';
    const flash=document.createElement('canvas');flash.width=c.width;flash.height=c.height;
    const fg=flash.getContext('2d');fg.drawImage(c,0,0);fg.globalCompositeOperation='source-in';fg.fillStyle='#fff0d5';fg.fillRect(0,0,c.width,c.height);
    const entry={key,image:c,flash};variants.set(key,entry);
    if(variants.size>4)variants.delete(variants.keys().next().value);return entry;
  }
  function shadow(ctx,x,y,width){
    if(!contactShadow){contactShadow=document.createElement('canvas');contactShadow.width=96;contactShadow.height=24;
      const c=contactShadow.getContext('2d');c.scale(1,.25);const gradient=c.createRadialGradient(48,48,0,48,48,48);gradient.addColorStop(0,'#07141a45');gradient.addColorStop(1,'#07141a00');c.fillStyle=gradient;c.fillRect(0,0,96,96);}
    ctx.drawImage(contactShadow,x-width/2,y-3,width,8);
  }
  mon=function(e){const f=frame(e);if(!ready(f.image))return;
    const height=f.kind.height*(e.t===2?1.45:e.elite?1.2:1),rect=f.rect,scale=height/f.sourceHeight*1.12,width=rect.w*scale;
    const bob=(e.skin||T[e.t].skin)==='Doi'&&!e.corpse?Math.sin(clock*5+state(e).phase)*2-5:0;
    const sprite=raster(f.image,f.image.naturalHeight*scale);
    const drawX=-width/2-f.padding*scale,drawY=-(rect.h+f.padding)*scale;
    g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';if(e.corpse)g.globalAlpha=Math.max(0,Math.min(1,(.95-e.age)*3));
    shadow(g,e.x,e.y,Math.max(14,width*.72));
    // The visible pose ends at the same ground anchor for idle, move and hurt.
    const reaction=state(e),kick=Math.sin(Math.min(1,(reaction.impact||0)/.2)*Math.PI);
    g.translate(Math.round((e.x+(reaction.recoilX||0)*kick)*Z)/Z,Math.round((e.y+bob+(reaction.recoilY||0)*kick)*Z)/Z);if(P.x>e.x+3)g.scale(-1,1);
    g.drawImage(sprite.image,drawX,drawY,f.image.naturalWidth*scale,f.image.naturalHeight*scale);
    const hurt=.2-(state(e).impact||0);
    if(!e.corpse&&state(e).hurt>0&&hurt<.1){g.globalAlpha*=.35*(1-hurt/.1);g.drawImage(sprite.flash,drawX,drawY,f.image.naturalWidth*scale,f.image.naturalHeight*scale);}
    g.restore();if(e.corpse)return;
    window.fieldEffects?.draw(g,e,height);
    const selected=window.cultivation?.basicSelection().target===e;
    const boss=e.t===2||e.elite,barWidth=boss?50:34,y=e.y-height*.98+bob,ratio=Math.max(0,Math.min(1,e.hp/(e.maxHp||T[e.t].hp)));
    g.save();g.fillStyle=selected?'#ffe2a3':'#14202a';g.fillRect(e.x-barWidth/2-1,y-4,barWidth+2,5);
    g.fillStyle='#192830';g.fillRect(e.x-barWidth/2,y-3,barWidth,3);
    const hp=g.createLinearGradient(0,y-3,0,y);hp.addColorStop(0,boss?'#ffd08a':'#e88c7a');hp.addColorStop(1,boss?'#bf783c':'#a74440');g.fillStyle=hp;g.fillRect(e.x-barWidth/2,y-3,barWidth*ratio,3);
    g.font=(boss?'600 9px':'8px')+' Arial,sans-serif';g.textAlign='center';g.strokeStyle='#112029';g.lineWidth=2;
    const name=(boss?'◆ ':'')+(e.name||T[e.t].n);g.strokeText(name,e.x,y-7);g.fillStyle=selected?'#fff0bc':boss?'#ffe2a4':'#ebf2ec';g.fillText(name,e.x,y-7);g.restore();
  };
  const previousHit=hit;
  hit=function(e,power){if(e.dead||e.hp<=0)return;const s=state(e),origin={x:e.x,y:e.y};previousHit(e,power);
    if(e.worldMap){const end=worldMap.traceMove(origin,e);e.x=end.x;e.y=end.y;}
    if(e.hp<=0){corpses.push({...e,corpse:true,age:0});s.attack=0;}
    else react(e);
  };
  const previousUp=up;
  up=function(dt){if(paused()||worldMap.dialog.isOpen())return previousUp(dt);
    if(activeScene!==worldMap.state.scene){corpses.length=0;activeScene=worldMap.state.scene;}
    clock+=dt;for(const e of E){const s=state(e);s.attack=Math.max(0,s.attack-dt);s.hurt=Math.max(0,s.hurt-dt);s.attackAge+=dt;s.hurtAge+=dt;s.impact=Math.max(0,(s.impact||0)-dt);}
    for(let i=corpses.length-1;i>=0;i--){corpses[i].age+=dt;if(corpses[i].age>=.95)corpses.splice(i,1);}
    const positions=new Map(E.map(e=>[e,{x:e.x,y:e.y}]));previousUp(dt);
    for(const e of E){const old=positions.get(e);state(e).moving=!!old&&Math.hypot(e.x-old.x,e.y-old.y)>.01;}
  };
  const previousActors=worldMap.queueActors;
  worldMap.queueActors=function(items,cx,cy,vw,vh){previousActors(items,cx,cy,vw,vh);for(const e of corpses)if(e.x>cx-80&&e.x<cx+vw+80&&e.y>cy-80&&e.y<cy+vh+80)items.push([e.y,()=>mon(e)]);};
  const previousRespawn=classCombat.onRespawn;classCombat.onRespawn=function(){corpses.length=0;return previousRespawn();};
  const css=document.createElement('style');css.textContent='.v{background:none!important}#npc-dialog-portrait{float:right;width:70px;height:95px;object-fit:contain;margin:0 22px 10px 16px;filter:drop-shadow(0 3px 5px #0005)}';document.head.appendChild(css);
  window.creatureArt={reaction:state,species,npcImages,corpses,frame,drawNpc,decorateDialog,npcHeight:s=>npcRoles[s.id]?(s.id==='rank'?68:60):36,
    onNetworkDamage(e,dead){const s=state(e);react(e);e.fl=.1;if(dead&&!corpses.some(c=>c.id===e.id&&c.age<.95)){corpses.push({...e,corpse:true,age:0});s.attack=0;}},
    onAttack(e){const s=state(e);s.attack=.6;s.attackAge=0;},ready:()=>Object.values(npcImages).every(ready)&&Object.values(species).every(s=>s.images.every(ready))};
})();
