/* Realm badges use the supplied transparent artwork at its original aspect ratio. */
(function(){
 const forAppearance=(ap=P.ap)=>equipmentRules.realmTitles.find(t=>t.realm===(ap===P.ap?P.r:ap?.realm))||null;
 const width=94;
 function metrics(x,y,ap=P.ap){const meta=forAppearance(ap);if(!meta)return null;const entry=characterAuras.load(meta.art);if(!entry.ready)return null;
  const height=width*entry.canvas.height/entry.canvas.width;return{entry,x:x-width/2,y:y-characterAuras.bodyNameHeight(ap)-height-4,width,height};
 }
 function draw(ctx,x,y,ap=P.ap){const box=metrics(x,y,ap);if(!box)return;ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.globalCompositeOperation='source-over';ctx.globalAlpha=.97;ctx.shadowColor='rgba(5,12,20,.8)';ctx.shadowBlur=1.2;ctx.shadowOffsetY=.7;ctx.drawImage(box.entry.canvas,box.x,box.y,box.width,box.height);ctx.restore();}
 const character=drawChar;drawChar=function(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest){character(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest);if(ctx===g)draw(ctx,x,y,ap);};
 window.characterTitles={forAppearance,metrics,draw,height:ap=>forAppearance(ap)?width/3+4:0};
})();
