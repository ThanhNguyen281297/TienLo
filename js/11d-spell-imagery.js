/* Separate illustrated parts, articulated joints and cast-time choreography. */
(function(){
 const TAU=Math.PI*2,reduced=matchMedia('(prefers-reduced-motion: reduce)'),parts=[],weapons=[];
 const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
 // Measured rectangles; the generated source does not use perfectly even cells.
 const rects=[[10,10,495,402],[520,143,386,201],[922,140,526,263],[1453,38,290,389],[69,414,363,448],[500,411,448,432],[1071,453,243,412],[1471,439,256,421]];
 const atlas=new Image();atlas.onload=()=>{
  rects.forEach(([x,y,w,h],i)=>{const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);parts[i]=c;});
  const wing=parts[5];
  for(const [i,left,right]of [[8,.45,1],[9,0,.55]]){const c=document.createElement('canvas');c.width=Math.ceil(wing.width*(right-left));c.height=wing.height;c.getContext('2d').drawImage(wing,left*wing.width,0,(right-left)*wing.width,wing.height,0,0,c.width,c.height);parts[i]=c;}
 };atlas.src=artworkURL('Skill/VFX/rig-parts-v3.png');
 for(const name of ['Kiem','Liem','Thuong','Quat']){const image=new Image();image.src=artworkURL('Item/VuKhi/'+name+'.png');weapons.push(image);}
 const rotate=(x,y,a)=>({x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)});
 function node(nodes,id,part,x,y,w,h,angle=0,alpha=1,ax=.5,ay=.5,mirror=1){nodes.push({id,part,x,y,w,h,angle,alpha,ax,ay,mirror});}
 function dragonPoint(v,w,h){
  if(v<0)return{x:0,y:0};
  if(v<.7){const p=v/.7;return{x:Math.sin(p*TAU*1.45)*w*.23*ease(p/.2),y:-h*.82*ease(p)};}
  const p=ease((v-.7)/.3),startX=Math.sin(TAU*1.45)*w*.23;
  if(v<=1){const a=1-p;return{x:a*a*a*startX+3*a*a*p*w*.58+3*a*p*p*w*.3,y:-h*.82*a*a*a-h*1.05*3*a*a*p};}
  return{x:-w*(v-1),y:-h*.22*(1-Math.exp(-3*(v-1)))**2};
 }
 function dragon(nodes,age,hitAt,w,h,alpha){
  const q=age/hitAt,trail=.64,joints=[];
  for(let i=0;i<=28;i++){const v=q-(1-i/28)*trail,p=dragonPoint(v,w,h);joints.push({...p,v});}
  for(let i=0;i<28;i++){
   const a=joints[i],b=joints[i+1];if(b.v<0)continue;
   const angle=Math.atan2(b.y-a.y,b.x-a.x),size=h*(.07+.07*i/28)*ease(b.v/.08)*(1+Math.sin(age*8-i*.45)*.035),fade=alpha;
   if(i===0||a.v<0)node(nodes,'tail',2,a.x,a.y,size*2.7,size*1.15,angle,fade,.88,.5);
   if(i===15||i===23)for(const side of [-1,1])node(nodes,'claw-'+i+'-'+side,3,a.x,a.y,size*1.6,size*2.1,angle+side*(.65+.28*Math.sin(age*5+i)),fade,.15,.12,side);
   node(nodes,'vertebra-'+i,1,(a.x+b.x)/2,(a.y+b.y)/2,Math.hypot(b.x-a.x,b.y-a.y)+size*.85,size,angle,fade);
  }
  const p=joints[28],prev=dragonPoint(q-.012,w,h),angle=Math.atan2(p.y-prev.y,p.x-prev.x);
  node(nodes,'head',0,p.x,p.y,w*.29,h*.25,angle,alpha*ease(q/.07),.23,.55);
 }
 function phoenix(nodes,age,hitAt,w,h,alpha,projectile=false){
  const q=clamp(age/hitAt),dive=ease((q-.65)/.35),clock=reduced.matches?0:age;
  const x=projectile?0:Math.sin(q*Math.PI)*w*.1,y=projectile?0:-h*.58*Math.sin(q*Math.PI);
  const pitch=projectile?0:-.12+Math.sin(q*Math.PI)*.13+dive*.4,fold=projectile?0:dive*.75;
  const local=[],wingW=w*.43*(1-fold*.35),wingH=h*.36;
  for(let n=0;n<6;n++)node(local,'tail-feather-'+n,6,(n-2.5)*w*.016,h*.08,w*.085,h*(.39+n*.026),Math.sin(clock*5-n*.7)*.29+(n-2.5)*.13,alpha,.4,.05);
  for(const side of [-1,1]){
   const shoulder=side*(.15+Math.sin(clock*7)*.56+fold*.65),elbow=side*(.2+Math.sin(clock*7-.8)*.45+fold*.5),mirror=-side,rx=side*w*.025,ry=-h*.025;
   const foreshorten=.72+.28*Math.cos(clock*7+side*.18);
   const offset=rotate(-.4*wingW*mirror*foreshorten,-.36*wingH,shoulder);
   node(local,'wing-root-'+side,8,rx,ry,wingW*.55*foreshorten,wingH,shoulder,alpha,.43/.55,.78,mirror);
   node(local,'wing-tip-'+side,9,rx+offset.x,ry+offset.y,wingW*.55*foreshorten,wingH*(.92+.08*Math.sin(clock*7)),shoulder+elbow,alpha,.48/.55,.42,mirror);
  }
  node(local,'body',4,0,0,w*.23,h*.34,0,alpha);
  for(const n of local){const p=rotate(n.x,n.y,pitch);nodes.push({...n,x:x+p.x,y:y+p.y,angle:n.angle+pitch});}
 }
 function pose(sect,age,duration=3,hitAt=duration*.6,w=190,h=200){
  const q=clamp(age/hitAt),release=clamp((age-hitAt)/Math.max(.01,duration-hitAt)),nodes=[];
  if(age<0||age>=duration)return{phase:'ended',nodes,impact:false};
  const fade=ease(age/.12)*(1-ease(release/.85)),clock=reduced.matches?0:age;
  if(sect===0){
   for(let i=0;i<11;i++){
    const spawn=ease((q-i*.025)/.2),a=i*TAU/11+clock*.75,r=w*.32,start={x:Math.cos(a)*r*spawn,y:(-h*.53+Math.sin(a)*h*.12)*spawn};
    const dive=ease((q-(.62+i*.018))/(1-(.62+i*.018))),x=start.x*(1-dive),y=start.y*(1-dive),angle=Math.atan2(-start.y,-start.x)-Math.PI/2;
    node(nodes,'sword-'+i,'weapon-0',x,y,30,58,angle*dive,fade*spawn*(1-ease(release/.25)));
   }
  }else if(sect===1){
   for(let i=0;i<3;i++){
    const a=i*TAU/3-clock*2.4,r=w*(.14+.16*Math.sin(q*Math.PI)+release*.5),contract=1-ease((q-.78)/.22);
    const reach=contract+ease(release/.3);
    node(nodes,'crescent-'+i,'weapon-1',Math.cos(a)*r*reach,-h*.28*contract+Math.sin(a)*r*.48*reach,54,54,a,fade);
   }
   for(let i=0;i<6;i++){const a=i*TAU/6+clock*.6;node(nodes,'lunar-seal-'+i,7,Math.cos(a)*w*.13,-h*.24+Math.sin(a)*h*.08,10,22,a*.15,fade*.65);}
  }else if(sect===2)dragon(nodes,age,hitAt,w,h,fade);
  else{
   phoenix(nodes,age,hitAt,w,h,fade*(1-ease(release/.35)));
   const spread=ease((q-.6)/.4)+release;
   for(let i=0;i<8;i++){const a=i*TAU/8-clock*.65;node(nodes,'talisman-'+i,7,Math.cos(a)*w*.36*spread,-h*.18+Math.sin(a)*h*.19*spread,13,28,Math.sin(clock*2+i)*.15,fade*ease(q/.25));}
  }
  return{phase:age<hitAt?(q<.68?'summon':'strike'):'dissipate',nodes,impact:age>=hitAt};
 }
 function paint(ctx,n){
  const image=typeof n.part==='string'?weapons[Number(n.part.slice(-1))]:parts[n.part];
  if(!image||(image instanceof HTMLImageElement&&(!image.complete||!image.naturalWidth))||n.alpha<=0)return;
  ctx.save();ctx.translate(n.x,n.y);ctx.rotate(n.angle);ctx.scale(n.mirror,1);ctx.globalAlpha*=clamp(n.alpha);
  renderArtwork(ctx,image,-n.w*n.ax,-n.h*n.ay,n.w,n.h);ctx.restore();
 }
 function render(ctx,sect,x,y,age,duration,hitAt,w,h,alpha=1){
  const p=pose(sect,age,duration,hitAt,w,h);ctx.save();ctx.translate(x,y);ctx.globalAlpha*=alpha;for(const n of p.nodes)paint(ctx,n);ctx.restore();return p;
 }
 const baseField=spellActors.field,baseProjectile=spellActors.projectile;
 function ultimate(ctx,sect,index,age,duration,x,y,w,h,hitAt=duration*.6,alpha=1){
  if(age<0||age>=duration)return false;
  const groundY=y+h*.32,fade=ease(age/.2)*ease((duration-age)/.35)*alpha;
  baseField(ctx,sect,{x,y:groundY,radius:w*.4,age,duration},fade*.35);
  spellActors.light(ctx,sect,x,groundY-h*.2,w*.45,fade*.12);render(ctx,sect,x,groundY,age,duration,hitAt,w,h,alpha);
  if(age>=hitAt)spellActors.impact(ctx,sect,x,groundY,age-hitAt,w*.6,Math.min(.7,duration-hitAt));
  return parts.length===10;
 }
 spellActors.ultimate=skillSprites.animate=ultimate;
 spellActors.field=function(ctx,sect,f,alpha=1){
  const duration=f.duration||5.5,fade=ease(f.age/.3)*ease((duration-f.age)/.5)*alpha,clock=reduced.matches?0:f.age;
  baseField(ctx,sect,f,alpha*.75);if(fade<=0)return;const count=sect===3?8:6;
  for(let i=0;i<count;i++){
   const a=i*TAU/count+clock*(sect===1?-.5:.25),summon=ease((f.age-i*.035)/.35),r=f.radius*.76*summon;
   paint(ctx,{part:sect===3?7:'weapon-'+(sect===2?2:sect===1?1:0),x:f.x+Math.cos(a)*r,y:f.y+Math.sin(a)*r*.5-8-Math.sin(clock*3+i)*3,w:sect===3?12:20,h:sect===3?25:30,angle:sect===1?a:Math.sin(clock+i)*.04,alpha:fade*summon,ax:.5,ay:.7,mirror:1});
  }
 };
 spellActors.projectile=function(ctx,sect,x,y,angle,age,size=32,alpha=1){
  if(sect!==3)return baseProjectile(ctx,sect,x,y,angle,age,size,alpha);
  baseProjectile(ctx,sect,x,y,angle,age,size,alpha*.28);ctx.save();ctx.translate(x,y-3);ctx.scale(Math.cos(angle)<0?-1:1,1);
  const nodes=[];phoenix(nodes,age,10,size*1.4,size*1.25,alpha,true);for(const n of nodes)paint(ctx,n);ctx.restore();
 };
 window.spellImagery={atlas,parts,weapons,pose,render,get ready(){return parts.length===10&&weapons.every(i=>i.complete&&i.naturalWidth);}};
})();
