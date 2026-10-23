/* Xianxia ornament pass: lamps, banners, trees, crystals, glowing formations, spirit motes and mist.
   Presentation only. It never moves NPCs, portals, camps or spawns (the server validates those) and
   only adds small collision boxes for tall props placed away from every service and spawn point. */
(function(){
  'use strict';
  const world=worldMap,reduced=matchMedia('(prefers-reduced-motion:reduce)'),coarse=matchMedia('(pointer:coarse)');
  const meta=new Map(themeAtlasSprites.sprites.map(s=>[s.id,s]));
  const sid=(atlas,n)=>'theme-'+atlas+'-'+String(n).padStart(3,'0');

  // [atlas, sprite number, visible height in world px]
  const KITS={
    jade:{lamp:[[14,17,54],[14,18,50]],banner:[[14,24,54],[14,22,56],[14,33,54]],tree:[[14,35,72],[14,38,64]],rock:[[14,52,20],[14,53,24],[14,54,26]],
      crystal:[[11,17,30],[11,19,28],[11,20,28],[11,21,26]],flower:[[14,55,22],[14,56,18],[14,57,16]],
      glow:'255,208,130',cool:'150,255,226',glyph:[[14,65,150]],mist:[[14,68],[11,75],[11,81]]},
    lotus:{lamp:[[12,23,52],[12,29,44],[12,30,50]],banner:[[14,24,54],[14,22,56]],tree:[[14,36,76],[14,36,62]],rock:[[14,52,20],[14,53,24]],
      crystal:[[12,21,22],[12,15,20],[12,24,20]],flower:[[14,55,22],[14,56,18]],
      glow:'255,196,160',cool:'196,214,255',glyph:[],mist:[[12,36],[12,42]]},
    ice:{lamp:[[10,9,58],[10,16,52]],banner:[[14,24,54],[14,33,54]],tree:[[14,38,58]],rock:[[14,52,20]],
      crystal:[[10,34,34],[10,37,38],[10,58,26],[10,64,24]],flower:[[10,64,16],[10,26,16]],
      glow:'170,214,255',cool:'150,204,255',glyph:[],mist:[[10,63],[10,68]]},
    grove:{lamp:[[14,12,48],[14,16,40]],banner:[[14,24,54],[14,22,56],[14,33,54]],tree:[[14,38,66],[14,46,56],[14,45,40]],rock:[[14,52,20],[14,53,24],[14,54,26]],
      crystal:[[14,50,26],[14,67,28]],flower:[[14,55,22],[14,56,18],[14,57,16],[14,61,14]],
      glow:'255,214,140',cool:'160,255,200',glyph:[[14,66,150]],mist:[[14,68],[14,73]]},
    fire:{lamp:[[13,7,70],[13,17,52]],banner:[[15,14,58]],tree:[[13,13,40]],rock:[[13,13,34],[13,15,36]],
      crystal:[[13,11,44],[13,17,40]],flower:[[13,5,20]],
      glow:'255,150,80',cool:'255,170,100',glyph:[],mist:[]},
    lava:{lamp:[[15,12,86],[15,13,60],[15,15,60],[15,22,70]],banner:[[15,14,58]],tree:[[15,45,34]],rock:[[15,32,22],[15,51,22],[15,45,34]],
      crystal:[[15,24,50],[15,34,54]],flower:[[15,37,16]],
      glow:'255,140,70',cool:'255,120,70',glyph:[],mist:[]}
  };
  const OUTER={grove:[[14,11,190],[14,34,170],[14,31,160],[14,44,150],[14,26,150]],ice:[[10,18,190],[10,19,180],[10,20,170],[10,31,150],[10,32,150]],
    fire:[[13,12,170],[13,13,130],[13,14,130],[13,18,120]],lava:[[15,28,130],[15,30,150],[15,39,130],[15,41,150],[15,47,150]],lotus:[[12,14,150],[12,26,150],[12,27,170]],jade:[[11,36,170],[11,43,170],[11,48,150]]};
  const SCENE_KIT={hub:'jade',sword:'jade',moon:'lotus',thunder:'ice',mystic:'grove',tower:'jade',worldboss:'lava',
    'field-meadow':'grove','field-bamboo':'grove','field-marsh':'lotus','field-frost':'ice','field-ember':'fire','field-abyss':'lava',
    'rift-wood':'grove','rift-tide':'ice','rift-fire':'fire','rift-void':'lava'};
  const FIELD_ROADS=[[[1000,1860],[1000,1450],[970,1120],[1040,700],[1000,120]],[[1000,1400],[440,1320]],[[1000,1400],[1500,1320]],[[985,950],[430,850]],[[985,950],[1500,850]],[[1030,490],[550,370]],[[1030,490],[1430,370]]];
  const FIELD_CAMPS=[[440,1320],[1500,1320],[430,850],[1500,850],[550,370],[1430,370]];

  const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0;};
  const rng=seed=>()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};
  const segDistance=(p,a,b)=>kiemCombat.segmentDistance(p,{x:a[0],y:a[1]},{x:b[0],y:b[1]});
  const roadDistance=p=>Math.min(...FIELD_ROADS.flatMap(route=>route.slice(1).map((b,i)=>segDistance(p,route[i],b))));

  const cache=new Map();let baseWalk=world.canWalk;
  const drawn={items:0};

  function describe(kit,kind,pick){
    const [atlas,n,height]=pick,key=sid(atlas,n),m=meta.get(key);if(!m)return null;
    const scale=height/(m.height-2*m.padding);return{key,w:m.width*scale,h:height,kind};
  }
  function build(scene){
    const kitName=SCENE_KIT[scene];if(!kitName)return null;
    const kit=KITS[kitName],rand=rng(hash(scene)),items=[],decals=[],emitters=[];
    const pick=list=>list[Math.floor(rand()*list.length)];
    const spawn=scene==='hub'?{x:1000,y:1100,r:90}:scene.startsWith('field-')?{x:1000,y:1770,r:150}:scene.startsWith('rift-')?{x:1000,y:1380,r:95}:scene==='tower'?{x:1000,y:1380,r:90}:scene==='worldboss'?{x:1000,y:1220,r:90}:{x:1000,y:1110,r:100};
    const avoid=[spawn];
    for(const s of world.services)avoid.push({x:s.x,y:s.y,r:s.npc?50:(String(s.id||'').startsWith('farm-gate')?40:46)});
    for(const b of world.buildings){const r=b.ground?Math.max(40,b.w*.3):Math.max(26,(b.w||40)*.42);avoid.push({x:b.x,y:b.y-(b.w||40)*.15,r});}
    const sect=world.sectLayouts?.[scene],diamond=sect?{rx:sect.rx,ry:sect.ry}:null;
    const inRegion=p=>{
      if(scene==='hub')return p.x>655&&p.x<1345&&p.y>650&&p.y<1395;
      if(scene.startsWith('field-'))return p.x>140&&p.x<1860&&p.y>140&&p.y<1860&&roadDistance(p)>78&&FIELD_CAMPS.every(c=>((p.x-c[0])/230)**2+((p.y-c[1])/140)**2>1);
      if(scene.startsWith('rift-'))return((p.x-1000)/585)**2+((p.y-1100)/305)**2<1;
      if(scene==='tower')return Math.abs(p.x-1000)/460+Math.abs(p.y-1100)/300<.86;
      if(scene==='worldboss')return Math.abs(p.x-1000)/300+Math.abs(p.y-1100)/150<.86;
      return !!diamond&&Math.abs(p.x-1000)/diamond.rx+Math.abs(p.y-1100)/diamond.ry<.9;
    };
    const free=(x,y,r)=>inRegion({x,y})&&avoid.every(a=>Math.hypot(a.x-x,a.y-y)>a.r+r)&&items.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+r)&&baseWalk({x,y})&&baseWalk({x:x-9,y:y+6})&&baseWalk({x:x+9,y:y+6});
    const put=(kind,x,y,options={})=>{
      const d=describe(kit,kind,pick(kit[kind]));if(!d)return false;
      const r=Math.max(10,d.w*(kind==='tree'?.28:.4));if(!free(x,y,r*(options.spacing??1)))return false;
      items.push({...d,x,y,r,solid:options.solid??(kind==='lamp'||kind==='tree'||(kind==='rock'&&d.h>=24)),
        glow:kind==='lamp'?{rgb:kit.glow,dy:.84,radius:d.h*(coarse.matches?1.15:1.5),a:.5}:kind==='crystal'?{rgb:kit.cool,dy:.55,radius:d.h*1.4,a:.38}:null,
        sway:kind==='tree'||kind==='flower'?(kind==='tree'?.012:.03):0,phase:rand()*6.28});
      return true;
    };
    const scatter=(kind,count,tries=240,options)=>{let placed=0;for(let i=0;i<tries&&placed<count;i++){
      const p={x:140+rand()*1720,y:300+rand()*1500};
      // Concentrate on the scene's own region by sampling inside its bounding box.
      if(scene==='hub'){p.x=660+rand()*680;p.y=655+rand()*735;}
      else if(scene.startsWith('rift-')){p.x=420+rand()*1160;p.y=800+rand()*600;}
      else if(scene==='tower'){p.x=560+rand()*880;p.y=820+rand()*560;}
      else if(scene==='worldboss'){p.x=740+rand()*520;p.y=960+rand()*280;}
      else if(diamond){p.x=1000+(rand()*2-1)*diamond.rx;p.y=1100+(rand()*2-1)*diamond.ry;}
      if(put(kind,p.x,p.y,options))placed++;}return placed;};
    const ring=(kind,cx,cy,rx,ry,count,start=0,options)=>{for(let i=0;i<count;i++){const a=start+i*Math.PI*2/count;put(kind,cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,options);}};
    const edge=(inset,spacing,kind='lamp',rx,ry,cy=1100)=>{
      const v=[[0,-1],[1,0],[0,1],[-1,0]].map(([a,b])=>({x:1000+a*rx*inset,y:cy+b*ry*inset}));
      for(let e=0;e<4;e++){const a=v[e],b=v[(e+1)%4],len=Math.hypot(b.x-a.x,b.y-a.y),n=Math.max(2,Math.round(len/spacing));
        for(let i=1;i<n;i++){const t=i/n;put(kind,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);}}
    };
    const glyph=(x,y,w,alpha=.8)=>{if(!kit.glyph.length)return;const g=pick(kit.glyph),m=meta.get(sid(g[0],g[1]));if(m)decals.push({key:sid(g[0],g[1]),x,y,w,alpha});};

    if(scene==='hub'){
      scatter('flower',16);scatter('rock',6);scatter('crystal',5);scatter('tree',4);
      ring('banner',1000,1000,210,70,4,.6);
    }else if(diamond){
      glyph(1000,1112,300,.85);decals.push({formation:true,x:1000,y:1108,r:150,rgb:kit.cool});
      emitters.push({x:1000,y:1108,spread:130,count:16,rgb:kit.cool,height:120});
      ring('lamp',1000,1108,170,86,4,Math.PI/4,{solid:true});
      ring('crystal',1000,1108,118,60,4,0);
      edge(.8,84,'lamp',diamond.rx,diamond.ry);
      ring('banner',1000,1100,255,128,4,Math.PI/4);
      scatter('tree',7);scatter('rock',5);scatter('flower',14);scatter('crystal',4);
    }else if(scene==='tower'){
      decals.push({formation:true,x:1000,y:1100,r:200,rgb:kit.cool});emitters.push({x:1000,y:1100,spread:170,count:18,rgb:kit.cool,height:130});
      edge(.78,92,'lamp',460,300);scatter('crystal',8);scatter('banner',4);
    }else if(scene==='worldboss'){
      glyph(1000,1100,420,.9);decals.push({formation:true,x:1000,y:1100,r:190,rgb:kit.glow});
      emitters.push({x:1000,y:1100,spread:200,count:22,rgb:kit.glow,height:150});
      edge(.78,76,'lamp',300,150);scatter('crystal',5);scatter('rock',5);
    }else if(scene.startsWith('rift-')){
      glyph(1000,1100,360,.85);decals.push({formation:true,x:1000,y:1100,r:165,rgb:kit.cool});
      decals.push({formation:true,x:1000,y:1380,r:66,rgb:kit.glow,small:true});
      emitters.push({x:1000,y:1100,spread:190,count:20,rgb:kit.cool,height:140},{x:1000,y:1380,spread:60,count:8,rgb:kit.glow,height:90});
      ring('lamp',1000,1100,500,250,8,.3);
      ring('crystal',1000,1100,300,150,6,.1);
      ring('banner',1000,1300,170,40,2,Math.PI);
      scatter('tree',6);scatter('rock',9);scatter('flower',20);scatter('crystal',8);scatter('lamp',3);
    }else if(scene.startsWith('field-')){const c0=kitName==='fire'||kitName==='lava'||kitName==='ice';
      decals.push({formation:true,x:1000,y:1770,r:112,rgb:kit.cool,small:true});glyph(1000,1770,170,.8);
      emitters.push({x:1000,y:1770,spread:100,count:12,rgb:kit.cool,height:110});
      // Lamps follow the main road on alternating sides.
      const route=FIELD_ROADS[0];let side=1,carried=0;
      for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dy=(b[1]-a[1])/len;
        for(let d=carried+120;d<len;d+=210){const x=a[0]+dx*d-dy*70*side,y=a[1]+dy*d+dx*70*side;put('lamp',x,y);side=-side;}carried=0;}
      FIELD_CAMPS.forEach(([cx,cy],i)=>{ring('crystal',cx,cy,300,170,5,i);ring('lamp',cx,cy,278,158,2,i+.8);put('banner',cx+(cx<1000?250:-250),cy+10);});
      scatter('flower',c0?46:34,600);scatter('crystal',c0?18:10,400);scatter('rock',c0?14:8,400);scatter('lamp',c0?6:3,300);
    }
    if(scene.startsWith('rift-')||scene==='tower'){
      // Floating islets beyond the walkable rim; purely scenic and never solid.
      const rx=scene==='tower'?500:660,ry=scene==='tower'?330:370,list=OUTER[kitName]||[];
      for(let i=0;i<9;i++){const a=.15+i*(Math.PI-.3)/8+(rand()-.5)*.18,k=1.08+rand()*.2,pickOuter=list[i%list.length];if(!pickOuter)break;
        const d=describe(kit,'float',pickOuter);if(!d)continue;
        items.push({...d,x:1000+Math.cos(a)*rx*k,y:1100+Math.sin(a)*ry*k+d.h*.5,r:0,solid:false,glow:null,sway:0,phase:rand()*6.28,bob:3+rand()*3,scenic:true});}
    }
    return{scene,items:items.sort((a,b)=>a.y-b.y),decals,emitters,kit,kitName,mist:buildMist(kit,rand)};
  }
  function buildMist(kit,rand){
    if(!kit.mist.length)return[];
    return Array.from({length:coarse.matches?3:5},(_,i)=>{const [atlas,n]=kit.mist[i%kit.mist.length];return{key:sid(atlas,n),y:420+rand()*1200,speed:6+rand()*8,phase:rand(),w:360+rand()*220,alpha:.2+rand()*.1};});
  }
  function current(){const scene=world.state.scene;let c=cache.get(scene);if(c===undefined){c=null;try{c=build(scene);}catch(e){c=null;}cache.set(scene,c);}return c;}
  // Rebuild after every scene change so buildings/services of the new scene are respected.
  const change=world.switchScene;world.switchScene=function(...args){const result=change.apply(this,args);cache.delete(world.state.scene);return result;};

  // Collision: small boxes for tall props, never reachable from spawn or service points by construction.
  baseWalk=world.canWalk;
  world.canWalk=p=>{if(!baseWalk(p))return false;const c=cache.get(world.state.scene);if(!c)return true;
    for(const o of c.items)if(o.solid&&Math.abs(p.x-o.x)<9&&p.y>o.y-6&&p.y<o.y+4)return false;return true;};

  const onScreen=(o,cx,cy,vw,vh,pad=120)=>o.x>cx-pad&&o.x<cx+vw+pad&&o.y>cy-40&&o.y<cy+vh+pad+60;
  const time=()=>reduced.matches?0:performance.now()/1000;

  function drawItem(ctx,o,t){
    if(o.scenic){const dy=reduced.matches?0:Math.sin(t*.5+o.phase)*o.bob;world.sprite(ctx,o.key,o.x,o.y+dy,o.w);return;}
    ctx.save();ctx.fillStyle='rgba(10,20,22,.18)';ctx.beginPath();ctx.ellipse(o.x,o.y-2,Math.max(5,o.w*.3),Math.max(2,o.w*.08),0,0,6.3);ctx.fill();ctx.restore();
    if(o.sway&&!reduced.matches){
      const s=Math.sin(t*1.1+o.phase)*o.sway;ctx.save();ctx.translate(o.x,o.y);ctx.transform(1,0,s,1,0,0);ctx.translate(-o.x,-o.y);world.sprite(ctx,o.key,o.x,o.y,o.w);ctx.restore();
    }else world.sprite(ctx,o.key,o.x,o.y,o.w);
    drawn.items++;
  }
  const queue=world.queueActors;
  world.queueActors=function(items,cx,cy,vw,vh){queue.call(this,items,cx,cy,vw,vh);const c=current();if(!c)return;const t=time();
    for(const o of c.items)if(onScreen(o,cx,cy,vw,vh))items.push([o.y,()=>drawItem(g,o,t)]);};

  function glow(ctx,x,y,r,rgb,a){const gr=ctx.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba('+rgb+','+a+')');gr.addColorStop(.4,'rgba('+rgb+','+a*.32+')');gr.addColorStop(1,'rgba('+rgb+',0)');ctx.fillStyle=gr;ctx.fillRect(x-r,y-r,r*2,r*2);}
  function formation(ctx,d,t){
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.translate(d.x,d.y);ctx.scale(1,.5);
    const pulse=.75+.25*Math.sin(t*1.4+d.x),rgb=d.rgb;
    glow(ctx,0,0,d.r*1.15,rgb,.16*pulse);
    ctx.lineCap='round';
    for(const [k,w,a] of [[1,1.6,.55],[.84,1,.4],[.52,1.2,.35]]){ctx.strokeStyle='rgba('+rgb+','+a*pulse+')';ctx.lineWidth=w*(d.small?.8:1);ctx.beginPath();ctx.arc(0,0,d.r*k,0,6.283);ctx.stroke();}
    const ticks=d.small?16:28,spin=t*.12;ctx.strokeStyle='rgba('+rgb+','+.5*pulse+')';ctx.lineWidth=1;
    for(let i=0;i<ticks;i++){const a=spin+i*6.283/ticks,r1=d.r*.86,r2=d.r*(i%2?.93:.97);ctx.beginPath();ctx.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);ctx.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);ctx.stroke();}
    if(!d.small){ // eight trigram bars on the inner ring, counter-rotating
      for(let i=0;i<8;i++){const a=-spin*.7+i*Math.PI/4,r1=d.r*.56,r2=d.r*.78;ctx.save();ctx.rotate(a);for(let k=0;k<(i%3)+1;k++){ctx.beginPath();ctx.moveTo(r1+k*6,-3);ctx.lineTo(r1+k*6,3);ctx.stroke();}ctx.restore();}
    }
    ctx.restore();
  }
  const ground=world.drawGroundDetails;
  world.drawGroundDetails=function(ctx,cx,cy,vw,vh){ground.call(this,ctx,cx,cy,vw,vh);const c=current();if(!c)return;const t=time();
    for(const d of c.decals){if(!onScreen({x:d.x,y:d.y},cx,cy,vw,vh,d.r||d.w||200))continue;
      if(d.formation)formation(ctx,d,t);else world.sprite(ctx,d.key,d.x,d.y+d.w*.12,d.w,null,d.alpha);}
    for(const m of c.mist){const span=2400,x=((t*m.speed+m.phase*span)%span)-200;if(x<cx-m.w||x>cx+vw+m.w||m.y<cy-120||m.y>cy+vh+120)continue;
      ctx.save();ctx.globalAlpha=m.alpha;world.sprite(ctx,m.key,x,m.y,m.w,null,1);ctx.restore();}
  };

  // Light layer above everything: lamp/crystal glows and rising spirit motes, drawn additively.
  const draw=dr;
  dr=function(){draw();
    try{
      if(!P.ap)return;const c=current();if(!c)return;
      const vw=W/Z,vh=H/Z,cam=gameCamera(vw,vh),t=time();
      g.save();g.setTransform(Z,0,0,Z,-cam.x*Z,-cam.y*Z);g.globalCompositeOperation='lighter';
      for(const o of c.items){if(!o.glow||!onScreen(o,cam.x,cam.y,vw,vh,160))continue;
        const flick=o.glow.rgb===c.kit.glow?.82+.18*Math.sin(t*3.1+o.phase)+.06*Math.sin(t*7.3+o.phase*2):.85+.15*Math.sin(t*1.7+o.phase);
        glow(g,o.x,o.y-o.h*o.glow.dy,o.glow.radius,o.glow.rgb,o.glow.a*flick);}
      if(!reduced.matches){
        for(const e of c.emitters){if(!onScreen(e,cam.x,cam.y,vw,vh,e.spread+60))continue;
          const n=coarse.matches?Math.ceil(e.count*.6):e.count;
          for(let i=0;i<n;i++){const s=hash(String(i)+e.x),ph=(s%1000)/1000,sp=.05+((s>>10)%100)/1500,life=(t*sp+ph)%1,
            bx=e.x+(((s>>4)%2000)/1000-1)*e.spread,by=e.y+(((s>>13)%1000)/1000-.4)*e.spread*.45;
            const x=bx+Math.sin(t*.8+i*1.7)*5,y=by-life*e.height,a=Math.sin(life*3.1416)*.8;
            glow(g,x,y,3.4,e.rgb,a);g.fillStyle='rgba(255,255,255,'+a*.8+')';g.fillRect(x-.5,y-.5,1,1);}
        }
      }
      if(!reduced.matches){
        const cell=coarse.matches?260:200,x0=Math.floor(cam.x/cell)-1,x1=Math.ceil((cam.x+vw)/cell),y0=Math.floor(cam.y/cell)-1,y1=Math.ceil((cam.y+vh)/cell)+1;
        const embers=c.kitName==='fire'||c.kitName==='lava',rgb=embers?c.kit.glow:c.kit.cool;
        for(let ix=x0;ix<=x1;ix++)for(let iy=y0;iy<=y1;iy++){
          const s=hash(ix+','+iy+c.scene),ph=(s%997)/997,sp=embers?.07:.035+((s>>8)%50)/2500,life=(t*sp+ph)%1,rise=embers?60:34;
          const x=ix*cell+((s>>3)%cell)+Math.sin(t*.6+s)*6,y=iy*cell+((s>>11)%cell)-life*rise,a=Math.sin(life*3.1416)*(embers?.85:.6);
          glow(g,x,y,embers?3.2:2.6,rgb,a);g.fillStyle='rgba(255,255,255,'+a*.7+')';g.fillRect(x-.5,y-.5,1,1);}
      }
      g.restore();
    }catch(e){g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over';}
  };
  world.ornaments={current,kits:KITS,count:()=>current()?.items.length||0};
})();
