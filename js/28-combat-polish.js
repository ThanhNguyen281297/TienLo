/* Ánh sáng chiến đấu theo phái, dư ảnh kỹ năng và vũ khí theo phẩm chất. */
(function(){
  const waves=[],echoes=[];let last=performance.now();
  const palette=['#7bcaff','#80ffe3','#bf95ff','#ffdc91'];
  function pulse(x,y,radius,color,duration=.5){waves.push({x,y,radius,color,age:0,duration});if(waves.length>36)waves.shift();}
  const originalSkill=skill;
  skill=function(index){const before=P.mp,result=originalSkill(index);if(P.mp<before){const color=palette[P.ap.w],point=index===3?(getClassCombat().state.aim||P):P;if(index!==1&&P.ap.w<2)pulse(point.x,point.y,index===3?155:index===2?110:45,color,index===3?.95:.5);if(index!==1&&P.ap.w<2)spark(P.x,P.y-25,color,index===3?22:10);if(window.onlineWorld)onlineWorld.state.cast={id:Date.now()+':'+Math.random(),index,x:point.x,y:point.y};if(index!==1&&P.ap.w<2)echoes.push({x:P.x,y:P.y,ap:{...P.ap},dir:P.dir,f:P.f,age:0});}return result;};
  const originalHit=hit;
  hit=function(enemy,power){if(enemy&&!enemy.dead&&enemy.hp>0){pulse(enemy.x,enemy.y-12,Math.min(36,12+power*.08),palette[P.ap?.w||0],.25);}return originalHit(enemy,power);};
  const draw=dr;
  dr=function(){draw();const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
    if(!P.ap||paused())return;
    const camera=gameCamera();g.save();g.setTransform(Z,0,0,Z,-camera.x*Z,-camera.y*Z);g.globalCompositeOperation='lighter';
    for(const wave of waves){wave.age+=dt;const p=wave.age/wave.duration;if(p>=1)continue;g.globalAlpha=(1-p)*.65;g.strokeStyle=wave.color;g.lineWidth=2*(1-p)+.5;g.beginPath();g.ellipse(wave.x,wave.y,wave.radius*(.25+p*.75),wave.radius*(.25+p*.75)*.55,0,0,Math.PI*2);g.stroke();
      for(let i=0;i<8;i++){const a=i*Math.PI/4+p*.7,r=wave.radius*p;g.fillStyle=wave.color;g.beginPath();g.arc(wave.x+Math.cos(a)*r,wave.y+Math.sin(a)*r*.55,1.3*(1-p),0,Math.PI*2);g.fill();}}
    for(const echo of echoes){echo.age+=dt;if(echo.age<.4){g.globalAlpha=(1-echo.age/.4)*.2;drawChar(g,echo.x,echo.y,echo.dir,echo.f,false,tm*10,false,echo.ap);}}
    for(let i=waves.length-1;i>=0;i--)if(waves[i].age>=waves[i].duration)waves.splice(i,1);
    for(let i=echoes.length-1;i>=0;i--)if(echoes[i].age>=.4)echoes.splice(i,1);
    g.restore();
  };
  const respawn=classCombat.onRespawn;classCombat.onRespawn=function(){waves.length=echoes.length=0;return respawn();};
  window.combatVisuals={pulse,waves};
})();
