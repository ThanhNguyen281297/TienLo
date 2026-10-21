/* Complete painted animation frames, lazily loaded per species; no bitmap edits. */
(function(){
 const kinds=new Map(),cache=new WeakMap(),ready=i=>i?.complete&&i.naturalWidth;
 for(const [name,meta]of Object.entries(newMonsterFrames)){
  const kind={...expeditionRules.species[name],meta,images:[],height:expeditionRules.species[name].height};
  kind.ensure=()=>{if(kind.image)return kind.image;const image=kind.image=new Image();kind.images=[image];image.onerror=()=>msg('Không tải được yêu thú '+kind.name+'. Hãy tải lại trang.');image.src=artworkURL(meta.file);return image;};
  kinds.set(name,kind);creatureArt.species[name]=kind;
 }
 function pose(e){
  const kind=kinds.get(e.skin);if(!kind)return null;const image=kind.ensure(),s=creatureArt.reaction(e);
  let row=0,age=tm+(s.phase||0),fps=6,loop=true;
  if(e.corpse){row=4;age=e.age;fps=8;loop=false;}
  else if(window.fieldEffects?.immobilized(e)){age=0;}
  else if(s.hurt>0){row=3;age=s.hurtAge;fps=13;loop=false;}
  else if(s.attack>0&&!fieldEffects.blocksAttack(e)){row=2;age=s.attackAge;fps=10;loop=false;}
  else if(s.moving||s.networkMovingUntil>performance.now()){row=1;fps=9;}
  const index=loop?Math.floor(age*fps)%4:Math.min(3,Math.floor(age*fps)),frame=kind.meta.frames[row*4+index];
  return {kind,image,rect:frame.rect,anchor:frame.anchor,sourceHeight:kind.meta.sourceHeight,faceRight:kind.meta.faceRight[row],index,sheet:row+1,mode:['idle','move','attack','hurt','death'][row],count:4,padding:0};
 }
 function raster(frame,pixels){
  let variants=cache.get(frame.image);if(!variants){variants=new Map();cache.set(frame.image,variants);}
  const key=frame.sheet+'/'+frame.index+'/'+pixels;if(variants.has(key))return variants.get(key);
  const [x,y,w,h]=frame.rect,canvas=document.createElement('canvas');canvas.height=pixels;canvas.width=Math.max(1,Math.round(pixels*w/h));const c=canvas.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(frame.image,x,y,w,h,0,0,canvas.width,canvas.height);
  variants.set(key,canvas);if(variants.size>48)variants.delete(variants.keys().next().value);return canvas;
 }
 const previousMon=mon;mon=function(e){
  if(e.duelTarget)return;const f=pose(e);if(!f)return previousMon(e);if(!ready(f.image))return;
  const [sx,sy,w,h]=f.rect,height=f.kind.height*(e.boss?1.25:1),scale=height/f.sourceHeight;
  const source=raster(f,Math.max(32,Math.min(768,Math.round(h*scale*Z)))),s=creatureArt.reaction(e),kick=Math.sin(Math.min(1,(s.impact||0)/.2)*Math.PI);
  g.save();g.imageSmoothingQuality='high';if(e.corpse)g.globalAlpha=Math.max(0,Math.min(1,(.95-e.age)*3));
  g.translate(e.x+(s.recoilX||0)*kick,e.y+(s.recoilY||0)*kick);if((P.x>e.x+3)!==f.faceRight)g.scale(-1,1);
  const dx=-f.anchor[0]*scale,dy=-f.anchor[1]*scale;g.drawImage(source,dx,dy,w*scale,h*scale);g.restore();
  if(e.corpse)return;fieldEffects.draw(g,e,height);
  const bw=e.boss?64:38,y=e.y-height-8,ratio=Math.max(0,e.hp/e.maxHp);
  g.save();g.fillStyle='#16262bdd';g.fillRect(e.x-bw/2-1,y-1,bw+2,5);g.fillStyle=e.boss?'#f1b373':'#d56866';g.fillRect(e.x-bw/2,y,bw*ratio,3);
  drawWorldCaption(g,(e.boss?'◆ ':'')+e.name+' · Lv.'+e.level,e.x,y-4,e.boss?'#ffdf9c':'#e1e8d8',e.boss?7:6.3);g.restore();
 };
 const previousFrame=creatureArt.frame;creatureArt.frame=e=>pose(e)||previousFrame(e);
 creatureArt.ensureSpecies=name=>kinds.get(name)?.ensure();
 creatureArt.thumbnail=name=>{const kind=kinds.get(name);if(!kind)return creatureArt.species[name]?.poses?.[0]?.[0]?.image?.src||null;const image=kind.ensure();if(!ready(image))return null;const f=pose({skin:name,hx:0});return raster(f,128).toDataURL();};
 window.expeditionMonsters={kinds,pose};
})();
