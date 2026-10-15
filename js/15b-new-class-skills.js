/* Lôi Thương: tích lôi ấn; Thiên Cơ: đặt trận và tiêu thụ phù ấn. */
(function(){
  window.combatNames=[['Phi Kiếm Quyết','Kiếm Ảnh Bộ','Bát Quái Kiếm Trận','Vạn Kiếm Quy Tông'],['Tam Nguyệt Trảm','Nguyệt Ảnh Bộ','Nguyệt Luân Trận','Minh Nguyệt Giáng Thế'],['Lôi Thương Đột Kích','Hoành Tảo Thiên Quân','Cửu Tiêu Lôi Trận','Lôi Long Giáng Thế'],['Phi Phù Chú','Phong Linh Phiến','Thiên Cơ Trận','Vạn Phù Phong Ấn']];
  window.combatMana=[[8,10,20,35],[9,12,22,38],[9,14,24,40],[8,12,24,40]];
  const cds=[5,7,13,26],state={cooldown:[0,0,0,0],aim:null,marks:new Map(),control:new Map(),projectiles:[],effects:[],field:null,ultimate:null,dash:null};
  const active=()=>P.ap?.w>=2,thunder=()=>P.ap?.w===2,live=e=>E.includes(e)&&!e.dead&&e.hp>0;
  const art=[['loithuongdotkich','hoanhtaothienquan','cuuthienloitran','loilonggiangthe'],['philinhchu','phonglinhphien','thiencotran','vanphuphongan']].map((names,c)=>names.map(n=>{const img=new Image();img.src='CHARACTER/'+(c?'Quat':'Thuong')+'/Skill/'+n+'.png';return img;}));
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),inside=(e,f)=>distance(e,f)<=f.radius+(T[e.t]?.s||10);
  function target(range){const a=state.aim||{x:P.x+(P.dir===2?P.f:0)*range,y:P.y+(P.dir===1?-1:P.dir===2?0:1)*range},d=distance(a,P)||1;return{x:P.x+(a.x-P.x)*Math.min(1,range/d),y:P.y+(a.y-P.y)*Math.min(1,range/d)};}
  const stacks=e=>state.marks.get(e)?.count||0;
  function mark(e,amount=1,burst=false){const count=Math.min(3,stacks(e)+amount);state.marks.set(e,{count,time:8});if(burst&&count===3){hit(e,atk()*.65);state.marks.delete(e);flash(e,0);}}
  function consume(e,all=false){const n=stacks(e);if(n){if(all||n===1)state.marks.delete(e);else state.marks.set(e,{count:n-1,time:8});}return n;}
  function control(e,time,speed=0){state.control.set(e,{time,speed});}
  function flash(p,index,angle=0,radius=40){state.effects.push({x:p.x,y:p.y,index,angle,radius,age:0});}
  function strike(e,power,index){hit(e,window.skillPower?.(index,power)??power);}
  function cone(e,origin,angle,radius,width){const a=Math.atan2(e.y-origin.y,e.x-origin.x)-angle;return distance(e,origin)<=radius&&Math.abs(Math.atan2(Math.sin(a),Math.cos(a)))<=width/2;}
  function castNew(i){const end=target(i===3?300:240),angle=Math.atan2(end.y-P.y,end.x-P.x),power=atk();
    if(i===0&&thunder()){
      const start={x:P.x,y:P.y},dest=worldMap?.traceMove?worldMap.traceMove(start,end):end;
      state.dash={start,end:dest,age:0,hits:new Set(),first:false,power};flash(P,0,angle,70);
    }else if(i===0){
      const source=characterWeapon.position(P.ap.w);for(let n=0;n<5;n++)state.projectiles.push({x:source.x,y:source.y+20,angle:angle+(n-2)*.12,age:0,last:n===4,power,hits:new Set()});
    }else if(i===1){
      flash(P,1,angle,thunder()?145:165);
      for(const e of E)if(live(e)&&cone(e,P,angle,thunder()?145:165,thunder()?Math.PI*1.35:Math.PI*.6)){
        strike(e,power*(thunder()?1.6:.7),i);control(e,.4,0);
        if(stacks(e)){strike(e,power*(thunder()?1:.55),i);consume(e,thunder());flash(e,0);}
        if(!thunder()){const d=distance(e,P)||1,to={x:e.x+(e.x-P.x)/d*25,y:e.y+(e.y-P.y)/d*25},p=worldMap?.traceMove?worldMap.traceMove(e,to):to;e.x=p.x;e.y=p.y;control(e,1.5,.55);}
      }
    }else if(i===2)state.field={x:P.x,y:P.y,radius:110,age:0,pulses:0,locked:false,power};
    else state.ultimate={...end,radius:140,age:0,finished:false,power};
  }
  const baseHit=hit;hit=function(e,power){return baseHit(e,power*(active()&&!thunder()&&state.field&&inside(e,state.field)?1.15:1));};
  const oldSkill=skill,oldCast=cast,oldUp=up,oldDraw=dr,oldCombat=classCombat;
  skill=function(i){if(!active())return oldSkill(i);if(paused()||!Number.isInteger(i)||i<0||i>3||state.ultimate||state.dash)return;if((!window.gmTest?.enabled&&P.r<i)||state.cooldown[i]>0||P.mp<combatMana[P.ap.w][i])return;P.mp-=combatMana[P.ap.w][i];P.med=0;P.sl=.35;state.cooldown[i]=cds[i];castNew(i);msg(combatNames[P.ap.w][i]);refreshUI();};
  cast=function(){if(active())skill(0);else oldCast();};$('bs').onclick=()=>cast();
  function advance(dt){
    state.cooldown=state.cooldown.map(v=>Math.max(0,v-dt));
    for(const [e,m]of state.marks){m.time-=dt;if(!live(e)||m.time<=0)state.marks.delete(e);}
    for(const [e,c]of state.control){c.time-=dt;if(!live(e)||c.time<=0)state.control.delete(e);}
    // Slow skill motion, leaving cooldown/mark/control clocks unchanged.
    dt*=.65;
    const dash=state.dash;if(dash){dash.age+=dt;const t=Math.min(1,dash.age/.18),old={x:P.x,y:P.y};P.x=dash.start.x+(dash.end.x-dash.start.x)*t;P.y=dash.start.y+(dash.end.y-dash.start.y)*t;
      for(const e of E)if(live(e)&&!dash.hits.has(e)&&kiemCombat.segmentDistance(e,old,P)<(T[e.t]?.s||10)+16){dash.hits.add(e);strike(e,dash.power*1.3,0);if(stacks(e))strike(e,dash.power*.5,0);if(!dash.first){mark(e);dash.first=true;}flash(e,0);}if(t===1)state.dash=null;
    }
    for(const p of state.projectiles){p.age+=dt;const old={x:p.x,y:p.y};const enemy=E.filter(e=>live(e)&&!p.hits.has(e)&&distance(e,p)<160).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(enemy){const wanted=Math.atan2(enemy.y-p.y,enemy.x-p.x),delta=Math.atan2(Math.sin(wanted-p.angle),Math.cos(wanted-p.angle));p.angle+=Math.max(-dt*.65,Math.min(dt*.65,delta));}p.x+=Math.cos(p.angle)*300*dt;p.y+=Math.sin(p.angle)*300*dt;
      for(const e of E)if(live(e)&&!p.hits.has(e)&&kiemCombat.segmentDistance(e,old,p)<(T[e.t]?.s||10)+7){p.hits.add(e);strike(e,p.power*.45,0);if(p.last)mark(e);p.age=2;flash(e,0);break;}}
    state.projectiles=state.projectiles.filter(p=>p.age<1.3);
    const f=state.field;if(f){f.age+=dt;if(!thunder()&&!f.locked&&f.age>=1.8){f.locked=true;for(const e of E)if(live(e)&&distance(e,f)<60)control(e,.65);}
      while(f.pulses<5&&f.age>=f.pulses+1){f.pulses++;for(const e of E)if(live(e)&&inside(e,f)){strike(e,f.power*(thunder()?.65:.5),2);if(thunder())mark(e,1,true);else if(stacks(e))control(e,.25);flash(e,2);}}if(f.age>=5.5)state.field=null;
    }
    const u=state.ultimate;if(u){u.age+=dt;if(!thunder()&&u.age>=1.8&&u.age<2.6)for(const e of E)if(live(e)&&inside(e,u))control(e,.1,.15);
      if(!u.finished&&u.age>=(thunder()?1.3:3.2)){u.finished=true;for(const e of E)if(live(e)&&inside(e,u)){const n=stacks(e);strike(e,u.power*(thunder()?5:4)*(n===3?1.35:1),3);if(thunder()){mark(e,3);if(distance(e,u)<65)control(e,.7);}else consume(e,true);flash(e,3);}flash(u,3,0,180);}if(u.age>=(thunder()?2.2:4))state.ultimate=null;
    }
    for(const e of state.effects)e.age+=dt;state.effects=state.effects.filter(e=>e.age<.5);
  }
  function refreshUI(){if(!active())return;[...sb.children].forEach((b,i)=>{const name=combatNames[P.ap.w][i];if(b.getAttribute('aria-label')!==name){b.innerHTML='<img class="ic" width="48" height="48"><small>'+(i+1)+'</small><span class="remaining"></span><u></u>';b.querySelector('img').src=art[P.ap.w-2][i].src;b.setAttribute('aria-label',name);}b.title=name;b.querySelector('.remaining').textContent=state.cooldown[i]>0?state.cooldown[i].toFixed(1):'';b.lastChild.style.height=state.cooldown[i]/cds[i]*100+'%';b.disabled=(window.cultivation?!cultivation.canUse(i):P.r<i)||P.mp<combatMana[P.ap.w][i]||state.cooldown[i]>0||!!state.ultimate;});$('bs').textContent=combatNames[P.ap.w][0]+' (Space)';}
  function atlas(ctx,index,frame,x,y,width,height,alpha=1){
    const img=art[P.ap.w-2][index];if(!img.complete||!img.naturalWidth)return;
    const columns=thunder()?6:3,rows=thunder()?1:2,sw=img.naturalWidth/columns,sh=img.naturalHeight/rows;
    ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(img,(frame%columns)*sw,Math.floor(frame/columns)*sh,sw,sh,x-width/2,y-height,width,height);ctx.restore();
  }
  function draw(ctx){const color=thunder()?'#ac9aff':'#d8fff2';ctx.save();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.shadowColor=color;ctx.shadowBlur=8;
    function ring(f,ultimate=false){ctx.save();ctx.globalAlpha=.65;ctx.beginPath();ctx.ellipse(f.x,f.y,f.radius,f.radius*.58,0,0,Math.PI*2);ctx.stroke();const count=Math.min(8,Math.floor(f.age*6)+1);for(let n=0;n<count;n++){const a=n*Math.PI/4+f.age*.2,x=f.x+Math.cos(a)*f.radius,y=f.y+Math.sin(a)*f.radius*.58;ctx.strokeRect(x-4,y-18,8,18);if(ultimate&&f.age>1.8){ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x,y-85);ctx.stroke();}}ctx.restore();}
    if(state.field)ring(state.field);if(state.ultimate){const u=state.ultimate;ring(u,true);atlas(ctx,3,Math.min(5,Math.floor(u.age/(thunder()?2.2:4)*6)),u.x,u.y+15,thunder()?155:270,thunder()?230:180,.8);if(thunder()){ctx.beginPath();for(let n=0;n<22;n++){const y=u.y-180+n*8,x=u.x+Math.sin(n*.7-u.age*8)*(22-n*.6);n?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}else for(let n=0;n<24;n++){const a=n*Math.PI/12+u.age*2,r=u.age<3.2?u.radius:Math.max(0,u.radius*(4-u.age));ctx.strokeRect(u.x+Math.cos(a)*r-3,u.y+Math.sin(a)*r*.58-40,6,16);}}
    for(const p of state.projectiles){ctx.save();ctx.translate(p.x,p.y-15);ctx.rotate(p.angle);ctx.fillStyle='#fff0bb';ctx.fillRect(-9,-4,18,8);ctx.strokeRect(-9,-4,18,8);ctx.restore();}
    for(const [e,m]of state.marks){for(let n=0;n<m.count;n++){ctx.beginPath();ctx.arc(e.x+(n-1)*8,e.y-45,2.5,0,Math.PI*2);ctx.fill();}}
    for(const f of state.effects){if(f.index===1&&window.voidStep?.outlineOnly)continue;ctx.save();ctx.globalAlpha=1-f.age/.5;if(f.index===1){ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.arc(f.x,f.y,f.radius,f.angle-(thunder()?Math.PI*.675:Math.PI*.3),f.angle+(thunder()?Math.PI*.675:Math.PI*.3));ctx.closePath();ctx.stroke();}else{ctx.beginPath();ctx.moveTo(f.x,f.y-70);ctx.lineTo(f.x-6,f.y-35);ctx.lineTo(f.x+5,f.y-40);ctx.lineTo(f.x,f.y);ctx.stroke();}ctx.restore();}ctx.restore();
  }
  const reset=()=>{state.cooldown.fill(0);state.aim=null;state.marks.clear();state.control.clear();state.projectiles=[];state.effects=[];state.field=state.ultimate=state.dash=null;};
  window.newClassCombat={state,refreshUI,isDashing:()=>active()&&!!state.dash,drawGroundEffects:()=>{},onRespawn:reset,enemySpeed:e=>{if(!active())return 1;let speed=state.control.get(e)?.speed??1;if(state.field&&inside(e,state.field))speed=Math.min(speed,thunder()?.8:.65);return speed;},attackInterval:()=>active()&&thunder()&&state.field&&inside(P,state.field)?.48:.6,damageTaken:()=>active()&&thunder()&&state.field&&inside(P,state.field)?.8:1};
  // Đánh thường và kỹ năng dùng cùng Ấn, cùng thời gian tồn tại và giới hạn ba tầng.
  Object.assign(window.newClassCombat, {
    markCount: stacks,
    addMark: (enemy, amount = 1) => { if (active() && live(enemy)) mark(enemy, amount); },
    consumeMark: (enemy, all = false) => active() && live(enemy) ? consume(enemy, all) : 0
  });
  window.getClassCombat=()=>P.ap?.w>=2?newClassCombat:P.ap?.w===1?moonCombat:kiemCombat;
  classCombat={isDashing:()=>oldCombat.isDashing()||newClassCombat.isDashing(),enemySpeed:e=>active()?newClassCombat.enemySpeed(e):oldCombat.enemySpeed(e),drawGroundEffects:ctx=>oldCombat.drawGroundEffects(ctx),onRespawn:()=>{oldCombat.onRespawn();reset();}};
  up=function(dt){oldUp(dt);if(active()&&!paused()){advance(dt);refreshUI();}};
  dr=function(){oldDraw();if(!active()||paused())return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);draw(g);g.restore();};
  const creator=$('ok').onclick;$('ok').onclick=()=>{creator();reset();refreshUI();};
})();
