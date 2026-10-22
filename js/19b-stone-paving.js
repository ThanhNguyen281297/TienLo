/* Individual isometric stone slabs. Geometry is cached; no texture or floor image. */
(function(){
  const halfWidth=22,halfHeight=11,models=new Map();
  // Slightly deeper, warm/cool-varied slate so figures and light pools read against the floor.
  const colors=['#a9b0a6','#b3b5a8','#a4aca4','#bab8a8','#aeb3a9','#b6b7aa','#a7afa3','#bcb9a9'];
  function outline(ctx,r){ctx.beginPath();if('rx' in r){ctx.moveTo(r.x,r.y-r.ry);ctx.lineTo(r.x+r.rx,r.y);ctx.lineTo(r.x,r.y+r.ry);ctx.lineTo(r.x-r.rx,r.y);ctx.closePath();}else ctx.rect(r.left,r.top,r.right-r.left,r.bottom-r.top);}
  function model(region){const key=JSON.stringify(region);if(models.has(key))return models.get(key);
    const b='rx' in region?{left:region.x-region.rx,right:region.x+region.rx,top:region.y-region.ry,bottom:region.y+region.ry}:region;
    const corners=[[b.left,b.top],[b.right,b.top],[b.right,b.bottom],[b.left,b.bottom]];
    const u=corners.map(([x,y])=>(x-1000)/44+(y-1100)/22),v=corners.map(([x,y])=>-(x-1000)/44+(y-1100)/22),tiles=[];
    for(let row=Math.floor(Math.min(...v))-2;row<=Math.ceil(Math.max(...v))+2;row++)for(let column=Math.floor(Math.min(...u))-2;column<=Math.ceil(Math.max(...u))+2;column++){
      const a=column+(row&1)*.5,x=1000+(a-row)*halfWidth,y=1100+(a+row)*halfHeight;
      if(x+halfWidth<b.left||x-halfWidth>b.right||y+halfHeight<b.top||y-halfHeight>b.bottom)continue;
      if('rx' in region&&Math.abs(x-region.x)/(region.rx+halfWidth)+Math.abs(y-region.y)/(region.ry+halfHeight)>1.04)continue;
      // Inset each slab for mortar; small cut corners read as dressed stone.
      const w=halfWidth-.65,h=halfHeight-.34,c=.9;
      const points=[[x-c,y-h+c*.5],[x+c,y-h+c*.5],[x+w-c,y-c*.5],[x+w-c,y+c*.5],[x+c,y+h-c*.5],[x-c,y+h-c*.5],[x-w+c,y+c*.5],[x-w+c,y-c*.5]];
      const shape=new Path2D();points.forEach(([px,py],i)=>i?shape.lineTo(px,py):shape.moveTo(px,py));shape.closePath();
      const light=new Path2D(),dark=new Path2D();light.moveTo(...points[7]);light.lineTo(...points[0]);light.lineTo(...points[1]);light.lineTo(...points[2]);dark.moveTo(...points[3]);dark.lineTo(...points[4]);dark.lineTo(...points[5]);dark.lineTo(...points[6]);
      const seed=(Math.imul(column,73856093)^Math.imul(row,19349663))>>>0;
      const grain=new Path2D(),wear=new Path2D();
      for(let i=0;i<3;i++){const offset=((seed>>>(i*5))&15)-7,px=x+offset*1.4,py=y+offset*.25-2+i*2;
        grain.moveTo(px,py);grain.lineTo(px+1+(seed%3),py+.45);}
      if(seed%19===0){wear.moveTo(x-9,y-3);wear.lineTo(x-5,y-1);wear.lineTo(x-4,y+1);wear.lineTo(x,y+1.6);}
      tiles.push({x,y,shape,light,dark,grain,wear,color:seed%colors.length});
    }
    const result={bounds:b,tiles};models.set(key,result);return result;
  }
  function draw(ctx,region,view){const m=model(region),b=m.bounds;
    if(view&&(b.right<view.x||b.left>view.x+view.width||b.bottom<view.y||b.top>view.y+view.height))return 0;
    ctx.save();outline(ctx,region);ctx.clip();ctx.fillStyle='#7f8a80';ctx.fillRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
    const batches=colors.map(()=>new Path2D()),light=new Path2D(),dark=new Path2D(),grain=new Path2D(),wear=new Path2D();let count=0;
    for(const tile of m.tiles){if(view&&(tile.x+halfWidth<view.x||tile.x-halfWidth>view.x+view.width||tile.y+halfHeight<view.y||tile.y-halfHeight>view.y+view.height))continue;
      batches[tile.color].addPath(tile.shape);light.addPath(tile.light);dark.addPath(tile.dark);grain.addPath(tile.grain);wear.addPath(tile.wear);count++;
    }
    // Batching keeps every slab independent without redrawing hundreds of images.
    batches.forEach((path,i)=>{ctx.fillStyle=colors[i];ctx.fill(path);});
    ctx.lineWidth=.55;ctx.strokeStyle='rgba(255,255,233,.44)';ctx.stroke(light);ctx.strokeStyle='rgba(58,76,65,.16)';ctx.stroke(dark);
    ctx.lineWidth=.4;ctx.strokeStyle='rgba(72,83,61,.085)';ctx.stroke(grain);ctx.strokeStyle='rgba(81,91,72,.14)';ctx.stroke(wear);
    const daylight=ctx.createLinearGradient(b.left,b.top,b.right,b.bottom);daylight.addColorStop(0,'rgba(255,240,191,.08)');daylight.addColorStop(.5,'rgba(255,240,191,0)');daylight.addColorStop(1,'rgba(36,61,55,.045)');ctx.fillStyle=daylight;ctx.fillRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
    ctx.restore();ctx.save();outline(ctx,region);ctx.strokeStyle='#a7afa5';ctx.lineWidth=1.4;ctx.stroke();ctx.restore();return count;
  }
  window.stonePaving={draw,model,colors,tileWidth:44,tileHeight:22};
})();
