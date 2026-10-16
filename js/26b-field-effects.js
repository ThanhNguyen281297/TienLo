/* Skill 3: pressure, frost, paralysis and sealing. Online mobs use server states. */
(function(){
  const statuses=new Map(),records=new WeakMap(),origins=new WeakMap();let scene=worldMap.state.scene,sect=P.ap?.w,serial=0;
  const rule=()=>fieldRules[P.ap?.w||0],live=e=>!e.dead&&e.hp>0;
  function current(){return P.ap?getClassCombat().state.field:null;}
  function origin(f){if(!origins.has(f))origins.set(f,{id:crypto.randomUUID?.()||'field-'+Date.now()+'-'+(++serial),scene:worldMap.state.scene,sect:P.ap.w});return origins.get(f);}
  function list(e){return e.network?(e.fieldEffects||[]):(statuses.has(e)?[statuses.get(e)]:[]);}
  const hard=e=>list(e).some(s=>s.hard>0);
  function immobilized(e){return list(e).some(s=>s.hard>0&&s.key!=='mysticSeal');}
  function speed(e){return immobilized(e)?0:Math.min(1,...list(e).map(s=>s.slow));}
  function attackMultiplier(e){return Math.min(1,...list(e).map(s=>s.outgoing));}
  function vulnerability(e){return Math.max(1,...list(e).map(s=>s.vulnerability));}
  function tick(dt){
    statuses.clear();if(!P.ap)return;
    if(scene!==worldMap.state.scene||sect!==P.ap.w){scene=worldMap.state.scene;sect=P.ap.w;return;}
    const f=current(),r=rule();if(!f||origin(f).scene!==scene||origin(f).sect!==sect||f.age>=r.duration)return;
    let memory=records.get(f);if(!memory){memory=new WeakMap();records.set(f,memory);}
    for(const e of E){
      if(e.network||!live(e))continue;
      let m=memory.get(e);const distance=Math.hypot(e.x-f.x,e.y-f.y);
      if(distance>r.radius){if(m){m.exposure=0;m.hard=0;}continue;}
      if(!m){m={exposure:0,triggered:false,hard:0};memory.set(e,m);}
      m.hard=Math.max(0,m.hard-dt);
      m.exposure=(!r.centerRadius||distance<=r.centerRadius)?m.exposure+dt:0;
      if(r.threshold&&m.exposure>=r.threshold&&!m.triggered){m.triggered=true;m.hard=r.hardDuration*((e.t===2||e.elite)?0.4:1);}
      statuses.set(e,{...r,hard:m.hard,stacks:r.key==='thunderParalysis'?Math.min(3,Math.floor(m.exposure)):0,vulnerability:1+(r.vulnerability-1)*((e.t===2||e.elite)?0.5:1)});
    }
  }
  function descriptor(){const f=current();if(!f||origin(f).scene!==worldMap.state.scene||origin(f).sect!==P.ap.w||f.age>=rule().duration)return null;return{id:origin(f).id,x:f.x,y:f.y,age:f.age};}
  const oldSkill=skill;skill=function(i){const before=current(),result=oldSkill(i);if(i===2&&current()&&current()!==before)origin(current());return result;};
  const oldSpeed=classCombat.enemySpeed;classCombat.enemySpeed=e=>Math.min(oldSpeed(e),speed(e));
  const oldHit=hit;hit=function(e,power){return oldHit(e,power*(e.network?1:vulnerability(e)));};
  const update=up;up=function(dt){
    if(!paused()&&!worldMap.dialog.isOpen()&&Number.isFinite(dt)&&dt>0){tick(dt);for(const f of window.onlineWorld?.state.fields||[])f.age+=dt;}
    return update(dt);
  };
  const ground=classCombat.drawGroundEffects;classCombat.drawGroundEffects=function(ctx){
    ground(ctx);for(const f of window.onlineWorld?.state.fields||[])if(f.age<f.duration)spellActors.field(ctx,f.sect,f,.7);
  };
  const reset=classCombat.onRespawn;classCombat.onRespawn=function(){statuses.clear();return reset();};
  // Small class-specific motifs, not another ring around the monster.
  function draw(ctx,e,height){
    const active=list(e);if(!active.length||!live(e))return;
    const s=active.find(v=>v.hard>0)||active[0],age=typeof tm==='number'?tm:0;
    const x=e.x,y=e.y-height*.7;
    ctx.save();ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=.9;ctx.globalAlpha=.85;
    if(s.key==='swordPressure'){
      for(let n=0;n<3;n++){const px=x+(n-1)*8,py=y-8+Math.sin(age*3+n)*2;ctx.beginPath();ctx.moveTo(px,py-6);ctx.lineTo(px,py+5);ctx.moveTo(px-2,py+1);ctx.lineTo(px,py+5);ctx.lineTo(px+2,py+1);ctx.stroke();}
    }else if(s.key==='moonFrost'){
      const size=s.hard>0?13:6;ctx.save();ctx.translate(x,y+10);ctx.rotate(age*.15);
      for(let n=0;n<6;n++){ctx.rotate(Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-size);ctx.moveTo(-2,-size*.65);ctx.lineTo(0,-size*.45);ctx.lineTo(2,-size*.65);ctx.stroke();}ctx.restore();
      if(s.hard>0){ctx.globalAlpha=.22;ctx.beginPath();ctx.moveTo(x-13,e.y-2);ctx.lineTo(x-17,y+4);ctx.lineTo(x-7,y-9);ctx.lineTo(x+9,y-7);ctx.lineTo(x+17,y+8);ctx.lineTo(x+12,e.y-2);ctx.closePath();ctx.fill();ctx.stroke();}
    }else if(s.key==='thunderParalysis'){
      for(let n=0;n<Math.max(1,s.stacks||0);n++){const px=x+(n-1)*7;ctx.beginPath();ctx.moveTo(px+2,y-9);ctx.lineTo(px-2,y-3);ctx.lineTo(px+2,y-3);ctx.lineTo(px-1,y+3);ctx.stroke();}
      if(s.hard>0)for(let n=0;n<3;n++){const a=age*3+n*Math.PI*2/3;spellActors.glint(ctx,2,x+Math.cos(a)*13,y-10+Math.sin(a)*4,5,a,.9);}
    }else{
      ctx.save();ctx.translate(x,y-3+Math.sin(age*2)*2);ctx.rotate(Math.sin(age)*.1);ctx.strokeRect(-5,-8,10,16);ctx.beginPath();ctx.moveTo(-2,-5);ctx.lineTo(2,-2);ctx.lineTo(-2,2);ctx.lineTo(2,5);ctx.stroke();ctx.restore();
      if(s.hard>0){ctx.beginPath();ctx.moveTo(x-4,y+12);ctx.lineTo(x+4,y+20);ctx.moveTo(x+4,y+12);ctx.lineTo(x-4,y+20);ctx.stroke();}
    }
    ctx.font='600 7px Arial';ctx.textAlign='center';ctx.lineWidth=2;ctx.strokeStyle='#10212b';
    const label=s.hard>0?{moonFrost:'Đóng băng',thunderParalysis:'Choáng',mysticSeal:'Khóa đánh'}[s.key]:s.name;
    ctx.strokeText(label,x,e.y+11);ctx.fillText(label,x,e.y+11);ctx.restore();
  }
  window.fieldEffects={list,speed,immobilized,attackMultiplier,vulnerability,blocksAttack:hard,descriptor,draw,tick,statuses};
})();
