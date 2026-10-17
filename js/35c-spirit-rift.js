/* Solo expedition on the existing private arena deck; independent of arena visits. */
(function(){
  const world=worldMap,d=world.dialog;
  let run=null;
  const blessings=[
    {id:'power',name:'Kiếm Tâm',text:'Tăng 15% sát thương trong lượt này.'},
    {id:'guard',name:'Kim Cang',text:'Giảm 15% sát thương nhận trong lượt này.'},
    {id:'spring',name:'Hồi Xuân',text:'Hồi ngay 30% máu; mỗi giây hồi thêm 1% máu và linh lực.'}
  ];
  const button=document.createElement('button');button.id='rift-button';button.textContent='Bí cảnh';button.onclick=()=>open();$('bt').append(button);
  const panel=document.createElement('section');panel.id='rift-status';panel.hidden=true;panel.setAttribute('aria-live','polite');document.body.append(panel);
  const style=document.createElement('style');style.textContent='#rift-status{position:fixed;top:12px;left:50%;transform:translateX(-50%);max-width:40vw;padding:10px 16px;border:1px solid #91bdb3;border-radius:12px;background:#10272deb;color:#e4f8e9;text-align:center;pointer-events:none;font:12px Arial;z-index:3}#rift-status b,#rift-status small{display:block;margin:3px}#rift-button{border-color:#89caba!important}@media(max-width:700px){#rift-status{top:150px;left:8px;transform:none;max-width:calc(100vw - 120px);padding:6px;font-size:10px}}';document.head.append(style);
  function status(){panel.hidden=!run;if(!run)return;const boss=run.boss;panel.replaceChildren();const title=document.createElement('b');title.textContent='VÂN HẢI BÍ CẢNH · '+(boss?'Hộ Pháp · Giai đoạn '+run.phase:'Đợt '+run.wave+'/3');const detail=document.createElement('small');detail.textContent=run.choosing?'Chọn phúc duyên để tiếp tục':boss?Math.ceil(Math.max(0,boss.hp))+'/'+boss.maxHp+' HP · '+(run.transition>0?'Phá phong ấn…':run.exposed>0?'Điểm yếu đang mở!':'Rời vùng đỏ trước khi chiêu nổ'):E.filter(e=>e.hp>0&&!e.dead).length+' yêu thú · '+run.boons.length+' phúc duyên';panel.append(title,detail);}
  function reset(){classCombat.onRespawn();B.length=SP.length=V.length=LT.length=X.length=PT.length=0;K={};ptr=null;P.med=0;P.sl=0;P.acd=.5;autoCombat.toggle(false);}
  function leave(destination='hub'){if(!run)return;run=null;panel.hidden=true;d.close();reset();E=[];world.switchScene(destination);saveCharacter();}
  function spawnWave(){if(!run)return;run.choosing=false;run.wave++;E=[];reset();P.x=1000;P.y=1130;const count=2+run.wave*2;
    for(let i=0;i<count;i++){const a=i*Math.PI*2/count,t=[0,1,4,3][(i+run.wave)%4],x=1000+Math.cos(a)*135,y=1100+Math.sin(a)*65,hp=Math.round(run.attack*(4+run.wave)*1.2);E.push({t,x,y,hx:x,hy:y,hp,maxHp:hp,cd:1.5,dead:0,fr:0,fl:0,worldMap:true,arena:true,rift:true,map:'arena',attackScale:run.enemyPower/T[t].at,xpReward:Math.round(8+run.level*.8),name:T[t].n+' · Bí cảnh'});}status();
  }
  function spawnBoss(){reset();run.choosing=false;E=[];P.x=1000;P.y=1160;const hp=Math.round(run.attack*100);run.boss={t:2,skin:'BoNgua',name:'Vân Hải Hộ Pháp',x:1000,y:1060,hx:1000,hy:1060,hp,maxHp:hp,cd:2,dead:0,fr:0,fl:0,worldMap:true,arena:true,rift:true,boss:true,elite:true,map:'arena',attackScale:run.enemyPower*1.4/T[2].at,xpReward:Math.round(60+run.level*3)};run.phase=1;run.cooldown=2;E.push(run.boss);status();msg('Hộ Pháp xuất hiện! Né vùng đỏ; phản công khi điểm yếu mở.');}
  function choose(){if(!run)return;run.choosing=true;autoCombat.toggle(false);d.show('Phúc duyên · Đợt '+run.wave,'Chọn một phúc duyên. Có thể chọn lặp; chỉ có hiệu lực trong lượt bí cảnh này.');for(const boon of blessings)d.action(boon.name+' · '+boon.text,()=>{if(!run?.choosing)return;run.boons.push(boon.id);if(boon.id==='spring')P.hp=Math.min(mhp(),P.hp+mhp()*.3);P.mp=Math.min(mmp(),P.mp+mmp()*.2);d.close();if(run.wave<3)spawnWave();else spawnBoss();});status();}
  function victory(){if(!run||run.rewarded)return;run.rewarded=true;const gold=120+run.level*4,p=world.progress();P.gold+=gold;p.riftClears=(p.riftClears||0)+1;leave();d.show('Bí cảnh hoàn thành','Vân Hải Hộ Pháp đã bị đánh bại.');d.line('+'+gold+' Linh Thạch');saveCharacter();}
  function start(){if(run||!P.ap||!world.progress().tutorial||!world.isSafe(P))return;const back=world.state.scene;reset();run={returnMap:back,wave:0,level:cultivationLevel(),attack:8+cultivationLevel()*1.3,enemyPower:Math.max(4,(100+cultivationLevel()*6)*.055),boons:[],marks:[],phase:0,transition:0,exposed:0,elapsed:0};world.state.scene='arena';P.world.map='arena';world.state.arena=null;world.buildings.length=0;world.services.splice(0,world.services.length,{id:'rift-exit',name:'Rời bí cảnh',x:1000,y:1180,color:'#a4e3cf'});world.state.near=null;P.hp=mhp();P.mp=mmp();d.close();spawnWave();saveCharacter();}
  function open(){if(!P.ap||paused())return;if(run){if(run.choosing)return choose();d.show('Vân Hải Bí Cảnh','Rời sớm sẽ kết thúc lượt, không nhận rương hoàn thành.');d.action('Tiếp tục',()=>d.close());d.action('Rời bí cảnh',()=>leave(run.returnMap));return;}
    d.show('Vân Hải Bí Cảnh','Solo · 3 đợt → Chọn phúc duyên → Hạ Hộ Pháp');const preview=visualUI.panel('Vân Hải Hộ Pháp',spriteCatalog.monsterFrames.BoNgua[0][0].src),level=cultivationLevel();visualUI.chips([['Linh Thạch',120+level*4]],preview.body);visualUI.details('Né vùng đỏ, phản công khi điểm yếu mở. Boss chuyển giai đoạn ở 50% HP. Ba phúc duyên chỉ có hiệu lực trong lượt. Thắng nhận Linh Thạch; không rơi đồ, mảnh hoặc đan dược.',preview.body,'Cơ chế bí cảnh');d.action('Vào Vân Hải Bí Cảnh',start,!world.progress().tutorial||!world.isSafe(P));}

  const count=id=>run?.boons.filter(b=>b===id).length||0;
  const oldHit=hit;hit=function(e,power){if(!run||!e.rift)return oldHit(e,power);if(e.dead||e.hp<=0)return;if(e===run.boss&&run.transition>0)return;let damage=power*(1+.15*count('power'))*(e===run.boss&&run.exposed>0?1.25:1);if(e===run.boss&&run.phase===1)damage=Math.min(damage,Math.max(0,e.hp-e.maxHp*.5));if(damage>0)return oldHit(e,damage);};
  const speed=classCombat.enemySpeed;classCombat.enemySpeed=e=>run&&e===run.boss&&(run.transition>0||run.marks.length)?0:speed(e);
  const blocked=fieldEffects.blocksAttack;fieldEffects.blocksAttack=e=>(!!run&&e===run.boss&&(run.transition>0||run.marks.length>0))||blocked(e);
  const service=world.handleService;world.handleService=function(id){if(run&&(id==='rift-exit'||id==='leaveArena')){open();return true;}return service(id);};
  const respawn=world.respawn;world.respawn=function(){if(run){leave();msg('Trọng thương! Lượt bí cảnh kết thúc; phúc duyên đã được gỡ.');return;}return respawn();};
  const switchScene=world.switchScene;world.switchScene=function(id,...args){if(run){run=null;panel.hidden=true;reset();}return switchScene(id,...args);};
  const title=world.sceneTitle;world.sceneTitle=()=>run?'Vân Hải Bí Cảnh':title();
  function mark(x,y,delay=0){run.marks.push({x,y,r:run.phase===2?40:48,age:-delay,duration:run.phase===2?1.1:1.35,spent:false,targeted:Math.hypot(P.x-x,P.y-y)<=(run.phase===2?40:48)});}
  function blast(m){m.spent=true;if(Math.hypot(P.x-m.x,P.y-m.y)>m.r||classCombat.isDashing()||window.combatDefense?.evading()){if(m.targeted)window.combatDefense?.dodge();return;}const armor=window.totalArmor?totalArmor():0,damage=Math.max(1,Math.round((mhp()*(run.phase===2?.25:.2)-armor*.4)*Math.max(.55,1-.15*count('guard'))*(window.newClassCombat?.damageTaken()||1)*(window.equipmentSystem?.damageTaken()||1)));P.hp=Math.max(0,P.hp-damage);P.med=0;fx(P.x,P.y-30,'-'+damage,'#ff8578');spark(m.x,m.y,'#ffbb85',16);}
  const update=up;up=function(dt){if(!run)return update(dt);if(paused()||d.isOpen())return;const current=run;for(const e of E)if(e.rift){e.baseRiftAttack??=e.attackScale;e.attackScale=e.baseRiftAttack*Math.max(.55,1-.15*count('guard'));}update(dt);if(run!==current)return;if(world.state.scene!=='arena'){run=null;panel.hidden=true;return;}run.elapsed+=dt;const spring=count('spring');P.hp=Math.min(mhp(),P.hp+mhp()*.01*spring*dt);P.mp=Math.min(mmp(),P.mp+mmp()*.01*spring*dt);
    const boss=run.boss;if(!boss){if(E.every(e=>e.dead||e.hp<=0))choose();status();return;}
    if(boss.dead||boss.hp<=0){victory();return;}
    if(run.phase===1&&boss.hp<=boss.maxHp*.5){run.phase=2;run.transition=1.5;run.marks=[];run.cooldown=2;boss.name='Vân Hải Hộ Pháp · Phá Ấn';msg('Phong ấn vỡ! Hộ Pháp tung ba vùng nổ liên tiếp.');}
    run.exposed=Math.max(0,run.exposed-dt);if(run.transition>0){run.transition=Math.max(0,run.transition-dt);status();return;}
    if(run.marks.some(m=>!m.spent)&&fieldEffects.list(boss).some(effect=>effect.hard>0)){run.marks=[];run.cooldown=2;run.exposed=.7;fx(boss.x,boss.y-45,'Ngắt chiêu','#b7eaff');}
    for(const m of run.marks){m.age+=dt;if(!m.spent&&m.age>=m.duration)blast(m);}if(P.hp<=0){world.respawn();P.hp=mhp();P.gold=Math.floor(P.gold*.9);saveCharacter();return;}
    const had=run.marks.length;run.marks=run.marks.filter(m=>m.age<m.duration+.35);if(had&&!run.marks.length)run.exposed=1.5;
    run.cooldown-=dt;if(run.cooldown<=0&&!run.marks.length){mark(P.x,P.y);if(run.phase===2){const a=Math.atan2(P.y-1100,P.x-1000);for(const sign of [-1,1])mark(1000+Math.cos(a+sign*.7)*95,1100+Math.sin(a+sign*.7)*48,sign===-1?.3:.6);}run.cooldown=run.phase===2?4.2:4.8;}status();
  };
  // Telegraphs belong below actors, on the floor, and never use opaque sprite rectangles.
  const ground=world.drawGroundDetails;world.drawGroundDetails=function(ctx,...args){ground(ctx,...args);if(!run)return;for(const m of run.marks)window.combatDefense?.drawTelegraph(ctx,m);};
  window.spiritRift={open,start,leave,state:()=>run,blessings};
})();
