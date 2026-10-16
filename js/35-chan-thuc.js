/* Ánh sáng môi trường nhẹ. Asset dùng trực tiếp màu và bóng vẽ sẵn trong PNG. */
(function(){
  'use strict';
  if(window.__chanThuc)return;window.__chanThuc=true;
  const ground=drawGround;
  drawGround=function(cx,cy,vw,vh){
    ground(cx,cy,vw,vh);
    if(worldMap.state.scene==='hub')return;
    g.save();
    const fog=g.createLinearGradient(0,cy,0,cy+vh*.32);
    fog.addColorStop(0,'rgba(180,210,215,.045)');fog.addColorStop(1,'rgba(180,210,215,0)');
    g.fillStyle=fog;g.fillRect(cx,cy,vw,vh*.32);g.restore();
  };
  const draw=dr;
  dr=function(){
    draw();if(paused())return;
    g.save();g.setTransform(1,0,0,1,0,0);
    const sun=g.createLinearGradient(W,0,0,H);
    sun.addColorStop(0,'rgba(255,232,185,.025)');sun.addColorStop(.5,'rgba(255,232,185,0)');sun.addColorStop(1,'rgba(10,25,35,.045)');
    g.fillStyle=sun;g.fillRect(0,0,W,H);g.restore();
  };
})();
