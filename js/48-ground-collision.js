/* Feet on the ground and props that block movement.
   1. window.groundPad(image,sx,sy,sw,sh): transparent rows under the lowest solid
      pixels of a sprite region (0..1 of its height). Monster and NPC renderers use it
      so every pose touches its ground point instead of hovering.
   2. Collision footprints for buildings and solid props (trees, rocks, lamps,
      pillars, ponds), sized from the sprite width rather than tiny trunk boxes.
      A footprint that already contains the player never traps them.
   3. Sliding: when a straight step is blocked, movement slides along the obstacle. */
(function(){
 const world=worldMap;
 // ---------- 1. ground padding
 const pads=new WeakMap(),probe=document.createElement('canvas'),pc=probe.getContext('2d',{willReadFrequently:true});
 window.groundPad=function(image,sx=0,sy=0,sw,sh){
  if(!image)return 0;const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;if(!w||!h)return 0;sw=sw||w;sh=sh||h;
  let map=pads.get(image);if(!map){map=new Map();pads.set(image,map);}const key=sx+','+sy+','+sw+','+sh;if(map.has(key))return map.get(key);
  const H=Math.min(160,Math.max(16,Math.round(sh))),W=Math.max(8,Math.min(200,Math.round(sw*H/sh)));probe.width=W;probe.height=H;
  let value=0;try{pc.clearRect(0,0,W,H);pc.drawImage(image,sx,sy,sw,sh,0,0,W,H);const data=pc.getImageData(0,0,W,H).data,need=Math.max(2,Math.round(W*.012));
   for(let y=H-1;y>=0;y--){let n=0;for(let x=0;x<W;x++)if(data[(y*W+x)*4+3]>90&&++n>=need)break;if(n>=need){value=(H-1-y)/H;break;}}}catch{value=0;}
  value=Math.min(.35,value);map.set(key,value);return value;};

 // ---------- 2. collision footprints
 const BUILDING=/palace|school|hall|Hall|market|Bazaar|forge|tower|archive|Archive|gate|statue|board|thunderAltar|Well|garden|moonCourt|Dais/;
 const TREE=/tree|Tree|pine|Pine|blossom|Blossom|sakura|Sakura|bamboo|willow|maple/;
 const ROCK=/rock|Rock|stone|boulder|cliff/;
 const POST=/lantern|lamp|banner|pillar|Pillar|crystal|Crystal|lion|Lion|torch|post|Post|spire/;
 const POND=/pond|Pond|lotus/;
 const NEVER=/portal|stairs|bridge|cloud|flower|grass|moss|decal|rug|carpet|arena|court|Court|terrace|Island|island/;
 function footprint(b){
  if(!b||b.ground||b.scenic||b.wood===false)return null;const key=String(b.key||''),w=b.w||40;
  if(NEVER.test(key))return null;
  if(BUILDING.test(key)&&w>=60)return{x:b.x,y:b.y-w*.11,rx:w*.34,ry:w*.13};
  if(POND.test(key))return{x:b.x,y:b.y-w*.1,rx:w*.4,ry:w*.17};
  if(TREE.test(key)||b.plant)return{x:b.x,y:b.y-2,rx:Math.max(9,w*.12),ry:Math.max(5,w*.06)};
  if(ROCK.test(key))return{x:b.x,y:b.y-w*.06,rx:Math.max(8,w*.3),ry:Math.max(5,w*.14)};
  if(POST.test(key))return{x:b.x,y:b.y-2,rx:Math.max(6,w*.22),ry:Math.max(4,w*.12)};
  if(b.solid){const [l,t,r,bt]=b.solid;return{x:b.x+(l+r)/2,y:b.y+(t+bt)/2,rx:Math.max(6,(r-l)/2*1.5),ry:Math.max(4,(bt-t)/2*1.5)};}
  if(/^theme-|^atlas-/.test(key)&&w>=30)return{x:b.x,y:b.y-2,rx:Math.max(8,w*.14),ry:Math.max(5,w*.07)};
  return null;}
 const inside=(p,f)=>((p.x-f.x)/f.rx)**2+((p.y-f.y)/f.ry)**2<1;
 let cache={scene:'',stamp:0,list:[]};
 function obstacles(){const now=performance.now();if(cache.scene===world.state.scene&&now-cache.stamp<500)return cache.list;
  const list=[];for(const b of world.buildings){const f=footprint(b);if(f)list.push(f);}for(const o of world.ornamentItems?.()||[]){if(!o.solid)continue;const w=o.w||30,f=o.kind==='tree'?{x:o.x,y:o.y-2,rx:Math.max(9,w*.13),ry:Math.max(5,w*.065)}:o.kind==='rock'?{x:o.x,y:o.y-w*.05,rx:Math.max(8,w*.3),ry:Math.max(5,w*.14)}:{x:o.x,y:o.y-2,rx:Math.max(6,w*.22),ry:Math.max(4,w*.12)};list.push(f);}
  // NPCs are never blocked in: keep a clear circle around every service point.
  const services=world.services.map(s=>({x:s.x,y:s.y}));const clear=list.filter(f=>!services.some(s=>inside(s,{...f,rx:f.rx+14,ry:f.ry+10})));
  cache={scene:world.state.scene,stamp:now,list:clear};return clear;}
 const base=world.canWalk;
 world.canWalk=p=>{if(!base(p))return false;if(world.state.scene==='duel')return true;for(const f of obstacles())if(inside(p,f)&&!inside(P,f))return false;return true;};
 world.obstacles=obstacles;world.footprint=footprint;

 // ---------- 3. sliding movement
 const trace=world.traceMove;
 world.traceMove=function(from,to){const end=trace(from,to),want=Math.hypot(to.x-from.x,to.y-from.y),got=Math.hypot(end.x-from.x,end.y-from.y);
  if(want<.5||got>=want*.8)return end;
  let best=end,bestGot=got;for(const t of [{x:to.x,y:from.y},{x:from.x,y:to.y}]){const e=trace(from,t),d=Math.hypot(e.x-from.x,e.y-from.y);if(d>bestGot+.05){best=e;bestGot=d;}}
  return best;};
})();
