/* Cache downsampled levels for painted art. No upscaling or invented detail. */
(function(){
  const revision=new URL(document.currentScript.src).searchParams.get('v');
  window.artworkURL=src=>revision?src+(src.includes('?')?'&':'?')+'v='+encodeURIComponent(revision):src;
  const levels=new WeakMap();
  function draw(ctx,image,x,y,width,height){
    const sw=image.naturalWidth||image.width,sh=image.naturalHeight||image.height;
    if(!sw||!sh||width<=0||height<=0)return;
    const matrix=ctx.getTransform(),sx=Math.hypot(matrix.a,matrix.b),sy=Math.hypot(matrix.c,matrix.d);
    const target=Math.max(width*sx/sw,height*sy/sh);
    let source=image;
    if(target<.5&&!/\.svg(?:[?#]|$)/i.test(image.currentSrc||image.src||'')){
      let chain=levels.get(image);if(!chain){chain=[image];levels.set(image,chain);}
      let index=0,ratio=1;
      while(ratio*.5>=target&&Math.min(sw,sh)*ratio>96){
        index++;ratio*=.5;
        if(!chain[index]){
          const previous=chain[index-1],canvas=document.createElement('canvas');
          canvas.width=Math.max(1,Math.round(sw*ratio));canvas.height=Math.max(1,Math.round(sh*ratio));
          const context=canvas.getContext('2d');context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
          context.drawImage(previous,0,0,canvas.width,canvas.height);chain[index]=canvas;
        }
        source=chain[index];
      }
    }
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,x,y,width,height);
  }
  window.renderArtwork=draw;
  // Compact labels retain Vietnamese accents without thick outlines hiding glyphs.
  window.drawWorldLabel=function(ctx,text,x,y,color='#ead6aa',size=8.5){
    ctx.save();ctx.font='600 '+size+'px Arial, sans-serif';ctx.textAlign='center';
    ctx.textBaseline='middle';ctx.lineJoin='round';
    const width=ctx.measureText(text).width+10,height=size+7;
    ctx.fillStyle='rgba(9,22,31,.82)';ctx.strokeStyle='rgba(192,174,125,.38)';ctx.lineWidth=.55;
    ctx.beginPath();ctx.roundRect(x-width/2,y-height/2,width,height,3);ctx.fill();ctx.stroke();
    ctx.fillStyle=color;ctx.fillText(text,x,y+.2);ctx.restore();
  };
  // Ground captions have no panel, faction dot or second description line.
  window.drawWorldCaption=function(ctx,text,x,y,color='#e0e7da',size=6.5){
    ctx.save();ctx.font='500 '+size+'px Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';
    ctx.strokeStyle='rgba(9,24,30,.85)';ctx.lineWidth=1.5;ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();
  };
})();
