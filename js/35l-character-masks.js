/* Retarget mask expressions into the native skin silhouette, preserving hair and head gear. */
(function(){
 const masks=new Map(equipmentRules.masks.map(item=>[item.id,item])),cache=new Map(),portraits=new Map();
 // Native skin rectangles: source coordinates, never a second head over the sprite.
 const faces=[
  {Nam:{truoc:[.35,.295,.29,.22],trai:[.335,.30,.22,.20],phai:[.48,.29,.24,.20]},Nu:{truoc:[.35,.18,.34,.185],trai:[.27,.175,.23,.19],phai:[.55,.175,.235,.19]}},
  {Nam:{truoc:[.32,.265,.35,.22],trai:[.32,.30,.32,.18],phai:[.35,.30,.35,.195]},Nu:{truoc:[.355,.12,.315,.175],trai:[.29,.13,.16,.165],phai:[.60,.14,.16,.165]}},
  {Nam:{truoc:[.29,.255,.32,.205],trai:[.21,.255,.23,.195],phai:[.645,.26,.20,.20]},Nu:{truoc:[.35,.20,.23,.185],trai:[.26,.205,.13,.175],phai:[.70,.235,.14,.18]}},
  {Nam:{truoc:[.33,.195,.32,.24],trai:[.28,.20,.215,.215],phai:[.55,.205,.235,.215]},Nu:{truoc:[.37,.145,.23,.16],trai:[.345,.145,.14,.16],phai:[.54,.14,.14,.165]}}
 ];
 // Only eyebrows/eyes and nose/mouth are sampled. No panda ears, hair, hands or hats.
 const details={
  Nam:[
   [[.38,.29,.43,.23],[.43,.50,.34,.20]],[[.36,.27,.40,.24],[.53,.50,.18,.34]],
   [[.37,.28,.41,.20],[.34,.50,.40,.31]],[[.28,.33,.44,.20],[.30,.52,.36,.17]],
   [[.31,.22,.56,.35],[.32,.52,.43,.32]],[[.36,.29,.39,.31],[.39,.61,.19,.15]],
   [[.34,.38,.41,.24],[.45,.58,.23,.22]],[[.26,.27,.48,.27],[.31,.50,.38,.19]],
   [[.26,.40,.47,.13],[.39,.57,.23,.16]],[[.40,.39,.44,.26],[.56,.65,.21,.15]]
  ],
  Nu:[
   [[.43,.43,.40,.13],[.51,.57,.27,.13]],[[.44,.46,.39,.12],[.54,.57,.22,.17]],
   [[.45,.46,.41,.14],[.56,.61,.16,.10]],[[.43,.45,.39,.17],[.57,.64,.15,.15]],
   [[.40,.45,.50,.20],[.55,.62,.23,.18]],[[.40,.39,.45,.22],[.50,.60,.24,.19]],
   [[.43,.48,.40,.15],[.61,.67,.085,.065]],[[.43,.45,.40,.15],[.55,.62,.14,.045]],
   [[.43,.46,.40,.15],[.585,.54,.205,.09]],[[.43,.46,.40,.16],[.50,.60,.25,.20]]
  ]
 };
 const heads=new Map(),headLimit=48;
 const genderOf=ap=>ap?.gender==='Nu'?'Nu':'Nam',classOf=ap=>Number.isInteger(ap?.w)&&ap.w>=0&&ap.w<4?ap.w:0;
 function forAppearance(ap=P.ap){
  if(!ap)return null;
  const id=ap===P.ap?P.world?.equip?.matna?.id:ap.maskId,item=masks.get(id);
  return item?.gender===genderOf(ap)?item:null;
 }
 function feature(image,box,gender,index,variant){
  const canvas=document.createElement('canvas');canvas.width=Math.max(24,Math.round(box[2]*384));canvas.height=Math.max(16,Math.round(box[3]*384));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,box[0]*384,box[1]*384,box[2]*384,box[3]*384,0,0,canvas.width,canvas.height);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const i=(y*canvas.width+x)*4,r=p[i],g=p[i+1],b=p[i+2],dark=Math.max(0,Math.min(1,(246-Math.min(r,g,b))/100));
   const blush=r>g*1.18&&g>130&&b>125,edge=Math.min(1,x/3,y/3,(canvas.width-1-x)/3,(canvas.height-1-y)/3);
   const sourceX=box[0]+x/canvas.width*box[2],sourceY=box[1]+y/canvas.height*box[3];
   const ornament=gender==='Nu'&&index===0&&sourceX>.60&&sourceX<.71&&sourceY<.50;
   const strayHair=gender==='Nu'&&index===0&&((sourceY<.47&&sourceX<.50)||(sourceY<.50&&sourceX<.44));
   const bubble=gender==='Nam'&&variant===6&&index===1&&b>r*1.25;
   const ellipse=gender==='Nu'&&index===1?Math.min(1,Math.max(0,(1-Math.pow((x/canvas.width-.5)*2,2)-Math.pow((y/canvas.height-.5)*2,2))*9)):1;
   p[i+3]=ornament||bubble||strayHair?0:Math.round(p[i+3]*dark*(blush?.38:1)*Math.max(0,edge)*ellipse);
  }
  ctx.putImageData(pixels,0,0);return canvas;
 }
 function load(src){
  if(cache.has(src))return cache.get(src);
  const entry={image:null,features:null,failed:false};cache.set(src,entry);
  const image=new Image();image.onload=()=>{
   const surface=document.createElement('canvas');surface.width=surface.height=384;
   const ctx=surface.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,0,0,384,384);
   entry.image=surface;
   const item=[...masks.values()].find(m=>m.art===src);
   if(item)entry.features=details[item.gender][item.variant-1].map((box,index)=>feature(surface,box,item.gender,index,item.variant));
   refreshAvatar(true);
  };image.onerror=()=>{entry.failed=true;refreshAvatar(true);};image.src=artworkURL(src);return entry;
 }
 const skin=(r,g,b,a)=>a>120&&r>170&&g>130&&b>118&&r>=g*.94&&r>=b*.94;
 function headFor(ap,direction,body){
  const item=forAppearance(ap);if(!item||direction==='sau'||!body.complete||!body.naturalWidth)return null;
  const material=load(item.art);if(!material.features)return null;
  const mouthId=item.gender==='Nam'&&[4,8].includes(item.variant)?'mask-nam-'+(item.variant===4?1:3):item.gender==='Nu'&&item.variant===5?'mask-nu-2':null;
  const mouthSource=mouthId?load(masks.get(mouthId).art):material;
  if(!mouthSource.features)return null;
  const key=classOf(ap)+'/'+genderOf(ap)+'/'+direction+'/'+item.id;
  if(heads.has(key)){const entry=heads.get(key);heads.delete(key);heads.set(key,entry);return entry;}
  const box=faces[classOf(ap)][genderOf(ap)][direction],bw=body.naturalWidth,bh=body.naturalHeight;
  const fx=Math.round(box[0]*bw),fy=Math.round(box[1]*bh),fw=Math.round(box[2]*bw),fh=Math.round(box[3]*bh);
  const px=Math.max(0,Math.floor(fx-fw*.35)),py=Math.max(0,Math.floor(fy-fh*.25));
  const width=Math.min(bw-px,Math.ceil(fw*1.7)),height=Math.min(bh-py,Math.ceil(fh*1.5));
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(body,px,py,width,height,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height),original=new Uint8ClampedArray(pixels.data),p=pixels.data;
  const lx=fx-px,ly=fy-py,rows=[],tones=[[],[],[]],candidates=new Uint8Array(fw*fh),visited=new Uint8Array(fw*fh),components=[];
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){const i=((ly+y)*width+lx+x)*4;if(skin(p[i],p[i+1],p[i+2],p[i+3]))candidates[y*fw+x]=1;}
  // Disconnected gold earrings/necklace highlights must never define the face.
  for(let start=0;start<candidates.length;start++){
   if(!candidates[start]||visited[start])continue;const queue=[start];visited[start]=1;let central=0;
   for(let n=0;n<queue.length;n++){const at=queue[n],x=at%fw,y=Math.floor(at/fw);if(x>fw*.25&&x<fw*.75)central++;for(const next of [x?at-1:-1,x<fw-1?at+1:-1,y?at-fw:-1,y<fh-1?at+fw:-1]){if(next>=0&&candidates[next]&&!visited[next]){visited[next]=1;queue.push(next);}}}
   components.push({queue,central});
  }
  const largest=Math.max(1,...components.filter(c=>c.central>10).map(c=>c.queue.length)),selected=new Uint8Array(fw*fh);
  for(const part of components)if(part.central>10&&part.queue.length>=largest*.24)for(const index of part.queue)selected[index]=1;
  for(let y=0;y<fh;y++){
   let left=fw,right=-1,count=0;
   for(let x=0;x<fw;x++){
    const i=((ly+y)*width+lx+x)*4;
    if(selected[y*fw+x]){left=Math.min(left,x);right=Math.max(right,x);count++;if(y>fh*.4&&y<fh*.8&&p[i+1]>170){for(let c=0;c<3;c++)tones[c].push(p[i+c]);}}
   }
   rows.push(count>fw*.08?{left,right}:null);
  }
  const tone=tones.map((values,c)=>{values.sort((a,b)=>a-b);return values.length?values[Math.floor(values.length*.6)]:[250,235,225][c];});
  // A convex skin envelope bridges baked-in laser bands and old dark features.
  // Component filtering above excludes detached ears, necklaces and ornaments.
  const points=[];for(let y=0;y<fh;y++)if(rows[y])points.push([rows[y].left,y],[rows[y].right,y]);
  points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const lower=[],upper=[];for(const p of points){while(lower.length>1&&cross(lower.at(-2),lower.at(-1),p)<=0)lower.pop();lower.push(p);}for(const p of [...points].reverse()){while(upper.length>1&&cross(upper.at(-2),upper.at(-1),p)<=0)upper.pop();upper.push(p);}const hull=lower.slice(0,-1).concat(upper.slice(0,-1));
  const mask=document.createElement('canvas');mask.width=width;mask.height=height;const mc=mask.getContext('2d',{willReadFrequently:true});mc.fillStyle='#fff';mc.beginPath();hull.forEach(([x,y],i)=>i?mc.lineTo(lx+x,ly+y):mc.moveTo(lx+x,ly+y));mc.closePath();mc.fill();
  const alpha=mc.getImageData(0,0,width,height);
  const ornament={left:fw,right:-1,top:fh,bottom:-1};
  for(let y=0;y<fh*.4;y++)for(let x=Math.ceil(fw*.25);x<fw*.75;x++){
   const i=((ly+y)*width+lx+x)*4,min=Math.min(p[i],p[i+1],p[i+2]),max=Math.max(p[i],p[i+1],p[i+2]);
   const hasCrest=classOf(ap)===1&&genderOf(ap)==='Nu'||classOf(ap)===3&&genderOf(ap)==='Nam';
   const gold=p[i+1]>100&&p[i+1]>p[i+2]*1.4&&p[i]>p[i+2]*1.4;
   if(hasCrest&&gold&&p[i+3]>200&&min<150&&max>170&&max-min>60){ornament.left=Math.min(ornament.left,x);ornament.right=Math.max(ornament.right,x);ornament.top=Math.min(ornament.top,y);ornament.bottom=Math.max(ornament.bottom,y);}
  }
  // Keep bangs connected to the surrounding hair. Isolated eyebrows/eyes belong
  // to the old expression and must be removed, including faint forehead remnants.
  const fringe=new Uint8Array(fw*fh),queue=[];
  const dark=at=>{const x=at%fw,y=Math.floor(at/fw),i=((ly+y)*width+lx+x)*4;return p[i+3]>100&&Math.max(p[i],p[i+1],p[i+2])<155;};
  for(let at=0;at<fringe.length;at++){const x=at%fw,y=Math.floor(at/fw),i=((ly+y)*width+lx+x)*4;if(dark(at)&&(!alpha.data[i+3]||!x||x===fw-1||!y)){fringe[at]=1;queue.push(at);}}
  for(let n=0;n<queue.length;n++){const at=queue[n],x=at%fw,y=Math.floor(at/fw);for(const next of [x?at-1:-1,x<fw-1?at+1:-1,y?at-fw:-1,y<fh-1?at+fw:-1])if(next>=0&&!fringe[next]&&dark(next)){fringe[next]=1;queue.push(next);}}
  for(let y=0;y<fh;y++)for(let x=0;x<fw;x++){
   const i=((ly+y)*width+lx+x)*4;
   const accessory=x>=ornament.left-1&&x<=ornament.right+1&&y>=ornament.top-1&&y<=ornament.bottom+1;
   const hair=fringe[y*fw+x]&&(x<fw*.18||x>fw*.82||y<fh*.22);
   if(p[i+3]<250||hair||accessory){alpha.data[i+3]=0;continue;}
   const edge=alpha.data[i+3]/255;if(!edge)continue;
   const shade=1-.028*Math.pow((x/fw-.5)*2,2)+.012*(1-y/fh);
   for(let c=0;c<3;c++)p[i+c]=Math.round(p[i+c]*(1-edge)+Math.min(255,tone[c]*shade)*edge);
  }
  // The original female sprites have red beams outside their eyes. Replace that
  // baked-in glow from adjacent hair/transparent pixels, never show two eye effects.
  if(genderOf(ap)==='Nu')for(let y=3;y<height-3;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4,r=original[i],g=original[i+1],b=original[i+2];
   if(alpha.data[i+3]||!original[i+3]||r<190||r<g*1.65||r<b*1.45)continue;
   const offset=Math.max(5,Math.round(fh*.09));let best=-1,score=Infinity;
   for(const sign of [-1,1]){const yy=y+offset*sign;if(yy<0||yy>=height)continue;const j=(yy*width+x)*4,s=original[j]-Math.min(original[j+1],original[j+2]);if(s<score){best=j;score=s;}}
   if(best>=0){for(let c=0;c<3;c++)p[i+c]=original[best+c];if(original[i+3]<100&&!original[best+3])p[i+3]=0;}
  }
  ctx.putImageData(pixels,0,0);mc.putImageData(alpha,0,0);
  const layer=document.createElement('canvas');layer.width=width;layer.height=height;const g=layer.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.save();g.translate(lx,ly);const side=direction!=='truoc';if(direction==='trai'){g.translate(fw,0);g.scale(-1,1);}
  const eyes=material.features[0],mouth=mouthSource.features[1];
  const sleepy=item.gender==='Nam'&&item.variant===6,shy=item.gender==='Nu'&&item.variant===8;
  if(side){g.drawImage(eyes,0,0,eyes.width*.52,eyes.height,fw*.28,fh*.25,fw*.62,fh*.40);if(!sleepy&&!shy)g.drawImage(mouth,fw*.40,fh*.55,fw*.48,fh*.34);}
  else{g.drawImage(eyes,fw*.07,fh*.24,fw*.86,fh*.40);if(!sleepy&&!shy)g.drawImage(mouth,fw*.25,fh*.55,fw*.51,fh*.35);}
  if(sleepy){g.fillStyle='#30262b';g.beginPath();g.ellipse(fw*(side?.66:.55),fh*.76,fw*.09,fh*.10,-.12,0,Math.PI*2);g.fill();}
  // A shy smile is hidden behind the hand in source #8; render the mouth itself.
  if(item.gender==='Nu'&&item.variant===8){g.strokeStyle='#85463f';g.lineWidth=fw*.012;g.lineCap='round';g.beginPath();g.moveTo(fw*.47,fh*.74);g.quadraticCurveTo(fw*.62,fh*.81,fw*.73,fh*.70);g.stroke();}
  g.restore();g.globalCompositeOperation='destination-in';g.drawImage(mask,0,0);ctx.drawImage(layer,0,0);
  const entry={canvas,skinMask:mask,px,py,width,height,bw,bh,box};heads.set(key,entry);if(heads.size>headLimit)heads.delete(heads.keys().next().value);return entry;
 }
 function drawBody(ctx,body,ap,direction,x,y,width,height){
  const head=headFor(ap,direction,body);if(!head){renderArtwork(ctx,body,x,y,width,height);return;}
  const sx=width/head.bw,sy=height/head.bh,hx=x+head.px*sx,hy=y+head.py*sy,hw=head.width*sx,hh=head.height*sy;
  ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.rect(hx,hy,hw,hh);ctx.clip('evenodd');renderArtwork(ctx,body,x,y,width,height);ctx.restore();
  renderArtwork(ctx,head.canvas,hx,hy,hw,hh);
 }
 function originalPortrait(ap){
  const key=classOf(ap)+'/'+genderOf(ap);if(portraits.has(key))return portraits.get(key);
  const image=new Image();portraits.set(key,image);image.onload=()=>refreshAvatar(true);
  image.src=artworkURL('Character/'+characterClasses[classOf(ap)].folder+'/'+genderOf(ap)+'/truoc.png');return image;
 }
 let avatarKey=null;
 function refreshAvatar(force=false){
  const canvas=$('player-avatar');if(!canvas)return;
  const ap=P.ap,item=forAppearance(ap),key=ap?classOf(ap)+'/'+genderOf(ap)+'/'+(item?.id||'original'):'empty';
  if(!force&&avatarKey===key)return;avatarKey=key;
  const ctx=canvas.getContext('2d'),size=canvas.width;ctx.clearRect(0,0,size,size);
  canvas.dataset.maskId=item?.id||'';canvas.setAttribute('aria-label',item?item.name:'Gương mặt gốc của nhân vật');canvas.title=item?.name||'Gương mặt gốc';
  if(!ap)return;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.beginPath();ctx.arc(size/2,size/2,size*.49,0,Math.PI*2);ctx.clip();
  const image=originalPortrait(ap);
  if(image.complete&&image.naturalWidth){
   const box=faces[classOf(ap)][genderOf(ap)].truoc,span=Math.min(image.naturalWidth,image.naturalWidth*box[2]*1.8);
   const sx=Math.max(0,Math.min(image.naturalWidth-span,image.naturalWidth*(box[0]+box[2]/2)-span/2));
   const sy=Math.max(0,Math.min(image.naturalHeight-span,image.naturalHeight*(box[1]+box[3]/2)-span*.60));
   const scale=size/span;ctx.save();ctx.scale(scale,scale);drawBody(ctx,image,ap,'truoc',-sx,-sy,image.naturalWidth,image.naturalHeight);ctx.restore();
  }
  ctx.restore();
 }
 const previousHud=hud;hud=function(){previousHud();refreshAvatar();};
 addEventListener('tienlo-auth',()=>refreshAvatar(true));
 window.characterMasks={forAppearance,load,drawBody,headFor,faces,headLimit,get cacheSize(){return heads.size;},refreshAvatar};refreshAvatar();
})();
