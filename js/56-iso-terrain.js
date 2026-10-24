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
 const K=1150; // coastline: inside the 85..1915 square and |dx|/2+|dy|<K (2:1 diagonals)
 const DESIGNS={
  'field-meadow':{seed:4127,
   coast:[[530,85],[1470,85],[1915,308],[1915,1692],[1470,1915],[530,1915],[85,1692],[85,308]],
   lakes:[{x:1812,y:1052,rx:92,ry:64},{x:640,y:1648,rx:84,ry:46,lotus:true},{x:808,y:196,rx:74,ry:40,lotus:true}],
   river:{width:50,points:[[1800,1100],[1792,1190],[1768,1320],[1792,1470],[1764,1620],[1748,1730],[1746,1830]]},
   mesas:[{x:762,y:1104,a:92,h:74,trees:['theme-14-035','theme-14-063']},{x:1232,y:624,a:82,h:66,trees:['pineTree','theme-14-045']},
          {x:286,y:1088,a:70,h:58,trees:['theme-14-036']},{x:1560,y:1622,a:76,h:62,trees:['theme-14-038','theme-14-062']}],
   plaza:{x:1000,y:1772,a:205},
   palette:{tint:[1,1,1],dry:[1.1,1.04,.8],lush:[.82,.95,.8],water:[[92,170,156],[30,86,108]]},
   trees:['theme-14-035','theme-14-038','pineTree','theme-14-036','theme-14-046','whiteBlossom','theme-14-035'],
   shrubs:['theme-14-045','theme-14-063','theme-14-057','theme-14-058'],tufts:['theme-14-061','theme-14-062','theme-14-055','theme-14-056'],
   rocks:['theme-14-052','theme-14-053','theme-14-054'],shore:['theme-14-061','theme-14-062','theme-14-052'],
   tower:'theme-14-010',banner:'theme-14-024',landmark:['theme-14-047','theme-14-069','theme-14-010']}
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
 function texture(key,units){const id=key+'@'+units;if(texCache.has(id))return texCache.get(id);const image=TEX[key];if(!ready(image))return null;
  const w=Math.round(units*S),h=Math.round(units*S*image.naturalHeight/image.naturalWidth),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(image,0,0,w,h);
  const t={w,h,data:x.getImageData(0,0,w,h).data};texCache.set(id,t);return t;}
 let cliffPattern=null;function cliff(ctx){if(!ready(TEX.cliff))return null;const p=ctx.createPattern(TEX.cliff,'repeat');p.setTransform(new DOMMatrix().scale(230*S/TEX.cliff.naturalWidth));return p;}

 // ---------------------------------------------------------------- chunk baking
 function mask(r,x0,y0,draw,blur){const size=Math.ceil((CH+PAD*2)*MS),c=document.createElement('canvas');c.width=c.height=size;const ctx=c.getContext('2d');
  ctx.filter=blur?`blur(${blur*MS}px)`:'none';ctx.setTransform(MS,0,0,MS,(PAD-x0)*MS,(PAD-y0)*MS);ctx.fillStyle=ctx.strokeStyle='#fff';draw(ctx);
  const data=ctx.getImageData(0,0,size,size).data,out=new Float32Array(size*size);for(let i=0;i<out.length;i++)out[i]=data[i*4+3]/255;return {size,out};}
 function sample(m,wx,wy,x0,y0){const fx=(wx-x0+PAD)*MS-.5,fy=(wy-y0+PAD)*MS-.5,ix=clamp(Math.floor(fx),0,m.size-2),iy=clamp(Math.floor(fy),0,m.size-2),tx=clamp(fx-ix,0,1),ty=clamp(fy-iy,0,1),o=iy*m.size+ix,a=m.out[o],b=m.out[o+1],c=m.out[o+m.size],d=m.out[o+m.size+1];
  return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;}
 const path=(ctx,pts,close=true)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));if(close)ctx.closePath();};
 function bake(r,cx,cy){
  const grass=texture('grass',384),dirt=texture('dirt',300),stone=texture('stone',288);if(!grass||!dirt||!stone||!ready(TEX.cliff))return null;
  const x0=cx*CH,y0=cy*CH,px=Math.round(CH*S),d=r.d,pal=d.palette;
  const land=mask(r,x0,y0,c=>{path(c,r.coast);c.fill();},4);
  const roadMask=mask(r,x0,y0,c=>{c.lineCap=c.lineJoin='round';og.paths.forEach((route,i)=>{c.lineWidth=i?50:78;path(c,route,false);c.stroke();});
   for(const camp of overworldRules.camps){c.globalAlpha=.85;c.beginPath();c.ellipse(camp.x,camp.y,190,132,0,0,Math.PI*2);c.fill();c.globalAlpha=.45;c.beginPath();c.ellipse(camp.x,camp.y,235,165,0,0,Math.PI*2);c.fill();c.globalAlpha=1;}},14);
  const stoneMask=mask(r,x0,y0,c=>{path(c,r.plaza.pts);c.fill();},2);
  const waterMask=mask(r,x0,y0,c=>{for(const l of r.lakes){path(c,l.pts);c.fill();}c.lineCap=c.lineJoin='round';c.lineWidth=r.river.width;path(c,r.river.pts,false);c.stroke();},14);
  const top=document.createElement('canvas');top.width=top.height=px;const tctx=top.getContext('2d'),image=tctx.createImageData(px,px),o=image.data;
  const [shallow,deep]=pal.water;
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
    R*=wet;G*=wet;B*=wet*1.02;
    if(wa>0){const ripple=(r.n(wx*1.6,wy*3.2,6)-.5)*18,wr=shallow[0]+(deep[0]-shallow[0])*depth+ripple,wg=shallow[1]+(deep[1]-shallow[1])*depth+ripple,wb=shallow[2]+(deep[2]-shallow[2])*depth+ripple*.6,foam=Math.max(0,1-Math.abs(wm-.535)/.03)*.45;
     R+=(wr+(230-wr)*foam-R)*wa;G+=(wg+(242-wg)*foam-G)*wa;B+=(wb+(236-wb)*foam-B)*wa;}
    o[i]=R;o[i+1]=G;o[i+2]=B;o[i+3]=la*255;}
  }
  tctx.putImageData(image,0,0);
  const c=document.createElement('canvas');c.width=c.height=px;const ctx=c.getContext('2d');ctx.setTransform(S,0,0,S,-x0*S,-y0*S);
  cliffFaces(ctx,r,x0,y0);
  ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(top,0,0);
  return c;}
 // Cliffs hang under every south-facing coastline segment and fade into the mist.
 function cliffFaces(ctx,r,x0,y0){const H=190,pattern=cliff(ctx);if(!pattern)return;const coast=r.coast;
  for(let i=0;i<coast.length;i++){const a=coast[i],b=coast[(i+1)%coast.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!len)continue;const nx=(b[1]-a[1])/len,ny=-(b[0]-a[0])/len;if(ny<=.05){lip(ctx,a,b,nx,ny,pattern);continue;}
   if(Math.max(a[0],b[0])<x0-20||Math.min(a[0],b[0])>x0+CH+20||Math.max(a[1],b[1])+H<y0||Math.min(a[1],b[1])>y0+CH)continue;
   const h1=H*(.8+r.n(a[0],a[1],40)*.45),h2=H*(.8+r.n(b[0],b[1],40)*.45);
   const quad=[[a[0],a[1]-2],[b[0],b[1]-2],[b[0],b[1]+h2],[a[0],a[1]+h1]];
   ctx.save();path(ctx,quad);ctx.fillStyle=pattern;ctx.fill();
   // Light from the upper left: SW faces lit, SE faces in shade.
   ctx.fillStyle=nx<-.2?'rgba(255,236,210,.06)':nx>.2?'rgba(18,26,46,.42)':'rgba(18,26,46,.2)';ctx.fill();
   const edgeShade=ctx.createLinearGradient(0,Math.min(a[1],b[1]),0,Math.min(a[1],b[1])+16);edgeShade.addColorStop(0,'rgba(20,30,20,.55)');edgeShade.addColorStop(1,'rgba(20,30,20,0)');ctx.fillStyle=edgeShade;ctx.fill();
   const mist=ctx.createLinearGradient(0,Math.min(a[1],b[1])+40,0,Math.max(a[1],b[1])+Math.max(h1,h2));mist.addColorStop(0,'rgba(196,186,196,0)');mist.addColorStop(1,'rgba(206,196,204,.95)');ctx.fillStyle=mist;ctx.fill();ctx.restore();}}
 // North/side rims: a short rock band just outside the edge so the island has thickness.
 function lip(ctx,a,b,nx,ny,pattern){const d=[nx*7,Math.max(10,ny*7+12)];ctx.save();path(ctx,[[a[0],a[1]],[b[0],b[1]],[b[0]+d[0],b[1]+d[1]],[a[0]+d[0],a[1]+d[1]]]);ctx.fillStyle=pattern;ctx.fill();ctx.fillStyle='rgba(30,36,48,.5)';ctx.fill();ctx.restore();}
 function chunk(r,cx,cy,force){const key=cx+','+cy;let c=r.chunks.get(key);if(c){r.chunks.delete(key);r.chunks.set(key,c);return c;}
  if(!force){if(!r.queue.includes(key))r.queue.push(key);return null;}
  c=bake(r,cx,cy);if(!c)return null;r.chunks.set(key,c);const vw=W/Z,vh=H/Z,limit=Math.max(30,Math.ceil(vw/CH+2)*Math.ceil(vh/CH+2)+6);while(r.chunks.size>limit)r.chunks.delete(r.chunks.keys().next().value);return c;}

 // ---------------------------------------------------------------- mesas (raised rock outcrops, depth-sorted)
 const TAPER=.84; // caps are narrower than the base: sloped rock walls
 function mesaSprite(r,m){if(m.canvas)return m.canvas;const grass=texture('grass',384);if(!grass||!ready(TEX.cliff))return null;
  const a=m.a,h=m.h,pad=12,W=(a*2+pad*2),Hh=(a+h+pad*2),c=document.createElement('canvas');c.width=Math.ceil(W*S);c.height=Math.ceil(Hh*S);const ctx=c.getContext('2d');
  ctx.setTransform(S,0,0,S,(a+pad)*S,(a/2+h+pad)*S); // origin = footprint centre on the ground
  const rim=[];const corners=[[-a,0],[0,-a/2],[a,0],[0,a/2]];corners.forEach((p,i)=>{const q=corners[(i+1)%4];for(let k=0;k<8;k++){const t=k/8,x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t,j=(r.n(m.x+x,m.y+y,9)-.5)*7;rim.push([x+j,y+j*.5]);}});
  // South faces: rim R->B (right, in shade) and B->L (left, lit), from the cap down to the ground.
  const cp=ctx.createPattern(TEX.cliff,'repeat');cp.setTransform(new DOMMatrix().scale(160/TEX.cliff.naturalWidth));
  for(const [from,to,lit] of [[16,24,false],[24,32,true]]){const chain=[];for(let k=from;k<=to;k++)chain.push(rim[k%rim.length]);
   const poly=[...chain.map(([x,y])=>[x*TAPER,y*TAPER-h]),...chain.slice().reverse().map(([x,y])=>[x,y+(r.n(m.x+x*3,m.y,5)-.5)*4])];
   path(ctx,poly);ctx.fillStyle=cp;ctx.fill();ctx.fillStyle=lit?'rgba(255,236,206,.08)':'rgba(16,24,44,.45)';ctx.fill();
   const ao=ctx.createLinearGradient(0,-h,0,a/2);ao.addColorStop(0,'rgba(0,0,0,0)');ao.addColorStop(1,'rgba(18,22,18,.4)');ctx.fillStyle=ao;ctx.fill();}
  // Grass cap with a mossy overhang.
  const capPattern=ctx.createPattern((()=>{const t=document.createElement('canvas');t.width=grass.w;t.height=grass.h;t.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(grass.data),grass.w,grass.h),0,0);return t;})(),'repeat');
  capPattern.setTransform(new DOMMatrix().scale(1/S));
  const cap=rim.map(([x,y])=>[x*TAPER,y*TAPER-h]);
  // Back rim: a sliver of rock above the cap's north edges gives the block thickness.
  ctx.save();path(ctx,cap);ctx.lineWidth=7;ctx.strokeStyle='rgba(70,76,84,.95)';ctx.stroke();ctx.restore();
  path(ctx,cap);ctx.fillStyle=capPattern;ctx.fill();
  // Sunlit cap: brighter and warmer than the meadow below, darker toward the rim.
  ctx.save();ctx.clip();ctx.fillStyle='rgba(255,246,190,.16)';ctx.fillRect(-a-pad,-h-a,a*2+pad*2,a*2);
  const shade=ctx.createRadialGradient(-a*.2,-h-a*.12,a*.15,0,-h,a*1.05);shade.addColorStop(0,'rgba(0,0,0,0)');shade.addColorStop(1,'rgba(30,44,18,.42)');ctx.fillStyle=shade;ctx.fillRect(-a-pad,-h-a,a*2+pad*2,a*2);ctx.restore();
  path(ctx,cap);ctx.lineWidth=2.2;ctx.strokeStyle='rgba(88,120,52,.95)';ctx.stroke();ctx.lineWidth=1;ctx.strokeStyle='rgba(226,240,170,.55)';ctx.stroke();
  m.canvas=c;m.origin={x:(a+pad),y:(a/2+h+pad),w:W,h:Hh};return c;}

 // ---------------------------------------------------------------- props (terrain-aware layout)
 function layout(r){if(r.props)return r.props;const d=r.d,rules=overworldRules,out=[];let seed=d.seed;const random=()=>((seed=seed*16807%2147483647)/2147483647);
  const put=o=>{out.push(o);return o;},spawn={x:1000,y:1770};
  const roadD=p=>og.roadDistance(p);
  const inCamp=(p,k=1)=>rules.camps.some(c=>((p.x-c.x)/(235*k))**2+((p.y-c.y)/(170*k))**2<1);
  const okGround=(p,edge=34)=>r.land(p)&&r.coastDist(p).dist>edge&&!r.water(p,18)&&!r.mesaAt(p,1.25)&&!r.onPlaza(p,1.12);
  const spaced=(p,gap)=>out.every(b=>Math.hypot(b.x-p.x,(b.y-p.y)*1.35)>Math.max(gap,(b.w||30)*.4));
  // Outpost on the plaza: watchtowers, banners, portal and lanterns.
  for(const s of [-1,1]){put({key:d.tower,x:1000+s*150,y:1690,w:58,solid:[-12,-7,12,6]});put({key:d.banner,x:1000+s*86,y:1660,w:24});put({key:'lantern',x:1000+s*120,y:1800,w:24,solid:[-5,-4,5,3]});}
  put({key:'portal',x:1000,y:1840,w:40});
  // Lantern pairs along the main road.
  const main=og.paths[0];let walked=0;for(let i=1;i<main.length;i++){const [ax,ay]=main[i-1],[bx,by]=main[i],len=Math.hypot(bx-ax,by-ay);walked+=len;if(walked<300||by>1600||by<180)continue;walked=0;const nx=-(by-ay)/len,ny=(bx-ax)/len;
   for(const s of [-1,1]){const p={x:bx+nx*58*s,y:by+ny*58*s};if(okGround(p,20))put({...p,key:'lantern',w:22,solid:[-5,-4,5,3]});}}
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
   if(rim&&random()<.75)kind='tree';else if(!southRim&&f>.56&&random()<(f-.56)*2.6)kind='tree';else if(f>.44&&random()<.1)kind='shrub';else if(random()<.13)kind='tuft';
   if(!kind)continue;
   if(kind==='tree'){if(rd<84||!spaced(p,44))continue;const key=d.trees[Math.floor(random()*d.trees.length)];put({...p,key,w:(92+random()*30)*(rim?1.08:1),plant:PLANTS.has(key),solid:[-10,-6,10,5]});}
   else if(kind==='shrub'){if(!spaced(p,30))continue;const key=d.shrubs[Math.floor(random()*d.shrubs.length)];put({...p,key,w:30+random()*16,plant:PLANTS.has(key)});}
   else{if(!spaced(p,22))continue;put({...p,key:d.tufts[Math.floor(random()*d.tufts.length)],w:15+random()*9,plant:false});}
   if(out.length>720)break;}
  // Shorelines: reeds and stones on the banks, lotus on the quiet ponds.
  for(const l of r.lakes)for(let k=0;k<22;k++){const ang=random()*Math.PI*2,t=1.08+random()*.16,p={x:l.x+Math.cos(ang)*l.rx*t,y:l.y+Math.sin(ang)*l.ry*t};
   if(r.land(p)&&!r.water(p,4)&&roadD(p)>50&&spaced(p,18))put({...p,key:d.shore[k%d.shore.length],w:16+random()*12,plant:false});
   if(l.lotus&&k<5){const q={x:l.x+(random()-.5)*l.rx*1.1,y:l.y+(random()-.5)*l.ry*1.1};if(r.water(q))put({...q,key:'theme-14-060',w:14+random()*6,plant:false});}}
  for(let i=4;i<r.river.pts.length-3;i+=3){const [x,y]=r.river.pts[i];for(const s of [-1,1]){const p={x:x+s*(r.river.width/2+10+random()*14),y:y+(random()-.5)*10};if(okGround(p,24)&&roadD(p)>50&&spaced(p,20))put({...p,key:d.shore[(i+s+3)%d.shore.length],w:15+random()*10,plant:false});}}
  r.props=out;return out;}

 // ---------------------------------------------------------------- runtime hooks
 const current=()=>{const m=og.current();return m&&DESIGNS[m.id]?region(m.id):null;};
 window.isoTerrain={DESIGNS,region,current,bake};
 const change=world.switchScene;world.switchScene=function(...args){const result=change.apply(this,args);const r=current();
  if(r){world.buildings.splice(0,world.buildings.length,...layout(r));if(!world.services.some(s=>s.id==='field-road'))0;
   const vw=W/Z,vh=H/Z,{x:cx,y:cy}=gameCamera(vw,vh);for(let y=Math.floor(cy/CH);y<=Math.floor((cy+vh)/CH);y++)for(let x=Math.floor(cx/CH);x<=Math.floor((cx+vw)/CH);x++)chunk(r,x,y,true);}
  return result;};
 const floor=drawGround;
 drawGround=function(cx,cy,vw,vh){const r=current();if(!r)return floor(cx,cy,vw,vh);
  if(!window.mapIdentity?.hubSky?.(g,cx,cy,vw,vh)){g.fillStyle='#8fa6b4';g.fillRect(cx,cy,vw,vh);}
  clouds(r,cx,cy,vw,vh,false);
  let baked=0;const t0=performance.now();
  for(let y=Math.floor(cy/CH);y<=Math.floor((cy+vh)/CH);y++)for(let x=Math.floor(cx/CH);x<=Math.floor((cx+vw)/CH);x++){
   if(x<-1||y<-1||x>8||y>8)continue;let c=chunk(r,x,y,false);
   if(!c&&(baked<1||performance.now()-t0<12)){c=chunk(r,x,y,true);baked++;}
   if(c)g.drawImage(c,x*CH,y*CH,CH,CH);else{g.fillStyle='#5d7442';g.fillRect(x*CH,y*CH,CH,CH);}}
  waterfall(r);sparkle(r,cx,cy,vw,vh);
 };
 // Drifting cloud banks under the island rim.
 function clouds(r,cx,cy,vw,vh){for(let i=0;i<14;i++){const base=r.coast[(i*37)%r.coast.length],x=base[0]+Math.sin(tm*.05+i)*40+(base[0]<1000?-90:90),y=base[1]+(base[1]>1000?150:-60)+Math.cos(tm*.04+i*2)*10;
  if(r.land({x,y})||x<cx-200||x>cx+vw+200||y<cy-150||y>cy+vh+150)continue;world.sprite(g,i%2?'cloud':'theme-14-068',x,y,180+(i%3)*60,undefined,.55);}}
 // The river pours off the south-east rim.
 function waterfall(r){if(!ready(TEX.flow))return;const end=r.river.pts[r.river.pts.length-1];let edge=null;for(let i=r.river.pts.length-1;i>0;i--){const p={x:r.river.pts[i][0],y:r.river.pts[i][1]};if(r.land(p)){edge=p;break;}}if(!edge)return;
  const w=r.river.width*1.1,h=230,x=edge.x-w/2,y=edge.y+4;g.save();g.beginPath();g.rect(x-4,y,w+8,h);g.clip();
  for(let k=0;k<2;k++){const off=((tm*70)%h)+(k-1)*h;g.globalAlpha=.88;g.drawImage(TEX.flow,x,y+off,w,h);}
  const fade=g.createLinearGradient(0,y,0,y+h);fade.addColorStop(0,'rgba(220,240,250,0)');fade.addColorStop(.75,'rgba(214,226,232,.25)');fade.addColorStop(1,'rgba(214,220,228,.95)');g.globalAlpha=1;g.fillStyle=fade;g.fillRect(x-4,y,w+8,h);g.restore();
  g.save();g.globalCompositeOperation='lighter';for(let k=0;k<6;k++){const t=(tm*.8+k/6)%1;g.fillStyle='rgba(220,245,255,'+(.22*(1-t))+')';g.beginPath();g.ellipse(edge.x+(k-2.5)*8,edge.y+2-t*6,6+t*10,3+t*4,0,0,Math.PI*2);g.fill();}g.restore();}
 const glints=new Map();
 function sparkle(r,cx,cy,vw,vh){let pts=glints.get(r.id);if(!pts){pts=[];let s=r.d.seed;const rnd=()=>((s=s*16807%2147483647)/2147483647);for(let i=0;i<4000&&pts.length<260;i++){const p={x:rnd()*2000,y:rnd()*2000};if(r.water(p,-8)&&r.land(p))pts.push({...p,ph:rnd()*6.28,len:4+rnd()*8});}glints.set(r.id,pts);}
  g.save();g.globalCompositeOperation='lighter';g.lineWidth=1.1;g.lineCap='round';for(const p of pts){if(p.x<cx-20||p.x>cx+vw+20||p.y<cy-20||p.y>cy+vh+20)continue;const a=Math.max(0,Math.sin(tm*1.6+p.ph))**3*.5;if(a<.02)continue;
   g.strokeStyle='rgba(230,250,255,'+a+')';g.beginPath();g.moveTo(p.x-p.len/2,p.y);g.lineTo(p.x+p.len/2,p.y);g.stroke();}g.restore();}
 // Mesas and the trees on their caps join the depth-sorted actor list.
 const actors=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){actors.call(this,items,cx,cy,vw,vh);const r=current();if(!r)return;
  for(const m of r.mesas){if(m.x<cx-m.a-60||m.x>cx+vw+m.a+60||m.y<cy-60||m.y-m.h>cy+vh+60)continue;
   items.push([m.y+m.a*.22,()=>{const c=mesaSprite(r,m);if(!c)return;g.save();g.fillStyle='rgba(24,32,18,.28)';g.beginPath();g.moveTo(m.x-m.a*.2,m.y+m.a/2);g.lineTo(m.x+m.a*1.35,m.y+m.a*.18);g.lineTo(m.x+m.a*1.1,m.y-m.a*.05);g.lineTo(m.x+m.a,m.y);g.closePath();g.filter='blur(4px)';g.fill();g.restore();
    g.drawImage(c,m.x-m.origin.x,m.y-m.origin.y,m.origin.w,m.origin.h);}]);
   (m.trees||[]).forEach((key,i)=>{const x=m.x+(i?m.a*.32:-m.a*.18),y=m.y-m.h+(i?6:-4);items.push([m.y+m.a*.22+.5+i*.01,()=>{if(PLANTS.has(key)&&world.living?.foliage(g,key,x,y,i?60:96,undefined,1))return;world.sprite(g,key,x,y,i?60:96);}]);});}
 };
 // Walkability: on land, out of deep water and off the mesas.
 const walk=world.canWalk;world.canWalk=p=>{const r=current();if(r&&(!r.land(p)||r.coastDist(p).dist<18||r.water(p,-6)||r.mesaAt(p,1.02)))return false;return walk(p);};
 // Let the camera reach past the rim so the cliffs and clouds are visible.
 const cam=world.camera;world.camera=(vw,vh)=>current()?{x:clamp(P.x-vw/2,-60,2060-vw),y:clamp(P.y-vh/2,-60,2080-vh),vw,vh}:cam(vw,vh);
 // Minimap follows the terrain.
 const mini=world.renderMini;world.renderMini=function(ctx,size){const r=current();if(!r)return mini(ctx,size);ctx.fillStyle='#8fa6b4';ctx.fillRect(0,0,size,size);ctx.save();ctx.scale(size/2000,size/2000);
  ctx.fillStyle='#5f7a45';path(ctx,r.coast);ctx.fill();ctx.fillStyle='#d8c9a6';path(ctx,r.plaza.pts);ctx.fill();
  ctx.lineCap='round';ctx.strokeStyle='#c5b28a';og.paths.forEach((route,i)=>{ctx.lineWidth=i?30:44;path(ctx,route,false);ctx.stroke();});
  ctx.fillStyle='#4f9cb0';for(const l of r.lakes){path(ctx,l.pts);ctx.fill();}ctx.strokeStyle='#4f9cb0';ctx.lineWidth=r.river.width;path(ctx,r.river.pts,false);ctx.stroke();
  ctx.fillStyle='#7b7468';for(const m of r.mesas){ctx.beginPath();ctx.moveTo(m.x-m.a,m.y);ctx.lineTo(m.x,m.y-m.a/2);ctx.lineTo(m.x+m.a,m.y);ctx.lineTo(m.x,m.y+m.a/2);ctx.fill();}
  for(const c of overworldRules.camps){ctx.fillStyle='#dc897a';ctx.beginPath();ctx.arc(c.x,c.y,38,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#fff5ba';ctx.beginPath();ctx.arc(P.x,P.y,24,0,Math.PI*2);ctx.fill();ctx.restore();};
 // Bake queued chunks in idle time.
 const update=up;up=function(dt){const result=update(dt);const r=current();if(r&&r.queue.length){const key=r.queue.shift();if(!r.chunks.has(key)){const [x,y]=key.split(',').map(Number);chunk(r,x,y,true);}}return result;};
})();
