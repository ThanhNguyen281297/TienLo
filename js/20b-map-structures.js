/* Native atlas architecture: stone enclosures and continuous walkable timber spans. */
(function(){
  const world=worldMap,cache=new Map(),images={},timberCache=new Map();
  for(const key of ['wood-plank','wood-post','wall-span']){const image=new Image();image.src=artworkURL('MAP/structures/'+key+'.png');images[key]=image;}
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
        bridges.push({id:camp.id,a,b,width:42});walls.push(...enclosure(camp.x,camp.y,rx,ry));
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
  function polygon(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
  function timber(a,b){const key=[a.x,a.y,b.x,b.y].join(',');if(timberCache.has(key))return timberCache.get(key);
    const length=distance(a,b),count=Math.ceil(length/6.5),nx=-(b.y-a.y)/length,ny=(b.x-a.x)/length,boards=[];
    for(let i=0;i<count;i++){
      const from=mix(a,b,(i+.025)/count),to=mix(a,b,(i+.975)/count),half=21+Math.sin(i*17.3)*.35;
      const p={x:from.x-nx*half,y:from.y-ny*half},q={x:to.x-nx*half,y:to.y-ny*half},r={x:to.x+nx*half,y:to.y+ny*half},s={x:from.x+nx*half,y:from.y+ny*half};
      boards.push({p,q,r,s,tone:(i*17%7)-3});
    }
    const result={boards,nx,ny};timberCache.set(key,result);return result;
  }
  function threshold(ctx,p,a,b){const length=distance(a,b),ux=(b.x-a.x)/length,uy=(b.y-a.y)/length,nx=-uy,ny=ux;
    const points=[[-8,-24],[8,-24],[8,24],[-8,24]].map(([u,v])=>({x:p.x+ux*u+nx*v,y:p.y+uy*u+ny*v}));
    polygon(ctx,points);ctx.fillStyle='#aeb7af';ctx.fill();ctx.strokeStyle='#7d8b83';ctx.lineWidth=.6;ctx.stroke();
    ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);ctx.lineTo(points[1].x,points[1].y);ctx.strokeStyle='#d6d9ca';ctx.stroke();
  }
  // Assemble individual boards in the ground plane; thickness remains vertical.
  function drawTimber(ctx,a,b,view){const image=images['wood-plank'];if(!image.complete||!image.naturalWidth)return;
    const model=timber(a,b),nails=new Path2D();ctx.save();threshold(ctx,a,a,b);threshold(ctx,b,a,b);
    const edge=model.boards;polygon(ctx,[edge[0].p,edge.at(-1).q,edge.at(-1).r,edge[0].s].map(v=>({x:v.x,y:v.y+3})));ctx.fillStyle='#65472f';ctx.fill();
    for(const {p,q,r,s,tone}of model.boards){
      if(view&&(Math.max(p.x,q.x,r.x,s.x)<view.x||Math.min(p.x,q.x,r.x,s.x)>view.x+view.width||Math.max(p.y,q.y,r.y,s.y)+4<view.y||Math.min(p.y,q.y,r.y,s.y)>view.y+view.height))continue;
      polygon(ctx,[p,q,r,s]);ctx.fillStyle='#ae8150';ctx.fill();
      const dx=q.x-p.x,dy=q.y-p.y,vx=s.x-p.x,vy=s.y-p.y;
      const aa=(dx*12-vx*4)/152,bb=(dy*12-vy*4)/152,cc=(dx*14+vx*8)/152,dd=(dy*14+vy*8)/152;
      ctx.save();polygon(ctx,[p,q,r,s]);ctx.clip();ctx.transform(aa,bb,cc,dd,p.x-aa*15-cc,p.y-bb*15-dd);renderArtwork(ctx,image,0,0,25,19);ctx.restore();
      polygon(ctx,[p,q,r,s]);ctx.fillStyle=tone<0?'rgba(42,31,20,.08)':'rgba(242,201,135,.06)';ctx.fill();
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(s.x,s.y);ctx.strokeStyle='rgba(239,200,136,.45)';ctx.lineWidth=.45;ctx.stroke();
      for(const t of [.1,.9]){const v=mix(p,s,t);nails.moveTo(v.x+.5,v.y);nails.arc(v.x,v.y,.5,0,Math.PI*2);}
    }
    ctx.fillStyle='#44392b';ctx.fill(nails);ctx.restore();
  }
  function drawWall(ctx,pair){const image=images['wall-span'];if(!image.complete||!image.naturalWidth)return;
    let [a,b]=pair;if(a.x>b.x)[a,b]=[b,a];const dx=b.x-a.x,dy=b.y-a.y;
    const mirror=dy>0&&Math.abs(dx)>8,height=.48,side=Math.abs(dx)<8?(dy>0?-.32:.32):0,cc=side*height,dd=height;
    const baseX=mirror?22:51,baseY=mirror?89:120,nativeRise=mirror?31:-31;
    const aa=(dx-nativeRise*cc)/111,bb=(dy-nativeRise*dd)/111;
    ctx.save();ctx.transform(aa,bb,cc,dd,a.x-aa*baseX-cc*baseY,a.y-bb*baseX-dd*baseY);
    if(mirror){ctx.translate(image.naturalWidth,0);ctx.scale(-1,1);}renderArtwork(ctx,image,0,0,image.naturalWidth,image.naturalHeight);ctx.restore();
  }
  function drawRope(ctx,a,b,side){const length=distance(a,b),nx=-(b.y-a.y)/length*20*side,ny=(b.x-a.x)/length*20*side;
    ctx.save();ctx.lineWidth=1;ctx.strokeStyle='#9d774e';ctx.beginPath();ctx.moveTo(a.x+nx,a.y+ny-12);ctx.quadraticCurveTo((a.x+b.x)/2+nx,(a.y+b.y)/2+ny-8,b.x+nx,b.y+ny-12);ctx.stroke();ctx.lineWidth=.35;ctx.strokeStyle='#e0bc80';ctx.stroke();
    const image=images['wood-post'];if(image.complete&&image.naturalWidth)for(const p of [a,b])renderArtwork(ctx,image,p.x+nx-2.5,p.y+ny-15,5,18);ctx.restore();
  }
  function railSegments(){return layout().bridges.flatMap(({a,b})=>{const count=Math.ceil(distance(a,b)/64);return Array.from({length:count},(_,i)=>[mix(a,b,i/count),mix(a,b,(i+1)/count)]);});}
  function foundations(ctx){ctx.save();for(const [a,b]of layout().walls){const length=distance(a,b),nx=-(b.y-a.y)/length*3,ny=(b.x-a.x)/length*3;
    polygon(ctx,[{x:a.x+nx,y:a.y+ny},{x:b.x+nx,y:b.y+ny},{x:b.x-nx,y:b.y-ny+2},{x:a.x-nx,y:a.y-ny+2}]);ctx.fillStyle='#8f9a91';ctx.fill();
    polygon(ctx,[a,b,{x:b.x+4,y:b.y+5},{x:a.x+4,y:a.y+5}]);ctx.fillStyle='rgba(35,47,39,.12)';ctx.fill();
  }ctx.restore();}
  const ground=drawGround;drawGround=function(cx,cy,width,height){ground(cx,cy,width,height);foundations(g);for(const {a,b}of layout().bridges)drawTimber(g,a,b,{x:cx,y:cy,width,height});};
  const queue=world.queueActors;world.queueActors=function(items,...args){queue(items,...args);for(const pair of layout().walls)items.push([(pair[0].y+pair[1].y)/2,()=>drawWall(g,pair)]);
    for(const [a,b]of railSegments())for(const side of [-1,1])items.push([(a.y+b.y)/2+(b.x-a.x)/distance(a,b)*20*side,()=>drawRope(g,a,b,side)]);
  };
  const preview=world.renderMapPreview;world.renderMapPreview=function(ctx,size){preview(ctx,size);ctx.save();
    if(world.state.scene==='hub'){const c=world.city,w=c.right-c.left+120,h=c.bottom-c.top+120,z=size/Math.max(w,h);ctx.translate((size-w*z)/2,(size-h*z)/2);ctx.scale(z,z);ctx.translate(-c.left+60,-c.top+60);}else ctx.scale(size/M,size/M);
    foundations(ctx);for(const {a,b}of layout().bridges)drawTimber(ctx,a,b);for(const pair of layout().walls)drawWall(ctx,pair);for(const [a,b]of railSegments())for(const side of [-1,1])drawRope(ctx,a,b,side);ctx.restore();};
  world.mapStructures={images,layout,onBridge,blocked,drawTimber,drawWall};
  const mini=world.renderMini;world.renderMini=function(ctx,size){mini(ctx,size);ctx.save();ctx.scale(size/M,size/M);ctx.strokeStyle='#b18b59';ctx.lineWidth=18;
    for(const {a,b}of layout().bridges){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.restore();
  };
})();
