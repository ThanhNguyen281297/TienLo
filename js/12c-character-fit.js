/* Body fit: measures the painted body frame (head top, feet, torso centre, width)
   so equipment attaches to the character that is actually drawn instead of fixed
   offsets from the old 42-unit placeholder body. Measured once per frame image. */
(function(){
 const measured=new Map();
 function measure(frame){const key=frame.key||frame.image;if(measured.has(key))return measured.get(key);
  const img=frame.image,w=frame.width,h=frame.height;let data;
  try{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);data=x.getImageData(0,0,w,h).data;}catch{return null;}
  const rows=new Array(h);let top=-1,bottom=-1;
  for(let y=0;y<h;y++){let l=-1,r=-1;for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>60){if(l<0)l=x;r=x;}rows[y]=l<0?null:[l,r];if(l>=0){if(top<0)top=y;bottom=y;}}
  if(top<0){measured.set(key,null);return null;}
  const H=bottom-top,band=(a,b)=>{let sum=0,n=0,l=Infinity,r=-Infinity;for(let y=Math.round(top+H*a);y<=Math.round(top+H*b);y++){const s=rows[y];if(!s)continue;sum+=(s[0]+s[1])/2;n++;l=Math.min(l,s[0]);r=Math.max(r,s[1]);}return n?{c:sum/n,l,r}:{c:w/2,l:0,r:w};};
  // Torso band (below the big chibi head) gives the body centre and arm span.
  const torso=band(.5,.78),feet=band(.86,1),head=band(0,.4);
  const value={top,bottom,center:torso.c,feetCenter:feet.c,left:torso.l,right:torso.r,headLeft:head.l,headRight:head.r};
  measured.set(key,value);if(measured.size>400)measured.delete(measured.keys().next().value);return value;}
 /* World-space fit for a body drawn with its feet at (feetX, feetY) and the given height. */
 window.characterFit=function(ap,direction,feetX,feetY,height){
  const masks=window.characterMasks,frame=masks?.frameFor?.(ap,direction);
  if(!frame||!frame.image||(frame.image.complete===false))return null;
  const g=masks.geometry(frame,feetX,feetY,height),m=measure(frame);if(!m)return null;
  const sx=g.width/frame.width,sy=g.height/frame.height;
  const top=g.y+m.top*sy,bottom=g.y+m.bottom*sy,cx=g.x+m.center*sx;
  return {top,bottom,H:bottom-top,cx,feetX:g.x+m.feetCenter*sx,left:g.x+m.left*sx,right:g.x+m.right*sx,headLeft:g.x+m.headLeft*sx,headRight:g.x+m.headRight*sx,W:(m.right-m.left)*sx};
 };
})();
