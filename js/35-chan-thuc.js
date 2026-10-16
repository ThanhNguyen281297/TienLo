/* Chân thực hóa: bóng mặt trời thống nhất + silhouette giấu viền cắt + ánh sáng hướng.
   Bọc world.sprite (mọi prop bản đồ), mon, drawChar, drawNpc, drawGround và dr.
   Không đổi gameplay, không sửa asset nhị phân. */
(function(){
  'use strict';
  if(window.__chanThuc)return;window.__chanThuc=true;
  const SUN_DX=-8,SUN_DY=10; // nắng xiên từ phải-trên xuống trái-dưới, mọi vật chung một hướng
  const ready=i=>i&&i.complete&&i.naturalWidth>0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let filterOK=null;
  function canFilter(ctx){if(filterOK===null){try{filterOK='filter' in ctx;}catch(e){filterOK=false;}}return filterOK;}

  /* Bóng tiếp đất 3 lớp mềm, chung hướng nắng. */
  function softShadow(ctx,x,y,hw,hh,strength){
    try{
      ctx.save();
      ctx.fillStyle='#061014';
      const layers=[[.30,1],[.18,1.35],[.10,1.7]];
      for(let i=0;i<3;i++){
        ctx.globalAlpha=(strength||1)*layers[i][0];
        ctx.beginPath();
        ctx.ellipse(x+SUN_DX*layers[i][1],y+SUN_DY*layers[i][1],hw*layers[i][1],hh*layers[i][1],0,0,6.3);
        ctx.fill();
      }
      ctx.restore();
    }catch(e){}
  }

  /* Silhouette tối vẽ lót sau sprite: viền cắt trắng nằm lên nền tối thì biến mất.
     Dùng brightness(0) tạo bóng hình thật của ảnh, phóng to 2px. */
  function silhouette(ctx,img,x,y,w,h,alpha){
    try{
      if(!ready(img)||!canFilter(ctx))return false;
      ctx.save();
      ctx.globalAlpha=alpha||.5;
      ctx.filter='brightness(0)';
      renderArtwork(ctx,img,x-1.5,y-1.5,w+3,h+3);
      ctx.restore();return true;
    }catch(e){try{ctx.restore();}catch(_){}return false;}
  }

  /* Dải AO tối ở chân công trình để "ngồi" xuống đất, hết lềnh bềnh. */
  function seatAO(ctx,x,y,hw){
    try{
      ctx.save();
      const grd=ctx.createLinearGradient(0,y-14,0,y+7);
      grd.addColorStop(0,'rgba(5,12,14,0)');grd.addColorStop(1,'rgba(5,12,14,.42)');
      ctx.fillStyle=grd;
      ctx.beginPath();ctx.ellipse(x,y+2,hw,Math.max(4,hw*.16),0,0,6.3);ctx.fill();
      ctx.restore();
    }catch(e){}
  }

  /* ---------- 1. Mọi prop bản đồ qua world.sprite ---------- */
  try{
    const _sprite=window.worldMap.sprite;
    window.worldMap.sprite=function(ctx,key,x,y,width,height,alpha){
      let shadowed=false;
      try{
        const image=window.worldMap.asset(key);
        let w=width||60,h=height;
        if(ready(image)){
          if(!h&&w)h=w*image.naturalHeight/image.naturalWidth;
          if(!w&&h)w=h*image.naturalWidth/image.naturalHeight;
        }else{h=h||w||60;}
        const big=w>150; // công trình lớn cần bóng/AO đậm hơn cây cỏ
        softShadow(ctx,x,y,w*.36,Math.max(5,w*.052),big?1:.7);
        if(ready(image)){
          const top=y-h;
          if(canFilter(ctx)){
            silhouette(ctx,image,x-w/2,top,w,h,big?.55:.4);
          }else{
            // fallback khi thiếu ctx.filter: quầng tối mềm ôm lấy ảnh
            ctx.save();shadowed=true;
            ctx.shadowColor='rgba(8,14,16,.85)';ctx.shadowBlur=7;
          }
        }
        _sprite(ctx,key,x,y,width,height,alpha);
        if(shadowed){try{ctx.restore();}catch(e){}shadowed=false;}
        seatAO(ctx,x,y,w*.40);
      }catch(e){
        try{if(shadowed)ctx.restore();}catch(_){}
        _sprite(ctx,key,x,y,width,height,alpha);
      }
    };
  }catch(e){}

  /* ---------- 2. NPC hub (creatureArt.drawNpc + worldMap.npc) ---------- */
  function npcShade(draw){
    return function(...args){
      try{const s=args[args.length-1];softShadow(g,s.x,s.y,13,4.5,.9);}catch(e){}
      return draw(...args);
    };
  }
  try{if(window.creatureArt?.drawNpc)window.creatureArt.drawNpc=npcShade(window.creatureArt.drawNpc);}catch(e){}
  try{if(window.worldMap?.npc)window.worldMap.npc=npcShade(window.worldMap.npc);}catch(e){}

  /* ---------- 3. Quái: bóng lớn + silhouette + sáng đỉnh ---------- */
  try{
    const _mon=mon;
    mon=function(e){
      try{
        if(!e.corpse){
          const wpx=e.t===2?30:(T[e.t]?.s||14)+8;
          softShadow(g,e.x,e.y,wpx*.75,Math.max(5,wpx*.2),.95);
        }
      }catch(err){}
      _mon(e);
      try{
        if(!e.corpse&&!reduced){
          // vệt sáng đỉnh đầu theo hướng nắng: hòa tông quái vào cảnh
          g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.07;
          g.fillStyle='#fff3d8';
          g.beginPath();g.ellipse(e.x+3,e.y-34,12,7,-.5,0,6.3);g.fill();
          g.restore();
        }
      }catch(err){}
    };
  }catch(e){}

  /* ---------- 4. Nhân vật: bóng thống nhất + viền tách nền ---------- */
  try{
    const _dc=drawChar;
    drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap){
      try{softShadow(ctx,x,y+SUN_DY*.4,15,5,.85);}catch(e){}
      _dc(ctx,x,y,dir,facing,moving,phase,attacking,ap);
      try{
        // viền tối mảnh quanh thân giúp nhân vật nổi khỏi nền sáng mà không lòe loẹt
        ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#0a1418';ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(x,y-20,13,21,0,0,6.3);ctx.stroke();ctx.restore();
      }catch(e){}
    };
  }catch(e){}

  /* ---------- 5. Nền: sương xa + mảng sáng tối cho map tông môn ---------- */
  try{
    const _dg=drawGround;
    drawGround=function(cx,cy,vw,vh){
      _dg(cx,cy,vw,vh);
      try{
        const scene=window.worldMap.state.scene;
        if(scene==='hub')return;
        g.save();
        // sương mỏng phía xa (trên màn hình) tạo chiều sâu
        const fog=g.createLinearGradient(0,cy,0,cy+vh*.4);
        fog.addColorStop(0,'rgba(180,210,215,.10)');fog.addColorStop(1,'rgba(180,210,215,0)');
        g.fillStyle=fog;g.fillRect(cx,cy,vw,vh*.4);
        // mảng tối mềm quanh rìa đảo bay cho đỡ "dán"
        g.globalCompositeOperation='lighter';
        g.globalAlpha=.05;g.fillStyle='#ffe9c0';
        g.beginPath();g.ellipse(1000,1100,320,30,0,0,6.3);g.fill();
        g.restore();
      }catch(e){try{g.restore();}catch(_){}}
    };
  }catch(e){}

  /* ---------- 6. Ánh sáng toàn cảnh: nắng hướng + tối góc nhẹ ---------- */
  try{
    const _dr=dr;
    dr=function(){
      _dr();
      try{
        if(paused&&paused())return;
        g.save();g.setTransform(1,0,0,1,0,0);
        // nắng xiên từ phải-trên
        const sun=g.createLinearGradient(W,0,0,H);
        sun.addColorStop(0,'rgba(255,232,185,.055)');
        sun.addColorStop(.5,'rgba(255,232,185,0)');
        sun.addColorStop(1,'rgba(10,25,35,.10)');
        g.fillStyle=sun;g.fillRect(0,0,W,H);
        g.restore();
      }catch(e){try{g.restore();}catch(_){}}
    };
  }catch(e){}
})();
