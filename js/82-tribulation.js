/* Độ Thiên Kiếp: breaking through to a new realm (tầng 10 → danh vị mới) now calls down a
   heavenly tribulation. Three waves of lightning strike telegraphed circles around the
   cultivator, then one great bolt; walk out of the circles to survive. Each Hộ Kiếp Phù
   (guild shop) absorbs one strike. Success completes the breakthrough; failure keeps the
   pills and Linh Thạch but costs 15% of current đạo hạnh and a 2-minute rest.
   The original breakthrough rules (js/21) still decide whether the attempt is allowed:
   they run once as a dry run, the result is held back until the tribulation is passed. */
(function(){
 'use strict';
 const world=worldMap;
 const WAVES=[{count:5,every:.95,r:46,hit:.18},{count:8,every:.72,r:52,hit:.22},{count:11,every:.55,r:58,hit:.26}];
 const FINAL={r:95,warn:1.8,hit:.55},WARN=1.15,REST=120000,PENALTY=.15;
 let T=null;   // running tribulation
 const FIELDS=['r','stage','gold','xp','hp','mp'],WFIELDS=['breakthroughPills','thangViDan'];
 const snap=()=>({p:Object.fromEntries(FIELDS.map(k=>[k,P[k]])),w:Object.fromEntries(WFIELDS.map(k=>[k,P.world?.[k]]))});
 const put=s=>{for(const k of FIELDS)P[k]=s.p[k];for(const k of WFIELDS)if(P.world)P.world[k]=s.w[k];};
 const realm=()=>(window.R?.[P.r]||R[P.r])+' '+(P.stage||1);

 const original=brk;
 brk=function(){
  if(T)return;
  if((P.stage||1)!==10||window.gmTest?.enabled)return original();
  const rest=(P.world?.tribRestUntil||0)-Date.now();
  if(rest>0)return msg('Kinh mạch còn tổn thương sau thiên kiếp · thử lại sau '+Math.ceil(rest/1000)+' giây.');
  const before=snap(),said=[],realMsg=msg;msg=t=>said.push(t);
  try{original();}finally{msg=realMsg;}
  if(P.r===before.p.r){for(const t of said)msg(t);return;}     // requirements not met: show why
  const after=snap();put(before);start(before,after);
 };

 // ---------- encounter
 function start(before,after){
  autoCombat?.toggle?.(false);P.med=0;P.hp=mhp();world.dialog.close?.();
  T={before,after,wave:-1,clock:0,next:2.2,spawned:0,strikes:[],bolts:[],flash:0,charms:P.world.tribCharms||0,used:0,hits:0,done:false,intro:2.2};
  overlay.hidden=false;banner.hidden=false;resize();
  msg('⚡ Thiên kiếp giáng xuống! Né khỏi vòng sét · '+(T.charms?T.charms+' Hộ Kiếp Phù đỡ sét':'không có Hộ Kiếp Phù'));
 }
 function spawn(r,warn,hit,onPlayer){
  const a=Math.random()*Math.PI*2,d=onPlayer?Math.random()*12:40+Math.random()*130;
  T.strikes.push({x:P.x+Math.cos(a)*d,y:P.y+Math.sin(a)*d*.7,r,age:0,duration:warn,hit,label:'THIÊN LÔI'});
 }
 function strike(s){
  T.bolts.push({x:s.x,y:s.y,age:0,big:s.r>80,seed:Math.random()*1000});T.flash=Math.max(T.flash,s.r>80?.7:.35);
  if(Math.hypot(P.x-s.x,P.y-s.y)>s.r)return;
  if((P.world.tribCharms||0)>0){P.world.tribCharms--;T.used++;try{fx(P.x,P.y-60,'Hộ Kiếp Phù đỡ sét','#ffe7a3');}catch{}return;}
  const dmg=Math.round(mhp()*s.hit);P.hp-=dmg;T.hits++;try{fx(P.x,P.y-60,'-'+dmg,'#cfe0ff');}catch{}
  if(P.hp<=0){P.hp=1;finish(false);}
 }
 function step(dt){
  if(!T||T.done)return;T.clock+=dt;T.flash=Math.max(0,T.flash-dt*1.6);
  for(const b of T.bolts)b.age+=dt;T.bolts=T.bolts.filter(b=>b.age<.45);
  for(const s of T.strikes){s.age+=dt;if(!s.spent&&s.age>=s.duration){s.spent=true;strike(s);if(!T||T.done)return;}}
  T.strikes=T.strikes.filter(s=>!s.spent||s.age<s.duration+.35);
  if(T.clock<T.next)return;
  const w=WAVES[T.wave];
  if(w&&T.spawned<w.count){spawn(w.r,WARN,w.hit,T.spawned%2===0);T.spawned++;T.next=T.clock+w.every;return;}
  if(T.wave<WAVES.length-1){T.wave++;T.spawned=0;T.next=T.clock+(T.wave?2.2:0);if(T.wave)msg('⚡ Đợt '+(T.wave+1)+'/3 · sét dày hơn!');return;}
  if(T.wave===WAVES.length-1){T.wave++;spawn(FINAL.r,FINAL.warn,FINAL.hit,true);T.next=T.clock+FINAL.warn+1;msg('⚡ Cửu Thiên Lôi Kiếp! Chạy khỏi vòng lớn!');return;}
  if(!T.strikes.some(s=>!s.spent))finish(true);
 }
 function finish(ok){
  const run=T;run.done=true;
  setTimeout(()=>{if(T===run){T=null;overlay.hidden=true;banner.hidden=true;}},ok?900:600);
  if(ok){put(run.after);P.hp=mhp();P.mp=mmp();saveCharacter();msg('✦ Độ kiếp thành công · '+realm()+(run.used?' · dùng '+run.used+' Hộ Kiếp Phù':''));run.flash=1;run.gold=true;}
  else{const lost=Math.floor((P.xp||0)*PENALTY);P.xp=Math.max(0,(P.xp||0)-lost);P.hp=Math.max(1,Math.round(mhp()*.3));P.world.tribRestUntil=Date.now()+REST;saveCharacter();
   msg('✕ Độ kiếp thất bại · mất '+lost+' đạo hạnh, Đột Phá Đan và Linh Thạch được giữ lại. Nghỉ 2 phút rồi thử lại.');}
  if(typeof hud==='function')try{hud();}catch{}
 }

 // ---------- drawing: telegraphs on the ground, bolts and sky on an overlay
 const ground=world.drawGroundDetails;world.drawGroundDetails=function(ctx,...args){ground.call(this,ctx,...args);if(!T)return;
  for(const s of T.strikes){if(s.spent)continue;ctx.save();const p=Math.min(1,s.age/s.duration);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle='rgba(120,140,255,.16)';ctx.fill();ctx.strokeStyle='#b9c8ff';ctx.lineWidth=1.6;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
   ctx.beginPath();ctx.arc(s.x,s.y,s.r*p,0,Math.PI*2);ctx.fillStyle='rgba(210,220,255,.18)';ctx.fill();ctx.strokeStyle='#eef2ff';ctx.lineWidth=1.2;ctx.stroke();
   if(s.r>80){ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.strokeStyle='#101428';ctx.lineWidth=3;const l='CỬU THIÊN LÔI · '+Math.max(0,s.duration-s.age).toFixed(1)+'s';ctx.strokeText(l,s.x,s.y-s.r-7);ctx.fillStyle='#e8ecff';ctx.fillText(l,s.x,s.y-s.r-7);}ctx.restore();}};
 const overlay=document.createElement('canvas');overlay.id='tribulation-sky';overlay.hidden=true;document.body.append(overlay);const og=overlay.getContext('2d');
 const banner=document.createElement('aside');banner.id='tribulation-banner';banner.hidden=true;document.body.append(banner);
 function resize(){const dpr=Math.min(2,devicePixelRatio||1);overlay.width=innerWidth*dpr;overlay.height=innerHeight*dpr;og.setTransform(dpr,0,0,dpr,0,0);}addEventListener('resize',()=>{if(!overlay.hidden)resize();});
 function toScreen(x,y){const cam=gameCamera(),box=cv.getBoundingClientRect();return{x:box.left+(x-cam.x)*Z*box.width/W,y:box.top+(y-cam.y)*Z*box.height/H};}
 function bolt(x,y,big,seed,alpha){let s=seed;const rnd=()=>{s=(s*9301+49297)%233280;return s/233280;};const pts=[];let cx=x+(rnd()-.5)*120,cy=-20;const steps=14;
  for(let i=0;i<=steps;i++){const t=i/steps;pts.push([cx+(x-cx)*t+(i&&i<steps?(rnd()-.5)*(big?70:40):0),cy+(y-cy)*t]);}
  og.save();og.globalAlpha=alpha;og.lineJoin='round';
  for(const [w,c] of [[big?26:14,'rgba(120,150,255,.25)'],[big?10:6,'rgba(190,210,255,.7)'],[big?4:2.2,'#ffffff']]){og.strokeStyle=c;og.lineWidth=w;og.beginPath();pts.forEach(([a,b],i)=>i?og.lineTo(a,b):og.moveTo(a,b));og.stroke();}
  og.fillStyle='rgba(220,230,255,.5)';og.beginPath();og.ellipse(x,y,big?90:40,big?34:16,0,0,Math.PI*2);og.fill();og.restore();}
 function draw(){if(!T){return;}const w=innerWidth,h=innerHeight;og.clearRect(0,0,w,h);
  const g=og.createRadialGradient(w/2,h/2,Math.min(w,h)*.2,w/2,h/2,Math.max(w,h)*.75);g.addColorStop(0,T.gold?'rgba(60,45,10,.1)':'rgba(14,16,52,.28)');g.addColorStop(1,T.gold?'rgba(80,60,10,.4)':'rgba(6,8,30,.78)');og.fillStyle=g;og.fillRect(0,0,w,h);
  for(const b of T.bolts){const p=toScreen(b.x,b.y);bolt(p.x,p.y,b.big,b.seed,1-b.age/.45);}
  if(T.flash>0){og.fillStyle=T.gold?'rgba(255,230,160,'+T.flash*.5+')':'rgba(225,232,255,'+T.flash*.45+')';og.fillRect(0,0,w,h);}
  const wave=Math.min(3,Math.max(1,T.wave+1));banner.textContent='';const t=document.createElement('b');t.textContent=T.done?(T.gold?'Độ kiếp thành công':'Độ kiếp thất bại'):T.wave>=WAVES.length?'Cửu Thiên Lôi Kiếp':'Độ Thiên Kiếp · Đợt '+wave+'/3';
  const s=document.createElement('small');s.textContent='Khí huyết '+Math.max(0,Math.round(P.hp))+'/'+mhp()+' · Hộ Kiếp Phù '+(P.world.tribCharms||0)+' · Né khỏi vòng sét';banner.append(t,s);}
 const update=up;up=function(dt){const r=update(dt);if(T){step(dt);draw();}return r;};
 // No menus, auto-hunt or travel while the tribulation runs.
 const switchScene=world.switchScene;world.switchScene=function(...a){if(T&&!T.done)return msg('Đang độ kiếp, không thể rời đi.');return switchScene.apply(this,a);};

 const css=document.createElement('style');css.textContent=`
#tribulation-sky{position:fixed;inset:0;width:100vw;height:100vh;z-index:4;pointer-events:none}#tribulation-sky[hidden]{display:none}
#tribulation-banner{position:fixed;top:calc(64px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);z-index:6;display:grid;gap:2px;padding:8px 18px;border-radius:12px;background:#0b0f2ae6;border:1px solid #9fb2ff99;color:#e6ebff;text-align:center;font:13px Arial;pointer-events:none;box-shadow:0 0 24px #4a5cff55}
#tribulation-banner b{font-size:15px;color:#fff}#tribulation-banner small{color:#bcc6f2}#tribulation-banner[hidden]{display:none}`;document.head.append(css);
 window.tribulation={get active(){return !!T;},get strikes(){return T?T.strikes:[];}};
})();
