/* Temporary skill sandbox and class-colored tears in space. */
(function(){
  const tears=[],colors=['#68cfff','#60ffd0','#b18aff','#ffd876'];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let requested=false;window.gmTest={get enabled(){return requested&&account.state.user?.gm===true;}};
  const button=document.createElement('button');button.id='gm-skills';
  button.type='button';button.textContent='GM · Test skill';button.setAttribute('aria-pressed','false');
  button.title='Bật/tắt thử 4 kỹ năng, hồi linh lực và xóa hồi chiêu. Mở GM Công cụ để đặt cảnh giới/tầng hoặc lấy trang bị. Tăng tầng, đột phá và cường hóa miễn phí.';
  button.hidden=true;$('bt').appendChild(button);
  addEventListener('tienlo-auth',()=>{requested=false;button.hidden=account.state.user?.gm!==true;button.setAttribute('aria-pressed','false');});
  button.onclick=()=>{
    if(!P.ap||account.state.user?.gm!==true)return;
    requested=!requested;window.dispatchEvent(new CustomEvent('tienlo-gm-change',{detail:{enabled:gmTest.enabled}}));button.setAttribute('aria-pressed',String(gmTest.enabled));
    button.textContent=gmTest.enabled?'GM · Đang test · Tắt':'GM · Test skill';
    getClassCombat().state.cooldown.fill(0);P.mp=gmTest.enabled?Math.max(mmp(),...combatMana[P.ap.w]):Math.min(P.mp,mmp());cultivation.refresh();
    msg(gmTest.enabled?'GM Test: mở tạm 4 skill, hồi linh lực, không chờ hồi chiêu; tăng tầng, đột phá và cường hóa miễn phí.':'Đã tắt GM Test, khôi phục điều kiện kỹ năng và chi phí tu luyện, cường hóa.');
  };
  const style=document.createElement('style');style.textContent='#gm-skills{border-color:#b99a60!important;color:#edce8b!important}#gm-skills[aria-pressed=true]{background:#514027!important;box-shadow:0 0 12px #eab75b44!important}';document.head.appendChild(style);
  function spawn(start,end,index){
    for(const [point,delay]of [[start,0],[end,.1]])tears.push({x:point.x,y:point.y-23,age:-delay,index});
    if(tears.length>16)tears.splice(0,tears.length-16);
  }
  const castSkill=skill;
  skill=function(i){
    const combat=getClassCombat(),before=P.mp,start={x:P.x,y:P.y};
    if(gmTest.enabled&&!paused()&&!worldMap.dialog.isOpen()){
      combat.state.cooldown.fill(0);P.mp=Math.max(mmp(),...combatMana[P.ap.w]);
    }
    const mana=P.mp,result=castSkill(i);
    if(i===1&&P.mp<mana){
      window.combatDefense?.evade(.22);
      let end=combat.state.dash?.end||combat.state.blink?.end||{x:P.x,y:P.y};
      // Sword/moon have native movement; spear/fan gain a short, collision-safe step.
      if(P.ap.w>=2){
        const aim=combat.state.aim||{x:P.x+(P.dir===2?P.f:0)*160,y:P.y+(P.dir===1?-1:P.dir===2?0:1)*160};
        const dx=aim.x-P.x,dy=aim.y-P.y,d=Math.hypot(dx,dy)||1;
        end=worldMap.traceMove(start,{x:P.x+dx/d*Math.min(d,160),y:P.y+dy/d*Math.min(d,160)});
        P.x=end.x;P.y=end.y;ptr=null;
      }
      if(Math.hypot(end.x-start.x,end.y-start.y)>2&&!window.skillVfx?.owns(P.ap.w))spawn(start,end,P.ap.w);
    }
    if(gmTest.enabled){combat.state.cooldown.fill(0);P.mp=Math.max(before,mmp(),...combatMana[P.ap.w]);cultivation.refresh();}
    return result;
  };
  function outline(ctx,scale,t){
    ctx.beginPath();
    for(let n=0;n<32;n++){
      const a=n/32*Math.PI*2,rough=1+.045*Math.sin(n*2.7)+.025*Math.sin(n*5.3+t);
      const x=Math.cos(a)*7*rough*scale,y=Math.sin(a)*23*rough;
      n?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.closePath();
  }
  function render(ctx,r){
    const p=r.age/.55;if(p<0||p>=1)return;
    const open=Math.min(1,p/.22,(1-p)/.45),t=reduced.matches?0:r.age*3,color=colors[r.index];
    ctx.save();ctx.translate(r.x,r.y);ctx.globalAlpha=open*.28;
    ctx.scale(Math.max(.04,open),.7+open*.3);
    ctx.globalCompositeOperation='lighter';ctx.shadowColor=color;
    for(const [width,blur,alpha]of [[2.2,7,.16],[.9,2,.48]]){
      outline(ctx,1,t);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowBlur=blur;ctx.globalAlpha=alpha*open;ctx.stroke();
    }
    ctx.restore();
  }
  const update=up;up=function(dt){update(dt);if(gmTest.enabled&&P.ap){P.mp=Math.max(mmp(),...combatMana[P.ap.w]);cultivation.refresh();}if(paused())return;for(const r of tears)r.age+=dt;for(let i=tears.length-1;i>=0;i--)if(tears[i].age>=.55)tears.splice(i,1);};
  const draw=dr;dr=function(){draw();if(paused())return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);for(const r of tears)render(g,r);g.restore();};
  const respawn=classCombat.onRespawn;classCombat.onRespawn=function(){tears.length=0;return respawn();};
  window.voidStep={tears,outlineOnly:true};
})();
