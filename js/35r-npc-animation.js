/* Six authored full-body frames per role, fixed feet and scale; no card bobbing. */
(function(){
 const image=new Image();image.src=artworkURL('Character/NPC/Motion/city-v1.png');
 const roles={forge:0,shop:0,quest:1,mentor:2,skills:2,sectSkills:2,rank:2,arena:3,'field-road':3};
 const fallback=creatureArt.drawNpc;
 creatureArt.drawNpc=function(ctx,s){const row=roles[s.id];if(row===undefined)return fallback(ctx,s);if(!image.complete||!image.naturalWidth)return fallback(ctx,s);
  const t=matchMedia('(prefers-reduced-motion: reduce)').matches?0:worldMap.environmentClock||0;
  const phase=(t+(s.x%43)*.07)%(row===0?3:6),n=Math.floor(phase*(row===0?2:1))%6,size=256,scale=(row===3?62:60)/256;
  ctx.save();ctx.imageSmoothingQuality='high';ctx.drawImage(image,n*size,row*size,size,size,s.x-size*scale/2,s.y-250*scale,size*scale,size*scale);ctx.restore();return true;
 };
 creatureArt.npcHeight=s=>roles[s.id]!==undefined?60:36;
 const portraits=new Map(),original=creatureArt.decorateDialog;
 creatureArt.decorateDialog=function(title){original(title);const target=$('npc-dialog-portrait');if(!target||!image.complete||!image.naturalWidth)return;const role=/Luyện Khí|Bảo Khí/.test(title)?0:/Vân Châu/.test(title)?1:/Đấu trường/.test(title)?3:2;if(!portraits.has(role)){const c=document.createElement('canvas');c.width=128;c.height=128;c.getContext('2d').drawImage(image,0,role*256,256,256,0,0,128,128);portraits.set(role,c.toDataURL());}target.src=portraits.get(role);};
 window.npcAnimation={image,roles};
})();
