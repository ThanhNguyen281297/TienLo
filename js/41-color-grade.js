/* Final colour grade, after the cinematic pass. Presentation only.
   - Self-overlay contrast: restores depth on pale stone maps that the additive
     sun shafts wash out (the city hub especially).
   - Soft vignette, painted once per size at 1/4 resolution.
   One full-screen blit per frame; skipped on very large touch screens. */
(function(){
  'use strict';
  const coarse=matchMedia('(pointer:coarse)');
  // contrast = overlay alpha of the frame onto itself; vignette = edge darkness.
  // Pale paved maps (city + four sect grounds) get a warm tone pull-down.
  const STONE={tone:'rgb(222,212,198)',contrast:.42,vignette:.18};
  const PROFILES={hub:STONE,sword:STONE,moon:STONE,thunder:STONE,mystic:STONE,default:{contrast:.24,vignette:.14}};
  const profile=scene=>PROFILES[scene]||PROFILES.default;
  const vig=document.createElement('canvas'),vc=vig.getContext('2d');let vigKey='';
  function paintVignette(w,h,strength){
    const key=w+'x'+h+':'+strength;if(key===vigKey)return;vigKey=key;
    vig.width=Math.max(8,Math.ceil(w/4));vig.height=Math.max(8,Math.ceil(h/4));
    const vw=vig.width,vh=vig.height,gr=vc.createRadialGradient(vw/2,vh*.48,Math.min(vw,vh)*.38,vw/2,vh*.48,Math.hypot(vw,vh)*.58);
    gr.addColorStop(0,'rgba(12,16,22,0)');gr.addColorStop(1,'rgba(12,16,22,'+strength+')');
    vc.clearRect(0,0,vw,vh);vc.fillStyle=gr;vc.fillRect(0,0,vw,vh);
  }
  let enabled=true,frameCost=0;
  const baseDraw=dr;
  dr=function(){
    const start=performance.now();
    baseDraw();
    // Rolling cost of the scene itself; slow devices drop the self-overlay blit.
    frameCost=frameCost?frameCost*.95+(performance.now()-start)*.05:performance.now()-start;
    if(!enabled)return;
    try{
      if(!P.ap||!W||!H)return;
      const p=profile(window.worldMap?.state?.scene);
      g.save();g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;
      // Tone: a light warm multiply pulls blown-out pale stone back from white.
      if(p.tone){g.globalCompositeOperation='multiply';g.fillStyle=p.tone;g.fillRect(0,0,W,H);}
      if(frameCost<22&&!(coarse.matches&&W*H>5000000)){
        g.globalCompositeOperation='overlay';g.globalAlpha=p.contrast;g.drawImage(cv,0,0);
      }
      paintVignette(W,H,p.vignette);
      g.globalCompositeOperation='source-over';g.globalAlpha=1;g.drawImage(vig,0,0,W,H);
      g.restore();
    }catch(e){enabled=false;try{g.restore();}catch(_){}}
  };
  window.colorGrade={PROFILES,set enabled(v){enabled=!!v;},get enabled(){return enabled;},get frameCost(){return frameCost;}};
})();
