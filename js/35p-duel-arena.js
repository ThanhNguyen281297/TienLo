/* Consensual PvP and spectators. HP, cooldowns, scores and deadline are server-owned. */
(function(){
 const world=worldMap,d=world.dialog,state={data:null,current:null,offset:0,loading:false,busy:false},seen=new Set(),notices=new Set();let resultTimer=null,polling=false,spectatorZoom=false;
 const button=document.createElement('button');button.id='duel-button';button.textContent='Lôi đài';button.onclick=()=>open();$('bt').append(button);
 const panel=document.createElement('aside');panel.id='duel-scoreboard';panel.hidden=true;document.body.append(panel);
 const uid=()=>account.state.user?.id,now=()=>Date.now()/1000+state.offset,current=()=>state.current;
 const fighting=()=>world.state.scene==='duel'&&state.current?.status==='active'&&!state.current.viewer;
 function canAct(){return fighting()&&now()>=state.current.startsAt&&!paused()&&!d.isOpen();}
 function opponent(){return state.current?.fighters.find(f=>f.id!==uid());}
 function syncTarget(){
  if(world.state.scene!=='duel')return;
  if(!state.current||state.current.viewer||state.current.status!=='active'){E=[];return;}
  const f=opponent();if(!f)return;const peer=onlineWorld.state.players.find(p=>p.id===f.id),old=E.find(e=>e.duelTarget);
  const target=old||{id:'duel-'+f.id,t:0,network:true,duelTarget:true,worldMap:true,dead:0,cd:999,fr:0,fl:0};
  Object.assign(target,{x:peer?.x??f.x,y:peer?.y??f.y,hp:f.hp,maxHp:f.maxHp,name:f.name});target.hx=target.x;target.hy=target.y;E=[target];
  if(!old)cultivation.select(target,true);
 }
 function scoreboard(){const m=state.current;panel.hidden=world.state.scene!=='duel'||!m;if(panel.hidden)return;
  const seconds=Math.ceil(Math.max(0,m.endsAt-now())),count=Math.ceil(Math.max(0,m.startsAt-now()));panel.replaceChildren();const title=document.createElement('b');title.textContent=m.status!=='active'?'KẾT THÚC':count?'BẮT ĐẦU SAU '+count:Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · '+(m.viewer?'KHÁN ĐÀI':'GIAO ĐẤU');panel.append(title);
  for(const f of m.fighters){const row=document.createElement('div');row.className='duel-fighter';const label=document.createElement('span');label.textContent=f.name+' · '+Math.ceil(f.hp)+'/'+f.maxHp+' HP · '+f.damage+' sát thương';const bar=document.createElement('progress');bar.max=f.maxHp;bar.value=f.hp;bar.setAttribute('aria-label','Máu '+f.name);row.append(label,bar);panel.append(row);}const note=document.createElement('small');note.textContent=m.spectators+' người xem'+(m.viewer?' · Chỉ di chuyển trên khán đài':'');panel.append(note);
 }
 function receive(m){
  if(!m)return;
  const old=state.current;state.offset=m.now-Date.now()/1000;state.current=m;
  if(world.state.scene!=='duel'){
   world.switchScene('duel',true);autoCombat.toggle(false);B.length=SP.length=V.length=LT.length=X.length=PT.length=0;
   const f=m.fighters.find(f=>f.id===uid());P.x=m.viewer?1360:f.x;P.y=m.viewer?1320:f.y;P.med=0;if(m.viewer){spectatorZoom=true;Z=Math.min(Z,W/900,H/570);}saveCharacter();
  }
  if(!m.viewer){const f=m.fighters.find(f=>f.id===uid());P.hp=f.hp;P.mp=f.mp;}
  syncTarget();scoreboard();
  for(const event of m.events||[])if(!seen.has(event.id)){seen.add(event.id);const target=m.fighters.find(f=>f.id===event.target);if(target){fx(target.x,target.y-38,event.amount,event.target===uid()?'#ff8c88':'#ffe2a0');spark(target.x,target.y-20,'#ffdf9d',5);}}if(seen.size>100){const tail=[...seen].slice(-60);seen.clear();tail.forEach(id=>seen.add(id));}
  if(m.status==='finished'&&old?.status!=='finished'){
   autoCombat.toggle(false);E=[];const winner=m.fighters.find(f=>f.id===m.winner),reasons={timeout:'Hết 10 phút · phân định bằng tổng sát thương',knockout:'Hạ gục đối thủ',surrender:'Một đấu thủ xin thua',disconnect:'Mất kết nối quá 30 giây'};
   msg((winner?winner.name+' chiến thắng':'Trận đấu hòa')+' · '+(reasons[m.reason]||''));clearTimeout(resultTimer);resultTimer=setTimeout(()=>leave(),8000);
  }
 }
 async function refresh(){if(polling||!P.ap||!account.state.ready||account.state.restoring)return;polling=true;try{
  const data=state.data=await account.api('/api/duel');if(data.current)receive(data.current);
  else if(world.state.scene==='duel'&&!state.busy){state.current=null;P.hp=mhp();world.switchScene('hub',true);P.mp=mmp();if(spectatorZoom){spectatorZoom=false;rs();}saveCharacter();}
  for(const invitation of data.invites)if(invitation.target===uid()&&!notices.has(invitation.id)){notices.add(invitation.id);msg(invitation.name+' gửi lời thách đấu · Mở Lôi đài để trả lời.');}
  button.dataset.invites=data.invites.filter(i=>i.target===uid()).length;button.classList.toggle('duel-invited',button.dataset.invites!=='0');
  if(d.isOpen()&&$('world-title').textContent==='Thiên Vân Lôi Đài')render();
 }catch(e){if(world.state.scene==='duel'&&e.status===401)msg(e.message);}finally{polling=false;}}
 async function action(op,extra={}){if(state.busy)return;state.busy=true;try{const data=await account.api('/api/duel',{action:op,...extra});state.data=data;if(data.current)receive(data.current);if(op==='accept'||op==='watch')d.close();else render();}catch(e){msg(e.message);}finally{state.busy=false;}}
 async function leave(){clearTimeout(resultTimer);if(state.busy)return;state.busy=true;try{await account.api('/api/duel',{action:'leave'});state.current=null;state.loading=false;onlineWorld.state.duelAttacks=[];P.hp=mhp();P.mp=mmp();E=[];panel.hidden=true;world.switchScene('hub',true);if(spectatorZoom){spectatorZoom=false;rs();}saveCharacter();}catch(e){msg(e.message);}finally{state.busy=false;}}
 function render(){const data=state.data;if(!data)return;d.show('Thiên Vân Lôi Đài','Hai người đồng ý mới bắt đầu. Tối đa 10 phút; quá giờ so tổng sát thương.');
  if(state.current&&world.state.scene==='duel'){const m=state.current;d.line(m.viewer?'Bạn đang xem trận từ khán đài.':'Đang thi đấu với '+opponent()?.name);d.action(m.viewer?'Rời khán đài':m.status==='active'?'Xin thua và rời lôi đài':'Về thành',leave);d.action('Tiếp tục xem',()=>d.close());return;}
  for(const i of data.invites){if(i.target===uid()){d.line(i.name+' · Thách đấu bạn');d.action('Chấp nhận '+i.name,()=>action('accept',{id:i.id}));d.action('Từ chối',()=>action('decline',{id:i.id}));}else d.action('Hủy lời mời '+i.targetName,()=>action('cancel',{id:i.id}));}
  for(const peer of data.online)d.action('⚔ '+peer.name+' · Lv.'+peer.level,()=>action('invite',{target:peer.id}),world.state.scene!=='hub');
  if(!data.online.length)d.line('Chưa có đạo hữu khác tại thành để thách đấu.');
  for(const m of data.matches)d.action('Xem · '+m.fighters.map(f=>f.name).join(' — ')+' · '+m.spectators+' khán giả',()=>action('watch',{id:m.id}));
  if(world.state.scene!=='hub')d.action('Về Thiên Vân Thành',()=>world.switchScene('hub'));
 }
 async function open(){if(!P.ap||paused())return;await refresh();render();}
 function queue(slot,point){if(!canAct())return;const events=onlineWorld.state.duelAttacks??=[];if(events.length<8)events.push({id:crypto.randomUUID(),slot,x:point.x,y:point.y});}
 const attack=basicCombat.attack;basicCombat.attack=function(target){if(world.state.scene==='duel'&&!canAct())return false;const result=attack(target);if(result&&target?.duelTarget)queue(0,target);return result;};
 const castSkill=skill;skill=function(index){if(world.state.scene!=='duel')return castSkill(index);if(!canAct())return;const before=P.mp,cast=onlineWorld.state.cast?.id,result=castSkill(index);if(P.mp<before||onlineWorld.state.cast?.id!==cast||gmTest.enabled){const combat=getClassCombat(),point=index>=2?(combat?.state?.aim||opponent()||P):(opponent()||P);queue(index+1,point);}return result;};
 const hitEnemy=hit;hit=function(enemy,power){if(enemy.duelTarget)return;return hitEnemy(enemy,power);};
 const walk=p=>{const viewer=!state.current||state.current.viewer,rx=viewer?420:350,ry=viewer?255:210,r=Math.hypot((p.x-1000)/rx,(p.y-1100)/ry);return viewer?r>=1.18&&r<=1.58:r<.97;};
 const service=world.handleService;world.handleService=function(id){if(id==='duel-exit'||(id==='arena'&&world.state.scene==='hub')){open();return true;}return service(id);};
 const ground=world.drawGroundDetails;world.drawGroundDetails=function(ctx,...args){ground(ctx,...args);if(world.state.scene!=='duel'||!state.current)return;for(const mark of state.current.pending||[]){if(mark.slot<3)continue;combatDefense.drawTelegraph(ctx,{x:mark.x,y:mark.y,r:mark.radius,age:Math.max(0,.6-(mark.at-now())),duration:.6,label:'CHIÊU THỨC'});}};
 const update=up;up=function(dt){if(world.state.scene==='duel'&&state.current&&!state.current.viewer)P.hp=Math.max(1,P.hp);const result=update(dt);if(world.state.scene==='duel'){syncTarget();const f=state.current?.fighters.find(f=>f.id===uid());if(f&&!state.current.viewer){P.hp=f.hp;P.mp=f.mp;P.med=0;}}return result;};
 setInterval(()=>{scoreboard();if(P.ap&&account.state.ready)refresh();},1000);
 addEventListener('resize',()=>{if(spectatorZoom)Z=Math.min(Z,W/900,H/570);});
 const resize=rs;rs=function(...args){const result=resize(...args);if(spectatorZoom)Z=Math.min(Z,W/900,H/570);return result;};
 const css=document.createElement('style');css.textContent='#duel-scoreboard{position:fixed;top:10px;left:50%;transform:translateX(-50%);width:min(410px,45vw);background:#152934ed;border:1px solid #c0a877;border-radius:12px;padding:9px 12px;color:#f1e4ba;text-align:center;z-index:5;font:11px Arial;pointer-events:none}#duel-scoreboard[hidden]{display:none}#duel-scoreboard b{display:block;font-size:14px;margin-bottom:6px}.duel-fighter{display:grid;gap:3px;margin:5px 0}.duel-fighter progress{width:100%;height:6px;accent-color:#74caa7}.duel-fighter:nth-child(3) progress{accent-color:#dd8a76}.duel-invited{box-shadow:0 0 10px #ffdb8b}@media(max-width:700px){#duel-scoreboard{top:150px;left:8px;transform:none;width:45vw;font-size:9px;padding:6px}}@media(orientation:landscape) and (max-height:520px){#duel-scoreboard{top:6px;left:50%;transform:translateX(-50%);width:35vw;font-size:9px}}';document.head.append(css);
 window.duelArena={state,current,fighting,receive,refresh,open,leave,action,canWalk:walk,challengeById:async(targetId)=>{try{await account.transact('/api/duel',{action:'invite',target:targetId,operationId:crypto.randomUUID()});msg('Đã gửi thách đấu.');}catch(e){msg(e.message);}}};
})();
