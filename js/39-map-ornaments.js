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
    jade:{moss:'86,128,92',lamp:[[14,17,54],[14,18,50]],banner:[[14,24,54],[14,22,56],[14,33,54]],tree:[[14,35,72],[14,38,64]],rock:[[14,52,20],[14,53,24],[14,54,26]],
      crystal:[[11,17,30],[11,19,28],[11,20,28],[11,21,26]],flower:[[14,55,22],[14,56,18],[14,57,16]],
      glow:'255,208,130',cool:'150,255,226',glyph:[[14,65,150]],mist:[[14,68],[11,75],[11,81]]},
    lotus:{moss:'80,124,112',lamp:[[12,23,52],[12,29,44],[12,30,50]],banner:[[14,24,54],[14,22,56]],tree:[[14,36,76],[14,36,62]],rock:[[14,52,20],[14,53,24]],
      crystal:[[12,21,22],[12,15,20],[12,24,20]],flower:[[14,55,22],[14,56,18]],
      glow:'255,196,160',cool:'196,214,255',glyph:[],mist:[[12,36],[12,42]]},
    ice:{moss:'150,190,214',lamp:[[10,9,58],[10,16,52]],banner:[[14,24,54],[14,33,54]],tree:[[14,38,58]],rock:[[14,52,20]],
      crystal:[[10,34,34],[10,37,38],[10,58,26],[10,64,24]],flower:[[10,64,16],[10,26,16]],
      glow:'170,214,255',cool:'150,204,255',glyph:[],mist:[[10,63],[10,68]]},
    grove:{moss:'64,112,62',lamp:[[14,12,48],[14,16,40]],banner:[[14,24,54],[14,22,56],[14,33,54]],tree:[[14,38,66],[14,46,56],[14,45,40]],rock:[[14,52,20],[14,53,24],[14,54,26]],
      crystal:[[14,50,26],[14,67,28]],flower:[[14,55,22],[14,56,18],[14,57,16],[14,61,14]],
      glow:'255,214,140',cool:'160,255,200',glyph:[[14,66,150]],mist:[[14,68],[14,73]]},
    fire:{moss:'40,18,12',lamp:[[13,7,70],[13,17,52]],banner:[[15,14,58]],tree:[[13,13,40]],rock:[[13,13,34],[13,15,36]],
      crystal:[[13,11,44],[13,17,40]],flower:[[13,5,20]],
      glow:'255,150,80',cool:'255,170,100',glyph:[],mist:[]},
    lava:{moss:'34,12,8',lamp:[[15,12,86],[15,13,60],[15,15,60],[15,22,70]],banner:[[15,14,58]],tree:[[15,45,34]],rock:[[15,32,22],[15,51,22],[15,45,34]],
      crystal:[[15,24,50],[15,34,54]],flower:[[15,37,16]],
      glow:'255,140,70',cool:'255,120,70',glyph:[],mist:[]}
  };
  const OUTER={grove:[[14,11,190],[14,34,170],[14,31,160],[14,44,150],[14,26,150]],ice:[[10,18,190],[10,19,180],[10,20,170],[10,31,150],[10,32,150]],
    fire:[[13,12,170],[13,13,130],[13,14,130],[13,18,120]],lava:[[15,28,130],[15,30,150],[15,39,130],[15,41,150],[15,47,150]],lotus:[[12,14,150],[12,26,150],[12,27,170]],jade:[[11,36,170],[11,43,170],[11,48,150]]};
  const SCENE_KIT={hub:'jade',sword:'jade',moon:'lotus',thunder:'ice',mystic:'grove',tower:'jade',worldboss:'lava',
    'field-meadow':'grove','field-bamboo':'grove','field-marsh':'lotus','field-frost':'ice','field-ember':'fire','field-abyss':'lava',
    'rift-wood':'grove','rift-tide':'ice','rift-fire':'fire','rift-void':'lava'};
  const FIELD_ROADS=window.overworldRoads||[[[1000,1860],[1000,1450],[970,1120],[1040,700],[1000,120]],[[1000,1400],[440,1320]],[[1000,1400],[1500,1320]],[[985,950],[430,850]],[[985,950],[1500,850]],[[1030,490],[550,370]],[[1030,490],[1430,370]]];
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
    for(const b of world.buildings){if(b.wood||(b.w<40&&!b.solid))continue;const r=b.ground?Math.max(40,b.w*.3):Math.max(26,(b.w||40)*.42);avoid.push({x:b.x,y:b.y-(b.w||40)*.15,r});}
    const sect=world.sectLayouts?.[scene],diamond=sect?{rx:sect.rx,ry:sect.ry}:null;
    const inRegion=p=>{
      if(scene==='hub')return p.x>655&&p.x<1345&&p.y>650&&p.y<1395;
      if(scene.startsWith('field-'))return p.x>140&&p.x<1860&&p.y>140&&p.y<1860&&roadDistance(p)>84&&FIELD_CAMPS.every(c=>((p.x-c[0])/230)**2+((p.y-c[1])/140)**2>1);
      if(scene.startsWith('rift-'))return((p.x-1000)/585)**2+((p.y-1100)/305)**2<1;
      if(scene==='tower')return Math.abs(p.x-1000)/460+Math.abs(p.y-1100)/300<.86;
      if(scene==='worldboss')return Math.abs(p.x-1000)/300+Math.abs(p.y-1100)/150<.86;
      return !!diamond&&Math.abs(p.x-1000)/diamond.rx+Math.abs(p.y-1100)/diamond.ry<.9;
    };
    // Rim props stand on the paved border between the walkable court and the parapet: on the platform, off the walk.
    const onPlatform=(x,y)=>diamond?Math.abs(x-1000)/diamond.rx+Math.abs(y-1100)/diamond.ry<.99:scene==='tower'?Math.abs(x-1000)/460+Math.abs(y-1100)/300<.97:false;
    const free=(x,y,r,rim)=>(rim?onPlatform(x,y):inRegion({x,y}))&&avoid.every(a=>Math.hypot(a.x-x,a.y-y)>a.r+r)&&items.every(o=>Math.hypot(o.x-x,o.y-y)>o.r+r)&&(rim||baseWalk({x,y})&&baseWalk({x:x-9,y:y+6})&&baseWalk({x:x+9,y:y+6}));
    const put=(kind,x,y,options={})=>{
      const d=describe(kit,kind,options.use||pick(kit[kind]));if(!d)return false;
      const r=Math.max(10,d.w*(kind==='tree'?.28:.4));if(!free(x,y,r*(options.spacing??1),options.rim))return false;
      items.push({...d,x,y,r,solid:!options.rim&&(options.solid??(kind==='lamp'||kind==='tree'||(kind==='rock'&&d.h>=24))),
        glow:kind==='lamp'?{rgb:kit.glow,dy:.84,radius:d.h*(coarse.matches?.95:1.15),a:.36}:kind==='crystal'?{rgb:kit.cool,dy:.55,radius:d.h*1.4,a:.38}:null,
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

    // ---- Layout helpers: props are placed by rule (mirror pairs, straight runs, groves), never by blind scatter ----
    const paved=scene==='hub'||!!diamond||scene==='tower'||scene==='worldboss'||scene.startsWith('rift-');
    // Nearest paving-slab centre, so every prop stands squarely on a slab like the floor art.
    const snap=(x,y)=>{if(!paved)return{x,y};const dx=(x-1000)/22,dy=(y-1100)/11,row=Math.round((dy-dx)/2),a=(dx+dy)/2,col=Math.round(a-(row&1)*.5),aa=col+(row&1)*.5;return{x:1000+(aa-row)*22,y:1100+(aa+row)*11};};
    const place=(kind,x,y,options)=>{const p=snap(x,y);return put(kind,p.x,p.y,options);};
    // Mirrored pair about x=1000, same sprite and same slab row, both or neither.
    const pair=(kind,dx,y,options={})=>{
      let j=Math.round((y-1100)/11),i=Math.round(dx/22);if(paved&&((i-j)&1))i++;
      const yy=paved?1100+j*11:y,xo=paved?i*22:dx,use=pick(kit[kind]);
      if(!put(kind,1000-xo,yy,{...options,use}))return false;
      if(!put(kind,1000+xo,yy,{...options,use})){items.pop();return false;}
      return true;};
    // Grove: one focal tree/crystal, rocks and flowers tucked at its foot, and a soft ground patch.
    const cluster=(x,y,spec={})=>{
      const p=snap(x,y),rim=spec.rim;if(!put(spec.main||'tree',p.x,p.y,{spacing:spec.spacing??.9,use:spec.use,rim}))return false;
      // Tidy planting: rocks tucked behind the focal piece, flowers in a front arc.
      const RA=[-2.6,-.54,-1.57],FA=[1.57,.75,2.39,.25,2.89,1.17,1.97];
      for(let i=0;i<Math.min(3,spec.rocks??2);i++){const a=RA[i],d=i===2?22:30;put('rock',p.x+Math.cos(a)*d,p.y+Math.sin(a)*d*.5,{spacing:.3,rim});}
      for(let i=0;i<Math.min(7,spec.flowers??5);i++){const a=FA[i],d=i<3?24:32;put('flower',p.x+Math.cos(a)*d,p.y+Math.sin(a)*d*.5+2,{spacing:.15,rim});}
      decals.push({patch:true,x:p.x,y:p.y+2,r:spec.patch??60,rgb:kit.moss});return true;};
    // Mirrored groves: same focal sprite on both sides, first fitting candidate wins.
    const groves=(cands,spec={})=>{const use=pick(kit[spec.main||'tree']);
      for(const [dx,y] of cands){const n=items.length,nd=decals.length;
        if(cluster(1000-dx,y,{...spec,use,mirror:-1})&&cluster(1000+dx,y,{...spec,use,mirror:1}))return true;
        items.length=n;decals.length=nd;}
      return false;};
    if(scene==='hub'){
      // Ceremonial axis: lantern pairs line the north-south avenue between the gate and the great hall.
      for(const y of [1020,1150,1250])pair('lamp',88,y,{solid:true});
      pair('banner',150,905);
      for(const y of [1060,1290])pair('lamp',330,y,{solid:true});
      groves([[320,720],[300,760]],{rocks:2,flowers:5});
      groves([[330,1200],[300,1260]],{main:'crystal',rocks:1,flowers:4,patch:46});
    }else if(diamond){
      const rx=diamond.rx,ry=diamond.ry;
      glyph(1000,1112,300,.85);decals.push({formation:true,x:1000,y:1108,r:150,rgb:kit.cool});
      emitters.push({x:1000,y:1108,spread:130,count:16,rgb:kit.cool,height:120});
      // Four inlaid processional paths: from the formation, through each gate, out to the bridge at the corner.
      for(const [ux,uy] of [[1,0],[-1,0],[0,1],[0,-1]]){const fx=ux?168:0,fy=uy?86:0;
        decals.push({path:true,x0:1000+ux*fx,y0:1108+uy*fy,x1:1000+ux*rx*.94,y1:1100+uy*ry*.94,w:ux?17:34,vertical:!ux});}
      // Gate lanterns flank every path where it leaves the court.
      pair('lamp',rx*.8,1100-26,{rim:true});pair('lamp',rx*.8,1100+26,{rim:true});
      for(const sy of [-1,1]){const y=1100+sy*ry*.8;place('lamp',1000-50,y,{rim:true});place('lamp',1000+50,y,{rim:true});}
      // Inner court: four lanterns square to the formation, low flower beds in the quadrants.
      pair('lamp',152,1108-76,{solid:true});pair('lamp',152,1108+76,{solid:true});
      for(const [dx,y] of [[rx*.45,1100-ry*.34],[rx*.42,1100+ry*.34]])groves([[dx,y],[dx*.85,y],[dx*1.1,y]],{main:'crystal',rocks:2,flowers:3,patch:38,spacing:.6});
      // Garden border along the walls: trees and lanterns against the back walls, lanterns and flower beds at the front.
      for(const [sy,back] of [[-1,true],[1,false]]){const n=7;
        for(let i=0;i<n;i++){const t=.17+i*.66/(n-1),x=rx*.86*t,y=1100+sy*ry*.86*(1-t);
          if(i%2===0)pair('lamp',x,y,{rim:true});
          else if(back)groves([[x,y-4]],{rim:true,spacing:.5,rocks:1,flowers:2,patch:44});}}
    }else if(scene==='tower'){
      decals.push({formation:true,x:1000,y:1100,r:200,rgb:kit.cool});emitters.push({x:1000,y:1100,spread:170,count:18,rgb:kit.cool,height:130});
      edge(.8,110,'lamp',460,300);
      pair('banner',96,1300);pair('lamp',150,1250,{solid:true});
      groves([[300,1100],[280,1130]],{main:'crystal',rocks:2,flowers:3,patch:48});
      pair('crystal',200,1000);pair('crystal',200,1200);
    }else if(scene==='worldboss'){
      glyph(1000,1100,420,.9);decals.push({formation:true,x:1000,y:1100,r:190,rgb:kit.glow});
      emitters.push({x:1000,y:1100,spread:200,count:22,rgb:kit.glow,height:150});
      edge(.8,80,'lamp',300,150);pair('crystal',150,1100);
    }else if(scene.startsWith('rift-')){
      glyph(1000,1100,360,.85);decals.push({formation:true,x:1000,y:1100,r:165,rgb:kit.cool});
      decals.push({formation:true,x:1000,y:1380,r:66,rgb:kit.glow,small:true});
      emitters.push({x:1000,y:1100,spread:190,count:20,rgb:kit.cool,height:140},{x:1000,y:1380,spread:60,count:8,rgb:kit.glow,height:90});
      // Symmetric rings: lanterns on the rim, crystals around the formation.
      ring('lamp',1000,1100,500,255,8,Math.PI/8,{solid:true});
      ring('crystal',1000,1100,270,138,4,Math.PI/4);
      pair('banner',100,1350);pair('lamp',190,1330,{solid:true});
      groves([[380,1100-110],[340,1100-130]],{rocks:2,flowers:6});
      groves([[380,1100+110],[340,1100+130]],{rocks:2,flowers:6});
      groves([[160,1100-215],[200,1100-205]],{main:'crystal',rocks:2,flowers:4,patch:46});
      groves([[470,1100],[440,1100]],{main:'crystal',rocks:1,flowers:3,patch:44});
    }else if(scene.startsWith('field-')){const harsh=kitName==='fire'||kitName==='lava'||kitName==='ice';
      decals.push({formation:true,x:1000,y:1770,r:112,rgb:kit.cool,small:true});glyph(1000,1770,170,.8);
      emitters.push({x:1000,y:1770,spread:100,count:12,rgb:kit.cool,height:110});
      // Lanterns in facing pairs on both verges of the main road, every ~230 px.
      // Layout v2 (35r) places its own lanterns and camp shrines along curved roads.
      if(!world.fieldLayoutV2){
      const route=FIELD_ROADS[0];
      for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i];
        const len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dy=(b[1]-a[1])/len;
        for(let d=150;d<len-60;d+=230){const use=pick(kit.lamp);for(const nudge of [0,40,-40,80]){const at=(s,dd)=>[a[0]+dx*dd-dy*92*s,a[1]+dy*dd+dx*92*s],L=at(1,d+nudge),R=at(-1,d+nudge);
          if(put('lamp',L[0],L[1],{solid:true,use})){if(put('lamp',R[0],R[1],{solid:true,use}))break;items.pop();}}}}
      // Each hunting camp gets a marker on its road side: a banner between two crystals.
      FIELD_CAMPS.forEach(([cx,cy])=>{const t=cx<1000?1:-1;put('banner',cx+t*250,cy+10);
        put('crystal',cx+t*244,cy-70);put('crystal',cx+t*244,cy+90);});
      }
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
  // Field vegetation: the stock map sprinkles ~300 plants uniformly. Regroup them into woods with
  // feathered fringes, open clearings around camps and wildflowers along the road verges.
  const LANDMARK=b=>b.key==='lantern'||b.key==='portal'||b.key==='lotusPond'||(b.key==='rock'&&((b.x===820&&b.y===610)||(b.x===190&&b.y===1070)));
  function arrangeField(scene){
    const rules=window.overworldRules,m=rules?.maps.find(x=>x.id===scene);if(!m)return;
    const rand=rng(hash('woods'+scene)),keep=world.buildings.filter(LANDMARK),out=[];
    const abyss=scene==='field-abyss';
    const big0=m.ground==='frost'?['pineTree','whiteBlossom','pineTree']:m.ground==='ember'?['rock']:['pineTree','pineTree','whiteBlossom'];
    const big=m.ground==='ember'?(abyss?['theme-15-045','theme-15-032','theme-15-051']:['theme-13-013','theme-13-015']):big0;
    const small=m.ground==='ember'?(abyss?['theme-15-037']:['theme-13-005']):m.ground==='frost'?['theme-14-055','theme-14-036']:['theme-14-055','theme-14-056','theme-14-036'];
    const camp=p=>rules.camps.some(c=>Math.hypot((p.x-c.x)/1.25,p.y-c.y)<185);
    const ok=(p,gap)=>p.x>90&&p.x<1910&&p.y>90&&p.y<1910&&roadDistance(p)>72&&!camp(p)&&Math.hypot(p.x-1000,p.y-1770)>190&&
      keep.every(b=>Math.hypot(b.x-p.x,b.y-p.y)>(b.w||40)*.6+20)&&out.every(b=>Math.hypot(b.x-p.x,(b.y-p.y)*1.4)>gap);
    const tree=(x,y,w,i)=>{const p={x,y};if(!ok(p,40))return false;const key=big[i%big.length];
      out.push({x,y,key,w,plant:key!=='rock',wood:true,solid:[-10,-6,10,5]});return true;};
    const shrub=(x,y,i)=>{const p={x,y};if(!ok(p,26))return false;out.push({x,y,key:small[i%small.length],w:20+rand()*12,plant:small[i%small.length]!=='rock',solid:null});return true;};
    // Woods: anchors on a loose grid in the open ground; each wood is a golden-angle blob,
    // tall trees in the heart and smaller ones toward the edge, then a fringe of shrubs.
    let n=0;
    for(let gy=230;gy<1900;gy+=245)for(let gx=200+(gy/245%2)*120;gx<1900;gx+=260){
      const ax=gx+(rand()-.5)*80,ay=gy+(rand()-.5)*60;if(!ok({x:ax,y:ay},60)||roadDistance({x:ax,y:ay})<125)continue;
      const count=4+Math.floor(rand()*4),spin=rand()*6.28;let placed=0,reach=0;
      for(let i=0;i<count*2&&placed<count;i++){const r=i?36*Math.sqrt(i):0,a=spin+i*2.39996;
        const x=ax+Math.cos(a)*r*1.25,y=ay+Math.sin(a)*r*.75,w=(m.ground==='ember'?78-placed*6:118-placed*9)*(.9+rand()*.2);
        if(tree(x,y,Math.max(m.ground==='ember'?44:68,w),n++)){placed++;reach=Math.max(reach,r);}}
      if(!placed)continue;
      for(let i=0;i<5+placed;i++){const a=rand()*6.28,r=reach+34+rand()*26;shrub(ax+Math.cos(a)*r*1.25,ay+Math.sin(a)*r*.75,n++);}
    }
    // Wildflowers fringe the road verges at an even pace, alternating sides.
    let side=1;for(const route of FIELD_ROADS)for(let i=1;i<route.length;i++){const a=route[i-1],b=route[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dy=(b[1]-a[1])/len;
      for(let d=60;d<len-40;d+=96){side=-side;const off=82+rand()*14;shrub(a[0]+dx*d-dy*off*side,a[1]+dy*d+dx*off*side,n++);}}
    world.buildings.splice(0,world.buildings.length,...out,...keep);
  }
  const change=world.switchScene;world.switchScene=function(...args){const result=change.apply(this,args);
    // 35r-overworld lays out fields per zone (fieldLayoutV2); only legacy layouts are regrouped here.
    try{if(String(world.state.scene).startsWith('field-')&&!world.fieldLayoutV2)arrangeField(world.state.scene);}catch(e){}
    cache.delete(world.state.scene);return result;};
  world.arrangeField=arrangeField;

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
  // Soft ground patch that seats a grove: moss on stone, scorch on ash, frost on snow.
  function patch(ctx,d){ctx.save();ctx.translate(d.x,d.y);ctx.scale(1,.5);
    const gr=ctx.createRadialGradient(0,0,0,0,0,d.r);gr.addColorStop(0,'rgba('+d.rgb+',.34)');gr.addColorStop(.55,'rgba('+d.rgb+',.18)');gr.addColorStop(1,'rgba('+d.rgb+',0)');
    ctx.fillStyle=gr;ctx.beginPath();ctx.arc(0,0,d.r,0,6.283);ctx.fill();
    // Contact occlusion right under the focal prop.
    const oc=ctx.createRadialGradient(0,0,0,0,0,d.r*.42);oc.addColorStop(0,'rgba(12,22,18,.30)');oc.addColorStop(1,'rgba(12,22,18,0)');
    ctx.fillStyle=oc;ctx.beginPath();ctx.arc(0,0,d.r*.42,0,6.283);ctx.fill();ctx.restore();}
  // Processional path: a line of carved stepping slabs in pale marble with gilt rims, aligned to the iso grid.
  function path(ctx,d){const len=Math.hypot((d.x1-d.x0),(d.y1-d.y0)*2),n=Math.max(2,Math.round(len/38));
    ctx.save();ctx.lineJoin='round';
    for(let i=0;i<=n;i++){const k=i/n,x=d.x0+(d.x1-d.x0)*k,y=d.y0+(d.y1-d.y0)*k,w=15,h=7.5,fade=.55+.45*Math.sin(Math.PI*(.15+.7*k));
      ctx.beginPath();ctx.moveTo(x,y-h);ctx.lineTo(x+w,y);ctx.lineTo(x,y+h);ctx.lineTo(x-w,y);ctx.closePath();
      ctx.fillStyle='rgba(60,70,62,'+.22*fade+')';ctx.save();ctx.translate(0,1.4);ctx.fill();ctx.restore();
      ctx.fillStyle='rgba(244,236,206,'+.78*fade+')';ctx.fill();
      ctx.lineWidth=1;ctx.strokeStyle='rgba(186,146,72,'+.85*fade+')';ctx.stroke();
      ctx.beginPath();ctx.moveTo(x,y-h*.45);ctx.lineTo(x+w*.45,y);ctx.lineTo(x,y+h*.45);ctx.lineTo(x-w*.45,y);ctx.closePath();
      ctx.strokeStyle='rgba(186,146,72,'+.5*fade+')';ctx.lineWidth=.7;ctx.stroke();}
    ctx.restore();}
  const ground=world.drawGroundDetails;
  world.drawGroundDetails=function(ctx,cx,cy,vw,vh){ground.call(this,ctx,cx,cy,vw,vh);const c=current();if(!c)return;const t=time();
    for(const d of c.decals)if(d.path&&onScreen({x:(d.x0+d.x1)/2,y:(d.y0+d.y1)/2},cx,cy,vw,vh,500))path(ctx,d);
    for(const d of c.decals)if(d.patch&&onScreen(d,cx,cy,vw,vh,d.r))patch(ctx,d);
    for(const d of c.decals){if(d.path||d.patch||!onScreen({x:d.x,y:d.y},cx,cy,vw,vh,d.r||d.w||200))continue;
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
