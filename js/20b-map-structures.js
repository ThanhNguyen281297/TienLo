/* Native atlas architecture: stone enclosures and continuous walkable timber spans. */
(function(){
  const world=worldMap,cache=new Map(),images={};
  for(const key of ['wood-span','wood-post','wall-span']){const image=new Image();image.src=artworkURL('MAP/structures/'+key+'.png');images[key]=image;}
  const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  const near=(p,a,b)=>kiemCombat.segmentDistance(p,a,b);
  function splitWall(a,b,gap=32){const length=distance(a,b),start=gap/length,end=1-start;
    if(end<=start)return [];const count=Math.ceil(length*(end-start)/72),parts=[];
    for(let i=0;i<count;i++)parts.push([mix(a,b,start+(end-start)*i/count),mix(a,b,start+(end-start)*(i+1)/count)]);return parts;
  }
  function enclosure(x,y,rx,ry){const points=[{x,y:y-ry},{x:x+rx,y},{x,y:y+ry},{x:x-rx,y}];return points.flatMap((a,i)=>splitWall(a,points[(i+1)%4],35));}
  function layout(){const scene=world.state.scene;if(cache.has(scene))return cache.get(scene);
    const bridges=[],walls=[];
    if(world.isSectMap(scene)||scene==='valley'){
      const shape=world.sectLayouts[scene],valley=scene==='valley',camps=valley?world.valleyMines:world.farmCamps;
      walls.push(...enclosure(1000,1100,shape.rx,shape.ry));
      for(const camp of camps){const dx=camp.x-1000,dy=camp.y-1100,rx=valley?150:156,ry=valley?78:80;
        const t=.91/(Math.abs(dx)/shape.rx+Math.abs(dy)/shape.ry),u=.91/(Math.abs(dx)/rx+Math.abs(dy)/ry);
        const a={x:1000+dx*t,y:1100+dy*t},b={x:camp.x-dx*u,y:camp.y-dy*u};
        bridges.push({id:camp.id,a,b,width:28});walls.push(...enclosure(camp.x,camp.y,rx,ry));
      }
    }else if(scene==='hub'){
      const c=world.city,points=[{x:c.left+12,y:c.top+25},{x:c.right-12,y:c.top+25},{x:c.right-12,y:c.bottom-12},{x:c.left+12,y:c.bottom-12}];
      for(let i=0;i<4;i++){const a=points[i],b=points[(i+1)%4],mid=mix(a,b,.5),gap=50/distance(a,b);
        walls.push(...splitWall(a,mix(a,b,.5-gap),8),...splitWall(mix(a,b,.5+gap),b,8));}
    }
    const clearWalls=walls.filter(([a,b])=>!bridges.some(bridge=>near(mix(a,b,.5),bridge.a,bridge.b)<35));
    const result={bridges,walls:clearWalls};cache.set(scene,result);return result;
  }
  function onBridge(p){return layout().bridges.some(({a,b,width})=>near(p,a,b)<=width/2-2);}
  function blocked(p){return layout().walls.some(([a,b])=>near(p,a,b)<4);}
  const walk=world.canWalk;world.canWalk=p=>walk(p)&&!blocked(p);
  // The entire reviewed PNG is drawn, never a cropped atlas rectangle.
  function drawTimber(ctx,a,b){const image=images['wood-span'];if(!image.complete||!image.naturalWidth)return;
    const length=distance(a,b),count=Math.ceil(length/64),normal={x:-(b.y-a.y)/length*25,y:(b.x-a.x)/length*25};
    for(let i=0;i<count;i++){
      const from=mix(a,b,i/count),to=mix(a,b,(i+1)/count),dx=to.x-from.x,dy=to.y-from.y;
      const aa=(dx*10-normal.x*35)/1280,bb=(dy*10-normal.y*35)/1280,cc=(dx*14+normal.x*79)/1280,dd=(dy*14+normal.y*79)/1280;
      ctx.save();ctx.transform(aa,bb,cc,dd,from.x-aa*25-cc*29,from.y-bb*25-dd*29);renderArtwork(ctx,image,0,0,image.naturalWidth,image.naturalHeight);ctx.restore();
    }
  }
  function drawWall(ctx,pair){const image=images['wall-span'];if(!image.complete||!image.naturalWidth)return;
    let [a,b]=pair;if(a.x>b.x)[a,b]=[b,a];const dx=b.x-a.x,dy=b.y-a.y;
    // Keep towers upright, with a small side projection on north/south walls.
    const height=.48,side=Math.abs(dx)<8?(dy>0?-.32:.32):0,cc=side*height,dd=height;
    const aa=(dx+31*cc)/111,bb=(dy+31*dd)/111;
    ctx.save();ctx.transform(aa,bb,cc,dd,a.x-aa*51-cc*120,a.y-bb*51-dd*120);renderArtwork(ctx,image,0,0,image.naturalWidth,image.naturalHeight);ctx.restore();
  }
  function drawRope(ctx,a,b,side){const length=distance(a,b),nx=-(b.y-a.y)/length*12*side,ny=(b.x-a.x)/length*12*side;
    ctx.save();ctx.lineWidth=1.3;ctx.strokeStyle='#96704b';ctx.beginPath();ctx.moveTo(a.x+nx,a.y+ny-12);ctx.quadraticCurveTo((a.x+b.x)/2+nx,(a.y+b.y)/2+ny-7,b.x+nx,b.y+ny-12);ctx.stroke();
    const image=images['wood-post'];if(image.complete&&image.naturalWidth)for(const p of [a,b])renderArtwork(ctx,image,p.x+nx-2.5,p.y+ny-15,5,18);ctx.restore();
  }
  function railSegments(){return layout().bridges.flatMap(({a,b})=>{const count=Math.ceil(distance(a,b)/64);return Array.from({length:count},(_,i)=>[mix(a,b,i/count),mix(a,b,(i+1)/count)]);});}
  const ground=drawGround;drawGround=function(...args){ground(...args);for(const {a,b}of layout().bridges)drawTimber(g,a,b);};
  const queue=world.queueActors;world.queueActors=function(items,...args){queue(items,...args);for(const pair of layout().walls)items.push([(pair[0].y+pair[1].y)/2,()=>drawWall(g,pair)]);
    for(const [a,b]of railSegments())for(const side of [-1,1])items.push([(a.y+b.y)/2+(b.x-a.x)/distance(a,b)*12*side,()=>drawRope(g,a,b,side)]);
  };
  const preview=world.renderMapPreview;world.renderMapPreview=function(ctx,size){preview(ctx,size);ctx.save();
    if(world.state.scene==='hub'){const c=world.city,w=c.right-c.left+120,h=c.bottom-c.top+120,z=size/Math.max(w,h);ctx.translate((size-w*z)/2,(size-h*z)/2);ctx.scale(z,z);ctx.translate(-c.left+60,-c.top+60);}else ctx.scale(size/M,size/M);
    for(const {a,b}of layout().bridges)drawTimber(ctx,a,b);for(const pair of layout().walls)drawWall(ctx,pair);for(const [a,b]of railSegments())for(const side of [-1,1])drawRope(ctx,a,b,side);ctx.restore();};
  world.mapStructures={images,layout,onBridge,blocked,drawTimber,drawWall};
  const mini=world.renderMini;world.renderMini=function(ctx,size){mini(ctx,size);ctx.save();ctx.scale(size/M,size/M);ctx.strokeStyle='#b18b59';ctx.lineWidth=18;
    for(const {a,b}of layout().bridges){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.restore();
  };
})();
