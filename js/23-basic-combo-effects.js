/* Hiệu ứng đánh thường: ảnh pháp khí gốc, kiếm khí và linh phù riêng từng phái. */
(function () {
  const combat=window.basicCombat;
  if(!combat)return;
  const TAU=Math.PI*2,HEIGHT=18;
  const colors=['#83d6ff','#66ffe0','#bb97ff','#ffe29c'];
  const weapons=['Kiem','Liem','Thuong','Quat'].map(folder=>{
    const img=new Image();img.src='CHARACTER/'+folder+'/VuKhi/vukhi.png';return img;
  });
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const progress=o=>clamp((o.age||0)/(o.duration||.3),0,1);
  const ready=img=>img.complete&&img.naturalWidth>0;
  function weapon(ctx,sect,x,y,size,angle=0,alpha=1) {
    const img=weapons[sect];if(!ready(img))return;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
    const width=size*img.naturalWidth/img.naturalHeight;
    ctx.shadowColor=colors[sect];ctx.shadowBlur=5;
    ctx.drawImage(img,-width/2,-size/2,width,size);ctx.restore();
  }
  function glow(ctx,x,y,r,color,alpha) {
    if(r<=0||alpha<=0)return;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=alpha;
    const light=ctx.createRadialGradient(x,y,0,x,y,r);
    light.addColorStop(0,color);light.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=light;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  }
  function line(ctx,points,color,width=2,alpha=1) {
    if(points.length<2)return;
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=alpha;
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
    ctx.stroke();ctx.restore();
  }
  function trail(ctx,p) {
    const points=(p.trail||[]).slice(-14).concat(p);
    const color=colors[p.sect];
    for(let i=1;i<points.length;i++){
      const strength=i/points.length,opacity=(p.returning?.6:.85)*strength;
      const segment=[{x:points[i-1].x,y:points[i-1].y-HEIGHT},{x:points[i].x,y:points[i].y-HEIGHT}];
      line(ctx,segment,color,(p.sect===1?4:3.5)*strength,opacity*.35);
      line(ctx,segment,'#f5ffff',.8*strength,opacity*.65);
    }
  }
  // Giấy vàng, dấu đỏ và nét phù: quạt điều khiển pháp khí từ xa.
  function talisman(ctx,x,y,size,angle,large=false,alpha=1) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=alpha;
    const h=size,w=size*.48;
    ctx.shadowColor='#ffe09b';ctx.shadowBlur=large?8:4;
    ctx.fillStyle='#fff0b5';ctx.strokeStyle='#d49e4b';ctx.lineWidth=.9;
    ctx.beginPath();ctx.moveTo(-w/2,-h/2);ctx.lineTo(w/2,-h/2+1.2);
    ctx.lineTo(w/2-.7,h/2);ctx.lineTo(-w/2+.4,h/2-1);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='#9c352a';ctx.lineWidth=large?1.25:1;ctx.lineCap='round';
    ctx.strokeRect(-w*.24,-h*.36,w*.48,h*.16);
    ctx.beginPath();ctx.moveTo(-w*.23,-h*.05);ctx.lineTo(w*.25,-h*.1);
    ctx.moveTo(0,-h*.15);ctx.lineTo(-w*.07,h*.31);
    ctx.moveTo(-w*.28,h*.14);ctx.lineTo(w*.22,h*.05);
    ctx.moveTo(-w*.18,h*.26);ctx.lineTo(w*.24,h*.3);ctx.stroke();
    ctx.restore();
  }
  function projectile(ctx,p) {
    trail(ctx,p);const y=p.y-HEIGHT,size=p.size||(p.sect===1&&p.step===2?31:24);
    glow(ctx,p.x,y,size*.8,colors[p.sect],p.returning?.1:.17);
    if(p.sect===0)weapon(ctx,0,p.x,y,size,p.angle-Math.PI/2);
    else if(p.sect===1){
      weapon(ctx,1,p.x,y,size,p.angle+(p.age||0)*(p.returning?-7:5),p.returning?.8:1);
      if(p.step===2){
        ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle=colors[1];ctx.lineWidth=.8;
        ctx.beginPath();ctx.arc(p.x,y,size*.64,(p.age||0)*4,(p.age||0)*4+Math.PI*1.45);ctx.stroke();ctx.restore();
      }
    }else if(p.sect===3)talisman(ctx,p.x,y,size,p.angle+Math.PI/2,p.step===2);
  }
  function arc(ctx,x,y,angle,radius,start,end,color,alpha=1) {
    const points=[];
    for(let i=0;i<=22;i++){
      const a=angle+start+(end-start)*i/22;
      points.push({x:x+Math.cos(a)*radius,y:y+Math.sin(a)*radius*.66});
    }
    line(ctx,points,color,5,alpha*.2);line(ctx,points,color,2.8,alpha*.7);
    line(ctx,points,'#f4ffff',.9,alpha);
  }
  function swordSwing(ctx,s,p,alpha) {
    const r=s.radius||57,step=s.step;
    if(step<2){
      const sign=step===0?1:-1,head=-1.2+2.4*clamp(p/.7,0,1);
      arc(ctx,s.x,s.y-HEIGHT,s.angle,r,sign*(head-.85),sign*head,colors[0],alpha);
      const a=s.angle+sign*head;
      weapon(ctx,0,s.x+Math.cos(a)*r*.6,s.y-HEIGHT+Math.sin(a)*r*.42,29,a-Math.PI/2,alpha*.85);
    }else if(step===2){
      const length=r*clamp(p/.5,0,1);
      line(ctx,[{x:s.x-Math.cos(s.angle)*15,y:s.y-HEIGHT-Math.sin(s.angle)*15},
        {x:s.x+Math.cos(s.angle)*length,y:s.y-HEIGHT+Math.sin(s.angle)*length}],colors[0],2,alpha*.5);
    }else{
      const x=s.x+Math.cos(s.angle)*r*.6,y=s.y-HEIGHT+Math.sin(s.angle)*r*.6;
      for(const delta of [-.6,.6]){
        const a=s.angle+delta,length=18+12*Math.sin(p*Math.PI);
        line(ctx,[{x:x-Math.cos(a)*length,y:y-Math.sin(a)*length},{x:x+Math.cos(a)*length,y:y+Math.sin(a)*length}],colors[0],3,alpha*.65);
      }
    }
  }
  function spearSwing(ctx,s,p,alpha) {
    const r=s.radius||72,step=s.step,angle=s.angle||0;
    const x=s.x,y=s.y-HEIGHT;
    if(step===0){
      const reach=r*(.2+.8*Math.sin(clamp(p/.78,0,1)*Math.PI/2));
      line(ctx,[{x,y},{x:x+Math.cos(angle)*reach,y:y+Math.sin(angle)*reach}],colors[2],3,alpha*.65);
      weapon(ctx,2,x+Math.cos(angle)*reach*.62,y+Math.sin(angle)*reach*.62,57,angle+Math.PI/2,alpha);
    }else if(step===1){
      const head=.8-1.65*clamp(p/.72,0,1);
      arc(ctx,x,y,angle,r*.75,head+.65,head,colors[2],alpha);
      weapon(ctx,2,x+Math.cos(angle+head)*r*.4,y+Math.sin(angle+head)*r*.4,55,angle+head+Math.PI/2,alpha);
    }else if(step===2){
      const head=-1.65+3.3*clamp(p/.72,0,1);
      arc(ctx,x,y,angle,r,head-.9,head,colors[2],alpha);
      weapon(ctx,2,x+Math.cos(angle+head)*r*.42,y+Math.sin(angle+head)*r*.3,58,angle+head+Math.PI/2,alpha);
    }else{
      const landX=x+Math.cos(angle)*31,landY=s.y+Math.sin(angle)*31;
      weapon(ctx,2,landX,landY-33+23*clamp(p/.38,0,1),62,Math.PI,alpha);
      if(p>.25){
        const expand=clamp((p-.25)/.65,0,1);ctx.save();ctx.globalAlpha=alpha*.8;
        ctx.strokeStyle=colors[2];ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(landX,landY,9+28*expand,4+12*expand,0,0,TAU);ctx.stroke();ctx.restore();
      }
    }
  }
  function castSwing(ctx,s,p,alpha) {
    const fan=s.sect===3,color=colors[s.sect];
    glow(ctx,s.x,s.y-HEIGHT,fan?19:15,color,alpha*.16);
    if(fan){
      const source=window.characterWeapon?.position(3,s.x,s.y)||{x:s.x,y:s.y-20};
      weapon(ctx,3,source.x,source.y,32,(s.angle||0)*.12+Math.sin(p*Math.PI)*.4,alpha*.85);
      ctx.save();ctx.translate(source.x,source.y);ctx.globalAlpha=alpha*.75;ctx.strokeStyle=color;ctx.lineWidth=.9;
      ctx.beginPath();ctx.arc(0,0,16+4*p,-.6+p,Math.PI*1.25+p);ctx.stroke();ctx.restore();
    }
  }
  function swing(ctx,s) {
    const p=progress(s),alpha=Math.sin(Math.PI*clamp((1-p)*1.35,0,1))*.25+1-p;
    if(s.sect===0)swordSwing(ctx,s,p,alpha);
    else if(s.sect===2)spearSwing(ctx,s,p,alpha);
    else castSwing(ctx,s,p,alpha);
  }
  function rays(ctx,x,y,r,angle,color,alpha,count=7) {
    for(let i=0;i<count;i++){
      const a=angle+i*TAU/count,length=r*(i%2?.75:1);
      line(ctx,[{x:x+Math.cos(a)*r*.3,y:y+Math.sin(a)*r*.3},
        {x:x+Math.cos(a)*length,y:y+Math.sin(a)*length}],color,1.4,alpha);
    }
  }
  function effect(ctx,e) {
    const p=progress(e),alpha=1-p,color=colors[e.sect]||colors[0];
    const x=e.x,y=e.y-HEIGHT,r=e.radius||22;
    if(e.kind==='lightning'){
      const height=52+Math.min(20,r*.3),seed=e.x*.11+e.y*.05;
      const bolt=[];for(let i=0;i<=7;i++)bolt.push({x:x+(i===0||i===7?0:Math.sin(seed+i*2.8)*7),y:y-height+height*i/7});
      line(ctx,bolt,color,6,alpha*.25);line(ctx,bolt,'#f7efff',1.8,alpha);
      line(ctx,[bolt[3],{x:bolt[3].x+16,y:bolt[3].y+8},{x:bolt[3].x+11,y:bolt[3].y+18}],color,1,alpha*.8);
      glow(ctx,x,y,18,color,alpha*.4);rays(ctx,x,y,8+14*p,0,color,alpha*.8,5);
    }else if(e.kind==='x'){
      const length=r*(.45+.55*Math.sin(p*Math.PI));
      for(const a of [(e.angle||0)+.65,(e.angle||0)-.65]){
        const points=[{x:x-Math.cos(a)*length,y:y-Math.sin(a)*length},{x:x+Math.cos(a)*length,y:y+Math.sin(a)*length}];
        line(ctx,points,color,6,alpha*.2);line(ctx,points,'#eaffff',1.8,alpha);
      }
      glow(ctx,x,y,18,color,alpha*.22);
    }else if(e.kind==='seal'){
      ctx.save();ctx.translate(x,y);ctx.rotate(-.25+p*.35);ctx.globalAlpha=alpha;
      ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1;
      ctx.strokeRect(-7,-9,14,18);ctx.beginPath();ctx.moveTo(-4,-3);ctx.lineTo(4,-3);
      ctx.moveTo(0,-6);ctx.lineTo(0,6);ctx.moveTo(-4,3);ctx.lineTo(4,3);ctx.stroke();ctx.restore();
      glow(ctx,x,y,17,color,alpha*.18);
    }else if(e.kind==='converge'){
      const orbit=r*(1-p),spin=(e.angle||0)+p*1.7;
      for(let i=0;i<3;i++){
        const a=spin+i*TAU/3;weapon(ctx,1,x+Math.cos(a)*orbit,y+Math.sin(a)*orbit*.7,13,a,alpha*.85);
      }
      glow(ctx,x,y,11+20*p,color,alpha*.27);
    }else if(e.kind==='explode'){
      const radius=r*(.18+.82*Math.sqrt(p));
      ctx.save();ctx.globalAlpha=alpha*.85;ctx.strokeStyle=color;ctx.lineWidth=2*(1-p)+.5;
      ctx.beginPath();ctx.arc(x,y,radius,0,TAU);ctx.stroke();ctx.restore();
      rays(ctx,x,y,radius*1.1,(e.angle||0)+.3,color,alpha*.7,8);
      glow(ctx,x,y,r*.8,color,alpha*.3);
      if(e.sect===3)for(let i=0;i<3;i++){
        const a=i*TAU/3+(e.angle||0);talisman(ctx,x+Math.cos(a)*radius*.65,y+Math.sin(a)*radius*.65,8,a+p,false,alpha*.65);
      }
    }else{
      rays(ctx,x,y,4+Math.min(r,19)*p,e.angle||0,color,alpha*.8,5);
      glow(ctx,x,y,10,color,alpha*.32);
    }
  }
  function drawEffects(ctx) {
    const state=combat.state;if(!state)return;
    ctx.save();ctx.imageSmoothingEnabled=true;
    for(const s of state.swings||[])swing(ctx,s);
    for(const p of state.projectiles||[])projectile(ctx,p);
    for(const e of state.effects||[])effect(ctx,e);
    ctx.restore();
  }
  combat.drawEffects=drawEffects;
  const previousDraw=dr;
  dr=function(){
    previousDraw();if(paused()||!P.ap)return;
    const camera=gameCamera();g.save();g.setTransform(Z,0,0,Z,-camera.x*Z,-camera.y*Z);
    drawEffects(g);g.restore();
  };
})();
