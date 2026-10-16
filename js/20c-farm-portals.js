/* Paired, grounded teleport formations. E and the existing mobile interact button. */
(function(){
  const world=worldMap,cache=new Map(),reduced=matchMedia('(prefers-reduced-motion: reduce)');let scene='',cooldown=0,pulse=null;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function routes(){const id=world.state.scene;if(!world.isSectMap(id)&&id!=='valley')return [];
    if(cache.has(id))return cache.get(id);const main=world.sectLayouts[id],size=id==='valley'?farmLayout.valley:farmLayout.camp;
    const result=(id==='valley'?world.valleyMines:world.farmCamps).map(camp=>{
      const dx=camp.x-1000,dy=camp.y-1100,t=.62/(Math.abs(dx)/main.rx+Math.abs(dy)/main.ry),u=.66/(Math.abs(dx)/size.rx+Math.abs(dy)/size.ry);
      return {id:camp.id,name:camp.name,from:{x:1000+dx*t,y:1100+dy*t},to:{x:camp.x-dx*u,y:camp.y-dy*u}};
    });cache.set(id,result);return result;
  }
  function sync(){if(scene!==world.state.scene){cooldown=0;pulse=null;scene=world.state.scene;}
    for(let i=world.services.length-1;i>=0;i--)if(world.services[i].farmPortal)world.services.splice(i,1);
    for(const route of routes())for(const reverse of [false,true]){const p=reverse?route.to:route.from;
      world.services.push({id:'farm-gate:'+route.id+':'+Number(reverse),name:reverse?'Trận về · '+route.name.split(' · ')[0]:'Trận '+route.name.split(' · ')[0],...p,color:'#97dfd4',farmPortal:true,route,reverse});}
  }
  function teleport(service){if(!service?.farmPortal||cooldown>0||paused()||world.dialog.isOpen()||distance(P,service)>62||classCombat.isDashing())return false;
    const end=service.reverse?service.route.from:service.route.to;if(!world.canWalk(end))return false;
    classCombat.onRespawn();window.autoCombat?.toggle(false);B.length=SP.length=V.length=LT.length=X.length=PT.length=0;
    if(window.onlineWorld)onlineWorld.state.hits.length=0;
    K={};ptr=null;P.x=end.x;P.y=end.y;P.med=0;P.sl=0;P.mv=false;skillAim.state.visible=false;
    cooldown=.85;pulse={...end,age:0};world.state.near=null;world.updateInterface();saveCharacter();
    msg(service.reverse?'Đã trở về đài trung tâm.':'Đã tới '+service.route.name+' · Tới trận và nhấn E để quay về.');return true;
  }
  const service=world.handleService;world.handleService=function(id){if(id.startsWith('farm-gate:')){teleport(world.services.find(s=>s.id===id));return true;}return service(id);};
  const change=world.switchScene;world.switchScene=function(...args){const result=change(...args);sync();return result;};
  const create=$('ok').onclick;$('ok').onclick=function(...args){const result=create(...args);sync();return result;};
  const update=up;up=function(dt){if(scene!==world.state.scene||routes().length&&!world.services.some(s=>s.farmPortal))sync();update(dt);if(paused()||world.dialog.isOpen())return;cooldown=Math.max(0,cooldown-dt);if(pulse&&(pulse.age+=dt)>.65)pulse=null;};
  function marker(ctx,p){const active=distance(P,p)<62,angle=reduced.matches?0:tm*.16;
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,.5);ctx.strokeStyle=active?'#c8f8e7':'#72c5ba';ctx.lineWidth=active?1.4:.8;
    for(const radius of [13,18]){ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();}
    ctx.rotate(angle);ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.moveTo(Math.cos(a)*13,Math.sin(a)*13);ctx.lineTo(Math.cos(a)*18,Math.sin(a)*18);}ctx.stroke();ctx.fillStyle=active?'rgba(155,233,209,.14)':'rgba(94,172,153,.08)';ctx.beginPath();ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  const details=world.drawGroundDetails;world.drawGroundDetails=function(ctx,...args){details(ctx,...args);for(const route of routes()){marker(ctx,route.from);marker(ctx,route.to);}
    if(pulse){ctx.save();ctx.globalAlpha=(1-pulse.age/.65)*.6;ctx.strokeStyle='#b9f8dc';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(pulse.x,pulse.y,14+pulse.age*30,7+pulse.age*15,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  };
  const mini=world.renderMini;world.renderMini=function(ctx,size){mini(ctx,size);ctx.save();ctx.scale(size/M,size/M);ctx.fillStyle='#8ee6d2';for(const route of routes())for(const p of [route.from,route.to]){ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill();}ctx.restore();};
  window.farmPortals={routes,sync,teleport,get cooldown(){return cooldown;}};sync();
})();
