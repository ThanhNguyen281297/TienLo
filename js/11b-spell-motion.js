/* Motion language from the supplied videos: gather, sweep, impact, dissipate.
   These are canvas overlays on existing transparent poses, not replacement art. */
(function(){
  const colors=['#68cfff','#69eacb','#b38aff','#efd08a'],TAU=Math.PI*2;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const clamp=x=>Math.max(0,Math.min(1,x));
  function charge(ctx,sect,x,y,age,duration=.45){
    const p=clamp(age/duration);if(p>=1)return;
    ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
    const color=colors[sect],radius=34*(1-p)+5;
    ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.globalAlpha=Math.sin(p*Math.PI)*.4;
    for(let n=0;n<3;n++){
      const a=n*TAU/3+(reduced.matches?0:age*3);
      ctx.beginPath();ctx.ellipse(0,0,radius,radius*.5,a,.1,1.4);ctx.stroke();
    }
    for(let n=0;n<8;n++){
      const a=n*TAU/8+age*2,r=48*(1-p),x=Math.cos(a)*r,y=Math.sin(a)*r*.55;
      ctx.globalAlpha=Math.sin(p*Math.PI)*.65;ctx.fillStyle=color;
      ctx.beginPath();ctx.arc(x,y,.7+p*.5,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  function formation(ctx,sect,f,alpha=1){
    const fade=clamp(f.age/.35)*alpha;if(fade<=0)return;
    ctx.save();ctx.translate(f.x,f.y);ctx.scale(1,.58);ctx.globalCompositeOperation='lighter';
    const angle=reduced.matches?0:f.age*.22;ctx.rotate(angle);
    ctx.strokeStyle=colors[sect];ctx.lineWidth=.8;ctx.globalAlpha=fade*.24;
    for(let n=0;n<6;n++){
      const a=n*TAU/6;ctx.beginPath();ctx.arc(0,0,f.radius*.84,a,a+.55);ctx.stroke();
    }
    for(let n=0;n<6;n++){
      const a=n*TAU/6;ctx.save();ctx.translate(Math.cos(a)*f.radius*.84,Math.sin(a)*f.radius*.84);ctx.rotate(a);
      ctx.globalAlpha=fade*(.25+.12*Math.sin(f.age*3+n));ctx.fillStyle=colors[sect];
      ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(0,-1.6);ctx.lineTo(3,0);ctx.lineTo(0,1.6);ctx.closePath();ctx.fill();ctx.restore();
    }
    ctx.restore();
  }
  function impact(ctx,sect,x,y,age,radius=45,duration=.55){
    const p=age/duration;if(p<0||p>=1)return;
    const eased=1-(1-p)**3,color=colors[sect];
    ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';ctx.strokeStyle=color;
    ctx.lineWidth=1.3*(1-p)+.3;ctx.globalAlpha=(1-p)**2*.5;
    ctx.beginPath();ctx.ellipse(0,0,4+radius*eased,(4+radius*eased)*.5,0,0,TAU);ctx.stroke();
    ctx.globalAlpha=(1-p)**2*.28;ctx.beginPath();ctx.ellipse(0,0,2+radius*eased*.7,(2+radius*eased*.7)*.5,0,0,TAU);ctx.stroke();
    for(let n=0;n<7;n++){
      const a=n*TAU/7+.2,r=(8+radius*.8*eased),length=6*(1-p);
      ctx.globalAlpha=(1-p)**2*.65;ctx.beginPath();ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r*.65);
      ctx.lineTo(Math.cos(a)*(r+length),Math.sin(a)*(r+length)*.65);ctx.stroke();
    }
    ctx.restore();
  }
  function trail(ctx,sect,p,speed=300){
    const length=Math.min(32,speed*.08),dx=Math.cos(p.angle),dy=Math.sin(p.angle);
    ctx.save();ctx.translate(p.x,p.y-15);ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    const color=colors[sect];
    for(let n=0;n<3;n++){
      const offset=(n-1)*3;
      const fade=ctx.createLinearGradient(-dx*length,-dy*length,0,0);
      fade.addColorStop(0,color+'00');fade.addColorStop(1,color+'aa');ctx.strokeStyle=fade;
      ctx.lineWidth=n===1?1.8:.7;ctx.globalAlpha=.45;
      ctx.beginPath();ctx.moveTo(-dx*length-dy*offset,-dy*length+dx*offset);
      ctx.quadraticCurveTo(-dx*length*.4-dy*offset*1.7,-dy*length*.4+dx*offset*1.7,0,0);ctx.stroke();
    }
    ctx.restore();
  }
  function ribbons(ctx,sect,x,y,age,width,height,alpha=1){
    if(alpha<=0)return;
    ctx.save();ctx.translate(x,y);ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle=colors[sect];ctx.lineCap='round';
    const clock=reduced.matches?0:age;
    for(let n=0;n<3;n++){
      const phase=clock*(sect===3?-1.4:1.7)+n*TAU/3;
      ctx.beginPath();
      for(let k=0;k<=24;k++){
        const t=k/24,a=phase+t*1.8;
        const rx=width*(.31+.035*Math.sin(clock*2+n));
        const px=Math.cos(a)*rx;
        const py=sect===2?height*(t-.5)*.82:Math.sin(a)*height*.23;
        if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.globalAlpha=alpha*(.42+.12*Math.sin(clock*3+n));
      ctx.lineWidth=n===0?1.2:.65;ctx.stroke();
      // The head follows the same curve, with a soft, restrained spark.
      const a=phase+1.8,rx=width*(.31+.035*Math.sin(clock*2+n));
      ctx.fillStyle=colors[sect];ctx.beginPath();
      ctx.arc(Math.cos(a)*rx,sect===2?height*.41:Math.sin(a)*height*.23,1.3,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  window.spellMotion={charge,formation,impact,trail,ribbons,colors};
})();
