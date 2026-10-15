/* Cache downsampled levels for painted art. No upscaling or invented detail. */
(function(){
  const levels=new WeakMap();
  function draw(ctx,image,x,y,width,height){
    const sw=image.naturalWidth||image.width,sh=image.naturalHeight||image.height;
    if(!sw||!sh||width<=0||height<=0)return;
    const matrix=ctx.getTransform(),sx=Math.hypot(matrix.a,matrix.b),sy=Math.hypot(matrix.c,matrix.d);
    const target=Math.max(width*sx/sw,height*sy/sh);
    let source=image;
    if(target<.5){
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
})();
