/* Ánh sáng thống nhất (giai đoạn đồ họa 2).
   - One sun for every map: light from the upper left, so actors cast a soft
     shadow toward the lower right whose length follows the time of day.
   - Day/night follows Vietnam time (dawn, day, dusk, night). Night is a tinted
     overlay with holes cut by lanterns, portals and a light around the player;
     lanterns and portals also glow additively and flicker.
   - Players can turn the cycle off (always day) from the ⚙ menu. */
(function(){
 const world=worldMap;
 const state={on:true,hour:null};try{state.on=localStorage.getItem('tienlo.daynight')!=='0';}catch{}
 const hourVN=()=>{if(state.hour!=null)return state.hour;const d=new Date(),u=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600;return (u+7)%24;};
 // Keyframes: hour -> light-map colour (multiplied over the frame) and sun strength.
 // Night keeps colours readable (blue moonlight), dusk is warm, the day is untouched.
 const KEYS=[[0,[82,96,150],0],[4.6,[82,96,150],0],[5.6,[170,150,185],.25],[6.6,[255,214,190],.7],[8,[255,255,255],1],
  [16,[255,255,255],1],[17.3,[255,214,170],.75],[18.4,[230,170,160],.35],[19.3,[120,120,170],.05],[20.2,[82,96,150],0],[24,[82,96,150],0]];
 function phase(h=hourVN()){if(!state.on)return {rgb:[255,255,255],alpha:0,sun:1,h:12};let i=0;while(i<KEYS.length-2&&KEYS[i+1][0]<=h)i++;const [h0,c0,s0]=KEYS[i],[h1,c1,s1]=KEYS[i+1],t=(h-h0)/(h1-h0||1),rgb=c0.map((v,k)=>Math.round(v+(c1[k]-v)*t));
  return {rgb,alpha:1-Math.min(...rgb)/255,sun:s0+(s1-s0)*t,h};}
 const NO_NIGHT=new Set(['arena','duel','tower']); // indoor-ish arenas keep their own light

 // ---------------------------------------------------------------- cast shadows
 const blob=document.createElement('canvas');blob.width=64;blob.height=32;{const c=blob.getContext('2d'),gr=c.createRadialGradient(32,16,0,32,16,16);gr.addColorStop(0,'rgba(8,14,20,.6)');gr.addColorStop(.6,'rgba(8,14,20,.25)');gr.addColorStop(1,'rgba(8,14,20,0)');c.setTransform(2,0,0,1,0,0);c.fillStyle=gr;c.fillRect(0,0,32,32);}
 let frame=null;
 function cast(ctx,x,y,height){if(ctx!==g||!frame||frame.sun<.05)return;const len=height*frame.len,w=Math.max(6,height*.22);
  ctx.save();ctx.globalAlpha*=.42*frame.sun;ctx.translate(x+frame.dx*len*.5,y+frame.dy*len*.5);ctx.rotate(frame.angle);ctx.drawImage(blob,-len*.55,-w/2,len*1.1,w);ctx.restore();}
 const baseChar=drawChar;drawChar=function(ctx,x,y,dir,f,moving,t,attack,ap,...rest){if(ap)cast(ctx,x,y,62);return baseChar.call(this,ctx,x,y,dir,f,moving,t,attack,ap,...rest);};
 if(typeof mon==='function'){const baseMon=mon;mon=function(e){if(!e.corpse&&!e.duelTarget&&!e.pvpTarget){const kind=window.expeditionMonsters?.kinds.get(e.skin);cast(g,e.x,e.y,kind?kind.height*(e.boss?1.25:1):40);}return baseMon(e);};}
 if(window.creatureArt?.drawNpc){const baseNpc=creatureArt.drawNpc;creatureArt.drawNpc=function(ctx,s){cast(ctx,s.x,s.y,64);return baseNpc.call(this,ctx,s);};}

 // ---------------------------------------------------------------- light sources
 const LANTERN=/lantern|theme-14-01[2678]|theme-14-02[23]|theme-14-033|theme-12-023|theme-10-009|theme-15-013|theme-11-026|theme-14-010/;
 let sources=[],sourceKey='';
 function collect(){const orn=typeof world.ornamentItems==='function'?world.ornamentItems():world.ornamentItems,items=[...(world.buildings||[]),...(Array.isArray(orn)?orn:[])],key=world.state.scene+':'+items.length+':'+world.services.length;if(key===sourceKey)return sources;sourceKey=key;sources=[];
  for(const b of items){const k=b.key||'';if(LANTERN.test(k))sources.push({x:b.x,y:b.y-(k==='theme-14-010'?70:(b.w||24)*1.2),r:k==='theme-14-010'?130:105,rgb:[255,190,110],flicker:true});
   else if(k==='portal'||/theme-14-0(06|49|64|72)/.test(k))sources.push({x:b.x,y:b.y-20,r:120,rgb:[120,200,255]});}
  for(const s of world.services)if(!s.npc)sources.push({x:s.x,y:s.y-24,r:120,rgb:[120,200,255]});
  return sources;}

 // ---------------------------------------------------------------- night overlay (half resolution)
 const lm=document.createElement('canvas'),lc=lm.getContext('2d');
 const baseDraw=dr;
 dr=function(){
  const p=phase(),h=p.h;
  // Shadow length: long in the morning/evening, short at noon.
  const len=.38+Math.min(1,Math.abs(h-12.5)/6)*.62,angle=Math.atan2(.42,1);frame={sun:p.sun,len,angle,dx:Math.cos(angle),dy:Math.sin(angle)};
  baseDraw();
  if(!P.ap||!account.state.ready||p.alpha<.01||NO_NIGHT.has(world.state.scene))return;
  try{
   const vw=W/Z,vh=H/Z,{x:cx,y:cy}=gameCamera(vw,vh),k=.5,w=Math.ceil(W*k),hh=Math.ceil(H*k);if(lm.width!==w||lm.height!==hh){lm.width=w;lm.height=hh;}
   const lights=collect().filter(s=>s.x>cx-s.r&&s.x<cx+vw+s.r&&s.y>cy-s.r&&s.y<cy+vh+s.r).slice(0,48);
   lights.push({x:P.x,y:P.y-20,r:170,rgb:[255,236,200],player:true});
   // Light map: ambient colour, lights added on top, then multiplied over the frame.
   lc.globalCompositeOperation='source-over';lc.fillStyle='rgb('+p.rgb.join(',')+')';lc.fillRect(0,0,w,hh);
   const night=Math.min(1,p.alpha/.45);
   if(night>.1){lc.globalCompositeOperation='lighter';
    for(const s of lights){const flick=s.flicker?.92+Math.sin(tm*9+s.x)*.05+Math.sin(tm*13.7+s.y)*.03:1,x=(s.x-cx)*Z*k,y=(s.y-cy)*Z*k,r=s.r*Z*k*flick,gr=lc.createRadialGradient(x,y,0,x,y,r),c=s.rgb.join(','),a=(s.player?.55:.9)*night;
     gr.addColorStop(0,'rgba('+c+','+a+')');gr.addColorStop(.45,'rgba('+c+','+a*.45+')');gr.addColorStop(1,'rgba('+c+',0)');lc.fillStyle=gr;lc.fillRect(x-r,y-r,r*2,r*2);}}
   g.save();g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=true;g.globalCompositeOperation='multiply';g.drawImage(lm,0,0,W,H);
   // A little bloom around flames and portals.
   if(night>.3){g.globalCompositeOperation='lighter';
    for(const s of lights){if(s.player)continue;const flick=s.flicker?.85+Math.sin(tm*9+s.x)*.1+Math.sin(tm*13.7+s.y)*.05:1,x=(s.x-cx)*Z,y=(s.y-cy)*Z,r=s.r*.32*Z,gr=g.createRadialGradient(x,y,0,x,y,r);
     gr.addColorStop(0,'rgba('+s.rgb.join(',')+','+(.16*night*flick)+')');gr.addColorStop(1,'rgba('+s.rgb.join(',')+',0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);}}
   g.restore();
  }catch(e){state.error=e;g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';}
 };

 // ---------------------------------------------------------------- ⚙ menu toggle
 const toggle=document.createElement('button');toggle.type='button';toggle.id='daynight-toggle';
 const label=()=>{const p=phase();toggle.textContent=(state.on?'Ngày đêm: Bật':'Ngày đêm: Tắt')+(state.on?' · '+(p.alpha>.3?'Đêm':p.alpha>.05?'Bình minh / hoàng hôn':'Ngày'):'');};
 toggle.onclick=()=>{state.on=!state.on;try{localStorage.setItem('tienlo.daynight',state.on?'1':'0');}catch{}label();msg(state.on?'Bật chu kỳ ngày đêm theo giờ Việt Nam.':'Tắt ngày đêm: luôn là ban ngày.');};
 label();setInterval(label,60000);
 const badge=$('account-badge');if(badge)badge.append(toggle);
 const css=document.createElement('style');css.textContent=`#daynight-toggle{margin-top:4px;padding:5px 10px;border-radius:8px;border:1px solid #c9a96088;background:#14262e;color:#f3e3b4;font:600 12px Arial;min-height:0!important;cursor:pointer}`;document.head.append(css);
 window.lighting={state,phase,setHour:h=>{state.hour=h;label();},cast};
})();
