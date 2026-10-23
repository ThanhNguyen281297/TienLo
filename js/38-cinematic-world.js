/* Cinematic finishing pass. Presentation only: it never reads or writes gameplay state.
   Everything is drawn at 1/6 resolution into two small canvases and blitted once each,
   so the cost stays low on phones. */
(function(){
  'use strict';
  const SCALE=6,reduced=matchMedia('(prefers-reduced-motion:reduce)');
  const haze=document.createElement('canvas'),lights=document.createElement('canvas');
  const hz=haze.getContext('2d'),lt=lights.getContext('2d');
  let size='';

  // Static layer: cool atmospheric haze toward the far (top) edge and deep blue in the near corners.
  function paintHaze(w,h){
    hz.clearRect(0,0,w,h);
    let g=hz.createLinearGradient(0,0,0,h*.36);
    g.addColorStop(0,'rgba(128,172,196,.12)');g.addColorStop(.55,'rgba(128,172,196,.04)');g.addColorStop(1,'rgba(128,172,196,0)');
    hz.fillStyle=g;hz.fillRect(0,0,w,h*.36);
    g=hz.createLinearGradient(0,h*.66,0,h);
    g.addColorStop(0,'rgba(8,22,40,0)');g.addColorStop(1,'rgba(8,22,40,.20)');
    hz.fillStyle=g;hz.fillRect(0,h*.66,w,h*.34);
    g=hz.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.34,w*.5,h*.48,Math.max(w,h)*.74);
    g.addColorStop(0,'rgba(10,26,46,0)');g.addColorStop(1,'rgba(10,26,46,.12)');
    hz.fillStyle=g;hz.fillRect(0,0,w,h);
  }

  // Animated layer: slow sun shafts and a warm pool of light that follows the player.
  function paintLights(w,h,t,px,py){
    lt.clearRect(0,0,w,h);
    const sway=reduced.matches?0:Math.sin(t*.18);
    for(let i=0;i<3;i++){
      const x0=w*(.06+i*.27+.03*Math.sin(t*.15+i*2.1)*(reduced.matches?0:1)),bandWidth=w*(.09+i*.012),drift=w*(.34+.03*sway);
      const g=lt.createLinearGradient(x0,0,x0+drift,h);
      const a=.045-i*.008; // sun shafts kept faint so terrain detail stays crisp
      g.addColorStop(0,'rgba(255,230,176,'+a+')');g.addColorStop(.55,'rgba(255,226,170,'+a*.4+')');g.addColorStop(1,'rgba(255,226,170,0)');
      lt.fillStyle=g;lt.beginPath();
      lt.moveTo(x0,0);lt.lineTo(x0+bandWidth,0);lt.lineTo(x0+bandWidth+drift,h);lt.lineTo(x0+drift,h);lt.closePath();lt.fill();
    }
    const r=Math.max(18,(typeof Z==='number'?Z:2)*115/SCALE),pulse=reduced.matches?1:.94+.06*Math.sin(t*1.3);
    const g=lt.createRadialGradient(px,py,0,px,py,r*pulse);
    g.addColorStop(0,'rgba(255,214,150,.13)');g.addColorStop(.5,'rgba(255,200,130,.05)');g.addColorStop(1,'rgba(255,200,130,0)');
    lt.fillStyle=g;lt.fillRect(px-r*1.05,py-r*1.05,r*2.1,r*2.1);
  }

  const baseDraw=dr;
  dr=function(){
    baseDraw();
    try{
      if(!P.ap||!W||!H)return;
      const w=Math.max(16,Math.ceil(W/SCALE)),h=Math.max(16,Math.ceil(H/SCALE)),key=w+'x'+h;
      if(key!==size){size=key;haze.width=lights.width=w;haze.height=lights.height=h;paintHaze(w,h);}
      const cam=gameCamera(),t=performance.now()/1000;
      paintLights(w,h,t,(P.x-cam.x)*Z/SCALE,(P.y-cam.y)*Z/SCALE);
      g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
      g.globalCompositeOperation='source-over';g.drawImage(haze,0,0,W,H);
      g.globalCompositeOperation='lighter';g.drawImage(lights,0,0,W,H);
      g.restore();
    }catch(e){g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';}
  };

  // Ground captions: soft shadow and a hairline edge instead of a heavy outline, so accents stay crisp on phones.
  window.drawWorldCaption=function(ctx,text,x,y,color='#e0e7da',size=6.5){
    ctx.save();
    const scale=Math.hypot(ctx.getTransform().a,ctx.getTransform().b)||1;
    ctx.font='700 '+size+'px "Noto Serif",Georgia,"Times New Roman",serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.shadowColor='rgba(2,8,14,.95)';ctx.shadowBlur=Math.max(2,size*scale*.34);ctx.shadowOffsetY=Math.max(.5,scale*.3);
    ctx.strokeStyle='rgba(3,10,16,.72)';ctx.lineWidth=Math.max(.45,1.1/scale*1.1);ctx.strokeText(text,x,y);
    ctx.shadowColor='transparent';ctx.fillStyle=color;ctx.fillText(text,x,y);
    ctx.restore();
  };

  // A 409 from the first world poll can land after the character is created; it is stale noise then.
  if(typeof msg==='function'){
    const baseMsg=msg;
    msg=function(text){if(text==='Hãy tạo nhân vật trước.'&&P.ap)return;return baseMsg(text);};
  }
})();
