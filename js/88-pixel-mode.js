/* Pixel mode: the world canvas is rendered at a low resolution (one art pixel = `size`
   screen pixels) and shown with nearest-neighbour scaling, so maps, actors and effects
   share one pixel grid. Text drawn on the world canvas (names, damage numbers, labels)
   is redirected to a full-resolution overlay so it stays readable.
   Setting: Cài đặt → Phong cách đồ hoạ (Pixel / Vẽ tay). Stored per browser. */
(function(){
 'use strict';
 const KEY='tienlo-art-style';
 let style='pixel';try{style=localStorage.getItem(KEY)||'pixel';}catch{}
 window.artStyle={get:()=>style,set(v){try{localStorage.setItem(KEY,v);}catch{}location.reload();}};
 // ⚙ menu: switch between pixel and the painted art (reloads the page).
 const toggle=document.createElement('button');toggle.type='button';toggle.id='art-style-toggle';
 toggle.textContent='Phong cách: '+(style==='pixel'?'Pixel':'Vẽ tay');
 toggle.onclick=()=>artStyle.set(style==='pixel'?'painted':'pixel');
 (document.getElementById('graphics-toggle')?.after?document.getElementById('graphics-toggle').after(toggle):document.getElementById('account-badge')?.append(toggle));
 const tcss=document.createElement('style');tcss.textContent=`#art-style-toggle{margin-top:4px;padding:5px 10px;border-radius:8px;border:1px solid #c9a96088;background:#14262e;color:#f3e3b4;font:600 12px Arial;min-height:0!important;cursor:pointer}`;document.head.append(tcss);
 if(style!=='pixel'||typeof rs!=='function'||typeof cv==='undefined')return;
 document.documentElement.classList.add('pixel-art');

 const overlay=document.createElement('canvas');overlay.id='pixel-text';
 const o=overlay.getContext('2d');
 cv.after(overlay);
 const css=document.createElement('style');css.textContent=`
#c{image-rendering:crisp-edges;image-rendering:pixelated}
#pixel-text{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0}`;document.head.append(css);
 // Copy the canvas box so the overlay always lines up with it.
 function syncBox(){const r=cv.getBoundingClientRect(),s=overlay.style;s.left=r.left+'px';s.top=r.top+'px';s.width=r.width+'px';s.height=r.height+'px';s.inset='auto';
  const z=getComputedStyle(cv).zIndex;s.zIndex=z==='auto'?'0':z;}

 /* Art pixel size in CSS pixels: big screens get chunkier pixels so the grid reads clearly. */
 const pixelSize=()=>matchMedia('(pointer:coarse)').matches?2:Math.max(2,Math.min(3,Math.round(innerHeight/330)));
 let ratio=1;
 const baseRs=rs;
 rs=function(){
  baseRs();
  const p=pixelSize(),d=1/p,dpr=Math.min(2,window.devicePixelRatio||1);
  const scale=matchMedia('(pointer:coarse)').matches?Math.max(1.1,Math.min(1.65,Math.min(innerWidth,innerHeight)/280)):Math.max(1.8,Math.min(2.8,innerHeight/430));
  Z=scale*d;W=cv.width=Math.max(160,Math.round(innerWidth*d));H=cv.height=Math.max(120,Math.round(innerHeight*d));
  g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  overlay.width=Math.round(innerWidth*dpr);overlay.height=Math.round(innerHeight*dpr);ratio=overlay.width/W;syncBox();
 };
 addEventListener('resize',()=>rs());rs();

 /* Text on the world canvas → overlay at full resolution, same position. */
 const PROPS=['font','fillStyle','strokeStyle','lineWidth','lineJoin','textAlign','textBaseline','globalAlpha','shadowColor','direction','letterSpacing','miterLimit'];
 function prep(){
  const m=g.getTransform();o.setTransform(m.a*ratio,m.b*ratio,m.c*ratio,m.d*ratio,m.e*ratio,m.f*ratio);
  for(const k of PROPS){try{if(k in g)o[k]=g[k];}catch{}}
  o.shadowBlur=g.shadowBlur*ratio;o.shadowOffsetX=g.shadowOffsetX*ratio;o.shadowOffsetY=g.shadowOffsetY*ratio;
  o.globalCompositeOperation=g.globalCompositeOperation==='lighter'?'lighter':'source-over';
 }
 g.fillText=function(...a){prep();o.fillText(...a);};
 g.strokeText=function(...a){prep();o.strokeText(...a);};

 const baseDraw=dr;
 dr=function(){o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,overlay.width,overlay.height);return baseDraw.apply(this,arguments);};
})();
