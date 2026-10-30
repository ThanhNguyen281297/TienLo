/* Isometric terrain regions (giai đoạn đồ họa 1).
   A field described by a design (island coastline on 2:1 iso diagonals, lakes,
   river, raised rock mesas, stone plaza) is baked into 250-unit chunks: every
   pixel blends grass / dirt / stone / water from blurred masks plus value noise,
   so materials meet with natural ragged edges instead of one repeated texture.
   South-facing coastline segments get cliff faces that fade into the sky; mesas
   are depth-sorted sprites so actors walk behind them. Server geometry (camps,
   spawn, portals) is unchanged; only drawing, props and walkability change. */
(function(){
 const world=worldMap,og=window.overworldGame;if(!og)return;
 const CH=250,PAD=48,MS=.5;              // chunk size, mask padding (world units), mask px/unit
 const S=Math.min(3,Math.max(1.5,Math.round(Z*(devicePixelRatio||1)*2)/2)); // chunk px/unit
 const ready=i=>i?.complete&&i.naturalWidth>0;
 const img=src=>{const i=new Image();i.src=artworkURL(src);return i;};
 const TEX={grass:img('Map/Terrain/meadow-v1.png'),dirt:img('Map/Terrain/dirt-v1.png'),stone:img('Map/sprites/tile.png'),cliff:img('Map/hd/cliff-rock.png'),flow:img('Map/modules/flow.png')};

 // ---------------------------------------------------------------- designs
 // Geometry is per field; camps, spawn plaza and the main road are shared with the server
 // (Map/overworld.json), so every lake, river and mesa is placed in the gaps between them.
 const COAST=[[530,85],[1470,85],[1915,308],[1915,1692],[1470,1915],[530,1915],[85,1692],[85,308]];
 const EAST_RIVER=[[1800,1150],[1790,1250],[1768,1370],[1792,1500],[1764,1620],[1748,1730],[1746,1830]];
 const WEST_RIVER=[[200,610],[176,760],[168,940],[180,1100],[160,1260],[170,1420],[190,1580],[205,1700],[215,1800]];
 const MEADOW_KIT={trees:['theme-14-035','theme-14-038','pineTree','theme-14-036','theme-14-046','whiteBlossom','theme-14-035'],
   shrubs:['theme-14-045','theme-14-063','theme-14-057','theme-14-058'],tufts:['theme-14-061','theme-14-062','theme-14-055','theme-14-056'],
   rocks:['theme-14-052','theme-14-053','theme-14-054'],shore:['theme-14-061','theme-14-062','theme-14-052'],lotus:['theme-14-060'],
   tower:'theme-14-010',banner:'theme-14-024',lantern:'lantern',landmark:['theme-14-047','theme-14-069','theme-14-010']};
 // Liquids: colours at the bank and in the depth, foam line, and behaviour.
 const WATER={kind:'water',edge:[92,170,156],deep:[30,86,108],foam:[230,242,236],foamA:.45,glint:'230,250,255'};
 const DESIGNS={
  'field-meadow':{seed:4127,coast:COAST,
   lakes:[{x:1812,y:1052,rx:92,ry:64},{x:640,y:1648,rx:84,ry:46,lotus:true},{x:808,y:196,rx:74,ry:40,lotus:true}],
   river:{width:50,points:[[1800,1100],[1792,1190],[1768,1320],[1792,1470],[1764,1620],[1748,1730],[1746,1830]]},
   mesas:[{x:762,y:1104,a:92,h:74,trees:['theme-14-035','theme-14-063']},{x:1232,y:624,a:82,h:66,trees:['pineTree','theme-14-045']},
          {x:286,y:1088,a:70,h:58,trees:['theme-14-036']},{x:1560,y:1622,a:76,h:62,trees:['theme-14-038','theme-14-062']}],
   plaza:{x:1000,y:1772,a:205},
   palette:{dry:[1.1,1.04,.8],lush:[.82,.95,.8]},liquid:WATER,...MEADOW_KIT},
  // Trúc Hải U Cốc: deep green valley, a spring stream on the west falling off the rim, five crags.
  'field-bamboo':{seed:5281,coast:COAST,
   lakes:[{x:205,y:560,rx:70,ry:52},{x:1810,y:620,rx:80,ry:56,lotus:true},{x:1300,y:1580,rx:70,ry:40,lotus:true}],
   river:{width:46,points:WEST_RIVER},
   mesas:[{x:760,y:1110,a:86,h:84,trees:['theme-14-038','theme-14-063']},{x:1250,y:1110,a:70,h:72,trees:['pineTree']},{x:800,y:540,a:72,h:68,trees:['theme-14-035']},
          {x:1240,y:640,a:78,h:76,trees:['theme-14-045','pineTree']},{x:1600,y:1640,a:70,h:62,trees:['theme-14-063']}],
   plaza:{x:1000,y:1772,a:205},
   ground:{tint:[.74,.92,.7]},path:{tint:[.86,.84,.78]},palette:{dry:[1.04,1.06,.86],lush:[.78,.92,.8]},
   liquid:{...WATER,edge:[84,168,140],deep:[22,80,84]},capTint:'rgba(200,255,190,.08)',sky:'rgba(40,90,70,.18)',
   ...MEADOW_KIT,trees:['theme-14-038','pineTree','theme-14-035','theme-14-038','theme-14-045','pineTree'],shrubs:['theme-14-063','theme-14-045','theme-14-057','theme-14-058'],
   lantern:'theme-14-016',banner:'theme-14-022',landmark:['theme-14-047','theme-14-025','theme-14-070'],forest:.5},
  // Vân Mộng Trạch: muddy olive marsh full of ponds, reeds and lotus, a slow stream to the south-east.
  'field-marsh':{seed:6143,coast:COAST,
   lakes:[{x:1810,y:1080,rx:85,ry:120},{x:720,y:1610,rx:110,ry:58,lotus:true},{x:820,y:210,rx:90,ry:44,lotus:true},{x:1280,y:1530,rx:80,ry:46,lotus:true},
          {x:760,y:1110,rx:70,ry:44,lotus:true},{x:1240,y:640,rx:74,ry:44,lotus:true},{x:200,y:1090,rx:66,ry:66},{x:1800,y:430,rx:70,ry:58}],
   river:{width:52,points:[[1800,1210],[1780,1330],[1800,1480],[1770,1620],[1750,1740],[1745,1830]]},
   mesas:[{x:300,y:620,a:60,h:52,trees:['whiteBlossom']},{x:1560,y:1640,a:70,h:56,trees:['whiteBlossom']}],
   plaza:{x:1000,y:1772,a:205},
   ground:{tint:[.8,.86,.74],desat:.35,lum:[150,166,136]},path:{tint:[.7,.66,.56],desat:.2,lum:[110,100,80]},palette:{dry:[1.06,1.04,.9],lush:[.82,.9,.88]},
   liquid:{kind:'water',edge:[104,132,98],deep:[40,72,62],foam:[190,206,170],foamA:.35,glint:'210,236,220'},cliffTint:'rgba(40,64,54,.25)',sky:'rgba(110,150,140,.22)',
   propFilter:'saturate(.7) hue-rotate(22deg) brightness(.86)',
   ...MEADOW_KIT,trees:['whiteBlossom','pineTree','theme-14-035','theme-14-038','pineTree'],shrubs:['theme-14-063','theme-14-057','theme-12-033'],
   tufts:['theme-14-061','theme-14-062','theme-14-061','theme-12-021'],shore:['theme-14-061','theme-14-062','theme-14-061','theme-14-062','theme-14-052'],lotus:['theme-14-060','theme-12-021'],
   lantern:'theme-12-023',landmark:['theme-12-009','theme-12-024','theme-12-015'],reeds:2,forest:.62},
  // Hàn Sương Lĩnh: snowfield, a frozen lake and river you can walk on, icy crags and crystals.
  'field-frost':{seed:7019,coast:COAST,
   lakes:[{x:1805,y:1020,rx:88,ry:150},{x:660,y:1640,rx:90,ry:50},{x:200,y:560,rx:66,ry:50}],
   river:{width:50,points:EAST_RIVER},
   mesas:[{x:760,y:1110,a:90,h:84,trees:['theme-10-058']},{x:1240,y:620,a:84,h:78,trees:['pineTree','theme-10-035']},{x:290,y:1090,a:70,h:66,trees:['theme-10-034']},
          {x:1560,y:1630,a:74,h:66,trees:['pineTree']},{x:800,y:540,a:64,h:60,trees:['theme-10-059']}],
   plaza:{x:1000,y:1772,a:205},
   ground:{desat:.92,lum:[232,240,255],gain:1.18},path:{desat:.8,lum:[176,184,198]},stone:{desat:.5,lum:[210,222,240]},palette:{dry:[1.03,1.03,1.02],lush:[.9,.94,1.04]},
   liquid:{kind:'ice',edge:[214,236,248],deep:[132,186,222],foam:[250,252,255],foamA:.5,glint:'255,255,255',walk:true,cracks:true},
   cliffTint:'rgba(214,232,255,.32)',cliffLight:true,capTint:'rgba(235,245,255,.2)',sky:'rgba(200,220,255,.24)',snow:true,
   propFilter:'grayscale(.7) brightness(1.12)',
   ...MEADOW_KIT,trees:['pineTree','pineTree','theme-14-035','pineTree','theme-14-038'],shrubs:['theme-10-058','theme-10-059','theme-10-015','theme-14-063'],
   tufts:['theme-10-052','theme-10-053','theme-10-054','theme-10-067','theme-14-062'],rocks:['theme-10-067','theme-14-052','theme-14-053','theme-14-054'],shore:['theme-10-052','theme-10-067','theme-14-052'],
   tower:'theme-10-016',banner:'theme-14-033',lantern:'theme-10-009',landmark:['theme-10-016','theme-10-012','theme-10-025'],forest:.56},
  // Xích Diệm Hoang: ash plains, a lava river pouring off the west rim, lava pools, charred trees.
  'field-ember':{seed:8231,coast:COAST,
   lakes:[{x:205,y:560,rx:72,ry:56},{x:1810,y:1060,rx:86,ry:66},{x:1290,y:1560,rx:66,ry:40},{x:760,y:1110,rx:64,ry:40}],
   river:{width:44,points:WEST_RIVER},
   mesas:[{x:1240,y:620,a:84,h:80,trees:['theme-15-034']},{x:800,y:540,a:64,h:62,trees:['theme-15-002']},{x:1600,y:1640,a:72,h:66,trees:['theme-14-038']},{x:1250,y:1110,a:66,h:64,trees:['theme-15-024']}],
   plaza:{x:1000,y:1772,a:205},
   ground:{desat:.86,lum:[118,78,62]},path:{desat:.7,lum:[86,60,52]},stone:{desat:.6,lum:[128,104,98]},palette:{dry:[1.16,.96,.84],lush:[.82,.78,.78]},
   liquid:{kind:'lava',edge:[90,30,14],deep:[255,150,40],foam:[255,226,140],foamA:.55,glint:'255,200,120',glow:[255,110,40],crust:true},
   cliffTint:'rgba(40,14,10,.5)',capTint:'rgba(255,120,60,.06)',sky:'rgba(140,40,20,.36)',mist:'90,40,30',
   propFilter:'grayscale(.6) sepia(.55) saturate(1.5) hue-rotate(-18deg) brightness(.5) contrast(1.15)',
   ...MEADOW_KIT,trees:['theme-14-038','pineTree','theme-14-035','theme-14-038'],shrubs:['theme-15-045','theme-15-032','theme-15-051'],
   tufts:['theme-15-051','theme-15-052','theme-15-033','theme-15-002'],rocks:['theme-15-032','theme-15-051','theme-15-033'],shore:['theme-15-032','theme-15-051'],
   tower:'theme-15-013',banner:'theme-15-014',lantern:'theme-15-015',landmark:['theme-15-018','theme-15-034','theme-15-035'],forest:.64},
  // U Minh Cổ Địa: slate wasteland, void chasms glowing violet, ruined pillars and spirit crystals.
  'field-abyss':{seed:9157,coast:COAST,
   lakes:[{x:1810,y:1040,rx:90,ry:110},{x:700,y:1610,rx:96,ry:52},{x:810,y:200,rx:80,ry:40},{x:1260,y:1110,rx:62,ry:40},{x:205,y:560,rx:70,ry:52}],
   river:{width:48,points:EAST_RIVER},
   mesas:[{x:760,y:1110,a:88,h:90,trees:['theme-11-010']},{x:1240,y:620,a:80,h:84,trees:['theme-11-066']},{x:290,y:1090,a:68,h:70,trees:['theme-11-017']},{x:1560,y:1630,a:72,h:72,trees:['theme-11-030']}],
   plaza:{x:1000,y:1772,a:205},
   ground:{desat:.86,lum:[96,90,118]},path:{desat:.7,lum:[104,96,112]},stone:{desat:.6,lum:[120,116,140]},palette:{dry:[1.04,1,1.08],lush:[.84,.86,.98]},
   liquid:{kind:'void',edge:[150,80,210],deep:[10,6,26],foam:[210,160,255],foamA:.6,glint:'200,160,255',glow:[150,90,255]},
   cliffTint:'rgba(30,16,50,.5)',capTint:'rgba(150,120,255,.05)',sky:'rgba(30,14,60,.5)',mist:'60,44,90',
   propFilter:'grayscale(.85) brightness(.55) contrast(1.1)',
   ...MEADOW_KIT,trees:['theme-14-038','pineTree','theme-11-066','theme-14-038'],shrubs:['theme-11-049','theme-11-033','theme-11-017','theme-11-019'],
   tufts:['theme-11-069','theme-11-070','theme-11-071','theme-11-018'],rocks:['theme-11-049','theme-11-050','theme-11-073'],shore:['theme-11-049','theme-11-071'],
   tower:'theme-11-026',banner:'theme-11-046',lantern:'theme-11-027',landmark:['theme-11-010','theme-11-016','theme-11-030'],forest:.66}
 };
 const PLANTS=new Set(['pineTree','whiteBlossom','theme-14-035','theme-14-036','theme-14-038','theme-14-045','theme-14-063']);

 // ---------------------------------------------------------------- math
 const clamp=(v,a,b)=>v<a?a:v>b?b:v,smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
 function hasher(seed){return (x,y)=>{let h=Math.imul(x|0,374761393)^Math.imul(y|0,668265263)^seed;h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967296;};}
 function noiser(seed){const hash=hasher(seed);return (x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;};}
 function inPoly(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>p.y)!==(yj>p.y)&&p.x<(xj-xi)*(p.y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
 function segDist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1,t=clamp(((p.x-a[0])*dx+(p.y-a[1])*dy)/l,0,1);return Math.hypot(p.x-a[0]-dx*t,p.y-a[1]-dy*t);}
 function lineDist(p,pts){let best=Infinity;for(let i=1;i<pts.length;i++)best=Math.min(best,segDist(p,pts[i-1],pts[i]));return best;}
 function spline(points,step=24){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)],n=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
  for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;out.push([0,1].map(j=>.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3)));}}
  out.push(points[points.length-1]);return out;}

 // ---------------------------------------------------------------- region geometry (derived once per design)
 const regions=new Map();
 function region(id){if(regions.has(id))return regions.get(id);const d=DESIGNS[id];if(!d)return null;
  const noise=noiser(d.seed),n=(x,y,f)=>noise(x/f,y/f);
  // Coastline: subdivide each edge every 22 units and push it in/out a little.
  const coast=[];d.coast.forEach((a,i)=>{const b=d.coast[(i+1)%d.coast.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(len/22);
   for(let k=0;k<steps;k++){const t=k/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,nx=(b[1]-a[1])/len,ny=-(b[0]-a[0])/len,j=(n(x,y,70)-.5)*34+(n(x,y,17)-.5)*12;coast.push([x+nx*j,y+ny*j]);}});
  // Clockwise winding (screen y down): outward normal of edge a->b is (dy,-dx)/len.
  const lakes=d.lakes.map((l,i)=>{const pts=[];for(let k=0;k<40;k++){const a=k/40*Math.PI*2,r=1+(n(Math.cos(a)*3+i*9,Math.sin(a)*3,1.3)-.5)*.42;pts.push([l.x+Math.cos(a)*l.rx*r,l.y+Math.sin(a)*l.ry*r]);}return {...l,pts};});
  const river={width:d.river.width,pts:spline(d.river.points)};
  const plaza={...d.plaza,pts:[[d.plaza.x-d.plaza.a,d.plaza.y],[d.plaza.x,d.plaza.y-d.plaza.a/2],[d.plaza.x+d.plaza.a,d.plaza.y],[d.plaza.x,d.plaza.y+d.plaza.a/2]]};
  const r={id,d,noise,n,coast,lakes,river,plaza,mesas:d.mesas.map(m=>({...m})),chunks:new Map(),queue:[],props:null};
  r.land=p=>inPoly(p,coast);
  r.coastDist=p=>{let best=Infinity,face=0;for(let i=0;i<coast.length;i++){const a=coast[i],b=coast[(i+1)%coast.length],dd=segDist(p,a,b);if(dd<best){best=dd;face=(a[0]-b[0]);}}return {dist:best,north:face<0};};
  r.water=(p,margin=0)=>lineDist(p,river.pts)<river.width/2+margin||lakes.some(l=>inPoly(p,l.pts)||(margin>0&&Math.hypot((p.x-l.x)/(l.rx+margin),(p.y-l.y)/(l.ry+margin))<1));
  r.mesaAt=(p,grow=1.06)=>r.mesas.find(m=>Math.abs(p.x-m.x)/m.a+Math.abs(p.y-m.y)/(m.a/2)<grow);
  r.onPlaza=(p,grow=1)=>Math.abs(p.x-plaza.x)/plaza.a+Math.abs(p.y-plaza.y)/(plaza.a/2)<grow;
  regions.set(id,r);return r;}

 // ---------------------------------------------------------------- textures at chunk resolution
 const texCache=new Map();
 // Recolour: tint the texture and/or pull it toward a luminance colour (snow, ash, slate).
 function texture(key,units,spec){const id=key+'@'+units+'@'+JSON.stringify(spec||0);if(texCache.has(id))return texCache.get(id);const image=TEX[key];if(!ready(image))return null;
  const w=Math.round(units*S),h=Math.round(units*S*image.naturalHeight/image.naturalWidth),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(image,0,0,w,h);
  const data=x.getImageData(0,0,w,h).data;
  if(spec){const t=spec.tint||[1,1,1],ds=spec.desat||0,l=spec.lum||[128,128,128],gain=spec.gain||1;
   for(let i=0;i<data.length;i+=4){const L=(data[i]*.3+data[i+1]*.59+data[i+2]*.11)/128;for(let k=0;k<3;k++)data[i+k]=(data[i+k]*t[k]*(1-ds)+L*l[k]*ds)*gain;}}
  const tx={w,h,data};texCache.set(id,tx);return tx;}
 function cliff(ctx){if(!ready(TEX.cliff))return null;const p=ctx.createPattern(TEX.cliff,'repeat');p.setTransform(new DOMMatrix().scale(230*S/TEX.cliff.naturalWidth));return p;}

 // ---------------------------------------------------------------- chunk baking
 function mask(r,x0,y0,draw,blur){const size=Math.ceil((CH+PAD*2)*MS),c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
  ctx.filter=blur?`blur(${blur*MS}px)`:'none';ctx.setTransform(MS,0,0,MS,(PAD-x0)*MS,(PAD-y0)*MS);ctx.fillStyle=ctx.strokeStyle='#fff';draw(ctx);
  const data=ctx.getImageData(0,0,size,size).data,out=new Float32Array(size*size);for(let i=0;i<out.length;i++)out[i]=data[i*4+3]/255;return {size,out};}
 function sample(m,wx,wy,x0,y0){const fx=(wx-x0+PAD)*MS-.5,fy=(wy-y0+PAD)*MS-.5,ix=clamp(Math.floor(fx),0,m.size-2),iy=clamp(Math.floor(fy),0,m.size-2),tx=clamp(fx-ix,0,1),ty=clamp(fy-iy,0,1),o=iy*m.size+ix,a=m.out[o],b=m.out[o+1],c=m.out[o+m.size],d=m.out[o+m.size+1];
  return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;}
 const path=(ctx,pts,close=true)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(close)ctx.closePath();};
 function bake(r,cx,cy){
  const d=r.d,grass=texture('grass',384,d.ground),dirt=texture('dirt',300,d.path),stone=texture('stone',288,d.stone);if(!grass||!dirt||!stone||!ready(TEX.cliff))return null;
  const x0=cx*CH,y0=cy*CH,px=Math.round(CH*S),pal=d.palette,liq=d.liquid;
  const land=mask(r,x0,y0,c=>{path(c,r.coast);c.fill();},4);
  const roadMask=mask(r,x0,y0,c=>{c.lineCap=c.lineJoin='round';og.paths.forEach((route,i)=>{c.lineWidth=i?50:78;path(c,route,false);c.stroke();});
   for(const camp of overworldRules.camps){c.globalAlpha=.85;c.beginPath();c.ellipse(camp.x,camp.y,190,132,0,0,Math.PI*2);c.fill();c.globalAlpha=.45;c.beginPath();c.ellipse(camp.x,camp.y,235,165,0,0,Math.PI*2);c.fill();c.globalAlpha=1;}},14);
  const stoneMask=mask(r,x0,y0,c=>{path(c,r.plaza.pts);c.fill();},2);
  const waterMask=mask(r,x0,y0,c=>{for(const l of r.lakes){path(c,l.pts);c.fill();}c.lineCap=c.lineJoin='round';c.lineWidth=r.river.width;path(c,r.river.pts,false);c.stroke();},14);
  const top=document.createElement('canvas');top.width=top.height=px;const tctx=top.getContext('2d'),image=tctx.createImageData(px,px),o=image.data;
  const shallow=liq.edge,deep=liq.deep,foamC=liq.foam,lava=liq.kind==='lava',ice=liq.kind==='ice',voidL=liq.kind==='void';
  for(let by=0;by<px;by+=2)for(let bx=0;bx<px;bx+=2){
   const wx=x0+(bx+1)/S,wy=y0+(by+1)/S,n1=r.n(wx,wy,90),n2=r.n(wx,wy,15),n3=r.n(wx+500,wy,34);
   const la=smooth(.4,.6,sample(land,wx,wy,x0,y0)+(n2-.5)*.14);if(la<=0.001)continue;
   const dm=smooth(.36,.66,sample(roadMask,wx,wy,x0,y0)+(n2-.5)*.4+(n3-.5)*.18),sm=smooth(.44,.56,sample(stoneMask,wx,wy,x0,y0)),wm=sample(waterMask,wx,wy,x0,y0);
   const wa=smooth(.5,.56,wm+(n2-.5)*.05),wet=1-.38*smooth(.18,.5,wm),depth=smooth(.56,.98,wm);
   // Grass tone: large dry/lush patches, small speckle.
   const dry=smooth(.55,.8,n1),lush=smooth(.45,.2,n1),bright=.9+(n2-.5)*.16+(n3-.5)*.1;
   const tr=bright*(1+(pal.dry[0]-1)*dry+(pal.lush[0]-1)*lush),tg=bright*(1+(pal.dry[1]-1)*dry+(pal.lush[1]-1)*lush),tb=bright*(1+(pal.dry[2]-1)*dry+(pal.lush[2]-1)*lush);
   for(let sy=0;sy<2;sy++)for(let sx=0;sx<2;sx++){const X=bx+sx,Y=by+sy;if(X>=px||Y>=px)continue;const i=(Y*px+X)*4,gx=Math.round(wx*S+sx)%grass.w,gy=Math.round(wy*S+sy)%grass.h,gi=((gy<0?gy+grass.h:gy)*grass.w+(gx<0?gx+grass.w:gx))*4;
    let R=grass.data[gi]*tr,G=grass.data[gi+1]*tg,B=grass.data[gi+2]*tb;
    if(dm>0){const dx=Math.round(wx*S+sx)%dirt.w,dy=Math.round(wy*S+sy)%dirt.h,di=(dy*dirt.w+dx)*4,k=dm*(.92+(n3-.5)*.1);R+=(dirt.data[di]*.95-R)*k;G+=(dirt.data[di+1]*.93-G)*k;B+=(dirt.data[di+2]*.9-B)*k;}
    if(sm>0){const qx=Math.round(wx*S+sx)%stone.w,qy=Math.round(wy*S+sy)%stone.h,si=(qy*stone.w+qx)*4;R+=(stone.data[si]*.93-R)*sm;G+=(stone.data[si+1]*.92-G)*sm;B+=(stone.data[si+2]*.88-B)*sm;
     const rim=sm*(1-sm)*4;R*=1-rim*.35;G*=1-rim*.35;B*=1-rim*.32;}
    if(lava){const scorch=1-.45*smooth(.2,.5,wm);R*=scorch;G*=scorch*.92;B*=scorch*.9;}else if(!ice){R*=wet;G*=wet;B*=wet*1.02;}
    if(wa>0){let ripple=(r.n(wx*1.6,wy*3.2,6)-.5)*18,dd=depth;
     if(lava){const plate=r.n(wx,wy,16),vein=1-Math.min(1,Math.abs(plate-.5)/.06);dd=Math.max(.2,depth)*(plate>.58?.25:1)+vein*.5;ripple*=.6;}
     if(voidL)ripple*=.4;
     let wr=shallow[0]+(deep[0]-shallow[0])*dd+ripple,wg=shallow[1]+(deep[1]-shallow[1])*dd+ripple,wb=shallow[2]+(deep[2]-shallow[2])*dd+ripple*.6;
     if(ice&&liq.cracks){const crack=Math.abs(r.n(wx,wy,26)-.5)<.012||Math.abs(r.n(wx+90,wy,11)-.5)<.008;if(crack){wr*=.78;wg*=.86;wb*=.94;}}
     const foam=Math.max(0,1-Math.abs(wm-.535)/.03)*liq.foamA;
     R+=(wr+(foamC[0]-wr)*foam-R)*wa;G+=(wg+(foamC[1]-wg)*foam-G)*wa;B+=(wb+(foamC[2]-wb)*foam-B)*wa;}
    o[i]=R;o[i+1]=G;o[i+2]=B;o[i+3]=la*255;}
  }
  tctx.putImageData(image,0,0);
  const c=document.createElement('canvas');c.width=c.height=px;const ctx=c.getContext('2d');ctx.setTransform(S,0,0,S,-x0*S,-y0*S);
  cliffFaces(ctx,r,x0,y0);
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(top,0,0);
  ctx.setTransform(S,0,0,S,-x0*S,-y0*S);plazaEdge(ctx,r);
  return c;}
 // The spawn plaza is a raised flagstone dais: soft ground shadow, a carved south face
 // under its two lower edges, and a warm highlight along the upper rim.
 function plazaEdge(ctx,r){const [l,t,rt,b]=r.plaza.pts,h=8;ctx.save();
  const sh=ctx.createLinearGradient(0,b[1]-30,0,b[1]+h+26);sh.addColorStop(0,'rgba(12,18,14,0)');sh.addColorStop(.6,'rgba(12,18,14,.22)');sh.addColorStop(1,'rgba(12,18,14,0)');
  path(ctx,[[l[0]-6,l[1]+4],[b[0],b[1]+h+18],[rt[0]+6,rt[1]+4],[rt[0],rt[1]+h],[b[0],b[1]+h],[l[0],l[1]+h]]);ctx.fillStyle=sh;ctx.fill();
  for(const [a,z,shade] of [[l,b,'rgba(92,80,66,.92)'],[b,rt,'rgba(64,56,48,.95)']]){path(ctx,[[a[0],a[1]],[z[0],z[1]],[z[0],z[1]+h],[a[0],a[1]+h]]);ctx.fillStyle=shade;ctx.fill();
   ctx.strokeStyle='rgba(30,26,22,.5)';ctx.lineWidth=.6;for(let k=1;k<9;k++){const u=k/9,x=a[0]+(z[0]-a[0])*u,y=a[1]+(z[1]-a[1])*u;ctx.beginPath();ctx.moveTo(x,y+.5);ctx.lineTo(x,y+h);ctx.stroke();}}
  ctx.strokeStyle='rgba(255,240,200,.55)';ctx.lineWidth=1.1;path(ctx,[l,t,rt],false);ctx.stroke();
  ctx.strokeStyle='rgba(40,32,24,.55)';ctx.lineWidth=.9;path(ctx,[l,b,rt],false);ctx.stroke();ctx.restore();}
 // Cliffs hang under every south-facing coastline segment and fade into the mist.
 let lipTint=null;
 function cliffFaces(ctx,r,x0,y0){const H=190,pattern=cliff(ctx);if(!pattern)return;const coast=r.coast;lipTint=r.d.cliffTint||null;
  for(let i=0;i<coast.length;i++){const a=coast[i],b=coast[(i+1)%coast.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!len)continue;const nx=(b[1]-a[1])/len,ny=-(b[0]-a[0])/len;if(ny<=.05){lip(ctx,a,b,nx,ny,pattern);continue;}
   if(Math.max(a[0],b[0])<x0-20||Math.min(a[0],b[0])>x0+CH+20||Math.max(a[1],b[1])+H<y0||Math.min(a[1],b[1])>y0+CH)continue;
   const h1=H*(.8+r.n(a[0],a[1],40)*.45),h2=H*(.8+r.n(b[0],b[1],40)*.45);
   const quad=[[a[0],a[1]-2],[b[0],b[1]-2],[b[0],b[1]+h2],[a[0],a[1]+h1]];
   ctx.save();path(ctx,quad);ctx.fillStyle=pattern;ctx.fill();
   // Light from the upper left: SW faces lit, SE faces in shade.
   ctx.fillStyle=nx<-.2?'rgba(255,236,210,.06)':nx>.2?'rgba(18,26,46,.42)':'rgba(18,26,46,.2)';ctx.fill();
   const edgeShade=ctx.createLinearGradient(0,Math.min(a[1],b[1]),0,Math.min(a[1],b[1])+16);edgeShade.addColorStop(0,'rgba(20,30,20,.55)');edgeShade.addColorStop(1,'rgba(20,30,20,0)');ctx.fillStyle=edgeShade;ctx.fill();
   if(r.d.cliffTint){ctx.fillStyle=r.d.cliffTint;ctx.fill();}
   const mc=r.d.mist||'206,196,204',mist=ctx.createLinearGradient(0,Math.min(a[1],b[1])+40,0,Math.max(a[1],b[1])+Math.max(h1,h2));mist.addColorStop(0,'rgba('+mc+',0)');mist.addColorStop(1,'rgba('+mc+',.95)');ctx.fillStyle=mist;ctx.fill();ctx.restore();}}
 // North/side rims: a short rock band just outside the edge so the island has thickness.
 function lip(ctx,a,b,nx,ny,pattern){const d=[nx*7,Math.max(10,ny*7+12)];ctx.save();path(ctx,[[a[0],a[1]],[b[0],b[1]],[b[0]+d[0],b[1]+d[1]],[a[0]+d[0],a[1]+d[1]]]);ctx.fillStyle=pattern;ctx.fill();ctx.fillStyle='rgba(30,36,48,.5)';ctx.fill();if(lipTint){ctx.fillStyle=lipTint;ctx.fill();}ctx.restore();}
 function chunk(r,cx,cy,force){const key=cx+','+cy;let c=r.chunks.get(key);if(c){r.chunks.delete(key);r.chunks.set(key,c);return c;}
  if(!force){if(!r.queue.includes(key))r.queue.push(key);return null;}
  c=bake(r,cx,cy);if(!c)return null;r.chunks.set(key,c);const vw=W/Z,vh=H/Z,limit=Math.max(30,Math.ceil(vw/CH+2)*Math.ceil(vh/CH+2)+6);while(r.chunks.size>limit)r.chunks.delete(r.chunks.keys().next().value);return c;}

 // ---------------------------------------------------------------- mesas (raised rock outcrops, depth-sorted)
 const TAPER=.84; // caps are narrower than the base: sloped rock walls
 function mesaSprite(r,m){if(m.canvas)return m.canvas;const grass=texture('grass',384,r.d.ground);if(!grass||!ready(TEX.cliff))return null;
  const a=m.a,h=m.h,pad=12,W=(a*2+pad*2),Hh=(a+h+pad*2),c=document.createElement('canvas');c.width=Math.ceil(W*S);c.height=Math.ceil(Hh*S);const ctx=c.getContext('2d');
  ctx.setTransform(S,0,0,S,(a+pad)*S,(a/2+h+pad)*S); // origin = footprint centre on the ground
  const rim=[];const corners=[[-a,0],[0,-a/2],[a,0],[0,a/2]];corners.forEach((p,i)=>{const q=corners[(i+1)%4];for(let k=0;k<8;k++){const t=k/8,x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t,j=(r.n(m.x+x,m.y+y,9)-.5)*7;rim.push([x+j,y+j*.5]);}});
  // South faces: rim R->B (right, in shade) and B->L (left, lit), from the cap down to the ground.
  const cp=ctx.createPattern(TEX.cliff,'repeat');cp.setTransform(new DOMMatrix().scale(160/TEX.cliff.naturalWidth));
  for(const [from,to,lit] of [[16,24,false],[24,32,true]]){const chain=[];for(let k=from;k<=to;k++)chain.push(rim[k%rim.length]);
   const poly=[...chain.map(([x,y])=>[x*TAPER,y*TAPER-h]),...chain.slice().reverse().map(([x,y])=>[x,y+(r.n(m.x+x*3,m.y,5)-.5)*4])];
   path(ctx,poly);ctx.fillStyle=cp;ctx.fill();ctx.fillStyle=lit?'rgba(255,236,206,.08)':'rgba(16,24,44,.45)';ctx.fill();if(r.d.cliffTint){ctx.fillStyle=r.d.cliffTint;ctx.fill();}
   const ao=ctx.createLinearGradient(0,-h,0,a/2);ao.addColorStop(0,'rgba(0,0,0,0)');ao.addColorStop(1,'rgba(18,22,18,.4)');ctx.fillStyle=ao;ctx.fill();}
  // Grass cap with a mossy overhang.
  const capPattern=ctx.createPattern((()=>{const t=document.createElement('canvas');t.width=grass.w;t.height=grass.h;t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(grass.data),grass.w,grass.h),0,0);return t;})(),'repeat');
  capPattern.setTransform(new DOMMatrix().scale(1/S));
  const cap=rim.map(([x,y])=>[x*TAPER,y*TAPER-h]);
  // Back rim: a sliver of rock above the cap's north edges gives the block thickness.
  ctx.save();path(ctx,cap);ctx.lineWidth=7;ctx.strokeStyle='rgba(70,76,84,.95)';ctx.stroke();ctx.restore();
  path(ctx,cap);ctx.fillStyle=capPattern;ctx.fill();
  // Sunlit cap: brighter and warmer than the meadow below, darker toward the rim.
  ctx.save();ctx.clip();ctx.fillStyle=r.d.capTint||'rgba(255,246,190,.16)';ctx.fillRect(-a-pad,-h-a,a*2+pad*2,a*2);
  const shade=ctx.createRadialGradient(-a*.2,-h-a*.12,a*.15,0,-h,a*1.05);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(30,44,18,.42)');ctx.fillStyle=shade;ctx.fillRect(-a-pad,-h-a,a*2+pad*2,a*2);ctx.restore();
  const rimC=r.d.snow?['rgba(190,210,230,.95)','rgba(255,255,255,.8)']:r.d.ground?.desat>.5?['rgba(60,54,60,.95)','rgba(200,180,170,.35)']:['rgba(88,120,52,.95)','rgba(226,240,170,.55)'];path(ctx,cap);ctx.lineWidth=2.2;ctx.strokeStyle=rimC[0];ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle=rimC[1];ctx.stroke();
  m.canvas=c;m.origin={x:(a+pad),y:(a/2+h+pad),w:W,h:Hh};return c;}

 // ---------------------------------------------------------------- props (terrain-aware layout)
 function layout(r){if(r.props)return r.props;const d=r.d,rules=overworldRules,out=[];let seed=d.seed;const random=()=>((seed=seed*16807%2147483647)/2147483647);
  const tintable=k=>(d.propFilter||d.snow)&&/^(theme-14-|pineTree|whiteBlossom)/.test(k)&&!/theme-14-0(06|10|12|13|16|17|18|19|22|23|24|33|49|64|65|66|72)/.test(k);
  const put=o=>{if(tintable(o.key)){o.tint=true;o.plant=false;}out.push(o);return o;},spawn={x:1000,y:1770};
  const roadD=p=>og.roadDistance(p);
  const inCamp=(p,k=1)=>rules.camps.some(c=>((p.x-c.x)/(235*k))**2+((p.y-c.y)/(170*k))**2<1);
  const okGround=(p,edge=34)=>r.land(p)&&r.coastDist(p).dist>edge&&!r.water(p,18)&&!r.mesaAt(p,1.25)&&!r.onPlaza(p,1.12);
  const spaced=(p,gap)=>out.every(b=>Math.hypot(b.x-p.x,(b.y-p.y)*1.35)>Math.max(gap,(b.w||30)*.4));
  // Outpost on the plaza: watchtowers, banners, portal and lanterns.
  for(const s of [-1,1]){put({key:d.tower,x:1000+s*150,y:1690,w:58,solid:[-12,-7,12,6]});put({key:d.banner,x:1000+s*86,y:1660,w:24});put({key:d.lantern,x:1000+s*120,y:1800,w:d.lantern==='lantern'?24:30,solid:[-5,-4,5,3]});}
  put({key:'portal',x:1000,y:1840,w:40});
  // Lantern pairs along the main road.
  const main=og.paths[0];let walked=0;for(let i=1;i<main.length;i++){const [ax,ay]=main[i-1],[bx,by]=main[i],len=Math.hypot(bx-ax,by-ay);walked+=len;if(walked<300||by>1600||by<180)continue;walked=0;const nx=-(by-ay)/len,ny=(bx-ax)/len;
   for(const s of [-1,1]){const p={x:bx+nx*58*s,y:by+ny*58*s};if(okGround(p,20))put({...p,key:d.lantern,w:d.lantern==='lantern'?22:28,solid:[-5,-4,5,3]});}}
  // Camps: a broken ring of standing stones and a shrine at the back.
  rules.camps.forEach((c,ci)=>{const side=c.x<1000?-1:1,gate=Math.atan2(15,-side*150);
   for(let k=0;k<16;k++){const ang=k/16*Math.PI*2;if(Math.abs(Math.atan2(Math.sin(ang-gate),Math.cos(ang-gate)))<.6)continue;const p={x:c.x+Math.cos(ang)*236+(random()-.5)*12,y:c.y+Math.sin(ang)*168+(random()-.5)*8};
    if(okGround(p,24))put({...p,key:d.rocks[(k+ci)%d.rocks.length],w:28+random()*12});}
   const back={x:c.x-side*190,y:c.y-100};if(okGround(back,20))put({...back,key:d.landmark[ci%d.landmark.length],w:84,solid:[-16,-8,16,6],landmark:true});});
  // Forests follow a low-frequency density field; the north rim is a dense
  // tree line, the south rim stays open so its cliffs read clearly.
  const cand=[];for(let y=110;y<1900;y+=44)for(let x=110;x<1900;x+=44)cand.push({x:x+(random()-.5)*36,y:y+(random()-.5)*30});
  cand.sort(()=>random()-.5);
  for(const p of cand){if(!okGround(p,30))continue;const rd=roadD(p);if(rd<64||inCamp(p)||Math.hypot(p.x-spawn.x,(p.y-spawn.y)*1.3)<290)continue;
   const f=r.n(p.x,p.y,260),edge=r.coastDist(p),rim=edge.north&&edge.dist<150,southRim=!edge.north&&edge.dist<120;
   let kind=null;
   if(rim&&random()<.75)kind='tree';else if(!southRim&&f>(d.forest||.56)&&random()<(f-(d.forest||.56))*2.6)kind='tree';else if(f>.44&&random()<.1)kind='shrub';else if(random()<.13)kind='tuft';
   if(!kind)continue;
   if(kind==='tree'){if(rd<84||!spaced(p,44))continue;const key=d.trees[Math.floor(random()*d.trees.length)];put({...p,key,w:(92+random()*30)*(rim?1.08:1),plant:PLANTS.has(key),solid:[-10,-6,10,5]});}
   else if(kind==='shrub'){if(!spaced(p,30))continue;const key=d.shrubs[Math.floor(random()*d.shrubs.length)];put({...p,key,w:30+random()*16,plant:PLANTS.has(key)});}
   else{if(!spaced(p,22))continue;put({...p,key:d.tufts[Math.floor(random()*d.tufts.length)],w:15+random()*9,plant:false});}
   if(out.length>720)break;}
  // Shorelines: reeds and stones on the banks, lotus on the quiet ponds.
  for(const l of r.lakes)for(let k=0;k<22*(d.reeds||1);k++){const ang=random()*Math.PI*2,t=1.08+random()*.16,p={x:l.x+Math.cos(ang)*l.rx*t,y:l.y+Math.sin(ang)*l.ry*t};
   if(r.land(p)&&!r.water(p,4)&&roadD(p)>50&&spaced(p,18))put({...p,key:d.shore[k%d.shore.length],w:16+random()*12,plant:false});
   if(l.lotus&&d.liquid.kind==='water'&&k<6){const q={x:l.x+(random()-.5)*l.rx*1.1,y:l.y+(random()-.5)*l.ry*1.1};if(r.water(q))put({...q,key:d.lotus[k%d.lotus.length],w:14+random()*8,plant:false});}}
  for(let i=4;i<r.river.pts.length-3;i+=3){const [x,y]=r.river.pts[i];for(const s of [-1,1]){const p={x:x+s*(r.river.width/2+10+random()*14),y:y+(random()-.5)*10};if(okGround(p,24)&&roadD(p)>50&&spaced(p,20))put({...p,key:d.shore[(i+s+3)%d.shore.length],w:15+random()*10,plant:false});}}
  r.tintKeys=new Set(out.filter(o=>o.tint).map(o=>o.key));for(const m of r.mesas)for(const k of m.trees||[])if(tintable(k))r.tintKeys.add(k);
  r.props=out;return out;}

 // ---------------------------------------------------------------- runtime hooks
 const current=()=>{if(window.tienHiep?.owns(world.state.scene))return null;const m=og.current();return m&&DESIGNS[m.id]?region(m.id):null;};
 window.isoTerrain={DESIGNS,region,current,bake,lights:()=>lights()};
 const change=world.switchScene;world.switchScene=function(...args){const result=change.apply(this,args);const r=current();
  if(r){world.buildings.splice(0,world.buildings.length,...layout(r));if(!world.services.some(s=>s.id==='field-road'))0;
   const vw=W/Z,vh=H/Z,{x:cx,y:cy}=gameCamera(vw,vh);for(let y=Math.floor(cy/CH);y<=Math.floor((cy+vh)/CH);y++)for(let x=Math.floor(cx/CH);x<=Math.floor((cx+vw)/CH);x++)chunk(r,x,y,true);}
  return result;};
 const floor=drawGround;
 drawGround=function(cx,cy,vw,vh){const r=current();if(!r)return floor(cx,cy,vw,vh);
  if(!window.mapIdentity?.hubSky?.(g,cx,cy,vw,vh)){g.fillStyle='#8fa6b4';g.fillRect(cx,cy,vw,vh);}
  if(r.d.sky){g.fillStyle=r.d.sky;g.fillRect(cx,cy,vw,vh);}
  clouds(r,cx,cy,vw,vh,false);
  let baked=0;const t0=performance.now();
  for(let y=Math.floor(cy/CH);y<=Math.floor((cy+vh)/CH);y++)for(let x=Math.floor(cx/CH);x<=Math.floor((cx+vw)/CH);x++){
   if(x<-1||y<-1||x>8||y>8)continue;let c=chunk(r,x,y,false);
   if(!c&&(baked<1||performance.now()-t0<12)){c=chunk(r,x,y,true);baked++;}
   if(c)g.drawImage(c,x*CH,y*CH,CH,CH);else{g.fillStyle=r.d.placeholder||'#5d7442';g.fillRect(x*CH,y*CH,CH,CH);}}
  waterfall(r);sparkle(r,cx,cy,vw,vh);glow(r,cx,cy,vw,vh);
 };
 // Drifting cloud banks under the island rim.
 function clouds(r,cx,cy,vw,vh){for(let i=0;i<14;i++){const base=r.coast[(i*37)%r.coast.length],x=base[0]+Math.sin(tm*.05+i)*40+(base[0]<1000?-90:90),y=base[1]+(base[1]>1000?150:-60)+Math.cos(tm*.04+i*2)*10;
  if(r.land({x,y})||x<cx-200||x>cx+vw+200||y<cy-150||y>cy+vh+150)continue;world.sprite(g,i%2?'cloud':'theme-14-068',x,y,180+(i%3)*60,undefined,.55);}}
 // The river pours off the south-east rim.
 const flows=new Map();
 const FLOW_FILTER={lava:'sepia(1) saturate(5) hue-rotate(-28deg) brightness(1.1)',void:'hue-rotate(225deg) saturate(1.6) brightness(.75)',ice:'saturate(.35) brightness(1.25)',water:'none'};
 function flowImage(kind){if(flows.has(kind))return flows.get(kind);const c=document.createElement('canvas');c.width=TEX.flow.naturalWidth;c.height=TEX.flow.naturalHeight;const x=c.getContext('2d');x.filter=FLOW_FILTER[kind]||'none';x.drawImage(TEX.flow,0,0);flows.set(kind,c);return c;}
 function waterfall(r){if(!ready(TEX.flow))return;const liq=r.d.liquid,image=flowImage(liq.kind);let edge=null;for(let i=r.river.pts.length-1;i>0;i--){const p={x:r.river.pts[i][0],y:r.river.pts[i][1]};if(r.land(p)){edge=p;break;}}if(!edge)return;
  const w=r.river.width*1.1,h=230,x=edge.x-w/2,y=edge.y+4;g.save();g.beginPath();g.rect(x-4,y,w+8,h);g.clip();
  for(let k=0;k<2;k++){const off=liq.kind==='ice'?(k?h:0):((tm*(liq.kind==='lava'?28:70))%h)+(k-1)*h;g.globalAlpha=.9;g.drawImage(image,x,y+off,w,h);}
  const mc=r.d.mist||'214,220,228',fade=g.createLinearGradient(0,y,0,y+h);fade.addColorStop(0,'rgba('+mc+',0)');fade.addColorStop(.75,'rgba('+mc+',.25)');fade.addColorStop(1,'rgba('+mc+',.95)');g.globalAlpha=1;g.fillStyle=fade;g.fillRect(x-4,y,w+8,h);g.restore();
  if(liq.kind==='ice')return;g.save();g.globalCompositeOperation='lighter';for(let k=0;k<6;k++){const t=(tm*.8+k/6)%1;g.fillStyle='rgba('+liq.glint+','+(.22*(1-t))+')';g.beginPath();g.ellipse(edge.x+(k-2.5)*8,edge.y+2-t*6,6+t*10,3+t*4,0,0,Math.PI*2);g.fill();}g.restore();}
 const glints=new Map();
 function sparkle(r,cx,cy,vw,vh){let pts=glints.get(r.id);if(!pts){pts=[];let s=r.d.seed;const rnd=()=>((s=s*16807%2147483647)/2147483647);for(let i=0;i<4000&&pts.length<260;i++){const p={x:rnd()*2000,y:rnd()*2000};if(r.water(p,-8)&&r.land(p))pts.push({...p,ph:rnd()*6.28,len:4+rnd()*8});}glints.set(r.id,pts);}
  g.save();g.globalCompositeOperation='lighter';g.lineWidth=1.1;g.lineCap='round';for(const p of pts){if(p.x<cx-20||p.x>cx+vw+20||p.y<cy-20||p.y>cy+vh+20)continue;const a=Math.max(0,Math.sin(tm*1.6+p.ph))**3*.5;if(a<.02)continue;
   g.strokeStyle='rgba('+r.d.liquid.glint+','+a+')';g.beginPath();g.moveTo(p.x-p.len/2,p.y);g.lineTo(p.x+p.len/2,p.y);g.stroke();}g.restore();}
 // Emissive liquids (lava, void) glow day and night and shed rising sparks.
 const emitters=new Map();
 function emitPoints(r){if(emitters.has(r.id))return emitters.get(r.id);const pts=[];if(r.d.liquid.glow){for(let i=0;i<r.river.pts.length;i+=4){const [x,y]=r.river.pts[i];if(r.land({x,y}))pts.push({x,y,r:r.river.width*1.6});}
  for(const l of r.lakes){pts.push({x:l.x,y:l.y,r:Math.max(l.rx,l.ry)*1.3});for(let k=0;k<6;k++){const a=k/6*Math.PI*2;pts.push({x:l.x+Math.cos(a)*l.rx*.7,y:l.y+Math.sin(a)*l.ry*.7,r:Math.min(l.rx,l.ry)*1.1});}}}
  emitters.set(r.id,pts);return pts;}
 function glow(r,cx,cy,vw,vh){const c=r.d.liquid.glow;if(!c)return;const pts=emitPoints(r);g.save();g.globalCompositeOperation='lighter';
  for(const [i,p] of pts.entries()){if(p.x<cx-p.r||p.x>cx+vw+p.r||p.y<cy-p.r||p.y>cy+vh+p.r)continue;const a=(.16+.08*Math.sin(tm*1.3+i*1.7)),gr=g.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);gr.addColorStop(0,'rgba('+c.join(',')+','+a+')');gr.addColorStop(1,'rgba('+c.join(',')+',0)');g.fillStyle=gr;g.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2);
   for(let k=0;k<3;k++){const t=(tm*.35+i*.37+k*.33)%1,x=p.x+Math.sin(i*3.1+k*2)*p.r*.4+Math.sin(tm+k)*4,y=p.y-t*70;g.fillStyle='rgba('+r.d.liquid.glint+','+(.7*(1-t))+')';g.fillRect(x,y,1.6,1.6);}}g.restore();}
 // Night lights for 58-lighting: emissive liquids light their banks.
 function lights(){const r=current();if(!r||!r.d.liquid.glow)return [];return emitPoints(r).filter((p,i)=>i%2===0).map(p=>({x:p.x,y:p.y,r:p.r*1.5,rgb:r.d.liquid.glow}));}
 // Borrowed meadow props are recoloured per zone (snowy, charred, withered).
 const tinted=new Map();let tintNow=null;
 function recolour(image,zone){const key=image.src+'|'+zone.id;let c=tinted.get(key);if(c)return c;c=document.createElement('canvas');c.width=image.naturalWidth||image.width;c.height=image.naturalHeight||image.height;const x=c.getContext('2d');
  x.filter=zone.d.propFilter||'none';x.drawImage(image,0,0);x.filter='none';
  if(zone.d.snow){x.globalCompositeOperation='source-atop';const gr=x.createLinearGradient(0,0,0,c.height);gr.addColorStop(0,'rgba(255,255,255,.72)');gr.addColorStop(.45,'rgba(236,244,255,.35)');gr.addColorStop(.75,'rgba(220,235,255,0)');x.fillStyle=gr;x.fillRect(0,0,c.width,c.height);}
  if(zone.d.liquid.kind==='void'){x.globalCompositeOperation='source-atop';x.fillStyle='rgba(90,60,150,.3)';x.fillRect(0,0,c.width,c.height);}
  tinted.set(key,c);return c;}
 const art=window.renderArtwork;if(art)window.renderArtwork=function(ctx,image,...rest){if(tintNow&&image&&(image.naturalWidth||image.width))return art.call(this,ctx,recolour(image,tintNow),...rest);return art.call(this,ctx,image,...rest);};
 // Swaying foliage (32b) draws straight from the image, so the main canvas swaps images too.
 const drawImage=g.drawImage;g.drawImage=function(image,...rest){if(tintNow&&image instanceof HTMLImageElement&&image.naturalWidth)return drawImage.call(this,recolour(image,tintNow),...rest);return drawImage.call(this,image,...rest);};
 const spriteDraw=world.sprite;world.sprite=function(ctx,key,...rest){const r=current();if(r&&(r.d.propFilter||r.d.snow)&&r.tintKeys?.has(key)){tintNow=r;try{return spriteDraw.call(this,ctx,key,...rest);}finally{tintNow=null;}}return spriteDraw.call(this,ctx,key,...rest);};
 // Mesas and the trees on their caps join the depth-sorted actor list.
 const actors=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){actors.call(this,items,cx,cy,vw,vh);const r=current();if(!r)return;
  for(const m of r.mesas){if(m.x<cx-m.a-60||m.x>cx+vw+m.a+60||m.y<cy-60||m.y-m.h>cy+vh+60)continue;
   items.push([m.y+m.a*.22,()=>{const c=mesaSprite(r,m);if(!c)return;g.save();g.fillStyle='rgba(24,32,18,.28)';g.beginPath();g.moveTo(m.x-m.a*.2,m.y+m.a/2);g.lineTo(m.x+m.a*1.35,m.y+m.a*.18);g.lineTo(m.x+m.a*1.1,m.y-m.a*.05);g.lineTo(m.x+m.a,m.y);g.closePath();g.filter='blur(4px)';g.fill();g.restore();
    g.drawImage(c,m.x-m.origin.x,m.y-m.origin.y,m.origin.w,m.origin.h);}]);
   (m.trees||[]).forEach((key,i)=>{const x=m.x+(i?m.a*.32:-m.a*.18),y=m.y-m.h+(i?6:-4);items.push([m.y+m.a*.22+.5+i*.01,()=>{if(!r.tintKeys?.has(key)&&PLANTS.has(key)&&world.living?.foliage(g,key,x,y,i?60:96,undefined,1))return;world.sprite(g,key,x,y,i?60:96);}]);});}
 };
 // Walkability: on land, out of deep water and off the mesas.
 const walk=world.canWalk;world.canWalk=p=>{const r=current();if(r&&(!r.land(p)||r.coastDist(p).dist<18||(!r.d.liquid.walk&&r.water(p,-6))||r.mesaAt(p,1.02)))return false;return walk(p);};
 // Let the camera reach past the rim so the cliffs and clouds are visible.
 const cam=world.camera;world.camera=(vw,vh)=>current()?{x:clamp(P.x-vw/2,-60,2060-vw),y:clamp(P.y-vh/2,-60,2080-vh),vw,vh}:cam(vw,vh);
 // Minimap follows the terrain.
 const mini=world.renderMini;world.renderMini=function(ctx,size){const r=current();if(!r)return mini(ctx,size);ctx.fillStyle='#8fa6b4';ctx.fillRect(0,0,size,size);ctx.save();ctx.scale(size/2000,size/2000);
  const MINI={'field-frost':['#dfe8f2','#a9d4ee'],'field-ember':['#5a3a32','#ff8a3a'],'field-abyss':['#4a4458','#9a6ae0'],'field-marsh':['#6a7a58','#5f8f7f'],'field-bamboo':['#4f7040','#4f9cb0']}[r.id]||['#5f7a45','#4f9cb0'];
  ctx.fillStyle=MINI[0];path(ctx,r.coast);ctx.fill();ctx.fillStyle='#d8c9a6';path(ctx,r.plaza.pts);ctx.fill();
  ctx.lineCap='round';ctx.strokeStyle='#c5b28a';og.paths.forEach((route,i)=>{ctx.lineWidth=i?30:44;path(ctx,route,false);ctx.stroke();});
  ctx.fillStyle=MINI[1];for(const l of r.lakes){path(ctx,l.pts);ctx.fill();}ctx.strokeStyle=MINI[1];ctx.lineWidth=r.river.width;path(ctx,r.river.pts,false);ctx.stroke();
  ctx.fillStyle='#7b7468';for(const m of r.mesas){ctx.beginPath();ctx.moveTo(m.x-m.a,m.y);ctx.lineTo(m.x,m.y-m.a/2);ctx.lineTo(m.x+m.a,m.y);ctx.lineTo(m.x,m.y+m.a/2);ctx.fill();}
  for(const c of overworldRules.camps){ctx.fillStyle='#dc897a';ctx.beginPath();ctx.arc(c.x,c.y,38,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#fff5ba';ctx.beginPath();ctx.arc(P.x,P.y,24,0,Math.PI*2);ctx.fill();ctx.restore();};
 // Bake queued chunks in idle time.
 const update=up;up=function(dt){const result=update(dt);const r=current();if(r&&r.queue.length){const key=r.queue.shift();if(!r.chunks.has(key)){const [x,y]=key.split(',').map(Number);chunk(r,x,y,true);}}return result;};
})();
