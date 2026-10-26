/* Layered spell actors: one texture per moving part, continuous simulation time.
   The old six-pose illustrations remain available for skill icons and galleries. */
(function(){
  const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const colors=['#69d9ff','#71efd2','#b18aff','#ffdc91'];
  const highlights=['#fff0c9','#e4fffa','#eadcff','#fff3d2'],halos=new Map();
  const parts=[],tints=new Map(),weapons=[],stats={sprites:0};
  const atlas=new Image();
  atlas.onload=()=>{
    const w=atlas.naturalWidth/4,h=atlas.naturalHeight/2;
    for(let n=0;n<8;n++){
      const c=document.createElement('canvas');c.width=Math.ceil(w);c.height=Math.ceil(h);
      c.getContext('2d').drawImage(atlas,(n%4)*w,Math.floor(n/4)*h,w,h,0,0,c.width,c.height);parts[n]=c;
    }
  };
  atlas.src=artworkURL('Skill/VFX/spirit-components-v1.png');
  for(const folder of ['Kiem','Liem','Thuong','Quat']){
    const image=new Image();image.src=artworkURL('Item/VuKhi/'+folder+'.png');weapons.push(image);
  }
  function texture(sect,index){
    const key=sect+':'+index;if(tints.has(key))return tints.get(key);
    const source=parts[index];if(!source)return null;
    const c=document.createElement('canvas');c.width=source.width;c.height=source.height;
    const g=c.getContext('2d');g.filter='contrast(1.18)';g.drawImage(source,0,0);g.filter='none';g.globalCompositeOperation='multiply';
    g.fillStyle=colors[sect];g.fillRect(0,0,c.width,c.height);
    g.globalCompositeOperation='destination-in';g.drawImage(source,0,0);tints.set(key,c);return c;
  }
  // Small sparks use a sharp geometric core instead of minifying a smoky
  // painting to a few pixels. The glow is still a separate translucent layer.
  function glint(ctx,sect,x,y,size,angle=0,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=clamp(alpha);
    ctx.fillStyle=highlights[sect];ctx.beginPath();
    for(let n=0;n<8;n++){const a=n*Math.PI/4,r=n%2?size*.12:size*.5;const px=Math.cos(a)*r,py=Math.sin(a)*r;n?ctx.lineTo(px,py):ctx.moveTo(px,py);}
    ctx.closePath();ctx.fill();ctx.restore();return true;
  }
  function part(ctx,sect,index,x,y,w,h,angle=0,alpha=1){
    if(index===3&&w<=12)return glint(ctx,sect,x,y,Math.min(w,h),angle,alpha);
    const image=texture(sect,index);if(!image||alpha<=0||w<=0||h<=0)return false;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=clamp(alpha);
    ctx.globalCompositeOperation=[2,4,5].includes(index)?'source-over':'screen';renderArtwork(ctx,image,-w/2,-h/2,w,h);ctx.restore();stats.sprites++;return true;
  }
  // Soft light is cached once; crisp energy filaments sit above it. Keeping
  // these separate avoids enlarging a blurry sprite to suggest brightness.
  function light(ctx,sect,x,y,radius,alpha){
    if(alpha<=0)return;
    let image=halos.get(sect);
    if(!image){
      image=document.createElement('canvas');image.width=image.height=128;
      const c=image.getContext('2d'),g=c.createRadialGradient(64,64,0,64,64,64);
      g.addColorStop(0,colors[sect]+'80');g.addColorStop(.25,colors[sect]+'35');g.addColorStop(1,colors[sect]+'00');
      c.fillStyle=g;c.fillRect(0,0,128,128);halos.set(sect,image);
    }
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=clamp(alpha);
    ctx.drawImage(image,x-radius,y-radius,radius*2,radius*2);ctx.restore();
  }
  function ribbon(ctx,sect,x,y,rx,ry,angle,sweep,alpha=1,tilt=0){
    if(alpha<=0)return;
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    const x0=Math.cos(angle)*rx,y0=Math.sin(angle)*ry,x1=Math.cos(angle+sweep)*rx,y1=Math.sin(angle+sweep)*ry;
    const gradient=ctx.createLinearGradient(x0,y0,x1,y1);
    gradient.addColorStop(0,colors[sect]+'00');gradient.addColorStop(.55,colors[sect]+'88');gradient.addColorStop(1,highlights[sect]);
    ctx.beginPath();for(let n=0;n<=28;n++){
      const a=angle+sweep*n/28,px=Math.cos(a)*rx,py=Math.sin(a)*ry;
      if(n===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
    }
    ctx.strokeStyle=colors[sect];ctx.lineWidth=3;ctx.globalAlpha=alpha*.11;ctx.stroke();
    ctx.strokeStyle=gradient;ctx.lineWidth=.8;ctx.globalAlpha=alpha*.85;ctx.stroke();ctx.restore();
  }
  function weapon(ctx,sect,x,y,size,angle=0,alpha=1){
    const image=weapons[sect];if(!image.complete||!image.naturalWidth||alpha<=0)return;
    const ratio=size/Math.max(image.naturalWidth,image.naturalHeight);
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha*=clamp(alpha);
    renderArtwork(ctx,image,-image.naturalWidth*ratio/2,-image.naturalHeight*ratio/2,image.naturalWidth*ratio,image.naturalHeight*ratio);ctx.restore();
  }
  // A tapered strip follows a continuous curve. Its outline, core and travelling
  // sparks share that curve, so the effect bends instead of swapping pose images.
  function flow(ctx,sect,point,width,alpha,clock=0){
    if(alpha<=0)return;
    const count=64,points=[],edges=[];
    for(let n=0;n<=count;n++)points.push(point(n/count));
    for(let n=0;n<=count;n++){
      const a=points[Math.max(0,n-1)],b=points[Math.min(count,n+1)],d=Math.hypot(b.x-a.x,b.y-a.y)||1;
      const w=width*Math.sin(Math.PI*n/count)**.7;
      edges.push({x:-(b.y-a.y)/d*w,y:(b.x-a.x)/d*w});
    }
    ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha*=clamp(alpha);
    const start=points[0],end=points[count],g=ctx.createLinearGradient(start.x,start.y,end.x,end.y);
    g.addColorStop(0,colors[sect]+'00');g.addColorStop(.35,colors[sect]+'55');g.addColorStop(.8,colors[sect]+'aa');g.addColorStop(1,highlights[sect]+'00');
    ctx.fillStyle=g;ctx.beginPath();
    for(let n=0;n<=count;n++){const p=points[n],e=edges[n];n?ctx.lineTo(p.x+e.x,p.y+e.y):ctx.moveTo(p.x+e.x,p.y+e.y);}
    for(let n=count;n>=0;n--){const p=points[n],e=edges[n];ctx.lineTo(p.x-e.x,p.y-e.y);}
    ctx.closePath();ctx.fill();
    ctx.globalCompositeOperation='lighter';ctx.lineWidth=.65;ctx.strokeStyle=g;ctx.beginPath();points.forEach((p,n)=>n?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    for(let n=0;n<2;n++){const u=(clock*.7+n*.5)%1,p=point(u);glint(ctx,sect,p.x,p.y,2.5,clock,Math.sin(u*Math.PI)*alpha*.7);}
    ctx.restore();
  }
  // Reconstruct the trail at past simulation times, rather than storing a frame
  // history. This stays identical at 30/60/120 Hz and allocates no particles.
  function orbit(ctx,sect,index,x,y,age,radius,size,count,alpha=1,flatten=.48){
    const clock=reduced.matches?0:age;
    for(let n=0;n<count;n++)for(let tail=3;tail>=0;tail--){
      const a=n*TAU/count+clock*(sect===1?-1.6:1.35)-tail*.065;
      const depth=.8+.2*Math.sin(a),s=size*depth;
      part(ctx,sect,index,x+Math.cos(a)*radius,y+Math.sin(a)*radius*flatten,s,s,a+Math.PI/2,alpha*(tail===0?.8:.075)*(tail===0?1:1-tail/5));
    }
  }
  function motes(ctx,sect,x,y,age,radius,alpha,count=14,outward=false){
    const clock=reduced.matches?0:age;
    for(let n=0;n<count;n++){
      const p=(clock*(outward?.85:.38)+n*.61803398875)%1;
      const a=n*2.399963+clock*.18,r=radius*(outward?p:1-p);
      const opacity=Math.sin(p*Math.PI)*alpha;
      part(ctx,sect,n%3===0?5:3,x+Math.cos(a)*r,y+Math.sin(a)*r*.54-(outward?0:p*16),n%3===0?11:6,n%3===0?20:6,a,opacity);
    }
  }
  function field(ctx,sect,f,alpha=1){
    const duration=f.duration||5.5;
    const fade=smooth(f.age/.35)*smooth((duration-f.age)/.5)*alpha;
    if(fade<=0)return;
    const clock=reduced.matches?0:f.age,r=f.radius*(.7+.3*smooth(f.age/.45));
    ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.54);
    part(ctx,sect,4,0,0,r*2.22,r*2.22,clock*.13,fade*.27);
    part(ctx,sect,7,0,0,r*1.65,r*1.65,-clock*.23,fade*.15);
    orbit(ctx,sect,5,0,0,clock,r*.78,22,sect===3?8:6,fade*.5,1);
    // Fine rotating segments retain readable geometry on bright stone maps.
    for(let n=0;n<8;n++){
      const a=n*TAU/8+clock*.12;
      ribbon(ctx,sect,0,0,r*.83,r*.83,a,.4,fade*.7);
      const px=Math.cos(a)*r*.94,py=Math.sin(a)*r*.94;
      ctx.save();ctx.translate(px,py);ctx.rotate(a+Math.PI/4);
      ctx.strokeStyle=highlights[sect];ctx.globalAlpha=fade*.5;ctx.lineWidth=.65;
      if(sect===0){
        for(let bar=0;bar<3;bar++){ctx.beginPath();ctx.moveTo(-3,-3+bar*3);ctx.lineTo(bar===1?-1:3,-3+bar*3);ctx.stroke();if(bar===1){ctx.beginPath();ctx.moveTo(1,0);ctx.lineTo(3,0);ctx.stroke();}}
      }else if(sect===1){
        ctx.beginPath();ctx.arc(0,0,3,-1.4,1.4);ctx.stroke();
      }else if(sect===2){
        ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(-2,0);ctx.lineTo(2,0);ctx.lineTo(0,5);ctx.stroke();
      }else{
        ctx.strokeRect(-2,-4,4,8);ctx.beginPath();ctx.moveTo(-1,-1);ctx.lineTo(1,1);ctx.lineTo(-1,2);ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();
    motes(ctx,sect,f.x,f.y-5,f.age,r*.9,fade*.4,10);
    const pulse=(clock*.65)%1;
    ribbon(ctx,sect,f.x,f.y,r*(.2+pulse*.8),r*(.2+pulse*.8)*.54,clock*.2,TAU-.05,fade*Math.sin(pulse*Math.PI)*.25);
  }
  function projectile(ctx,sect,x,y,angle,age,size=32,alpha=1){
    const clock=reduced.matches?0:age;
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);
    for(let n=0;n<2;n++)flow(ctx,sect,u=>({x:-size*2.3*(1-u),y:Math.sin((1-u)*5-clock*9+n*Math.PI)*size*.13*(1-u)}),size*(n?.055:.1),alpha*(n?.45:.8),clock+n*.3);
    ctx.restore();
    light(ctx,sect,x,y,size*.65,alpha*.22);
    for(let n=0;n<3;n++){
      const p=(age*1.7+n*.33)%1,back=size*(.3+p*1.4),side=Math.sin(n*2.4+age*5)*size*.1;
      glint(ctx,sect,x-Math.cos(angle)*back-Math.sin(angle)*side,y-Math.sin(angle)*back+Math.cos(angle)*side,3.5*(1-p),angle,alpha*(1-p)*.65);
    }
    if(sect===1){
      ribbon(ctx,sect,x,y,size*.58,size*.58,angle+age*4,2.5,alpha);
      part(ctx,sect,0,x,y,size*1.45,size*1.45,angle+age*4,alpha*.65);
      part(ctx,sect,0,x,y,size*1.2,size*1.2,angle+age*4-.3,alpha*.16);
    }else if(sect===3){
      ribbon(ctx,sect,x-Math.cos(angle)*size*.65,y-Math.sin(angle)*size*.65,size*.8,size*.12,Math.PI,Math.PI,alpha*.7,angle);
      part(ctx,sect,1,x-Math.cos(angle)*12,y-Math.sin(angle)*12,size*2,size*.65,angle,alpha*.45);
      part(ctx,sect,5,x,y,size*.7,size*.9,angle+Math.PI/2+Math.sin(age*7)*.12,alpha);
    }else{
      ribbon(ctx,sect,x-Math.cos(angle)*size*.8,y-Math.sin(angle)*size*.8,size*.9,size*.12,Math.PI,Math.PI,alpha*.75,angle);
      part(ctx,sect,1,x-Math.cos(angle)*10,y-Math.sin(angle)*10,size*2.3,size*.7,angle,alpha*.7);
      weapon(ctx,sect,x,y,size,angle+(sect===0?-Math.PI/2:Math.PI/2),alpha);
    }
  }
  function impact(ctx,sect,x,y,age,radius=55,duration=.6){
    if(age<0||age>=duration)return;
    const p=age/duration,fade=(1-p)**2,expand=1-(1-p)**3;
    light(ctx,sect,x,y-8,radius*(.6+expand),fade*.65);
    for(let n=0;n<3;n++)ribbon(ctx,sect,x,y,8+radius*expand,4+radius*expand*.5,n*TAU/3+p*.3,1.6,fade*.85);
    part(ctx,sect,6,x,y-8,30+radius*expand,30+radius*expand*.75,age*.25,fade*.7);
    part(ctx,sect,7,x,y,12+radius*2*expand,6+radius*expand,0,fade*.65);
    for(let n=0;n<10;n++){
      const a=n*2.399963,r=radius*expand*(.45+(n%3)*.16);
      part(ctx,sect,n%3?3:5,x+Math.cos(a)*r,y+Math.sin(a)*r*.5-p*12,7,10,a+p,fade*.7);
    }
  }
  // Continuous in-world skill actor. Skill PNG poses remain useful as icons and
  // reference art, but combat draws moving weapons/energy paths instead of
  // crossfading complete paintings over one another.
  function castMotion(ctx,sect,index,phase,x,y,width,height,angle=0,alpha=1){
    const p=smooth(phase),clock=reduced.matches?0:(typeof tm==='number'?tm:0),fade=clamp(alpha);
    if(fade<=0)return false;
    const scale=Math.max(.35,Math.min(1.5,Math.min(width,height)/120));
    const reach=(.18+.82*p)*scale,dir={x:Math.cos(angle),y:Math.sin(angle)},side={x:-dir.y,y:dir.x};
    ctx.save();ctx.translate(x,y);ctx.globalAlpha*=fade;
    light(ctx,sect,0,0,Math.max(width,height)*(.18+.12*Math.sin(p*Math.PI)),.18*(1-p*.45));
    if(sect===0){
      const n=index===0?3:index===2?8:index===3?11:1;
      for(let i=0;i<n;i++){
        const offset=(i-(n-1)/2)*Math.min(13,width*.07),spread=(index===2||index===3)?(1-p)*.55:0;
        const sx=side.x*(offset+spread*height),sy=side.y*(offset+spread*height);
        const sweep=(index===1?1.4:2.2)*(p-.5),r=width*(.18+.3*p);
        ribbon(ctx,sect,sx,sy,r,height*.12,angle-sweep*.5,sweep,fade*(.28+.5*Math.sin(p*Math.PI)),angle);
        if(index===0||index===2||index===3)weapon(ctx,sect,sx+dir.x*r*.35,sy+dir.y*r*.35,Math.max(20,height*.38),angle-Math.PI/2,fade*(.7-.25*p));
      }
    }else if(sect===1){
      const n=index===0?3:index===2?5:1,r=width*(.2+.32*p);
      for(let i=0;i<n;i++){
        const a=angle+(i-(n-1)/2)*.48+clock*(i%2?-.16:.16),sweep=(index===1?1.8:2.35)*(p-.52);
        ribbon(ctx,sect,dir.x*r*.25,dir.y*r*.25,r,height*.15,a-sweep*.5,sweep,fade*(.35+.55*Math.sin(p*Math.PI)),angle);
        if(index!==1)part(ctx,sect,0,dir.x*r*.45+side.x*(i-(n-1)/2)*8,dir.y*r*.45+side.y*(i-(n-1)/2)*8,height*.28,height*.28,a,fade*.75);
      }
    }else if(sect===2){
      const branches=index===2?7:index===3?3:1;
      for(let i=0;i<branches;i++){
        const offset=(i-(branches-1)/2)*width*.08,dist=width*(.12+.34*p),jag=height*.09;
        flow(ctx,sect,u=>({x:dir.x*dist*u+side.x*(offset+Math.sin(u*8+clock*7+i)*jag*u),y:dir.y*dist*u+side.y*(offset+Math.sin(u*8+clock*7+i)*jag*u)}),Math.max(2,height*.025),fade*(.55+.35*Math.sin(p*Math.PI)),clock+i*.31);
        if(index===0||index===1||index===3)weapon(ctx,sect,dir.x*dist*.62+side.x*offset,dir.y*dist*.62+side.y*offset,Math.max(22,height*.4),angle-Math.PI/2,fade*.75);
      }
    }else{
      const n=index===2?8:index===3?10:index===0?3:1,r=width*(.16+.28*p);
      for(let i=0;i<n;i++){
        const a=angle+(i-(n-1)/2)*.34+clock*.12,tx=dir.x*r+side.x*(i-(n-1)/2)*width*.07,ty=dir.y*r+side.y*(i-(n-1)/2)*width*.07;
        flow(ctx,sect,u=>({x:tx*u+side.x*Math.sin(u*Math.PI)*height*.12,y:ty*u-dir.y*Math.sin(u*Math.PI)*height*.12}),Math.max(2,height*.018),fade*.5,clock+i*.2);
        part(ctx,sect,5,tx,ty,Math.max(10,width*.075),Math.max(18,height*.16),a,fade*(.55+.3*Math.sin(p*Math.PI)));
      }
      if(index===3)light(ctx,sect,0,0,width*.38,fade*.4*Math.sin(p*Math.PI));
    }
    if(p>.72)impact(ctx,sect,dir.x*width*.36,dir.y*width*.36,(p-.72)*.22,width*.28,.28);
    ctx.restore();return true;
  }
  function ultimate(ctx,sect,index,age,duration,x,y,width,height,hitAt=duration*.6,alpha=1){
    if(age<0||age>=duration)return false;
    const charge=clamp(age/hitAt),release=clamp((age-hitAt)/Math.max(.01,duration-hitAt));
    const fade=smooth(age/.18)*smooth((duration-age)/.35)*alpha;
    const baseY=y+height*.32,clock=reduced.matches?0:age;
    field(ctx,sect,{x,y:baseY,radius:width*.43,age,duration},fade*.7);
    light(ctx,sect,x,baseY-height*.2,width*.52,fade*(.12+.22*charge));
    const flight=smooth(release/.55),bodyFade=fade*(1-smooth(release/.78));
    motes(ctx,sect,x,baseY-12,age,width*.54,bodyFade*.4,12);
    if(sect===0){
      // The same swords descend from their charged orbit; no reset at impact.
      for(let n=0;n<7;n++){
        const a=n*TAU/7+clock*.65,r=width*(.22+.05*Math.sin(clock))*(1-flight*.8);
        const px=x+Math.cos(a)*r,py=baseY-height*(.22+.3*charge)*(1-flight)+Math.sin(a)*r*.24;
        flow(ctx,sect,u=>({x:px+Math.sin(u*4+clock+n)*6*(1-u),y:py-height*.45*(1-u)}),4,bodyFade*.7,clock+n*.13);
        weapon(ctx,sect,px,py,40+charge*15,Math.sin(clock+n)*.06,bodyFade*(.65+.2*Math.sin(a)));
      }
      for(let n=0;n<2;n++)ribbon(ctx,sect,x,baseY-height*.3*(1-flight),width*.33,height*.12,clock*1.4+n*Math.PI,2.8,bodyFade*.6,-.15);
    }else if(sect===1){
      const cy=baseY-height*.27*(1-flight),r=width*(.15+.18*charge+flight*.25);
      for(let n=0;n<3;n++){
        const a=n*TAU/3-clock*1.6;
        flow(ctx,sect,u=>({x:x+Math.cos(a-u*2.6)*r,y:cy+Math.sin(a-u*2.6)*r*.6}),5,bodyFade*.8,clock+n*.3);
        part(ctx,sect,0,x+Math.cos(a)*r,cy+Math.sin(a)*r*.6,width*.4,width*.4,a,bodyFade*.75);
      }
      light(ctx,sect,x,cy,width*.26,bodyFade*.4);
    }else if(sect===2){
      // Twin energy coils bend continuously around the spear in perspective.
      for(let n=0;n<2;n++)flow(ctx,sect,u=>{
        const a=u*TAU*1.8-clock*2.4+n*Math.PI,r=width*(.12+.1*u)*(1-flight*.5);
        return{x:x+Math.cos(a)*r,y:baseY-u*height*.82*(1-flight)+Math.sin(a)*r*.28};
      },7,bodyFade*.75,clock+n*.5);
      weapon(ctx,sect,x,baseY-height*.4*(1-flight),height*.64,Math.PI,bodyFade*.9);
      for(let n=0;n<3;n++)ribbon(ctx,sect,x,baseY-height*(.12+n*.19)*(1-flight),width*(.21-n*.035),height*.07,clock*2+n*1.3,2.5,bodyFade*.6);
    }else{
      // Talismans ride separate silk-like paths instead of a rotating flat disk.
      const cy=baseY-height*.25*(1-flight),r=width*(.19+.15*charge+flight*.27);
      for(let n=0;n<10;n++){
        const a=n*TAU/10+clock*.65,px=x+Math.cos(a)*r,py=cy+Math.sin(a)*r*.6;
        flow(ctx,sect,u=>({x:x+Math.cos(a-(1-u)*1.2)*r*u,y:cy+Math.sin(a-(1-u)*1.2)*r*u*.6-Math.sin(u*Math.PI)*12}),2.7,bodyFade*.55,clock+n*.1);
        part(ctx,sect,5,px,py,15,27,a+.3*Math.sin(clock+n),bodyFade*(.6+.2*Math.sin(a)));
      }
      light(ctx,sect,x,cy,width*.22,bodyFade*.3);
      weapon(ctx,sect,x,cy,38,Math.sin(clock)*.1,bodyFade*.7);
    }
    if(age>=hitAt){
      impact(ctx,sect,x,baseY,age-hitAt,width*.6,Math.min(.85,duration-hitAt));
      motes(ctx,sect,x,baseY,age-hitAt,width*.6,fade*.6,20,true);
    }
    return parts.length===8;
  }
  window.spellActors={part,glint,field,projectile,impact,ultimate,weapon,light,ribbon,flow,castMotion,stats,get ready(){return parts.length===8;},atlas};
  // Keep icon rendering separate from in-world moving actors.
  skillSprites.animate=ultimate;
})();
