/* Huyết Trì Ma Quật: 2-4 player party raid. The leader opens it at the red gate
   in Thiên Vân Thành; members are prompted to enter. Rendering reuses the shared
   expedition arena; this module adds the gate, prompts, slam telegraphs and status. */
(function(){
 const world=worldMap,d=world.dialog,ui=visualUI,exp=expeditionsGame;
 const GATE=(a=>a?{x:a[0],y:a[1]}:{x:1000,y:1480})(window.sceneAnchors?.hub?.raidGate);
 const RULE={id:'raid',name:'Huyết Trì Ma Quật',level:20,theme:'worldboss',species:['DungNham','TrauQuy','Soi','RongXuong'],boss:'RongXuong',color:'#ff7a6b',direction:'Nam',dropRate:0,portal:GATE};
 const state={data:null,view:null,busy:false,lastPoll:0,announced:''};
 exp.maps.set('raid',RULE);
 world.sectMaps.raid={...RULE,description:'Phó bản tổ đội 2–4 người',spawn:{x:1000,y:1380}};
 world.mapThemes.themes.raid={...world.mapThemes.themes['rift-void'],name:RULE.name};
 if(world.atmosphere?.profiles)world.atmosphere.profiles.raid={...world.atmosphere.profiles['rift-void']};
 const inRaid=()=>world.state.scene==='raid';
 const myRun=()=>state.data?.run;

 // ---------- HUD
 const prompt=document.createElement('button');prompt.id='raid-prompt';prompt.type='button';prompt.hidden=true;prompt.onclick=()=>enter();document.body.append(prompt);
 const status=document.createElement('aside');status.id='raid-status';status.hidden=true;document.body.append(status);
 const hudButton=document.createElement('button');hudButton.id='raid-button';hudButton.type='button';hudButton.textContent='Ma Quật';hudButton.onclick=()=>{if(!paused())open();};
 ($('hud-more-menu')||$('bt')).append(hudButton);
 const duelIcon=$('duel-button');if(duelIcon){hudButton.classList.add('hud-icon');hudButton.dataset.hudLabel='Ma Quật';hudButton.style.setProperty('--hud-icon',duelIcon.style.getPropertyValue('--hud-icon'));}

 async function poll(force=false){if(state.busy||!P.ap||!account.state.ready||account.state.restoring)return;if(!force&&performance.now()-state.lastPoll<4000)return;state.lastPoll=performance.now();
  try{state.data=await account.api('/api/raid');}catch{return;}
  const run=myRun();
  if(inRaid()&&!run){msg('Ma Quật đã đóng.');world.switchScene('hub');}
  if(run&&run.status!=='cleared'&&!inRaid()&&state.announced!==run.token){state.announced=run.token;msg('⚔ Tổ đội đã mở '+RULE.name+'! Bấm "Vào Ma Quật" để tham chiến.');}
  renderHud();if(d.isOpen()&&$('world-title').textContent===RULE.name)open(true);}

 function renderHud(){const run=myRun();prompt.hidden=!(run&&run.status==='active'&&!inRaid()&&world.state.scene==='hub'&&P.ap);if(!prompt.hidden)prompt.textContent='⚔ Vào '+RULE.name+' · còn '+Math.ceil(run.expiresIn/60)+' phút';
  const v=state.view;status.hidden=!inRaid();if(!inRaid())return;
  status.textContent=v?.cleared?'✦ Đã phá Ma Quật · rương gửi vào hộp thư':v?.phase===2?(v.enraged?'Giai đoạn 2 · Ma Long cuồng nộ!':'Giai đoạn 2 · Huyết Trì Ma Long'):'Giai đoạn 1 · Hạ toàn bộ ma vệ';
  status.classList.toggle('enraged',!!v?.enraged);}

 async function call(action){if(state.busy)return;state.busy=true;try{state.data=await account.api('/api/raid',{action});if(action==='start')msg('Đã mở '+RULE.name+'. Cả đội hãy vào cổng!');if(action==='queue')msg('🔎 Đang tìm đội cho Ma Quật…');}catch(e){msg(e.message);}finally{state.busy=false;renderHud();open(true);}}
 function enter(){const run=myRun();if(!run||run.status!=='active')return msg('Ma Quật chưa mở.');if(world.state.scene!=='hub')return msg('Về Thiên Vân Thành rồi vào cổng Ma Quật.');world.switchScene('raid');}

 function open(silent=false){if(!P.ap)return;if(!silent||!d.isOpen())d.show(RULE.name,'Phó bản tổ đội 2–4 người · cấp '+RULE.level+'+');else if($('world-title').textContent!==RULE.name)return;
  const content=$('world-content');content.replaceChildren();
  const {body}=ui.panel('Huyết Trì Ma Long',creatureArt.thumbnail?.(RULE.boss)||null,content);
  ui.chips([['Tổ đội','2–4'],['Cấp',RULE.level+'+'],['Lượt thưởng/ngày',(state.data?.clearsToday??0)+'/3'],['Thời gian','15 phút'],['Mảnh Pháp Bảo','5+']],body);
  ui.details('Giai đoạn 1: hạ 8 ma vệ. Giai đoạn 2: Huyết Trì Ma Long đập đất — vòng đỏ hiện trước 1,8 giây, chạy ra ngoài hoặc lướt để né. Dưới 50% máu Ma Long cuồng nộ, gọi 4 Huyết Lang. Hạ Ma Long: mỗi thành viên có mặt nhận rương (Linh Thạch, Linh Nguyên, mảnh linh khí, đá cường hóa, 35% trang bị).',body,'Cơ chế');
  const x=state.data;if(!x){content.append(ui.node('p','world-line','Đang tải…'));poll(true);return;}
  const run=x.run;
  if(run){content.append(ui.node('p','world-line',(run.status==='cleared'?'Đã chinh phục. ':'Đang mở · còn '+Math.ceil(run.expiresIn/60)+' phút. ')+'Thành viên: '+run.members.map(m=>m.name).join(', ')));
   if(run.status==='active'&&!inRaid())d.action('Vào Ma Quật',enter,world.state.scene!=='hub');
   if(x.leader&&run.status==='active')d.action('Đóng Ma Quật',()=>call('abandon'));}
  else if(!x.party){content.append(ui.node('p','world-line',x.queued?'Đang tìm đội… '+x.queueSize+' người đang chờ. Đủ 4 người hoặc 2–3 người chờ 20 giây sẽ tự lập đội và mở Ma Quật.':'Chưa có tổ đội? Bấm Tìm đội để hệ thống ghép 2–4 người cấp 20+ đang ở Thiên Vân Thành.'));
   if(x.queued)d.action('Hủy tìm đội',()=>call('unqueue'));else d.action('🔎 Tìm đội tự động',()=>call('queue'),world.state.scene!=='hub');}
  else if(!x.leader)content.append(ui.node('p','world-line','Chờ đội trưởng mở Ma Quật. Cả đội cần online trong Thiên Vân Thành, cấp '+RULE.level+'+.'));
  else d.action('Mở Ma Quật cho cả đội',()=>call('start'),world.state.scene!=='hub');
  if(inRaid())d.action('Rời Ma Quật',()=>{d.close();world.switchScene('hub');});
 }

 // ---------- scene glue
 const change=world.switchScene;world.switchScene=function(id,initial=false){
  if(id==='raid'&&!(myRun()&&myRun().status==='active')&&!initial){msg('Ma Quật chưa mở cho tổ đội của bạn.');return;}
  if(id==='raid'&&initial&&!myRun())return change('hub',true);
  const result=change(id,initial);
  if(inRaid()){for(const s of RULE.species)creatureArt.ensureSpecies(s);world.services[0].name='Rời Ma Quật';}
  if(world.state.scene==='hub'&&!world.services.some(s=>s.id==='raid-gate'))world.services.push({id:'raid-gate',name:RULE.name,x:GATE.x,y:GATE.y+10,color:RULE.color});
  state.view=null;renderHud();return result;};
 if(world.state.scene==='hub'&&!world.services.some(s=>s.id==='raid-gate'))world.services.push({id:'raid-gate',name:RULE.name,x:GATE.x,y:GATE.y+10,color:RULE.color});
 const service=world.handleService;world.handleService=function(id){if(id==='raid-gate'){open();poll(true);return true;}return service(id);};
 const actors=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){actors(items,cx,cy,vw,vh);if(world.state.scene!=='hub')return;
  items.push([GATE.y,()=>{world.sprite(g,'portal',GATE.x,GATE.y,52);g.save();g.globalCompositeOperation='lighter';
   const glow=g.createRadialGradient(GATE.x,GATE.y-26,2,GATE.x,GATE.y-26,34);glow.addColorStop(0,'rgba(255,90,70,.55)');glow.addColorStop(1,'rgba(255,40,40,0)');g.fillStyle=glow;g.fillRect(GATE.x-36,GATE.y-62,72,72);
   g.fillStyle='#ff8a6a';for(let n=0;n<7;n++){const t=(tm*.35+n*.15)%1;g.globalAlpha=Math.sin(t*Math.PI)*.7;g.fillRect(GATE.x+Math.sin(n*2.1+tm)*16,GATE.y-t*50,1.2,2.2);}g.restore();}]);};
 // Slam telegraphs on the ground (under actors); ellipse matches the server test (dy*1.6).
 // Slam telegraphs sit on the ground layer, above any floor art.
 const details=world.drawGroundDetails;world.drawGroundDetails=function(ctx,cx,cy,vw,vh){details.call(this,ctx,cx,cy,vw,vh);if(!inRaid()||!state.view)return;
  g.save();for(const s of state.view.slams){const age=(performance.now()-state.view.at)/1000,remain=Math.max(0,s.remain-age),p=1-remain/s.total;
   g.globalAlpha=.25+.25*Math.sin(tm*14);g.fillStyle='#ff3b2a';g.beginPath();g.ellipse(s.x,s.y,s.r,s.r/1.6,0,0,Math.PI*2);g.fill();
   g.globalAlpha=.55;g.beginPath();g.ellipse(s.x,s.y,s.r*p,s.r*p/1.6,0,0,Math.PI*2);g.fill();
   g.globalAlpha=.9;g.lineWidth=2;g.strokeStyle='#ffb08a';g.beginPath();g.ellipse(s.x,s.y,s.r,s.r/1.6,0,0,Math.PI*2);g.stroke();}
  g.restore();};
 function receive(data){if(!inRaid())return;const before=state.view;state.view=data.raid?{...data.raid,at:performance.now()}:null;
  if(state.view?.cleared&&!before?.cleared){msg('✦ Chiến thắng Huyết Trì Ma Long! Rương đã gửi vào hộp thư (Đội / Tông môn).');window.communityGame?.refresh?.();}
  if(state.view?.enraged&&!before?.enraged)msg('Ma Long cuồng nộ! Huyết Lang xuất hiện.');renderHud();}

 const update=up;up=function(dt){const r=update(dt);poll();return r;};
 const css=document.createElement('style');css.textContent=`
#raid-prompt{position:fixed;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:5;max-width:calc(100vw - 32px);padding:10px 18px;border-radius:12px;border:1px solid #ff9a7a;background:linear-gradient(90deg,#5a1410f0,#7a2a14f0);color:#fff0e0;font:700 13px Arial;box-shadow:0 0 18px #ff5a3a66;cursor:pointer}
#raid-status{position:fixed;top:96px;left:50%;transform:translateX(-50%);z-index:4;max-width:calc(100vw - 32px);padding:5px 12px;border-radius:999px;border:1px solid #ff9a7a88;background:#2a1414e6;color:#ffd9c8;font:600 12px Arial;pointer-events:none;white-space:nowrap}
#raid-status.enraged{border-color:#ff5a3a;color:#fff;box-shadow:0 0 14px #ff3a2a88}
#raid-prompt[hidden],#raid-status[hidden]{display:none}
@media(prefers-reduced-motion:no-preference){#raid-prompt{animation:raid-pulse 1.4s ease-in-out infinite}@keyframes raid-pulse{50%{box-shadow:0 0 28px #ff5a3aaa}}}`;
 document.head.append(css);
 window.raidGame={state,open,poll,receive,enter,RULE};
})();
