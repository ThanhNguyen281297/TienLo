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

 /* Sprites → pixel art. Every painted sprite drawn on the world canvas (NPCs, monsters, pets,
    props, buildings, trees, items) is re-rasterised once at its on-screen pixel size with a
    hard alpha edge, a slightly reduced palette and a 1-pixel dark outline, then drawn with
    nearest-neighbour scaling. Soft glows, additive effects and full-screen layers are left
    alone. Results are cached per source and size. */
 const nativeDraw=g.drawImage.bind(g),cache=new WeakMap(),SKIP=/Skill\/|pixelfx|VFX|\/hd\/|landing\//;
 const scratch=document.createElement('canvas'),sc=scratch.getContext('2d',{willReadFrequently:true});
 function eligible(src){
  if(!src||src===cv||src===overlay||window.pixelSprites?.has(src))return false;
  if(src instanceof HTMLImageElement&&(src.currentSrc||src.src||'').includes('.px.png'))return false;
  if(src instanceof HTMLImageElement){if(!src.complete||!src.naturalWidth)return false;return !SKIP.test(src.currentSrc||src.src||'');}
  return src instanceof HTMLCanvasElement&&!src.dataset?.pixelSkip;
 }
 function pixelate(src,sx,sy,sw,sh,w,h){
  const pw=w+2,ph=h+2;scratch.width=pw;scratch.height=ph;sc.imageSmoothingEnabled=true;sc.imageSmoothingQuality='high';
  sc.clearRect(0,0,pw,ph);sc.drawImage(src,sx,sy,sw,sh,1,1,w,h);
  const img=sc.getImageData(0,0,pw,ph),d=img.data;let soft=0,solid=0;
  for(let i=3;i<d.length;i+=4){const a=d[i];if(a>230)solid++;else if(a>20)soft++;}
  if(solid===0||soft>solid*.6)return null;           // glow-like art: keep the painted version
  const opaque=new Uint8Array(pw*ph);
  for(let p=0,i=0;p<pw*ph;p++,i+=4){
   if(d[i+3]<110){d[i+3]=0;continue;}
   opaque[p]=1;d[i+3]=255;
   for(let k=0;k<3;k++)d[i+k]=Math.min(255,Math.round(d[i+k]/12)*12);   // gentle posterise
  }
  for(let y=0;y<ph;y++)for(let x=0;x<pw;x++){const p=y*pw+x;if(opaque[p])continue;
   const n=(x>0&&opaque[p-1])?p-1:(x<pw-1&&opaque[p+1])?p+1:(y>0&&opaque[p-pw])?p-pw:(y<ph-1&&opaque[p+pw])?p+pw:-1;
   if(n<0)continue;const i=p*4,j=n*4;d[i]=d[j]*.28+8|0;d[i+1]=d[j+1]*.24+6|0;d[i+2]=d[j+2]*.3+12|0;d[i+3]=255;}
  const out=document.createElement('canvas');out.width=pw;out.height=ph;out.dataset.pixelSkip='1';out.getContext('2d').putImageData(img,0,0);return out;
 }
 g.drawImage=function(src,...a){
  try{
   if((a.length===4||a.length===8)&&g.globalCompositeOperation==='source-over'&&g.filter==='none'&&eligible(src)){
    const [sx,sy,sw,sh,dx,dy,dw,dh]=a.length===8?a:[0,0,src.naturalWidth||src.width,src.naturalHeight||src.height,...a];
    const m=g.getTransform(),kx=Math.hypot(m.a,m.b),ky=Math.hypot(m.c,m.d),w=Math.round(Math.abs(dw)*kx),h=Math.round(Math.abs(dh)*ky);
    if(w>=6&&h>=6&&w<=420&&h<=420&&sw>=w*1.25&&sh>=h*1.25){
     let per=cache.get(src);if(!per){per=new Map();cache.set(src,per);}
     const key=sx+','+sy+','+sw+','+sh+'@'+w+'x'+h;let art=per.get(key);
     if(art===undefined){try{art=pixelate(src,sx,sy,sw,sh,w,h);}catch(err){art=null;}per.set(key,art);if(per.size>24)per.delete(per.keys().next().value);}
     if(art){const ox=dw/w,oy=dh/h,smooth=g.imageSmoothingEnabled;g.imageSmoothingEnabled=false;
      nativeDraw(art,0,0,art.width,art.height,dx-ox,dy-oy,dw+2*ox,dh+2*oy);g.imageSmoothingEnabled=smooth;return;}
    }
   }
  }catch(e){}
  return nativeDraw(src,...a);
 };

 const baseDraw=dr;
 dr=function(){o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,overlay.width,overlay.height);return baseDraw.apply(this,arguments);};
})();
