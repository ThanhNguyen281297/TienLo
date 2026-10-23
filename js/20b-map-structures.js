/* Separate stone islands and continuous masonry walls. No corner decks or bridges. */
(function(){
  const world=worldMap,cache=new Map(),images={};
  for(const key of ['wall-panel','wall-pier']){const image=new Image();image.src=artworkURL('Map/structures/'+key+'.png');images[key]=image;}
  const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
  function splitWall(a,b){const count=Math.ceil(distance(a,b)/72);return Array.from({length:count},(_,i)=>[mix(a,b,i/count),mix(a,b,(i+1)/count)]);}
  function boundary(s){const {x,y,rx,ry}=s,cut=Math.min(.3,Math.max(.14,24/ry));return [[-cut,-1+cut],[cut,-1+cut],[1-cut,-cut],[1-cut,cut],[cut,1-cut],[-cut,1-cut],[-1+cut,cut],[-1+cut,-cut]].map(([px,py])=>({x:x+px*rx,y:y+py*ry}));}
  function layout(){const scene=world.state.scene;if(cache.has(scene))return cache.get(scene);const walls=[],surfaces=[];
    if(world.isSectMap(scene)||scene==='valley'){
      const shape=world.sectLayouts[scene],valley=scene==='valley';surfaces.push({x:1000,y:1100,rx:shape.rx,ry:shape.ry});
      for(const camp of valley?world.valleyMines:world.farmCamps)surfaces.push({x:camp.x,y:camp.y,rx:valley?farmLayout.valley.rx:farmLayout.camp.rx,ry:valley?farmLayout.valley.ry:farmLayout.camp.ry});
      for(const surface of surfaces){const points=boundary(surface);for(let i=0;i<points.length;i++)walls.push(...splitWall(points[i],points[(i+1)%points.length]));}
    }else if(scene==='hub'){
      // The city is a diamond island (world.hubDeck); its parapet follows the rim.
      const d=world.hubDeck||{rx:740,ry:470},surface={x:1000,y:1100,rx:d.rx,ry:d.ry};surfaces.push(surface);
      const points=boundary(surface);for(let i=0;i<points.length;i++)walls.push(...splitWall(points[i],points[(i+1)%points.length]));
    }
    const piers=[...new Map(walls.flatMap(pair=>pair.map(p=>[p.x.toFixed(3)+','+p.y.toFixed(3),p]))).values()];
    const result={bridges:[],walls,surfaces,piers};cache.set(scene,result);return result;
  }
  function onSurface(p){return layout().surfaces.some(s=>{const cut=Math.min(.3,Math.max(.14,24/s.ry)),dx=Math.abs(p.x-s.x)/s.rx,dy=Math.abs(p.y-s.y)/s.ry;return dx+dy<1&&dx<1-cut&&dy<1-cut;});}
  function blocked(p){return layout().walls.some(([a,b])=>kiemCombat.segmentDistance(p,a,b)<4);}
  const walk=world.canWalk;world.canWalk=p=>walk(p)&&!blocked(p);
  function polygon(ctx,points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
  function drawWall(ctx,pair){const image=images['wall-panel'];if(!image.complete||!image.naturalWidth)return;
    let [a,b]=pair;if(a.x>b.x)[a,b]=[b,a];const dx=b.x-a.x,dy=b.y-a.y;
    const mirror=dy>0&&Math.abs(dx)>8,height=.48,side=Math.abs(dx)<8?(dy>0?-.32:.32):0,cc=side*height,dd=height;
    const baseX=2,baseY=mirror?48:68,nativeRise=mirror?20:-20;
    const aa=(dx-nativeRise*cc)/67,bb=(dy-nativeRise*dd)/67;
    ctx.save();ctx.transform(aa,bb,cc,dd,a.x-aa*baseX-cc*baseY,a.y-bb*baseX-dd*baseY);
    if(mirror){ctx.translate(image.naturalWidth,0);ctx.scale(-1,1);}renderArtwork(ctx,image,0,0,image.naturalWidth,image.naturalHeight);ctx.restore();
  }
  function drawPier(ctx,p){const image=images['wall-pier'];if(image.complete&&image.naturalWidth)renderArtwork(ctx,image,p.x-31*.39,p.y-102*.39,58*.39,104*.39);}
  function foundations(ctx){ctx.save();for(const [a,b]of layout().walls){const length=distance(a,b),nx=-(b.y-a.y)/length*3,ny=(b.x-a.x)/length*3;
    polygon(ctx,[{x:a.x+nx,y:a.y+ny},{x:b.x+nx,y:b.y+ny},{x:b.x-nx,y:b.y-ny+2},{x:a.x-nx,y:a.y-ny+2}]);ctx.fillStyle='#8f9a91';ctx.fill();
    polygon(ctx,[a,b,{x:b.x+4,y:b.y+5},{x:a.x+4,y:a.y+5}]);ctx.fillStyle='rgba(35,47,39,.12)';ctx.fill();
  }ctx.restore();}
  const ground=drawGround;drawGround=function(...args){ground(...args);foundations(g);};
  const queue=world.queueActors;world.queueActors=function(items,...args){queue(items,...args);for(const pair of layout().walls)items.push([(pair[0].y+pair[1].y)/2,()=>drawWall(g,pair)]);for(const p of layout().piers)items.push([p.y+.1,()=>drawPier(g,p)]);};
  const preview=world.renderMapPreview;world.renderMapPreview=function(ctx,size){preview(ctx,size);ctx.save();
    if(world.state.scene==='hub'){const c=world.city,w=c.right-c.left+120,h=c.bottom-c.top+120,z=size/Math.max(w,h);ctx.translate((size-w*z)/2,(size-h*z)/2);ctx.scale(z,z);ctx.translate(-c.left+60,-c.top+60);}else ctx.scale(size/M,size/M);
    foundations(ctx);for(const pair of layout().walls)drawWall(ctx,pair);for(const p of layout().piers)drawPier(ctx,p);ctx.restore();};
  world.mapStructures={images,layout,onSurface,blocked,drawWall};
})();
