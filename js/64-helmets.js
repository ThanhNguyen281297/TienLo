/* Mũ (helmet slot). No sprite sheet: each class headgear is painted with canvas
   paths on the measured chibi head, so it sits correctly in every direction.
   Kiếm Tông: hair bun + crown and pin · Minh Nguyệt: nón lá · Lôi Thương: war
   helm with plume · Thiên Cơ: Taoist cap with ribbons. The colour follows the robe
   being worn (class colour or the outfit style); higher qualities add gold, gems
   and a faint glow. */
(function(){
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 // Robe colours of the four class outfits (what the "Tông môn" style looks like).
 const CLASS_TONE=['#3f7fd0','#2fae9a','#7a4fc9','#dfe3ea'];
 const styles=new Map((equipmentRules.outfitStyles||[]).map(s=>[s.id,s.color]));
 const GOLD=['#9c7a4a','#c9a15a','#e7c36c','#ffd877'];
 function item(ap){if(ap===P.ap)return P.world?.equip?.mu||null;return ap?.helmetId?equipmentData.byId.get(ap.helmetId):null;}
 function tone(ap,cls){const style=window.characterWardrobe?.styleOf?.(ap)||'class';return styles.get(style)||CLASS_TONE[cls]||'#888';}
 function shade(hex,k){const n=parseInt(hex.slice(1),16),c=[n>>16&255,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(k>1?v+(255-v)*(k-1):v*k))));return 'rgb('+c.join(',')+')';}
 function ribbon(ctx,x,y,len,width,color,side,t,phase){
  const sway=reduced.matches?0:Math.sin(t*2.2+phase)*.18;ctx.save();ctx.translate(x,y);ctx.rotate(side*.35+sway);
  const g=ctx.createLinearGradient(0,0,0,len);g.addColorStop(0,color);g.addColorStop(1,shade(color,.55));ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(-width/2,0);ctx.quadraticCurveTo(-width*.2+side*2,len*.5,side*width*.6,len);ctx.lineTo(side*width*.6+width*.9,len*.94);ctx.quadraticCurveTo(width*.2+side*2,len*.45,width/2,0);ctx.closePath();ctx.fill();ctx.restore();}
 function gem(ctx,x,y,r,color,glow){ctx.save();if(glow){ctx.shadowColor=color;ctx.shadowBlur=r*3;}const g=ctx.createRadialGradient(x-r*.3,y-r*.3,0,x,y,r);g.addColorStop(0,'#fff');g.addColorStop(.35,color);g.addColorStop(1,shade(color,.45));ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.restore();}

 // Kiếm Tông: topknot with a small crown (phát quan) and a long pin.
 function bun(ctx,h,c,tier,t){const {x,y,r,side,back}=h,bx=x-side*r*.32,by=y-r*.78;
  if(back||side)for(const s of side?[-side]:[-1,1])ribbon(ctx,bx+s*r*.12,by+r*.18,r*1.25,r*.2,c,s,t,s);
  const hair=ctx.createRadialGradient(bx-r*.12,by-r*.18,0,bx,by,r*.46);hair.addColorStop(0,'#4a4250');hair.addColorStop(1,'#141019');
  ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(bx,by,r*.4,r*.34,0,0,TAU);ctx.fill();
  if(tier>0){const cw=r*.48,ch=r*.34;const g=ctx.createLinearGradient(0,by-ch,0,by+ch*.4);g.addColorStop(0,shade(c,1.35));g.addColorStop(1,shade(c,.7));ctx.fillStyle=g;
   ctx.beginPath();ctx.moveTo(bx-cw/2,by+ch*.35);ctx.lineTo(bx-cw*.38,by-ch*.6);ctx.quadraticCurveTo(bx,by-ch*1.25,bx+cw*.38,by-ch*.6);ctx.lineTo(bx+cw/2,by+ch*.35);ctx.closePath();ctx.fill();
   ctx.strokeStyle=GOLD[tier];ctx.lineWidth=Math.max(.6,r*.06);ctx.stroke();}
  // Pin through the bun.
  ctx.strokeStyle=tier?GOLD[tier]:'#8a6438';ctx.lineWidth=Math.max(.7,r*.07);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(bx-r*.62,by+r*.05);ctx.lineTo(bx+r*.62,by-r*.08);ctx.stroke();
  gem(ctx,bx+r*.64,by-r*.08,r*.09,tier>1?c:GOLD[tier],tier>2);
  if(tier>=3)gem(ctx,bx,by-r*.34,r*.1,'#ffffff',true);}
 // Minh Nguyệt: conical leaf hat with a coloured band.
 function hat(ctx,h,c,tier,t){const {x,y,r}=h,base=y-r*.62,apex=y-r*1.62,w=r*1.42;
  const g=ctx.createLinearGradient(x-w,0,x+w,0);g.addColorStop(0,'#a88f55');g.addColorStop(.45,'#f0dfa6');g.addColorStop(1,'#9a8148');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-w,base);ctx.quadraticCurveTo(x-w*.35,apex+r*.42,x,apex);ctx.quadraticCurveTo(x+w*.35,apex+r*.42,x+w,base);ctx.ellipse(x,base,w,r*.2,0,0,Math.PI);ctx.closePath();ctx.fill();
  // Rib lines of the woven leaves.
  ctx.strokeStyle='#7d6a3c88';ctx.lineWidth=Math.max(.4,r*.035);for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(x,apex+r*.05);ctx.lineTo(x+i*w*.27,base+r*.12);ctx.stroke();}
  ctx.strokeStyle=c;ctx.lineWidth=Math.max(.8,r*.13);ctx.beginPath();ctx.ellipse(x,base-r*.1,w*.62,r*.14,0,.08*Math.PI,.92*Math.PI);ctx.stroke();
  if(tier){ctx.strokeStyle=GOLD[tier];ctx.lineWidth=Math.max(.5,r*.05);ctx.beginPath();ctx.ellipse(x,base,w,r*.2,0,0,Math.PI);ctx.stroke();}
  if(tier>=2){ctx.save();ctx.fillStyle=tier>2?'#fff6cf':shade(c,1.4);ctx.shadowColor=c;ctx.shadowBlur=tier>2?r*.6:0;ctx.beginPath();ctx.arc(x,apex+r*.55,r*.17,.7,TAU-.7);ctx.arc(x+r*.08,apex+r*.52,r*.13,TAU-.9,.9,true);ctx.fill();ctx.restore();}
  if(tier>=3)for(const s of[-1,1])ribbon(ctx,x+s*w*.62,base,r*.9,r*.14,c,s,t,s*2);}
 // Lôi Thương: steel dome with a coloured brow band and a plume.
 function helm(ctx,h,c,tier,t){const {x,y,r,side}=h,brow=y-r*.18;
  const sway=reduced.matches?0:Math.sin(t*2.6)*.12,px=x-side*r*.15,py=y-r*1.12;
  ctx.save();ctx.translate(px,py);ctx.rotate(-side*.5+sway);const pg=ctx.createLinearGradient(0,0,0,-r*.9);pg.addColorStop(0,c);pg.addColorStop(1,shade(c,1.5));ctx.fillStyle=pg;
  ctx.beginPath();ctx.moveTo(-r*.08,0);ctx.quadraticCurveTo(-r*.42,-r*.5,-side*r*.18-r*.05,-r*.95);ctx.quadraticCurveTo(r*.3,-r*.5,r*.08,0);ctx.fill();ctx.restore();
  const g=ctx.createLinearGradient(0,y-r*1.15,0,brow);g.addColorStop(0,tier>2?'#f3ecd8':'#c9d2da');g.addColorStop(.55,tier>2?'#b9a46b':'#7f8c98');g.addColorStop(1,'#3e4752');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x-r*1.02,brow);ctx.bezierCurveTo(x-r*1.05,y-r*1.25,x+r*1.05,y-r*1.25,x+r*1.02,brow);ctx.closePath();ctx.fill();
  ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x-r*1.04,brow+r*.02);ctx.quadraticCurveTo(x,brow-r*.26,x+r*1.04,brow+r*.02);ctx.lineTo(x+r*1.02,brow-r*.14);ctx.quadraticCurveTo(x,brow-r*.42,x-r*1.02,brow-r*.14);ctx.closePath();ctx.fill();
  ctx.strokeStyle=GOLD[tier];ctx.lineWidth=Math.max(.5,r*.05);ctx.stroke();
  // Crest spike and (from the front) a brow point.
  ctx.fillStyle=GOLD[Math.max(1,tier)];ctx.beginPath();ctx.moveTo(px-r*.1,py+r*.06);ctx.lineTo(px,py-r*.18);ctx.lineTo(px+r*.1,py+r*.06);ctx.fill();
  if(!h.back){const fx=x+side*r*.55;ctx.fillStyle=GOLD[Math.max(1,tier)];ctx.beginPath();ctx.moveTo(fx-r*.13,brow-r*.2);ctx.lineTo(fx,brow+r*.08);ctx.lineTo(fx+r*.13,brow-r*.2);ctx.fill();if(tier>=2)gem(ctx,fx,brow-r*.2,r*.08,c,tier>2);}}
 // Thiên Cơ: lotus crown (liên hoa quan) on a band, jade pin and two long ribbons.
 function cap(ctx,h,c,tier,t){const {x,y,r,side,back}=h,cx=x-side*r*.12,band=y-r*.74,w=r*.6;
  if(back||side)for(const s of side?[-side]:[-1,1])ribbon(ctx,cx+s*w*.5,band,r*1.5,r*.16,c,s,t,s*1.5);
  const petal=(px,height,width,lean)=>{ctx.save();ctx.translate(px,band);ctx.rotate(lean);const g=ctx.createLinearGradient(0,-height,0,0);g.addColorStop(0,shade(c,1.45));g.addColorStop(1,shade(c,.62));ctx.fillStyle=g;
   ctx.beginPath();ctx.moveTo(-width/2,0);ctx.quadraticCurveTo(-width*.62,-height*.6,0,-height);ctx.quadraticCurveTo(width*.62,-height*.6,width/2,0);ctx.closePath();ctx.fill();ctx.strokeStyle=GOLD[tier];ctx.lineWidth=Math.max(.45,r*.045);ctx.stroke();
   ctx.strokeStyle=shade(c,.5);ctx.lineWidth=Math.max(.3,r*.025);ctx.beginPath();ctx.moveTo(0,-height*.15);ctx.lineTo(0,-height*.8);ctx.stroke();ctx.restore();};
  const n=tier>=2?5:3;for(let i=0;i<n;i++){const k=n===1?0:i/(n-1)*2-1,depth=1-Math.abs(k);petal(cx+k*w*.62,r*(.42+.22*depth),r*(.34+.06*depth),k*.38);}
  // Band with a jade pin through it.
  const g=ctx.createLinearGradient(0,band-r*.12,0,band+r*.1);g.addColorStop(0,GOLD[tier]);g.addColorStop(1,shade(GOLD[tier],.6));ctx.fillStyle=g;
  ctx.beginPath();ctx.ellipse(cx,band,w*.95,r*.13,0,0,TAU);ctx.fill();
  ctx.strokeStyle=tier>1?'#a8f0d0':'#d8e8d8';ctx.lineWidth=Math.max(.6,r*.06);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx-w*1.3,band-r*.02);ctx.lineTo(cx+w*1.3,band-r*.08);ctx.stroke();
  gem(ctx,cx+w*1.33,band-r*.08,r*.08,tier>1?'#7ff0c0':'#e8e8e8',tier>2);
  gem(ctx,cx,band-r*.04,r*.09,tier?c:'#d9cfa8',tier>2);
  if(tier>=3){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3+.15*Math.sin(t*2);gem(ctx,cx,band-r*.62,r*.14,'#ffe9a8',true);ctx.restore();}}
 const DRAW=[bun,hat,helm,cap];
 function paint(ctx,meta,head,color,t){DRAW[meta.helmet??meta.classIndex??0](ctx,head,color,Math.max(0,Math.min(3,meta.tier||0)),t);}
 function draw(ctx,ap,dir,facing,fit,cls){const it=item(ap);if(!it||!fit?.head)return;const meta=equipmentData.byId.get(it.id)||it;if(meta.slot!=='mu')return;
  // Skull circle measured on the painted frame (ignores horns and hair spikes).
  const hd=fit.head,r=Math.max(6,Math.min(16,hd.radius||(hd.r-hd.l)/2)),x=hd.x??(hd.l+hd.r)/2,top=hd.top??fit.top;
  const head={x,y:top+r,r,side:dir===2?(facing<0?-1:1):0,back:dir===1};
  ctx.save();paint(ctx,meta,head,tone(ap,meta.classIndex??cls),reduced.matches?0:tm);ctx.restore();}
 // Inventory / item-card icon: the headgear over a faint head silhouette.
 const icons=new Map();
 function icon(it){const meta=equipmentData.byId.get(it?.id);if(meta?.slot!=='mu')return null;const color=CLASS_TONE[meta.classIndex||0],key=meta.id;if(icons.has(key))return icons.get(key);
  const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#ffffff14';x.beginPath();x.arc(64,80,34,0,TAU);x.fill();
  paint(x,meta,{x:64,y:82,r:34,side:0,back:false},color,0);const url=c.toDataURL();icons.set(key,url);return url;}
 const wardrobe=window.characterWardrobe;if(wardrobe){const base=wardrobe.itemIcon;wardrobe.itemIcon=function(it){return icon(it)||base.call(this,it);};}
 window.characterHelmet={draw,icon,CLASS_TONE};
})();
