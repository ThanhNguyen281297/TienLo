/* Character EXP and cultivation are separate currencies. Level gains never
   consume the saved cultivation progress used by the breakthrough system. */
(function(){
 const MAX_LEVEL=200;
 const required=level=>{const n=Math.max(1,Math.min(MAX_LEVEL,Math.floor(level)))-1;return 100+45*n+12*n*n;};
 function normalize(player=P){
  if(player.level===undefined)player.level=Math.min(MAX_LEVEL,Math.max(1,(player.r||0)*10+(player.stage||1)));
  player.levelXp??=0;return player;
 }
 function gain(amount){
  if(!Number.isFinite(amount)||amount<=0)return;
  normalize();amount=Math.floor(amount);P.xp=Math.min(need()*3,P.xp+amount);
  const before=P.level,health=mhp(),mana=mmp();
  P.levelXp+=amount;
  while(P.level<MAX_LEVEL&&P.levelXp>=required(P.level)){P.levelXp-=required(P.level);P.level++;}
  if(P.level===MAX_LEVEL)P.levelXp=0;
  if(P.level>before){
   if(P.hp>0)P.hp=Math.min(mhp(),P.hp+mhp()-health);P.mp=Math.min(mmp(),P.mp+mmp()-mana);
   fx(P.x,P.y-52,'Cấp '+P.level,'#ffe2a0');msg('Lên cấp '+P.level+' · Tu vi '+(window.cultivation?.realmName()||R[P.r]));
   dispatchEvent(new CustomEvent('tienlo-level-up',{detail:{from:before,to:P.level}}));
  }
  saveCharacter();refreshHud();
 }
 const bar=document.createElement('div');bar.id='cultivation-progress';bar.className='bar';bar.innerHTML='<i></i>';$('xp').after(bar);
 const style=document.createElement('style');style.textContent='#cultivation-progress{height:4px;margin-top:3px}#cultivation-progress i{display:block;height:100%;background:linear-gradient(90deg,#7b85df,#c6b2ff)}#xp i{background:linear-gradient(90deg,#51ad7f,#b6ed8f)}';document.head.append(style);
 function refreshHud(){
  normalize();const cap=P.level>=MAX_LEVEL,n=required(P.level);
  $('xp').firstChild.style.width=(cap?100:P.levelXp/n*100)+'%';$('xp').title='EXP cấp nhân vật';
  bar.firstChild.style.width=Math.min(100,P.xp/need()*100)+'%';bar.title='Tu vi tích lũy để tăng tầng / đột phá';
  $('st').textContent=(cap?'Cấp '+P.level+' · Tối đa':'Cấp '+P.level+' · EXP '+P.levelXp.toLocaleString('vi-VN')+'/'+n.toLocaleString('vi-VN'))+' · Tu vi '+Math.floor(P.xp).toLocaleString('vi-VN')+'/'+need().toLocaleString('vi-VN');
 }
 window.characterProgression={MAX_LEVEL,required,normalize,gain,refreshHud};
})();
