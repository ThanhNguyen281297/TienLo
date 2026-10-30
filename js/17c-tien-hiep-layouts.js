/* Tiên hiệp map layouts (data only). Every scene in the redesign is described here:
   terraces (floating platforms with cliff faces), water, bridges, stairs, paths, floor
   inlays, props and service positions. js/70-tien-hiep-world.js draws and walks them.

   Server-checked points stay where the server expects them:
   hub spawn (1000,1100) · hub Luyện Khí NPC within 110 of (1240,1210) · sect spawn
   (1000,1110) · sect master within 160 of (910,1125) · field spawn/safe (1000,1770) ·
   tower spawn (1000,1380) · rift safe (1000,1380). Everything else moved freely. */
(function(){
 const TAU=Math.PI*2;
 function rng(seed){let s=seed>>>0||1;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
 // Iso platform: a 2:1 diamond with flattened tips (cut = share of each half-axis).
 function oct(cx,cy,rx,ry,c=.22){return[[-c,-1+c],[c,-1+c],[1-c,-c],[1-c,c],[c,1-c],[-c,1-c],[-1+c,c],[-1+c,-c]].map(([x,y])=>[Math.round(cx+x*rx),Math.round(cy+y*ry)]);}
 // Organic island outline.
 function blob(cx,cy,rx,ry,seed,rough=.1,n=64){const r=rng(seed),waves=[2,3,4,5,7].map(k=>[k,r()*TAU,(r()*.7+.3)/k]);
  return Array.from({length:n},(_,i)=>{const a=i/n*TAU;let k=1;for(const [f,p,amp] of waves)k+=Math.sin(a*f+p)*amp*rough*2.2;return[Math.round(cx+Math.cos(a)*rx*k),Math.round(cy+Math.sin(a)*ry*k)];});}
 // Coastline through control points (closed Catmull-Rom), jittered.
 function coast(points,seed,jitter=18,step=40){const r=rng(seed),out=[];const n=points.length;
  for(let i=0;i<n;i++){const p0=points[(i-1+n)%n],p1=points[i],p2=points[(i+1)%n],p3=points[(i+2)%n],len=Math.hypot(p2[0]-p1[0],p2[1]-p1[1]),m=Math.max(2,Math.ceil(len/step));
   for(let k=0;k<m;k++){const t=k/m,t2=t*t,t3=t2*t,q=[0,1].map(j=>.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3));out.push([Math.round(q[0]+(r()-.5)*jitter),Math.round(q[1]+(r()-.5)*jitter*.6)]);}}
  return out;}
 // A river or road ribbon polygon around a centre line.
 function ribbon(line,width,seed=1){const r=rng(seed),left=[],right=[];
  for(let i=0;i<line.length;i++){const a=line[Math.max(0,i-1)],b=line[Math.min(line.length-1,i+1)],dx=b[0]-a[0],dy=b[1]-a[1],l=Math.hypot(dx,dy)||1,w=width/2*(.85+r()*.3);
   left.push([Math.round(line[i][0]-dy/l*w),Math.round(line[i][1]+dx/l*w)]);right.push([Math.round(line[i][0]+dy/l*w),Math.round(line[i][1]-dx/l*w)]);}
  return[...left,...right.reverse()];}
 function spline(points,step=30){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)],n=Math.max(2,Math.ceil(Math.hypot(p2[0]-p1[0],p2[1]-p1[1])/step));
  for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;out.push([0,1].map(j=>Math.round(.5*(2*p1[j]+(-p0[j]+p2[j])*t+(2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2+(-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3))));}}
  out.push(points[points.length-1]);return out;}
 const ring=(cx,cy,n,rx,ry,start=0)=>Array.from({length:n},(_,i)=>{const a=start+i/n*TAU;return[Math.round(cx+Math.cos(a)*rx),Math.round(cy+Math.sin(a)*ry)];});
 const T=id=>'theme-'+id;

 // ------------------------------------------------------------------ themes
 // sky: top→horizon; peaks: distant ranges back→front; sea: cloud sea; cliff: rock face top/mid.
 const themes={
  dawn:{sky:['#7fb4de','#cfe6f2','#fff1d8'],sun:{x:.72,y:.2,r:70,color:'#fff4cf'},peaks:['#9fbcd0','#83a7bf','#6c94ae'],sea:'#f4f7fb',seaShade:'#c8d9ea',haze:'#e8f2f8',
   cliff:['#d9d3c4','#9d998d','#5f6a6e'],moss:'#7fae58',light:'#ffe6a8'},
  jadeDay:{sky:['#6ea9cf','#bfe2ea','#eef8f1'],sun:{x:.25,y:.18,r:60,color:'#fffbe2'},peaks:['#9cc3c6','#7fb0b3','#5e9599'],sea:'#f1f8f6',seaShade:'#bfdcd8',haze:'#e2f3ef',
   cliff:['#d4d6c8','#93a197','#56676a'],moss:'#6fa956',light:'#e6fff2'},
  moonNight:{sky:['#141c45','#3b3f7a','#8a7fb4'],moon:{x:.7,y:.22,r:46,color:'#f4f2ff'},stars:true,peaks:['#4a4f86','#3a3f74','#2c315f'],sea:'#bcb8e6',seaShade:'#7f7ab8',haze:'#9d97cc',
   cliff:['#c7c6dc','#8584a8','#454a72'],moss:'#7d9a8a',light:'#e9e4ff',water:['#24467e','#6c9bd0']},
  storm:{sky:['#1d2141','#3c3f6e','#7a76a8'],stars:false,lightning:true,peaks:['#4b4d7a','#3b3d68','#2b2d52'],sea:'#a9a7cc',seaShade:'#6e6c9a',haze:'#8c89b5',
   cliff:['#a8a9bd','#6d6f88','#383b55'],moss:'#6b8a7c',light:'#d6d8ff'},
  verdant:{sky:['#5f9fc8','#b5dfe0','#f1f6dd'],sun:{x:.3,y:.18,r:66,color:'#fffbe0'},peaks:['#a4c8b4','#86b29a','#6a9a80'],sea:'#f3f8f2',seaShade:'#c7e0cf',haze:'#e8f5ea',
   cliff:['#d8d2bb','#a09a80','#68715d'],moss:'#78b04e',light:'#fff4c8'},
  twilight:{sky:['#2a1f4d','#6a4a86','#e0a2a6'],sun:{x:.5,y:.72,r:90,color:'#ffc9a8'},peaks:['#5b4880','#47396b','#352c55'],sea:'#e7c6d4',seaShade:'#a184aa',haze:'#c6a7c2',
   cliff:['#cbbfd4','#8c7fa0','#4a4064'],moss:'#7f9a86',light:'#ffd9c2'},
  spring:{sky:['#77b7e3','#c6e6f2','#fbf6df'],sun:{x:.78,y:.16,r:64,color:'#fffbe0'},peaks:['#a5c7cf','#8ab4b8','#6f9ea0'],sea:'#f6fafb',seaShade:'#cfe2e8',haze:'#eef6f6',
   cliff:['#dcd5bf','#a59d83','#6b6f5c'],moss:'#7cb54c',light:'#fff3c6'},
  bamboo:{sky:['#5d9ab3','#acd3cb','#e9f2dc'],sun:{x:.2,y:.2,r:58,color:'#f9ffe6'},peaks:['#8fb9a3','#6f9f86','#53846c'],sea:'#eef6ee',seaShade:'#b9d5c3',haze:'#dcede0',
   cliff:['#cdcbb1','#8f9479','#57634e'],moss:'#5d9a45',light:'#f2ffd2'},
  marsh:{sky:['#5a7f99','#a6c1c4','#e4e9da'],sun:{x:.6,y:.24,r:70,color:'#f6f6e4'},peaks:['#8aa3a4','#6f8c8c','#577474'],sea:'#e3ebe7',seaShade:'#a9bdb8',haze:'#d4e1dc',
   cliff:['#c4c3ad','#868b77','#505b52'],moss:'#5f8f4e',light:'#eef5d8',water:['#2f6f6e','#7fb5a8']},
  frost:{sky:['#7ea6cf','#cfe2f0','#f6fbff'],sun:{x:.3,y:.2,r:62,color:'#ffffff'},peaks:['#c3d5e6','#a6bfd6','#89a7c3'],sea:'#fbfdff',seaShade:'#d8e6f2',haze:'#eef5fb',
   cliff:['#eef3f8','#a9bdd0','#6a819a'],moss:'#d9e8f2',light:'#ffffff'},
  ember:{sky:['#2a1414','#6b2a1d','#e0743a'],sun:{x:.6,y:.62,r:110,color:'#ffb069'},peaks:['#5a2a22','#43201c','#2f1715'],sea:'#e39563',seaShade:'#9a4a33',haze:'#c66a44',
   cliff:['#8a5a4a','#4e3029','#2a1a17'],moss:'#8a4a2a',light:'#ffb070',lava:true},
  abyss:{sky:['#0d0a1c','#2a1a46','#5b3b7a'],stars:true,peaks:['#2f2350','#251c42','#1a1433'],sea:'#6a4f93',seaShade:'#3a2a5c',haze:'#4b3a72',
   cliff:['#6b5d86','#3f3558','#1e1930'],moss:'#5b4c84',light:'#d2b8ff',void:true}
 };

 // ------------------------------------------------------------------ materials
 // Each surface: base colour, lattice/blade colours. Built into seamless tiles by the engine.
 const materials={
  jade:{kind:'paving',base:'#ece6d6',line:'#cdbf9f',tint:.05,gold:'#d8b45c'},
  jadeCool:{kind:'paving',base:'#e2e7e2',line:'#b8c4bb',tint:.05,gold:'#c9b26a'},
  jadeGreen:{kind:'paving',base:'#d8e6d4',line:'#a9c2a6',tint:.06,gold:'#cfb15e'},
  jadeNight:{kind:'paving',base:'#d4d3e8',line:'#a8a6c8',tint:.05,gold:'#c8b880'},
  slate:{kind:'paving',base:'#8d90a8',line:'#62657e',tint:.08,gold:'#a99fd8'},
  amethyst:{kind:'paving',base:'#c9bcd8',line:'#9a88b2',tint:.06,gold:'#e2c58a'},
  stone:{kind:'cobble',base:'#c9c2b0',line:'#9c947f',tint:.08},
  grass:{kind:'grass',base:'#7fae4f',blades:['#93c25a','#6f9d43','#a6cf6a','#5f8d3a']},
  meadow:{kind:'grass',base:'#86b552',blades:['#9ccb5e','#76a646','#b1d973','#669a3c'],flowers:['#ffffff','#ffd1e0','#fff09a']},
  bamboo:{kind:'grass',base:'#5f8f45',blades:['#71a352','#557f3c','#86b65e','#4a7234']},
  grassDark:{kind:'grass',base:'#5f8f3f',blades:['#6e9f48','#557f36','#7fae55','#4a7230']},
  flowers:{kind:'grass',base:'#8ab853',blades:['#9ccb5e','#7aaa48','#b1d973'],flowers:['#ffffff','#ffc6dc','#fff09a','#d6b3ff','#ffffff','#ffd1e0']},
  snowBlue:{kind:'snow',base:'#dde9f4',shade:'#b5c9dd',spark:'#ffffff'},
  ashRed:{kind:'ash',base:'#5a3a2e',shade:'#3a2420',spark:'#ffb04a'},
  voidDeep:{kind:'ash',base:'#2c2342',shade:'#1a1530',spark:'#9d7bff'},
  marsh:{kind:'grass',base:'#5e7f4f',blades:['#6f9159','#536f45','#7f9f62','#465f3c'],wet:'#5d7f78'},
  moss:{kind:'grass',base:'#6f9358',blades:['#80a565','#5f824c','#91b673','#557445']},
  snow:{kind:'snow',base:'#eef4fa',shade:'#c9d8e6',spark:'#ffffff'},
  ash:{kind:'ash',base:'#4a3a35',shade:'#2e2422',spark:'#ff8a3a'},
  void:{kind:'ash',base:'#3a2f52',shade:'#241d38',spark:'#c79bff'},
  dirt:{kind:'dirt',base:'#c9ad82',shade:'#a8895f'},
  sand:{kind:'dirt',base:'#dccaa0',shade:'#bba67c'},
  wood:{kind:'wood',base:'#a0703f',line:'#6e4a28'}
 };

 // ------------------------------------------------------------------ hub
 const hub={
  theme:'dawn',bounds:[80,430,1920,1830],
  terraces:[
   {id:'plaza',pts:oct(1000,1130,380,250,.22),mat:'jade',h:120,rail:true,trim:true,falls:[700,1300]},
   {id:'palace',pts:oct(1000,770,410,170,.2),mat:'jade',h:64,z:1,rail:true,trim:true,stairs:[{x:1000,w:120}]},
   {id:'market',pts:oct(410,1150,250,175,.24),mat:'stone',h:110,rail:true},
   {id:'garden',pts:blob(1600,1150,235,165,11,.07,48),mat:'grass',h:110,falls:[1560]},
   {id:'travel',pts:oct(1000,1565,340,185,.22),mat:'jade',h:130,rail:true,trim:true,falls:[820,1180]},
   {id:'spire',pts:oct(1560,780,215,135,.24),mat:'jadeCool',h:140,rail:true,trim:true}
  ],
  islets:[ // decorative floating rocks (not walkable)
   {pts:blob(260,700,110,60,3,.12,28),mat:'grass',h:150,props:[[T('14-035'),250,690,90]]},
   {pts:blob(1810,1460,90,50,4,.12,24),mat:'grass',h:130,props:[['sakura',1810,1450,80]]},
   {pts:blob(360,1560,70,40,5,.14,22),mat:'grass',h:110,props:[[T('14-026'),360,1580,90]]},
   {pts:blob(1740,560,60,34,6,.14,20),mat:'grass',h:120,props:[['pineTree',1740,555,70]]}
  ],
  bridges:[{a:[590,1140],b:[716,1135],w:48,mat:'jade'},{a:[1284,1135],b:[1388,1140],w:48,mat:'jade'},
   {a:[1000,1312],b:[1000,1430],w:72,mat:'jade'},{a:[1190,1010],b:[1452,838],w:40,mat:'jade'}],
  paths:[],
  inlays:[{x:1000,y:1120,r:96,kind:'compass'},{x:1000,y:1565,r:84,kind:'portal'},{x:1545,y:815,r:50,kind:'octagram'},{x:410,y:1170,r:46,kind:'lotus'}],
  water:[{pts:blob(1650,1200,70,34,21,.08,24),lotus:6}],
  props:[
   ['palace',1000,735,360,[150,40]],['school',730,800,170,[60,22]],['board',1265,795,100,[30,10]],
   ['guardianLion',925,985,44,[14,8]],['guardianLion',1075,985,44,[14,8]],
   ['hubWell',1000,1265,120,[44,18]],
   ['forge',1170,1245,170,[56,20]],['sakura',760,1040,60,[9,6]],[T('14-069'),770,1240,90,[26,12]],
   ['hubBazaar',400,1075,240,[90,30]],['stall',300,1245,90,[26,12]],['stall',520,1255,80,[24,12]],
   ['garden',1625,1095,210,[70,26]],['tower',1575,735,180,[52,20]],
   ['crystalPillar',870,1500,26,[7,4]],['crystalPillar',1130,1500,26,[7,4]],
   ['gate',1000,1715,190,null],
   ['sakura',680,1000,70,[10,6]],['whiteBlossom',1320,1000,64,[10,6]],['pineTree',640,1260,70,[10,6]],['sakura',1360,1270,62,[10,6]],
   ['sakura',230,1110,70,[10,6]],['pineTree',560,1035,60,[10,6]],['whiteBlossom',1740,1120,70,[10,6]],['sakura',1480,1065,60,[10,6]],
   [T('14-012'),640,1560,26,[6,4]],[T('14-012'),1360,1560,26,[6,4]],
   ['lantern',770,1030,22,[4,3]],['lantern',1230,1030,22,[4,3]],['lantern',760,1270,22,[4,3]],['lantern',1240,1270,22,[4,3]],
   ['lantern',880,880,20,[4,3]],['lantern',1120,880,20,[4,3]],['lantern',935,1430,20,[4,3]],['lantern',1065,1430,20,[4,3]]
  ],
  services:{quest:[1000,855],skills:[790,860],rank:[1215,850],shop:[470,1210],auction:[330,1215],stable:[1560,1225],
   forge:[1235,1215],teleport:[1000,1565],tower:[1500,840],'rift-wood':[815,1530],'rift-tide':[885,1640],'rift-fire':[1115,1640],'rift-void':[1185,1530],'raid-gate':[1000,1700]},
  anchors:{stable:[1560,1215],auction:[330,1205],raidGate:[1000,1690],rifts:{'rift-wood':[815,1520],'rift-tide':[885,1630],'rift-fire':[1115,1630],'rift-void':[1185,1520]}}
 };

 // ------------------------------------------------------------------ sects
 function sect(o){const court=oct(1000,1125,350,215,.22);
  return{theme:o.theme,bounds:[180,420,1820,1720],
   terraces:[{id:'court',pts:court,mat:o.mat,h:120,rail:true,trim:o.trim!==false,falls:o.falls||[760,1240]},
    {id:'hall',pts:oct(1000,795,350,160,.2),mat:o.mat,h:60,z:1,rail:true,trim:o.trim!==false,stairs:[{x:1000,w:110}]},
    {id:'west',pts:o.west||blob(440,1140,205,150,o.seed,.08,48),mat:o.westMat||'grass',h:120,falls:[400]},
    {id:'east',pts:o.east||oct(1490,1130,200,140,.25),mat:o.eastMat||o.mat,h:120,rail:o.eastRail!==false},
    {id:'south',pts:oct(1000,1470,170,100,.26),mat:o.mat,h:110,rail:true}],
   islets:o.islets||[],water:o.water||[],paths:o.paths||[],
   bridges:[{a:[700,1130],b:[668,1132],w:46,mat:o.bridge||'jade',bend:true},{a:[1336,1130],b:[1310,1130],w:46,mat:o.bridge||'jade',bend:true},{a:[1000,1282],b:[1000,1408],w:60,mat:o.bridge||'jade'}],
   inlays:[{x:1000,y:1130,r:110,kind:o.inlay},...(o.inlays||[])],
   props:[[o.hall,1000,760,o.hallW||330,[130,36]],...o.props],
   services:{mentor:[910,1135],sectSkills:[1090,1135],teleport:[1000,1470],board:[1150,1215]}};}
 const sword=sect({theme:'jadeDay',mat:'jadeCool',seed:31,inlay:'sword',hall:'palace',
  props:[['statue',925,990,40,[12,7]],['statue',1075,990,40,[12,7]],['arena',1490,1135,250,null],
   ['pineTree',470,1080,90,[12,7]],['pineTree',590,1210,74,[10,6]],[T('11-028'),430,1190,40,[8,5]],[T('11-029'),620,1080,40,[8,5]],
   [T('11-016'),1000,1475,70,[16,8]],['lantern',830,1040,22,[4,3]],['lantern',1170,1040,22,[4,3]],['lantern',830,1215,22,[4,3]],['lantern',1170,1215,22,[4,3]],
   ['pineTree',1340,880,70,[10,6]],['tree',660,880,70,[10,6]]],
  islets:[{pts:blob(330,820,90,50,41,.12,24),mat:'grass',h:220,props:[[T('14-004'),330,840,80]]},{pts:blob(1690,820,80,44,42,.12,24),mat:'grass',h:180,props:[['pineTree',1690,815,70]]},
   {pts:blob(1700,1480,70,40,43,.12,22),mat:'grass',h:160,props:[[T('14-007'),1700,1500,90]]}],
  monument:{x:440,y:1150,h:170}});
 const moon=sect({theme:'moonNight',mat:'jadeNight',seed:32,inlay:'moon',hall:'garden',hallW:300,westMat:'moss',eastMat:'moss',eastRail:false,
  east:blob(1550,1130,215,150,33,.08,44),
  water:[{pts:blob(1000,1025,150,48,34,.06,32),lotus:9,moon:true},{pts:blob(520,1160,95,48,35,.1,24),lotus:6},{pts:blob(1500,1150,90,45,36,.1,24),lotus:6}],
  props:[[T('12-002'),1500,1090,150,[50,22]],['whiteBlossom',460,1080,80,[11,7]],['whiteBlossom',610,1230,64,[10,6]],['sakura',1400,1230,64,[10,6]],
   [T('12-023'),830,1030,30,[6,4]],[T('12-023'),1170,1030,30,[6,4]],[T('12-022'),1000,1480,46,[10,5]],[T('12-029'),830,1215,28,[6,4]],[T('12-029'),1170,1215,28,[6,4]],
   [T('12-016'),520,1090,60,null],['whiteBlossom',700,860,66,[10,6]],['whiteBlossom',1300,860,66,[10,6]]],
  islets:[{pts:blob(330,830,90,50,44,.12,24),mat:'moss',h:200,props:[[T('12-011'),330,850,90]]},{pts:blob(1700,820,90,48,45,.12,24),mat:'moss',h:180,props:[[T('12-019'),1700,840,80]]},
   {pts:blob(1650,1500,70,40,46,.12,22),mat:'moss',h:150,props:[[T('12-026'),1650,1520,80]]}]});
 const thunder=sect({theme:'storm',mat:'slate',seed:51,inlay:'thunder',hall:'thunderHall',hallW:340,westMat:'moss',eastMat:'slate',trim:false,bridge:'stone',
  west:blob(440,1140,205,150,52,.12,44),
  props:[['thunderAltar',1490,1110,110,[32,16]],['crystalPillar',830,1040,30,[8,5]],['crystalPillar',1170,1040,30,[8,5]],['crystalPillar',830,1215,26,[7,4]],['crystalPillar',1170,1215,26,[7,4]],
   [T('10-015'),470,1100,70,[16,8]],[T('10-058'),600,1220,64,[16,8]],[T('10-059'),440,1210,58,[14,7]],[T('10-016'),1000,1480,46,[12,6]],
   [T('10-009'),1350,900,40,[8,5]],[T('10-009'),650,900,40,[8,5]]],
  islets:[{pts:blob(330,830,90,50,53,.14,24),mat:'slate',h:240,props:[[T('10-032'),330,850,80]]},{pts:blob(1690,830,90,50,54,.14,24),mat:'slate',h:200,props:[['cloudRock',1690,850,120]]},
   {pts:blob(1680,1500,70,40,55,.14,22),mat:'slate',h:160,props:[[T('10-021'),1680,1520,70]]}]});
 const mystic=sect({theme:'verdant',mat:'jadeGreen',seed:61,inlay:'bagua',hall:'mysticHall',hallW:300,westMat:'grass',eastMat:'grass',eastRail:false,
  east:blob(1550,1130,215,150,62,.08,44),
  water:[{pts:blob(1520,1180,80,40,63,.1,24),lotus:6}],
  props:[['mysticArchive',520,1090,210,[76,26]],['mysticGarden',1480,1085,200,[70,24]],['sakura',640,1230,66,[10,6]],['sakura',1380,1240,60,[10,6]],
   ['mysticDais',1000,1480,60,[16,8]],[T('14-018'),830,1040,26,[6,4]],[T('14-018'),1170,1040,26,[6,4]],[T('14-022'),830,1215,24,[6,4]],[T('14-022'),1170,1215,24,[6,4]],
   ['sakura',700,860,64,[10,6]],['sakura',1300,860,64,[10,6]]],
  islets:[{pts:blob(330,830,90,50,64,.12,24),mat:'grass',h:200,props:[[T('14-009'),330,850,90]]},{pts:blob(1700,820,90,48,65,.12,24),mat:'grass',h:180,props:[[T('14-034'),1700,850,80]]},
   {pts:blob(1650,1500,70,40,66,.12,22),mat:'grass',h:150,props:[[T('14-026'),1650,1520,80]]}]});
 // Extra dressing: banners, planters, lamps and incense along the axes.
 const ringAt=(cx,cy,n,rx,ry,key,w,start=0)=>ring(cx,cy,n,rx,ry,start).map(([x,y])=>[key,x,y,w,[5,3]]);
 hub.props.push(
  [T('14-013'),900,985,26,[4,3]],[T('14-013'),1100,985,26,[4,3]],[T('14-013'),880,1300,26,[4,3]],[T('14-013'),1120,1300,26,[4,3]],
  ...ringAt(1000,1125,8,150,92,T('14-056'),24,Math.PI/8),
  [T('14-012'),700,1110,24,[5,3]],[T('14-012'),1300,1110,24,[5,3]],[T('14-022'),845,1000,22,[4,3]],[T('14-022'),1155,1000,22,[4,3]],
  [T('11-016'),1000,795,46,[12,6]],['pineTree',700,760,70,[10,6]],['pineTree',1300,760,70,[10,6]],[T('14-055'),860,880,24,null],[T('14-055'),1140,880,24,null],
  [T('14-024'),320,1040,26,[4,3]],[T('14-024'),510,1040,26,[4,3]],['stall',430,1290,80,[24,12]],[T('14-055'),250,1180,24,null],[T('14-056'),560,1200,24,null],
  ['sakura',1700,1220,70,[10,6]],[T('14-036'),1490,1240,60,[9,6]],[T('14-055'),1660,1270,24,null],[T('14-060'),1540,1120,18,null],[T('14-060'),1620,1180,18,null],
  [T('14-018'),760,1560,24,[5,3]],[T('14-018'),1240,1560,24,[5,3]],[T('14-022'),920,1480,22,[4,3]],[T('14-022'),1080,1480,22,[4,3]],
  [T('14-012'),1450,780,22,[5,3]],[T('14-012'),1680,790,22,[5,3]],[T('14-055'),1590,870,22,null]);
 const sectDress={sword:[T('11-026'),T('14-013'),'#81dbc7'],moon:[T('12-023'),T('12-029'),'#c7eeff'],thunder:[T('10-009'),T('10-016'),'#beacff'],mystic:[T('14-018'),T('14-016'),'#e9dc9b']};
 for(const [id,sc] of Object.entries({sword,moon,thunder,mystic})){const [lamp,banner]=sectDress[id];
  sc.props.push([banner,880,1000,26,[4,3]],[banner,1120,1000,26,[4,3]],[lamp,720,1125,24,[5,3]],[lamp,1280,1125,24,[5,3]],...ringAt(1000,1130,6,170,104,id==='thunder'?T('10-052'):id==='moon'?T('12-021'):T('14-056'),22,Math.PI/6),
   [lamp,880,860,22,[5,3]],[lamp,1120,860,22,[5,3]],[T('14-055'),760,820,24,null],[T('14-055'),1240,820,24,null],[lamp,920,1470,20,[4,3]],[lamp,1080,1470,20,[4,3]]);}
 // Side islands sit apart from the court so a bridge spans a real gap (props move with them).
 for(const [sc,east] of [[sword,0],[moon,60],[thunder,0],[mystic,60]]){
  const side=(x,y)=>y>950&&y<1340?(x<720?-80:x>1300?east:0):0;
  for(const p of sc.props){const dx=side(p[1],p[2]);p[1]+=dx;}
  for(const w of sc.water){const cx=w.pts.reduce((a,q)=>a+q[0],0)/w.pts.length,cy=w.pts.reduce((a,q)=>a+q[1],0)/w.pts.length,dx=side(cx,cy);if(dx)w.pts=w.pts.map(([x,y])=>[x+dx,y]);}
  sc.bridges[0].a=[560,1132];sc.bridges[0].b=[800,1130];sc.bridges[1].a=[1200,1130];sc.bridges[1].b=[1470,1130];}

 // ------------------------------------------------------------------ tower
 const tower={theme:'twilight',bounds:[300,520,1700,1700],
  terraces:[{id:'arena',pts:oct(1000,1110,480,300,.2),mat:'amethyst',h:150,rail:true,trim:true,falls:[700,1300]},
   {id:'landing',pts:oct(1000,1410,150,85,.3),mat:'amethyst',h:120,rail:true}],
  islets:[{pts:blob(420,800,80,44,71,.12,22),mat:'slate',h:200,props:[[T('10-021'),420,820,70]]},{pts:blob(1580,800,80,44,72,.12,22),mat:'slate',h:200,props:[[T('10-021'),1580,820,70]]},
   {pts:blob(470,1450,70,40,73,.12,22),mat:'slate',h:160,props:[[T('10-020'),470,1470,80]]},{pts:blob(1530,1450,70,40,74,.12,22),mat:'slate',h:160,props:[[T('10-020'),1530,1470,80]]}],
  bridges:[],water:[],paths:[],
  inlays:[{x:1000,y:1110,r:200,kind:'octagram'},{x:1000,y:1110,r:120,kind:'compass'}],
  props:[['crystalPillar',640,1110,36,[9,5]],['crystalPillar',1360,1110,36,[9,5]],['crystalPillar',1000,870,36,[9,5]],['crystalPillar',800,960,30,[8,5]],['crystalPillar',1200,960,30,[8,5]],
   ['crystalPillar',800,1260,30,[8,5]],['crystalPillar',1200,1260,30,[8,5]],['portal',1000,1440,70,null]],
  services:{}};


 // ------------------------------------------------------------------ hunting fields (2000 x 2000)
 // Shared rules: spawn outpost in the south (1000,1770), return portal (1000,1825), previous
 // zone (900,1830), route keeper (1100,1760) and the gate north (1000,140). Six camps each.
 const FIELD_SERVICES={'field-home':[1000,1825],'field-road':[1100,1760],'field-next':[1000,140],'field-prev':[900,1830]};
 function field(o){const land=coast(o.coast,o.seed,22,44),main=spline(o.road,26);
  const branches=o.camps.map((c,i)=>{const near=main.reduce((b,q)=>Math.abs(q[1]-c[1])<Math.abs(b[1]-c[1])?q:b),side=c[0]<near[0]?1:-1,end=[c[0]+side*120,c[1]+12];
   return{pts:spline([near,[(near[0]+end[0])/2,(near[1]+end[1])/2+(i%2?40:-30)],end],24),w:o.branchW||34,mat:o.roadMat||'dirt'};});
  const rivers=(o.rivers||[]).map((r,i)=>({pts:ribbon(spline(r.line,30),r.w,o.seed+i),lotus:r.lotus||0,ice:r.ice,color:r.color,light:r.light}));
  const lakes=(o.lakes||[]).map((l,i)=>({pts:blob(l.x,l.y,l.rx,l.ry,o.seed*7+i,.1,36),lotus:l.lotus||0,ice:l.ice,color:l.color,light:l.light}));
  const holes=(o.holes||[]).map((h,i)=>({pts:ribbon(spline(h.line,30),h.w,o.seed*3+i),h:h.h||260}));
  const mesas=(o.mesas||[]).map((m,i)=>({pts:blob(m.x,m.y,m.rx,m.ry,o.seed*11+i,.12,30),mat:m.mat||o.mesaMat||'moss',h:m.h||70,z:1,walk:false}));
  const pads=[{pts:oct(1000,1790,190,92,.24),mat:o.padMat||'jade'},{pts:oct(1000,160,120,60,.26),mat:o.padMat||'jade'}];
  return{theme:o.theme,bounds:[40,40,1960,1960],seed:o.seed,spawn:[1000,1770],camps:o.camps,
   terraces:[{id:'land',pts:land,mat:o.mat,h:o.cliff||200,falls:o.falls||[]},...mesas],
   islets:(o.islets||[]).map((s,i)=>({pts:blob(s[0],s[1],s[2],s[2]*.55,o.seed*13+i,.14,22),mat:o.mat,h:s[2]*1.6,props:s[3]?[[s[3],s[0],s[1]+s[2]*.15,s[2]*.9]]:[]})),
   water:[...rivers,...lakes],holes,pads,
   paths:[{pts:main,w:o.roadW||48,mat:o.roadMat||'dirt'},...branches],
   bridges:o.bridges||[],
   clearings:o.camps.map(c=>({x:c[0],y:c[1],rx:200,ry:140,mat:o.campMat||'dirt'})),
   inlays:[{x:1000,y:1790,r:70,kind:'portal'},{x:1000,y:160,r:52,kind:'portal'}],
   props:[[o.kit.tower,860,1700,58,[12,7]],[o.kit.tower,1140,1700,58,[12,7]],[o.kit.banner,920,1660,24,[4,3]],[o.kit.banner,1080,1660,24,[4,3]],
    ['portal',1000,1845,42,null],['portal',1000,128,46,null],['lantern',930,1760,22,[4,3]],['lantern',1070,1760,22,[4,3]],['lantern',920,175,20,[4,3]],['lantern',1080,175,20,[4,3]],
    ...o.camps.map((c,i)=>[o.kit.landmark[i%o.kit.landmark.length],c[0]+(c[0]<1000?-160:160),c[1]-110,90,[18,9]]),
    ...o.camps.flatMap((c,i)=>Array.from({length:9},(_,k)=>{const a=(k/9)*TAU+(c[0]<1000?.55:-.55)+Math.PI*(c[0]<1000?0:1);return[o.kit.rock[(k+i)%o.kit.rock.length],Math.round(c[0]+Math.cos(a)*215),Math.round(c[1]+Math.sin(a)*150),34,[9,5]];}).filter((_,k)=>k!==0&&k!==8)),
    ...(o.props||[])],
   scatter:o.scatter,patchMats:o.patchMats,services:FIELD_SERVICES};}
 const KIT={
  meadow:{tower:T('14-010'),banner:T('14-024'),landmark:[T('14-047'),T('14-069'),T('14-033'),T('14-070'),T('14-047'),T('14-012')],rock:[T('14-052'),T('14-053'),T('14-054')]},
  bamboo:{tower:T('14-010'),banner:T('14-022'),landmark:[T('14-025'),T('14-047'),T('14-070'),T('14-033'),T('14-025'),T('14-047')],rock:[T('14-052'),T('14-053'),T('14-054')]},
  marsh:{tower:T('12-023'),banner:T('14-024'),landmark:[T('12-009'),T('12-015'),T('12-024'),T('12-028'),T('12-009'),T('12-015')],rock:[T('14-052'),T('14-053')]},
  frost:{tower:T('10-016'),banner:T('14-033'),landmark:[T('10-015'),T('10-058'),T('10-059'),T('10-025'),T('10-015'),T('10-058')],rock:[T('10-033'),T('10-027'),T('10-067')]},
  ember:{tower:T('15-013'),banner:T('15-014'),landmark:[T('15-018'),T('15-035'),T('15-034'),T('15-053'),T('15-018'),T('15-035')],rock:[T('15-032'),T('15-051'),T('15-010')]},
  abyss:{tower:T('11-026'),banner:T('11-046'),landmark:[T('11-010'),T('11-030'),T('11-015'),T('11-057'),T('11-010'),T('11-030')],rock:[T('11-049'),T('11-073'),T('11-058')]}
 };
 const COAST_A=[[1000,70],[1400,110],[1760,250],[1900,560],[1870,940],[1920,1300],[1800,1640],[1480,1820],[1150,1910],[850,1910],[520,1800],[200,1640],[80,1300],[130,940],[90,560],[260,240],[620,100]];
 const COAST_B=[[1000,70],[1300,90],[1650,200],[1880,450],[1930,800],[1820,1150],[1900,1450],[1700,1720],[1350,1860],[1080,1915],[800,1905],[480,1820],[220,1600],[100,1300],[160,1000],[70,700],[180,350],[500,130]];
 const COAST_C=[[1000,60],[1350,140],[1700,300],[1880,620],[1900,1000],[1860,1380],[1700,1680],[1400,1850],[1100,1915],[860,1915],[560,1840],[280,1660],[110,1360],[90,980],[130,620],[300,300],[640,130]];
 const meadow=field({theme:'spring',mat:'meadow',seed:101,patchMats:['flowers','grassDark','grass'],kit:KIT.meadow,coast:COAST_A,
  camps:[[440,1320],[1520,1320],[420,880],[1530,880],[520,380],[1460,380]],
  road:[[1000,1760],[1000,1600],[960,1400],[1010,1150],[1060,900],[1000,730],[1000,600],[980,420],[1010,260],[1000,165]],
  rivers:[{line:[[40,640],[380,700],[700,610],[1000,665],[1300,600],[1640,680],[1960,620]],w:84,lotus:10}],
  lakes:[{x:760,y:1110,rx:110,ry:55,lotus:8},{x:1290,y:1520,rx:90,ry:45,lotus:6}],
  bridges:[{a:[1000,728],b:[1000,598],w:62,mat:'wood'},{a:[530,730],b:[530,598],w:50,mat:'wood'},{a:[1470,716],b:[1470,586],w:50,mat:'wood'}],
  mesas:[{x:230,y:1080,rx:100,ry:60,h:70},{x:1760,y:1110,rx:90,ry:55,h:60},{x:760,y:1620,rx:80,ry:45,h:50}],
  props:[['sakura',230,1060,90],['pineTree',1760,1095,80],['whiteBlossom',760,1610,70]],
  islets:[[140,1850,70,T('14-026')],[1860,1820,60,'sakura'],[1880,140,60,T('14-003')],[110,160,70,'pineTree']],
  scatter:[{keys:['pineTree','whiteBlossom','sakura',T('14-035'),T('14-036'),T('14-038')],groves:42,per:5,size:[70,104],solid:[10,6],gap:38},
   {keys:[T('14-055'),T('14-056'),T('14-060'),T('14-061'),T('14-057'),'th:stones'],loose:260,size:[16,26],gap:18,road:8},{keys:['th:reeds'],shore:40,size:[26,36]}]});
 const bamboo=field({theme:'bamboo',mat:'bamboo',seed:202,patchMats:['moss','grassDark'],kit:KIT.bamboo,coast:COAST_B,roadMat:'stone',
  camps:[[480,1390],[1480,1360],[420,760],[1160,860],[650,330],[1450,340]],
  road:[[1000,1760],[1030,1550],[980,1300],[1000,1100],[960,880],[1010,620],[990,400],[1000,165]],
  holes:[{line:[[20,1020],[350,1070],[600,1000],[780,1050]],w:96},{line:[[1980,620],[1650,600],[1420,670],[1220,620]],w:86}],
  lakes:[{x:1360,y:1110,rx:100,ry:45,lotus:4},{x:640,y:1560,rx:80,ry:40,lotus:4}],
  bridges:[{a:[470,1110],b:[480,960],w:50,mat:'wood'},{a:[1520,690],b:[1520,550],w:50,mat:'wood'}],
  mesas:[{x:220,y:1300,rx:90,ry:55,h:80},{x:1760,y:1050,rx:100,ry:60,h:80}],
  props:[['th:bamboo#2',220,1290,90],['th:bamboo#3',1760,1040,100]],
  islets:[[150,1820,70,'th:bamboo#1'],[1880,1700,60,T('14-028')],[1850,200,60,'th:bamboo#4']],
  scatter:[{keys:['th:bamboo#1','th:bamboo#2','th:bamboo#3','th:bamboo#4','th:bamboo#5'],groves:70,per:7,spread:22,size:[62,92],solid:[8,5],gap:24},
   {keys:[T('14-045'),'pineTree',T('14-063')],groves:10,per:3,size:[60,90],solid:[10,6]},
   {keys:[T('14-057'),T('14-058'),'th:stones',T('14-062')],loose:220,size:[16,26],gap:18,road:8},{keys:['th:reeds'],shore:24,size:[24,34]}]});
 const marsh=field({theme:'marsh',mat:'marsh',seed:303,patchMats:['moss','grassDark','marsh'],kit:KIT.marsh,coast:COAST_C,roadMat:'stone',
  camps:[[400,1360],[1600,1350],[300,820],[1650,780],[560,300],[1430,280]],
  road:[[1000,1760],[1000,1560],[880,1350],[850,1180],[920,980],[1010,800],[1030,640],[1020,450],[1000,165]],
  lakes:[{x:700,y:1520,rx:150,ry:62,lotus:8},{x:1300,y:1560,rx:140,ry:60,lotus:8},{x:1100,y:1180,rx:120,ry:55,lotus:6},{x:420,y:1080,rx:150,ry:62,lotus:8},
   {x:1580,y:1060,rx:150,ry:66,lotus:8},{x:770,y:640,rx:150,ry:64,lotus:8},{x:1280,y:600,rx:140,ry:60,lotus:6},{x:300,y:520,rx:100,ry:45,lotus:4},{x:1720,y:460,rx:110,ry:48,lotus:4}],
  bridges:[{a:[270,1080],b:[570,1080],w:36,mat:'wood',arch:6},{a:[1160,1560],b:[1440,1560],w:36,mat:'wood',arch:6},{a:[1430,1060],b:[1730,1060],w:36,mat:'wood',arch:6}],
  props:[],
  islets:[[160,1800,70,'tree'],[1860,1760,70,T('12-019')],[1850,220,60,'tree2']],
  scatter:[{keys:['tree','tree2','whiteBlossom',T('14-038')],groves:30,per:4,size:[66,96],solid:[10,6],gap:40},
   {keys:['th:reeds'],shore:260,size:[24,40]},{keys:[T('14-057'),T('14-061'),'th:stones',T('12-021')],loose:200,size:[16,26],gap:18,road:8}]});
 const frost=field({theme:'frost',mat:'snow',seed:404,patchMats:['snowBlue','snowBlue','stone'],kit:KIT.frost,coast:COAST_A,roadMat:'stone',padMat:'jadeCool',campMat:'stone',mesaMat:'snow',
  camps:[[450,1330],[1550,1300],[380,860],[1600,840],[600,380],[1400,350]],
  road:[[1000,1760],[1000,1580],[1040,1350],[1000,1050],[960,800],[1000,560],[1010,380],[1000,165]],
  lakes:[{x:1000,y:1060,rx:230,ry:100,ice:true},{x:700,y:610,rx:130,ry:54,ice:true},{x:1350,y:1580,rx:110,ry:48,ice:true}],
  mesas:[{x:220,y:1150,rx:110,ry:65,h:110},{x:1780,y:1120,rx:100,ry:60,h:100},{x:1250,y:620,rx:90,ry:50,h:90},{x:700,y:1600,rx:80,ry:45,h:70}],
  props:[[T('10-058'),220,1140,70],[T('10-059'),1780,1110,64],[T('10-015'),1250,610,60]],
  islets:[[140,1840,70,T('10-020')],[1860,1820,60,T('10-019')],[1880,150,60,T('10-018')],[110,170,70,T('10-031')]],
  scatter:[{keys:['tint:snow:pineTree','tint:snow:tree','tint:snow:pineTree',T('10-015')],groves:40,per:5,size:[66,100],solid:[10,6],gap:38},
   {keys:[T('10-033'),T('10-027'),'th:stones','th:stones',T('10-067')],loose:140,size:[18,30],gap:26,road:8},{keys:[T('10-058'),T('10-059')],groves:6,per:2,size:[44,60],solid:[12,6]}]});
 const ember=field({theme:'ember',mat:'ash',seed:505,patchMats:['ashRed','stone','ashRed'],kit:KIT.ember,coast:COAST_C,roadMat:'stone',padMat:'slate',campMat:'stone',mesaMat:'ash',cliff:220,
  camps:[[450,1380],[1550,1380],[430,820],[1560,820],[560,320],[1440,320]],
  road:[[1000,1760],[990,1500],[1010,1250],[1000,1100],[980,850],[1000,560],[1010,400],[1000,165]],
  rivers:[{line:[[30,1080],[500,1130],[900,1060],[1300,1120],[1970,1060]],w:72},{line:[[30,560],[600,520],[1100,590],[1500,530],[1970,580]],w:62}],
  bridges:[{a:[1000,1170],b:[1000,1030],w:60,mat:'stone'},{a:[1000,630],b:[1000,500],w:60,mat:'stone'},{a:[450,1185],b:[450,1060],w:48,mat:'stone'},{a:[1550,1165],b:[1550,1040],w:48,mat:'stone'},
   {a:[460,600],b:[460,475],w:48,mat:'stone'},{a:[1560,610],b:[1560,485],w:48,mat:'stone'}],
  mesas:[{x:220,y:1500,rx:100,ry:60,h:90},{x:1780,y:1480,rx:100,ry:60,h:90},{x:760,y:820,rx:70,ry:40,h:70},{x:1250,y:300,rx:80,ry:45,h:70}],
  props:[[T('15-030'),220,1490,70],[T('15-039'),1780,1470,64]],
  islets:[[160,1820,70,T('15-041')],[1860,1800,60,T('15-040')],[1880,160,60,T('15-028')]],
  scatter:[{keys:[T('15-046'),T('15-047'),T('15-039'),'tint:ember:tree2',T('15-002')],groves:30,per:4,size:[60,90],solid:[10,6],gap:42},
   {keys:[T('15-032'),T('15-051'),T('15-010'),T('15-048'),T('15-045')],loose:200,size:[20,34],gap:22,road:8}]});
 const abyss=field({theme:'abyss',mat:'void',seed:606,patchMats:['voidDeep','amethyst','voidDeep'],kit:KIT.abyss,coast:COAST_B,roadMat:'stone',padMat:'amethyst',campMat:'stone',mesaMat:'void',cliff:240,
  camps:[[430,1420],[1560,1420],[420,860],[1580,860],[560,330],[1440,330]],
  road:[[1000,1760],[1000,1500],[1000,1180],[990,900],[1010,600],[1000,165]],
  holes:[{line:[[10,1150],[400,1180],[800,1110],[1200,1190],[1600,1120],[1990,1160]],w:110,h:300},{line:[[10,600],[500,640],[900,560],[1300,640],[1990,590]],w:100,h:300}],
  bridges:[{a:[1000,1255],b:[1000,1080],w:56,mat:'jade'},{a:[1010,690],b:[1010,520],w:56,mat:'jade'},{a:[460,1260],b:[460,1090],w:46,mat:'jade'},{a:[1560,1215],b:[1560,1045],w:46,mat:'jade'},
   {a:[500,725],b:[500,555],w:46,mat:'jade'},{a:[1560,690],b:[1560,515],w:46,mat:'jade'}],
  mesas:[{x:240,y:1650,rx:90,ry:55,h:90},{x:1760,y:1640,rx:90,ry:55,h:90}],
  props:[[T('11-016'),240,1640,70],[T('11-010'),1760,1630,80]],
  islets:[[160,1850,70,T('11-041')],[1860,1860,60,T('11-037')],[1880,180,60,T('11-062')],[100,180,60,T('11-050')]],
  scatter:[{keys:['tint:void:'+T('11-017'),'tint:void:'+T('11-051'),'tint:void:'+T('11-020'),T('11-028'),'tint:void:whiteBlossom'],groves:30,per:4,size:[40,80],solid:[9,5],gap:40},
   {keys:[T('11-049'),T('11-073'),T('11-058'),'tint:void:'+T('11-069'),'tint:void:'+T('11-070')],loose:200,size:[16,30],gap:22,road:8}]});

 // ------------------------------------------------------------------ rifts (Tứ Phương Bí Cảnh)
 // Server: mob groups at (730,1035) (1270,1035) (825,1210) (1175,1210), boss (1000,850), safe exit (1000,1380).
 function rift(o){const land=blob(1000,1110,690,390,o.seed,.06,72);
  return{theme:o.theme,bounds:[220,560,1780,1680],seed:o.seed,spawn:[1000,1380],camps:[[730,1035],[1270,1035],[825,1210],[1175,1210],[1000,850]],
   terraces:[{id:'land',pts:land,mat:o.mat,h:200,falls:o.falls||[]},{id:'dais',pts:oct(1000,830,230,120,.24),mat:o.daisMat,h:60,z:1,rail:true,trim:true,stairs:[{x:1000,w:100}]}],
   islets:o.islets||[],water:(o.lakes||[]).map((l,i)=>({pts:blob(l.x,l.y,l.rx,l.ry,o.seed*5+i,.1,30),lotus:l.lotus||0,ice:l.ice})),holes:[],
   pads:[{pts:oct(1000,1395,120,62,.26),mat:o.daisMat}],paths:[{pts:spline([[1000,1380],[1000,1250],[1000,1100],[1000,960]],26),w:40,mat:o.roadMat||'stone'}],bridges:[],
   clearings:[[730,1035],[1270,1035],[825,1210],[1175,1210]].map(c=>({x:c[0],y:c[1],rx:150,ry:100,mat:o.campMat||'dirt'})),
   inlays:[{x:1000,y:830,r:90,kind:o.inlay||'octagram',z:1},{x:1000,y:1395,r:50,kind:'portal'}],
   props:[['portal',1000,1430,46,null],...o.props],scatter:o.scatter,services:{'expedition-exit':[1000,1395]}};}
 const riftWood=rift({theme:'verdant',mat:'grass',daisMat:'jadeGreen',seed:701,campMat:'dirt',
  props:[[T('14-047'),560,980,90,[18,9]],[T('14-069'),1450,980,100,[20,10]],['pineTree',820,800,80,[10,6]],['pineTree',1180,800,80,[10,6]]],
  islets:[{pts:blob(340,760,80,44,711,.12,22),mat:'grass',h:150,props:[[T('14-026'),340,780,80]]},{pts:blob(1660,760,80,44,712,.12,22),mat:'grass',h:150,props:[['sakura',1660,755,80]]}],
  scatter:[{keys:['pineTree','sakura',T('14-035'),T('14-036')],groves:16,per:4,size:[66,96],solid:[10,6]},{keys:[T('14-055'),T('14-056'),T('14-060'),'th:stones'],loose:90,size:[16,24],road:8}]});
 const riftTide=rift({theme:'jadeDay',mat:'moss',daisMat:'jadeCool',seed:702,campMat:'sand',inlay:'lotus',
  lakes:[{x:1000,y:1060,rx:90,ry:40,lotus:6},{x:500,y:1180,rx:90,ry:45,lotus:5},{x:1500,y:1180,rx:90,ry:45,lotus:5}],
  props:[[T('12-002'),560,960,130,[40,18]],[T('12-014'),1450,960,90,[20,10]],['whiteBlossom',820,800,74,[10,6]],['whiteBlossom',1180,800,74,[10,6]]],
  islets:[{pts:blob(340,760,80,44,721,.12,22),mat:'moss',h:150,props:[[T('12-018'),340,780,80]]},{pts:blob(1660,760,80,44,722,.12,22),mat:'moss',h:150,props:[[T('12-027'),1660,780,90]]}],
  scatter:[{keys:['whiteBlossom','tree',T('14-038')],groves:12,per:4,size:[66,90],solid:[10,6]},{keys:['th:reeds'],shore:50,size:[24,36]},{keys:[T('12-021'),T('14-061'),'th:stones'],loose:70,size:[16,26],road:8}]});
 const riftFire=rift({theme:'ember',mat:'ash',daisMat:'slate',seed:703,campMat:'stone',inlay:'thunder',
  lakes:[{x:520,y:1250,rx:80,ry:36},{x:1480,y:1250,rx:80,ry:36}],
  props:[[T('15-017'),560,960,120,[36,16]],[T('15-018'),1450,960,90,[20,10]],[T('15-013'),820,800,40,[8,5]],[T('15-013'),1180,800,40,[8,5]]],
  islets:[{pts:blob(340,760,80,44,731,.12,22),mat:'ash',h:150,props:[[T('15-030'),340,780,70]]},{pts:blob(1660,760,80,44,732,.12,22),mat:'ash',h:150,props:[[T('15-039'),1660,780,70]]}],
  scatter:[{keys:[T('15-046'),T('15-047'),'tint:ember:tree2'],groves:12,per:3,size:[56,84],solid:[10,6]},{keys:[T('15-032'),T('15-051'),T('15-010'),T('15-048')],loose:80,size:[18,32],road:8}]});
 const riftVoid=rift({theme:'abyss',mat:'void',daisMat:'amethyst',seed:704,campMat:'stone',inlay:'moon',
  props:[[T('11-012'),560,960,120,[36,16]],[T('11-016'),1450,960,90,[20,10]],[T('11-026'),820,800,40,[8,5]],[T('11-026'),1180,800,40,[8,5]]],
  islets:[{pts:blob(340,760,80,44,741,.12,22),mat:'void',h:150,props:[[T('11-041'),340,780,70]]},{pts:blob(1660,760,80,44,742,.12,22),mat:'void',h:150,props:[[T('11-037'),1660,780,70]]}],
  scatter:[{keys:['tint:void:'+T('11-017'),'tint:void:'+T('11-051'),T('11-028')],groves:12,per:3,size:[40,72],solid:[9,5]},{keys:[T('11-049'),T('11-073'),T('11-058')],loose:80,size:[16,30],road:8}]});

 // ------------------------------------------------------------------ event arenas (art only:
 // their own modules keep walkability, cameras, telegraphs and actors)
 const ringAround=(cx,cy,n,rx,ry,key,w,solid=null)=>ring(cx,cy,n,rx,ry).map(([x,y])=>[key,x,y,w,solid]);
 const duel={theme:'dawn',skin:true,bounds:[200,560,1800,1640],
  terraces:[{id:'gallery',pts:ring(1000,1100,72,710,436),mat:'jade',h:160,rail:true,trim:true,falls:[760,1240]},{id:'dais',pts:ring(1000,1100,64,360,218),mat:'jadeCool',h:22,z:1,trim:true}],
  islets:[{pts:blob(300,760,90,50,801,.12,24),mat:'grass',h:180,props:[['sakura',300,750,80]]},{pts:blob(1700,760,90,50,802,.12,24),mat:'grass',h:180,props:[['pineTree',1700,750,80]]}],
  inlays:[{x:1000,y:1100,r:170,kind:'compass',z:1},{x:1000,y:1100,r:90,kind:'sword',z:1}],
  props:[...ringAround(1000,1100,12,680,414,T('14-013'),28),...ringAround(1000,1100,4,690,422,'lantern',24).map(p=>(p[1]+=30,p))]};
 const battle={theme:'verdant',skin:true,bounds:[140,520,1860,1680],
  terraces:[{id:'field',pts:ring(1000,1100,80,790,490),mat:'grass',h:200,falls:[700,1300]}],
  pads:[{pts:oct(430,1100,115,78,.24),mat:'jadeCool'},{pts:oct(1570,1100,115,78,.24),mat:'jade'},...[[1000,830],[1000,1100],[1000,1370]].map(([x,y])=>({pts:oct(x,y,95,64,.26),mat:'stone',trim:false}))],
  paths:[{pts:spline([[430,1100],[700,1060],[1000,1100],[1300,1140],[1570,1100]],26),w:46,mat:'stone'},{pts:spline([[1000,830],[970,960],[1000,1100],[1030,1240],[1000,1370]],26),w:40,mat:'stone'}],
  patchMats:['grassDark','flowers'],patchCount:18,seed:803,
  props:[...ringAround(1000,1100,16,760,468,'pineTree',70),[T('14-024'),360,1020,26],[T('14-024'),500,1020,26],[T('15-014'),1500,1020,26],[T('15-014'),1640,1020,26]]};
 const worldboss={theme:'ember',skin:true,bounds:[480,780,1520,1420],
  terraces:[{id:'altar',pts:oct(1000,1100,340,176,.02),mat:'slate',h:220,rail:true,falls:[1000]}],
  islets:[{pts:blob(560,860,70,40,804,.12,22),mat:'ash',h:200,props:[[T('15-030'),560,880,60]]},{pts:blob(1440,860,70,40,805,.12,22),mat:'ash',h:200,props:[[T('15-039'),1440,880,60]]}],
  inlays:[{x:1000,y:1100,r:150,kind:'octagram'},{x:1000,y:1100,r:80,kind:'thunder'}],
  props:[[T('15-013'),700,1100,36],[T('15-013'),1300,1100,36],[T('15-034'),1000,955,40],[T('15-022'),860,1030,26],[T('15-022'),1140,1030,26],[T('15-022'),860,1170,26],[T('15-022'),1140,1170,26]]};
 const raid={theme:'ember',skin:true,bounds:[300,700,1700,1500],
  terraces:[{id:'cavern',pts:blob(1000,1100,655,362,806,.03,80),mat:'ashRed',h:230,falls:[820,1180]}],
  islets:[{pts:blob(360,800,80,44,807,.12,22),mat:'ash',h:180,props:[[T('15-041'),360,820,70]]},{pts:blob(1640,800,80,44,808,.12,22),mat:'ash',h:180,props:[[T('15-040'),1640,820,70]]}],
  pads:[{pts:oct(1000,870,170,90,.24),mat:'slate'},{pts:oct(1000,1390,110,58,.26),mat:'slate'}],
  clearings:[[730,1035],[1270,1035],[825,1210],[1175,1210]].map(([x,y])=>({x,y,rx:140,ry:95,mat:'ash'})),
  inlays:[{x:1000,y:870,r:80,kind:'thunder'},{x:1000,y:1390,r:46,kind:'portal'}],
  patchMats:['ash','ashRed'],patchCount:14,seed:806,
  props:[[T('15-017'),1000,800,110],[T('15-013'),860,870,34],[T('15-013'),1140,870,34],...ringAround(1000,1100,10,600,330,T('15-022'),26)]};

 window.tienHiepLayouts={TAU,rng,oct,blob,coast,ribbon,spline,ring,themes,materials,scenes:{hub,sword,moon,thunder,mystic,tower,
  'field-meadow':meadow,'field-bamboo':bamboo,'field-marsh':marsh,'field-frost':frost,'field-ember':ember,'field-abyss':abyss,
  duel,battle,worldboss,raid,
  'rift-wood':riftWood,'rift-tide':riftTide,'rift-fire':riftFire,'rift-void':riftVoid}};
 window.sceneAnchors={hub:hub.anchors};
})();
