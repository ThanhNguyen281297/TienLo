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
  atlas.src=artworkURL('CHARACTER/SkillVFX/spirit-components-v1.png');
  for(const folder of ['Kiem','Liem','Thuong','Quat']){
    const image=new Image();image.src=artworkURL('CHARACTER/'+folder+'/VuKhi/vukhi.png');weapons.push(image);
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
  }
  function projectile(ctx,sect,x,y,angle,age,size=32,alpha=1){
    light(ctx,sect,x,y,size*.65,alpha*.22);
    for(let n=0;n<3;n++){
      const p=(age*1.7+n*.33)%1,back=size*(.3+p*1.4),side=Math.sin(n*2.4+age*5)*size*.1;
      glint(ctx,sect,x-Math.cos(angle)*back-Math.sin(angle)*side,y-Math.sin(angle)*back+Math.cos(angle)*side,3.5*(1-p),angle,alpha*(1-p)*.65);
    }
    if(sect===1){
      ribbon(ctx,sect,x,y,size*.58,size*.58,angle+age*4,2.5,alpha);
      part(ctx,sect,0,x,y,size*1.45,size*1.45,angle+age*4,alpha);
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
  function ultimate(ctx,sect,index,age,duration,x,y,width,height,hitAt=duration*.6,alpha=1){
    if(age<0||age>=duration)return false;
    const charge=clamp(age/hitAt),release=clamp((age-hitAt)/Math.max(.01,duration-hitAt));
    const fade=smooth(age/.18)*smooth((duration-age)/.35)*alpha;
    const baseY=y+height*.32,clock=reduced.matches?0:age;
    field(ctx,sect,{x,y:baseY,radius:width*.43,age,duration},fade*.7);
    light(ctx,sect,x,baseY-height*.2,width*.52,fade*(.12+.22*charge));
    if(age<hitAt){
      motes(ctx,sect,x,baseY-12,age,width*.54,fade*.65,18);
      if(sect===0){
        for(let n=0;n<7;n++){
          const a=n*TAU/7+clock*.65,r=width*(.28+.08*Math.sin(clock));
          const px=x+Math.cos(a)*r,py=baseY-height*(.25+.3*charge)+Math.sin(a)*r*.24;
          part(ctx,sect,1,px,py-12,54,14,Math.PI/2,fade*.32);
          weapon(ctx,sect,px,py,46+charge*12,Math.sin(clock+n)*.06,fade*(.55+.25*Math.sin(a)));
        }
        for(let n=0;n<2;n++)ribbon(ctx,sect,x,baseY-height*.32,width*.33,height*.12,clock*1.4+n*Math.PI,2.8,fade*.65,-.15);
        weapon(ctx,sect,x,baseY-height*.5*(1-smooth((charge-.84)/.16)),70+30*charge,0,fade*.8);
      }else if(sect===1){
        orbit(ctx,sect,0,x,baseY-height*.27,clock,width*(.15+.19*charge),width*.42,3,fade*.8,.65);
        for(let n=0;n<3;n++)ribbon(ctx,sect,x,baseY-height*.27,width*.33,height*.24,-clock*1.6+n*TAU/3,1.8,fade*.8,n*.18);
        light(ctx,sect,x,baseY-height*.27,width*.28,fade*.6);
        part(ctx,sect,7,x,baseY-height*.27,width*.7,width*.7,-clock*.5,fade*.28);
      }else if(sect===2){
        // Separate wisps form a rising helix; their depth, pitch and width move.
        for(let n=0;n<10;n++){
          const v=(n/10+clock*.28)%1,a=v*TAU*2-clock*2.2;
          const r=width*(.13+.13*v),px=x+Math.cos(a)*r,py=baseY-v*height*.85;
          part(ctx,sect,2,px,py,52*(.7+v),34,Math.sin(a)*.6,fade*Math.sin(v*Math.PI)*(.35+.3*(Math.sin(a)+1)/2));
        }
        for(let n=0;n<4;n++)ribbon(ctx,sect,x,baseY-height*(.12+n*.16),width*(.2-n*.025),height*.08,clock*2.3+n*1.3,2.7,fade*.65,-.15);
        weapon(ctx,sect,x,baseY-height*(.35+.12*charge)*(1-smooth((charge-.84)/.16)),height*.63,Math.PI,fade*.9);
      }else{
        orbit(ctx,sect,5,x,baseY-height*.25,clock,width*(.17+.2*charge),34,10,fade*.85,.65);
        for(let n=0;n<3;n++)part(ctx,sect,0,x,baseY-height*.25,width*.6,width*.6,clock*.6+n*TAU/3,fade*.25);
        for(let n=0;n<3;n++)ribbon(ctx,sect,x,baseY-height*.25,width*.37,height*.22,clock*.8+n*TAU/3,1.8,fade*.75,n*.17);
        light(ctx,sect,x,baseY-height*.25,width*.23,fade*.4);
        weapon(ctx,sect,x,baseY-height*.25,42,Math.sin(clock)*.12,fade*.7);
      }
    }else{
      const flight=smooth(release/.35),spread=width*(1-flight)*.38;
      if(sect===0||sect===2){
        const count=sect===0?9:5;
        for(let n=0;n<count;n++){
          const delay=n/count*.18,p=clamp((release-delay)/.32),drop=1-(1-p)**3;
          const px=x+(n-(count-1)/2)*spread*.38,py=baseY-height*.85*(1-drop);
          part(ctx,sect,1,px,py-22,70,15,Math.PI/2,fade*(1-p)*.8);
          weapon(ctx,sect,px,py,sect===0?62:85,sect===0?0:Math.PI,fade*(1-p));
        }
      }else{
        const count=sect===1?3:12;
        for(let n=0;n<count;n++){
          const a=n*TAU/count+clock*(sect===1?-2:1),r=width*(.12+release*.55);
          part(ctx,sect,sect===1?0:5,x+Math.cos(a)*r,baseY+Math.sin(a)*r*.52-release*12,sect===1?width*.55:25,sect===1?width*.55:44,a+release*2,fade*(1-release));
        }
      }
      impact(ctx,sect,x,baseY,age-hitAt,width*.6,Math.min(.85,duration-hitAt));
      motes(ctx,sect,x,baseY,age-hitAt,width*.6,fade*.6,20,true);
    }
    return parts.length===8;
  }
  window.spellActors={part,glint,field,projectile,impact,ultimate,weapon,light,ribbon,stats,get ready(){return parts.length===8;},atlas};
  // Keep icon rendering separate from in-world moving actors.
  skillSprites.animate=ultimate;
})();
