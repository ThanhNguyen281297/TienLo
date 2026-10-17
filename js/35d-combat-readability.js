/* Shared presentation for evasion and local boss windups. Network HP stays snapshot-driven. */
(function(){
  let grace=0,notice=0,scene=worldMap.state.scene;
  const casts=new Map();
  const banner=document.createElement('div');banner.id='combat-feedback';banner.hidden=true;banner.setAttribute('role','status');document.body.append(banner);
  const style=document.createElement('style');style.textContent='#combat-feedback{position:fixed;left:50%;top:25%;transform:translateX(-50%);padding:8px 18px;border:1px solid #92e5d0;border-radius:20px;background:#10262de8;color:#b5ffe7;font:bold 15px Arial;pointer-events:none;z-index:5;text-shadow:0 1px 3px #000}@media(prefers-reduced-motion:reduce){#combat-feedback{transition:none}}';document.head.append(style);
  function dodge(){if(notice>.3)return;notice=.8;banner.hidden=false;banner.textContent='NÉ THÀNH CÔNG';fx(P.x,P.y-48,'Né','#9cffe3');}
  function evade(seconds=.22){grace=Math.max(grace,Math.min(.3,seconds));}
  function evading(){return grace>0||classCombat.isDashing();}
  function clear(){casts.clear();grace=notice=0;banner.hidden=true;scene=worldMap.state.scene;}
  function drawTelegraph(ctx,m){
    if(m.age<0)return;const p=Math.min(1,m.age/m.duration),spent=m.spent;
    ctx.save();ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,Math.PI*2);ctx.fillStyle=spent?'#ffbd7355':'#c82f3d30';ctx.fill();ctx.strokeStyle=spent?'#ffe7a6':'#ff706a';ctx.lineWidth=1.6;ctx.stroke();
    if(!spent){ctx.beginPath();ctx.arc(m.x,m.y,m.r*p,0,Math.PI*2);ctx.fillStyle='#ff795d22';ctx.fill();ctx.strokeStyle='#ffe9b8';ctx.lineWidth=1.2;ctx.stroke();
      ctx.beginPath();ctx.moveTo(m.x-4,m.y-4);ctx.lineTo(m.x+4,m.y+4);ctx.moveTo(m.x+4,m.y-4);ctx.lineTo(m.x-4,m.y+4);ctx.stroke();
      ctx.font='bold 8px Arial';ctx.textAlign='center';ctx.strokeStyle='#1b1720';ctx.lineWidth=3;const label=(m.label||'RỜI VÙNG ĐỎ')+' · '+Math.max(0,m.duration-m.age).toFixed(1)+'s';ctx.strokeText(label,m.x,m.y-m.r-7);ctx.fillStyle='#ffe9b8';ctx.fillText(label,m.x,m.y-m.r-7);
    }ctx.restore();
  }
  function localBoss(e){return !e.network&&!e.rift&&!e.dead&&e.hp>0&&(e.t===2||e.elite||e.boss);}
  function winding(e){return !!casts.get(e)?.mark&&!casts.get(e).mark.spent;}
  const speed=classCombat.enemySpeed;classCombat.enemySpeed=e=>winding(e)||casts.get(e)?.recovery>0?0:speed(e);
  const blocked=fieldEffects.blocksAttack;fieldEffects.blocksAttack=e=>winding(e)||casts.get(e)?.recovery>0||blocked(e);
  function tick(dt){
    grace=Math.max(0,grace-dt);notice=Math.max(0,notice-dt);banner.hidden=notice<=0;
    for(const [e,s]of casts){if(!E.includes(e)||!localBoss(e)){casts.delete(e);continue;}s.cooldown-=dt;s.recovery=Math.max(0,s.recovery-dt);
      if(s.mark&&!s.mark.spent&&blocked(e)){s.mark=null;s.cooldown=2;s.recovery=.4;fx(e.x,e.y-45,'Ngắt chiêu','#b7eaff');}
      const m=s.mark;if(m){m.age+=dt;if(!m.spent&&m.age>=m.duration){m.spent=true;s.recovery=.85;const inside=Math.hypot(P.x-m.x,P.y-m.y)<=m.r;if(!inside||evading()){if(m.targeted)dodge();}else{const armor=window.totalArmor?totalArmor():0,raw=Math.max(T[e.t].at*(e.attackScale||1)*1.5,mhp()*.12),amount=Math.max(1,Math.round((raw*fieldEffects.attackMultiplier(e)-armor)*(window.newClassCombat?.damageTaken()||1)*(window.equipmentSystem?.damageTaken()||1)));P.hp=Math.max(0,P.hp-amount);P.med=0;fx(P.x,P.y-30,'-'+amount,'#ff9c82');}spark(m.x,m.y,'#ffc587',12);}
        if(m.age>m.duration+.35)s.mark=null;
      }
    }
    for(const e of E){if(!localBoss(e)||Math.hypot(P.x-e.x,P.y-e.y)>240||worldMap.isSafe(P))continue;let s=casts.get(e);if(!s){s={cooldown:2.5,recovery:0,mark:null};casts.set(e,s);}if(s.cooldown<=0&&!s.mark&&!blocked(e)){const furious=e.hp<(e.maxHp||T[e.t].hp)*.5;s.mark={x:P.x,y:P.y,r:furious?48:40,age:0,duration:furious?1.1:1.3,spent:false,targeted:true,label:furious?'CUỒNG NỘ':'BOSS TỤ LỰC'};s.cooldown=furious?4.2:5;window.creatureArt?.onAttack(e);}}
  }
  const update=up;up=function(dt){if(scene!==worldMap.state.scene)clear();if(!paused()&&!worldMap.dialog.isOpen()&&P.ap)tick(dt);return update(dt);};
  const ground=worldMap.drawGroundDetails;worldMap.drawGroundDetails=function(ctx,...args){ground(ctx,...args);for(const s of casts.values())if(s.mark)drawTelegraph(ctx,s.mark);};
  const reset=classCombat.onRespawn;classCombat.onRespawn=function(){clear();return reset();};
  const change=worldMap.switchScene;worldMap.switchScene=function(...args){clear();return change(...args);};
  window.combatDefense={evade,evading,dodge,clear,drawTelegraph,casts,grace:()=>grace};
})();
