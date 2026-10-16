/* Minh Nguyệt Tông: ba lưỡi cong, bóng trăng, vùng kiểm soát và nguyệt thực. */
(function () {
  const NAMES=['Tam Nguyệt Trảm','Nguyệt Ảnh Bộ','Nguyệt Luân Trận','Minh Nguyệt Giáng Thế'];
  const FILES=['tamnguyettram','nguyetanhbo','nguyetluantran','minhnguyetgiangthe'];
  const COOLDOWNS=combatBalance.cooldowns(1),MANA=[9,12,22,38],COLOR='#bafaff';
  // Từng vùng của dải ảnh gốc 2172x724; không kéo nguyên cả atlas vào game.
  const CAST=[.265,.005,.18,.37],ARC=[.448,.025,.145,.34],IMPACT=[.005,.685,.15,.30];
  const GHOST=[.003,.28,.155,.61],APPEAR=[.807,.20,.191,.67];
  const FIELD=[.60,.005,.197,.485],MOON=[.48,.14,.087,.25],BEAM=[.497,.38,.045,.36];
  const ECLIPSE=[.807,.14,.19,.81];
  const state={cooldown:[0,0,0,0],flying:[],blink:null,ghosts:[],field:null,ultimate:null,flashes:[],slows:new Map(),aim:null,stamp:false};
  const active=()=>!!P.ap&&P.ap.w===1;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const live=e=>!e.dead&&e.hp>0;
  const ART=FILES.map(name=>{
    const img=new Image();img.onload=()=>refreshUI(true);img.onerror=()=>msg('Không tải được ảnh kỹ năng: '+name+'.png');
    img.src='CHARACTER/SkillSprites/Liem/'+name+'/01.png';return img;
  });
  const physical=new Image();physical.src='CHARACTER/Liem/VuKhi/vukhi.png';
  const ring=new Image();ring.src='CHARACTER/Liem/Vong/vong.png';
  const bodies={Nam:{},Nu:{}};for(const gender of ['Nam','Nu'])for(const name of ['truoc','sau','trai','phai']){bodies[gender][name]=new Image();bodies[gender][name].src='CHARACTER/Liem/'+gender+'/'+name+'.png';}
  const ready=img=>img.complete&&img.naturalWidth>0;
  function crop(ctx,img,rect,x,y,w,h,angle=0,alpha=1){
    const index=ART.indexOf(img);
    if(index>=0){
      const frame=rect===CAST?0:rect===ARC?3:rect===IMPACT?5:rect===GHOST?1:rect===APPEAR?2:rect===FIELD?3:rect===MOON?1:rect===BEAM?2:rect===ECLIPSE?4:0;
      skillSprites.draw(ctx,1,index,frame,x,y,w,h,angle,alpha);return;
    }
    if(!ready(img))return;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
    const scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),width=img.naturalWidth*scale,height=img.naturalHeight*scale;
    ctx.drawImage(img,-width/2,-height/2,width,height);ctx.restore();
  }

  function moonBlade(ctx,x,y,slot,angle=0,alpha=1){
    const size=slot===2?34:25;
    spellActors.projectile(ctx,1,x,y,angle,tm+slot*.7,size*1.2,alpha);
  }
  function camera(){const vw=W/Z,vh=H/Z;return gameCamera(vw,vh);}
  cv.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse')return;
    const b=cv.getBoundingClientRect(),c=camera();
    state.aim={x:c.x+(event.clientX-b.left)/b.width*c.vw,y:c.y+(event.clientY-b.top)/b.height*c.vh};
  });
  function movement(){
    let x=(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0),y=(K.s||K.arrowdown?1:0)-(K.w||K.arrowup?1:0);
    if(ptr){x=ptr.x-innerWidth/2;y=ptr.y-innerHeight/2;if(Math.hypot(x,y)<=24)x=y=0;}
    const d=Math.hypot(x,y);return d?{x:x/d,y:y/d}:null;
  }
  function target(range=240){
    let requested=state.aim;
    if(!requested){const move=movement();const dir=move||{x:P.dir===2?P.f:0,y:P.dir===1?-1:P.dir===2?0:1};
      requested={x:P.x+dir.x*(move?range:Math.min(range,150)),y:P.y+dir.y*(move?range:Math.min(range,150))};}
    const d=distance(requested,P)||1,s=Math.min(1,range/d);
    return{x:clamp(P.x+(requested.x-P.x)*s,20,M-20),y:clamp(P.y+(requested.y-P.y)*s,20,M-20)};
  }
  function home(slot,dir=P.dir,facing=P.f,bob=0){
    const source=window.characterWeapon.position(1,P.x,P.y,bob);
    return{x:source.x,y:source.y+20};
  }
  function orbit(slot,field,age=field.age){const a=age*1.8+slot*Math.PI*2/3;return{x:field.x+Math.cos(a)*field.radius*.88,y:field.y+Math.sin(a)*field.radius*.58*.88};}
  function inside(point,zone,extra=0){return!!zone&&((point.x-zone.x)/(zone.radius+extra))**2+((point.y-zone.y)/(zone.radius*.58+extra))**2<=1;}
  const segmentDistance=(point,a,b)=>window.kiemCombat.segmentDistance(point,a,b);
  function quadratic(a,b,c,t){const n=1-t;return{x:n*n*a.x+2*n*t*b.x+t*t*c.x,y:n*n*a.y+2*n*t*b.y+t*t*c.y};}
  function strike(e,power){if(live(e))hit(e,power);}
  function area(zone,power){for(const e of E)if(live(e)&&inside(e,zone,T[e.t].s*.4))strike(e,power);}
  function launch(){
    const end=target(240),len=distance(end,P)||1,dir={x:(end.x-P.x)/len,y:(end.y-P.y)/len};
    for(let slot=0;slot<3;slot++){
      const start=home(slot),side=slot===0?-1:slot===1?1:0;
      const bend=side*Math.min(85,len*.42),control={x:(start.x+end.x)/2-dir.y*bend,y:(start.y+end.y)/2+dir.x*bend};
      state.flying.push({slot,x:start.x,y:start.y,start:{...start},end:{...end},control,dir,side,age:0,returning:false,outHits:new Set(),backHits:new Set(),trail:[],power:window.skillPower?.(0,atk())??atk(),angle:0});
    }
    const source=home(0);state.flashes.push({kind:'cast',x:source.x,y:source.y-20,age:0,duration:.3});
  }
  function teleport(){
    const end=target(185),start={x:P.x,y:P.y},dir=P.dir===1?'sau':P.dir===2?(P.f<0?'trai':'phai'):'truoc';
    state.ghosts.push({...start,dir,age:0,exploded:false,power:window.skillPower?.(1,atk()*.8)??atk()*.8,radius:48});
    state.blink={start,end,age:0,duration:.22};
    const dx=end.x-P.x,dy=end.y-P.y;if(Math.abs(dx)>Math.abs(dy)){P.dir=2;P.f=dx<0?-1:1;}else if(dx||dy)P.dir=dy<0?1:0;
    P.x=end.x;P.y=end.y;K={};ptr=null;
  }
  function startField(){state.field={x:P.x,y:P.y,radius:102,age:0,duration:5.2,pulses:0,power:window.skillPower?.(2,atk())??atk(),source:home(0),contacts:[new Map(),new Map(),new Map()]};}
  function startUltimate(){
    const point=target(320),sources=Array.from({length:3},(_,slot)=>home(slot));
    state.flying.length=0;state.field=null;
    state.ultimate={...point,radius:132,sources,age:0,duration:4.25,lightHits:0,contacts:[new Map(),new Map(),new Map()],finished:false,power:window.skillPower?.(3,atk())??atk()};
  }
  const previousSkill=skill,previousCast=cast,previousUp=up,previousDraw=dr,previousChar=drawChar;
  skill=function(index){
    if(!active())return previousSkill(index);
    if(paused()||!Number.isInteger(index)||index<0||index>3||state.blink)return;
    if(!window.gmTest?.enabled&&P.r<index)return msg('Cần đạt '+R[index]+' để dùng '+NAMES[index]+'.');
    if(state.cooldown[index]>0||P.mp<MANA[index])return;
    if(state.ultimate)return msg('Đang thi triển Minh Nguyệt Giáng Thế.');
    if((index===0||index===2)&&state.flying.length)return msg('Chờ Nguyệt Nhận trở về để thi triển.');
    if(index===1&&window.worldMap?.canWalk&&!worldMap.canWalk(target(185)))return msg('Chọn điểm dịch chuyển trên đài hoặc cầu.');
    P.med=0;P.mp-=MANA[index];state.cooldown[index]=COOLDOWNS[index];
    [launch,teleport,startField,startUltimate][index]();msg(NAMES[index]+'!');refreshUI();
  };
  cast=function(){if(active())skill(0);else previousCast();};$('bs').onclick=()=>cast();
  function advanceBlades(dt){
    for(let i=state.flying.length-1;i>=0;i--){
      const b=state.flying[i],old={x:b.x,y:b.y};b.age+=dt;
      let pos;
      if(!b.returning){pos=quadratic(b.start,b.control,b.end,clamp(b.age/.62,0,1));}
      else{
        const end=home(b.slot);
        const control=b.controlReturn||{x:(b.startReturn.x+end.x)/2,y:(b.startReturn.y+end.y)/2};
        pos=quadratic(b.startReturn,control,end,clamp(b.age/.65,0,1));
      }
      b.x=pos.x;b.y=pos.y;b.angle=Math.atan2(pos.y-old.y,pos.x-old.x)+tm*3;
      // Mỗi lưỡi gây tối đa một hit mỗi chiều, không gây damage mỗi frame.
      if(!b.visualOnly){const hits=b.returning?b.backHits:b.outHits;
        for(const e of E)if(live(e)&&!hits.has(e)&&segmentDistance(e,old,b)<=T[e.t].s+10){
          hits.add(e);strike(e,b.power*(b.returning?(b.slot===2?.8:.65):(b.slot===2?1.25:1)));
          state.flashes.push({kind:'impact',x:e.x,y:e.y-12,age:0,duration:.23});
        }
      }
      b.trail.push(old);if(b.trail.length>12)b.trail.shift();
      if(!b.returning&&b.age>=.62){
        b.returning=true;b.age=0;b.startReturn={x:b.x,y:b.y};
        const end=home(b.slot),bend=-b.side*75;
        b.controlReturn={x:(b.x+end.x)/2-b.dir.y*bend,y:(b.y+end.y)/2+b.dir.x*bend};
      }else if(b.returning&&b.age>=.65)state.flying.splice(i,1);
    }
  }
  function contact(slot,zone,old,pos,power,interval){
    const history=zone.contacts[slot];
    for(const e of E)if(live(e)&&segmentDistance(e,old,pos)<=T[e.t].s+13&&zone.age-(history.get(e)??-100)>=interval){history.set(e,zone.age);strike(e,power);}
  }
  function stormPosition(slot,u,age=u.age){const t=age-1.55,a=t*6+slot*Math.PI*2/3,r=20+65*(.5+.5*Math.sin(t*7+slot*2));return{x:u.x+Math.cos(a)*r,y:u.y+Math.sin(a)*r*.58};}
  function advance(dt){
    for(let i=0;i<4;i++)state.cooldown[i]=Math.max(0,state.cooldown[i]-dt);
    for(const [e,time]of state.slows){if(!live(e)||time<=dt)state.slows.delete(e);else state.slows.set(e,time-dt);}
    advanceBlades(dt);
    if(state.blink){state.blink.age+=dt;if(state.blink.age>=state.blink.duration)state.blink=null;}
    for(let i=state.ghosts.length-1;i>=0;i--){
      const ghost=state.ghosts[i];ghost.age+=dt;
      if(!ghost.exploded&&ghost.age>=.5){ghost.exploded=true;for(const e of E)if(live(e)&&inside(e,ghost,T[e.t].s*.4)){strike(e,ghost.power);state.slows.set(e,1.5);}}
      if(ghost.age>=1.0)state.ghosts.splice(i,1);
    }
    const field=state.field;
    if(field){
      const oldAge=field.age;field.age+=dt;
      while(field.pulses<5&&field.age>=field.pulses+1){field.pulses++;area(field,field.power*.7);state.flashes.push({kind:'pulse',x:field.x,y:field.y,age:0,duration:.32});}
      for(let slot=0;slot<3;slot++)if(!state.flying.some(b=>b.slot===slot))contact(slot,field,orbit(slot,field,oldAge),orbit(slot,field),field.power*.55,.6);
      if(field.age>=field.duration){
        for(let slot=0;slot<3;slot++)if(!state.flying.some(b=>b.slot===slot)){const pos=orbit(slot,field);state.flying.push({slot,...pos,age:0,returning:true,startReturn:pos,trail:[],angle:0,visualOnly:true});}
        state.field=null;
      }
    }
    const u=state.ultimate;
    if(u){
      const oldAge=u.age;u.age+=dt;
      while(u.lightHits<2&&u.age>=.75+u.lightHits*.5){u.lightHits++;area(u,u.power*.6);}
      if(u.age>=1.55&&u.age<3.05){
        for(let slot=0;slot<3;slot++)contact(slot,u,stormPosition(slot,u,Math.max(1.55,oldAge)),stormPosition(slot,u),u.power*.65,.32);
      }
      if(!u.finished&&u.age>=3.25){u.finished=true;area(u,u.power*4.8);shk=Math.max(shk,5);}
      if(u.age>=u.duration){
        for(let slot=0;slot<3;slot++){const pos=stormPosition(slot,u,3.05);state.flying.push({slot,...pos,age:0,returning:true,startReturn:pos,trail:[],angle:0,visualOnly:true});}
        state.ultimate=null;
      }
    }
    for(let i=state.flashes.length-1;i>=0;i--){state.flashes[i].age+=dt;if(state.flashes[i].age>=state.flashes[i].duration)state.flashes.splice(i,1);}
    for(let i=0;i<4;i++)SC[i]=state.cooldown[i];P.scd=state.cooldown[0];
  }
  up=function(dt){previousUp(dt);if(!active()||paused())return;advance(dt);refreshUI();};

  function drawRing(ctx,zone,alpha=1){
    spellMotion.formation(ctx,1,zone,alpha);
    spellActors.field(ctx,1,zone,alpha);
    // Hai lớp khí dạng elip xoay ngược chiều; giữa là Nguyệt Luân phát sáng.
    ctx.save();ctx.translate(zone.x,zone.y);ctx.scale(1,.58);ctx.globalAlpha*=alpha;
    for(let layer=0;layer<2;layer++){
      ctx.save();ctx.rotate(zone.age*(layer===0?.5:-.7));ctx.strokeStyle=layer===0?'#e7fdff':'#81dcff';ctx.lineWidth=1;
      for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,zone.radius*(layer===0?.9:.68),i*Math.PI*2/3,i*Math.PI*2/3+1.1);ctx.stroke();}ctx.restore();
    }
    ctx.restore();
    glowFor(ctx,zone.x,zone.y,zone.radius*.35,COLOR,(.1+.1*Math.sin(zone.age*4)**2)*alpha);
  }
  function glowFor(ctx,x,y,r,color,alpha){
    ctx.save();const q=ctx.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,color);q.addColorStop(1,'rgba(0,0,0,0)');ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=alpha;ctx.fillStyle=q;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  function drawGround(ctx){
    if(!active())return;
    if(state.field){const f=state.field,alpha=clamp(f.age/.3,0,1)*clamp((f.duration-f.age)/.4,0,1);drawRing(ctx,f,alpha*.85);}
    const u=state.ultimate;if(u)drawRing(ctx,{...u,radius:u.radius*(.6+.4*clamp(u.age/.6,0,1))},clamp((u.duration-u.age)/.5,0,1)*.9);
  }
  function drawFlying(ctx){
    for(const b of state.flying){
      window.characterWeapon.trail(ctx,b.trail,b,20,COLOR);
      moonBlade(ctx,b.x,b.y-20,b.slot,b.angle);

    }
  }
  function drawGhost(ctx,ghost){
    const alpha=ghost.exploded?clamp((1-ghost.age)/.5,0,1)*.4:.35;
    crop(ctx,bodies[P.ap?.gender==='Nu'?'Nu':'Nam'][ghost.dir],[0,0,1,1],ghost.x,ghost.y-21,42,42,0,alpha);
    crop(ctx,ART[1],GHOST,ghost.x,ghost.y-22,43,62,0,alpha+.15);
    if(ghost.exploded){const p=clamp((ghost.age-.5)/.5,0,1);ctx.save();ctx.globalAlpha=(1-p)*.8;ctx.strokeStyle=COLOR;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(ghost.x,ghost.y,48*p,28*p,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  }
  function drawUltimate(ctx,u){
    const t=u.age,duration=u.duration||4,dark=t>=3.05&&t<3.25;
    spellMotion.charge(ctx,1,u.x,u.y-25,t,.65);
    skillSprites.animate(ctx,1,3,t,duration,u.x,u.y-58,190,200,3.25,dark?.18:.9);
    if(t>=3.25)spellMotion.impact(ctx,1,u.x,u.y,t-3.25,u.radius,.7);
  }
  function drawEffects(ctx){
    if(state.field){const f=state.field;for(let slot=0;slot<3;slot++)if(!state.flying.some(b=>b.slot===slot)){
      const p=orbit(slot,f),progress=clamp(f.age/.35,0,1);
      moonBlade(ctx,f.source.x+(p.x-f.source.x)*progress,f.source.y-20+(p.y-18-f.source.y+20)*progress,slot,f.age*2);
    }}
    if(!window.voidStep?.outlineOnly)for(const ghost of state.ghosts)drawGhost(ctx,ghost);
    if(state.blink&&!window.voidStep?.outlineOnly){const b=state.blink,p=b.age/b.duration;crop(ctx,ART[1],APPEAR,b.end.x,b.end.y-23,48,65,0,1-p);
      for(let i=0;i<8;i++)glowFor(ctx,b.start.x+(b.end.x-b.start.x)*i/8,b.start.y-18+(b.end.y-b.start.y)*i/8,2,COLOR,(1-p)*.35);}
    drawFlying(ctx);if(state.ultimate)drawUltimate(ctx,state.ultimate);
    for(const f of state.flashes){const p=f.age/f.duration;
      spellActors.impact(ctx,1,f.x,f.y,f.age,f.kind==='pulse'?45:28,f.duration);
    }
  }
  dr=function(){previousDraw();if(!active())return;const c=camera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);drawEffects(g);g.restore();};
  drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap,rc){ctx.save();if(ap?.w===1&&state.blink&&ctx===g)ctx.globalAlpha=state.blink.age<.08?.06:clamp(state.blink.age/.22,.1,1);previousChar(ctx,x,y,dir,facing,moving,phase,attacking,ap,rc);ctx.restore();};
  function drawBackMoons(ctx,x,y,dir,facing,bob){
    return false; // Giữ nguyên lung.png, không thay bằng ba nguyệt nhận.
  }
  function refreshUI(force=false){
    if(!active()){state.stamp=false;return;}
    if(force||!state.stamp){state.stamp=true;
      [...sb.children].forEach((button,i)=>{button.innerHTML='<canvas class="ic" width="192" height="192"></canvas><small>'+(i+1)+'</small><span class="remaining"></span><u></u>';
        button.style.borderColor='#b9edf5';button.title=NAMES[i]+' · '+MANA[i]+' linh lực · '+COOLDOWNS[i]+'s · '+R[i];button.setAttribute('aria-label',NAMES[i]);
        const icon=button.querySelector('canvas').getContext('2d');icon.setTransform(3,0,0,3,0,0);crop(icon,ART[i],[CAST,APPEAR,FIELD,MOON][i],32,32,60,60);});
      $('bs').textContent='Tam Nguyệt (Space)';$('tip').textContent='WASD / chạm kéo: di chuyển · chuột: ngắm · 1/Space: Tam Nguyệt · 2: Teleport · 3: Nguyệt Luân · 4: Giáng Thế · Q: đả tọa · B: đột phá';
    }
    [...sb.children].forEach((button,i)=>{const cd=state.cooldown[i];button.lastChild.style.height=(cd/COOLDOWNS[i]*100)+'%';button.querySelector('.remaining').textContent=cd>0?cd.toFixed(1):'';
      const locked=window.cultivation?!cultivation.canUse(i):P.r<i;button.classList.toggle('lk',locked);button.classList.toggle('lm',P.mp<MANA[i]);button.disabled=locked||P.mp<MANA[i]||cd>0||!!state.ultimate;});
  }
  const createCharacter=$('ok').onclick;$('ok').onclick=()=>{createCharacter();if(P.ap)refreshUI(true);};
  window.moonCombat={isActive:active,isDashing:()=>active()&&!!state.blink,drawGroundEffects:drawGround,drawBackMoons,refreshUI,state,
    enemySpeed:e=>{if(!active())return 1;let speed=state.slows.has(e)?.65:1;if(inside(e,state.field))speed=Math.min(speed,.7);
      const u=state.ultimate;if(u&&inside(e,u)&&u.age>=.55)speed=Math.min(speed,u.age<1.55?.35:.7);return speed;},
    onRespawn:()=>{state.flying.length=0;state.blink=null;state.ghosts.length=0;state.field=null;state.ultimate=null;state.flashes.length=0;state.slows.clear();}
  };
  const sword=window.kiemCombat,moon=window.moonCombat;
  window.classCombat={isDashing:()=>sword.isDashing()||moon.isDashing(),enemySpeed:e=>active()?moon.enemySpeed(e):sword.enemySpeed(e),
    drawGroundEffects:ctx=>{sword.drawGroundEffects(ctx);moon.drawGroundEffects(ctx);},onRespawn:()=>{sword.onRespawn();moon.onRespawn();}};
  refreshUI(true);
})();
