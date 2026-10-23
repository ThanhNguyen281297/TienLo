/* Skill impact layer: class-signature cast flourishes, hit impacts, light
   screen shake and an ultimate flash. Presentation only - damage, cooldown,
   mana, hit timing and network messages are untouched.
   0 Kiếm: light pillar + orbiting sword glyphs; X-slash with shards.
   1 Minh Nguyệt: crescent halo; crescent slash with frost ring.
   2 Lôi Thương: sky lightning; forked bolt with branching sparks.
   3 Thiên Cơ: spinning hexagram talisman; paper talismans and glyph ring. */
(function(){
 const COLORS=[['#7bcaff','#e8f8ff'],['#80ffe3','#effffb'],['#bf95ff','#f6eeff'],['#ffdc91','#fff7df']];
 const fx=[],lastHit=new WeakMap(),reduced=matchMedia('(prefers-reduced-motion: reduce)'),coarse=matchMedia('(pointer:coarse)');
 const MAX=coarse.matches?28:48;
 let shake=0,shakeT=0,flash=0,flashColor='#fff',last=performance.now();
 const cls=()=>Math.max(0,Math.min(3,P.ap?.w||0));
 const rnd=(a,b)=>a+Math.random()*(b-a);
 function add(e){fx.push(e);if(fx.length>MAX)fx.shift();}
 function kick(amount,ultimate){if(reduced.matches)return;shake=Math.max(shake,amount);if(ultimate){flash=.32;flashColor=COLORS[cls()][0];}}
 function jag(x0,y0,x1,y1,segments,spread){const pts=[[x0,y0]];for(let i=1;i<segments;i++){const t=i/segments;pts.push([x0+(x1-x0)*t+rnd(-spread,spread),y0+(y1-y0)*t+rnd(-spread*.4,spread*.4)]);}pts.push([x1,y1]);return pts;}

 /* ---------- cast flourishes ---------- */
 function castFlourish(index){
  const c=cls(),[color,core]=COLORS[c],ult=index===3,scale=ult?1.6:index===2?1.2:1;
  const aim=ult?(window.getClassCombat?.().state?.aim||P):P;
  const base={c,color,core,age:0,scale,x:P.x,y:P.y,ax:aim.x,ay:aim.y};
  if(c===0)add({...base,kind:'pillar',life:.55*scale,blades:Array.from({length:ult?10:6},(_,i)=>i/(ult?10:6)*Math.PI*2)});
  if(c===1)add({...base,kind:'crescent',life:.6*scale,rot:rnd(-.4,.4)});
  if(c===2){add({...base,kind:'sky',life:.38*scale,bolts:Array.from({length:ult?4:2},()=>jag(P.x+rnd(-26,26),P.y-260,P.x+rnd(-6,6),P.y-18,9,22))});kick(ult?6:2.5,ult);}
  if(c===3)add({...base,kind:'sigil',life:.75*scale});
  if(ult){add({...base,kind:'ring',life:.9,x:aim.x,y:aim.y,radius:170});kick(5,true);}
 }
 /* ---------- hit impacts ---------- */
 function impact(enemy,power){
  const now=performance.now();if(now-(lastHit.get(enemy)||0)<70)return;lastHit.set(enemy,now);
  const c=cls(),[color,core]=COLORS[c],basic=!!(window.basicCombat?.state?.dealing),strong=!basic&&power>atk()*1.4;
  const s=basic?.65:strong?1.35:1,x=enemy.x,y=enemy.y-(enemy.boss||enemy.t===2?30:18);
  const base={c,color,core,age:0,scale:s,x,y};
  if(c===0)add({...base,kind:'xslash',life:.26,angle:rnd(-.5,.5),shards:Array.from({length:basic?4:8},()=>({a:rnd(0,Math.PI*2),v:rnd(60,150)}))});
  if(c===1)add({...base,kind:'moonslash',life:.32,angle:rnd(-.6,.6)});
  if(c===2)add({...base,kind:'fork',life:.22,bolt:jag(x+rnd(-14,14),y-120*s,x,y,7,14),sparks:Array.from({length:basic?3:7},()=>jag(x,y,x+rnd(-40,40)*s,y+rnd(-20,24)*s,4,6))});
  if(c===3)add({...base,kind:'talisman',life:.5,papers:Array.from({length:basic?3:6},()=>({a:rnd(0,Math.PI*2),v:rnd(40,90),spin:rnd(-6,6)}))});
  if(!basic)add({...base,kind:'bloom',life:.22});
  if(strong)kick(c===2?3.5:2.2,false);
 }
 /* ---------- drawing ---------- */
 function stroke(points,width,color,alpha){g.globalAlpha=alpha;g.strokeStyle=color;g.lineWidth=width;g.beginPath();points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.stroke();}
 function draw(e){
  const p=Math.min(1,e.age/e.life),fade=1-p,s=e.scale;
  switch(e.kind){
   case 'pillar':{ // vertical light column + orbiting sword glyphs
    const h=150*s,w=14*s*(1-p*.5),gr=g.createLinearGradient(e.x,e.y-h,e.x,e.y);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.6,e.color);gr.addColorStop(1,e.core);
    g.globalAlpha=fade*.55;g.fillStyle=gr;g.fillRect(e.x-w/2,e.y-h,w,h);
    for(const a0 of e.blades){const a=a0+p*4,r=(26+p*22)*s,bx=e.x+Math.cos(a)*r,by=e.y-20+Math.sin(a)*r*.45;g.save();g.translate(bx,by);g.rotate(a+Math.PI/2);g.globalAlpha=fade*.9;g.fillStyle=e.core;g.beginPath();g.moveTo(0,-9*s);g.lineTo(2*s,0);g.lineTo(0,4*s);g.lineTo(-2*s,0);g.closePath();g.fill();g.restore();}
    break;}
   case 'crescent':{ // thin crescent halo behind the caster's head
    const r=(18+p*10)*s;g.save();g.translate(e.x,e.y-30);g.rotate(e.rot+p*.8);g.lineCap='round';
    for(const [w,c,a]of [[6*s,e.color,.3],[2*s,e.core,.85]]){g.globalAlpha=fade*a;g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.arc(0,0,r,Math.PI*.6,Math.PI*1.75);g.stroke();}
    g.restore();
    for(let i=0;i<6;i++){const a=i+p*3,rr=r*1.3*p;g.globalAlpha=fade*.7;g.fillStyle=e.core;g.beginPath();g.arc(e.x+Math.cos(a)*rr,e.y-30+Math.sin(a)*rr*.6,1.3,0,Math.PI*2);g.fill();}
    break;}
   case 'sky':{ // lightning from the sky to the caster
    const flick=Math.random()<.7;for(const bolt of e.bolts){if(!flick)continue;stroke(bolt,6*s,e.color,fade*.35);stroke(bolt,2*s,e.core,fade);}
    g.globalAlpha=fade*.6;g.strokeStyle=e.color;g.lineWidth=2;g.beginPath();g.ellipse(e.x,e.y,34*s*(.4+p),13*s*(.4+p),0,0,Math.PI*2);g.stroke();
    break;}
   case 'sigil':{ // spinning hexagram talisman under the caster
    const r=34*s*(.6+p*.5);g.save();g.translate(e.x,e.y);g.scale(1,.5);g.rotate(p*3);g.globalAlpha=fade*.85;g.strokeStyle=e.color;g.lineWidth=2;
    for(const k of [1,.72]){g.beginPath();g.arc(0,0,r*k,0,Math.PI*2);g.stroke();}
    for(const off of [0,Math.PI/3]){g.beginPath();for(let i=0;i<3;i++){const a=off+i/3*Math.PI*2-Math.PI/2;i?g.lineTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7):g.moveTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7);}g.closePath();g.stroke();}
    g.strokeStyle=e.core;g.lineWidth=1;for(let i=0;i<12;i++){const a=i/12*Math.PI*2;g.beginPath();g.moveTo(Math.cos(a)*r*.86,Math.sin(a)*r*.86);g.lineTo(Math.cos(a)*r,Math.sin(a)*r);g.stroke();}
    g.restore();break;}
   case 'ring':{ // ultimate shockwave at the aim point
    const r=e.radius*(.2+p*.8);for(const [w,a]of [[10,.25],[3,.8]]){g.globalAlpha=fade*a;g.strokeStyle=a>.5?e.core:e.color;g.lineWidth=w*fade+1;g.beginPath();g.ellipse(e.x,e.y,r,r*.5,0,0,Math.PI*2);g.stroke();}
    break;}
   case 'xslash':{ // crossing sword slashes with flying shards
    const len=34*s*(.4+p*.8);g.save();g.translate(e.x,e.y);g.rotate(e.angle);
    for(const a of [-.75,.75]){g.save();g.rotate(a);const gr=g.createLinearGradient(-len,0,len,0);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(.5,e.core);gr.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=fade;g.fillStyle=gr;g.fillRect(-len,-2.2*s*fade-.4,len*2,4.4*s*fade+.8);g.restore();}
    g.restore();
    for(const sh of e.shards){const d=sh.v*e.age;g.globalAlpha=fade;g.fillStyle=sh.v>110?e.core:e.color;g.save();g.translate(e.x+Math.cos(sh.a)*d,e.y+Math.sin(sh.a)*d*.6+e.age*e.age*120);g.rotate(sh.a);g.fillRect(-3,-.8,6,1.6);g.restore();}
    break;}
   case 'moonslash':{ // crescent arc slash + frost ring
    const r=26*s;g.save();g.translate(e.x,e.y);g.rotate(e.angle);g.globalAlpha=fade;g.strokeStyle=e.core;g.lineWidth=3.2*s*fade+.4;g.beginPath();g.arc(0,0,r,-Math.PI*.15-p*.6,Math.PI*.85-p*.6);g.stroke();
    g.strokeStyle=e.color;g.lineWidth=7*s*fade;g.globalAlpha=fade*.35;g.stroke();g.restore();
    g.globalAlpha=fade*.6;g.strokeStyle=e.color;g.lineWidth=1.2;g.beginPath();g.ellipse(e.x,e.y+12,r*(.6+p),r*(.6+p)*.42,0,0,Math.PI*2);g.stroke();
    break;}
   case 'fork':{ // forked bolt with branching sparks
    if(Math.random()<.8){stroke(e.bolt,5*s,e.color,fade*.4);stroke(e.bolt,1.6*s,e.core,fade);}
    for(const sp of e.sparks)stroke(sp,1,Math.random()<.5?e.core:e.color,fade*.9);
    break;}
   case 'talisman':{ // paper talismans thrown outward + glyph ring
    for(const t of e.papers){const d=t.v*e.age;g.save();g.translate(e.x+Math.cos(t.a)*d,e.y+Math.sin(t.a)*d*.6-e.age*20);g.rotate(t.spin*e.age);g.globalAlpha=fade;g.fillStyle='#f6e7c0';g.fillRect(-3*s,-5*s,6*s,10*s);g.fillStyle='#c0392b';g.fillRect(-1.2*s,-3.5*s,2.4*s,7*s);g.restore();}
    g.globalAlpha=fade*.7;g.strokeStyle=e.color;g.lineWidth=1.4;g.beginPath();g.ellipse(e.x,e.y+10,22*s*(.5+p),9*s*(.5+p),0,0,Math.PI*2);g.stroke();
    break;}
   case 'bloom':{ // short bright light burst
    const r=26*s*(.6+p);const gr=g.createRadialGradient(e.x,e.y,0,e.x,e.y,r);gr.addColorStop(0,e.core);gr.addColorStop(.35,e.color);gr.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=fade*.55;g.fillStyle=gr;g.fillRect(e.x-r,e.y-r,r*2,r*2);
    break;}
  }
 }
 /* ---------- hooks ---------- */
 const baseSkill=skill;
 skill=function(index){
  const mp=P.mp,result=baseSkill(index);
  try{if(P.ap&&P.mp<mp&&Number.isInteger(index))castFlourish(index);}catch(e){}
  return result;
 };
 const baseHit=hit;
 hit=function(enemy,power){
  const alive=enemy&&!enemy.dead&&enemy.hp>0;
  const result=baseHit(enemy,power);
  try{if(alive&&P.ap&&!enemy.rewardReplay&&power>1)impact(enemy,power);}catch(e){}
  return result;
 };
 const baseDraw=dr;
 dr=function(){
  baseDraw();
  const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
  if(!P.ap)return;
  try{
   if(fx.length){
    const cam=gameCamera();g.save();g.setTransform(Z,0,0,Z,-cam.x*Z,-cam.y*Z);g.globalCompositeOperation='lighter';g.lineCap=g.lineJoin='round';
    for(const e of fx){e.age+=dt;if(e.age<e.life)draw(e);}
    g.restore();
    for(let i=fx.length-1;i>=0;i--)if(fx[i].age>=fx[i].life)fx.splice(i,1);
   }
   if(flash>0){g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='lighter';g.globalAlpha=flash*.5;g.fillStyle=flashColor;g.fillRect(0,0,W,H);g.restore();flash=Math.max(0,flash-dt*1.6);}
  }catch(e){fx.length=0;}
  // Screen shake moves the canvas element only; world and aim coordinates stay exact.
  if(shake>0){shakeT+=dt;const a=shake*Math.min(1,shake);cv.style.transform='translate('+(Math.sin(shakeT*90)*a).toFixed(2)+'px,'+(Math.cos(shakeT*77)*a*.7).toFixed(2)+'px)';shake=Math.max(0,shake-dt*22);if(!shake)cv.style.transform='';}
 };
 const respawn=classCombat.onRespawn;classCombat.onRespawn=function(...a){fx.length=0;shake=flash=0;cv.style.transform='';return respawn.apply(this,a);};
 window.skillImpact={fx,castFlourish,impact};
})();
