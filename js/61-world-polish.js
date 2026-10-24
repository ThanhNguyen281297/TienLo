/* World polish (graphics pass 3). Presentation only.
   - Thiên Vân Thành minimap: the floating city as an isometric deck with its
     buildings, gates and NPCs, instead of a pale square in the middle of the dial. */
(function(){
 'use strict';
 const world=worldMap;
 const mini=world.renderMini;
 world.renderMini=function(ctx,size){
  if(world.state.scene!=='hub')return mini(ctx,size);
  const deck=world.hubDeck||{rx:740,ry:470},cx=1000,cy=1100,span=deck.rx*2+160,k=size/span;
  ctx.save();ctx.fillStyle='#112630';ctx.fillRect(0,0,size,size);
  ctx.translate(size/2,size/2+size*.04);ctx.scale(k,k);ctx.translate(-cx,-cy);
  const diamond=(x,y,rx,ry)=>{ctx.beginPath();ctx.moveTo(x,y-ry);ctx.lineTo(x+rx,y);ctx.lineTo(x,y+ry);ctx.lineTo(x-rx,y);ctx.closePath();};
  // island thickness, deck, plaza and road
  diamond(cx,cy+60,deck.rx,deck.ry);ctx.fillStyle='#3a4a44';ctx.fill();
  diamond(cx,cy,deck.rx,deck.ry);ctx.fillStyle='#d9ccad';ctx.fill();ctx.lineWidth=14;ctx.strokeStyle='#8f7a55';ctx.stroke();
  diamond(cx,1170,330,165);ctx.fillStyle='#c4b28a';ctx.fill();
  ctx.fillStyle='#b39b70';ctx.fillRect(cx-28,830,56,650);
  diamond(cx,1170,90,46);ctx.fillStyle='#3f9b86';ctx.fill();
  // buildings as warm roofs
  for(const b of world.buildings||[]){const w=Math.max(50,(b.w||80)*.6);diamond(b.x,b.y-w*.15,w*.55,w*.3);ctx.fillStyle=b.key==='portal'?'#6fc3e8':'#5a4636';ctx.fill();}
  // gates and NPCs
  for(const s of world.services){ctx.beginPath();ctx.arc(s.x,s.y,s.npc?22:28,0,Math.PI*2);ctx.fillStyle=s.npc?'#f1d48a':'#7fd6ff';ctx.fill();ctx.lineWidth=6;ctx.strokeStyle='#1a1208';ctx.stroke();}
  // player
  ctx.beginPath();ctx.arc(P.x,P.y,34,0,Math.PI*2);ctx.fillStyle='#ffffff';ctx.fill();ctx.lineWidth=10;ctx.strokeStyle='#e04a3a';ctx.stroke();
  ctx.restore();
 };
})();
