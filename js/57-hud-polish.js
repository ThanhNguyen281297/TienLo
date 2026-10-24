/* Dọn HUD (giai đoạn đồ họa 2).
   - Activity icons: one row of the essentials; everything else lives in a "Thêm"
     drawer. Icons with a badge or a live event are promoted to the row by themselves.
   - Service names become small name plates that fade with distance, so the map
     is not covered in overlapping captions.
    Hub and spawn formation rings are toned down in 43/39 directly. */
(function(){
 const world=worldMap,hud=window.vlHud,strip=$('vl-activities');if(!hud||!strip)return;
 const PRIMARY=['welfare','kytran','quest','rift','mail','event'],MAX_ROW=7;
 const more=document.createElement('button');more.type='button';more.className='vl-activity vl-more';more.dataset.id='more';more.setAttribute('aria-label','Thêm hoạt động');more.setAttribute('aria-expanded','false');
 const canvas=document.createElement('canvas');canvas.width=canvas.height=96;const badge=document.createElement('i');badge.hidden=true;const label=document.createElement('span');label.textContent='Thêm';more.append(canvas,badge,label);
 // A painted "grid of four" glyph on the same round plate as the other icons.
 function paintMore(open){hud.paint(canvas,null);const c=canvas.getContext('2d'),s=96;c.save();c.translate(s/2,s/2);c.fillStyle=open?'#ffe7a0':'#f3d58a';c.strokeStyle='#5a3a10';c.lineWidth=2;
  if(open){c.lineWidth=7;c.lineCap='round';c.strokeStyle='#ffe7a0';c.beginPath();c.moveTo(-14,-14);c.lineTo(14,14);c.moveTo(14,-14);c.lineTo(-14,14);c.stroke();}
  else for(const [x,y] of [[-12,-12],[12,-12],[-12,12],[12,12]]){c.beginPath();c.roundRect(x-8,y-8,16,16,4);c.fill();c.stroke();}c.restore();}
 paintMore(false);
 const drawer=document.createElement('nav');drawer.id='vl-drawer';drawer.setAttribute('aria-label','Hoạt động khác');drawer.hidden=true;document.body.append(drawer);
 let open=false;more.onclick=()=>{if(paused())return;open=!open;layout();};
 document.addEventListener('pointerdown',e=>{if(open&&!drawer.contains(e.target)&&!more.contains(e.target)){open=false;layout();}});
 const buttons=()=>[...strip.querySelectorAll('.vl-activity'),...drawer.querySelectorAll('.vl-activity')].filter(b=>b!==more);
 const order=b=>{const i=PRIMARY.indexOf(b.dataset.id);return i<0?99:i;};
 let lastKey='';const narrowScreen=matchMedia('(max-width:520px)');
 function layout(){const all=buttons(),hot=b=>b.classList.contains('live')||(b.querySelector('i')&&!b.querySelector('i').hidden);
  const narrow=narrowScreen.matches,row=all.filter(b=>PRIMARY.slice(0,narrow?3:5).includes(b.dataset.id)).sort((a,b)=>order(a)-order(b));
  if(!narrow)for(const b of all)if(!row.includes(b)&&hot(b)&&row.length<MAX_ROW)row.push(b);
  const rest=all.filter(b=>!row.includes(b));
  const key=row.map(b=>b.dataset.id).join()+'|'+rest.map(b=>b.dataset.id).join()+'|'+open;
  if(key!==lastKey){lastKey=key;strip.replaceChildren(...row,more);drawer.replaceChildren(...rest);}
  let hidden=0;for(const b of rest){const i=b.querySelector('i');if(i&&!i.hidden)hidden+=Number(i.textContent)||1;}
  badge.hidden=!hidden;badge.textContent=hidden;more.classList.toggle('live',rest.some(b=>b.classList.contains('live')));
  drawer.hidden=!open||!rest.length;more.setAttribute('aria-expanded',String(open));paintMore(open);strip.style.setProperty('--row',row.length+1);}
 setInterval(layout,400);layout();
 drawer.addEventListener('click',e=>{if(e.target.closest('.vl-activity')){open=false;setTimeout(layout,0);}});

 // ---------- service name plates (fade with distance)
 window.drawServicePlate=function(ctx,text,x,y,color,service){
  const d=Math.hypot(x-P.x,(y-P.y)*1.4),near=world.state.near===service,alpha=near?1:Math.max(0,Math.min(1,(520-d)/220));if(alpha<=.02)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.font='700 6.2px "Noto Serif",Georgia,serif';const w=ctx.measureText(text).width+10,h=9.5;
  ctx.fillStyle='rgba(10,20,26,.72)';ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,4.5);ctx.fill();
  ctx.lineWidth=.6;ctx.strokeStyle=near?'rgba(255,222,140,.95)':'rgba(214,170,82,.55)';ctx.stroke();
  ctx.fillStyle=color||'#f3e3b4';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x,y+.3);ctx.restore();};

 const css=document.createElement('style');css.textContent=`
#vl-activities{grid-template-columns:repeat(var(--row,5),52px)!important;grid-auto-flow:column}
.vl-activity span{max-width:56px;overflow:hidden;text-overflow:ellipsis;font-size:9.5px!important}
#vl-drawer{position:fixed;top:72px;right:148px;z-index:6;display:grid;grid-template-columns:repeat(4,56px);gap:8px 6px;padding:10px 10px 8px;border-radius:12px;border:1px solid #c9a96088;background:linear-gradient(160deg,#14262ef4,#0d1a20f4);box-shadow:0 8px 24px #000a}
#vl-drawer[hidden]{display:none}#vl-drawer .vl-activity span{color:#fff3cf}
body:not(.vl-hud) #vl-drawer{display:none!important}
.vl-more[aria-expanded=true] canvas{filter:drop-shadow(0 0 6px #ffcf6a) drop-shadow(0 2px 3px #000a)!important}
@media(max-width:700px),(max-height:500px){#vl-activities{grid-template-columns:repeat(var(--row,5),44px)!important}#vl-drawer{top:58px;right:120px;grid-template-columns:repeat(4,48px)}#vl-drawer .vl-activity canvas{width:36px!important;height:36px!important}}
@media(max-height:500px){body.vl-hud #event-banner{top:64px;max-width:220px;font-size:10px;padding:3px 10px;opacity:.92}}
@media(max-width:520px){#vl-activities{grid-template-columns:repeat(var(--row,5),40px)!important;right:112px}#vl-drawer{right:8px;top:60px}}`;
 document.head.append(css);
 window.hudPolish={layout};
})();
