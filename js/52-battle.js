/* Chính – Tà Chi Chiến (client). Server owns HP, scores, banners and respawns.
   Enemy players become targets in E (pvpTarget) so the normal attack, skills and
   Auto work; their hits are sent as intents (duelAttacks) and never applied locally. */
(function(){
 const world=worldMap,d=world.dialog,ui=visualUI,exp=expeditionsGame;
 const RULE={id:'battle',name:'Chính – Tà Chiến Trường',level:15,theme:'arena',species:[],boss:null,color:'#e6c477',direction:'',dropRate:0,portal:{x:1000,y:1480}};
 const RX=760,RY=460;
 const state={snap:null,view:null,busy:false,lastPoll:0,shownResult:'',wasIn:false};
 exp.maps.set('battle',RULE);
 world.sectMaps.battle={...RULE,description:'Chiến trường phe 12:30 và 21:00',spawn:{x:1000,y:1100}};
 world.mapThemes.themes.battle={...(world.mapThemes.themes['rift-fire']||world.mapThemes.themes.sword),name:RULE.name};
 if(world.atmosphere?.profiles)world.atmosphere.profiles.battle={...(world.atmosphere.profiles['rift-fire']||{})};
 const inBattle=()=>world.state.scene==='battle';
 const me=()=>state.view?.me;
 const uid=()=>account.state.user?.id;

 // ---------- HUD
 const board=document.createElement('aside');board.id='battle-board';board.hidden=true;document.body.append(board);
 const feed=document.createElement('aside');feed.id='battle-feed';feed.hidden=true;document.body.append(feed);
 const deathCard=document.createElement('div');deathCard.id='battle-death';deathCard.hidden=true;document.body.append(deathCard);
 const prompt=document.createElement('button');prompt.id='battle-prompt';prompt.type='button';prompt.hidden=true;prompt.onclick=()=>join();document.body.append(prompt);
 // Activity icon beside the others.
 const strip=$('vl-activities');if(strip){const b=document.createElement('button');b.type='button';b.className='vl-activity';b.dataset.id='battle';b.setAttribute('aria-label','Chiến trường');
  const c=document.createElement('canvas');c.width=c.height=96;b.append(c,ui.node('i','',''),ui.node('span','','Chiến trường'));b.querySelector('i').hidden=true;b.onclick=()=>{if(!paused())open();};strip.append(b);
  const img=new Image();img.onload=()=>{const x=c.getContext('2d'),s=96,gr=x.createRadialGradient(s/2,s*.38,2,s/2,s/2,s/2);gr.addColorStop(0,'#5a2a1a');gr.addColorStop(1,'#140c0a');x.fillStyle=gr;x.beginPath();x.arc(s/2,s/2,s/2-2,0,7);x.fill();
   x.save();x.beginPath();x.arc(s/2,s/2,s/2-3,0,7);x.clip();x.drawImage(img,8,4,80,88);x.restore();x.font='900 30px Arial';x.textAlign='center';x.fillStyle='#ffe7a0';x.strokeStyle='#3a1206';x.lineWidth=4;x.strokeText('⚔',s/2,s*.68);x.fillText('⚔',s/2,s*.68);
   x.lineWidth=3;const rim=x.createLinearGradient(0,0,0,s);rim.addColorStop(0,'#ffe9a8');rim.addColorStop(.5,'#b8862e');rim.addColorStop(1,'#6e4a16');x.strokeStyle=rim;x.beginPath();x.arc(s/2,s/2,s/2-2,0,7);x.stroke();};
  img.src=artworkURL('Item/PhapTran/5.png');state.icon=b;}

 const fmt=s=>{s=Math.max(0,Math.round(s));if(s>=3600){const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h>=24?Math.floor(h/24)+' ngày '+(h%24)+' giờ':h+' giờ '+m+' phút';}return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
 const serverNow=()=>Date.now()/1000+(state.offset||0);

 async function poll(force=false){if(state.busy||!P.ap||!account.state.ready||account.state.restoring)return;if(!force&&performance.now()-state.lastPoll<(inBattle()?3000:8000))return;state.lastPoll=performance.now();
  try{state.snap=await account.api('/api/battle');state.offset=state.snap.now-Date.now()/1000;}catch{return;}
  const s=state.snap;
  if(inBattle()&&(!s.open||!s.joined))return finished();
  if(s.last&&state.wasIn&&state.shownResult!==s.last.id&&!inBattle()){state.shownResult=s.last.id;showResult(s.last);}
  renderPrompt();}
 function renderPrompt(){const s=state.snap;prompt.hidden=!(s?.open&&!s.joined&&world.state.scene==='hub'&&P.ap&&characterLevel()>=15);if(!prompt.hidden)prompt.textContent='⚔ Chính – Tà Chi Chiến đang mở · '+s.players+' người · Tham chiến';
  if(state.icon)state.icon.classList.toggle('live',!!s?.open);}

 async function join(){if(state.busy)return;if(world.state.scene!=='hub')return msg('Về Thiên Vân Thành để vào chiến trường.');state.busy=true;
  try{state.snap=await account.api('/api/battle',{action:'join'});state.wasIn=true;d.close();autoCombat.toggle(false);world.switchScene('battle');msg('⚔ Vào Chính – Tà Chiến Trường!');window.gameAudio?.play('level');}
  catch(e){msg(e.message);}finally{state.busy=false;}}
 async function gmOpen(){try{state.snap=await account.api('/api/battle',{action:'gm_open'});state.wasIn=true;d.close();world.switchScene('battle');}catch(e){msg(e.message);}}
 async function leave(){try{await account.api('/api/battle',{action:'leave'});}catch{}finished(true);}
 function finished(left=false){E=[];state.view=null;board.hidden=feed.hidden=deathCard.hidden=true;onlineWorld.state.duelAttacks=[];P.hp=mhp();P.mp=mmp();if(inBattle())world.switchScene('hub');saveCharacter();if(!left)setTimeout(()=>poll(true),1500);}

 function open(){if(!P.ap)return;const s=state.snap;d.show('Chính – Tà Chi Chiến','');const c=$('world-content');
  const {body}=ui.panel('Chiến trường phe',artworkURL('Item/PhapTran/5.png'),c);
  ui.chips([['Giờ mở',(s?.windows||['12:30','21:00']).join(' · ')],['Thời lượng',(s?.minutes||15)+' phút'],['Cấp','15+'],['Đang chiến',s?.players??0]],body);
  ui.details('Vào từ Thiên Vân Thành, hệ thống tự chia phe Chính/Tà. Hạ địch +10 điểm (phe +5). Chiếm cờ: đứng trong vòng cờ khi không có địch; cờ của phe cho phe +1 điểm mỗi 5 giây. Doanh trại phe mình an toàn. Hết giờ, ai có từ 5 điểm nhận rương qua hộp thư; phe thắng thưởng ×1,5, top 3 thêm thưởng lớn.',body,'Luật chơi');
  if(s?.open){if(inBattle())d.action('Rời chiến trường',()=>{d.close();leave();});else d.action('⚔ Tham chiến',join,world.state.scene!=='hub'||characterLevel()<15);}
  else c.append(ui.node('p','world-line','Chưa mở. Trận kế tiếp sau '+fmt((s?.next||0)-serverNow())+'.'));
  if(account.state.user?.gm&&!s?.open)d.action('GM · Mở chiến trường 10 phút',gmOpen);
  if(s?.last)showResultInline(c,s.last);poll(true);outpostSection(c);}
 // Tông môn chiến: four outposts held by guilds for a week.
 async function outpostSection(root){let data;try{data=await account.api('/api/outposts');}catch{return;}if($('world-title').textContent!=='Chính – Tà Chi Chiến')return;
  const {body}=ui.panel('Tông Môn Chiến · Cứ điểm',null,root);
  ui.chips([['Giờ','T4 · T7 20:00'],['Thời lượng','30 phút'],[data.war?'Còn':'Trận sau',data.war?fmt(data.endsIn):fmt((data.next||0)-data.now)]],body);
  ui.details('Mỗi cứ điểm Sơn Hà xuất hiện một Trấn Thủ trong giờ chiến. Sát thương của thành viên được cộng cho tông môn; tông môn gây nhiều sát thương nhất khi Trấn Thủ ngã (hoặc hết giờ) giữ cứ điểm tới trận sau: +10% EXP/Linh Thạch ở vùng đó, mỗi lần hạ quái +1 điểm tông môn, thành viên có mặt nhận rương.',body,'Luật chơi');
  const list=ui.node('div','outpost-list');
  for(const o of data.outposts){const row=ui.node('div','outpost-row'+(o.mine?' mine':''));row.append(ui.node('b','',o.name),ui.node('span','',o.owner?'Chủ: '+o.owner:'Chưa có chủ'));
   if(o.top.length)row.append(ui.node('small','',o.top.map(t=>t.name+' '+t.damage).join(' · ')));
   const go=ui.node('button','','➤');go.type='button';go.title='Đi tới';go.onclick=()=>{d.close();questNav.go({map:o.map,x:1000,y:1120,auto:true},o.name);};row.append(go);list.append(row);}
  body.append(list);if(!data.guild)body.append(ui.node('p','visual-note','Gia nhập một tông môn (Đội / Tông môn) để tham chiến.'));}
 function showResultInline(root,last){const box=ui.node('div','battle-result');box.append(ui.node('b','',last.winner?('Phe thắng: '+(last.winner==='chinh'?'Chính Phái':'Tà Phái')):'Hòa'),ui.node('span','','Chính '+last.scores.chinh+' — '+last.scores.ta+' Tà'));
  const ol=document.createElement('ol');for(const f of last.ranking)ol.append(ui.node('li',f.team,f.name+' · '+f.score+' điểm · '+f.kills+'/'+f.deaths));box.append(ol);root.append(box);}
 function showResult(last){d.show('Kết quả Chính – Tà Chi Chiến','');showResultInline($('world-content'),last);d.line('Rương thưởng đã gửi vào hộp thư (Đội / Tông môn → Rương).');window.gameAudio?.play('chest');}

 // ---------- world data from /api/world
 function receive(data){if(!inBattle())return;const v=data.battle;if(!v)return;state.view=v;state.offset=v.now-Date.now()/1000;
  const m=v.me;if(m){P.hp=Math.max(0,m.hp);P.mp=m.mp;}
  for(const e of v.events||[])if(!state.seen?.has(e.id)){(state.seen??=new Set()).add(e.id);fx(e.x,e.y-38,e.amount,e.target===uid()?'#ff8c88':'#ffe2a0');if(e.target===uid())window.gameAudio?.play('hurt');}
  if(state.seen?.size>200)state.seen=new Set([...state.seen].slice(-100));
  syncTargets();renderBoard();}
 function syncTargets(){const v=state.view,m=me();if(!v||!m)return;const enemies=v.fighters.filter(f=>f.team!==m.team&&!f.dead&&f.hp>0),old=new Map(E.filter(e=>e.pvpTarget).map(e=>[e.pvpId,e]));
  E=enemies.map(f=>{const peer=onlineWorld.state.players.find(p=>p.id===f.id),e=old.get(f.id)||{id:'pvp-'+f.id,pvpId:f.id,t:0,network:true,pvpTarget:true,worldMap:true,dead:0,cd:999,fr:0,fl:0};
   return Object.assign(e,{x:peer?.drawX??peer?.x??f.x,y:peer?.drawY??peer?.y??f.y,hx:f.x,hy:f.y,hp:f.hp,maxHp:f.maxHp,name:f.name,level:f.level});});}
 function renderBoard(){const v=state.view,m=me();document.body.classList.toggle('in-battle',inBattle());board.hidden=feed.hidden=!inBattle()||!v;if(board.hidden)return;
  const left=v.end-serverNow();board.replaceChildren();const row=ui.node('div','battle-score');
  row.append(ui.node('b','chinh','Chính '+v.teams.chinh.score),ui.node('span','',fmt(left)),ui.node('b','ta',v.teams.ta.score+' Tà'));board.append(row);
  const flags=ui.node('div','battle-flags');for(const f of v.flags)flags.append(ui.node('i',f.owner||'',f.name.replace('Cờ ','')));board.append(flags);
  if(m)board.append(ui.node('small','','Bạn: '+(m.team==='chinh'?'Chính':'Tà')+' · '+m.score+' điểm · '+m.kills+' hạ / '+m.deaths+' tử'));
  feed.replaceChildren(...v.feed.map(t=>ui.node('p','',t)));
  deathCard.hidden=!(m&&m.dead>0);if(!deathCard.hidden)deathCard.textContent='Trọng thương · hồi sinh sau '+Math.ceil(m.dead)+' giây';}

 // ---------- combat glue (same intent protocol as the duel arena)
 const canAct=()=>inBattle()&&me()&&!me().dead&&!paused()&&!d.isOpen();
 function queue(slot,point){if(!canAct())return;const events=onlineWorld.state.duelAttacks??=[];if(events.length<8)events.push({id:crypto.randomUUID(),slot,x:point.x,y:point.y});}
 const attack=basicCombat.attack;basicCombat.attack=function(target){if(inBattle()&&!canAct())return false;const r=attack(target);if(r&&target?.pvpTarget)queue(0,target);return r;};
 const castSkill=skill;skill=function(i){if(!inBattle())return castSkill(i);if(!canAct())return;const before=P.mp,r=castSkill(i);if(P.mp<before||window.gmTest?.enabled){const combat=getClassCombat(),nearest=E.slice().sort((a,b)=>Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y))[0],point=i>=2?(combat?.state?.aim||nearest||P):(nearest||P);queue(i+1,point);}return r;};
 const hitEnemy=hit;hit=function(e,power){if(e?.pvpTarget)return;return hitEnemy(e,power);};
 const update=up;up=function(dt){if(inBattle()){P.hp=Math.max(1,P.hp);if(me()?.dead>0){K={};ptr=null;if(window.mobileInput)mobileInput.active=false;}}const r=update(dt);if(inBattle()){const m=me();if(m){P.hp=Math.max(0,m.hp);P.mp=m.mp;}syncTargets();}poll();renderPrompt();return r;};

 // ---------- scene glue
 const change=world.switchScene;world.switchScene=function(id,initial=false){
  if(id==='battle'&&!(state.snap?.open&&state.snap?.joined)){if(initial)return change('hub',true);msg('Chiến trường chưa mở hoặc bạn chưa tham chiến.');return;}
  const r=change(id,initial);if(inBattle()){world.services.splice(0,world.services.length);world.buildings.splice(0,world.buildings.length);state.wasIn=true;}else{board.hidden=feed.hidden=deathCard.hidden=true;}return r;};
 const walk=world.canWalk;world.canWalk=p=>inBattle()?((p.x-1000)/RX)**2+((p.y-1100)/RY)**2<.97:walk(p);
 const safety=world.sceneSafety;world.sceneSafety=p=>inBattle()?false:safety(p);
 const camera=world.camera;world.camera=(vw,vh)=>inBattle()?{x:Math.max(160,Math.min(1840-vw,P.x-vw/2)),y:Math.max(560,Math.min(1640-vh,P.y-vh/2)),vw,vh}:camera(vw,vh);
 const floor=drawGround;drawGround=function(cx,cy,vw,vh){if(!inBattle())return floor(cx,cy,vw,vh);
  world.mapThemes.drawBackdrop(g,cx,cy,vw,vh);g.save();g.fillStyle='#1a1410';g.beginPath();g.ellipse(1000,1122,RX,RY,0,0,7);g.fill();g.beginPath();g.ellipse(1000,1100,RX,RY,0,0,7);g.clip();
  stonePaving.draw(g,{left:1000-RX,top:1100-RY,right:1000+RX,bottom:1100+RY},{x:cx,y:cy,width:vw,height:vh});world.mapThemes.finishDeck(g,1000,1100,RX,RY);
  const tint=g.createLinearGradient(1000-RX,0,1000+RX,0);tint.addColorStop(0,'rgba(60,120,220,.22)');tint.addColorStop(.45,'rgba(0,0,0,0)');tint.addColorStop(.55,'rgba(0,0,0,0)');tint.addColorStop(1,'rgba(220,60,40,.22)');g.fillStyle=tint;g.fillRect(1000-RX,1100-RY,RX*2,RY*2);g.restore();
  g.save();g.lineWidth=3;g.strokeStyle='#e6c477aa';g.beginPath();g.ellipse(1000,1100,RX-4,RY-3,0,0,7);g.stroke();g.restore();
  };
 // Bases, flags and attack marks go on the ground layer, above any floor art.
 const battleDetails=world.drawGroundDetails;world.drawGroundDetails=function(ctx,cx,cy,vw,vh){battleDetails.call(this,ctx,cx,cy,vw,vh);if(!inBattle())return;
  const v=state.view;if(!v)return;g.save();
  for(const [team,t] of Object.entries(v.teams)){const [bx,by]=t.base;g.fillStyle=team==='chinh'?'rgba(80,150,255,.18)':'rgba(255,80,60,.18)';g.strokeStyle=t.color;g.lineWidth=2;g.beginPath();g.ellipse(bx,by,v.baseRadius,v.baseRadius/1.4,0,0,7);g.fill();g.stroke();}
  for(const f of v.flags){const color=f.owner==='chinh'?'#6fb6ff':f.owner==='ta'?'#ff6b5a':'#e6c477',r=v.flagRadius;g.fillStyle=color+'22';g.strokeStyle=color;g.lineWidth=2;g.beginPath();g.ellipse(f.x,f.y,r,r/1.4,0,0,7);g.fill();g.stroke();
   if(f.progress>0&&f.progress<1&&f.team){g.strokeStyle=f.team==='chinh'?'#6fb6ff':'#ff6b5a';g.lineWidth=5;g.beginPath();g.ellipse(f.x,f.y,r+6,r/1.4+6,0,-Math.PI/2,-Math.PI/2+f.progress*Math.PI*2);g.stroke();}}
  const now=serverNow();for(const a of v.pending||[]){const age=Math.max(0,.6-(a.at-now));combatDefense?.drawTelegraph?.(g,{x:a.x,y:a.y,r:a.r,age,duration:.6,label:''});}
  g.restore();};
 const actors=world.queueActors;world.queueActors=function(items,cx,cy,vw,vh){actors(items,cx,cy,vw,vh);const v=state.view;if(!inBattle()||!v)return;
  for(const f of v.flags)items.push([f.y-1,()=>{const color=f.owner==='chinh'?'#6fb6ff':f.owner==='ta'?'#ff6b5a':'#e6c477';g.save();g.fillStyle='#3a2a18';g.fillRect(f.x-2,f.y-70,4,70);g.fillStyle=color;g.beginPath();g.moveTo(f.x+2,f.y-70);g.quadraticCurveTo(f.x+30,f.y-62+Math.sin(tm*4)*3,f.x+44,f.y-58);g.lineTo(f.x+2,f.y-44);g.closePath();g.fill();drawWorldCaption(g,f.name,f.x,f.y+18,color,6.5);g.restore();}]);
  for(const [team,t] of Object.entries(v.teams))items.push([t.base[1],()=>{world.sprite(g,team==='chinh'?'theme-14-010':'theme-12-010',t.base[0],t.base[1]-30,60);drawWorldCaption(g,t.name,t.base[0],t.base[1]+22,t.color,7);}]);};
 // Team colours on names.
 const caption=window.drawWorldCaption;window.drawWorldCaption=function(ctx,text,x,y,color,size){if(inBattle()&&state.view){const name=String(text).replace(/^◆ /,''),f=state.view.fighters.find(q=>q.name===name);if(f)color=f.team===me()?.team?'#8fd0ff':'#ff7a6a';}return caption(ctx,text,x,y,color,size);};
 const service=world.handleService;world.handleService=function(id){if(inBattle()&&id==='expedition-exit'){leave();return true;}return service(id);};

 setInterval(()=>{document.body.classList.toggle('in-battle',inBattle());if(inBattle())renderBoard();},500);
 const css=document.createElement('style');css.textContent=`
body.in-battle #event-banner{display:none!important}
#battle-board{position:fixed;top:88px;left:50%;transform:translateX(-50%);z-index:5;min-width:260px;padding:6px 14px;border-radius:12px;border:1px solid #e6c47788;background:#1a1410ee;color:#f3e3b4;text-align:center;font:600 11px Arial;pointer-events:none}
#battle-board[hidden],#battle-feed[hidden],#battle-death[hidden],#battle-prompt[hidden]{display:none}
.battle-score{display:flex;align-items:center;justify-content:center;gap:12px;font:800 16px Arial}.battle-score .chinh{color:#8fd0ff}.battle-score .ta{color:#ff8a7a}.battle-score span{font:700 12px Arial;color:#ffe7a0}
.battle-flags{display:flex;justify-content:center;gap:6px;margin:4px 0}.battle-flags i{font-style:normal;padding:1px 8px;border-radius:8px;background:#3a3020;color:#e6c477}.battle-flags i.chinh{background:#1d3a5a;color:#8fd0ff}.battle-flags i.ta{background:#5a1d18;color:#ff8a7a}
#battle-feed{position:fixed;left:8px;top:250px;z-index:3;width:220px;display:grid;gap:2px;pointer-events:none}#battle-feed p{margin:0;font:11px Arial;color:#f3e3b4;text-shadow:0 1px 2px #000}
#battle-death{position:fixed;inset:0;display:grid;place-items:center;z-index:6;background:#2a0606aa;color:#ffd0c0;font:800 20px Georgia,serif;pointer-events:none;text-shadow:0 2px 6px #000}
#battle-prompt{position:fixed;left:50%;bottom:calc(150px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:5;max-width:calc(100vw - 32px);padding:10px 18px;border-radius:12px;border:1px solid #ffd27a;background:linear-gradient(90deg,#3a1a10f0,#5a3014f0);color:#fff0d8;font:700 13px Arial;box-shadow:0 0 18px #ffb84a55;cursor:pointer}
.outpost-list{display:grid;gap:6px;margin-top:8px}.outpost-row{display:grid;grid-template-columns:1fr auto;gap:2px 8px;align-items:center;padding:8px 10px;border:1px solid #5d7774;border-radius:8px;background:#132a33}.outpost-row b{color:#f3e3b4}.outpost-row span,.outpost-row small{grid-column:1;color:#9fc4bb;font-size:11px}.outpost-row button{grid-row:1/span 3;grid-column:2;min-height:0;padding:6px 10px}.outpost-row.mine{border-color:#ffd27a}
.battle-result{display:grid;gap:4px;margin-top:10px;padding:10px;border:1px solid #e6c47766;border-radius:10px;background:#1a1410}.battle-result b{color:#ffe7a0}.battle-result ol{margin:4px 0 0;padding-left:18px;font-size:12px}.battle-result li.chinh{color:#8fd0ff}.battle-result li.ta{color:#ff8a7a}
@media(max-height:500px){#battle-feed{top:190px;width:170px}}`;
 document.head.append(css);
 window.battleGame={state,open,join,leave,poll,receive};
})();
