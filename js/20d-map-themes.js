/* Reviewed alpha props from asset10–15; scene art does not move network geometry. */
(function(){
 const world=worldMap,metadata=new Map(themeAtlasSprites.sprites.map(s=>[s.id,s])),images=new Map(),terrainCache=new WeakMap();
 const id=(atlas,n)=>'theme-'+atlas+'-'+String(n).padStart(3,'0');
 const themes={
  hub:{name:'Thiên Vân · Cổ Ngọc',atlas:11,sky:'#172f36',accent:'#87d8cf',vista:1,left:12,right:66,rock:35,cloud:75,prop:28,wash:'#8abeb4'},
  sword:{name:'Vạn Kiếm · Cổ Ngọc',atlas:11,sky:'#102e37',accent:'#81e4d8',vista:1,left:12,right:16,rock:35,cloud:81,prop:28,wash:'#91c6c2'},
  moon:{name:'Nguyệt Hồ · Liên Hoa',atlas:12,sky:'#292943',accent:'#efc7ec',vista:3,left:2,right:17,rock:18,cloud:36,prop:28,wash:'#b4a6c5'},
  thunder:{name:'Lôi Vân · Băng Tinh',atlas:10,sky:'#112b4a',accent:'#82caff',vista:3,left:2,right:4,rock:22,cloud:63,prop:9,wash:'#93afce'},
  mystic:{name:'Thiên Cơ · Linh Mộc',atlas:14,sky:'#183b32',accent:'#a8e2b0',vista:1,left:2,right:8,rock:27,cloud:68,prop:12,wash:'#9dbb99'},
  valley:{name:'Linh Mạch · Cổ Thụ',atlas:14,sky:'#16372f',accent:'#a5dcb3',vista:2,left:9,right:69,rock:31,cloud:73,prop:18,wash:'#a4bb97'},
  rift:{name:'Vân Hải · Cổ Tích',atlas:11,sky:'#142d3d',accent:'#8ce0ed',vista:2,left:12,right:16,rock:35,cloud:81,prop:28,wash:'#a4c7cc'},
  arena:{name:'Đấu trường · Hỏa Điện',atlas:13,sky:'#3a262a',accent:'#f2be84',vista:1,left:2,right:3,rock:15,cloud:null,prop:6,wash:'#d5ad95'},
  worldboss:{name:'Thái Cổ · Ma Vực',atlas:15,sky:'#2d2029',accent:'#ed9c83',vista:1,left:17,right:9,rock:40,cloud:null,prop:12,wash:'#c7a6a0'}
 };
 function current(){return themes[world.state.scene==='arena'&&window.spiritRift?.state()?'rift':world.state.scene];}
 function load(key){if(!metadata.has(key))return null;if(!images.has(key)){const image=new Image();image.src=artworkURL(metadata.get(key).src);images.set(key,image);}return images.get(key);}
 const ready=image=>image?.complete&&image.naturalWidth>0;
 function bounds(key,x,y,width){const meta=metadata.get(key);if(!meta)return null;const scale=Math.min(width,meta.width)/meta.width,p=meta.padding;return{left:x-meta.width*scale/2+p*scale,right:x+meta.width*scale/2-p*scale,top:y-(meta.height-2*p)*scale,bottom:y};}
 function draw(ctx,key,x,y,width,alpha=1){const meta=metadata.get(key),image=load(key);if(!meta||!ready(image))return false;const w=Math.min(width,meta.width),scale=w/meta.width,h=meta.height*scale;ctx.save();ctx.globalAlpha*=alpha;ctx.shadowBlur=ctx.shadowOffsetX=ctx.shadowOffsetY=0;ctx.shadowColor='transparent';renderArtwork(ctx,image,x-w/2,y-h+meta.padding*scale,w,h);ctx.restore();return true;}
 const asset=world.asset,sprite=world.sprite,spriteBounds=world.spriteBounds;
 world.asset=key=>metadata.has(key)?load(key):asset(key);
 world.sprite=function(ctx,key,x,y,width,height,alpha=1){if(metadata.has(key))return draw(ctx,key,x,y,width,alpha);return sprite(ctx,key,x,y,width,height,alpha);};
 world.spriteBounds=(key,x,y,width,height)=>metadata.has(key)?bounds(key,x,y,width):spriteBounds(key,x,y,width,height);
 let configured='';
 function configure(){const theme=current();if(!theme)return;configured=world.state.scene;const layout=world.sectLayouts[world.state.scene];if(layout){layout.sky=theme.sky;layout.light=theme.accent;}
  // Only replace the small existing altar prop; retain the occupied building/NPC zones.
  if(world.isSectMap(world.state.scene))for(const b of world.buildings)if(b.x===1080&&b.y===1000){b.key=id(theme.atlas,theme.prop);b.w=world.state.scene==='moon'?24:26;}
  if(world.state.scene==='valley')for(const b of world.buildings)if(b.key==='crystalPillar'){b.key=id(theme.atlas,theme.prop);b.w=b.x===1000?30:24;}
  const decoration=world.mapDecorations[world.state.scene];if(decoration){const plant={sword:id(14,55),moon:id(14,36),thunder:id(10,15),mystic:id(14,56)}[world.state.scene];for(const prop of decoration)if(['pineTree','whiteBlossom','sakura'].includes(prop.key)){prop.key=plant;prop.w=world.state.scene==='thunder'?35:44;}}
 }
 const change=world.switchScene;world.switchScene=function(...args){const result=change(...args);configure();return result;};
 function scenery(){const t=current();if(!t)return[];const scene=world.state.scene,hub=scene==='hub',battle=scene==='arena'||scene==='worldboss';
  const result=hub?[
   {key:id(t.atlas,t.vista),x:1000,y:470,w:320,alpha:.7},
   {key:id(t.atlas,t.left),x:150,y:820,w:240,alpha:.6},
   {key:id(t.atlas,t.right),x:1850,y:820,w:230,alpha:.6}
  ]:battle?[
   {key:id(t.atlas,t.vista),x:1000,y:885,w:scene==='worldboss'?560:420,alpha:.9},
   {key:id(t.atlas,t.left),x:540,y:1170,w:230,alpha:.75},
   {key:id(t.atlas,t.right),x:1460,y:1170,w:230,alpha:.75}
  ]:[
   {key:id(t.atlas,t.vista),x:1000,y:970,w:330,alpha:.85},
   {key:id(t.atlas,t.left),x:560,y:830,w:260,alpha:.72},
   {key:id(t.atlas,t.right),x:1440,y:830,w:230,alpha:.72}
  ];
  if(!hub&&!battle)for(const camp of scene==='valley'?world.valleyMines:world.farmCamps)result.push({key:id(t.atlas,t.rock),x:camp.x+185,y:camp.y+150,w:65,alpha:.8});
  return result;
 }
 function drawBackdrop(ctx,cx,cy,vw,vh){const t=current();if(!t)return false;if(configured!==world.state.scene)configure();
  const gradient=ctx.createLinearGradient(0,cy,0,cy+vh);gradient.addColorStop(0,t.sky);gradient.addColorStop(1,'#10232d');ctx.fillStyle=gradient;ctx.fillRect(cx,cy,vw,vh);
  for(const p of scenery()){const b=bounds(p.key,p.x,p.y,p.w);if(b&&b.right>cx-5&&b.left<cx+vw+5&&b.bottom>cy-5&&b.top<cy+vh+5)draw(ctx,p.key,p.x,p.y,p.w,p.alpha);}
  if(t.cloud){const key=id(t.atlas,t.cloud),clock=world.environmentClock||0;for(let i=0;i<5;i++){const x=((i*487+clock*(i%2?2.5:4))%2600)-300+cx*.025,y=350+i*300;draw(ctx,key,x,y,280,.13);}}
  world.atmosphere?.drawSky(ctx,cx,cy,vw,vh);
  return true;
 }
 function finishDeck(ctx,x,y,rx,ry){const t=current();if(!t)return;ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=.09;ctx.fillStyle=t.wash;ctx.fillRect(x-rx,y-ry,rx*2,ry*2);ctx.restore();}
 function terrainFor(image){const t=current();if(!t||!ready(image))return image;const filter=({thunder:'saturate(.5) hue-rotate(65deg) brightness(1.05)',moon:'saturate(.7) hue-rotate(315deg)',arena:'sepia(.4) saturate(.75) brightness(.85)',worldboss:'grayscale(.85) sepia(.65) saturate(1.8) hue-rotate(315deg) brightness(.7)'})[world.state.scene];if(!filter)return image;let variants=terrainCache.get(image);if(!variants){variants=new Map();terrainCache.set(image,variants);}if(!variants.has(filter)){const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.filter=filter;ctx.drawImage(image,0,0);variants.set(filter,canvas);}return variants.get(filter);}
 function battleProps(){if(!['arena','worldboss'].includes(world.state.scene))return null;const t=current(),large=world.state.scene==='worldboss',x=large?300:200;return [{key:id(t.atlas,t.prop),x:1000-x,y:1100,w:large?30:40},{key:id(t.atlas,t.prop),x:1000+x,y:1100,w:large?30:40}];}
 world.mapThemes={themes,current,metadata,images,load,draw,bounds,scenery,configure,drawBackdrop,finishDeck,battleProps,terrainFor};
})();
