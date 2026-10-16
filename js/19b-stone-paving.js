/* Individual isometric stone slabs. Geometry is cached; no texture or floor image. */
(function(){
  const halfWidth=22,halfHeight=11,models=new Map();
  const colors=['#c7c9c1','#cbcac1','#c2c6bf','#d0cec5','#c8cbc5','#cccfc8','#c5c7c0','#cecdc3'];
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
      tiles.push({x,y,shape,light,dark,color:seed%colors.length});
    }
    const result={bounds:b,tiles};models.set(key,result);return result;
  }
  function draw(ctx,region,view){const m=model(region),b=m.bounds;
    if(view&&(b.right<view.x||b.left>view.x+view.width||b.bottom<view.y||b.top>view.y+view.height))return 0;
    ctx.save();outline(ctx,region);ctx.clip();ctx.fillStyle='#87928f';ctx.fillRect(b.left,b.top,b.right-b.left,b.bottom-b.top);
    const batches=colors.map(()=>new Path2D()),light=new Path2D(),dark=new Path2D();let count=0;
    for(const tile of m.tiles){if(view&&(tile.x+halfWidth<view.x||tile.x-halfWidth>view.x+view.width||tile.y+halfHeight<view.y||tile.y-halfHeight>view.y+view.height))continue;
      batches[tile.color].addPath(tile.shape);light.addPath(tile.light);dark.addPath(tile.dark);count++;
    }
    // Batching keeps every slab independent without redrawing hundreds of images.
    batches.forEach((path,i)=>{ctx.fillStyle=colors[i];ctx.fill(path);});
    ctx.lineWidth=.55;ctx.strokeStyle='rgba(255,255,245,.34)';ctx.stroke(light);ctx.strokeStyle='rgba(58,76,75,.18)';ctx.stroke(dark);
    ctx.restore();ctx.save();outline(ctx,region);ctx.strokeStyle='#a7afa5';ctx.lineWidth=1.4;ctx.stroke();ctx.restore();return count;
  }
  window.stonePaving={draw,model,colors,tileWidth:44,tileHeight:22};
})();
