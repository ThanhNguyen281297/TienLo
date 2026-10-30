/* Skill VFX for Minh Nguyệt (1), Lôi Thương (2) and Thiên Cơ (3), in the same bright
   wuxia style as Kiếm Tông (js/68-skill-vfx.js), drawn entirely with canvas code.

   Presentation only. Timing, damage and state stay in js/15-minh-nguyet-skills.js and
   js/15b-new-class-skills.js; their draw functions hand off to skillVfx.draw/ground
   and this file reads their state:
   - Minh Nguyệt: frost-silver crescent blades, a moon seal with lunar phases, a full
     moon rising for Nguyệt Thần Giáng Thế, a crescent storm and a frost shockwave.
   - Lôi Thương: violet lightning spear dash, a crackling sweep, a thunder seal that
     calls bolts from the sky, and a storm cloud that drops a lightning strike.
   - Thiên Cơ: fluttering paper talismans, a folding-fan gust, an octagram array and
     a talisman vortex that binds, then bursts. */
(function(){
 const K=window.skillVfxKit;if(!K||!window.skillVfx)return;
 const {TAU,rnd,clamp,ease,glow,dot,ribbon,ellipse,burst,motes,ring,arc,beam,kick}=K;
 const bolts=[],trails=new WeakMap(),seen=new WeakSet();
 const aimAngle=s=>{const a=s.aim||{x:P.x+(P.dir===2?P.f:0)*100,y:P.y+(P.dir===1?-1:P.dir===2?0:1)*100};return Math.atan2(a.y-P.y,a.x-P.x);};
 // Khí kình: a crescent band of energy centred `dist` ahead of (x,y) on the iso ground,
 // thick in the middle and pointed at both horns, with a white core.
 function wave(ctx,x,y,angle,dist,span,thick,color,a,deep){if(a<=0)return;const n=24,outer=[],inner=[];deep=deep||DEEP[color]||'#123a6a';
  for(let i=0;i<=n;i++){const t=i/n,ang=angle-span/2+span*t,w=Math.sin(t*Math.PI)**.8*thick,c=Math.cos(ang),s=Math.sin(ang)*.58;
   outer.push([x+c*(dist+w*.55),y+s*(dist+w*.55)]);inner.push([x+c*(dist-w*.45),y+s*(dist-w*.45)]);}
  const body=new Path2D();outer.forEach(([px,py],i)=>i?body.lineTo(px,py):body.moveTo(px,py));for(let i=inner.length-1;i>=0;i--)body.lineTo(inner[i][0],inner[i][1]);body.closePath();
  const cx=x+Math.cos(angle)*dist,cy=y+Math.sin(angle)*dist*.58,gr=ctx.createRadialGradient(x,y,Math.max(1,dist-thick*.5),x,y,dist+thick*.6);gr.addColorStop(0,deep);gr.addColorStop(.45,color);gr.addColorStop(.8,'#ffffff');gr.addColorStop(1,color);
  dot(ctx,cx,cy,thick*2.2,color,a*.35);const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='source-over';
  ctx.save();ctx.translate(x,y);ctx.scale(1,1);ctx.restore();ctx.globalAlpha=a*.95;ctx.fillStyle=gr;ctx.fill(body);ctx.globalAlpha=a*.8;ctx.strokeStyle=deep;ctx.lineWidth=1.2;ctx.stroke(body);ctx.globalCompositeOperation=op;}
 const DEEP={'#7fe8ff':'#0f5f9a','#b48cff':'#3d1f8a','#6dffc4':'#0f6a4a','#ffd36b':'#8a5a10','#7fdcff':'#16508a'};
 function crackle(x,y,r,color){for(let k=0;k<2;k++){const a=rnd(0,TAU);bolt(x,y,x+Math.cos(a)*r,y+Math.sin(a)*r*.6,.12,color,1.2,0);}}
 function sweep(ctx,pts,w,color,a){line(ctx,pts,w,color,a*.35);line(ctx,pts,w*.45,color,a*.8);line(ctx,pts,w*.15,'#ffffff',a);}
 function line(ctx,pts,w,color,alpha){if(pts.length<2)return;ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=w;ctx.lineCap=ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i].x,pts[i].y);ctx.stroke();}

 // ---------------------------------------------------------------- lightning
 function jag(x1,y1,x2,y2,amp,seg){const n=seg||Math.max(4,Math.round(Math.hypot(x2-x1,y2-y1)/14)),nx=-(y2-y1),ny=x2-x1,l=Math.hypot(nx,ny)||1,pts=[{x:x1,y:y1}];
  for(let i=1;i<n;i++){const t=i/n,o=rnd(-amp,amp)*Math.sin(t*Math.PI);pts.push({x:x1+(x2-x1)*t+nx/l*o,y:y1+(y2-y1)*t+ny/l*o});}pts.push({x:x2,y:y2});return pts;}
 function bolt(x1,y1,x2,y2,life,color,width=3,branches=2){const pts=jag(x1,y1,x2,y2,Math.hypot(x2-x1,y2-y1)*.12),forks=[];
  for(let b=0;b<branches;b++){const s=pts[1+Math.floor(rnd(0,pts.length-2))],a=Math.atan2(y2-y1,x2-x1)+rnd(-.9,.9),l=rnd(18,46);forks.push(jag(s.x,s.y,s.x+Math.cos(a)*l,s.y+Math.sin(a)*l,7,4));}
  bolts.push({pts,forks,age:0,life,color,width});if(bolts.length>40)bolts.shift();}
 function drawBolt(ctx,pts,w,color,a){line(ctx,pts,w*3.2,color,a*.28);line(ctx,pts,w,color,a*.9);line(ctx,pts,w*.38,'#ffffff',a);}
 function drawBolts(ctx){for(const b of bolts){const p=b.age/b.life,a=(1-p)*(.65+.35*Math.random());drawBolt(ctx,b.pts,b.width,b.color,a);for(const f of b.forks)drawBolt(ctx,f,b.width*.45,b.color,a*.8);dot(ctx,b.pts.at(-1).x,b.pts.at(-1).y,b.width*7,b.color,a*.6);}}
 function stepBolts(dt){for(const b of bolts)b.age+=dt;for(let i=bolts.length-1;i>=0;i--)if(bolts[i].age>=bolts[i].life)bolts.splice(i,1);}

 // ---------------------------------------------------------------- shapes
 // Crescent with the hollow facing +x; r is the outer radius.
 function crescentPath(ctx,r){ctx.beginPath();ctx.arc(0,0,r,.927,TAU-.927);ctx.arc(.42*r,0,.82*r,-1.35,1.35,true);ctx.closePath();}
 function crescent(ctx,x,y,r,angle,alpha,hue,core='#ffffff'){if(alpha<=0)return;ctx.save();ctx.translate(x,y);
  const op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha*.28;ctx.drawImage(glow('#123f73'),-r*1.4,-r*1.4,r*2.8,r*2.8);ctx.globalCompositeOperation=op;
  ctx.globalAlpha=alpha*.42;ctx.drawImage(glow(hue),-r*1.7,-r*1.7,r*3.4,r*3.4);ctx.rotate(angle);
  const gr=ctx.createRadialGradient(-r*.5,0,0,-r*.3,0,r);gr.addColorStop(0,core);gr.addColorStop(.6,'#e9fbff');gr.addColorStop(1,hue);
  crescentPath(ctx,r);ctx.globalAlpha=alpha;ctx.fillStyle=gr;ctx.fill();ctx.strokeStyle=hue;ctx.lineWidth=1.4;ctx.stroke();ctx.restore();}
 function moon(ctx,x,y,r,alpha){if(alpha<=0)return;dot(ctx,x,y,r*4,'#4f8dff',alpha*.22);dot(ctx,x,y,r*1.9,'#bff6ff',alpha*.38);
  ctx.save();const gr=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);gr.addColorStop(0,'#ffffff');gr.addColorStop(.6,'#d6f1ff');gr.addColorStop(1,'#7fc4f0');
  ctx.globalAlpha=alpha;ctx.fillStyle=gr;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=alpha*.16;ctx.fillStyle='#6f9fc4';
  for(const [dx,dy,k] of [[-.38,.12,.24],[.22,.38,.13],[.34,-.22,.09],[-.08,-.48,.07],[.05,.05,.05]]){ctx.beginPath();ctx.arc(x+dx*r,y+dy*r,k*r,0,TAU);ctx.fill();}ctx.restore();}
 function talisman(ctx,x,y,angle,size,alpha,flutter=0){if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle+Math.PI/2);
  dot(ctx,0,0,size*1.1,'#6dffc4',alpha*.3);ctx.scale(.75+.25*Math.sin(flutter),1);
  const w=size*.52,h=size,op=ctx.globalCompositeOperation;ctx.globalCompositeOperation='source-over';
  ctx.globalAlpha=alpha;ctx.fillStyle='#fff0bf';ctx.fillRect(-w/2,-h/2,w,h);ctx.strokeStyle='#e0a630';ctx.lineWidth=1;ctx.strokeRect(-w/2+1,-h/2+1,w-2,h-2);
  ctx.strokeStyle='#c8382a';ctx.lineWidth=Math.max(.8,size*.06);ctx.beginPath();ctx.moveTo(0,-h*.36);ctx.lineTo(0,h*.36);
  for(const k of [-.22,-.05,.12]){ctx.moveTo(-w*.28,h*k);ctx.lineTo(w*.28,h*k+h*.03);}ctx.stroke();ctx.beginPath();ctx.arc(0,h*.28,w*.16,0,TAU);ctx.stroke();
  ctx.globalCompositeOperation=op;ctx.restore();}
 function marks(ctx,s,color,thunder){for(const [e,m] of s.marks){for(let n=0;n<m.count;n++){const x=e.x+(n-(m.count-1)/2)*9,y=e.y-46+Math.sin(tm*4+n)*1.2;
  dot(ctx,x,y,7,color,.7);ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);ctx.globalAlpha=.95;ctx.fillStyle='#ffffff';ctx.fillRect(-2,-2,4,4);ctx.strokeStyle=color;ctx.lineWidth=1;ctx.strokeRect(-3,-3,6,6);ctx.restore();}
  if(thunder&&m.count===3&&Math.random()<.4)drawBolt(ctx,jag(e.x-12,e.y-46,e.x+12,e.y-46,4,4),1,color,.8);}}

 // ---------------------------------------------------------------- iso seals
 function sealFrame(ctx,x,y,r,alpha,hue){ctx.save();ctx.translate(x,y);ctx.scale(1,.5);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha*.32;ctx.drawImage(glow(hue),-r*1.25,-r*1.25,r*2.5,r*2.5);}
 function circles(ctx,r,list,w,col,a){ctx.strokeStyle=col;ctx.lineWidth=w;ctx.globalAlpha=a;for(const k of list){ctx.beginPath();ctx.arc(0,0,r*k,0,TAU);ctx.stroke();}}
 function moonSeal(ctx,x,y,r,rot,alpha,pulse=0){if(alpha<=0)return;sealFrame(ctx,x,y,r,alpha,'#3a7bff');
  for(const [w,col,k] of [[4,'#7fdcff',.4+pulse*.4],[1.3,'#ffffff',.85]]){circles(ctx,r,[1,.93,.5],w,col,alpha*k);
   ctx.save();ctx.rotate(rot);for(let i=0;i<48;i++){const a=i/48*TAU,l=i%4?.03:.07;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.93,Math.sin(a)*r*.93);ctx.lineTo(Math.cos(a)*r*(.93-l),Math.sin(a)*r*(.93-l));ctx.stroke();}ctx.restore();}
  ctx.save();ctx.rotate(rot);for(let i=0;i<8;i++){const a=i/8*TAU;ctx.save();ctx.rotate(a);ctx.translate(r*.72,0);ctx.rotate(Math.PI);const k=.07+.04*Math.abs(Math.sin(i*Math.PI/8));
   ctx.globalAlpha=alpha*.85;ctx.fillStyle='#dff8ff';crescentPath(ctx,r*k);ctx.fill();ctx.restore();}ctx.restore();
  ctx.save();ctx.rotate(-rot*1.6);for(let i=0;i<3;i++){ctx.save();ctx.rotate(i*TAU/3);ctx.translate(r*.24,0);ctx.rotate(Math.PI/2);ctx.globalAlpha=alpha*(.7+pulse*.3);ctx.fillStyle='#bff6ff';crescentPath(ctx,r*.14);ctx.fill();ctx.restore();}ctx.restore();
  ctx.restore();}
 function thunderSeal(ctx,x,y,r,rot,alpha,pulse=0){if(alpha<=0)return;sealFrame(ctx,x,y,r,alpha,'#6a4cff');
  for(const [w,col,k] of [[4.5,'#b48cff',.4+pulse*.5],[1.3,'#ffffff',.85]]){circles(ctx,r,[1,.9,.36],w,col,alpha*k);
   ctx.save();ctx.rotate(rot);ctx.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU,c=Math.cos(a),s=Math.sin(a),px=-s,py=c;   // zigzag spokes
    const pts=[.38,.5,.6,.72,.86].map((t,j)=>({x:c*r*t+px*r*(j%2?.05:-.05),y:s*r*t+py*r*(j%2?.05:-.05)}));ctx.moveTo(pts[0].x,pts[0].y);for(const p of pts)ctx.lineTo(p.x,p.y);}ctx.stroke();
   for(let i=0;i<36;i++){const a=i/36*TAU;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.9,Math.sin(a)*r*.9);ctx.lineTo(Math.cos(a)*r*(i%3?.95:.98),Math.sin(a)*r*(i%3?.95:.98));ctx.stroke();}ctx.restore();
   ctx.save();ctx.rotate(-rot*2);for(let k=-1;k<=1;k++){const yy=k*r*.08,half=r*.16;ctx.beginPath();if(k===1){ctx.moveTo(-half,yy);ctx.lineTo(half,yy);}else{ctx.moveTo(-half,yy);ctx.lineTo(-half*.2,yy);ctx.moveTo(half*.2,yy);ctx.lineTo(half,yy);}ctx.stroke();}ctx.restore();}   // ☳ Chấn
  ctx.restore();}
 function octagram(ctx,x,y,r,rot,alpha,pulse=0){if(alpha<=0)return;sealFrame(ctx,x,y,r,alpha,'#2fbf8a');
  for(const [w,col,k] of [[4,'#6dffc4',.38+pulse*.45],[1.3,'#fff3c8',.9]]){circles(ctx,r,[1,.95,.4],w,col,alpha*k);
   ctx.save();ctx.rotate(rot);for(const off of [0,Math.PI/4]){ctx.beginPath();for(let i=0;i<4;i++){const a=off+i/4*TAU;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r*.86,Math.sin(a)*r*.86);}ctx.closePath();ctx.stroke();}
   ctx.beginPath();for(let i=0;i<8;i++){const a=i/8*TAU+Math.PI/8;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r*.62,Math.sin(a)*r*.62);}ctx.closePath();ctx.stroke();ctx.restore();}
  ctx.save();ctx.rotate(rot);ctx.globalAlpha=alpha*.9;ctx.fillStyle='#ffd36b';for(let i=0;i<8;i++){const a=i/8*TAU;ctx.save();ctx.translate(Math.cos(a)*r*.86,Math.sin(a)*r*.86);ctx.rotate(a);ctx.fillRect(-r*.035,-r*.06,r*.07,r*.12);ctx.restore();}ctx.restore();
  ctx.restore();}

 // ================================================================ Minh Nguyệt
 const MN={frost:'#7fdcff',silver:'#e8fbff',mint:'#9fffe0',deep:'#3a7bff'};
 const moonState=()=>window.moonCombat?.state;
 function orbit(slot,f,age=f.age){const a=age*1.8+slot*TAU/3,r=f.radius*.88;return{x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r*.58};}
 function storm(slot,u,age){const t=age-1.55,a=t*6+slot*TAU/3,r=20+65*(.5+.5*Math.sin(t*7+slot*2));return{x:u.x+Math.cos(a)*r,y:u.y+Math.sin(a)*r*.58};}
 const moonUlt=u=>({moon:{x:u.x,y:u.y-60-110*ease(u.age/1),r:10+26*ease(u.age/1)},fade:1-clamp((u.age-3.25)/.7,0,1)});
 const mn={state:moonState,flash:'#d9fbff',
  busy:s=>!!(s&&(s.flying.length||s.blink||s.field||s.ultimate||s.ghosts.length)),
  onCast(i){const s=moonState();if(!s)return;const a=aimAngle(s);
   if(i===0){ring(P.x,P.y-20,4,34,.35,MN.frost,2.4);arc(P.x,P.y-20,a,30,.3,MN.silver,2,6);burst(P.x,P.y-20,12,200,MN.frost,.35,0,1.2);kick(1.2);}
   if(i===1&&s.blink){const b=s.blink;burst(b.start.x,b.start.y-20,16,140,MN.silver,.45,20);ring(b.end.x,b.end.y,6,50,.45,MN.frost,3);motes(b.end.x,b.end.y-16,10,14,MN.mint);kick(1.6);}
   if(i===2&&s.field){const f=s.field;beam(f.x,f.y,170,26,.7,MN.frost);ring(f.x,f.y,10,f.radius*1.15,.6,MN.silver,3);kick(1.5);}
   if(i===3&&s.ultimate){const u=s.ultimate;beam(P.x,P.y,140,22,.6,MN.frost);motes(u.x,u.y-20,26,40,MN.silver);}},
  onHit(e){const x=e.x,y=e.y-14,a=rnd(0,Math.PI);K.arcs.push({x,y,angle:a,r:16,age:0,life:.24,color:MN.frost,span:2.4,width:4,core:MN.silver});
   burst(x,y,8,140,MN.silver,.35,10,1.2);ring(x,y+12,3,22,.3,MN.mint,1.6);},
  step(dt){const s=moonState();if(!s)return;stepBolts(dt);
   for(const g of s.ghosts)if(g.exploded&&!seen.has(g)){seen.add(g);ring(g.x,g.y,6,58,.5,MN.silver,3);ring(g.x,g.y,4,40,.4,MN.frost,2);burst(g.x,g.y-16,24,190,MN.frost,.5,30,1.5);beam(g.x,g.y,90,18,.4,MN.silver);kick(2.2);}
   const f=s.field;if(f){if(Math.random()<dt*16)K.parts.push({x:f.x+rnd(-f.radius,f.radius)*.8,y:f.y-rnd(40,80),vx:rnd(-8,8),vy:rnd(14,30),g:0,age:0,life:rnd(1,1.8),size:rnd(.9,1.8),color:MN.silver,kind:'mote'});
    if((f._vfx??0)!==f.pulses){f._vfx=f.pulses;if(f.pulses){ring(f.x,f.y,f.radius*.3,f.radius*1.05,.55,MN.silver,2.4);for(let k=0;k<3;k++){const p=orbit(k,f);burst(p.x,p.y-18,6,110,MN.frost,.35,10,1.1);}kick(1.2);}}}
   const u=s.ultimate;if(u){const {moon:m}=moonUlt(u);if(u.age<3.25&&Math.random()<dt*20)motes(m.x+rnd(-m.r,m.r),m.y+m.r,1,4,MN.silver);
    if((u._vfx??0)!==u.lightHits){u._vfx=u.lightHits;beam(u.x,u.y,u.y-m.y+20,46,.5,MN.frost);ring(u.x,u.y,10,u.radius,.55,MN.silver,3.5);burst(u.x,u.y-8,26,200,MN.frost,.5,30,1.4);kick(3,.18,'#bff6ff');}
    if(u.age>=3.25&&!u._vfxEnd){u._vfxEnd=true;ring(u.x,u.y,10,u.radius*1.4,.85,MN.silver,5);ring(u.x,u.y,6,u.radius,.65,MN.frost,3);ring(u.x,u.y,4,u.radius*.6,.5,MN.mint,2);
     burst(u.x,u.y-10,60,280,MN.silver,.9,60,2);burst(u.x,u.y-10,30,200,MN.frost,.8,40,1.6);burst(m.x,m.y,40,220,MN.silver,.9,-40,1.6);beam(u.x,u.y,u.y-m.y+40,70,.6,MN.silver);kick(9,.55,'#d9fbff');K.decal(u.x,u.y,u.radius,MN.frost);K.hitstop(.09);}}},
  ground(ctx,s){const f=s.field;
   if(f){const spawn=ease(f.age/.4),fade=clamp((f.duration-f.age)/.4,0,1),pulse=Math.max(0,1-(f.age%1)/.3);moonSeal(ctx,f.x,f.y,f.radius*(.55+.45*spawn),f.age*.5,fade,pulse);}
   const u=s.ultimate;if(u){const fade=clamp((u.duration-u.age)/.5,0,1),hot=u.age>=3.25?Math.max(0,1-(u.age-3.25)/.6):0;moonSeal(ctx,u.x,u.y,u.radius*(.5+.5*ease(u.age/.8))*(1+hot*.2),u.age*1.1,fade*(.75+hot*.25),hot);}},
  effects(ctx,s){ctx.save();ctx.globalCompositeOperation='lighter';
   const f=s.field;
   if(f)for(let slot=0;slot<3;slot++){if(s.flying.some(b=>b.slot===slot))continue;const p=orbit(slot,f),k=clamp(f.age/.35,0,1),x=f.source.x+(p.x-f.source.x)*k,y=f.source.y-20+(p.y-18-f.source.y+20)*k;
    if(k>=1){const pts=[];for(let j=8;j>=0;j--){const q=orbit(slot,f,f.age-j*.035);pts.push({x:q.x,y:q.y-18});}ribbon(ctx,pts,9,MN.frost,.8);}
    crescent(ctx,x,y,12,f.age*9+slot,clamp((f.duration-f.age)/.3,0,1),MN.frost);}
   for(const b of s.flying){ribbon(ctx,[...b.trail.map(t=>({x:t.x,y:t.y-20})),{x:b.x,y:b.y-20}],b.slot===2?14:10,MN.frost,.9);crescent(ctx,b.x,b.y-20,b.slot===2?16:12,b.angle,1,MN.frost);}
   if(s.blink){const b=s.blink,p=clamp(b.age/b.duration,0,1);ribbon(ctx,[{x:b.start.x,y:b.start.y-20},{x:b.start.x+(b.end.x-b.start.x)*.5,y:b.start.y-26+(b.end.y-b.start.y)*.5},{x:b.end.x,y:b.end.y-20}],16*(1-p)+3,MN.frost,1-p*.6);
    crescent(ctx,b.end.x,b.end.y-36,10+8*p,-Math.PI/2,1-p,MN.silver);}
   for(const g of s.ghosts){const a=g.exploded?clamp((1-g.age)/.5,0,1):.55+.15*Math.sin(g.age*30);ctx.save();ctx.translate(g.x,g.y-22);ctx.scale(.42,1);dot(ctx,0,0,30,MN.frost,a*.55);dot(ctx,0,0,16,MN.silver,a*.6);ctx.restore();
    if(!g.exploded){crescent(ctx,g.x,g.y-50,7,-Math.PI/2+g.age*6,a,MN.mint);ellipse(ctx,g.x,g.y,22*(1-g.age),1.5,MN.frost,a*.6);}}
   const u=s.ultimate;
   if(u){const {moon:m,fade}=moonUlt(u),a=fade*clamp(u.age/.25,0,1);
    for(let i=0;i<8;i++){const ang=-Math.PI/2+(i-3.5)*.22;ctx.save();ctx.translate(m.x,m.y);ctx.rotate(ang+Math.PI/2);ctx.globalAlpha=a*.12*(1+Math.sin(u.age*3+i));const gr=ctx.createLinearGradient(0,0,0,170);gr.addColorStop(0,MN.silver);gr.addColorStop(1,MN.silver+'00');ctx.fillStyle=gr;ctx.fillRect(-4,0,8,170);ctx.restore();}
    moon(ctx,m.x,m.y,m.r*(1+Math.max(0,1-Math.abs(u.age-3.25)/.15)*.3),a);
    if(u.age>=1.3&&u.age<3.4){const show=clamp((u.age-1.3)/.25,0,1)*clamp((3.4-u.age)/.15,0,1);
     for(let slot=0;slot<3;slot++){let p;if(u.age<1.55){const from={x:m.x,y:m.y},to=storm(slot,u,1.55),t=ease((u.age-1.3)/.25);p={x:from.x+(to.x-from.x)*t,y:from.y+(to.y+18-from.y)*t-18};}
      else if(u.age<3.05){p=storm(slot,u,u.age);const pts=[];for(let j=10;j>=0;j--){const q=storm(slot,u,Math.max(1.55,u.age-j*.03));pts.push({x:q.x,y:q.y-18});}ribbon(ctx,pts,13,MN.mint,show*.85);}
      else{const from=storm(slot,u,3.05),t=ease((u.age-3.05)/.2);p={x:from.x+(u.x-from.x)*t,y:from.y+(u.y-from.y)*t};}
      crescent(ctx,p.x,p.y-18,16,u.age*12+slot,show,MN.frost);}}}
   drawBolts(ctx);K.drawLayers(ctx);ctx.restore();}};
 skillVfx.register(1,mn);

 // ================================================================ Lôi Thương / Thiên Cơ (shared state)
 const LT={bolt:'#b48cff',hot:'#efe4ff',blue:'#8fb8ff',deep:'#6a4cff'};
 const TC={gold:'#ffd36b',jade:'#6dffc4',paper:'#fff0bf',hot:'#fff6d8'};
 const newState=()=>window.newClassCombat?.state;
 function spear(ctx,x,y,angle,len,alpha){ctx.save();ctx.translate(x,y);ctx.rotate(angle);dot(ctx,len*.3,0,len*.45,LT.bolt,alpha*.6);
  ctx.globalAlpha=alpha;ctx.strokeStyle='#d9c8ff';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-len/2,0);ctx.lineTo(len*.3,0);ctx.stroke();
  const gr=ctx.createLinearGradient(len*.25,0,len/2,0);gr.addColorStop(0,LT.bolt);gr.addColorStop(1,'#ffffff');ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(len/2,0);ctx.lineTo(len*.26,-len*.07);ctx.lineTo(len*.3,0);ctx.lineTo(len*.26,len*.07);ctx.closePath();ctx.fill();
  dot(ctx,len/2,0,8,'#ffffff',alpha);ctx.restore();}
 // Iso arc points (radius r around x,y) from angle a0 to a1.
 const arcPts=(x,y,r,a0,a1,n=18)=>Array.from({length:n+1},(_,i)=>{const a=a0+(a1-a0)*i/n;return{x:x+Math.cos(a)*r,y:y+Math.sin(a)*r*.55};});
 function fieldPulse(s,cb){const f=s.field;if(f&&(f._vfx??0)!==f.pulses){f._vfx=f.pulses;if(f.pulses)cb(f);}}
 function newEffects(s,cb){for(const e of s.effects)if(!seen.has(e)){seen.add(e);cb(e);}}
 const busyNew=s=>!!(s&&(s.projectiles.length||s.dash||s.field||s.ultimate||s.casts.length));

 // ---------------------------------------------------------------- Lôi Thương
 const lt={state:newState,flash:LT.hot,busy:busyNew,
  onCast(i){const s=newState();if(!s)return;const a=aimAngle(s);
   if(i===0){ring(P.x,P.y,6,44,.4,LT.bolt,3);burst(P.x,P.y-16,16,180,LT.hot,.4,10);kick(2);}
   if(i===1){ring(P.x,P.y,10,150,.5,LT.bolt,3);for(let k=0;k<4;k++){const b=a+rnd(-1.8,1.8);bolt(P.x,P.y-20,P.x+Math.cos(b)*rnd(90,140),P.y-10+Math.sin(b)*rnd(50,80),.3,LT.bolt,2,1);}kick(3,.12,LT.hot);}
   if(i===2&&s.field){const f=s.field;bolt(f.x+rnd(-20,20),f.y-240,f.x,f.y,.45,LT.bolt,4.5,3);ring(f.x,f.y,10,f.radius*1.15,.6,LT.hot,3);burst(f.x,f.y,24,200,LT.hot,.5,30);kick(3,.2,LT.hot);}
   if(i===3){beam(P.x,P.y,150,22,.6,LT.bolt);motes(P.x,P.y-20,18,30,LT.hot);}},
  onHit(e){const x=e.x,y=e.y-14;for(let k=0;k<3;k++){const a=rnd(0,TAU);bolt(x,y,x+Math.cos(a)*rnd(18,32),y+Math.sin(a)*rnd(10,20),.2,LT.bolt,1.4,0);}
   burst(x,y,8,160,LT.hot,.3,10,1.2);ring(x,y+12,3,20,.28,LT.bolt,1.6);},
  step(dt){const s=newState();if(!s)return;stepBolts(dt);
   newEffects(s,e=>{if(e.index===2)bolt(e.x+rnd(-30,30),e.y-200,e.x,e.y-10,.35,LT.bolt,3,2);});
   fieldPulse(s,f=>{ring(f.x,f.y,f.radius*.3,f.radius*1.05,.5,LT.hot,2.6);bolt(f.x+rnd(-40,40),f.y-220,f.x+rnd(-30,30),f.y+rnd(-15,15),.35,LT.bolt,4,3);kick(1.6,.1,LT.hot);});
   const f=s.field;if(f&&Math.random()<dt*7){const a=rnd(0,TAU),b=a+rnd(.5,1.4),r=f.radius*rnd(.4,.95);bolt(f.x+Math.cos(a)*r,f.y+Math.sin(a)*r*.5,f.x+Math.cos(b)*r,f.y+Math.sin(b)*r*.5,.18,LT.blue,1.4,0);}
   const u=s.ultimate;if(u){if(u.age<1.3&&Math.random()<dt*10){const x=u.x+rnd(-90,90);bolt(x,u.y-190+rnd(-10,10),x+rnd(-50,50),u.y-170+rnd(-15,15),.15,LT.hot,1.5,1);}
    if(u.age>=1.3&&!u._vfxEnd){u._vfxEnd=true;bolt(u.x+rnd(-15,15),u.y-260,u.x,u.y,.6,LT.bolt,9,5);bolt(u.x-30,u.y-230,u.x-10,u.y,.45,LT.blue,4,2);bolt(u.x+30,u.y-230,u.x+10,u.y,.45,LT.blue,4,2);
     for(let k=0;k<8;k++){const a=k/8*TAU+rnd(-.2,.2),r=u.radius*rnd(.7,1.05);bolt(u.x,u.y,u.x+Math.cos(a)*r,u.y+Math.sin(a)*r*.5,.5,LT.bolt,2.4,1);}
     ring(u.x,u.y,10,u.radius*1.4,.8,LT.hot,5);ring(u.x,u.y,6,u.radius,.6,LT.bolt,3);burst(u.x,u.y-10,60,300,LT.hot,.9,60,2);burst(u.x,u.y-10,30,200,LT.bolt,.8,40,1.6);beam(u.x,u.y,260,60,.5,LT.hot);kick(10,.6,'#e9dcff');K.decal(u.x,u.y,u.radius,LT.bolt);K.hitstop(.1);}}},
  ground(ctx,s){const f=s.field;
   if(f){const fade=Math.min(1,f.age/.3,(5.5-f.age)/.55),pulse=Math.max(0,1-(f.age%1)/.3);thunderSeal(ctx,f.x,f.y,f.radius*(.55+.45*ease(f.age/.4)),f.age*.7,fade,pulse);}
   const u=s.ultimate;if(u){const grow=ease(u.age/1.2),hot=u.age>=1.3?Math.max(0,1-(u.age-1.3)/.6):0,fade=clamp((2.2-u.age)/.4,0,1);thunderSeal(ctx,u.x,u.y,u.radius*(.4+.6*grow)*(1+hot*.15),u.age*(1.5+hot*4),fade*(.6+hot*.4),hot+(u.age<1.3?.3*Math.random():0));}},
  effects(ctx,s){ctx.save();
   const u=s.ultimate;
   if(u){const grow=ease(u.age/1),fade=clamp((2.2-u.age)/.5,0,1),cy=u.y-185,flick=u.age<1.3?Math.random()*.35:0;   // storm cloud
    ctx.globalCompositeOperation='source-over';for(let k=0;k<9;k++){const x=u.x+(k-4)*26*grow,y=cy+Math.sin(k*1.7)*10;dot(ctx,x,y,(34+((k*13)%18))*grow,'#241a3e',fade*.55);}
    ctx.globalCompositeOperation='lighter';for(let k=0;k<5;k++)dot(ctx,u.x+(k-2)*40*grow,cy+Math.sin(k*2.3)*8,30*grow,LT.deep,fade*(.25+flick));
    if(u.age<1.3){const t=u.age/1.3;dot(ctx,u.x,u.y-20,10+30*t,LT.bolt,.3+.4*t);}}
   ctx.globalCompositeOperation='lighter';
   if(s.dash){const d=s.dash,p=clamp(d.age/.18,0,1),ang=Math.atan2(d.end.y-d.start.y,d.end.x-d.start.x);
    dot(ctx,P.x,P.y-16,30,LT.bolt,.7);if(Math.random()<.6)drawBolt(ctx,jag(P.x-Math.cos(ang)*14,P.y-16,P.x+Math.cos(ang)*30,P.y-16+Math.sin(ang)*18,7,5),1.6,LT.hot,1);spear(ctx,P.x+Math.cos(ang)*10,P.y-16+Math.sin(ang)*6,ang,62,1);if(p<.3)dot(ctx,d.start.x,d.start.y-16,28,LT.hot,1-p/.3);}
   for(const c of s.casts){const p=c.age/c.duration;
    if(c.index===1){const w=Math.PI*1.35,head=c.angle-w/2+w*ease(p/.55),r=118,cx=c.x,cy=c.y+18,pts=arcPts(cx,cy,r,c.angle-w/2,head),a=1-clamp((p-.55)/.45,0,1);
     wave(ctx,cx,cy,c.angle,40+r*ease(p/.6),w*.85,26,LT.bolt,a);if(Math.random()<.5){const q=pts[Math.floor(rnd(0,pts.length))];crackle(q.x,q.y,22,LT.hot);}
     const hx=cx+Math.cos(head)*r,hy=cy+Math.sin(head)*r*.55;spear(ctx,(cx+hx)/2,(cy-8+hy)/2,Math.atan2(hy-cy+8,hx-cx),r*1.05,a);dot(ctx,hx,hy,22,LT.hot,a*.8);}
    if(c.index===3){dot(ctx,c.x,c.y,20+40*p,LT.bolt,(1-p)*.8);if(Math.random()<.5)drawBolt(ctx,jag(c.x,c.y,c.x+rnd(-40,40),c.y-rnd(20,60),6),1.2,LT.hot,1-p);}}
   const f=s.field;if(f)for(let k=0;k<3;k++){const a=f.age*1.2+k*TAU/3;dot(ctx,f.x+Math.cos(a)*f.radius*.75,f.y+Math.sin(a)*f.radius*.4-30,9,LT.bolt,.55+.3*Math.random());}
   marks(ctx,s,LT.bolt,true);drawBolts(ctx);K.drawLayers(ctx);ctx.restore();}};
 skillVfx.register(2,lt);

 // ---------------------------------------------------------------- Thiên Cơ
 const vortex=(u,k,age)=>{const t=clamp(age/3.2,0,1),a=age*(2+t*5)+k*TAU/12,r=150-110*ease(t)+(k%2)*14;return{x:u.x+Math.cos(a)*r,y:u.y+Math.sin(a)*r*.55-24-40*t-(k%3)*8,a};};
 const tc={state:newState,flash:TC.hot,busy:busyNew,
  onCast(i){const s=newState();if(!s)return;const a=aimAngle(s);
   if(i===0){arc(P.x,P.y-26,a,28,.3,TC.gold,1.8,5);for(let k=0;k<10;k++)K.parts.push({x:P.x,y:P.y-26,vx:Math.cos(a+rnd(-.5,.5))*rnd(80,200),vy:Math.sin(a+rnd(-.5,.5))*rnd(50,120),g:40,age:0,life:rnd(.3,.6),size:rnd(1,1.8),color:TC.gold,kind:'spark'});kick(1);}
   if(i===1){ring(P.x,P.y,10,170,.5,TC.jade,3);kick(2.4);}
   if(i===2&&s.field){const f=s.field;beam(f.x,f.y,170,26,.7,TC.gold);ring(f.x,f.y,10,f.radius*1.15,.6,TC.jade,3);motes(f.x,f.y-10,20,f.radius*.7,TC.gold);kick(1.5);}
   if(i===3&&s.ultimate){const u=s.ultimate;beam(P.x,P.y,140,22,.6,TC.gold);ring(u.x,u.y,10,150,.6,TC.jade,3);}},
  onHit(e){const x=e.x,y=e.y-14;burst(x,y,9,150,TC.gold,.4,20,1.3);ring(x,y+12,3,22,.3,TC.jade,1.8);
   for(let k=0;k<4;k++)K.parts.push({x,y,vx:rnd(-60,60),vy:rnd(-70,-20),g:90,age:0,life:rnd(.5,.8),size:rnd(1.4,2.2),color:TC.paper,kind:'mote'});},
  step(dt){const s=newState();if(!s)return;stepBolts(dt);
   for(const p of s.projectiles){let t=trails.get(p);if(!t)trails.set(p,t=[]);t.push({x:p.x,y:p.y-15});if(t.length>9)t.shift();}
   fieldPulse(s,f=>{ring(f.x,f.y,f.radius*.3,f.radius*1.05,.5,TC.jade,2.4);motes(f.x,f.y,10,f.radius*.6,TC.gold);beam(f.x,f.y,110,14,.4,TC.jade);kick(1);});
   const f=s.field;if(f&&Math.random()<dt*10)motes(f.x+rnd(-f.radius,f.radius)*.7,f.y+rnd(-f.radius,f.radius)*.3,1,0,Math.random()<.5?TC.jade:TC.gold);
   const u=s.ultimate;if(u){if(u.age>=1.8&&!u._vfxBind){u._vfxBind=true;ring(u.x,u.y,u.radius,20,.7,TC.gold,3);kick(2);}
    if(u.age>=3.2&&!u._vfxEnd){u._vfxEnd=true;for(let k=0;k<12;k++){const p=vortex(u,k,3.2),a=Math.atan2(p.y-u.y,p.x-u.x);for(let j=0;j<3;j++)K.parts.push({x:p.x,y:p.y,vx:Math.cos(a)*rnd(120,260),vy:Math.sin(a)*rnd(60,140)-40,g:120,age:0,life:rnd(.6,1),size:rnd(1.6,2.4),color:TC.paper,kind:'mote'});}
     ring(u.x,u.y,10,u.radius*1.4,.85,TC.hot,5);ring(u.x,u.y,6,u.radius,.6,TC.jade,3);burst(u.x,u.y-10,60,280,TC.gold,.9,60,2);burst(u.x,u.y-10,30,200,TC.jade,.8,40,1.6);beam(u.x,u.y,240,64,.6,TC.gold);kick(9,.55,'#fff1c8');K.decal(u.x,u.y,u.radius,TC.gold);K.hitstop(.09);}}},
  ground(ctx,s){const f=s.field;
   if(f){const fade=Math.min(1,f.age/.3,(5.5-f.age)/.55),pulse=Math.max(0,1-(f.age%1)/.3);octagram(ctx,f.x,f.y,f.radius*(.55+.45*ease(f.age/.4)),f.age*.4,fade,pulse);}
   const u=s.ultimate;if(u){const hot=u.age>=3.2?Math.max(0,1-(u.age-3.2)/.6):0,bind=u.age>=1.8&&u.age<2.6?1:0,fade=clamp((4-u.age)/.5,0,1);octagram(ctx,u.x,u.y,u.radius*(.5+.5*ease(u.age/.8))*(1+hot*.2),u.age*(.8+bind*1.5),fade*(.7+hot*.3),Math.max(hot,bind*.6));}},
  effects(ctx,s){ctx.save();ctx.globalCompositeOperation='lighter';
   for(const p of s.projectiles){const t=trails.get(p)||[];ribbon(ctx,[...t,{x:p.x,y:p.y-15}],8,TC.jade,.8);talisman(ctx,p.x,p.y-15,p.angle,16,clamp((1.3-p.age)/.2,0,1),p.age*22);}
   for(const c of s.casts){const p=c.age/c.duration,fade=1-clamp((p-.6)/.4,0,1);
    if(c.index===1){const w=Math.PI*.6,open=ease(p/.3),x=c.x,y=c.y;   // folding fan opens toward the aim, then a gust sweeps out
     for(let k=0;k<9;k++){const a=c.angle-w*open/2+w*open*k/8;line(ctx,[{x,y},{x:x+Math.cos(a)*34,y:y+Math.sin(a)*34*.7}],1.4,TC.gold,fade);}
     ctx.globalAlpha=fade*.35;ctx.fillStyle=TC.gold;ctx.beginPath();ctx.ellipse(x,y,34,34*.7,0,c.angle-w*open/2,c.angle+w*open/2);ctx.ellipse(x,y,14,14*.7,0,c.angle+w*open/2,c.angle-w*open/2,true);ctx.closePath();ctx.fill();
     wave(ctx,c.x,c.y+26,c.angle,30+140*ease(p),w*1.1,22,TC.jade,fade*.9);wave(ctx,c.x,c.y+26,c.angle,10+110*ease(p),w*.8,12,TC.gold,fade*.7);
     for(let k=0;k<7;k++){const a=c.angle-w/2+w*((k*.37)%1),r0=165*ease(clamp(p*1.2-(k%3)*.1,0,1));talisman(ctx,c.x+Math.cos(a)*r0,c.y+26+Math.sin(a)*r0*.55-10,a+p*6,8,fade*.9,p*30+k);}}
    if(c.index===3)dot(ctx,c.x,c.y,18+30*p,TC.gold,(1-p)*.7);}
   const f=s.field;if(f)for(let k=0;k<4;k++){const a=f.age*.6+k*TAU/4,x=f.x+Math.cos(a)*f.radius*.86,y=f.y+Math.sin(a)*f.radius*.86*.5-30+Math.sin(f.age*3+k)*4;talisman(ctx,x,y,-Math.PI/2,14,Math.min(1,f.age/.3,(5.5-f.age)/.5),f.age*4+k);}
   const u=s.ultimate;if(u&&u.age<3.35){const show=clamp(u.age/.3,0,1)*clamp((3.35-u.age)/.15,0,1),bind=u.age>=1.8&&u.age<2.6;
    for(let k=0;k<12;k++){const p=vortex(u,k,Math.min(u.age,3.2));
     if(bind)line(ctx,[{x:p.x,y:p.y},{x:u.x+(p.x-u.x)*.3,y:u.y-20+(p.y-u.y+20)*.3}],1.6,TC.gold,.7*show);
     talisman(ctx,p.x,p.y,p.a+Math.PI/2,15,show,u.age*12+k);}
    dot(ctx,u.x,u.y-40,18+30*clamp(u.age/3.2,0,1),TC.gold,show*(.4+(bind?.3:0)));}
   marks(ctx,s,TC.gold,false);drawBolts(ctx);K.drawLayers(ctx);ctx.restore();}};
 skillVfx.register(3,tc);
 window.skillVfxShapes={crescent,talisman,spear,jag,drawBolt,sweep,line,arcPts,bolt,wave,crackle};
})();
