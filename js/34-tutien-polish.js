/* Tiên Lộ polish: atmosphere tu tiên + MMORPG HUD/VFX dùng đúng sprites có sẵn.
   Không đổi gameplay số liệu, chỉ bọc drawGroundDetails/mon/drawChar/dr/up. */
(function(){
  'use strict';
  if(window.__tutienPolish)return;window.__tutienPolish=true;
  const SECT=['#7bcaff','#80ffe3','#bf95ff','#ffdc91'];
  const SECT_GLOW=['rgba(123,202,255,','rgba(128,255,227,','rgba(191,149,255,','rgba(255,220,145,'];
  const ready=img=>img&&img.complete&&img.naturalWidth>0;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img=src=>{const i=new Image();try{i.src=artworkURL(src);}catch(e){i.src=src;}return i;};
  const cloudImg=img('Map/sprites/cloud.png');
  const lanternImg=img('Map/sprites/lantern.png');
  const portalImg=img('Map/sprites/portal.png');

  /* ---------- trạng thái hiệu ứng ---------- */
  let shake=0,flash=0,killFlash=0,envT=0;
  const motes=[];for(let i=0;i<40;i++)motes.push({ox:Math.random(),oy:Math.random(),s:.6+Math.random()*1.6,sp:4+Math.random()*10,ph:Math.random()*6.28});
  const beams=[]; // cột sáng loot khi hạ quái tinh anh/boss

  function sect(){try{return P.ap?.w??0;}catch(e){return 0;}}
  function realmColor(){try{return (typeof RC!=='undefined'&&RC[P.r])||'#d9a441';}catch(e){return '#d9a441';}}

  /* ---------- rung camera kiểu MMORPG (nhẹ, tắt khi reduced-motion) ---------- */
  try{
    const _gc=gameCamera;
    gameCamera=function(vw,vh){
      const c=_gc(vw!==undefined?vw:W/Z,vh!==undefined?vh:H/Z);
      if(shake>.2&&!reduced){c.x+=Math.sin(performance.now()*.09)*shake*.5;c.y+=Math.cos(performance.now()*.11)*shake*.35;}
      return c;
    };
  }catch(e){}

  /* ---------- nền đất thủy mặc + mây trôi parallax (dưới actors) ---------- */
  try{
    const prevGround=window.worldMap.drawGroundDetails;
    window.worldMap.drawGroundDetails=function(ctx,cx,cy,vw,vh){
      // Map tông môn đã có đảo vẽ tay (paintGround): không phủ gradient
      // đục lên trên, chỉ điểm thêm ở hub.
      const hub=window.worldMap.state.scene==='hub';
      try{
        if(hub){
        ctx.save();
        // Hub đã có nền vẽ tay (cỏ + lát đá): chỉ rắc bụi cỏ, KHÔNG phủ màu đục.
        // bụi cỏ khô rải rác, không kẻ lưới (kẻ lưới làm giả)
        ctx.fillStyle='rgba(120,180,150,.07)';
        for(let ix=0;ix<24;ix++){
          const gx=Math.floor((cx+ix*167)%160),gy=Math.floor((cy+ix*211)%160);
          const px=Math.floor(cx/160)*160+gx,py=Math.floor(cy/160)*160+gy;
          if(px>cx-10&&px<cx+vw+10&&py>cy-10&&py<cy+vh+10){ctx.fillRect(px,py,2,3);}
        }
        // hai lớp mây trôi sau núi, không che mục tiêu
        if(ready(cloudImg)&&!reduced){
          ctx.globalAlpha=.10;
          const t=envT*.008;
          for(let i=0;i<5;i++){
            const mx=cx+((i*430+t*60)%(vw+320))-160,my=cy+40+i*130;
            ctx.drawImage(cloudImg,mx,my,300,80);
          }
          ctx.globalAlpha=.06;
          for(let i=0;i<4;i++){
            const mx=cx+((i*610-t*90)%(vw+380))-190,my=cy+120+i*170;
            ctx.drawImage(cloudImg,mx,my,380,100);
          }
          ctx.globalAlpha=1;
        }
        ctx.restore();
        }else{prevGround(ctx,cx,cy,vw,vh);return;}
      }catch(e){}
      prevGround(ctx,cx,cy,vw,vh);
      // sương mỏng trên ao + đèn lồng phát sáng
      try{
        ctx.save();
        if(!reduced){
          const p=1+Math.sin(envT*.9)*.06;
          ctx.globalCompositeOperation='lighter';
          if(ready(lanternImg)){
            // đèn lồng quanh thành: tìm gần camera
            for(const lx of [650,1350])for(const ly of [780,950,1180,1340]){
              if(lx>cx-40&&lx<cx+vw+40&&ly>cy-40&&ly<cy+vh+40){
                const fl=.10+Math.sin(envT*2.2+lx)*.03;
                const gr=ctx.createRadialGradient(lx,ly-14,2,lx,ly-14,44*p);
                gr.addColorStop(0,'rgba(255,190,110,'+fl+')');gr.addColorStop(1,'rgba(255,190,110,0)');
                ctx.fillStyle=gr;ctx.fillRect(lx-44,ly-58,88,88);
              }
            }
          }else{
            ctx.fillStyle='rgba(255,190,110,.05)';
            ctx.fillRect(cx,cy,vw,vh);
          }
          ctx.globalCompositeOperation='source-over';
        }
        ctx.restore();
      }catch(e){}
    };
  }catch(e){}

  /* ---------- nameplate MMORPG: pill + chấm phái + viền cảnh giới ---------- */
  try{
    const _label=drawWorldLabel;
    drawWorldLabel=function(ctx,text,x,y,color,size){
      try{
        const s=size||8.5,rc=realmColor();
        ctx.save();ctx.font='600 '+s+'px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
        const w=ctx.measureText(text).width+18,h=s+9;
        const grd=ctx.createLinearGradient(x-w/2,y-h/2,x-w/2,y+h/2);
        grd.addColorStop(0,'rgba(14,28,36,.92)');grd.addColorStop(1,'rgba(9,18,26,.88)');
        ctx.fillStyle=grd;ctx.strokeStyle=rc;ctx.globalAlpha=.92;ctx.lineWidth=.8;
        ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,4);ctx.fill();ctx.stroke();
        ctx.globalAlpha=1;
        ctx.fillStyle=SECT[sect()];ctx.beginPath();ctx.arc(x-w/2+8,y,2.4,0,6.3);ctx.fill();
        ctx.fillStyle=color||'#f2e3c5';ctx.fillText(text,x+3,y+.4);
        ctx.restore();
      }catch(e){_label(ctx,text,x,y,color,size);}
    };
    window.drawWorldLabel=drawWorldLabel;
  }catch(e){}

  /* ---------- nhân vật: vòng cảnh giới + hào quang phái ---------- */
  try{
    const _dc=drawChar;
    drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap){
      try{
        const mine=ap===P.ap,idx=Number.isInteger(ap?.w)?ap.w:sect();
        if(!window.characterAuras?.realmFor(ap)&&!window.characterAuras?.trailFor(ap)){
        // vòng hồ quang cảnh giới dưới chân
        ctx.save();
        ctx.globalCompositeOperation='lighter';
        const rc=realmColor(),pulse=reduced?0:Math.sin(envT*3)*1.5;
        ctx.strokeStyle=rc;ctx.globalAlpha=mine?.5:.3;ctx.lineWidth=1.4;
        ctx.beginPath();ctx.ellipse(x,y+1,15+pulse,6+pulse*.4,0,0,6.3);ctx.stroke();
        ctx.strokeStyle=SECT[idx];ctx.globalAlpha=mine?.35:.2;ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(x,y+1,21+pulse*1.4,8.5+pulse*.5,0,0,6.3);ctx.stroke();
        ctx.restore();
        }
      }catch(e){}
      _dc(ctx,x,y,dir,facing,moving,phase,attacking,ap);
      try{
        // tia sáng khi đánh + hồi máu đả tọa
        if(attacking&&!reduced){
          ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;
          ctx.strokeStyle=SECT[Number.isInteger(ap?.w)?ap.w:0];ctx.lineWidth=1.6;
          ctx.beginPath();ctx.arc(x,y-18,20+Math.sin(envT*14)*3,-.6,.9);ctx.stroke();
          ctx.restore();
        }
      }catch(e){}
    };
  }catch(e){}

  /* ---------- feedback on damage and kills ---------- */
  try{
    const _hit=hit;
    hit=function(e,power){
      const r=_hit(e,power);
      try{
        if(e&&power>0){
          shake=Math.min(7,shake+(e.t===2?4.5:power>atk()*1.5?2.2:.8));
          flash=Math.min(1,flash+.25);
          if(e.hp<=0){
            killFlash=1;
            shake=Math.min(9,shake+3);
            if(e.t===2||e.elite)beams.push({x:e.x,y:e.y,age:0});
            if(window.combatVisuals)combatVisuals.pulse(e.x,e.y-12,e.t===2?70:44,SECT[sect()],.5);
            spark(e.x,e.y-14,'#ffe2a4',e.t===2?26:12);
          }else if(window.combatVisuals&&(P.ap?.w??0)>=2){
            combatVisuals.pulse(e.x,e.y-12,Math.min(36,12+power*.08),SECT[sect()],.25);
          }
        }
      }catch(err){}
      return r;
    };
  }catch(e){}
  // Creature rendering owns silhouette hit flashes, boss labels and selected
  // health bars. No enclosing circles or automatic nearest-enemy reticles.


  /* ---------- vòng cast + cột sáng loot (trên cùng, additive) ---------- */
  try{
    const _dr=dr;
    dr=function(){
      _dr();
      try{
        if(paused&&paused())return;
        const cam=gameCamera(),vw=W/Z,vh=H/Z;
        g.save();g.setTransform(Z,0,0,Z,-cam.x*Z,-cam.y*Z);
        // hít thở mặt đất khi cast trận/ulti
        try{
          const cc=window.getClassCombatSafe?getClassCombatSafe():window.classCombat;
          const aimPt=cc?.state?.aim;
          if(aimPt&&window.skillAim?.isPreviewing()){
            g.save();g.globalCompositeOperation='lighter';g.globalAlpha=.20;
            g.fillStyle=SECT[sect()];
            g.beginPath();g.ellipse(aimPt.x,aimPt.y,40,20,0,0,6.3);g.fill();
            g.globalAlpha=.5;g.strokeStyle=SECT[sect()];g.lineWidth=1;
            g.beginPath();g.ellipse(aimPt.x,aimPt.y,40,20,0,0,6.3);g.stroke();
            g.restore();
          }
        }catch(e){}
        // cột sáng rơi đồ boss
        if(!reduced){
          g.save();g.globalCompositeOperation='lighter';
          for(const b of beams){
            const p=b.age/1.4,a=Math.max(0,1-p);
            g.globalAlpha=a*.5;
            const grd=g.createLinearGradient(b.x,b.y-110,b.x,b.y);
            grd.addColorStop(0,'rgba(255,210,130,0)');grd.addColorStop(1,'rgba(255,210,130,.85)');
            g.fillStyle=grd;g.fillRect(b.x-7,b.y-110,14,110);
            g.globalAlpha=a*.8;g.fillStyle='#ffe9bd';
            g.beginPath();g.ellipse(b.x,b.y,10*(1-p*.5),4,0,0,6.3);g.fill();
          }
          g.restore();
        }
        // bụi linh bay
        if(!reduced){
          g.save();g.globalCompositeOperation='lighter';
          for(const m of motes){
            const mx=cam.x+((m.ox*vw+envT*m.sp)%vw),my=cam.y+((m.oy*vh+envT*m.sp*.6)%vh);
            g.globalAlpha=.10+.08*Math.sin(envT*2+m.ph);
            g.fillStyle='#cfe8d8';g.fillRect(mx,my,m.s,m.s);
          }
          g.restore();
        }
        // chớp khi kết liễu
        if(killFlash>.02&&!reduced){
          g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='lighter';
          g.globalAlpha=killFlash*.10;g.fillStyle='#fff0c8';g.fillRect(0,0,W,H);
          g.restore();
        }
        // báo máu thấp
        try{
          const ratio=P.hp/mhp();
          if(ratio<.3&&P.hp>0){
            g.save();g.setTransform(1,0,0,1,0,0);
            g.globalAlpha=(.35+Math.sin(envT*5)*.15)*(1-ratio/.3);
            const vg=g.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.7);
            vg.addColorStop(0,'rgba(180,30,20,0)');vg.addColorStop(1,'rgba(180,30,20,.55)');
            g.fillStyle=vg;g.fillRect(0,0,W,H);g.restore();
          }
        }catch(e){}
        g.restore();
      }catch(e){}
    };
  }catch(e){}

  /* ---------- tick: môi trường + HUD mục tiêu ---------- */
  let targetEl=null;
  function ensureHUD(){
    if(targetEl||!document.body)return;
    targetEl=document.createElement('div');targetEl.id='target-frame';targetEl.hidden=true;
    targetEl.innerHTML='<b></b><div class="tbar"><i></i></div><small></small>';
    document.body.appendChild(targetEl);
  }
  try{
    const _up=up;
    up=function(dt){
      _up(dt);
      try{
        envT+=Math.max(0,dt||0);
        shake=Math.max(0,shake-dt*22);flash=Math.max(0,flash-dt*3);killFlash=Math.max(0,killFlash-dt*2.4);
        for(let i=beams.length-1;i>=0;i--){beams[i].age+=dt;if(beams[i].age>1.4)beams.splice(i,1);}
        ensureHUD();
        // khung mục tiêu MMORPG
        let t=null;try{t=window.cultivation?.basicSelection().target;}catch(e){}
        if(t&&!t.dead&&targetEl){
          targetEl.hidden=false;
          const k=(typeof T!=='undefined'&&T[t.t])||{n:'Yêu thú',hp:20};
          const max=t.maxHp||k.hp||20,r=Math.max(0,Math.min(1,t.hp/max));
          targetEl.querySelector('b').textContent=(t.name||k.n)+(t.t===2?' ♛':'');
          const bar=targetEl.querySelector('i');
          bar.style.width=(r*100)+'%';
          bar.style.background=t.t===2?'linear-gradient(#ffcf7a,#b8412f)':'linear-gradient(#e0603f,#9a3322)';
          targetEl.querySelector('small').textContent=Math.max(0,Math.ceil(t.hp))+' / '+max;
          targetEl.classList.toggle('boss',t.t===2);
        }else if(targetEl)targetEl.hidden=true;
      }catch(e){}
    };
  }catch(e){}

  /* ---------- CSS MMORPG: HUD tu tiên, khung mục tiêu, skill ---------- */
  const css=document.createElement('style');
  css.textContent=[
    '#hud{border:1px solid #c4ae73!important;background:linear-gradient(150deg,#1a2f3af2,#0b1723f5)!important;box-shadow:0 6px 20px #000b,inset 0 0 24px #5fb3a122!important}',
    '#hud b{color:#ffe9bd!important;text-shadow:0 0 10px #d9a44188!important}',
    '.bar{border:1px solid #0009!important;box-shadow:inset 0 1px 3px #000c,0 1px 0 #ffffff14!important;background:#07111c!important}',
    '.bar i{position:relative;transition:width .12s!important}',
    '.bar i:after{content:"";position:absolute;inset:0;background:linear-gradient(#ffffff59,transparent 55%)}',
    '#target-frame{position:fixed;left:50%;transform:translateX(-50%);top:calc(10px + env(safe-area-inset-top,0px));width:min(300px,60vw);padding:8px 12px 9px;background:linear-gradient(#1a2b33f2,#0b1723f5);border:1px solid #8a6d3b;border-radius:10px;z-index:3;text-align:center;pointer-events:none;box-shadow:0 4px 16px #000a}',
    '#target-frame.boss{border-color:#ffcf7a;box-shadow:0 0 18px #ffcf7a55,0 4px 16px #000a}',
    '#target-frame b{font:700 13px Arial;color:#ffe2a4;text-shadow:0 1px 3px #000}',
    '#target-frame .tbar{height:8px;margin:6px 0 4px;background:#07111c;border:1px solid #0009;border-radius:5px;overflow:hidden}',
    '#target-frame .tbar i{display:block;height:100%;width:0}',
    '#target-frame small{font:10px Arial;color:#b7c9cd}',
    '#sb .sk{border:1px solid #c4ae7355!important;box-shadow:inset 0 1px #f0ddae33,0 4px 14px #0008,0 0 10px #d9a44122!important}',
    '#log{color:#ffe9bd!important}',
    '.v{background:radial-gradient(ellipse at center,transparent 46%,rgba(10,14,16,.55) 78%,rgba(6,8,10,.8))!important}',
    '@media(max-width:700px){#target-frame{width:min(220px,52vw);top:calc(96px + env(safe-area-inset-top,0px))}}'
  ].join('\n');
  document.head.appendChild(css);
})();
