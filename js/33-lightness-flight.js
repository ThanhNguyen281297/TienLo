/* Khinh công follows fixed island landings; void remains unwalkable terrain. */
(function(){
  const world=worldMap,TAU=Math.PI*2,colors=['#87dcff','#8bead6','#c3aaff','#efcf89'];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const state={flight:null,trail:[],pulses:[],cooldown:0};
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const enabled=()=>world.isSectMap(world.state.scene)||world.state.scene==='valley';
  const copy=p=>({x:p.x,y:p.y});
  const portCache=new Map();
  function ports(){
    if(!enabled())return [];
    const scene=world.state.scene;if(portCache.has(scene))return portCache.get(scene);
    const l=world.sectLayouts[scene],valley=scene==='valley',camps=valley?world.valleyMines:world.farmCamps;
    const result=camps.map((camp,index)=>{const dx=camp.x-1000,dy=camp.y-1100;
      const main=.74/(Math.abs(dx)/l.rx+Math.abs(dy)/l.ry),outer=.58/(Math.abs(dx)/(valley?150:156)+Math.abs(dy)/(valley?78:80));
      return {id:camp.id,index,name:camp.name.split(' · ')[0],from:{x:1000+dx*main,y:1100+dy*main+(Math.abs(dx)>Math.abs(dy)?30:0)},to:{x:camp.x-dx*outer,y:camp.y-dy*outer}};
    });portCache.set(scene,result);return result;
  }
  function nearest(){let best=null;for(const port of ports())for(const reverse of [false,true]){
    const from=reverse?port.to:port.from,to=reverse?port.from:port.to,d=distance(P,from);
    if(d<=72&&(!best||d<best.distance))best={port,from,to,reverse,distance:d};
  }return best;}
  function height(){const flight=state.flight;return flight?Math.sin(Math.PI*Math.min(1,flight.age/flight.duration))*(reduced.matches?28:65):0;}
  function cancel(restore=true){const flight=state.flight;if(flight&&restore&&flight.scene===world.state.scene){P.x=flight.from.x;P.y=flight.from.y;}state.flight=null;state.trail.length=state.pulses.length=0;state.cooldown=0;}
  function face(from,to){const dx=to.x-from.x,dy=to.y-from.y;if(Math.abs(dx)>Math.abs(dy)){P.dir=2;P.f=dx<0?-1:1;}else P.dir=dy<0?1:0;}
  function start(){
    if(!P.ap||!account.state.ready||!enabled()||paused()||world.dialog.isOpen()||state.flight||state.cooldown>0)return false;
    if(classCombat.isDashing()||getClassCombat().state.ultimate){msg('Chờ kết thúc chiêu rồi dùng Khinh công.');return false;}
    const choice=nearest();if(!choice){msg('Đến dấu Khinh công ở mép đảo rồi nhấn G để bay qua.');return false;}
    if(!world.canWalk(P)||!world.canWalk(choice.to)){msg('Điểm hạ cánh chưa sẵn sàng.');return false;}
    const from=copy(P),to=copy(choice.to);
    state.flight={from,to,age:0,duration:Math.max(.95,Math.min(1.85,distance(from,to)/370+.45)),scene:world.state.scene,sect:P.ap.w,sample:0};
    state.trail.length=0;state.pulses.push({...from,age:0});if(state.pulses.length>8)state.pulses.shift();
    P.med=0;P.sl=0;K={};ptr=null;window.basicCombat?.reset();window.cultivation?.select(null);skillAim.state.visible=false;face(from,to);
    msg(choice.reverse?'Khinh công · Trở về đài tu hành':'Khinh công · '+choice.port.name);return true;
  }
  const button=document.createElement('button');button.id='lightness-button';button.type='button';button.textContent='Khinh công (G)';button.title='Đến dấu ở mép đảo, dùng Khinh công để bay sang đảo đối diện';button.onclick=()=>{start();button.blur();};$('bt').prepend(button);
  addEventListener('keydown',event=>{if(event.key.toLowerCase()!=='g'||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target.closest?.('input,textarea,select,[contenteditable="true"]'))return;if(!P.ap||paused()||world.dialog.isOpen())return;event.preventDefault();start();});
  function refresh(){if(state.flight){for(const skill of sb.children)skill.disabled=true;$('bs').disabled=true;}button.hidden=!P.ap||!enabled();const choice=nearest();button.disabled=!!state.flight||state.cooldown>0||paused()||world.dialog.isOpen();button.classList.toggle('flight-ready',!!choice&&!state.flight);button.textContent=state.flight?'Đang khinh công…':choice?'Khinh công · '+(choice.reverse?'Về đảo':choice.port.name)+' (G)':'Khinh công (G)';}
  const css=document.createElement('style');css.textContent='#lightness-button.flight-ready{border-color:#91d8d0;background:linear-gradient(145deg,#234c59,#102a38);box-shadow:inset 0 0 12px #7cdbce20}#lightness-button[hidden]{display:none!important}';document.head.append(css);
  const dash=classCombat.isDashing;classCombat.isDashing=()=>!!state.flight||dash();
  const castBefore=cast,skillBefore=skill;cast=function(...args){if(!state.flight)return castBefore(...args);};skill=function(...args){if(!state.flight)return skillBefore(...args);};
  const interact=world.interact;world.interact=function(...args){if(!state.flight)return interact(...args);};
  const switchScene=world.switchScene;world.switchScene=function(...args){cancel();return switchScene(...args);};
  const travel=world.travel;world.travel=function(...args){cancel();return travel(...args);};
  // All renderers use gameCamera; world.camera is only the layout helper.
  const camera=gameCamera;gameCamera=function(...args){const view=camera(...args);if(state.flight)view.y-=height()*.6;return view;};
  const respawn=classCombat.onRespawn;classCombat.onRespawn=function(...args){cancel();return respawn(...args);};
  const update=up;up=function(dt){update(dt);if(state.flight?.scene!==world.state.scene&&state.flight)cancel(false);refresh();
    if(!P.ap||!account.state.ready||paused()||world.dialog.isOpen()||!Number.isFinite(dt)||dt<=0)return;
    state.cooldown=Math.max(0,state.cooldown-dt);
    for(const pulse of state.pulses)pulse.age+=dt;state.pulses=state.pulses.filter(p=>p.age<.5);
    for(const point of state.trail)point.age+=dt;state.trail=state.trail.filter(p=>p.age<.32);
    const flight=state.flight;if(!flight)return;
    flight.age=Math.min(flight.duration,flight.age+dt);const t=flight.age/flight.duration,ease=t*t*(3-2*t);
    P.x=flight.from.x+(flight.to.x-flight.from.x)*ease;P.y=flight.from.y+(flight.to.y-flight.from.y)*ease;P.med=0;P.sl=0;face(flight.from,flight.to);
    flight.sample+=dt;if(flight.sample>=.035){flight.sample%=.035;state.trail.push({x:P.x,y:P.y-height()-17,age:0});if(state.trail.length>12)state.trail.shift();}
    if(t===1){P.x=flight.to.x;P.y=flight.to.y;state.flight=null;state.cooldown=.3;state.pulses.push({...flight.to,age:0});saveCharacter();}
  };
  const ground=world.drawGroundDetails;world.drawGroundDetails=function(ctx,...args){ground(ctx,...args);if(!enabled())return;
    const near=nearest(),color=colors[P.ap?.w||0];ctx.save();ctx.lineWidth=1;
    for(const port of ports())for(const reverse of [false,true]){const p=reverse?port.to:port.from,active=near?.port.id===port.id&&near.reverse===reverse;
      ctx.strokeStyle=color;ctx.globalAlpha=active?.8:.4;ctx.beginPath();ctx.ellipse(p.x,p.y,active?14:11,active?6:4.5,0,0,TAU);ctx.stroke();
      const target=reverse?port.from:port.to,angle=Math.atan2(target.y-p.y,target.x-p.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(-4,-2);ctx.lineTo(3,0);ctx.lineTo(-4,2);ctx.stroke();ctx.restore();
      if(active&&!state.flight)drawWorldLabel(ctx,(reverse?'Về đảo':port.name)+' · G',p.x,p.y+17,color,8);
    }
    for(const pulse of state.pulses){const p=pulse.age/.5;ctx.globalAlpha=(1-p)*.6;ctx.strokeStyle=color;ctx.beginPath();ctx.ellipse(pulse.x,pulse.y,8+p*28,3+p*11,0,0,TAU);ctx.stroke();}ctx.restore();
  };
  function drawWake(ctx,x,y,lift,sect){if(lift<2)return;ctx.save();ctx.strokeStyle=colors[sect];ctx.lineWidth=.8;ctx.globalAlpha=Math.min(.45,lift/100);for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*7,y-lift-9);ctx.quadraticCurveTo(x+side*18,y-lift+3,x+side*5,y-lift+9);ctx.stroke();}ctx.restore();}
  const humanBefore=human;human=function(){const flight=state.flight;if(!flight)return humanBefore();const lift=height(),color=colors[flight.sect];g.save();
    if(!reduced.matches&&state.trail.length>1){g.lineCap='round';for(let i=1;i<state.trail.length;i++){const a=state.trail[i-1],b=state.trail[i];g.globalAlpha=(1-b.age/.32)*.25;g.strokeStyle=color;g.lineWidth=1+(1-b.age/.32)*2;g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.stroke();}}
    g.globalAlpha=1;drawWake(g,P.x,P.y,lift,flight.sect);drawChar(g,P.x,P.y-lift,P.dir,P.f,false,tm*6,false,AP(),color);drawWorldLabel(g,P.nm+' · Khinh công',P.x,P.y-lift-(window.characterNameHeight?.(AP())||48),color,8.5);g.restore();
  };
  window.lightness={state,ports,nearest,start,cancel,height,drawWake,get active(){return !!state.flight;},safePosition(){return state.flight?.scene===world.state.scene?copy(state.flight.from):null;}};
  refresh();
})();
