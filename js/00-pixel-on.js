/* First script of the game boot.
   - turns on the pixel interface (css/pixel-ui.css, js/00-pixel-style.js);
   - pixel-art sources (*.px.png and the canvases they are drawn into) are always drawn with
     nearest-neighbour sampling, so caches and resizes keep hard pixel edges. */
(function(){
 if(window.artStyle?.get?.()!=='pixel')return;
 document.documentElement.classList.add('pixel-art');
 const marked=window.pixelSprites=new WeakSet(),proto=CanvasRenderingContext2D.prototype,draw=proto.drawImage;
 const isPixel=s=>s&&(marked.has(s)||(s instanceof HTMLImageElement&&(s.currentSrc||s.src||'').includes('.px.png')));
 proto.drawImage=function(src,...a){
  if(!isPixel(src))return draw.call(this,src,...a);
  const smooth=this.imageSmoothingEnabled;this.imageSmoothingEnabled=false;
  try{return draw.call(this,src,...a);}finally{this.imageSmoothingEnabled=smooth;if(this.canvas&&this.canvas.id!=='c')marked.add(this.canvas);}
 };
})();
