/* Tiên hiệp world renderer (map redesign). Owns the scenes listed in
   js/17c-tien-hiep-layouts.js and draws them entirely with canvas code plus the
   game's own sprite library:
   - a painted sky with sun or moon, distant mountain ranges and a cloud sea (parallax),
   - floating terraces with textured tops (jade paving, cobbles, grass, snow, ash),
     rock cliff faces, moss, hanging vines and animated waterfalls,
   - arched bridges, stairs, jade balustrades, paths, water with lotus, floor inlays,
   - props and buildings depth-sorted with the actors.
   Static terrain is baked into 250-unit chunks at the current zoom; only water,
   falls, glows and clouds animate per frame. Walkability comes from a 4-unit raster
   mask built from the same geometry. Gameplay positions the server checks are kept
   (see the layouts file). */
(function(){
 'use strict';
 const world=worldMap,L=window.tienHiepLayouts;if(!world||!L)return;
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const scenes=L.scenes,themes=L.themes,materials=L.materials;
 let disabled=false;
 const owns=id=>!disabled&&!!scenes[id];
 const scene=()=>world.state.scene,design=()=>owns(scene())?scenes[scene()]:null;
 const clock=()=>reduced.matches?0:(world.environmentClock||performance.now()/1000);
 const ready=i=>i&&i.complete&&i.naturalWidth>0;
 const rgb=h=>{const n=parseInt(h.slice(1),16);return[n>>16&255,n>>8&255,n&255];};
 const mix=(a,b,t)=>{const x=rgb(a),y=rgb(b);return'rgb('+x.map((v,i)=>Math.round(v+(y[i]-v)*t)).join(',')+')';};
 const alpha=(h,a)=>{const [r,g,b]=rgb(h);return'rgba('+r+','+g+','+b+','+a+')';};
 const shade=(h,k)=>k>=0?mix(h,'#ffffff',k):mix(h,'#000000',-k);

 // ------------------------------------------------------------------ geometry
 function prepare(d){if(d._ready)return d;
  const poly=pts=>{let area=0,x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i<pts.length;i++){const [ax,ay]=pts[i],[bx,by]=pts[(i+1)%pts.length];area+=ax*by-bx*ay;x0=Math.min(x0,ax);y0=Math.min(y0,ay);x1=Math.max(x1,ax);y1=Math.max(y1,ay);}
   const sign=area>0?1:-1,edges=pts.map((a,i)=>{const b=pts[(i+1)%pts.length],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1;return{a,b,nx:sign*dy/l,ny:-sign*dx/l,len:l};});
   const cx=pts.reduce((s,p)=>s+p[0],0)/pts.length,cy=pts.reduce((s,p)=>s+p[1],0)/pts.length;return{pts,edges,box:[x0,y0,x1,y1],cx,cy};};
  d.terraces=(d.terraces||[]).map(t=>({walk:true,z:0,...t,...poly(t.pts)}));
  d.islets=(d.islets||[]).map(t=>({walk:false,z:0,...t,...poly(t.pts)}));
  d.water=(d.water||[]).map(w=>({...w,...poly(w.pts)}));
  d.blocks=(d.blocks||[]).map(w=>({...w,...poly(w.pts)}));
  d.holes=(d.holes||[]).map(w=>({h:220,...w,...poly(w.pts)}));
  d.pads=(d.pads||[]).map(w=>({...w,...poly(w.pts)}));
  d.clearings=d.clearings||[];d.bridges=d.bridges||[];d.paths=d.paths||[];d.inlays=d.inlays||[];
  d.all=[...d.islets,...d.terraces].sort((a,b)=>(a.z-b.z)||(a.cy-b.cy));
  d.props=(d.props||[]).map(([k,x,y,w,solid])=>({key:k,x,y,w,solid}));
  for(const t of d.islets)for(const [k,x,y,w] of t.props||[])d.props.push({key:k,x,y,w,islet:true});
  // Snap every bridge to the gap it spans: walk from a to b, find where the deck
  // leaves the first island and where it meets the next, and end 8 units onto each rim.
  const land=d.terraces.filter(t=>t.walk);const onLand=(x,y)=>land.some(t=>x>=t.box[0]&&x<=t.box[2]&&y>=t.box[1]&&y<=t.box[3]&&inside(t.pts,x,y));
  for(const b of d.bridges){const [ax,ay]=b.a,[bx,by]=b.b,len=Math.hypot(bx-ax,by-ay)||1,ux=(bx-ax)/len,uy=(by-ay)/len,ext=60;let exit=null,entry=null,prev=onLand(ax-ux*ext,ay-uy*ext);
   for(let s2=-ext;s2<=len+ext;s2+=2){const here=onLand(ax+ux*s2,ay+uy*s2);if(prev&&!here&&exit==null)exit=s2;if(!prev&&here&&exit!=null)entry=s2;prev=here;}
   if(exit!=null&&entry!=null&&entry>exit){b.a=[Math.round(ax+ux*(exit-10)),Math.round(ay+uy*(exit-10))];b.b=[Math.round(ax+ux*(entry+10)),Math.round(ay+uy*(entry+10))];b.arch=Math.min(b.arch??10,(entry-exit)*.08);}}
  // Keep hand-placed props on solid ground: nudge strays toward their island, drop the rest.
  {const tops=d.terraces;const ok=(x,y)=>tops.some(t=>inside(t.pts,x,y-2)&&lineDist([...t.pts,t.pts[0]],x,y)>14);
   d.props=d.props.filter(p=>{if(p.islet||ok(p.x,p.y))return true;let best=null;for(const t of tops){const dd=Math.hypot(t.cx-p.x,t.cy-p.y);if(!best||dd<best.d)best={t,d:dd};}
    if(!best)return false;const ux=(best.t.cx-p.x)/(best.d||1),uy=(best.t.cy-p.y)/(best.d||1);for(let k=4;k<=220;k+=4){const x=p.x+ux*k,y=p.y+uy*k;if(ok(x,y)){p.x=Math.round(x);p.y=Math.round(y);return true;}}return false;});}
  if(d.patchMats){const r2=L.rng((d.seed||3)*31);d.patches=[];for(let i=0;i<(d.patchCount||34);i++){const x=d.bounds[0]+r2()*(d.bounds[2]-d.bounds[0]),y=d.bounds[1]+r2()*(d.bounds[3]-d.bounds[1]),rx=90+r2()*170;d.patches.push({x:Math.round(x),y:Math.round(y),rx:Math.round(rx),ry:Math.round(rx*(.45+r2()*.2)),mat:d.patchMats[i%d.patchMats.length]});}}
  if(d.scatter)scatter(d);
  // Stairs: where each stair crosses the terrace's south-facing rim.
  d.stairs=[];for(const t of d.terraces)for(const s of t.stairs||[]){const y=rimY(t,s.x);if(y!=null)d.stairs.push({x:s.x,w:s.w,y,h:t.h});}
  d.falls=[];for(const t of d.all)for(const x of t.falls||[]){const y=rimY(t,x);if(y!=null)d.falls.push({x,y,h:t.h+170,w:16+((x*7)%9)});}
  const r=L.rng(d.bounds[0]*7+d.bounds[1]);d.clouds=[];
  for(let i=0;i<22;i++)d.clouds.push({x:d.bounds[0]-150+r()*(d.bounds[2]-d.bounds[0]+300),y:d.bounds[1]+r()*(d.bounds[3]-d.bounds[1]+250),w:180+r()*260,speed:2+r()*5,phase:r()*TAU,a:.5+r()*.4});
  d._ready=true;return d;}
 function inside(pts,x,y){let c=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;}
 function segDist(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/l));return Math.hypot(px-ax-dx*t,py-ay-dy*t);}
 function lineDist(line,x,y){let best=1e9;for(let i=1;i<line.length;i++)best=Math.min(best,segDist(x,y,line[i-1][0],line[i-1][1],line[i][0],line[i][1]));return best;}
 // Seeded groves: trees cluster on open ground, never on roads, water, ravines, camps or services.
 function scatter(d){const r=L.rng(d.seed||7),land=d.terraces.filter(t=>t.walk&&!t.z),placed=d.props.slice(),services=Object.values(d.services||{}),camps=d.camps||[];
  const free=(x,y,gap,road=46)=>land.some(t=>inside(t.pts,x,y))&&!d.water.some(w=>inside(w.pts,x,y)||lineDist([...w.pts,w.pts[0]],x,y)<14)&&!d.holes.some(h=>inside(h.pts,x,y)||lineDist([...h.pts,h.pts[0]],x,y)<22)
   &&!d.terraces.some(t=>t.z===1&&inside(t.pts,x,y))&&!d.pads.some(p=>inside(p.pts,x,y)||lineDist([...p.pts,p.pts[0]],x,y)<20)&&!d.paths.some(p=>lineDist(p.pts,x,y)<p.w/2+road)&&!camps.some(c=>((x-c[0])/230)**2+((y-c[1])/170)**2<1)
   &&!services.some(s=>Math.hypot(s[0]-x,(s[1]-y)*1.4)<90)&&!d.bridges.some(b=>segDist(x,y,b.a[0],b.a[1],b.b[0],b.b[1])<b.w)&&land.every(t=>!inside(t.pts,x,y)||lineDist([...t.pts,t.pts[0]],x,y)>26)
   &&placed.every(p=>Math.hypot(p.x-x,(p.y-y)*1.35)>Math.max(gap,(p.w||30)*.36));
  for(const rule of d.scatter){const [x0,y0,x1,y1]=rule.box||d.bounds;let groves=rule.groves||0;
   for(let g2=0;g2<groves;g2++){const gx=x0+r()*(x1-x0),gy=y0+r()*(y1-y0);if(!free(gx,gy,40,60))continue;const count=(rule.per||6)+Math.floor(r()*4);let made=0;
    for(let i=0;i<count*3&&made<count;i++){const rr=i?(rule.spread||30)*Math.sqrt(i):0,a=i*2.39996+gx,x=gx+Math.cos(a)*rr*1.25,y=gy+Math.sin(a)*rr*.75,w=rule.size[0]+r()*(rule.size[1]-rule.size[0]);
     if(!free(x,y,rule.gap||34))continue;const p={key:rule.keys[Math.floor(r()*rule.keys.length)],x:Math.round(x),y:Math.round(y),w:Math.round(w),solid:rule.solid};placed.push(p);d.props.push(p);made++;}}
   for(let i=0;i<(rule.loose||0);i++){const x=x0+r()*(x1-x0),y=y0+r()*(y1-y0),w=rule.size[0]+r()*(rule.size[1]-rule.size[0]);if(!free(x,y,rule.gap||30,rule.road??30))continue;const p={key:rule.keys[Math.floor(r()*rule.keys.length)],x:Math.round(x),y:Math.round(y),w:Math.round(w),solid:rule.solid};placed.push(p);d.props.push(p);}
   for(let i=0;i<(rule.shore||0);i++){const w0=d.water[Math.floor(r()*d.water.length)];if(!w0)break;const e=w0.pts[Math.floor(r()*w0.pts.length)],x=e[0]+(e[0]-w0.cx)*.06+(r()-.5)*10,y=e[1]+(e[1]-w0.cy)*.12+(r()-.5)*6;
    if(!land.some(t=>inside(t.pts,x,y))||d.paths.some(p=>lineDist(p.pts,x,y)<p.w/2+8)||d.bridges.some(b=>segDist(x,y,b.a[0],b.a[1],b.b[0],b.b[1])<b.w))continue;const p={key:rule.keys[Math.floor(r()*rule.keys.length)],x:Math.round(x),y:Math.round(y),w:Math.round(rule.size[0]+r()*(rule.size[1]-rule.size[0]))};d.props.push(p);}}
 }
 function rimY(t,x){let best=null;for(const e of t.edges){if(e.ny<=0)continue;const [ax,ay]=e.a,[bx,by]=e.b;if((x-ax)*(x-bx)>0||ax===bx)continue;const y=ay+(by-ay)*(x-ax)/(bx-ax);if(best==null||y>best)best=y;}return best;}
 function path(ctx,pts){ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();}
 const hits=(box,v)=>!(box[2]<v[0]||box[0]>v[2]||box[3]<v[1]||box[1]>v[3]);

 // ------------------------------------------------------------------ material tiles
 const tiles=new Map();
 function tile(name){if(tiles.has(name))return tiles.get(name);const m=materials[name]||materials.jade,S=512,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d'),r=L.rng(name.length*97+name.charCodeAt(0));
  const wrap=(fn)=>{for(const ox of [-S,0,S])for(const oy of [-S,0,S]){x.save();x.translate(ox,oy);fn();x.restore();}};
  x.fillStyle=m.base;x.fillRect(0,0,S,S);
  // soft value blotches
  for(let i=0;i<70;i++){const px=r()*S,py=r()*S,rr=30+r()*90,k=(r()-.5)*.12;wrap(()=>{const gr=x.createRadialGradient(px,py,0,px,py,rr);gr.addColorStop(0,alpha(k>0?'#ffffff':'#000000',Math.abs(k)));gr.addColorStop(1,alpha('#000000',0));x.fillStyle=gr;x.fillRect(px-rr,py-rr,rr*2,rr*2);});}
  if(m.kind==='paving'){ // iso diamond flagstones, 64x32 px each (32x16 world units at 2px/unit... tile = 256 units)
   const W=64,H=32;for(let j=-1;j<=S/H*2;j++)for(let i=-1;i<=S/W;i++){const cx=i*W+(j%2?W/2:0),cy=j*H/2,k=(r()-.5)*m.tint*2;
    x.beginPath();x.moveTo(cx,cy-H/2+1);x.lineTo(cx+W/2-1,cy);x.lineTo(cx,cy+H/2-1);x.lineTo(cx-W/2+1,cy);x.closePath();x.fillStyle=alpha(k>0?'#ffffff':'#3b3020',Math.abs(k));x.fill();
    x.strokeStyle=alpha('#ffffff',.25);x.lineWidth=1;x.beginPath();x.moveTo(cx-W/2+2,cy);x.lineTo(cx,cy-H/2+2);x.lineTo(cx+W/2-2,cy);x.stroke();}
   x.strokeStyle=m.line;x.lineWidth=1.6;x.globalAlpha=.75;for(let k=-S;k<S*2;k+=W/2){x.beginPath();x.moveTo(k,0);x.lineTo(k+S,S/2*1);x.lineTo(k+S*2,S);x.stroke();x.beginPath();x.moveTo(k,S);x.lineTo(k+S,S/2);x.lineTo(k+S*2,0);x.stroke();}
   x.globalAlpha=1;
   for(let i=0;i<18;i++){const px=r()*S,py=r()*S;x.strokeStyle=alpha(m.line,.35);x.lineWidth=.8;x.beginPath();x.moveTo(px,py);for(let s=0;s<4;s++)x.lineTo(px+(r()-.5)*30,py+(r()-.5)*14);x.stroke();}
  }else if(m.kind==='cobble'){
   for(let i=0;i<520;i++){const px=r()*S,py=r()*S,w=14+r()*20,h=8+r()*10,k=(r()-.5)*m.tint*2.5;wrap(()=>{x.beginPath();x.ellipse(px,py,w/2,h/2,r()*.4-.2,0,TAU);x.fillStyle=alpha(k>0?'#ffffff':'#2a2418',Math.abs(k)+.04);x.fill();x.strokeStyle=alpha(m.line,.5);x.lineWidth=1.2;x.stroke();});}
  }else if(m.kind==='grass'){
   for(let i=0;i<5200;i++){const px=r()*S,py=r()*S,l=4+r()*7,col=m.blades[i%m.blades.length],lean=(r()-.5)*4;wrap(()=>{x.strokeStyle=col;x.globalAlpha=.55+r()*.4;x.lineWidth=1.2;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+lean*.4,py-l*.6,px+lean,py-l);x.stroke();});}
   x.globalAlpha=1;if(m.flowers)for(let i=0;i<140;i++){const px=r()*S,py=r()*S;x.fillStyle=m.flowers[i%m.flowers.length];x.globalAlpha=.9;x.beginPath();x.arc(px,py,1.6+r()*1.2,0,TAU);x.fill();}
   if(m.wet)for(let i=0;i<14;i++){const px=r()*S,py=r()*S;wrap(()=>{x.globalAlpha=.35;x.fillStyle=m.wet;x.beginPath();x.ellipse(px,py,20+r()*30,8+r()*10,0,0,TAU);x.fill();});}
   x.globalAlpha=1;
  }else if(m.kind==='snow'){
   for(let i=0;i<220;i++){const px=r()*S,py=r()*S;wrap(()=>{x.globalAlpha=.25;x.fillStyle=m.shade;x.beginPath();x.ellipse(px,py,10+r()*40,4+r()*12,0,0,TAU);x.fill();});}
   for(let i=0;i<500;i++){x.globalAlpha=.8;x.fillStyle=m.spark;x.fillRect(r()*S,r()*S,1.2,1.2);}x.globalAlpha=1;
  }else if(m.kind==='ash'){
   for(let i=0;i<300;i++){const px=r()*S,py=r()*S;wrap(()=>{x.globalAlpha=.35;x.fillStyle=m.shade;x.beginPath();x.ellipse(px,py,8+r()*30,4+r()*10,r(),0,TAU);x.fill();});}
   x.globalAlpha=.6;x.strokeStyle=m.shade;x.lineWidth=1.5;for(let i=0;i<40;i++){const px=r()*S,py=r()*S;x.beginPath();x.moveTo(px,py);for(let s=0;s<5;s++)x.lineTo(px+(r()-.5)*60,py+(r()-.5)*30);x.stroke();}
   for(let i=0;i<160;i++){x.globalAlpha=.4+r()*.5;x.fillStyle=m.spark;x.fillRect(r()*S,r()*S,1.5,1.5);}x.globalAlpha=1;
  }else if(m.kind==='dirt'){
   for(let i=0;i<900;i++){const px=r()*S,py=r()*S;x.globalAlpha=.35;x.fillStyle=r()<.5?m.shade:'#efe2c4';x.beginPath();x.ellipse(px,py,1.5+r()*3,1+r()*2,0,0,TAU);x.fill();}x.globalAlpha=1;
  }else if(m.kind==='wood'){
   for(let j=0;j<S;j+=22){x.fillStyle=alpha(j%44?'#ffffff':'#000000',.06);x.fillRect(0,j,S,20);x.strokeStyle=m.line;x.lineWidth=2;x.beginPath();x.moveTo(0,j);x.lineTo(S,j);x.stroke();}
  }
  tiles.set(name,c);return c;}
 const patterns=new WeakMap();
 function pattern(ctx,name){let map=patterns.get(ctx);if(!map){map=new Map();patterns.set(ctx,map);}if(map.has(name))return map.get(name);
  const p=ctx.createPattern(tile(name),'repeat');p.setTransform(new DOMMatrix().scale(.5,.5));map.set(name,p);return p;}

 // ------------------------------------------------------------------ terrain painting (world coordinates)
 // Raised platforms stand on the floor below: a straight masonry wall (or a rock
 // outcrop for mesas) of constant height with a contact shadow at its foot.
 function drawWall(ctx,t,th,wall){const m=materials[t.mat]||materials.jade,h=t.h,r=L.rng(Math.round(t.cx*7+t.cy*3));
  const faces=t.edges.filter(e=>e.ny>0.02).sort((a,b)=>(a.a[1]+a.b[1])-(b.a[1]+b.b[1]));
  for(const e of faces){const [ax,ay]=e.a,[bx,by]=e.b;
   ctx.fillStyle=alpha('#000000',.22);ctx.beginPath();ctx.moveTo(ax,ay+h);ctx.lineTo(bx,by+h);ctx.lineTo(bx+4,by+h+9);ctx.lineTo(ax+4,ay+h+9);ctx.closePath();ctx.fill();
   const face=new Path2D();face.moveTo(ax,ay);face.lineTo(bx,by);face.lineTo(bx,by+h);face.lineTo(ax,ay+h);face.closePath();
   const base=wall?shade(m.base,-.12):th.cliff[0],low=wall?shade(m.base,-.38):th.cliff[1],gr=ctx.createLinearGradient(0,Math.min(ay,by),0,Math.max(ay,by)+h);gr.addColorStop(0,base);gr.addColorStop(1,low);ctx.fillStyle=gr;ctx.fill(face);
   ctx.save();ctx.clip(face);const lit=-e.nx*.7+e.ny*.15;ctx.fillStyle=lit>0?alpha('#ffffff',Math.min(.16,lit*.18)):alpha('#000000',Math.min(.25,-lit*.3));ctx.fill(face);
   if(wall){const n=Math.max(1,Math.round(e.len/34));for(let i=0;i<=n;i++){const k=i/n,x=ax+(bx-ax)*k,y=ay+(by-ay)*k;ctx.fillStyle=alpha('#ffffff',.22);ctx.fillRect(x-3,y,6,h);ctx.fillStyle=alpha('#000000',.12);ctx.fillRect(x+3,y,2,h);}
    ctx.strokeStyle=alpha('#000000',.12);ctx.lineWidth=1;for(let k=1;k<4;k++){ctx.beginPath();ctx.moveTo(ax,ay+h*k/4);ctx.lineTo(bx,by+h*k/4);ctx.stroke();}
    ctx.fillStyle=alpha('#ffffff',.35);ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(bx,by+5);ctx.lineTo(ax,ay+5);ctx.closePath();ctx.fill();
    if(t.trim){ctx.strokeStyle=alpha(m.gold||'#d8b45c',.9);ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(ax,ay+6);ctx.lineTo(bx,by+6);ctx.stroke();}
    ctx.fillStyle=alpha('#000000',.18);ctx.beginPath();ctx.moveTo(ax,ay+h-6);ctx.lineTo(bx,by+h-6);ctx.lineTo(bx,by+h);ctx.lineTo(ax,ay+h);ctx.closePath();ctx.fill();}
   else{const cols=Math.max(1,Math.round(e.len/10));for(let i=0;i<cols;i++){const k0=i/cols,k1=(i+1)/cols,xa=ax+(bx-ax)*k0,xb=ax+(bx-ax)*k1,ya=ay+(by-ay)*k0,yb=ay+(by-ay)*k1;ctx.fillStyle=r()<.5?alpha('#ffffff',.06+r()*.08):alpha('#000000',.06+r()*.1);ctx.beginPath();ctx.moveTo(xa,ya);ctx.lineTo(xb,yb);ctx.lineTo(xb,yb+h);ctx.lineTo(xa,ya+h);ctx.closePath();ctx.fill();}
    for(let k=1;k<4;k++){ctx.strokeStyle=alpha(th.cliff[2],.16);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(ax,ay+h*k/4+(r()-.5)*4);ctx.lineTo(bx,by+h*k/4+(r()-.5)*4);ctx.stroke();}
    if(th.moss&&!['snow','ash','void','slate'].includes(t.mat)){const mg=ctx.createLinearGradient(0,Math.min(ay,by),0,Math.min(ay,by)+12);mg.addColorStop(0,alpha(th.moss,.9));mg.addColorStop(1,alpha(th.moss,0));ctx.fillStyle=mg;ctx.fill(face);}}
   ctx.restore();}
 }
 // Smooth 1-D value noise (deterministic per x) for continuous cliff profiles.
 const hash=n=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};
 const noise=x=>{const i=Math.floor(x),f=x-i,u=f*f*(3-2*f);return hash(i)*(1-u)+hash(i+1)*u;};
 // Depth of the rock below the rim at x: deepest under the island's middle, ragged tips.
 function depthAt(t,x){const half=Math.max(40,(t.box[2]-t.box[0])/2),k=Math.min(1,Math.abs(x-(t.box[0]+half))/half),taper=.38+.62*Math.sqrt(Math.max(0,1-k*k)),
   tip=noise(x*.09+t.cx)>.62?(noise(x*.31+t.cy)*1.1)*t.h*.45:0;return t.h*taper*(.8+.4*noise(x*.025+t.cy*.01))+tip;}
 function drawFaces(ctx,t,th,d){const cliff=th.cliff,r=L.rng(Math.round(t.cx*13+t.cy)),raised=t.z===1,wall=t.wall??(raised&&(materials[t.mat]||{}).kind==='paving');
  if(raised)return drawWall(ctx,t,th,wall);
  const faces=t.edges.filter(e=>e.ny>0.02).sort((a,b)=>(a.a[1]+a.b[1])-(b.a[1]+b.b[1]));
  for(const e of faces){const [ax,ay]=e.a,[bx,by]=e.b,n=Math.max(2,Math.ceil(e.len/6)),top=[],bot=[];let deepest=0;
   for(let i=0;i<=n;i++){const k=i/n,x=ax+(bx-ax)*k,y=ay+(by-ay)*k,dd=depthAt(t,x);top.push([x,y]);bot.push([x,y+dd]);deepest=Math.max(deepest,dd);}
   const y0=Math.min(ay,by),y1=Math.max(ay,by)+deepest,face=new Path2D();face.moveTo(top[0][0],top[0][1]);for(const p of top)face.lineTo(p[0],p[1]);for(let i=bot.length-1;i>=0;i--)face.lineTo(bot[i][0],bot[i][1]);face.closePath();
   const gr=ctx.createLinearGradient(0,y0,0,y1);gr.addColorStop(0,cliff[0]);gr.addColorStop(.28,cliff[1]);gr.addColorStop(.75,cliff[2]);gr.addColorStop(1,alpha(cliff[2],.0));ctx.fillStyle=gr;ctx.fill(face);
   ctx.save();ctx.clip(face);
   // facing light (sun from the upper left)
   const lit=-e.nx*.7+e.ny*.15;ctx.fillStyle=lit>0?alpha('#ffffff',Math.min(.16,lit*.18)):alpha('#000000',Math.min(.28,-lit*.32));ctx.fillRect(Math.min(ax,bx)-2,y0-2,Math.abs(bx-ax)+4,y1-y0+4);
   // prismatic rock columns: alternating lit and shaded bands with ragged bottoms
   const cols=Math.max(1,Math.round(e.len/11));for(let i=0;i<cols;i++){const k0=i/cols,k1=(i+1)/cols,xa=ax+(bx-ax)*k0,xb=ax+(bx-ax)*k1,ya=ay+(by-ay)*k0,yb=ay+(by-ay)*k1,dd=depthAt(t,(xa+xb)/2)*(.55+r()*.5),v=r();
    ctx.fillStyle=v<.45?alpha('#ffffff',.07+r()*.08):alpha('#000000',.06+r()*.1);ctx.beginPath();ctx.moveTo(xa,ya);ctx.lineTo(xb,yb);ctx.lineTo(xb-(xb-xa)*.2,yb+dd);ctx.lineTo(xa+(xb-xa)*.3,ya+dd*.92);ctx.closePath();ctx.fill();
    ctx.strokeStyle=alpha(cliff[2],.35);ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(xa,ya+1);ctx.lineTo(xa+(r()-.5)*3,ya+dd*(.6+r()*.4));ctx.stroke();}
   // strata and cracks
   for(let k=1;k<5;k++){const off=k*deepest/6+(r()-.5)*5;ctx.strokeStyle=alpha(cliff[2],.13);ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(ax,ay+off);ctx.quadraticCurveTo((ax+bx)/2,(ay+by)/2+off+(r()-.5)*8,bx,by+off);ctx.stroke();}
   // contact shadow under the rim
   ctx.strokeStyle=alpha('#000000',.25);ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ax,ay+2);ctx.lineTo(bx,by+2);ctx.stroke();
   if(th.lava){for(let i=0;i<Math.round(e.len/34);i++){const k=r(),x=ax+(bx-ax)*k,y=ay+(by-ay)*k;ctx.strokeStyle=alpha('#ff8a2a',.6);ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x,y+4);ctx.lineTo(x+(r()-.5)*8,y+depthAt(t,x)*(.3+r()*.4));ctx.stroke();}}
   if(th.void){for(let i=0;i<Math.round(e.len/30);i++){const k=r(),x=ax+(bx-ax)*k,y=ay+(by-ay)*k;ctx.strokeStyle=alpha('#c39bff',.5);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y+6);ctx.lineTo(x+(r()-.5)*10,y+depthAt(t,x)*(.2+r()*.5));ctx.stroke();}}
   ctx.restore();
   // moss band and hanging vines
   if(th.moss&&!['snow','ash','void','slate'].includes(t.mat)){const mg=ctx.createLinearGradient(0,y0,0,y0+14);mg.addColorStop(0,alpha(th.moss,.95));mg.addColorStop(1,alpha(th.moss,0));ctx.save();ctx.clip(face);ctx.fillStyle=mg;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.lineTo(bx,by+16);ctx.lineTo(ax,ay+16);ctx.closePath();ctx.fill();ctx.restore();
    const vines=Math.round(e.len/24);for(let i=0;i<vines;i++){const k=r(),x=ax+(bx-ax)*k,y=ay+(by-ay)*k,l=8+r()*depthAt(t,x)*.4;ctx.strokeStyle=alpha(shade(th.moss,-.25),.75);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.bezierCurveTo(x+3,y+l*.3,x-3,y+l*.6,x+(r()-.5)*4,y+l);ctx.stroke();
     ctx.fillStyle=alpha(th.moss,.85);for(let s2=0;s2<3;s2++){ctx.beginPath();ctx.ellipse(x+(r()-.5)*4,y+l*(s2+1)/4,1.7,1,0,0,TAU);ctx.fill();}}}
   if(t.mat==='snow'){ctx.save();ctx.clip(face);ctx.fillStyle=alpha('#ffffff',.85);for(let i=0;i<=n;i++){const [x,y]=top[i];ctx.beginPath();ctx.ellipse(x,y+2,4,3+noise(x*.2)*5,0,0,TAU);ctx.fill();}ctx.restore();}
  }
 }
 function drawTop(ctx,t,th){const m=materials[t.mat]||materials.jade;path(ctx,t.pts);ctx.fillStyle=pattern(ctx,t.mat);ctx.fill();
  ctx.save();path(ctx,t.pts);ctx.clip();
  // rim shading inside the edge (gives the slab thickness)
  ctx.lineJoin='round';ctx.strokeStyle=alpha('#000000',m.kind==='paving'?.10:.16);ctx.lineWidth=18;path(ctx,t.pts);ctx.stroke();
  ctx.strokeStyle=alpha('#000000',.08);ctx.lineWidth=40;path(ctx,t.pts);ctx.stroke();
  if(m.kind==='grass'){ // darker soil lip on the south rim
   for(const e of t.edges)if(e.ny>0.1){ctx.strokeStyle=alpha('#3d4a22',.35);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(e.a[0],e.a[1]-1);ctx.lineTo(e.b[0],e.b[1]-1);ctx.stroke();}}
  ctx.restore();
  ctx.strokeStyle=alpha('#ffffff',m.kind==='paving'?.65:.3);ctx.lineWidth=1.6;path(ctx,t.pts);ctx.stroke();
  if(t.trim){const k=1-14/Math.max(40,Math.min(t.box[2]-t.box[0],(t.box[3]-t.box[1])*2)),inset=t.pts.map(([x,y])=>[t.cx+(x-t.cx)*k,t.cy+(y-t.cy)*k]);ctx.strokeStyle=alpha(m.gold||'#d8b45c',.9);ctx.lineWidth=2.2;path(ctx,inset);ctx.stroke();
   ctx.strokeStyle=alpha('#fff3c4',.6);ctx.lineWidth=.8;path(ctx,inset);ctx.stroke();}
  if(m.kind==='grass'){ // shrub clumps and flowers spilling over the south rim
   const r=L.rng(Math.round(t.cx*5+t.cy*11));for(const e of t.edges){if(e.ny<=0.1)continue;const n=Math.round(e.len/16);for(let i=0;i<n;i++){if(r()<.45)continue;const k=r(),x=e.a[0]+(e.b[0]-e.a[0])*k,y=e.a[1]+(e.b[1]-e.a[1])*k,s2=3+r()*5;
    for(let j=0;j<3;j++){ctx.fillStyle=m.blades[(i+j)%m.blades.length];ctx.beginPath();ctx.ellipse(x+(j-1)*s2*.8,y+1+r()*3,s2,s2*.65,0,0,TAU);ctx.fill();}
    ctx.fillStyle='rgba(0,0,0,.15)';ctx.beginPath();ctx.ellipse(x,y+s2*.6+2,s2*1.6,s2*.4,0,0,TAU);ctx.fill();
    if(m.flowers&&r()<.4){ctx.fillStyle=m.flowers[i%m.flowers.length];ctx.beginPath();ctx.arc(x+(r()-.5)*s2,y-1,1.4,0,TAU);ctx.fill();}}}}
  if(m.kind==='grass'){ // blades overhanging the south rim
   const r=L.rng(Math.round(t.cx+t.cy*3));for(const e of t.edges){if(e.ny<=0.05)continue;const n=Math.round(e.len/3);for(let i=0;i<n;i++){const t0=r(),x=e.a[0]+(e.b[0]-e.a[0])*t0,y=e.a[1]+(e.b[1]-e.a[1])*t0;ctx.strokeStyle=m.blades[i%m.blades.length];ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(x,y-2);ctx.lineTo(x+(r()-.5)*3,y+2+r()*4);ctx.stroke();}}}
 }
 function drawWater(ctx,w,th){path(ctx,w.pts);const deep=w.color||(w.ice?'#a9cfe6':th.water?.[0]||(th.void?'#3b2a63':th.lava?'#ffb347':'#3592a8')),light=w.light||(w.ice?'#eef8ff':th.water?.[1]||(th.void?'#7a5bb5':th.lava?'#d9480f':'#8fdcd8'));
  const gr=ctx.createRadialGradient(w.cx,w.cy,0,w.cx,w.cy,Math.max(w.box[2]-w.box[0],w.box[3]-w.box[1])*.6);gr.addColorStop(0,deep);gr.addColorStop(1,light);ctx.fillStyle=gr;ctx.fill();
  ctx.save();path(ctx,w.pts);ctx.clip();ctx.strokeStyle=alpha('#ffffff',.35);ctx.lineWidth=10;path(ctx,w.pts);ctx.stroke();ctx.strokeStyle=alpha(shade(deep,-.4),.25);ctx.lineWidth=26;ctx.globalCompositeOperation='source-atop';
  ctx.restore();ctx.strokeStyle=alpha(th.lava?'#2a1210':'#f6fbf4',th.lava?.8:.7);ctx.lineWidth=2;path(ctx,w.pts);ctx.stroke();
  if(th.lava&&!w.ice){ctx.save();path(ctx,w.pts);ctx.clip();const r3=L.rng(Math.round(w.cx*7+w.cy));const area=(w.box[2]-w.box[0])*(w.box[3]-w.box[1]);
   for(let i=0;i<Math.min(90,area/900);i++){const x=w.box[0]+r3()*(w.box[2]-w.box[0]),y=w.box[1]+r3()*(w.box[3]-w.box[1]),rx=6+r3()*16,ry=rx*(.35+r3()*.25);ctx.fillStyle='rgba(58,24,14,'+(.45+r3()*.35)+')';ctx.beginPath();ctx.ellipse(x,y,rx,ry,r3()*.6-.3,0,TAU);ctx.fill();ctx.strokeStyle='rgba(255,200,90,.55)';ctx.lineWidth=1;ctx.stroke();}
   const gl=ctx.createLinearGradient(0,w.box[1],0,w.box[3]);gl.addColorStop(0,'rgba(255,240,170,.25)');gl.addColorStop(.5,'rgba(255,120,30,0)');gl.addColorStop(1,'rgba(255,240,170,.25)');ctx.fillStyle=gl;ctx.fillRect(w.box[0],w.box[1],w.box[2]-w.box[0],w.box[3]-w.box[1]);ctx.restore();
   ctx.strokeStyle='rgba(40,16,10,.85)';ctx.lineWidth=5;path(ctx,w.pts);ctx.stroke();}
  if(w.ice){ctx.save();path(ctx,w.pts);ctx.clip();ctx.strokeStyle=alpha('#ffffff',.7);ctx.lineWidth=1;const r2=L.rng(Math.round(w.cx));for(let i=0;i<14;i++){const x=w.box[0]+r2()*(w.box[2]-w.box[0]),y=w.box[1]+r2()*(w.box[3]-w.box[1]);ctx.beginPath();ctx.moveTo(x,y);for(let k=0;k<3;k++)ctx.lineTo(x+(r2()-.5)*60,y+(r2()-.5)*20);ctx.stroke();}ctx.restore();}
  if(w.moon){ctx.save();ctx.translate(w.cx+30,w.cy);ctx.scale(1,.35);const mg=ctx.createRadialGradient(0,0,0,0,0,34);mg.addColorStop(0,'rgba(255,252,235,.85)');mg.addColorStop(.5,'rgba(235,240,255,.35)');mg.addColorStop(1,'rgba(220,230,255,0)');ctx.fillStyle=mg;ctx.beginPath();ctx.arc(0,0,34,0,TAU);ctx.fill();ctx.restore();}
  const r=L.rng(Math.round(w.cx*3+w.cy));for(let i=0;i<(w.lotus||0);i++){let x,y,ok=false;for(let tries=0;tries<20&&!ok;tries++){x=w.box[0]+r()*(w.box[2]-w.box[0]);y=w.box[1]+r()*(w.box[3]-w.box[1]);ok=ctx.isPointInPath(new Path2D('M'+w.pts.map(p=>p.join(' ')).join('L')+'Z'),x,y);}if(!ok)continue;
   const s=5+r()*4;ctx.fillStyle='#4f9a52';ctx.beginPath();ctx.ellipse(x,y,s,s*.5,0,.3,TAU-.1);ctx.lineTo(x,y);ctx.fill();ctx.strokeStyle=alpha('#2f6b37',.6);ctx.lineWidth=.6;ctx.stroke();
   if(r()<.55){ctx.fillStyle='#ffc6dc';for(let k=0;k<5;k++){const a=k/5*TAU;ctx.beginPath();ctx.ellipse(x+Math.cos(a)*1.6,y-2+Math.sin(a)*.8,1.8,1,a,0,TAU);ctx.fill();}ctx.fillStyle='#ffe18a';ctx.beginPath();ctx.arc(x,y-2,.9,0,TAU);ctx.fill();}}
 }
 function drawPathRibbon(ctx,p){const pts=p.pts;ctx.lineJoin=ctx.lineCap='round';const stroke=(w,style)=>{ctx.strokeStyle=style;ctx.lineWidth=w;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.stroke();};
  stroke(p.w+8,alpha('#3a3020',.18));stroke(p.w,pattern(ctx,p.mat||'dirt'));stroke(p.w*.5,alpha('#ffffff',.06));
  if(p.mat==='stone'||p.mat==='jade'){ctx.setLineDash([2,10]);stroke(p.w+2,alpha('#8c8370',.35));ctx.setLineDash([]);}}
 function drawInlay(ctx,n,th){const {x,y,r}=n,gold='#d8b45c';ctx.save();ctx.translate(x,y);ctx.scale(1,.5);ctx.lineCap='round';
  const circle=(rr,w,col,a=1)=>{ctx.globalAlpha=a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.arc(0,0,rr,0,TAU);ctx.stroke();};
  ctx.globalAlpha=.22;ctx.fillStyle=n.kind==='thunder'?'#6f62c8':n.kind==='moon'?'#8d8ad8':'#7fc7b0';ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
  circle(r,4,gold,.9);circle(r*.93,1.4,'#fff3c4',.8);circle(r*.55,3,gold,.85);
  const spokes=n.kind==='octagram'||n.kind==='bagua'?8:n.kind==='compass'?16:12;
  for(let i=0;i<spokes;i++){const a=i/spokes*TAU,l=i%2?.8:.93;ctx.globalAlpha=.85;ctx.strokeStyle=gold;ctx.lineWidth=i%2?1.4:2.4;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.58,Math.sin(a)*r*.58);ctx.lineTo(Math.cos(a)*r*l,Math.sin(a)*r*l);ctx.stroke();}
  if(n.kind==='octagram'||n.kind==='compass'||n.kind==='portal'){ctx.strokeStyle=gold;ctx.lineWidth=2;ctx.globalAlpha=.8;for(const off of [0,Math.PI/4]){ctx.beginPath();for(let i=0;i<4;i++){const a=off+i/4*TAU;ctx[i?'lineTo':'moveTo'](Math.cos(a)*r*.52,Math.sin(a)*r*.52);}ctx.closePath();ctx.stroke();}}
  if(n.kind==='bagua'){const TRI=[[1,1,1],[0,1,1],[1,0,1],[0,0,1],[1,1,0],[0,1,0],[1,0,0],[0,0,0]];ctx.strokeStyle='#5d4a2a';ctx.lineWidth=3;ctx.globalAlpha=.75;
   for(let i=0;i<8;i++){ctx.save();ctx.rotate(i/8*TAU);ctx.translate(r*.74,0);ctx.rotate(Math.PI/2);TRI[i].forEach((s,k)=>{const yy=(k-1)*r*.06,hw=r*.1;ctx.beginPath();if(s){ctx.moveTo(-hw,yy);ctx.lineTo(hw,yy);}else{ctx.moveTo(-hw,yy);ctx.lineTo(-hw*.2,yy);ctx.moveTo(hw*.2,yy);ctx.lineTo(hw,yy);}ctx.stroke();});ctx.restore();}
   ctx.globalAlpha=.85;ctx.fillStyle='#f6f1e2';ctx.beginPath();ctx.arc(0,0,r*.3,0,TAU);ctx.fill();ctx.fillStyle='#3b3a3e';ctx.beginPath();ctx.arc(0,0,r*.3,-Math.PI/2,Math.PI/2);ctx.arc(0,r*.15,r*.15,Math.PI/2,-Math.PI/2);ctx.arc(0,-r*.15,r*.15,Math.PI/2,-Math.PI/2,true);ctx.fill();}
  if(n.kind==='moon'){ctx.globalAlpha=.85;ctx.fillStyle='#eef0ff';ctx.beginPath();ctx.arc(0,0,r*.3,.9,TAU-.9);ctx.arc(r*.13,0,r*.25,-1.35,1.35,true);ctx.closePath();ctx.fill();}
  if(n.kind==='sword'){ctx.globalAlpha=.8;ctx.fillStyle='#e9f6f2';for(let i=0;i<8;i++){ctx.save();ctx.rotate(i/8*TAU);ctx.beginPath();ctx.moveTo(r*.18,0);ctx.lineTo(r*.48,-r*.03);ctx.lineTo(r*.52,0);ctx.lineTo(r*.48,r*.03);ctx.closePath();ctx.fill();ctx.restore();}}
  if(n.kind==='thunder'){ctx.globalAlpha=.85;ctx.strokeStyle='#cfc4ff';ctx.lineWidth=2.4;for(let i=0;i<6;i++){ctx.save();ctx.rotate(i/6*TAU);ctx.beginPath();ctx.moveTo(r*.15,0);ctx.lineTo(r*.27,r*.05);ctx.lineTo(r*.33,-r*.05);ctx.lineTo(r*.48,0);ctx.stroke();ctx.restore();}}
  if(n.kind==='lotus'||n.kind==='portal'){ctx.globalAlpha=.75;ctx.fillStyle=n.kind==='portal'?'#bdf4ff':'#ffd8e6';for(let i=0;i<8;i++){ctx.save();ctx.rotate(i/8*TAU);ctx.beginPath();ctx.ellipse(r*.28,0,r*.17,r*.07,0,0,TAU);ctx.fill();ctx.restore();}}
  if(n.kind==='camp'){ctx.globalAlpha=.5;ctx.setLineDash([6,8]);circle(r*.75,2,'#5a4a30',.5);ctx.setLineDash([]);}
  ctx.restore();}
 function drawBridge(ctx,b,th){const [ax,ay]=b.a,[bx,by]=b.b,dx=bx-ax,dy=by-ay,l=Math.hypot(dx,dy)||1,nx=-dy/l,ny=dx/l,w=b.w/2,arch=b.arch??Math.min(14,l*.08),N=16,mat=b.mat||'jade';
  const at=(t,s)=>[ax+dx*t+nx*w*s,ay+dy*t+ny*w*s-Math.sin(t*Math.PI)*arch];
  const left=[],right=[];for(let i=0;i<=N;i++){left.push(at(i/N,-1));right.push(at(i/N,1));}
  const stone=mat==='wood'?'#7b5232':mat==='stone'?'#8f8a80':'#e8e2d2',dark=mat==='wood'?'#4d3220':mat==='stone'?'#5c5850':'#b0a690';
  // shadow cast on the cloud sea far below
  // arch underside / fascia
  const south=ny>0?right:left;ctx.fillStyle=dark;path(ctx,[...south,...south.slice().reverse().map(([x,y],i)=>[x,y+6+Math.sin((1-i/N)*Math.PI)*4])]);ctx.fill();
  ctx.fillStyle=pattern(ctx,mat==='wood'?'wood':mat==='stone'?'stone':'jade');path(ctx,[...left,...right.slice().reverse()]);ctx.fill();
  ctx.strokeStyle=alpha(dark,.6);ctx.lineWidth=1;for(let i=1;i<N;i++){const p=at(i/N,-1),q=at(i/N,1);ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}
  for(const side of [left,right]){ctx.strokeStyle=stone;ctx.lineWidth=2.4;ctx.beginPath();side.forEach(([x,y],i)=>i?ctx.lineTo(x,y-8):ctx.moveTo(x,y-8));ctx.stroke();
   for(let i=0;i<=N;i+=2){const [x,y]=side[i];ctx.fillStyle=dark;ctx.fillRect(x-1.6,y-10,3.2,10);ctx.fillStyle=stone;ctx.fillRect(x-1.2,y-11,2.4,9);if(mat==='jade'&&(i===0||i===N)){ctx.fillStyle='#d8b45c';ctx.beginPath();ctx.arc(x,y-12,2,0,TAU);ctx.fill();}}}
 }
 function drawStairs(ctx,s,th,mat){const top=s.y,h=s.h+4,w=s.w/2,steps=Math.max(4,Math.round(h/6));ctx.save();
  ctx.fillStyle=pattern(ctx,mat||'jade');ctx.fillRect(s.x-w,top-2,s.w,h+4);
  for(let i=0;i<steps;i++){const y=top+i*h/steps;ctx.fillStyle=alpha('#000000',.14);ctx.fillRect(s.x-w,y+h/steps*.62,s.w,h/steps*.38);ctx.fillStyle=alpha('#ffffff',.35);ctx.fillRect(s.x-w,y,s.w,1.2);}
  for(const sx of [-1,1]){ctx.fillStyle='#d9d1bc';ctx.fillRect(s.x+sx*w-(sx>0?4:0),top-10,4,h+10);ctx.fillStyle='#d8b45c';ctx.beginPath();ctx.arc(s.x+sx*(w-2),top-11,2.4,0,TAU);ctx.fill();}
  ctx.restore();}
 function drawRails(ctx,t,d){const gaps=[...d.bridges.flatMap(b=>[b.a,b.b]).map(p=>({x:p[0],y:p[1],r:b_r(d,p),bridge:true})),...d.stairs.map(s=>({x:s.x,y:s.y,r:s.w/2+6}))];
  const col='#f1ece0',dark='#b7ad97';
  for(const e of t.edges){const n=Math.max(1,Math.round(e.len/22));let prev=null;
   for(let i=0;i<=n;i++){const k=i/n,x=e.a[0]+(e.b[0]-e.a[0])*k-e.nx*4,y=e.a[1]+(e.b[1]-e.a[1])*k-e.ny*4,gap=d.bridges.some(b=>segDist(x,y,b.a[0],b.a[1],b.b[0],b.b[1])<b.w/2+8)||gaps.some(g=>!g.bridge&&Math.hypot(g.x-x,(g.y-y)*1.6)<g.r)||(!t.z&&d.terraces.some(u=>u.z===1&&(inside(u.pts,x,y)||inside(u.pts,x,y-u.h-6))));
    if(gap){prev=null;continue;}
    if(prev){ctx.strokeStyle=dark;ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(prev[0],prev[1]-7);ctx.lineTo(x,y-7);ctx.stroke();ctx.strokeStyle=col;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(prev[0],prev[1]-8);ctx.lineTo(x,y-8);ctx.stroke();
     ctx.strokeStyle=alpha(dark,.8);ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(prev[0],prev[1]-3);ctx.lineTo(x,y-3);ctx.stroke();}
    ctx.fillStyle=dark;ctx.fillRect(x-1.8,y-10,3.6,10);ctx.fillStyle=col;ctx.fillRect(x-1.3,y-11,2.6,10);if(t.trim&&i%2===0){ctx.fillStyle='#d8b45c';ctx.fillRect(x-1.6,y-12.5,3.2,2);}prev=[x,y];}}
 }
 const b_r=(d,p)=>{const b=d.bridges.find(b=>b.a===p||b.b===p);return b?b.w/2+10:30;};
 function drawPad(ctx,p,th){const m=materials[p.mat]||materials.jade;ctx.save();ctx.translate(2,4);path(ctx,p.pts);ctx.fillStyle=alpha('#000000',.16);ctx.fill();ctx.restore();
  path(ctx,p.pts);ctx.fillStyle=pattern(ctx,p.mat||'jade');ctx.fill();ctx.strokeStyle=alpha('#ffffff',.5);ctx.lineWidth=1.4;ctx.stroke();
  if(p.trim!==false){const k=1-10/Math.max(40,Math.min(p.box[2]-p.box[0],(p.box[3]-p.box[1])*2)),inset=p.pts.map(([x,y])=>[p.cx+(x-p.cx)*k,p.cy+(y-p.cy)*k]);ctx.strokeStyle=alpha(m.gold||'#d8b45c',.85);ctx.lineWidth=2;path(ctx,inset);ctx.stroke();}
  ctx.strokeStyle=alpha('#5a4a30',.35);ctx.lineWidth=3;ctx.beginPath();for(const e of p.edges)if(e.ny>0.05){ctx.moveTo(e.a[0],e.a[1]+2);ctx.lineTo(e.b[0],e.b[1]+2);}ctx.stroke();}
 const patches=new WeakMap();
 function softPatch(ctx,c){let img=patches.get(c);if(!img){const w=Math.ceil(c.rx*2),h=Math.ceil(c.ry*2);img=document.createElement('canvas');img.width=w;img.height=h;const x=img.getContext('2d');x.translate(-c.x+c.rx,-c.y+c.ry);x.fillStyle=pattern(x,c.mat||'dirt');x.fillRect(c.x-c.rx,c.y-c.ry,w,h);
   x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='destination-in';x.translate(w/2,h/2);x.scale(1,c.ry/c.rx);const gr=x.createRadialGradient(0,0,0,0,0,c.rx);gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(.62,'rgba(0,0,0,.95)');gr.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=gr;x.beginPath();x.arc(0,0,c.rx,0,TAU);x.fill();patches.set(c,img);}
  ctx.drawImage(img,c.x-c.rx,c.y-c.ry);}
 function paintTerrain(ctx,d,view){const th=themes[d.theme];
  for(const level of [0,1]){const list=d.all.filter(t=>(t.z||0)===level),vis=list.filter(t=>hits([t.box[0],t.box[1],t.box[2],t.box[3]+t.h+40],view));if(!vis.length&&level)continue;
   if(level===0){for(const t of vis)drawTop(ctx,t,th);
    // decals clipped to level-0 land
    ctx.save();ctx.beginPath();for(const t of list)for(let i=0;i<t.pts.length;i++)ctx[i?'lineTo':'moveTo'](t.pts[i][0],t.pts[i][1]),i===t.pts.length-1&&ctx.closePath();ctx.clip();
    for(const c of d.patches||[])if(hits([c.x-c.rx,c.y-c.ry,c.x+c.rx,c.y+c.ry],view))softPatch(ctx,c);
    for(const c of d.clearings)if(hits([c.x-c.rx,c.y-c.ry,c.x+c.rx,c.y+c.ry],view))softPatch(ctx,c);
    for(const p of d.paths||[])drawPathRibbon(ctx,p);for(const p of d.pads)if(hits(p.box,view))drawPad(ctx,p,th);for(const w of d.water)if(hits(w.box,view))drawWater(ctx,w,th);for(const n of d.inlays||[])if((n.z||0)===0)drawInlay(ctx,n,th);ctx.restore();
    for(const h of d.holes)if(hits([h.box[0],h.box[1],h.box[2],h.box[3]+40],view)){ctx.save();ctx.globalCompositeOperation='destination-out';path(ctx,h.pts);ctx.fill();ctx.restore();}
    ctx.save();ctx.globalCompositeOperation='destination-over';for(const t of vis.slice().reverse())drawFaces(ctx,t,th,d);ctx.restore();
    for(const h of d.holes)if(hits([h.box[0],h.box[1],h.box[2],h.box[3]+40],view)){ctx.save();path(ctx,h.pts);ctx.clip();const rim={...h,h:Math.min(h.h,90),edges:h.edges.map(e=>({...e,nx:-e.nx,ny:-e.ny}))};drawFaces(ctx,rim,th,d);
     if(th.void||th.lava){ctx.strokeStyle=alpha(th.void?'#c39bff':'#ff8a3a',.45);ctx.lineWidth=6;path(ctx,h.pts);ctx.stroke();}ctx.restore();}
    for(const b of d.bridges)drawBridge(ctx,b,th);
   }else{for(const t of vis){drawFaces(ctx,t,th,d);}for(const s of d.stairs)drawStairs(ctx,s,th,vis[0]?.mat);for(const t of vis)drawTop(ctx,t,th);for(const n of d.inlays||[])if(n.z===1)drawInlay(ctx,n,th);}
  }
  for(const t of d.all)if(t.rail&&hits(t.box,view))drawRails(ctx,t,d);
  for(const p of d.props){if(p.islet||!p.w||p.key.startsWith('th:stones'))continue;const big=p.w>110,rx=p.w*(big?.46:.38),ry=p.w*(big?.15:.13),x=p.x+p.w*.1,y=p.y-ry*.25;
   if(x+rx<view[0]||x-rx>view[2]||y+ry<view[1]||y-ry>view[3])continue;ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);const gr=ctx.createRadialGradient(0,0,0,0,0,rx);gr.addColorStop(0,'rgba(20,24,18,.34)');gr.addColorStop(.6,'rgba(20,24,18,.18)');gr.addColorStop(1,'rgba(20,24,18,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,rx,0,TAU);ctx.fill();ctx.restore();}
 }

 // ------------------------------------------------------------------ sky and clouds (screen space)
 const backdrops=new Map();
 function backdrop(name){if(backdrops.has(name))return backdrops.get(name);const th=themes[name],Wd=1200,Hd=720,c=document.createElement('canvas');c.width=Wd;c.height=Hd;const x=c.getContext('2d'),r=L.rng(name.length*131+7);
  const gr=x.createLinearGradient(0,0,0,Hd);gr.addColorStop(0,th.sky[0]);gr.addColorStop(.55,th.sky[1]);gr.addColorStop(1,th.sky[2]);x.fillStyle=gr;x.fillRect(0,0,Wd,Hd);
  if(th.stars)for(let i=0;i<220;i++){x.globalAlpha=.3+r()*.7;x.fillStyle='#ffffff';const s=r()<.08?1.8:1;x.fillRect(r()*Wd,r()*Hd*.6,s,s);}x.globalAlpha=1;
  const orb=th.sun||th.moon;if(orb){const ox=orb.x*Wd,oy=orb.y*Hd,halo=x.createRadialGradient(ox,oy,0,ox,oy,orb.r*4);halo.addColorStop(0,alpha(orb.color,.9));halo.addColorStop(.25,alpha(orb.color,.35));halo.addColorStop(1,alpha(orb.color,0));x.fillStyle=halo;x.fillRect(0,0,Wd,Hd);
   x.fillStyle=orb.color;x.beginPath();x.arc(ox,oy,orb.r*(th.moon?1:.6),0,TAU);x.fill();if(th.moon){x.globalAlpha=.12;x.fillStyle='#8c88b8';for(const [dx,dy,k] of [[-.3,-.1,.25],[.25,.3,.16],[.3,-.3,.1]]){x.beginPath();x.arc(ox+dx*orb.r,oy+dy*orb.r,k*orb.r,0,TAU);x.fill();}x.globalAlpha=1;}}
  // mountain ranges: karst spires and ridges, lighter with distance
  th.peaks.forEach((col,li)=>{const base=Hd*(.5+li*.1),amp=Hd*(.28-li*.05);x.fillStyle=col;x.beginPath();x.moveTo(0,Hd);let px=0;x.lineTo(0,base);
   while(px<Wd){const w=30+r()*90,h=amp*(.35+r()*.75),spire=r()<.35;if(spire){x.lineTo(px+w*.3,base-h*.4);x.quadraticCurveTo(px+w*.42,base-h*1.05,px+w*.55,base-h*.98);x.lineTo(px+w*.7,base-h*.35);}else x.quadraticCurveTo(px+w*.5,base-h*.7,px+w,base-h*.2*r());px+=w;}
   x.lineTo(Wd,Hd);x.closePath();x.fill();
   // haze between ranges
   const hz=x.createLinearGradient(0,base-amp,0,base+40);hz.addColorStop(0,alpha(th.haze,0));hz.addColorStop(1,alpha(th.haze,.55));x.fillStyle=hz;x.fillRect(0,base-amp,Wd,amp+Hd);});
  // cloud sea
  const seaTop=Hd*.74;for(let row=0;row<5;row++){const y=seaTop+row*28;for(let i=0;i<26;i++){const cx=r()*Wd,rr=40+r()*70;const cg=x.createRadialGradient(cx,y,0,cx,y,rr);cg.addColorStop(0,alpha(th.sea,.95));cg.addColorStop(.6,alpha(th.sea,.6));cg.addColorStop(1,alpha(th.sea,0));x.fillStyle=cg;x.fillRect(cx-rr,y-rr,rr*2,rr*2);}
   x.fillStyle=alpha(th.seaShade,.08);x.fillRect(0,y+10,Wd,30);}
  x.fillStyle=th.sea;x.fillRect(0,seaTop+150,Wd,Hd);
  backdrops.set(name,c);return c;}
 const puffs=new Map();
 function puff(color){if(puffs.has(color))return puffs.get(color);const c=document.createElement('canvas');c.width=256;c.height=110;const x=c.getContext('2d'),r=L.rng(color.length*17+3);
  for(let i=0;i<16;i++){const px=40+r()*176,py=50+(r()-.5)*30,rr=22+r()*34;const gr=x.createRadialGradient(px,py-rr*.2,0,px,py,rr);gr.addColorStop(0,alpha('#ffffff',.95));gr.addColorStop(.55,alpha(color,.75));gr.addColorStop(1,alpha(color,0));x.fillStyle=gr;x.fillRect(px-rr,py-rr,rr*2,rr*2);}
  puffs.set(color,c);return c;}
 function drawSky(ctx,d,cx,cy,vw,vh){const th=themes[d.theme],img=backdrop(d.theme),b=d.bounds;
  // parallax: the backdrop slides 8% as the camera moves across the scene
  const fx=(cx+vw/2-b[0])/(b[2]-b[0])-.5,fy=(cy+vh/2-b[1])/(b[3]-b[1])-.5;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);const s=Math.max(W/img.width,H/img.height)*1.12;const w=img.width*s,h=img.height*s;ctx.imageSmoothingQuality='high';ctx.drawImage(img,(W-w)/2-fx*w*.06,(H-h)/2-fy*h*.06,w,h);
  if(th.lightning){const t=clock(),k=Math.max(0,Math.sin(t*1.7)*Math.sin(t*.43)-.92)*10;if(k>0){ctx.globalAlpha=k*.35;ctx.fillStyle='#d8d4ff';ctx.fillRect(0,0,W,H);}}
  ctx.restore();
  // drifting mid-air clouds below and between the islands
  const t=clock(),img2=puff(th.sea);for(const c of d.clouds){const x=c.x+Math.sin(t*.02*c.speed+c.phase)*60,y=c.y;if(x+c.w<cx||x-c.w>cx+vw||y+c.w*.5<cy||y-c.w*.5>cy+vh)continue;ctx.globalAlpha=c.a*.5;ctx.drawImage(img2,x-c.w/2,y-c.w*.22,c.w,c.w*.43);}ctx.globalAlpha=1;
 }

 // ------------------------------------------------------------------ chunk cache
 const CH=250,chunks=new Map();let chunkScene='',chunkRes=0,bakedThisFrame=0;
 function resolution(){return Math.max(1,Math.min(2.5,Math.round(Z*2)/2));}
 function chunk(d,i,j,res){const key=i+','+j;let c=chunks.get(key);if(c){c.used=performance.now();return c;}
  if(bakedThisFrame>=1)return null;bakedThisFrame++;
  const cv=document.createElement('canvas');cv.width=cv.height=Math.ceil(CH*res);const x=cv.getContext('2d');x.setTransform(res,0,0,res,-i*CH*res,-j*CH*res);x.imageSmoothingQuality='high';
  try{paintTerrain(x,d,[i*CH-10,j*CH-10,(i+1)*CH+10,(j+1)*CH+10]);}catch(e){console.error(e);}
  c={canvas:cv,used:performance.now()};chunks.set(key,c);
  if(chunks.size>28){const old=[...chunks.entries()].sort((a,b)=>a[1].used-b[1].used).slice(0,chunks.size-28);for(const [k] of old)chunks.delete(k);}
  return c;}
 let overview=null,overviewScene='';
 function overviewCanvas(d){if(overviewScene===scene()&&overview)return overview;const c=document.createElement('canvas'),s=.25;c.width=c.height=2000*s;const x=c.getContext('2d');x.setTransform(s,0,0,s,0,0);paintTerrain(x,d,[0,0,2000,2000]);overview=c;overviewScene=scene();return c;}
 function drawTerrain(ctx,d,cx,cy,vw,vh){const res=resolution();if(chunkScene!==scene()||chunkRes!==res){chunks.clear();chunkScene=scene();chunkRes=res;}bakedThisFrame=0;
  const i0=Math.floor(cx/CH),j0=Math.floor(cy/CH),i1=Math.floor((cx+vw)/CH),j1=Math.floor((cy+vh)/CH);
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const c=chunk(d,i,j,res);if(c)ctx.drawImage(c.canvas,i*CH,j*CH,CH,CH);else{const o=overviewCanvas(d);ctx.drawImage(o,i*CH*.25,j*CH*.25,CH*.25,CH*.25,i*CH,j*CH,CH,CH);}}}

 // ------------------------------------------------------------------ animated layer
 function drawAnimated(ctx,d,cx,cy,vw,vh){const th=themes[d.theme],t=clock(),view=[cx-60,cy-60,cx+vw+60,cy+vh+300];
  for(const w of d.water){if(!hits(w.box,view))continue;
   if(!w.ice){ctx.save();ctx.setLineDash([10,14]);ctx.lineDashOffset=-t*(th.lava?6:12);ctx.strokeStyle=th.lava?'rgba(255,214,120,.55)':'rgba(255,255,255,.5)';ctx.lineWidth=2.2;path(ctx,w.pts);ctx.stroke();ctx.restore();}
   if(th.lava&&!w.ice){ctx.save();path(ctx,w.pts);ctx.clip();ctx.globalCompositeOperation='lighter';const r2=L.rng(Math.round(w.cx));
    for(let i=0;i<16;i++){const bx=w.box[0]+r2()*(w.box[2]-w.box[0]),by=w.box[1]+r2()*(w.box[3]-w.box[1]),x=bx+((t*14+i*37)%120)-60,k=.5+.5*Math.sin(t*2+i);ctx.strokeStyle='rgba(255,236,150,'+(.25+.35*k)+')';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(x-18,by);ctx.quadraticCurveTo(x,by-3,x+18,by+1);ctx.stroke();}
    const pulse=.08+.06*Math.sin(t*1.3+w.cx);ctx.fillStyle='rgba(255,140,40,'+pulse+')';ctx.fillRect(w.box[0],w.box[1],w.box[2]-w.box[0],w.box[3]-w.box[1]);ctx.restore();}
   else if(!w.ice){ctx.save();path(ctx,w.pts);ctx.clip();const r2=L.rng(Math.round(w.cx*3));for(let i=0;i<10;i++){const x=w.box[0]+r2()*(w.box[2]-w.box[0]),y=w.box[1]+r2()*(w.box[3]-w.box[1]),k=Math.max(0,Math.sin(t*2.2+i*1.7));if(k<.6)continue;const a=(k-.6)*2.2;ctx.fillStyle='rgba(255,255,255,'+a+')';ctx.fillRect(x-3,y-.4,6,.8);ctx.fillRect(x-.4,y-2,.8,4);}ctx.restore();}
   ctx.save();path(ctx,w.pts);ctx.clip();ctx.strokeStyle=alpha(th.lava?'#ffe08a':'#ffffff',.35);ctx.lineWidth=1.2;
   for(let i=0;i<10;i++){const y=w.box[1]+((i*37+t*6)%(w.box[3]-w.box[1]+20))-10,x=w.box[0]+((i*91)%(w.box[2]-w.box[0]+1)),l=14+(i%4)*8;ctx.globalAlpha=.25+.25*Math.sin(t*2+i);ctx.beginPath();ctx.moveTo(x-l/2,y);ctx.quadraticCurveTo(x,y-1.5,x+l/2,y);ctx.stroke();}ctx.restore();}
  for(const f of d.falls){if(f.x<view[0]||f.x>view[2]||f.y>view[3]||f.y+f.h<view[1])continue;const gr=ctx.createLinearGradient(0,f.y,0,f.y+f.h);gr.addColorStop(0,alpha(th.lava?'#ffb04a':'#e9fbff',.95));gr.addColorStop(.6,alpha(th.lava?'#ff6a1a':'#bfeeff',.6));gr.addColorStop(1,alpha(th.sea,0));
   ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(f.x-f.w/2,f.y);ctx.lineTo(f.x+f.w/2,f.y);ctx.lineTo(f.x+f.w*.75,f.y+f.h);ctx.lineTo(f.x-f.w*.75,f.y+f.h);ctx.closePath();ctx.fill();
   ctx.strokeStyle=alpha('#ffffff',.55);ctx.lineWidth=1;for(let i=0;i<6;i++){const ox=(i/5-.5)*f.w*.8,p=(t*.9+i*.17)%1;ctx.beginPath();ctx.moveTo(f.x+ox,f.y+p*f.h*.8);ctx.lineTo(f.x+ox*1.1,f.y+p*f.h*.8+18);ctx.stroke();}
   ctx.fillStyle=alpha('#ffffff',.6);ctx.beginPath();ctx.ellipse(f.x,f.y+2,f.w*.7,3,0,0,TAU);ctx.fill();}
  // gentle glow on floor inlays
  ctx.save();ctx.globalCompositeOperation='lighter';for(const n of d.inlays||[]){if(n.x+n.r<cx||n.x-n.r>cx+vw||n.y+n.r<cy||n.y-n.r>cy+vh)continue;const k=.05+.03*Math.sin(t*1.6+n.x);ctx.save();ctx.translate(n.x,n.y);ctx.scale(1,.5);const gr=ctx.createRadialGradient(0,0,0,0,0,n.r);gr.addColorStop(0,alpha(th.light||'#ffe6a8',k*1.6));gr.addColorStop(.7,alpha(th.light||'#ffe6a8',k*.6));gr.addColorStop(1,alpha(th.light||'#ffe6a8',0));ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,n.r,0,TAU);ctx.fill();ctx.restore();}ctx.restore();
 }

 // ------------------------------------------------------------------ walk mask (4 units per cell)
 const masks=new Map();
 function mask(id){if(masks.has(id))return masks.get(id);const d=prepare(scenes[id]),S=500,c=document.createElement('canvas');c.width=c.height=S;const x=c.getContext('2d',{willReadFrequently:true});x.scale(.25,.25);
  x.fillStyle='#000';x.fillRect(0,0,2000,2000);x.fillStyle='#fff';for(const t of d.terraces)if(t.walk){path(x,t.pts);x.fill();}
  x.strokeStyle='#000';x.lineJoin='round';x.lineWidth=20;for(const t of d.terraces)if(t.walk){path(x,t.pts);x.stroke();}
  x.fillStyle='#fff';x.strokeStyle='#fff';x.lineCap='butt';for(const b of d.bridges){x.lineWidth=b.w-14;x.beginPath();x.moveTo(b.a[0],b.a[1]);x.lineTo(b.b[0],b.b[1]);x.stroke();}
  x.fillStyle='#000';for(const w of d.water)if(!w.walk&&!w.ice){path(x,w.pts);x.fill();}for(const h of d.holes){path(x,h.pts);x.fill();x.strokeStyle='#000';x.lineWidth=14;x.stroke();}
  x.fillStyle='#fff';x.strokeStyle='#fff';for(const b of d.bridges){x.lineWidth=b.w-14;x.beginPath();x.moveTo(b.a[0],b.a[1]);x.lineTo(b.b[0],b.b[1]);x.stroke();}x.fillStyle='#000';
  for(const b of d.blocks){path(x,b.pts);x.fill();}
  // raised terraces: their cliff face is a wall except where stairs come down
  for(const t of d.terraces)if(t.z===1){for(const e of t.edges)if(e.ny>0.02){x.beginPath();x.moveTo(e.a[0],e.a[1]);x.lineTo(e.b[0],e.b[1]);x.lineTo(e.b[0],e.b[1]+t.h+6);x.lineTo(e.a[0],e.a[1]+t.h+6);x.closePath();x.fill();}
   if(!t.walk){path(x,t.pts);x.fill();continue;}x.fillStyle='#fff';path(x,t.pts);x.fill();x.strokeStyle='#000';x.lineWidth=16;for(const e of t.edges)if(e.ny<=0.02){x.beginPath();x.moveTo(e.a[0],e.a[1]);x.lineTo(e.b[0],e.b[1]);x.stroke();}x.fillStyle='#000';}
  x.fillStyle='#fff';for(const s of d.stairs)x.fillRect(s.x-s.w/2+10,s.y-12,s.w-20,s.h+26);
  x.fillStyle='#000';for(const p of d.props)if(p.solid&&!p.islet){x.beginPath();x.ellipse(p.x,p.y-p.solid[1]*.3,p.solid[0],p.solid[1],0,0,TAU);x.fill();}
  const data=x.getImageData(0,0,S,S).data,grid=new Uint8Array(S*S);for(let i=0;i<S*S;i++)grid[i]=data[i*4]>127?1:0;
  const m={grid,S};masks.set(id,m);return m;}
 function walkable(id,p){const m=mask(id),i=Math.floor(p.x/4),j=Math.floor(p.y/4);if(i<0||j<0||i>=m.S||j>=m.S)return false;return m.grid[j*m.S+i]===1;}
 // Reachability report (used by the test harness).
 function validate(id){const m=mask(id),d=scenes[id],start=d.spawn||{hub:[1000,1100],tower:[1000,1380]}[id]||[1000,1110],seen=new Uint8Array(m.S*m.S),q=[];const si=Math.floor(start[0]/4),sj=Math.floor(start[1]/4);
  if(!m.grid[sj*m.S+si])return{ok:false,error:'spawn blocked',start};seen[sj*m.S+si]=1;q.push(sj*m.S+si);while(q.length){const k=q.pop(),i=k%m.S,j=(k/m.S)|0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=m.S||nj>=m.S)continue;const nk=nj*m.S+ni;if(!seen[nk]&&m.grid[nk]){seen[nk]=1;q.push(nk);}}}
  const reach=(x,y)=>{const i=Math.floor(x/4),j=Math.floor(y/4);for(let r=0;r<=4;r++)for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const k=(j+b)*m.S+(i+a);if(seen[k])return true;}return false;};
  const bad=[];for(const [sid,[x,y]] of Object.entries(d.services||{}))if(!reach(x,y))bad.push(sid);for(const c of d.camps||[])if(!reach(c[0],c[1]))bad.push('camp@'+c);
  return{ok:!bad.length,bad};}

 // Grid route for auto-navigation: BFS on the walk mask, then line-of-sight smoothing.
 function findPath(from,to){const id=scene();if(!owns(id))return null;const m=mask(id),S=m.S,cell=p=>[Math.max(0,Math.min(S-1,Math.floor(p.x/4))),Math.max(0,Math.min(S-1,Math.floor(p.y/4)))];
  let [si,sj]=cell(from),[gi,gj]=cell(to);const open=k=>m.grid[k]===1;
  const nearest=(i,j)=>{for(let r=0;r<20;r++)for(let a=-r;a<=r;a++)for(const [x,y] of [[i+a,j-r],[i+a,j+r],[i-r,j+a],[i+r,j+a]])if(x>=0&&y>=0&&x<S&&y<S&&open(y*S+x))return[x,y];return null;};
  if(!open(sj*S+si)){const n=nearest(si,sj);if(!n)return null;[si,sj]=n;}if(!open(gj*S+gi)){const n=nearest(gi,gj);if(!n)return null;[gi,gj]=n;}
  const prev=new Int32Array(S*S).fill(-1),start=sj*S+si,goal=gj*S+gi,q=new Int32Array(S*S);let h=0,tl=0;q[tl++]=start;prev[start]=start;
  while(h<tl){const k=q[h++];if(k===goal)break;const i=k%S,j=(k/S)|0;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=S||nj>=S)continue;const nk=nj*S+ni;if(prev[nk]>=0||!open(nk))continue;if(di&&dj&&(!open(j*S+ni)||!open(nj*S+i)))continue;prev[nk]=k;q[tl++]=nk;}}
  if(prev[goal]<0)return null;const cells=[];for(let k=goal;k!==start;k=prev[k])cells.push(k);cells.reverse();
  const pt=k=>({x:(k%S)*4+2,y:((k/S)|0)*4+2}),clear=(a,b)=>{const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/3);for(let i=1;i<n;i++){const x=a.x+(b.x-a.x)*i/n,y=a.y+(b.y-a.y)*i/n;if(!open(Math.floor(y/4)*S+Math.floor(x/4)))return false;}return true;};
  const out=[];let anchor={x:from.x,y:from.y};for(let i=0;i<cells.length;i++){const next=pt(cells[i]);if(i+1<cells.length&&clear(anchor,pt(cells[i+1])))continue;out.push(next);anchor=next;}
  out.push({x:to.x,y:to.y});return out;}
 world.findPath=findPath;

 // ------------------------------------------------------------------ props
 const painted=new Map();
 function paintedProp(kind,variant){const key=kind+variant;if(painted.has(key))return painted.get(key);const c=document.createElement('canvas'),x=c.getContext('2d'),r=L.rng(variant*977+kind.length*31);
  if(kind==='bamboo'){c.width=150;c.height=270;const stems=8+Math.floor(r()*5),leaves=[];
   x.fillStyle='rgba(25,45,18,.35)';x.beginPath();x.ellipse(75,264,46,9,0,0,TAU);x.fill();
   for(let i=0;i<stems;i++){const bx=40+r()*70,lean=(r()-.5)*36,h=170+r()*90,w=4.5+r()*3,col=['#4f7d2c','#5d8f33','#6b9f3c','#457227'][i%4];
    const grd=x.createLinearGradient(bx-w,0,bx+w,0);grd.addColorStop(0,shade(col,-.25));grd.addColorStop(.45,shade(col,.25));grd.addColorStop(1,shade(col,-.3));
    x.strokeStyle=grd;x.lineWidth=w;x.lineCap='round';x.beginPath();x.moveTo(bx,264);x.quadraticCurveTo(bx+lean*.3,264-h*.5,bx+lean,264-h);x.stroke();
    x.strokeStyle='#2e4d1b';x.lineWidth=1.3;for(let k=1;k<8;k++){const t=k/8,px=bx+lean*t*t,py=264-h*t;x.beginPath();x.moveTo(px-w*.6,py);x.lineTo(px+w*.6,py);x.stroke();}
    for(let k=0;k<16;k++){const t=.35+r()*.65;leaves.push([bx+lean*t*t,264-h*t,(r()<.5?-1:1)*(.25+r()*1.1),16+r()*18]);}}
   for(const [px,py,a,l] of leaves){x.fillStyle=['#3f6d24','#5a9130','#76ad42','#4c7f2a'][Math.floor(r()*4)];x.save();x.translate(px,py);x.rotate(a);x.beginPath();x.moveTo(0,0);x.quadraticCurveTo(l*.5,-3.4,l,0);x.quadraticCurveTo(l*.5,3.4,0,0);x.fill();x.restore();}}
  else if(kind==='reeds'){c.width=70;c.height=70;for(let i=0;i<14;i++){const bx=15+r()*40,h=30+r()*34,lean=(r()-.5)*12;x.strokeStyle=['#7d8f4c','#9aa65a','#6b7d40'][i%3];x.lineWidth=1.4;x.beginPath();x.moveTo(bx,68);x.quadraticCurveTo(bx+lean*.4,68-h*.6,bx+lean,68-h);x.stroke();if(r()<.4){x.fillStyle='#6b4a2a';x.beginPath();x.ellipse(bx+lean*.92,68-h*.88,1.8,5,0,0,TAU);x.fill();}}}
  else if(kind==='stones'){c.width=60;c.height=40;for(let i=0;i<4;i++){const bx=12+r()*36,by=26+r()*8,w=6+r()*10;x.fillStyle=['#a8a294','#8f8a7e','#bbb4a3'][i%3];x.beginPath();x.ellipse(bx,by,w,w*.6,0,0,TAU);x.fill();x.fillStyle='rgba(255,255,255,.25)';x.beginPath();x.ellipse(bx-w*.2,by-w*.2,w*.5,w*.25,0,0,TAU);x.fill();}}
  painted.set(key,c);return c;}
 const TINTS={snow:'saturate(.55) brightness(1.18) hue-rotate(-12deg)',void:'hue-rotate(75deg) saturate(.9) brightness(.82)',ember:'sepia(.55) hue-rotate(-28deg) saturate(1.5) brightness(.72)',dusk:'hue-rotate(-20deg) saturate(.8) brightness(.85)'};
 const tinted=new Map();
 function tintedImage(name,key){const id=name+':'+key;if(tinted.has(id))return tinted.get(id);const img=world.asset(key);if(!ready(img))return null;const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.filter=TINTS[name]||'none';x.drawImage(img,0,0);
  if(name==='snow'){x.filter='none';x.globalCompositeOperation='source-atop';const gr=x.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(.5,'rgba(255,255,255,.12)');gr.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=gr;x.fillRect(0,0,c.width,c.height);}
  tinted.set(id,c);return c;}
 const themeMeta=new Map((window.themeAtlasSprites?.sprites||[]).map(s=>[s.id,s])),mapMeta=new Map((window.spriteCatalog?.maps||[]).map(m=>[m.id,m]));
 function drawProp(p){const k=p.key;
  if(k.startsWith('th:')){const [kind,v]=k.slice(3).split('#'),img=paintedProp(kind,Number(v)||((p.x*7+p.y*3)%5));const w=p.w,h=w*img.height/img.width;g.drawImage(img,p.x-w/2,p.y-h,w,h);return;}
  if(k.startsWith('tint:')){const [,name,base]=k.split(':'),img=tintedImage(name,base);if(!img)return world.sprite(g,base,p.x,p.y,p.w);const tm2=themeMeta.get(base);
   if(tm2){const w=Math.min(p.w,tm2.width),s2=w/tm2.width,h=tm2.height*s2;renderArtwork(g,img,p.x-w/2,p.y-h+tm2.padding*s2,w,h);return;}
   const mm=mapMeta.get(base),kk=mm?.width?img.width/mm.width:1,b=((mm?.bounds||[0,0,img.width/kk,img.height/kk])[3])*kk,h=p.w*img.height/img.width;renderArtwork(g,img,p.x-p.w/2,p.y-b*(p.w/img.width),p.w,h);return;}
  world.sprite(g,k,p.x,p.y,p.w);}

 // ------------------------------------------------------------------ hooks
 for(const d of Object.values(scenes))prepare(d);
 const baseGround=drawGround;drawGround=function(cx,cy,vw,vh){const d=design();if(!d)return baseGround(cx,cy,vw,vh);
  g.save();drawSky(g,d,cx,cy,vw,vh);g.restore();g.save();g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';drawTerrain(g,d,cx,cy,vw,vh);g.restore();};
 // Weather and light over the scene (above actors): petals, leaves, snow, embers, motes,
 // fireflies, and soft sun shafts on clear days. Simulation clock; no state.
 const WEATHER={dawn:'petal',spring:'petal',jadeDay:'leaf',verdant:'leaf',bamboo:'leaf',marsh:'firefly',moonNight:'firefly',storm:'rain',twilight:'mote',frost:'snow',ember:'ember',abyss:'void'};
 function weather(ctx,d,cx,cy,vw,vh){if(reduced.matches)return;const th=themes[d.theme],kind=WEATHER[d.theme],t=clock(),n=kind==='rain'?70:kind==='snow'?60:34;ctx.save();
  if(th.sun&&!th.lava){ctx.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const x=cx+vw*(.1+i*.22)+Math.sin(t*.07+i)*30,w=40+i*14;const gr=ctx.createLinearGradient(x,cy,x+vh*.5,cy+vh);gr.addColorStop(0,'rgba(255,246,214,.10)');gr.addColorStop(1,'rgba(255,246,214,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.moveTo(x,cy);ctx.lineTo(x+w,cy);ctx.lineTo(x+w+vh*.5,cy+vh);ctx.lineTo(x+vh*.5,cy+vh);ctx.closePath();ctx.fill();}ctx.globalCompositeOperation='source-over';}
  for(let i=0;i<n;i++){const h1=Math.sin(i*12.9898)*43758.5453,h2=Math.sin(i*78.233)*12345.678,fx=h1-Math.floor(h1),fy=h2-Math.floor(h2);
   let x,y,a=1;
   if(kind==='ember'||kind==='void'||kind==='mote'){const p=(fy+t*(.05+fx*.04))%1;x=cx+((fx*vw+Math.sin(t*.8+i)*20)%vw+vw)%vw;y=cy+vh*(1-p);a=Math.sin(p*Math.PI);
    ctx.globalCompositeOperation='lighter';ctx.fillStyle=kind==='ember'?'rgba(255,150,60,'+a*.8+')':kind==='void'?'rgba(190,150,255,'+a*.7+')':'rgba(255,214,200,'+a*.6+')';ctx.beginPath();ctx.arc(x,y,1.1+fx*1.4,0,TAU);ctx.fill();ctx.globalCompositeOperation='source-over';continue;}
   if(kind==='firefly'){x=cx+((fx*vw+Math.sin(t*.5+i*2)*30)%vw+vw)%vw;y=cy+((fy*vh+Math.cos(t*.4+i)*20)%vh+vh)%vh;a=Math.max(0,Math.sin(t*2+i*1.3));ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(x,y,0,x,y,5);gr.addColorStop(0,'rgba(255,250,170,'+a+')');gr.addColorStop(1,'rgba(255,250,170,0)');ctx.fillStyle=gr;ctx.fillRect(x-5,y-5,10,10);ctx.globalCompositeOperation='source-over';continue;}
   const speed=kind==='rain'?520:kind==='snow'?26:34,drift=kind==='rain'?-90:kind==='snow'?10:28,p=(fy+t*speed/vh)%1;x=cx+((fx*vw+t*drift+Math.sin(t+i)*(kind==='rain'?0:14))%vw+vw)%vw;y=cy+p*vh;
   if(kind==='rain'){ctx.strokeStyle='rgba(200,210,255,.35)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4,y+14);ctx.stroke();}
   else if(kind==='snow'){ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.arc(x,y,.9+fx*1.3,0,TAU);ctx.fill();}
   else{ctx.save();ctx.translate(x,y);ctx.rotate(t*2+i);ctx.scale(1,.5+.5*Math.sin(t*3+i));ctx.fillStyle=kind==='petal'?(i%3?'#ffc6dc':'#ffffff'):(i%2?'#9fd16a':'#c9b85a');ctx.globalAlpha=.85;ctx.beginPath();ctx.ellipse(0,0,2.2,1.1,0,0,TAU);ctx.fill();ctx.restore();}}
  ctx.restore();}
 const weatherDraw=dr;dr=function(){weatherDraw();const d=design();if(!d||paused())return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);try{weather(g,d,c.x,c.y,c.vw,c.vh);}catch{}g.restore();};
 const baseDetails=world.drawGroundDetails;world.drawGroundDetails=function(ctx,cx,cy,vw,vh){const d=design();if(!d)return baseDetails.call(this,ctx,cx,cy,vw,vh);drawAnimated(ctx,d,cx,cy,vw,vh);};
 const baseQueue=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){const d=design();if(!d)return baseQueue.call(this,items,cx,cy,vw,vh);
  // Older scenery layers read world.buildings and the decoration tables: hide them
  // while the chain adds NPCs, pets, portals and other gameplay actors.
  const keep=world.buildings.splice(0),deco=world.mapDecorations?.[scene()],hubDeco=world.layoutArt?.hubDecor,saved=[deco?.splice(0),scene()==='hub'?hubDeco?.splice(0):null];
  try{baseQueue.call(this,items,cx,cy,vw,vh);}finally{world.buildings.push(...keep);if(deco&&saved[0])deco.push(...saved[0]);if(hubDeco&&saved[1])hubDeco.push(...saved[1]);}
  for(const p of d.props)if(p.x>cx-p.w&&p.x<cx+vw+p.w&&p.y>cy-20&&p.y<cy+vh+p.w*1.2)items.push([p.islet?p.y-400:p.y,()=>drawProp(p)]);
  if(d.monument)items.push([d.monument.y,()=>monument(d.monument)]);};
 const swordArt=new Image();swordArt.src='Item/VuKhi/Kiem.png';
 function monument(m){if(!ready(swordArt))return;const h=m.h,w=h*swordArt.naturalWidth/swordArt.naturalHeight;g.save();g.translate(m.x,m.y-h*.42);g.rotate(Math.PI);g.shadowColor='#9ff3df';g.shadowBlur=12;g.drawImage(swordArt,-w/2,-h/2,w,h);g.restore();
  g.save();g.globalAlpha=.35;g.fillStyle='#203030';g.beginPath();g.ellipse(m.x,m.y,18,7,0,0,TAU);g.fill();g.restore();}
 const baseWalk=world.canWalk;world.canWalk=p=>owns(scene())?walkable(scene(),p):baseWalk(p);
 const baseTrace=world.traceMove;world.traceMove=function(a,b){if(!owns(scene()))return baseTrace.call(this,a,b);if(!world.canWalk(a))return{...a};const steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/3));let last={...a};for(let i=1;i<=steps;i++){const p={x:a.x+(b.x-a.x)*i/steps,y:a.y+(b.y-a.y)*i/steps};if(!world.canWalk(p))break;last=p;}return last;};
 const baseCamera=world.camera;world.camera=function(vw,vh){const d=design();if(!d)return baseCamera(vw,vh);const [x0,y0,x1,y1]=d.bounds,axis=(v,size,lo,hi)=>size>hi-lo?(lo+hi-size)/2:Math.max(lo,Math.min(hi-size,v-size/2));return{x:axis(P.x,vw,x0,x1),y:axis(P.y,vh,y0,y1),vw,vh};};
 // The hub and sect cameras come from gameCamera() directly in some builds: route them here too.
 const view=gameCamera;gameCamera=function(vw=W/Z,vh=H/Z){return design()?world.camera(vw,vh):view(vw,vh);};
 function placeServices(){const d=design();if(!d)return;for(const s of world.services){const p=d.services?.[s.id];if(p){s.x=p[0];s.y=p[1];}}world.state.near=null;}
 function applyBuildings(){const d=design();if(!d)return;world.buildings.splice(0,world.buildings.length,...d.props.filter(p=>!p.islet).map(p=>({key:p.key,x:p.x,y:p.y,w:p.w,tienHiep:true})));}
 // Hub feature positions read by other modules (pets, auction, raid gate, rift portals).
 const anchors=window.sceneAnchors?.hub;if(anchors&&window.expeditionRules)for(const m of expeditionRules.maps){const p=anchors.rifts?.[m.id];if(p)m.portal={x:p[0],y:p[1]};}
 const baseSwitch=world.switchScene;world.switchScene=function(...args){const r=baseSwitch.apply(this,args);if(design()){applyBuildings();placeServices();}return r;};
 if(design()){applyBuildings();placeServices();}
 const baseMini=world.renderMini;world.renderMini=function(ctx,size){const d=design();if(!d)return baseMini.call(this,ctx,size);const th=themes[d.theme];ctx.fillStyle=th.sky[1];ctx.fillRect(0,0,size,size);
  const [x0,y0,x1,y1]=d.bounds,span=Math.max(x1-x0,y1-y0),s=size/span,ox=(size-(x1-x0)*s)/2-x0*s,oy=(size-(y1-y0)*s)/2-y0*s;ctx.save();ctx.translate(ox,oy);ctx.scale(s,s);
  for(const t of d.all){ctx.fillStyle=t.walk?(materials[t.mat]?.kind==='grass'?'#8cb867':'#e7dfca'):'#9fb39a';path(ctx,t.pts);ctx.fill();}
  for(const w of d.water){ctx.fillStyle='#5fb6c4';path(ctx,w.pts);ctx.fill();}
  ctx.strokeStyle='#e7dfca';ctx.lineCap='round';for(const b of d.bridges){ctx.lineWidth=b.w;ctx.beginPath();ctx.moveTo(b.a[0],b.a[1]);ctx.lineTo(b.b[0],b.b[1]);ctx.stroke();}
  for(const sv of world.services){ctx.fillStyle=sv.npc?'#d9a441':'#6cc9e0';ctx.beginPath();ctx.arc(sv.x,sv.y,span/90,0,TAU);ctx.fill();}
  ctx.fillStyle='#fff';ctx.strokeStyle='#203040';ctx.lineWidth=span/250;ctx.beginPath();ctx.arc(P.x,P.y,span/70,0,TAU);ctx.fill();ctx.stroke();ctx.restore();};
 const basePreview=world.renderMapPreview;world.renderMapPreview=function(ctx,size){const d=design();if(!d)return basePreview?.call(this,ctx,size);world.renderMini(ctx,size);};

 window.tienHiep={owns,scenes,setEnabled:on=>{disabled=!on;},validate,walkable,mask,paintTerrain:(ctx,id,view)=>paintTerrain(ctx,prepare(scenes[id]),view||[0,0,2000,2000]),reset:()=>{chunks.clear();masks.clear();overviewScene='';}};
})();
