/* Hình thái trang bị (graphics pass): the character visibly changes with the gear worn.
   - Vũ khí: every tier has its own form. The class artwork is re-forged per tier (wood,
     black iron, spirit steel, violet immortal, golden divine) and dressed with code-drawn
     parts: tassels, guard gems, halos, orbiting sparks, and per-weapon spirit effects
     (petals, stars, frost, blood mist, wind, dark flame, clouds, phoenix feathers).
   - Đạo bào: higher robes add a silhouette behind the body: waist sashes (Hiếm), a
     floating celestial ribbon (Cực hiếm), a back halo (Siêu phẩm), a turning rune halo
     with rising gold motes (Thần phẩm).
   All art is original and drawn here; presentation only. */
(function(){
 'use strict';
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const clock=()=>reduced.matches?0:(typeof tm==='number'?tm:performance.now()/1000);
 const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};

 // ------------------------------------------------------------------ weapon forms
 // recolor: canvas blend passes over the class art (no pixel readback, works from file://).
 const FORMS={
  moc:{name:'Mộc',map:['#2a1608','#8a5228','#f0d098'],recolor:[['saturation','#808080',1],['color','#a26a35',.9],['multiply','#d9b98c',.55]],scale:.94,tassel:null},
  thiet:{name:'Huyền Thiết',map:['#0c1016','#4c5866','#e2eaf2'],recolor:[['saturation','#808080',1],['multiply','#9fb0c2',.7],['soft-light','#ffffff',.25]],scale:.98,tassel:'#c8323c',glint:'#e8f2ff'},
  linh:{name:'Linh Quang',recolor:null,scale:1.02,tassel:'#3fa6ff',glow:'#7fd4ff',motes:'#c8f2ff',glint:'#ffffff'},
  tien:{name:'Tiên',map:['#1a0632','#7a44e0','#f6ecff'],recolor:[['color','#8f5bff',.82],['soft-light','#ffe1a0',.25]],scale:1.07,tassel:'#a774ff',tassel2:'#ffd77a',glow:'#c49bff',gem:'#ffe39a',motes:'#eadcff',glint:'#fff4d8'},
  than:{name:'Thần',map:['#3a1c00','#e09a20','#fffae6'],recolor:[['color','#ffb52e',.78],['soft-light','#fff1c0',.35]],scale:1.12,tassel:'#ff4d4d',tassel2:'#ffd77a',glow:'#ffd36b',gem:'#ff3d6a',halo:'#ffe7a8',orbit:'#fff1c4',glint:'#ffffff'},
  // New divine weapons (Thần Binh), one look each.
  'phi-hong':{name:'Phi Hồng',map:['#3a0820','#e0508a','#fff2f8'],recolor:[['color','#ff6fa8',.75],['soft-light','#ffffff',.35]],scale:1.1,tassel:'#ff8fbf',tassel2:'#ffffff',glow:'#ff9cc8',gem:'#ffffff',fx:'petals',glint:'#ffffff'},
  'tinh-ha':{name:'Tinh Hà',map:['#03061e','#2a46d8','#e4ecff'],recolor:[['color','#3f5cff',.85],['multiply','#7c8dff',.45]],scale:1.15,tassel:'#8fb0ff',tassel2:'#e6eeff',glow:'#7fa0ff',gem:'#eaf2ff',halo:'#a9c0ff',orbit:'#ffffff',fx:'stars',glint:'#ffffff'},
  'bang-phach':{name:'Băng Phách',map:['#0a2a40','#58c8f0','#ffffff'],recolor:[['color','#9fe6ff',.7],['screen','#203848',.35]],scale:1.1,tassel:'#d9f6ff',glow:'#aef0ff',gem:'#ffffff',fx:'ice',glint:'#ffffff'},
  'huyet-nguyet':{name:'Huyết Nguyệt',map:['#200004','#c0102a','#ffdccc'],recolor:[['color','#e0142f',.85],['multiply','#ff9a8a',.35]],scale:1.15,tassel:'#ff2a3d',tassel2:'#ffd2a0',glow:'#ff4a5a',gem:'#ffd27a',halo:'#ff6a6a',fx:'mist',glint:'#ffe0d0'},
  'phong-loi':{name:'Phong Lôi',map:['#062a26','#20b898','#fff8c8'],recolor:[['color','#25d6b4',.7],['soft-light','#fff2a8',.4]],scale:1.1,tassel:'#ffd75a',glow:'#5ff0d0',gem:'#fff2a8',fx:'wind',glint:'#ffffff'},
  'hac-long':{name:'Hắc Long',map:['#050208','#4a2280','#ffdc98'],recolor:[['saturation','#808080',.7],['multiply','#3b2a55',.85],['soft-light','#ffcf6a',.3]],scale:1.16,tassel:'#ffcf5a',tassel2:'#8a3dff',glow:'#9a5cff',gem:'#ffcf5a',halo:'#c08cff',orbit:'#ffd77a',fx:'darkflame',glint:'#ffe7a8'},
  'thanh-van':{name:'Thanh Vân',map:['#06301e','#36b878','#f6fff9'],recolor:[['color','#3fcf8f',.65],['soft-light','#ffffff',.4]],scale:1.1,tassel:'#5fe0a8',tassel2:'#ffffff',glow:'#8affcf',gem:'#ffffff',fx:'cloud',glint:'#ffffff'},
  'phuong-vu':{name:'Phượng Vũ',map:['#300800','#ff5a10','#fff4c0'],recolor:[['color','#ff6a1a',.8],['soft-light','#ffe08a',.45]],scale:1.15,tassel:'#ffcf3a',tassel2:'#ff3a2a',glow:'#ffa040',gem:'#fff2b0',halo:'#ffb85a',orbit:'#fff0c0',fx:'feathers',glint:'#fffbe0'}
 };
 const TIER_FORM={pham:'moc',huyen:'thiet',linh:'linh',tien:'tien',than:'than'};
 // Anchor points on each class artwork (u,v in 0..1 of the image box).
 const ANCHORS=[
  {guard:[.5,.27],tip:[.5,.97],top:[.5,.04],tassel:[.62,.29],core:[.5,.62]},
  {guard:[.36,.58],tip:[.96,.62],top:[.64,.05],tassel:[.42,.72],core:[.3,.55]},
  {guard:[.5,.27],tip:[.5,.02],top:[.5,.02],tassel:[.5,.31],core:[.5,.18]},
  {guard:[.5,.46],tip:[.5,.05],top:[.5,.05],tassel:[.5,.9],core:[.5,.46]}
 ];
 function templateOf(ap,slot,key){
  if(!ap)return null;const item=ap===P.ap?P.world?.equip?.[slot]:null;
  const id=item?.id??ap[key];if(!id)return null;return window.equipmentData?.byId?.get(id)||item||null;
 }
 function formOf(ap){
  if(typeof ap==='string')return FORMS[ap]?{key:ap,...FORMS[ap]}:null;
  if(ap===P.ap&&!P.world?.equip?.vukhi)return null;
  const t=templateOf(ap,'vukhi','weaponId');
  const key=t?.form||TIER_FORM[t?.rarity||(ap!==P.ap&&ap?.weaponRarity)||'linh']||'linh';
  return {key,...(FORMS[key]||FORMS.linh)};
 }
 const forged=new Map();
 function reforge(img,cls,key){
  const id=cls+':'+key;if(forged.has(id))return forged.get(id);
  if(!img||!img.complete||!img.naturalWidth)return null;
  const f=FORMS[key];const H=320,W=Math.round(H*img.naturalWidth/img.naturalHeight);
  const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,0,0,W,H);
  let mapped=false;
  if(f.map)try{const d=x.getImageData(0,0,W,H),p=d.data,stops=f.map.map(hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)));
   for(let i=0;i<p.length;i+=4){if(!p[i+3])continue;const l=Math.pow((p[i]*.3+p[i+1]*.59+p[i+2]*.11)/255,1.25),a=l<.5?stops[0]:stops[1],b=l<.5?stops[1]:stops[2],k=l<.5?l*2:(l-.5)*2;
    for(let c=0;c<3;c++)p[i+c]=p[i+c]*.1+(a[c]+(b[c]-a[c])*k)*.9;}
   x.putImageData(d,0,0);mapped=true;}catch{}
  if(!mapped){for(const [op,color,alpha] of f.recolor||[]){x.save();x.globalCompositeOperation=op;x.globalAlpha=alpha;x.fillStyle=color;x.fillRect(0,0,W,H);x.restore();}
   if(f.recolor){x.globalCompositeOperation='destination-in';x.drawImage(img,0,0,W,H);}}
  // A tinted silhouette for the bloom pass.
  let mask=null;if(f.glow){mask=document.createElement('canvas');mask.width=W;mask.height=H;const m=mask.getContext('2d');m.drawImage(img,0,0,W,H);m.globalCompositeOperation='source-in';m.fillStyle=f.glow;m.fillRect(0,0,W,H);}
  const out={canvas:c,mask,W,H};forged.set(id,out);return out;
 }
 // ---- ornaments (local weapon units: art spans y -18..18, x centred)
 function glowDot(ctx,x,y,r,color,a){if(a<=0)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=a;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,2*r,2*r);ctx.restore();}
 function star4(ctx,x,y,r,color,a,rot=0){if(a<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=a;ctx.fillStyle=color;
  ctx.beginPath();for(let i=0;i<8;i++){const rr=i%2?r*.22:r,an=i*Math.PI/4;ctx.lineTo(Math.cos(an)*rr,Math.sin(an)*rr);}ctx.closePath();ctx.fill();ctx.restore();glowDot(ctx,x,y,r*1.4,color,a*.5);}
 function tassel(ctx,x,y,color,len,t,phase=0,accent){
  const sway=Math.sin(t*2.4+phase)*.35,ex=x+Math.sin(sway)*len,ey=y+Math.cos(sway)*len;
  ctx.save();ctx.lineCap='round';ctx.strokeStyle='rgba(30,10,10,.55)';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+sway*2,y+len*.5,ex,ey-len*.38);ctx.stroke();
  ctx.strokeStyle=accent||color;ctx.lineWidth=.55;ctx.stroke();
  // knot bead
  const kx=x+Math.sin(sway)*len*.62,ky=y+Math.cos(sway)*len*.62;ctx.fillStyle=accent||'#ffd77a';ctx.beginPath();ctx.arc(kx,ky,.95,0,TAU);ctx.fill();ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(kx-.3,ky-.3,.32,0,TAU);ctx.fill();
  // fringe
  for(let i=-2;i<=2;i++){const fx=kx+i*.38,fs=Math.sin(t*3.1+phase+i)*.6;const g=ctx.createLinearGradient(fx,ky,fx,ky+len*.62);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.strokeStyle=g;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(fx,ky+.6);ctx.quadraticCurveTo(fx+fs,ky+len*.3,fx+fs*1.6+sway*3,ky+len*.62);ctx.stroke();}
  ctx.restore();
 }
 function gem(ctx,x,y,r,color,t){ctx.save();ctx.translate(x,y);glowDot(ctx,0,0,r*3.2,color,.55+.25*Math.sin(t*3));
  ctx.fillStyle='#3a2a10';ctx.beginPath();ctx.moveTo(0,-r*1.35);ctx.lineTo(r*1.05,0);ctx.lineTo(0,r*1.35);ctx.lineTo(-r*1.05,0);ctx.closePath();ctx.fill();
  const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,'#ffffff');g.addColorStop(.35,color);g.addColorStop(1,'#2a1030');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.75,0);ctx.lineTo(0,r);ctx.lineTo(-r*.75,0);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.moveTo(0,-r*.8);ctx.lineTo(r*.28,-r*.1);ctx.lineTo(-r*.2,-r*.15);ctx.closePath();ctx.fill();ctx.restore();}
 function halo(ctx,x,y,r,color,t){ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,0,r*.2,0,0,r*1.25);g.addColorStop(0,color+'55');g.addColorStop(.7,color+'22');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r*1.25,0,TAU);ctx.fill();
  ctx.strokeStyle=color;ctx.globalAlpha=.7;ctx.lineWidth=.6;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();ctx.globalAlpha=.45;ctx.lineWidth=.35;ctx.beginPath();ctx.arc(0,0,r*.78,0,TAU);ctx.stroke();
  ctx.rotate(t*.6);ctx.globalAlpha=.85;for(let i=0;i<12;i++){ctx.rotate(TAU/12);ctx.fillRect(r*.82,-.18,r*.14,.36);}ctx.restore();}
 function orbit(ctx,x,y,r,color,t,n,front){for(let i=0;i<n;i++){const a=t*1.3+i*TAU/n,s=Math.sin(a);if((s>0)!==front)continue;const px=x+Math.cos(a)*r,py=y+s*r*.32;star4(ctx,px,py,1.2+.5*(s+1)*.5,color,.55+.45*(s+1)*.5,a);}}
 const FX={
  petals(ctx,p,t,f){for(let i=0;i<7;i++){const l=(t*.32+i*.143)%1,x=p.core[0]+(hash(i)-.5)*10+Math.sin(t*1.7+i)*3,y=p.top[1]+l*34;ctx.save();ctx.translate(x,y);ctx.rotate(t*2+i);ctx.globalAlpha=Math.sin(l*Math.PI)*.9;
   const g=ctx.createLinearGradient(-1.6,0,1.6,0);g.addColorStop(0,'#ffd0e4');g.addColorStop(1,'#ff6fa8');ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,1.7,.9,0,0,TAU);ctx.fill();ctx.restore();}},
  stars(ctx,p,t,f){for(let i=0;i<9;i++){const tw=.5+.5*Math.sin(t*3+i*1.7),x=p.core[0]+(hash(i+3)-.5)*14,y=-16+hash(i+9)*32;star4(ctx,x,y,.7+tw*1.1,i%3?'#ffffff':'#bcd0ff',tw*.9,i);}
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(190,210,255,.45)';ctx.lineWidth=.25;ctx.beginPath();for(let i=0;i<5;i++){const x=p.core[0]+(hash(i+3)-.5)*14,y=-16+hash(i+9)*32;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.restore();},
  ice(ctx,p,t,f){for(let i=0;i<6;i++){const a=t*.8+i*TAU/6,r=7+Math.sin(t+i)*1.5,x=p.core[0]+Math.cos(a)*r,y=p.core[1]+Math.sin(a)*r*.5-3;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.globalAlpha=.75+.25*Math.sin(a);
   const g=ctx.createLinearGradient(0,-2.4,0,2.4);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#7fd8ff');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-2.6);ctx.lineTo(.9,0);ctx.lineTo(0,2.6);ctx.lineTo(-.9,0);ctx.closePath();ctx.fill();ctx.restore();}},
  mist(ctx,p,t,f){for(let i=0;i<6;i++){const l=(t*.25+i/6)%1,x=p.core[0]+Math.sin(t+i*2)*5,y=p.tip[1]-l*30;glowDot(ctx,x,y,4+l*5,'#ff2a3d',Math.sin(l*Math.PI)*.35);}},
  wind(ctx,p,t,f){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';for(let i=0;i<3;i++){const l=(t*.7+i/3)%1,y=16-l*34,r=5+l*2;ctx.globalAlpha=Math.sin(l*Math.PI)*.8;ctx.strokeStyle=i%2?'#bffff0':'#fff2a8';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(p.core[0],y,r,r*.32,0,t*4+i,t*4+i+4.2);ctx.stroke();}ctx.restore();
   if(Math.sin(t*9)>.6){ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='#fffbd0';ctx.lineWidth=.45;const x0=p.tip[0],y0=p.tip[1];ctx.beginPath();ctx.moveTo(x0,y0);for(let k=1;k<5;k++)ctx.lineTo(x0+(hash(k+Math.floor(t*9))-.5)*6,y0+k*2.5*(y0<0?1:-1));ctx.stroke();ctx.restore();}},
  darkflame(ctx,p,t,f){for(let i=0;i<9;i++){const l=(t*.55+i*.111)%1,side=i%2?1:-1,x=p.core[0]+side*(3+hash(i)*4)+Math.sin(t*3+i)*1.2,y=14-hash(i+4)*28-l*7;ctx.save();ctx.translate(x,y);ctx.scale(1,1.9);
   const g=ctx.createRadialGradient(0,0,0,0,0,2.4);g.addColorStop(0,'#ffd77a');g.addColorStop(.35,'#9a3dff');g.addColorStop(1,'rgba(40,0,60,0)');ctx.globalAlpha=Math.sin(l*Math.PI)*.8;ctx.fillStyle=g;ctx.fillRect(-2.4,-2.4,4.8,4.8);ctx.restore();}},
  cloud(ctx,p,t,f){for(let i=0;i<4;i++){const a=t*.9+i*TAU/4,x=p.core[0]+Math.cos(a)*9,y=p.core[1]+Math.sin(a)*3.2;const front=Math.sin(a)>0;ctx.save();ctx.globalAlpha=front?.85:.5;ctx.fillStyle='#f2fffa';
   for(const [dx,dy,r] of [[-1.6,0,1.5],[0,-.8,1.9],[1.7,0,1.4]]){ctx.beginPath();ctx.arc(x+dx,y+dy,r,0,TAU);ctx.fill();}ctx.strokeStyle='#5fe0a8';ctx.lineWidth=.3;ctx.beginPath();ctx.arc(x,y-.8,1.9,Math.PI*1.1,Math.PI*1.9);ctx.stroke();ctx.restore();}},
  feathers(ctx,p,t,f){for(let i=0;i<6;i++){const l=(t*.38+i/6)%1,x=p.core[0]+(hash(i+1)-.5)*12+Math.sin(t*2+i)*2,y=12-l*36;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*2+i)*.6);ctx.globalAlpha=Math.sin(l*Math.PI);
   const g=ctx.createLinearGradient(0,-3,0,3);g.addColorStop(0,'#fff2b0');g.addColorStop(.5,'#ff8a2a');g.addColorStop(1,'#d0201a');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-3.2);ctx.quadraticCurveTo(1.5,0,0,3.2);ctx.quadraticCurveTo(-1.5,0,0,-3.2);ctx.fill();
   ctx.strokeStyle='#ffe9b0';ctx.lineWidth=.2;ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(0,3);ctx.stroke();ctx.restore();}}
 };
 function pts(cls,W){const a=ANCHORS[cls]||ANCHORS[0],k=36/320,w=W*k,o={};for(const n in a)o[n]=[(a[n][0]-.5)*w,-18+a[n][1]*36];return o;}
 // Draws the weapon in the current (already transformed) weapon space. Returns false if not drawn.
 function drawWeapon(ctx,cls,ap,img,attacking,t=clock()){
  const form=formOf(ap)||{key:'linh',...FORMS.linh},art=reforge(img,cls,form.key);if(!art)return false;
  const k=36/320,w=art.W*k,p=pts(cls,art.W),power=attacking?1.25:1;
  if(form.halo)halo(ctx,p.core[0],p.core[1],9.5,form.halo,t);
  if(form.orbit)orbit(ctx,p.core[0],p.core[1],10,form.orbit,t,5,false);
  if(art.mask){ctx.save();ctx.globalCompositeOperation='lighter';for(const [b,a] of [[7,.28],[2.5,.35]]){ctx.shadowColor=form.glow;ctx.shadowBlur=b*(ctx.getTransform?.().a||1);ctx.globalAlpha=a*power*(.85+.15*Math.sin(t*2.6));ctx.drawImage(art.mask,-w/2,-18,w,36);}ctx.restore();}
  ctx.drawImage(art.canvas,-w/2,-18,w,36);
  if(form.key==='moc'){ctx.save();ctx.globalAlpha=.25;ctx.strokeStyle='#4a2a10';ctx.lineWidth=.25;for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(p.core[0]-.8+i*.5,-12);ctx.quadraticCurveTo(p.core[0]+Math.sin(i)*1.2,0,p.core[0]-.6+i*.45,14);ctx.stroke();}ctx.restore();}
  if(form.tassel)tassel(ctx,p.tassel[0],p.tassel[1],form.tassel,form.key==='thiet'?6:8,t,cls,form.tassel2);
  if(form.tassel2)tassel(ctx,p.tassel[0]-1.2,p.tassel[1]+.5,form.tassel2,6,t,cls+2,form.tassel);
  if(form.gem)gem(ctx,p.guard[0],p.guard[1],1.5,form.gem,t);
  if(form.fx)FX[form.fx]?.(ctx,p,t,form);
  else if(form.motes)for(let i=0;i<5;i++){const l=(t*.4+i*.2)%1;glowDot(ctx,p.core[0]+Math.sin(t*2+i*1.3)*4,14-l*30,1.6,form.motes,Math.sin(l*Math.PI)*.8);}
  if(form.orbit)orbit(ctx,p.core[0],p.core[1],10,form.orbit,t,5,true);
  if(form.glint){const g=(t*.35+cls*.2)%1;if(g<.25)star4(ctx,p.tip[0],p.tip[1],2.6+g*6,form.glint,Math.sin(g/.25*Math.PI),g*3);}
  return true;
 }
 const weaponScale=ap=>formOf(ap)?.scale||1;

 // ------------------------------------------------------------------ robe forms
 const ROBE_TIER={pham:0,huyen:1,linh:2,tien:3,than:4};
 const CLASS_TONE=['#5fb4ff','#5fe0c8','#a77aff','#f3c76b'];
 function robeOf(ap){const t=templateOf(ap,'daobao','robeId');if(!t)return null;const style=window.equipmentRules?.outfitStyles?.find(s=>s.id===t.outfitStyle);
  return{tier:ROBE_TIER[t.rarity]??0,tone:style?.color||CLASS_TONE[ap.w|0]||'#7fd4ff'};}
 function ribbonPath(pts,widths){const L=[],R=[];for(let i=0;i<pts.length;i++){const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,nx=-dy/d,ny=dx/d,w=widths[i];L.push({x:pts[i].x+nx*w,y:pts[i].y+ny*w});R.push({x:pts[i].x-nx*w,y:pts[i].y-ny*w});}return{L,R};}
 function fillRibbon(ctx,pts,width,colorA,colorB,edge,alpha){const ws=pts.map((_,i)=>width*(.35+.65*Math.sin((i+.5)/pts.length*Math.PI))*(1-.45*i/pts.length));const {L,R}=ribbonPath(pts,ws);
  ctx.save();ctx.globalAlpha*=alpha;const g=ctx.createLinearGradient(pts[0].x,pts[0].y,pts.at(-1).x,pts.at(-1).y);g.addColorStop(0,colorA);g.addColorStop(.55,colorB);g.addColorStop(1,colorA+'00');ctx.fillStyle=g;
  ctx.beginPath();L.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));for(let i=R.length-1;i>=0;i--)ctx.lineTo(R[i].x,R[i].y);ctx.closePath();ctx.fill();
  if(edge){ctx.strokeStyle=edge;ctx.lineWidth=.55;ctx.globalAlpha*=.85;ctx.beginPath();L.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}ctx.restore();}
 function streamer(fit,sx,sy,dirx,len,t,phase,lift){const pts=[],n=14,run=fit.moving?1.6:1;for(let i=0;i<n;i++){const s=i/(n-1),wave=Math.sin(t*3.2*run-s*5+phase)*s*4.5;pts.push({x:sx+dirx*s*len*(.75+.25*run)+wave*.4,y:sy+s*len*.55*(1-lift)-lift*Math.sin(s*Math.PI)*8+wave});}return pts;}
 function drawRobe(ctx,ap,fit,front,t=clock()){const r=robeOf(ap);if(!r||!r.tier||!fit)return;const {cx,top,H,W,dir,facing}=fit;const side=dir===2?facing:0,back=side?-side:0;
  if(!front){
   // Hiếm+: waist sash tails
   const waistY=top+H*.8,col=r.tier>=4?'#ffd77a':r.tone,edge=r.tier>=3?'#ffe7a8':'#ffffff';
   for(const s of side?[back]:[-1,1]){const p=streamer(fit,cx+s*W*.18+(side?back*W*.2:0),waistY,side?back:s*.55,H*.42,t,s,0);fillRibbon(ctx,p,1.8,col,r.tier>=3?'#ffffff':col,edge,.95);}
   // Cực hiếm+: celestial ribbon (phi bạch) arcing behind the shoulders
   if(r.tier>=2){const sh=top+H*.5,n=22,pts=[];const amp=fit.moving?1.4:1;
    for(let i=0;i<n;i++){const s=i/(n-1),a=Math.PI*(1-s),wave=Math.sin(t*2.4-s*7)*1.6;
     let x=cx+Math.cos(a)*W*1.05+(side?back*W*.35*Math.sin(a):0),y=sh-Math.sin(a)*H*.28+wave;
     if(s<.2||s>.8){const e=s<.2?(.2-s)/.2:(s-.8)/.2;y+=e*H*.42;x+=(s<.2?-1:1)*e*W*.35*amp+(side?back*e*W*.6*amp:0);}
     pts.push({x,y});}
    const col=r.tier>=4?'#ffcf5a':r.tone;fillRibbon(ctx,pts,2.4,col,r.tier>=3?'#fff4dc':'#e8fbff',r.tier>=3?'#c8901a':'#ffffff',.95);}
   // Siêu phẩm+: back halo
   if(r.tier>=3&&dir!==1){const hx=cx-(side?side*W*.12:0),hy=top+H*.27,R=W*.68;ctx.save();ctx.globalCompositeOperation='lighter';
    const g=ctx.createRadialGradient(hx,hy,R*.3,hx,hy,R*1.35);const c=r.tier>=4?'#ffd36b':r.tone;g.addColorStop(0,c+'40');g.addColorStop(.75,c+'1a');g.addColorStop(1,c+'00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(hx,hy,R*1.35,0,TAU);ctx.fill();
    ctx.globalCompositeOperation='source-over';ctx.strokeStyle='rgba(60,36,8,.45)';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(hx,hy,R,0,TAU);ctx.stroke();ctx.strokeStyle=c;ctx.globalAlpha=.95;ctx.lineWidth=1;ctx.stroke();ctx.strokeStyle='#ffffff';ctx.globalAlpha=.7;ctx.lineWidth=.35;ctx.stroke();ctx.globalAlpha=1;
    if(r.tier>=4){ctx.translate(hx,hy);ctx.rotate(t*.35);ctx.fillStyle='#ffd36b';for(let i=0;i<16;i++){ctx.rotate(TAU/16);ctx.globalAlpha=i%4?.6:1;ctx.fillRect(R*.84,-.35,i%4?R*.1:R*.2,.7);}ctx.rotate(-t*.7);ctx.strokeStyle='#ffe39a';ctx.globalAlpha=.6;ctx.lineWidth=.5;ctx.beginPath();ctx.arc(0,0,R*.7,0,TAU);ctx.stroke();
     for(let i=0;i<4;i++){const a=i*TAU/4;star4(ctx,Math.cos(a)*R,Math.sin(a)*R,2.2,'#ffffff',.9,a);}}
    ctx.restore();}
  }else if(r.tier>=4){
   // Thần phẩm: gold motes rising around the body
   for(let i=0;i<8;i++){const l=(t*.32+i/8)%1,a=i*2.39+t*.5,x=cx+Math.cos(a)*W*.8,y=fit.feetY-2-l*H*1.05;if(Math.sin(a)<0)continue;glowDot(ctx,x,y,2.2,'#ffd36b',Math.sin(l*Math.PI)*.9);ctx.save();ctx.globalAlpha=Math.sin(l*Math.PI);ctx.fillStyle='#fff6d8';ctx.beginPath();ctx.arc(x,y,.6,0,TAU);ctx.fill();ctx.restore();}
  }
 }

 // Arm shield: the painted shield with a quality rim glow.
 function drawShield(ctx,item,variant,img,dir,facing,at,H,t=clock()){const size=H*(dir===2?.42:.46),q=ROBE_TIER[window.equipmentData?.byId?.get(item?.id)?.rarity||item?.rarity]??1;
  ctx.save();ctx.translate(at.x,at.y);ctx.rotate(Math.sin(t*1.6)*.03);ctx.scale(dir===2?.62:1,1);if(dir===2&&facing>0)ctx.scale(-1,1);
  const tone=['#d4cbb6','#70df9c','#6fc8ff','#cf9cff','#ffcc70'][q];
  if(q>=2)glowDot(ctx,0,0,size*.85,tone,.22+.08*q+.08*Math.sin(t*2.2));
  if(!img?.complete||!img.naturalWidth){ctx.restore();return;}ctx.drawImage(img,-size/2,-size/2,size,size);
  if(q>=3){const g=(t*.3+variant*.17)%1;if(g<.3)star4(ctx,size*.28,-size*.3,size*.12*(1+g*2),'#ffffff',Math.sin(g/.3*Math.PI),g*2);}
  ctx.restore();}

 window.gearForms={FORMS,TIER_FORM,formOf,drawWeapon,weaponScale,drawRobe,robeOf,drawShield};
})();
