/* Map identity: every hunting zone, rift and the duel arena looks distinct.
   Presentation only - collision, mob spawns, portals and network coordinates
   are untouched. Static detail is baked once per map into a half-resolution
   layer; only a small glow layer pulses per frame. */
(function(){
 const world=worldMap,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const layers=new Map();
 const seeded=seed=>()=>((seed=seed*16807%2147483647)/2147483647);
 const hash=s=>[...s].reduce((h,c)=>(h*31+c.charCodeAt(0))%2147483647,7)||1;
 function layer(key,w,h,paint){
  if(layers.has(key))return layers.get(key);
  // Only the current map's layers stay resident (a field layer is ~8 MB).
  for(const old of [...layers.keys()])layers.delete(old);
  // Painted in layer units, stored at 2x so the deck stays crisp when zoomed.
  const make=()=>{const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const x=c.getContext('2d');x.scale(2,2);return c;};
  const base=make(),glow=make();paint(base.getContext('2d'),glow.getContext('2d'),seeded(hash(key)));
  const entry={base,glow};layers.set(key,entry);return entry;
 }
 // Draw only the visible part of a layer that covers world rect (x0,y0,ww,wh).
 function blit(ctx,canvas,x0,y0,ww,wh,cx,cy,vw,vh){
  const sx=canvas.width/ww,sy=canvas.height/wh;
  const left=Math.max(x0,cx),top=Math.max(y0,cy),right=Math.min(x0+ww,cx+vw),bottom=Math.min(y0+wh,cy+vh);
  if(right<=left||bottom<=top)return;
  ctx.drawImage(canvas,(left-x0)*sx,(top-y0)*sy,(right-left)*sx,(bottom-top)*sy,left,top,right-left,bottom-top);
 }
 const pulse=(speed=1.4,phase=0)=>reduced.matches?.8:.62+.38*Math.sin(tm*speed+phase);

 /* ---------- hunting zones ---------- */
 const PATHS=()=>window.overworldRoads||[];
 function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p.x-a[0])*dx+(p.y-a[1])*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t);}
 const roadDist=p=>{let best=1e9;for(const r of PATHS())for(let i=1;i<r.length;i++){const d=segDist(p,r[i-1],r[i]);if(d<best)best=d;}return best;};
 const camps=()=>window.overworldRules?.camps||[];
 function clearSpot(p,road=80,camp=210){return roadDist(p)>road&&!camps().some(c=>((p.x-c.x)/(camp*1.35))**2+((p.y-c.y)/camp)**2<1)&&Math.hypot(p.x-1000,p.y-1770)>260&&p.x>140&&p.x<1860&&p.y>140&&p.y<1860;}
 function spots(random,count,road,camp){const out=[];for(let n=0;n<count*12&&out.length<count;n++){const p={x:random()*2000,y:random()*2000};if(clearSpot(p,road,camp)&&!out.some(o=>Math.hypot(o.x-p.x,o.y-p.y)<150))out.push(p);}return out;}
 const S=.5; // layer pixels per world unit

 function crack(ctx,random,x,y,length,depth,width){
  let a=random()*Math.PI*2;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);
  for(let i=0;i<length;i++){a+=(random()-.5)*.9;x+=Math.cos(a)*9;y+=Math.sin(a)*5;ctx.lineTo(x,y);
   if(depth>0&&random()<.12){ctx.stroke();crack(ctx,random,x,y,length*.5|0,depth-1,width*.6);ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x,y);}}
  ctx.stroke();
 }
 const FIELD={
  'field-bamboo'(b,gl,random){ // shaded moss patches and fallen bamboo leaves
   for(const p of spots(random,40,70,190)){const r=60+random()*90,gr=b.createRadialGradient(p.x*S,p.y*S,0,p.x*S,p.y*S,r*S);gr.addColorStop(0,'rgba(18,48,26,.42)');gr.addColorStop(1,'rgba(18,48,26,0)');b.fillStyle=gr;b.fillRect((p.x-r)*S,(p.y-r)*S,r*2*S,r*2*S);}
   for(let n=0;n<1400;n++){const p={x:random()*2000,y:random()*2000};if(roadDist(p)<50)continue;b.save();b.translate(p.x*S,p.y*S);b.rotate(random()*Math.PI);b.fillStyle=random()<.5?'rgba(176,170,96,.55)':'rgba(96,140,72,.55)';b.beginPath();b.ellipse(0,0,3.2,.9,0,0,Math.PI*2);b.fill();b.restore();}
  },
  'field-marsh'(b,gl,random){ // shallow pools with reed rims; glow = water sheen
   for(const p of spots(random,26,90,200)){
    const rx=55+random()*85,ry=rx*(.42+random()*.12);
    b.fillStyle='rgba(30,54,52,.55)';b.beginPath();b.ellipse(p.x*S,(p.y+4)*S,(rx+8)*S,(ry+6)*S,0,0,Math.PI*2);b.fill();
    const w=b.createLinearGradient(0,(p.y-ry)*S,0,(p.y+ry)*S);w.addColorStop(0,'#2d6f76');w.addColorStop(1,'#163d48');b.fillStyle=w;b.beginPath();b.ellipse(p.x*S,p.y*S,rx*S,ry*S,0,0,Math.PI*2);b.fill();
    b.strokeStyle='rgba(150,190,140,.55)';b.lineWidth=1.2;b.stroke();
    for(let r=0;r<10;r++){const a=random()*Math.PI*2,x=p.x+Math.cos(a)*rx*.98,y=p.y+Math.sin(a)*ry*.98;b.strokeStyle='rgba(90,120,60,.9)';b.lineWidth=.8;b.beginPath();b.moveTo(x*S,y*S);b.lineTo((x+(random()-.5)*4)*S,(y-10-random()*8)*S);b.stroke();}
    gl.fillStyle='rgba(170,230,235,.28)';gl.beginPath();gl.ellipse((p.x-rx*.25)*S,(p.y-ry*.3)*S,rx*.45*S,ry*.18*S,-.1,0,Math.PI*2);gl.fill();
   }
  },
  'field-frost'(b,gl,random){ // glossy ice sheets
   for(const p of spots(random,22,80,200)){const rx=60+random()*80,ry=rx*.45;b.fillStyle='rgba(170,210,232,.55)';b.beginPath();b.ellipse(p.x*S,p.y*S,rx*S,ry*S,(random()-.5)*.3,0,Math.PI*2);b.fill();b.strokeStyle='rgba(235,250,255,.7)';b.lineWidth=1;b.stroke();
    b.strokeStyle='rgba(120,160,190,.5)';b.lineWidth=.6;crack(b,random,p.x*S,p.y*S,6,1,.6);
    gl.fillStyle='rgba(255,255,255,.35)';gl.beginPath();gl.ellipse((p.x-rx*.3)*S,(p.y-ry*.35)*S,rx*.3*S,ry*.12*S,0,0,Math.PI*2);gl.fill();}
  },
  'field-ember'(b,gl,random){ // scorched patches and glowing lava fissures
   for(const p of spots(random,30,60,180)){const r=70+random()*90,gr=b.createRadialGradient(p.x*S,p.y*S,0,p.x*S,p.y*S,r*S);gr.addColorStop(0,'rgba(12,6,4,.55)');gr.addColorStop(1,'rgba(12,6,4,0)');b.fillStyle=gr;b.fillRect((p.x-r)*S,(p.y-r)*S,r*2*S,r*2*S);}
   b.lineCap=gl.lineCap='round';
   for(const p of spots(random,34,70,190)){
    const seed=random()*1e9|0,len=10+random()*14|0;
    b.strokeStyle='rgba(20,8,4,.9)';crack(b,seeded(seed||1),p.x*S,p.y*S,len,2,3.2);
    gl.strokeStyle='#ff7a1e';gl.shadowColor='#ff5a00';gl.shadowBlur=5;crack(gl,seeded(seed||1),p.x*S,p.y*S,len,2,1.1);
    gl.shadowBlur=0;
   }
  },
  'field-abyss'(b,gl,random){ // violet fog, bone-dust, ghost runes
   for(const p of spots(random,34,40,150)){const r=90+random()*120,gr=b.createRadialGradient(p.x*S,p.y*S,0,p.x*S,p.y*S,r*S);gr.addColorStop(0,'rgba(90,60,130,.32)');gr.addColorStop(1,'rgba(90,60,130,0)');b.fillStyle=gr;b.fillRect((p.x-r)*S,(p.y-r)*S,r*2*S,r*2*S);}
   for(let n=0;n<900;n++){const p={x:random()*2000,y:random()*2000};b.fillStyle='rgba(205,200,220,'+(.15+random()*.25)+')';b.fillRect(p.x*S,p.y*S,1,1);}
   b.lineCap=gl.lineCap='round';
   for(const p of spots(random,16,90,220)){const r=26+random()*20;
    b.strokeStyle='rgba(18,10,30,.8)';b.lineWidth=3;b.beginPath();b.ellipse(p.x*S,p.y*S,r*S,r*.5*S,0,0,Math.PI*2);b.stroke();
    gl.strokeStyle='#b78cff';gl.shadowColor='#9a6bff';gl.shadowBlur=8;gl.lineWidth=1.2;gl.beginPath();gl.ellipse(p.x*S,p.y*S,r*S,r*.5*S,0,0,Math.PI*2);gl.stroke();
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2,x=p.x+Math.cos(a)*r*.7,y=p.y+Math.sin(a)*r*.35;gl.beginPath();gl.moveTo((x-3)*S,y*S);gl.lineTo(x*S,(y-4)*S);gl.lineTo((x+3)*S,y*S);gl.stroke();}
    gl.shadowBlur=0;}
  }
 };
 const FIELD_GLOW={'field-marsh':[.9,0,'source-over'],'field-frost':[.6,1,'lighter'],'field-ember':[2.2,0,'lighter'],'field-abyss':[1.1,2,'lighter']};
 // Fields are painted in 400-unit tiles at 1 px per world unit, on demand.
 const TILE=400,tiles=new Map(),TILE_KEEP=12;
 function fieldTile(id,tx,ty){
  const key=id+':'+tx+':'+ty;let t=tiles.get(key);
  if(t){tiles.delete(key);tiles.set(key,t);return t;}
  const make=()=>{const c=document.createElement('canvas');c.width=c.height=TILE;const x=c.getContext('2d');x.translate(-tx*TILE,-ty*TILE);x.scale(1/S,1/S);return c;};
  const base=make(),glow=make();FIELD[id](base.getContext('2d'),glow.getContext('2d'),seeded(hash('field:'+id)));
  t={base,glow};tiles.set(key,t);
  for(const old of tiles.keys()){if(tiles.size<=TILE_KEEP)break;if(!old.startsWith(id+':')||old!==key)tiles.delete(old);}
  return t;
 }
 function drawField(ctx,m,cx,cy,vw,vh){
  if(!FIELD[m.id])return;
  const glow=FIELD_GLOW[m.id],x0=Math.max(0,Math.floor(cx/TILE)),y0=Math.max(0,Math.floor(cy/TILE)),x1=Math.min(4,Math.floor((cx+vw)/TILE)),y1=Math.min(4,Math.floor((cy+vh)/TILE));
  const visible=[];for(let ty=y0;ty<=y1;ty++)for(let tx=x0;tx<=x1;tx++)visible.push([tx,ty,fieldTile(m.id,tx,ty)]);
  for(const [tx,ty,t] of visible)ctx.drawImage(t.base,tx*TILE,ty*TILE);
  if(glow){ctx.save();ctx.globalCompositeOperation=glow[2];ctx.globalAlpha=glow[2]==='lighter'?pulse(glow[0],glow[1]):.8+.2*Math.sin(tm*glow[0]);for(const [tx,ty,t] of visible)ctx.drawImage(t.glow,tx*TILE,ty*TILE);ctx.restore();}
 }

 /* ---------- rifts and duel arena (one ellipse platform each) ---------- */
 const DECK={cx:1000,cy:1100};
 const RIFT={
  'rift-wood':{tint:'#3f6f45',alpha:.5,rim:'#8de0a0',glow:[1.2,'lighter'],paint(b,gl,r,W,H){
    for(let n=0;n<26;n++){const x=r()*W,y=r()*H,rad=30+r()*70,gr=b.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(54,104,48,.6)');gr.addColorStop(1,'rgba(54,104,48,0)');b.fillStyle=gr;b.fillRect(x-rad,y-rad,rad*2,rad*2);}
    b.lineCap='round';for(let n=0;n<14;n++){b.strokeStyle='rgba(70,48,28,.55)';crack(b,r,r()*W,r()*H,8+r()*10|0,1,2.4);}
    for(let n=0;n<70;n++){const x=r()*W,y=r()*H;gl.fillStyle='rgba(170,255,170,.55)';gl.beginPath();gl.arc(x,y,1+r()*1.5,0,Math.PI*2);gl.fill();}
   }},
  'rift-tide':{tint:'#2f5f8c',alpha:.55,rim:'#7fd6ff',glow:[1.6,'lighter'],paint(b,gl,r,W,H){
    for(let k=0;k<4;k++){ // meandering water channels between the tiles
     let x=r()*W*.2,y=H*(.15+k*.22+r()*.06);const pts=[];for(let i=0;i<14;i++){pts.push([x,y]);x+=W/12;y+=(r()-.5)*40;}
     for(const [width,color]of [[22,'rgba(14,40,64,.75)'],[15,'rgba(36,104,150,.85)']]){b.strokeStyle=color;b.lineWidth=width;b.lineJoin=b.lineCap='round';b.beginPath();pts.forEach(([px,py],i)=>i?b.lineTo(px,py):b.moveTo(px,py));b.stroke();}
     gl.strokeStyle='rgba(170,235,255,.6)';gl.lineWidth=2;gl.setLineDash([12,18]);gl.beginPath();pts.forEach(([px,py],i)=>i?gl.lineTo(px,py-3):gl.moveTo(px,py-3));gl.stroke();gl.setLineDash([]);
    }
   }},
  'rift-fire':{tint:'#4a1f14',alpha:.65,rim:'#ff9a4a',glow:[2.4,'lighter'],glowAlpha:.75,paint(b,gl,r,W,H){
    b.lineCap=gl.lineCap='round';
    for(let n=0;n<22;n++){const seed=(r()*1e9|0)||1,x=r()*W,y=r()*H,len=8+r()*12|0;b.strokeStyle='rgba(16,6,3,.95)';crack(b,seeded(seed),x,y,len,2,4);gl.strokeStyle='#ff8a2a';gl.shadowColor='#ff4d00';gl.shadowBlur=5;crack(gl,seeded(seed),x,y,len,2,1.1);gl.shadowBlur=0;}
   }},
  'rift-void':{tint:'#2c2142',alpha:.68,rim:'#c49bff',glow:[1.1,'lighter'],glowAlpha:.55,paint(b,gl,r,W,H){
    for(let n=0;n<16;n++){const x=r()*W,y=r()*H,rad=60+r()*90,gr=b.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,'rgba(10,6,20,.6)');gr.addColorStop(1,'rgba(10,6,20,0)');b.fillStyle=gr;b.fillRect(x-rad,y-rad,rad*2,rad*2);}
    gl.lineCap='round';
    for(const [x,y,rad]of [[W*.5,H*.5,W*.3],[W*.22,H*.55,W*.08],[W*.78,H*.55,W*.08]]){gl.strokeStyle='#b88cff';gl.shadowColor='#8f5dff';gl.shadowBlur=10;for(const k of [1,.82]){gl.lineWidth=k===1?2:1;gl.beginPath();gl.ellipse(x,y,rad*k,rad*k*.55,0,0,Math.PI*2);gl.stroke();}
     for(let i=0;i<12;i++){const a=i/12*Math.PI*2;gl.save();gl.translate(x+Math.cos(a)*rad*.91,y+Math.sin(a)*rad*.5);gl.rotate(a);gl.strokeRect(-3,-3,6,6);gl.restore();}gl.shadowBlur=0;}
   }}
 };
 const DECOR={
  'rift-wood':['theme-14-035','theme-14-016','theme-14-045','theme-14-012'],
  'rift-tide':['theme-10-058','theme-10-009','theme-12-021','theme-10-022'],
  'rift-fire':['theme-15-034','theme-15-012','theme-13-007','theme-15-046'],
  'rift-void':['theme-11-069','theme-11-026','theme-11-057','theme-11-070'],
  'duel':['theme-13-007','theme-15-013','theme-13-017','theme-15-013']
 };
 function deckRadii(){const duel=world.state.scene==='duel';return duel?[700,430]:[620,340];}
 function drawRift(ctx,id,cx,cy,vw,vh){
  const def=RIFT[id];const [rx,ry]=deckRadii();
  const W=Math.round(rx*2*S),H=Math.round(ry*2*S);
  const l=layer('rift:'+id,W,H,(b,gl,r)=>def.paint(b,gl,r,W,H));
  ctx.save();ctx.beginPath();ctx.ellipse(DECK.cx,DECK.cy,rx,ry,0,0,Math.PI*2);ctx.clip();
  ctx.globalCompositeOperation='multiply';ctx.globalAlpha=def.alpha;ctx.fillStyle=def.tint;ctx.fillRect(DECK.cx-rx,DECK.cy-ry,rx*2,ry*2);
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;blit(ctx,l.base,DECK.cx-rx,DECK.cy-ry,rx*2,ry*2,cx,cy,vw,vh);
  ctx.globalCompositeOperation=def.glow[1];ctx.globalAlpha=pulse(def.glow[0])*(def.glowAlpha||1);blit(ctx,l.glow,DECK.cx-rx,DECK.cy-ry,rx*2,ry*2,cx,cy,vw,vh);
  ctx.restore();
  rim(ctx,def.rim,rx,ry);
 }
 function rim(ctx,color,rx,ry){
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const [w,a]of [[10,.12],[4,.3],[1.5,.7]]){ctx.strokeStyle=color;ctx.globalAlpha=a*pulse(1.1);ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(DECK.cx,DECK.cy,rx-3,ry-2,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
 }
 // Duel arena: dark outer band, gold inlay rings, radial spokes and a central sigil.
 function drawDuel(ctx,cx,cy,vw,vh){
  const [rx,ry]=deckRadii(),W=Math.round(rx*2*S),H=Math.round(ry*2*S);
  const l=layer('duel',W,H,(b,gl)=>{
   const x0=W/2,y0=H/2,k=ry/rx;
   b.save();b.translate(x0,y0);b.scale(1,k);
   const R=W/2;
   b.fillStyle='rgba(20,14,10,.55)';b.beginPath();b.arc(0,0,R,0,Math.PI*2);b.arc(0,0,R*.86,0,Math.PI*2,true);b.fill();
   b.fillStyle='rgba(60,24,16,.32)';b.beginPath();b.arc(0,0,R*.86,0,Math.PI*2);b.arc(0,0,R*.62,0,Math.PI*2,true);b.fill();
   for(const [rr,w]of [[.86,3],[.62,2.5],[.3,2]]){b.strokeStyle='#c9a44f';b.lineWidth=w;b.beginPath();b.arc(0,0,R*rr,0,Math.PI*2);b.stroke();b.strokeStyle='rgba(60,40,10,.8)';b.lineWidth=1;b.beginPath();b.arc(0,0,R*rr+w,0,Math.PI*2);b.stroke();}
   for(let i=0;i<24;i++){const a=i/24*Math.PI*2;b.strokeStyle=i%3?'rgba(201,164,79,.45)':'#d8b862';b.lineWidth=i%3?1:2;b.beginPath();b.moveTo(Math.cos(a)*R*.62,Math.sin(a)*R*.62);b.lineTo(Math.cos(a)*R*.86,Math.sin(a)*R*.86);b.stroke();}
   gl.save();gl.translate(x0,y0);gl.scale(1,k);
   const star=(ctx,r1,r2,n)=>{ctx.beginPath();for(let i=0;i<n*2;i++){const a=i/(n*2)*Math.PI*2-Math.PI/2,r=i%2?r2:r1;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();};
   b.fillStyle='rgba(120,30,18,.45)';star(b,R*.28,R*.12,8);b.fill();
   gl.strokeStyle='#ffd07a';gl.shadowColor='#ff9c3a';gl.shadowBlur=12;gl.lineWidth=2;star(gl,R*.28,R*.12,8);gl.stroke();
   gl.lineWidth=1.4;gl.beginPath();gl.arc(0,0,R*.3,0,Math.PI*2);gl.stroke();gl.beginPath();gl.arc(0,0,R*.08,0,Math.PI*2);gl.stroke();
   gl.restore();b.restore();
  });
  ctx.save();ctx.beginPath();ctx.ellipse(DECK.cx,DECK.cy,rx,ry,0,0,Math.PI*2);ctx.clip();
  ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.42;ctx.fillStyle='#8c5a44';ctx.fillRect(DECK.cx-rx,DECK.cy-ry,rx*2,ry*2);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  blit(ctx,l.base,DECK.cx-rx,DECK.cy-ry,rx*2,ry*2,cx,cy,vw,vh);
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=pulse(1.3);blit(ctx,l.glow,DECK.cx-rx,DECK.cy-ry,rx*2,ry*2,cx,cy,vw,vh);
  ctx.restore();rim(ctx,'#ffbe6a',rx,ry);
 }
 // Thiên Vân Thành: an imperial avenue (ngự đạo) from the south gate to the
 // main hall and a cross street between market and forge, inlaid in gold.
 function street(ctx,x0,y0,x1,y1){
  ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.26;ctx.fillStyle='#7a6448';ctx.fillRect(x0,y0,x1-x0,y1-y0);ctx.restore();
  ctx.save();ctx.strokeStyle='rgba(196,160,82,.5)';ctx.lineWidth=1.6;
  const vertical=y1-y0>x1-x0;
  for(const o of [0,1]){ctx.beginPath();if(vertical){ctx.moveTo(o?x1:x0,y0);ctx.lineTo(o?x1:x0,y1);}else{ctx.moveTo(x0,o?y1:y0);ctx.lineTo(x1,o?y1:y0);}ctx.stroke();}
  ctx.fillStyle='rgba(206,172,96,.55)';const mid=vertical?(x0+x1)/2:(y0+y1)/2;
  for(let t=(vertical?y0:x0)+30;t<(vertical?y1:x1)-10;t+=46){const [x,y]=vertical?[mid,t]:[t,mid];ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+11,y);ctx.lineTo(x,y+7);ctx.lineTo(x-11,y);ctx.closePath();ctx.fill();}
  ctx.restore();
 }
 function drawHub(ctx){street(ctx,958,800,1042,1500);
  // Central formation with two white rings, as on the sect courts.
  ctx.save();ctx.strokeStyle='rgba(214,186,120,.22)';ctx.lineWidth=1.4;for(const r of [215,265]){ctx.beginPath();ctx.ellipse(1000,1150,r,r*.52,0,0,Math.PI*2);ctx.stroke();}ctx.restore();
  world.sprite(ctx,'theme-14-065',1000,1215,230);
 }
 // Sunset sky with layered distant peaks behind the floating city.
 const peaks=[0,1,2].map(layer=>{const r=seeded(97+layer*31),pts=[];let x=-200;while(x<2400){pts.push([x,(r()*.6+.2)]);x+=90+r()*160;}return pts;});
 function hubSky(ctx,cx,cy,vw,vh){
  const sky=ctx.createLinearGradient(0,cy,0,cy+vh);sky.addColorStop(0,'#f2c79b');sky.addColorStop(.35,'#d9a99a');sky.addColorStop(.62,'#8fa6b4');sky.addColorStop(1,'#3d5866');
  ctx.fillStyle=sky;ctx.fillRect(cx,cy,vw,vh);
  const tones=[['rgba(176,150,168,.55)','rgba(214,186,184,.25)'],['rgba(120,124,146,.75)','rgba(170,160,170,.35)'],['rgba(70,92,106,.9)','rgba(120,136,140,.5)']];
  peaks.forEach((pts,layer)=>{const par=.15+layer*.12,base=cy+vh*(.46+layer*.12),height=vh*(.3-layer*.06),off=cx*par;
   const fill=ctx.createLinearGradient(0,base-height,0,base+40);fill.addColorStop(0,tones[layer][0]);fill.addColorStop(1,tones[layer][1]);
   ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(cx-10,base+60);
   for(const [x,h] of pts){const sx=cx+((x-off)%2400+2400)%2400-200;if(sx<cx-320||sx>cx+vw+320)continue;const top=base-height*h,w=55+h*40;
    // Karst spire: steep sides, rounded crown, slight lean.
    ctx.lineTo(sx-w,base);ctx.quadraticCurveTo(sx-w*.55,top+height*h*.35,sx-w*.18,top+6);ctx.quadraticCurveTo(sx+w*.05,top-8,sx+w*.22,top+10);ctx.quadraticCurveTo(sx+w*.6,top+height*h*.4,sx+w,base);}
   ctx.lineTo(cx+vw+10,base+60);ctx.closePath();ctx.fill();
   const mist=ctx.createLinearGradient(0,base-30,0,base+70);mist.addColorStop(0,'rgba(244,228,214,0)');mist.addColorStop(1,'rgba(244,228,214,.45)');ctx.fillStyle=mist;ctx.fillRect(cx,base-30,vw,100);});
  return true;
 }
 const floor=drawGround;
 drawGround=function(cx,cy,vw,vh){
  floor(cx,cy,vw,vh);
  const id=world.state.scene;
  try{
   if(id==='hub'){g.save();drawHub(g);g.restore();}
   if(RIFT[id]){g.save();drawRift(g,id,cx,cy,vw,vh);g.restore();}
   else if(id==='duel'){g.save();drawDuel(g,cx,cy,vw,vh);g.restore();}
  }catch(e){/* decoration must never break the frame */}
 };
 // Rim decoration: non-solid sprites spaced around the deck, clear of the
 // portal (south) and the boss / duel start points (north, centre).
 const change=world.switchScene;
 world.switchScene=function(...args){
  const result=change.apply(this,args),id=world.state.scene,keys=DECOR[id];
  if(id==='hub'&&!world.buildings.some(b=>b.identity)){for(const x of [470,1530])world.buildings.push({key:'theme-14-010',x,y:1080,w:66,identity:true,solid:[-12,-7,12,6]});}
  if(keys&&!world.buildings.some(b=>b.identity)){
   const [rx,ry]=deckRadii();
   for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2+Math.PI/12,x=DECK.cx+Math.cos(a)*rx*.9,y=DECK.cy+Math.sin(a)*ry*.88;
    if(Math.abs(x-DECK.cx)<160&&y>DECK.cy)continue; // keep the portal approach clear
    world.buildings.push({key:keys[i%keys.length],x,y,w:id==='duel'?36:30,identity:true});
   }
  }
  return result;
 };
 window.mapIdentity={drawField,hubSky,layers,FIELD,RIFT,DECOR};
})();
