const cv=document.getElementById('c'),g=cv.getContext('2d'),$=id=>document.getElementById(id);
const M=2000;let Z=1.8;const R=['Phàm Nhân','Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Hợp Thể','Đại Thừa','Độ Kiếp','Chân Tiên','Kim Tiên','Thái Ất','Đại La','Đạo Tổ'],RC=['#8b7d6b','#5fb3a1','#4a78b5','#d9a441','#b0566f','#8a5cc2','#65a1d5','#a1b474','#e2bd72','#e183bb','#d2eafa','#ffd574','#ad9beb','#fae4ab','#fff4db'];
const T=[{n:'Bọ Ngựa',hp:20,at:4,xp:10,c:'#7fa650',s:10},{n:'Sói Yêu',hp:60,at:9,xp:28,c:'#7a7f88',s:13},{n:'Hổ Yêu',hp:320,at:20,xp:180,c:'#c9792e',s:22}];
let P={x:1000,y:1000,hp:100,mp:20,xp:0,level:1,levelXp:0,r:0,stage:1,gold:0,f:1,med:0,acd:0,scd:0,sl:0,mv:false,dir:0,ap:null,nm:''};
// Module tài khoản tải bản lưu từ server sau khi đăng nhập.
function saveCharacter(){if(window.saveLocalCharacter)window.saveLocalCharacter()}
const cultivationLevel=()=>P.r*10+(P.stage||1)-1;
const bonusStats=()=>{try{return window.bonusStats?window.bonusStats():{atk:0,hp:0,mp:0,armor:0,crit:0,dodge:0,skill:0};}catch(e){return {atk:0,hp:0,mp:0,armor:0,crit:0,dodge:0,skill:0};}};
const characterLevel=()=>Math.max(1,Math.min(200,P.level??(cultivationLevel()+1)));
const mhp=()=>Math.round((100+cultivationLevel()*6+(characterLevel()-1)*6+(bonusStats().hp||0))*(1+(bonusStats().hpPercent||0))),mmp=()=>Math.round((20+cultivationLevel()*3+(characterLevel()-1)*2+(bonusStats().mp||0))*(1+(bonusStats().mpPercent||0))),atk=()=>(8+cultivationLevel()*1.3+(characterLevel()-1)*.8+(bonusStats().atk||0))*(1+(bonusStats().atkPercent||0)),need=()=>Math.round(40+cultivationLevel()*12+cultivationLevel()**2*.4),cost=()=>Math.round(12+(P.r+1)*8+(P.stage||1)*2);
function gainExperience(amount){window.characterProgression?.gain(amount);}
let E=[],B=[],X=[],K={},ptr=null,W,H,tm=0,sv=0;
function rs(){const d=Math.min(Math.max(1.5,Math.min(3,window.devicePixelRatio||1)),Math.sqrt(8000000/(innerWidth*innerHeight))),scale=matchMedia('(pointer:coarse)').matches?Math.max(1.1,Math.min(1.65,Math.min(innerWidth,innerHeight)/280)):1.8;Z=scale*d;W=cv.width=Math.round(innerWidth*d);H=cv.height=Math.round(innerHeight*d);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high'}addEventListener('resize',rs);rs();
function gameCamera(vw=W/Z,vh=H/Z){return {x:P.x-vw/2,y:P.y-vh/2,vw,vh};}
function msg(s){$('log').textContent=s}
// Monsters come from the server (Sơn Hà, bí cảnh, tháp, boss); there is no local respawn.
function spawn(i){}
const fx=(x,y,t,c)=>{X.push({x,y,t,c,l:.9,vx:((X.length%3)-1)*5,strong:typeof t==='number'&&t>atk()*1.5});if(X.length>64)X.shift();};
function damageNumber(x,y,value,critical=false){fx(x,y,Math.max(1,Math.round(value)),critical?'#ffad44':'#fff2d3');Object.assign(X[X.length-1],{damage:true,critical,strong:critical});}
const near=r=>{let b=null,bd=r*r;for(const e of E){if(e.dead)continue;const d=(e.x-P.x)**2+(e.y-P.y)**2;if(d<bd){bd=d;b=e}}return b};
function hit(e,v){if(e.dead||e.hp<=0)return;const k=T[e.t];v=Math.round(v);e.hp-=v;damageNumber(e.x,e.y-k.s-12,v,!!e.criticalHit);
 if(e.hp<=0){e.dead=8;const experience=e.xpReward??k.xp;gainExperience(experience);const q=Math.ceil(experience/4);P.gold+=q;fx(e.x,e.y-k.s-14,'+'+q+' ◈','#d9a441');if(e.t==2)msg('Hạ được '+k.n+'! Danh chấn một phương.')}}
// Class modules (14/15/15b) own skill 0 and 21-cultivation-gameplay owns breakthroughs.
function cast(){}
function brk(){}
addEventListener('keydown',e=>{if(!P.ap||e.target instanceof HTMLInputElement)return;const k=e.key.toLowerCase();K[k]=1;if(k==' '){cast();e.preventDefault()}if(k=='q')P.med=!P.med;if(k=='b')brk()});
addEventListener('keyup',e=>K[e.key.toLowerCase()]=0);
cv.addEventListener('pointerdown',e=>{ptr={x:e.clientX,y:e.clientY}});cv.addEventListener('pointermove',e=>{if(ptr)ptr={x:e.clientX,y:e.clientY}});
addEventListener('pointerup',()=>ptr=null);
$('bq').onclick=()=>P.med=!P.med;$('bs').onclick=cast;$('bb').onclick=brk;
function up(dt){
 let dx=(K.d||K.arrowright?1:0)-(K.a||K.arrowleft?1:0),dy=(K.s||K.arrowdown?1:0)-(K.w||K.arrowup?1:0);
 const stick=window.mobileInput;let moveScale=1;
 if(stick?.active){dx=stick.x;dy=stick.y;moveScale=Math.min(1,Math.hypot(dx,dy));}
 if(ptr){const camera=gameCamera(),vx=camera.x+ptr.x/innerWidth*W/Z-P.x,vy=camera.y+ptr.y/innerHeight*H/Z-P.y;if(Math.hypot(vx,vy)>24){dx=vx;dy=vy}}
 if((dx||dy)&&!window.classCombat?.isDashing()){const d=Math.hypot(dx,dy);P.med=0;const sp=(150+P.r*10)*moveScale,to={x:Math.max(20,Math.min(M-20,P.x+dx/d*sp*dt)),y:Math.max(20,Math.min(M-20,P.y+dy/d*sp*dt))};const end=window.worldMap?.traceMove(P,to)||to;P.x=end.x;P.y=end.y;if(dx)P.f=dx<0?-1:1}
 if(P.med){P.xp=Math.min(need()*3,P.xp+2*dt*(1+P.r*.5));P.mp+=9*dt;if(P.hp>0)P.hp+=4*dt}else{P.mp+=1.5*dt;if(P.hp>0)P.hp+=1*dt}
 P.hp=Math.min(mhp(),P.hp);P.mp=Math.min(mmp(),P.mp);P.acd-=dt;P.scd-=dt;
 const t=window.cultivation?cultivation.basicTarget():near(50);
 if(t&&P.acd<=0&&!window.classCombat?.isDashing()){
  if(window.basicCombat)basicCombat.attack(t);
  else{hit(t,atk()*(.9+Math.random()*.2));P.acd=.6;P.sl=.12}
 }
 if(P.sl>0)P.sl-=dt;
 for(let i=0;i<E.length;i++){const e=E[i],k=T[e.t];
  if(e.network)continue;
  if(e.dead){e.dead-=dt;if(e.dead<=0&&!e.arena)spawn(i);continue}
  e.cd-=dt;const d=Math.hypot(P.x-e.x,P.y-e.y),ag=e.arena?1000:e.t==2?260:190;
  const slow=window.classCombat?.enemySpeed(e)??1,origin={x:e.x,y:e.y};
  if(d<ag&&d>k.s+10){const sp=(k.sp??(40+e.t*25))*dt*slow;e.x+=(P.x-e.x)/d*sp;e.y+=(P.y-e.y)/d*sp}
  else if(d>=ag){const hd=Math.hypot(e.hx-e.x,e.hy-e.y);if(hd>4){e.x+=(e.hx-e.x)/hd*30*dt*slow;e.y+=(e.hy-e.y)/hd*30*dt*slow}}
  if(e.worldMap&&window.worldMap?.traceMove){const end=worldMap.traceMove(origin,e);e.x=end.x;e.y=end.y;}
  if(!window.fieldEffects?.blocksAttack(e)&&window.worldMap?.state.scene!=='hub'&&d<=k.s+14&&e.cd<=0&&(!e.worldMap||!window.worldMap?.isSafe(P))){e.cd=1;window.creatureArt?.onAttack(e);const bst=bonusStats();const dodge=Math.min(.2,bst.dodge||0);if(window.combatDefense?.evading()||window.classCombat?.isDashing()||Math.random()<dodge){if(window.combatDefense)combatDefense.dodge();else fx(P.x,P.y-20,'Né','#7fffc8')}else{const v=Math.max(1,Math.round(k.at*(e.attackScale||1)*(window.fieldEffects?.attackMultiplier(e)??1)-P.r*1.5-(window.totalArmor?totalArmor(bst):(P.world?.armor||0)+(bst.armor||0))));const final=Math.max(1,Math.round(v*(window.newClassCombat?.damageTaken()||1)*(window.equipmentSystem?.damageTaken()||1)));P.hp-=final;P.med=0;fx(P.x,P.y-20,'-'+final,'#ff6a5a')}}}
 if(P.hp<=0){window.classCombat?.onRespawn();if(window.worldMap?.respawn)worldMap.respawn();else{P.x=1000;P.y=1100;}P.hp=mhp();P.gold=Math.floor(P.gold*.9);P.med=0;msg('Trọng thương! Được đưa về đài an toàn, mất một phần Linh Thạch.')}
 for(const f of X){f.l-=dt;f.y-=22*dt;f.x+=(f.vx||0)*dt}X=X.filter(f=>f.l>0);
 sv+=dt;if(sv>5){sv=0;saveCharacter()}
 hud()}
function hud(){$('rn').textContent=R[P.r]+(P.med?' · đả tọa':'');$('gd').textContent='◈ '+P.gold;
 $('hp').firstChild.style.width=P.hp/mhp()*100+'%';$('mp').firstChild.style.width=P.mp/mmp()*100+'%';window.characterProgression?.refreshHud();
 $('bb').disabled=P.r>=5||P.xp<need();$('bb').textContent='Đột Phá (B) · '+cost()+' ◈'}
// Renderer đăng ký bởi module cảnh trước khi khởi động game.
let dr;
let last=0;function tick(t){const dt=last?Math.min(.05,(t-last)/1000):0;last=t;tm+=dt;
 try{up(dt)}catch(e){showErr(e)}
 try{dr()}catch(e){showErr(e);g.setTransform(1,0,0,1,0,0);g.globalAlpha=1;g.globalCompositeOperation='source-over'}
 requestAnimationFrame(tick)}
