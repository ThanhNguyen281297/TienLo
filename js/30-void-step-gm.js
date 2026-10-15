/* Temporary skill sandbox and class-colored tears in space. */
(function(){
  const tears=[],colors=['#68cfff','#60ffd0','#b18aff','#ffd876'];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  window.gmTest={enabled:false};
  const button=document.createElement('button');button.id='gm-skills';
  button.type='button';button.textContent='GM · Test skill';button.setAttribute('aria-pressed','false');
  button.title='Bật/tắt thử 4 kỹ năng, hồi linh lực và xóa hồi chiêu. Không đổi cảnh giới hoặc kỹ năng đã học.';
  $('bt').appendChild(button);
  button.onclick=()=>{
    if(!P.ap)return;
    gmTest.enabled=!gmTest.enabled;button.setAttribute('aria-pressed',String(gmTest.enabled));
    button.textContent=gmTest.enabled?'GM · Đang test · Tắt':'GM · Test skill';
    getClassCombat().state.cooldown.fill(0);P.mp=gmTest.enabled?Math.max(mmp(),...combatMana[P.ap.w]):Math.min(P.mp,mmp());cultivation.refresh();
    msg(gmTest.enabled?'GM Test: mở tạm 4 skill, hồi linh lực, không chờ hồi chiêu. Tắt để trở về tiến trình thật.':'Đã tắt GM Test, khôi phục điều kiện kỹ năng đã học.');
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
      let end=combat.state.dash?.end||combat.state.blink?.end||{x:P.x,y:P.y};
      // Sword/moon have native movement; spear/fan gain a short, collision-safe step.
      if(P.ap.w>=2){
        const aim=combat.state.aim||{x:P.x+(P.dir===2?P.f:0)*160,y:P.y+(P.dir===1?-1:P.dir===2?0:1)*160};
        const dx=aim.x-P.x,dy=aim.y-P.y,d=Math.hypot(dx,dy)||1;
        end=worldMap.traceMove(start,{x:P.x+dx/d*Math.min(d,160),y:P.y+dy/d*Math.min(d,160)});
        P.x=end.x;P.y=end.y;ptr=null;
      }
      if(Math.hypot(end.x-start.x,end.y-start.y)>2)spawn(start,end,P.ap.w);
    }
    if(gmTest.enabled){combat.state.cooldown.fill(0);P.mp=Math.max(before,mmp(),...combatMana[P.ap.w]);cultivation.refresh();}
    return result;
  };
  function outline(ctx,scale,t){
    ctx.beginPath();
    for(let n=0;n<32;n++){
      const a=n/32*Math.PI*2,rough=1+.13*Math.sin(n*2.7)+.08*Math.sin(n*5.3+t);
      const x=Math.cos(a)*13*rough*scale,y=Math.sin(a)*32*rough;
      n?ctx.lineTo(x,y):ctx.moveTo(x,y);
    }
    ctx.closePath();
  }
  function render(ctx,r){
    const p=r.age/.85;if(p<0||p>=1)return;
    const open=Math.min(1,p/.14,(1-p)/.28),t=reduced.matches?0:r.age*3,color=colors[r.index];
    ctx.save();ctx.translate(r.x,r.y);ctx.globalAlpha=Math.min(1,open*2);
    ctx.scale(Math.max(.04,open),.7+open*.3);
    // A dark interior with colored depth, bounded by a jagged luminous seam.
    outline(ctx,1,t);const core=ctx.createRadialGradient(-3,0,0,0,0,34);
    core.addColorStop(0,'#162e48');core.addColorStop(.45,'#07121f');core.addColorStop(1,'#01050c');
    ctx.fillStyle=core;ctx.fill();ctx.save();ctx.clip();
    ctx.strokeStyle=color;ctx.globalAlpha=.13;ctx.lineWidth=.7;
    for(let n=0;n<4;n++){ctx.beginPath();ctx.ellipse(Math.sin(t+n)*4,Math.cos(t+n)*10,4+n*2,9+n*4,t+n,0,Math.PI*2);ctx.stroke();}ctx.restore();
    ctx.globalCompositeOperation='lighter';ctx.shadowColor=color;
    for(const [width,blur,alpha]of [[5,15,.35],[2,6,.8],[.7,2,.95]]){
      outline(ctx,1,t);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowBlur=blur;ctx.globalAlpha=alpha*open;ctx.stroke();
    }
    ctx.shadowBlur=0;
    for(let n=0;n<12;n++){
      const a=n*Math.PI*2/12,life=(r.age*.7+n*.618)%1,rad=2+life*4;
      const x=Math.cos(a)*(15+life*9),y=Math.sin(a)*(32+life*10);
      const mist=ctx.createRadialGradient(x,y,0,x,y,rad);mist.addColorStop(0,color+'aa');mist.addColorStop(1,color+'00');
      ctx.globalAlpha=Math.sin(life*Math.PI)*open*.55;ctx.fillStyle=mist;ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
    }
    ctx.restore();
  }
  const update=up;up=function(dt){update(dt);if(gmTest.enabled&&P.ap){P.mp=Math.max(mmp(),...combatMana[P.ap.w]);cultivation.refresh();}if(paused())return;for(const r of tears)r.age+=dt;for(let i=tears.length-1;i>=0;i--)if(tears[i].age>=.85)tears.splice(i,1);};
  const draw=dr;dr=function(){draw();if(paused())return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);for(const r of tears)render(g,r);g.restore();};
  const respawn=classCombat.onRespawn;classCombat.onRespawn=function(){tears.length=0;return respawn();};
  window.voidStep={tears};
})();
