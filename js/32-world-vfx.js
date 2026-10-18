/* Sprite-based icons, grounded footsteps and restrained contact effects.
   All ages advance with simulation time, never while a dialog pauses play. */
(function(){
  const steps=[],contacts=[],colors=['#80d9ff','#88edda','#c1a5ff','#f0d58e'];
  let distance=0,foot=1,scene=worldMap.state.scene;
  function reset(){steps.length=contacts.length=0;distance=0;scene=worldMap.state.scene;}
  function contact(enemy,kill){const recent=contacts.find(c=>c.enemy===enemy&&c.age<.08);
    if(recent){recent.x=enemy.x;recent.y=enemy.y-14;recent.kill||=kill;}
    else contacts.push({enemy,x:enemy.x,y:enemy.y-14,sect:P.ap?.w||0,age:0,kill});if(contacts.length>40)contacts.shift();
  }
  const hitBefore=hit;
  hit=function(enemy,power){const hp=enemy?.hp,result=hitBefore(enemy,power);
    if(enemy&&!enemy.network&&hp>0&&enemy.hp<hp)contact(enemy,enemy.hp<=0);
    return result;
  };
  function paintIcons(){const sect=P.ap?.w??tp.w??0;
    [...sb.children].forEach((button,index)=>{
      const stamp=sect+':'+index,old=button.querySelector('.ic');if(!old||old.dataset.spriteIcon===stamp)return;
      const canvas=old.tagName==='CANVAS'?old:document.createElement('canvas');canvas.className='ic';canvas.width=canvas.height=192;
      const ctx=canvas.getContext('2d');ctx.setTransform(3,0,0,3,0,0);
      const background=ctx.createRadialGradient(32,27,2,32,32,43);background.addColorStop(0,colors[sect]+'3c');background.addColorStop(1,'#071420');ctx.fillStyle=background;ctx.fillRect(0,0,64,64);
      const done=skillSprites.draw(ctx,sect,index,[3,2,3,4][index],32,31,53,49,0,1);
      ctx.strokeStyle=colors[sect]+'70';ctx.lineWidth=.65;ctx.beginPath();ctx.arc(32,32,28,-2.9,-.4);ctx.stroke();
      if(canvas!==old)old.replaceWith(canvas);if(done)canvas.dataset.spriteIcon=stamp;
    });
  }
  const update=up;up=function(dt){const origin={x:P.x,y:P.y},dashing=classCombat.isDashing();update(dt);paintIcons();
    if(scene!==worldMap.state.scene){reset();return;}
    if(paused()||worldMap.dialog.isOpen()||!P.ap||dt<=0)return;
    worldMap.environmentClock=(worldMap.environmentClock||0)+dt;
    for(const item of steps)item.age+=dt;for(const item of contacts)item.age+=dt;
    for(let i=steps.length-1;i>=0;i--)if(steps[i].age>1.1)steps.splice(i,1);
    for(let i=contacts.length-1;i>=0;i--)if(contacts[i].age>.38)contacts.splice(i,1);
    const dx=P.x-origin.x,dy=P.y-origin.y,moved=Math.hypot(dx,dy);
    if(!dashing&&!classCombat.isDashing()&&!P.med&&moved>.001&&moved<18){
      distance+=moved;if(distance>=12){distance%=12;foot=-foot;const angle=Math.atan2(dy,dx);if(!window.characterAuras?.hasTrail())steps.push({x:P.x-Math.sin(angle)*foot*2.7,y:P.y+Math.cos(angle)*foot*2.7,angle,age:0,sect:P.ap.w});if(steps.length>80)steps.shift();}
    }else if(moved>=18)distance=0;
  };
  const ground=worldMap.drawGroundDetails;
  worldMap.drawGroundDetails=function(ctx,...args){ground(ctx,...args);ctx.save();
    for(const step of steps){const p=step.age/1.1;ctx.save();ctx.translate(step.x,step.y);ctx.rotate(step.angle);ctx.globalAlpha=(1-p)*.24;ctx.fillStyle='#7c684f';ctx.beginPath();ctx.ellipse(0,0,2.4,1.15,0,0,Math.PI*2);ctx.fill();
      if(p<.45){ctx.globalAlpha=(1-p/.45)*.25;ctx.strokeStyle=colors[step.sect];ctx.lineWidth=.55;ctx.beginPath();ctx.ellipse(0,0,3+p*10,1.5+p*4,0,0,Math.PI*2);ctx.stroke();}
      ctx.restore();
    }ctx.restore();
  };
  const draw=dr;dr=function(){draw();if(paused()||!P.ap)return;paintIcons();const camera=gameCamera();g.save();g.setTransform(Z,0,0,Z,-camera.x*Z,-camera.y*Z);
    for(const contact of contacts){const p=contact.age/.38,fade=(1-p)**2,size=contact.kill?42:26;
      skillSprites.draw(g,contact.sect,0,3+p*2,contact.x,contact.y,size*(.8+p*.3),size*.65,0,fade*.48);
      g.save();g.globalCompositeOperation='lighter';g.strokeStyle=colors[contact.sect];g.lineWidth=.8;g.globalAlpha=fade*.7;
      for(let n=0;n<4;n++){const angle=n*Math.PI/2+.4,r=4+p*13;g.beginPath();g.moveTo(contact.x+Math.cos(angle)*r,contact.y+Math.sin(angle)*r*.6);g.lineTo(contact.x+Math.cos(angle)*(r+3),contact.y+Math.sin(angle)*(r+3)*.6);g.stroke();}g.restore();
    }g.restore();
  };
  const respawn=classCombat.onRespawn;classCombat.onRespawn=function(){reset();return respawn();};
  const creator=$('ok').onclick;$('ok').onclick=()=>{creator();reset();paintIcons();};
  window.worldVFX={steps,contacts,reset,paintIcons,confirmedHit(enemy,damage,kill){if(damage>0)contact(enemy,kill);}};
})();
