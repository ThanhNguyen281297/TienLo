/* Kiếm Tông: kiếm khí phát từ vũ khí, va chạm theo đoạn bay và animation dùng asset. */
(function () {
  const NAMES = ['Phi Kiếm Quyết', 'Kiếm Ảnh Bộ', 'Bát Quái Kiếm Trận', 'Vạn Kiếm Quy Tông'];
  const FILES = ['phikiemquyet', 'kiemanhbo', 'batquaikiemtran', 'vankiemquytong'];
  const COOLDOWNS = combatBalance.cooldowns(0), MANA = [8, 10, 20, 35];
  const CYAN = '#8ff4ff', TRIGRAMS = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
  // Vùng ảnh tính theo tỷ lệ dải gốc 2172 x 724, không kéo cả dải thành một sprite.
  const SWORD = [52/2172, 220/724, 54/2172, 185/724]; // Chỉ một thanh kiếm, không lẫn vòng trận bên cạnh.
  const PHI_FLASH = [.405, .29, .145, .45];
  const DASH_FRAMES = [[.01,.39,.13,.19],[.14,.36,.14,.25],[.29,.37,.20,.23],[.51,.35,.20,.26],[.73,.23,.27,.48]];
  const ULT_FRAMES = [[.01,.32,.18,.45],[.20,.26,.16,.53],[.37,.23,.18,.58],[.70,.15,.29,.66]];
  const ART = FILES.map(name => {
    const image = new Image();
    image.onload = () => refreshUI(true);
    image.onerror = () => msg('Không tải được ảnh kỹ năng: ' + name + '.png');
    image.src = 'CHARACTER/SkillSprites/Kiem/' + name + '/01.png';
    return image;
  });
  const ringImage = new Image(); ringImage.src = 'CHARACTER/Kiem/Vong/vong.png';
  const state = { cooldown: [0,0,0,0], flying: [], dash: null, field: null, ultimate: null, slash: [], aim: null, stamp: null };
  const isSword = () => !!P.ap && P.ap.w === 0;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const distance = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
  const live = e => !e.dead && e.hp > 0;
  function ready(img) { return img.complete && img.naturalWidth > 0; }
  function crop(ctx, image, rect, x, y, width, height, rotation = 0, alpha = 1) {
    const index=ART.indexOf(image);
    if(index<0)return;
    const frame=index===2?0:index===0?3:index===3?4:Math.max(0,DASH_FRAMES.indexOf(rect));
    skillSprites.draw(ctx,0,index,frame,x,y,width,height,rotation,alpha);
  }

  function blade(ctx,x,y,length,rotation=0,alpha=1) {
    spellActors.projectile(ctx,0,x,y,rotation,tm,length,alpha);
  }
  function camera() {
    const vw=W/Z,vh=H/Z;
    return gameCamera(vw,vh);
  }
  cv.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    const bounds=cv.getBoundingClientRect(), c=camera();
    state.aim={x:c.x+(event.clientX-bounds.left)/bounds.width*c.vw,y:c.y+(event.clientY-bounds.top)/bounds.height*c.vh};
  });
  function movement() {
    let x=(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0),y=(K.s||K.arrowdown?1:0)-(K.w||K.arrowup?1:0);
    if (ptr) {x=ptr.x-innerWidth/2;y=ptr.y-innerHeight/2;if(Math.hypot(x,y)<=24)x=y=0;}
    const length=Math.hypot(x,y);
    return length ? {x:x/length,y:y/length} : null;
  }
  function direction(preferMovement=false) {
    const move=movement();
    if (state.aim && distance(state.aim,P)>8) {const length=distance(state.aim,P);return {x:(state.aim.x-P.x)/length,y:(state.aim.y-P.y)/length};}
    if (move) return move;
    return {x:P.dir===2?P.f:0,y:P.dir===1?-1:P.dir===2?0:1};
  }
  function target() {
    const dir=direction();
    const requested=state.aim || {x:P.x+dir.x*150,y:P.y+dir.y*150};
    const length=distance(requested,P)||1, scale=Math.min(1,340/length);
    return {x:clamp(P.x+(requested.x-P.x)*scale,24,M-24),y:clamp(P.y+(requested.y-P.y)*scale,24,M-24)};
  }
  function backPosition(slot, dir=P.dir, facing=P.f, bob=0) {
    const source=window.characterWeapon.position(0,P.x,P.y,bob);
    return {x:source.x,y:source.y,angle:0};
  }
  function fieldPosition(slot, field) {
    const angle=-Math.PI/2+slot*Math.PI*2/5;
    return {x:field.x+Math.cos(angle)*field.radius*.83,y:field.y+Math.sin(angle)*field.radius*.55*.83-14,angle:0};
  }
  function inField(point) {
    const field=state.field;
    return !!field && ((point.x-field.x)/field.radius)**2+((point.y-field.y)/(field.radius*.55))**2<=1;
  }
  // Khoảng cách đến đoạn: kiếm/dash không bỏ sót địch khi một frame di chuyển xa.
  function segmentDistance(point, a, b) {
    const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
    const t=den ? clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/den,0,1) : 0;
    return Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t);
  }
  function strike(e,power) {if(live(e))hit(e,power);}
  function damageArea(center,radius,power) {
    for(const e of E)if(live(e)&&distance(e,center)<=radius+T[e.t].s)strike(e,power);
  }
  function launch() {
    const dir=direction(), angle=Math.atan2(dir.y,dir.x), counts=new Map();
    for(let i=0;i<3;i++) {
      const slot=i*2, origin=backPosition(slot);
      const a=angle+(i-1)*.045;
      state.flying.push({slot,x:origin.x,y:origin.y+10,delay:i*.05,vx:Math.cos(a)*480,vy:Math.sin(a)*480,
        traveled:0,returning:false,hits:new Set(),counts,trail:[],angle:a-Math.PI/2,power:window.skillPower?.(0,atk()*1.4)??atk()*1.4});
    }
  }
  function startDash() {
    const dir=direction(true), requested={x:clamp(P.x+dir.x*180,20,M-20),y:clamp(P.y+dir.y*180,20,M-20)},end=window.worldMap?.traceMove(P,requested)||requested;
    state.dash={start:{x:P.x,y:P.y},end,elapsed:0,duration:.14,hits:new Set(),refunded:false,angle:Math.atan2(dir.y,dir.x),power:window.skillPower?.(1,atk()*2)??atk()*2};
    if(Math.abs(dir.x)>Math.abs(dir.y)){P.dir=2;P.f=dir.x<0?-1:1;}else P.dir=dir.y<0?1:0;
    state.slash.push({kind:'dash',start:{x:P.x,y:P.y},end,angle:Math.atan2(dir.y,dir.x),age:0,duration:.35});
  }
  function startField() {state.field={x:P.x,y:P.y,radius:98,age:0,duration:4.8,pulse:0,power:window.skillPower?.(2,atk()*.7)??atk()*.7,source:backPosition(0)};}
  function startUltimate() {
    const point=target();
    const sources=Array.from({length:5},(_,slot)=>{
      const flying=state.flying.find(s=>s.slot===slot);
      return backPosition(slot);
    });
    const base=atk()*(inField(P)?1.25:1),power=window.skillPower?.(3,base)??base;
    state.flying.length=0;state.field=null;
    state.ultimate={...point,age:0,pulses:0,finished:false,power,sources,duration:3.1};
  }

  const legacySkill=skill,legacyCast=cast,legacyHit=hit,legacyUp=up,legacyDraw=dr,legacyChar=drawChar;
  skill=function(index) {
    if(!isSword())return legacySkill(index);
    if(paused()||!Number.isInteger(index)||index<0||index>3||state.dash)return;
    if(!window.gmTest?.enabled&&P.r<index)return msg('Cần đạt '+R[index]+' để dùng '+NAMES[index]+'.');
    if(state.cooldown[index]>0||P.mp<MANA[index])return;
    if(state.ultimate)return msg('Đang thi triển Vạn Kiếm Quy Tông.');
    if((index===0||index===2)&&state.flying.length)return msg('Chờ phi kiếm trở về để thi triển.');
    P.mp-=MANA[index];P.med=0;state.cooldown[index]=COOLDOWNS[index];
    [launch,startDash,startField,startUltimate][index]();
    msg(NAMES[index]+'!');refreshUI();
  };
  cast=function(){if(isSword())skill(0);else legacyCast();};
  $('bs').onclick=()=>cast();
  hit=function(enemy,power){legacyHit(enemy,!window.petCombat?.dealing&&isSword()&&inField(P)?power*1.25:power);};

  function advance(dt) {
    for(let i=0;i<4;i++)state.cooldown[i]=Math.max(0,state.cooldown[i]-dt);
    for(let i=state.flying.length-1;i>=0;i--) {
      const sword=state.flying[i];
      if(sword.delay>0){sword.delay-=dt;continue;}
      const old={x:sword.x,y:sword.y};
      if(!sword.returning) {
        const remaining=280-sword.traveled,step=Math.min(remaining,480*dt);
        sword.x+=sword.vx/480*step;sword.y+=sword.vy/480*step;sword.traveled+=step;
        for(const enemy of E) {
          if(!live(enemy)||sword.hits.has(enemy)||segmentDistance(enemy,old,sword)>T[enemy.t].s+8)continue;
          sword.hits.add(enemy);
          const count=sword.counts.get(enemy)||0;sword.counts.set(enemy,count+1);
          strike(enemy,sword.power*[1,.65,.4][Math.min(count,2)]);
          state.slash.push({kind:'impact',x:enemy.x,y:enemy.y-12,age:0,duration:.22});
        }
        if(sword.traveled>=280||sword.x<0||sword.x>M||sword.y<0||sword.y>M)sword.returning=true;
      } else {
        const pos=backPosition(sword.slot);
        const home={x:pos.x,y:pos.y+10};
        const length=distance(home,sword),step=Math.min(length,620*dt);
        if(length<=step+1){state.flying.splice(i,1);continue;}
        sword.x+=(home.x-sword.x)/length*step;sword.y+=(home.y-sword.y)/length*step;
        sword.angle=Math.atan2(home.y-sword.y,home.x-sword.x)-Math.PI/2;
      }
      sword.trail.push(old);if(sword.trail.length>9)sword.trail.shift();
    }
    const dash=state.dash;
    if(dash) {
      const old={x:P.x,y:P.y};dash.elapsed+=dt;
      const t=Math.min(1,dash.elapsed/dash.duration);P.x=dash.start.x+(dash.end.x-dash.start.x)*t;P.y=dash.start.y+(dash.end.y-dash.start.y)*t;
      for(const enemy of E)if(live(enemy)&&!dash.hits.has(enemy)&&segmentDistance(enemy,old,P)<=T[enemy.t].s+12){
        dash.hits.add(enemy);strike(enemy,dash.power);
        if(!dash.refunded){dash.refunded=true;state.cooldown[1]=Math.max(0,state.cooldown[1]-2);}
      }
      if(t===1){state.dash=null;P.sl=.12;}
    }
    const field=state.field;
    if(field) {
      field.age+=dt;field.pulse+=dt;
      while(field.pulse>=.55&&field.age<=field.duration){field.pulse-=.55;for(const enemy of E)if(live(enemy)&&inField(enemy))strike(enemy,field.power);}
      if(field.age>=field.duration){
        for(let slot=0;slot<5;slot++){
          if(state.flying.some(s=>s.slot===slot))continue;
          const pos=fieldPosition(slot,field);
          state.flying.push({slot,x:pos.x,y:pos.y+10,delay:0,returning:true,trail:[],angle:0});
        }
        state.field=null;
      }
    }
    const ultimate=state.ultimate;
    if(ultimate) {
      ultimate.age+=dt;
      // 30 kiếm khí: 6 đợt, mỗi đợt 5 thanh, rồi 1 nhát kết liễu.
      while(ultimate.pulses<6&&ultimate.age>=.9+ultimate.pulses*.18){ultimate.pulses++;damageArea(ultimate,92,ultimate.power*.45);}
      if(!ultimate.finished&&ultimate.age>=2.05){ultimate.finished=true;damageArea(ultimate,105,ultimate.power*4.5);shk=Math.max(shk,7);}
      if(ultimate.age>=ultimate.duration)state.ultimate=null;
    }
    for(let i=state.slash.length-1;i>=0;i--){state.slash[i].age+=dt;if(state.slash[i].age>=state.slash[i].duration)state.slash.splice(i,1);}
    for(let i=0;i<4;i++)SC[i]=state.cooldown[i];P.scd=state.cooldown[0];
  }
  up=function(dt) {
    legacyUp(dt);
    if(!isSword()||paused())return;
    advance(dt);refreshUI();
  };

  function drawRing(ctx,center,radius,alpha=1) {
    spellActors.field(ctx,0,{...center,radius},alpha);

  }
  function drawField(ctx,field) {
    const spawn=clamp(field.age/.35,0,1),fade=clamp((field.duration-field.age)/.35,0,1);
    drawRing(ctx,field,field.radius*(.6+.4*spawn),fade*.9);
    spellMotion.formation(ctx,0,field,fade);
    ctx.save();ctx.textAlign='center';ctx.font='bold 14px Georgia,serif';
    const active=Math.floor(field.age/.32)%8;
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4-Math.PI/2;
      ctx.fillStyle=i===active?'#ffffff':'#80dcf0';ctx.globalAlpha=fade*(i===active?1:.45);
      ctx.fillText(TRIGRAMS[i],field.x+Math.cos(a)*field.radius*.68,field.y+Math.sin(a)*field.radius*.55*.68+5);
    }
    ctx.restore();
    for(let slot=0;slot<5;slot++) {
      if(state.flying.some(s=>s.slot===slot))continue;
      const pos=fieldPosition(slot,field),lit=Math.floor(field.age/.32)%5===slot;
      ctx.save();ctx.shadowColor=CYAN;ctx.shadowBlur=lit?18:4;
      const home=field.source,progress=clamp(field.age/.35,0,1);
      blade(ctx,home.x+(pos.x-home.x)*progress,home.y+(pos.y-home.y)*progress,32,0,spawn*(lit?1:.75));ctx.restore();
    }
  }
  function drawUltimate(ctx,u) {
    const t=u.age,duration=u.duration||3.1;
    spellMotion.charge(ctx,0,u.x,u.y-20,t,.65);
    skillSprites.animate(ctx,0,3,t,duration,u.x,u.y-48,195,210,2.05,.94);
    if(t>=2.05)spellMotion.impact(ctx,0,u.x,u.y,t-2.05,u.radius,.65);
  }
  function drawEffects(ctx) {
    if(state.ultimate)drawUltimate(ctx,state.ultimate);
    for(const sword of state.flying) {
      window.characterWeapon.trail(ctx,sword.trail,sword,10,CYAN);
      blade(ctx,sword.x,sword.y-10,30,sword.angle);
    }
    for(const effect of state.slash) {
      if(effect.kind==='dash'&&window.voidStep?.outlineOnly)continue;
      const p=effect.age/effect.duration;
      if(effect.kind==='impact'){if(!window.worldVFX)crop(ctx,ART[0],PHI_FLASH,effect.x,effect.y,28,28,0,1-p);continue;}
      const length=distance(effect.start,effect.end),mx=(effect.start.x+effect.end.x)/2,my=(effect.start.y+effect.end.y)/2-16;
      ctx.save();ctx.strokeStyle=p<.15?'#fff':CYAN;ctx.lineWidth=p<.15?7:3;ctx.globalAlpha=1-p;
      ctx.beginPath();ctx.moveTo(effect.start.x,effect.start.y-16);ctx.lineTo(effect.end.x,effect.end.y-16);ctx.stroke();ctx.restore();
      crop(ctx,ART[1],DASH_FRAMES[Math.min(4,Math.floor(p*5))],mx,my,Math.max(24,length),34,effect.angle,1-p);
    }
  }
  dr=function() {
    legacyDraw();
    if(!isSword())return;
    const c=camera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);drawEffects(g);g.restore();
  };
  drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap,rc) {
    ctx.save();
    if(ap&&ap.w===0&&state.dash&&ctx===g)ctx.globalAlpha=.08;
    legacyChar(ctx,x,y,dir,facing,moving,phase,attacking,ap,rc);ctx.restore();
  };
  function drawBackSwords(ctx,x,y,dir,facing,bob) {
    return false; // Trang bị lưng luôn do renderer ảnh gốc quản lý.
  }

  const oldTip=$('tip').textContent, oldButton=$('bs').textContent;
  const oldIcons=SN.map(s=>s[0]),oldNames=SN.map(s=>s[1]);
  const uiStyle=document.createElement('style');
  uiStyle.textContent='#pv{position:static;inset:auto;display:block;margin:8px auto;width:200px;height:200px}.sk canvas.ic{position:static;inset:auto;width:48px;height:48px;image-rendering:auto;pointer-events:none}.sk .remaining{position:absolute;right:3px;top:3px;font:11px sans-serif;color:#fff;text-shadow:0 1px 3px #000;pointer-events:none}.sk u{pointer-events:none}#tip{max-width:calc(50vw - 140px)}@media(max-width:700px){#sb{bottom:calc(124px + env(safe-area-inset-bottom,0px))}#bt{left:10px;right:10px;justify-content:center}#bt button{padding:8px 10px}#tip{display:none}#log{top:auto;bottom:calc(184px + env(safe-area-inset-bottom,0px));padding:0 10px;font-size:12px}}';
  document.head.appendChild(uiStyle);
  function refreshUI(force=false) {
    if(P.ap?.w>=2&&window.newClassCombat){newClassCombat.refreshUI();return;}
    if(window.moonCombat?.isActive()){window.moonCombat.refreshUI(force);return;}
    // onload image chỉ chạy sau khi module khởi tạo xong.
    const sword=isSword(),stamp=sword?'kiem':'liem';
    if(force||stamp!==state.stamp) {
      state.stamp=stamp;
      [...sb.children].forEach((button,i)=>{
        button.innerHTML=(sword?'<canvas class="ic" width="192" height="192"></canvas>':'<i class="ic">'+oldIcons[i]+'</i>')+'<small>'+(i+1)+'</small><span class="remaining"></span><u></u>';
        button.style.borderColor=sword?'#8fdfff':SN[i][2];
        button.title=sword?NAMES[i]+' · '+MANA[i]+' linh lực · '+COOLDOWNS[i]+'s · '+R[i]:oldNames[i];
        button.setAttribute('aria-label',sword?NAMES[i]:oldNames[i]);
        if(!sword)button.disabled=false;
        if(sword) {
          const icon=button.querySelector('canvas').getContext('2d');icon.setTransform(3,0,0,3,0,0);
          const image=i===0?ART[2]:ART[i];
          const rect=i===0?SWORD:i===1?DASH_FRAMES[3]:i===2?[.72,.10,.28,.76]:ULT_FRAMES[3];
          crop(icon,image,rect,32,32,i===0?22:62,58);
        }
      });
      $('bs').textContent=sword?'Phi Kiếm (Space)':oldButton;
      $('tip').textContent=sword?'WASD / chạm kéo: di chuyển · chuột: ngắm · 1/Space: Phi Kiếm · 2: Dash · 3: Kiếm Trận · 4: Vạn Kiếm · Q: đả tọa · B: đột phá':oldTip;
    }
    if(!sword)return;
    [...sb.children].forEach((button,i)=>{
      const cooldown=state.cooldown[i];
      button.lastChild.style.height=(cooldown/COOLDOWNS[i]*100)+'%';
      button.querySelector('.remaining').textContent=cooldown>0?cooldown.toFixed(1):'';
      const locked=window.cultivation?!cultivation.canUse(i):P.r<i;
      button.classList.toggle('lk',locked);button.classList.toggle('lm',P.mp<MANA[i]);
      button.disabled=locked||P.mp<MANA[i]||cooldown>0||!!state.ultimate;
    });
  }
  const createCharacter=$('ok').onclick;
  $('ok').onclick=()=>{createCharacter();if(P.ap)refreshUI(true);};
  window.kiemCombat={
    isDashing:()=>isSword()&&!!state.dash,
    enemySpeed:enemy=>isSword()&&inField(enemy) ? .8 : 1,
    drawBackSwords,
    drawGroundEffects:ctx=>{
      if(!isSword())return;
      if(state.field)drawField(ctx,state.field);
      const u=state.ultimate;
      if(u)drawRing(ctx,u,60+55*clamp(u.age/.7,0,1),clamp((u.duration-u.age)/.5,0,1)*.85);
    },
    onRespawn:()=>{state.flying.length=0;state.dash=null;state.field=null;state.ultimate=null;state.slash.length=0;},
    // Đọc state phục vụ kiểm tra combat/animation, không ghi vào DB nhân vật.
    state,segmentDistance
  };
  window.classCombat=window.kiemCombat;
  refreshUI(true);
})();
