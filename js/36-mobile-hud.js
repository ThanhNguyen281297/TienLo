/* Two-thumb controls. Reuse the real combat/inventory buttons and their handlers. */
(function(){
  document.body.classList.add('mobile-hud');
  const input={active:false,x:0,y:0,pointerId:null};window.mobileInput=input;
  const stick=document.createElement('div');stick.id='move-joystick';stick.setAttribute('role','group');stick.setAttribute('aria-label','Joystick di chuyển');
  stick.innerHTML='<div class="stick-orbit"></div><div class="stick-cross"></div><div class="stick-thumb"></div><span>DI CHUYỂN</span>';document.body.append(stick);
  const thumb=stick.querySelector('.stick-thumb');
  function reset(){input.active=false;input.x=input.y=0;input.pointerId=null;thumb.style.transform='translate(0px,0px)';stick.classList.remove('engaged');}
  function steer(event){const box=stick.getBoundingClientRect(),radius=box.width*.31,dx=event.clientX-box.x-box.width/2,dy=event.clientY-box.y-box.height/2,length=Math.hypot(dx,dy),scale=Math.min(1,radius/(length||1));
    thumb.style.transform='translate('+dx*scale+'px,'+dy*scale+'px)';const magnitude=Math.min(1,length/radius);
    if(magnitude<.14){input.x=input.y=0;}else{const strength=(magnitude-.14)/.86;input.x=dx/(length||1)*strength;input.y=dy/(length||1)*strength;}
  }
  stick.addEventListener('pointerdown',event=>{if(input.active||paused()||worldMap.dialog.isOpen()||event.button!==0)return;event.preventDefault();event.stopPropagation();ptr=null;
    input.pointerId=event.pointerId;input.active=true;stick.classList.add('engaged');stick.setPointerCapture(event.pointerId);steer(event);
  });
  stick.addEventListener('pointermove',event=>{if(input.active&&input.pointerId===event.pointerId){event.preventDefault();steer(event);}});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(name,event=>{if(event.pointerId===input.pointerId)reset();});
  addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  document.addEventListener('focusin',event=>{if(event.target.matches('input,textarea,[contenteditable="true"]'))reset();});
  cv.addEventListener('pointerdown',event=>{if(event.pointerType==='touch'){ptr=null;event.stopImmediatePropagation();}},true);

  const wheel=document.createElement('section');wheel.id='combat-wheel';wheel.setAttribute('aria-label','Kỹ năng chiến đấu');document.body.append(wheel);wheel.append(sb,$('basic-attack'));
  const dock=$('bt'),menu=document.createElement('section');menu.id='hud-more-menu';menu.hidden=true;menu.setAttribute('aria-label','Chức năng khác');document.body.append(menu);
  const buttons=[...dock.children];for(const button of buttons)menu.append(button);
  function button(id,label,handler){const b=document.createElement('button');b.id=id;b.type='button';b.onclick=handler;b.textContent=label;return b;}
  const chat=button('hud-chat','Trò chuyện',()=>{const panel=$('online-panel');panel.classList.toggle('collapsed');$('chat-toggle').setAttribute('aria-expanded',String(!panel.classList.contains('collapsed')));if(!panel.classList.contains('collapsed'))$('chat-input').focus();});
  const more=button('hud-more','Chức năng khác',()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden));reset();});more.setAttribute('aria-expanded','false');more.setAttribute('aria-controls',menu.id);
  const map=button('hud-map','Bản đồ',()=>worldMap.openMap());menu.append(map);
  dock.append($('bag-button'),$('attr-button'),$('auto-button'),chat,more);dock.setAttribute('aria-label','Chức năng nhân vật');
  $('online-panel').classList.add('collapsed');$('chat-toggle').setAttribute('aria-expanded','false');
  function closeMenu(){menu.hidden=true;more.setAttribute('aria-expanded','false');}
  menu.addEventListener('click',event=>{if(event.target.closest('button'))closeMenu();});
  document.addEventListener('pointerdown',event=>{if(!menu.hidden&&!menu.contains(event.target)&&!more.contains(event.target))closeMenu();});
  addEventListener('keydown',event=>{if(event.key==='Escape'){reset();closeMenu();}});
  $('bs').setAttribute('aria-hidden','true');$('bs').tabIndex=-1;

  function icon(kind){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.scale(4,4);ctx.strokeStyle='#efdb9e';ctx.fillStyle='#efdb9e';ctx.lineWidth=1.65;ctx.lineCap=ctx.lineJoin='round';
    const line=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();};
    const circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();};
    if(kind==='bag'){ctx.strokeRect(8,12,16,15);line([[11,12],[11,8],[14,5],[18,5],[21,8],[21,12]]);line([[9,17],[23,17]]);line([[15,18],[15,21],[18,21],[18,18]]);}
    if(kind==='attrs'){circle(13,9,4);line([[5,26],[5,22],[9,17],[16,17],[20,21],[20,26]]);line([[23,9],[29,9]]);line([[26,6],[26,12]]);line([[24,18],[29,18]]);line([[24,23],[29,23]]);}
    if(kind==='auto'){ctx.beginPath();ctx.arc(16,16,11,-2.8,-.25);ctx.stroke();ctx.beginPath();ctx.arc(16,16,11,.3,2.8);ctx.stroke();line([[24,5],[27,14],[20,11]]);line([[8,27],[5,18],[12,21]]);line([[12,21],[16,11],[20,21]]);line([[14,17],[18,17]]);}
    if(kind==='chat'){line([[5,6],[27,6],[27,22],[15,22],[8,28],[8,22],[5,22],[5,6]]);line([[10,12],[22,12]]);line([[10,17],[18,17]]);}
    if(kind==='more'){for(const x of [8,16,24]){ctx.beginPath();ctx.arc(x,16,2,0,Math.PI*2);ctx.fill();}}
    if(kind==='map'){line([[5,8],[12,5],[21,9],[27,6],[27,24],[21,27],[12,23],[5,26],[5,8]]);line([[12,5],[12,23]]);line([[21,9],[21,27]]);}
    if(kind==='meditate'){circle(16,7,3);line([[16,11],[16,19],[8,25],[24,25],[16,19]]);line([[16,14],[10,18],[5,18]]);line([[16,14],[22,18],[27,18]]);}
    if(kind==='realm'){line([[5,25],[27,25]]);line([[9,22],[9,17],[23,17],[23,22]]);line([[7,15],[16,10],[25,15]]);line([[11,10],[16,5],[21,10]]);line([[16,5],[16,2]]);}
    if(kind==='break'){line([[8,26],[16,18],[24,26]]);line([[8,18],[16,10],[24,18]]);line([[8,10],[16,2],[24,10]]);}
    if(kind==='gm'){line([[6,25],[26,25],[27,10],[21,16],[16,6],[11,16],[5,10],[6,25]]);}
    if(kind==='pet'){circle(16,21,6);for(const [x,y]of [[7,11],[14,6],[22,8],[27,15]])circle(x,y,2.5);}
    if(kind==='enhance'){line([[6,26],[25,7],[20,3],[2,21],[6,26]]);line([[15,20],[22,27],[28,21],[21,14]]);}
    if(kind==='attack'){ctx.fillStyle='#e7cf8b';ctx.beginPath();ctx.moveTo(7,4);ctx.lineTo(15,8);ctx.lineTo(24,20);ctx.lineTo(20,24);ctx.lineTo(8,15);ctx.closePath();ctx.fill();line([[17,24],[24,17]]);line([[21,22],[27,28]]);line([[24,29],[29,24]]);}
    return 'url("'+canvas.toDataURL()+'")';
  }
  const labels={'bag-button':['Túi đồ','bag'],'attr-button':['Thuộc tính','attrs'],'auto-button':['Auto','auto'],'hud-chat':['Chat','chat'],'hud-more':['Khác','more'],'bq':['Đả tọa','meditate'],'bb':['Đột phá','break'],'cultivation-info':['Tu luyện','realm'],'gm-skills':['GM','gm'],'hud-map':['Bản đồ','map'],'basic-attack':['Đánh','attack'],'pet-button':['Linh thú','pet'],'enhance-button':['Cường hóa','enhance']};
  for(const [id,[label,kind]]of Object.entries(labels)){const b=$(id);if(!b)continue;b.dataset.hudLabel=label;b.setAttribute('aria-label',id==='basic-attack'?'Đánh thường':label);b.style.setProperty('--hud-icon',icon(kind));b.classList.add('hud-icon');}
  function refresh(){const ready=!!P.ap&&account.state.ready&&cr.style.display==='none'&&ttl.style.display==='none';document.body.classList.toggle('game-controls-ready',ready);document.body.classList.toggle('controls-paused',worldMap.dialog.isOpen());
    if(!ready||paused()||worldMap.dialog.isOpen()){reset();closeMenu();}
    const attacking=!!cultivation.basicSelection?.().attacking;$('basic-attack').setAttribute('aria-pressed',String(attacking));$('auto-button').setAttribute('aria-pressed',String(autoCombat.state.enabled));
    const combat=getClassCombatSafe();[...sb.children].forEach((b,i)=>{const cd=Math.max(0,combat.state.cooldown?.[i]||0);b.dataset.cooldown=cd>.05?String(Math.ceil(cd)):'';});
  }
  const update=up;up=function(dt){if(paused()||worldMap.dialog.isOpen())reset();update(dt);refresh();};
  const create=$('ok').onclick;$('ok').onclick=function(...args){const result=create(...args);refresh();return result;};
  for(const name of ['show','close']){const original=worldMap.dialog[name];worldMap.dialog[name]=function(...args){const result=original(...args);refresh();return result;};}
  addEventListener('tienlo-auth',refresh);
  const respawn=classCombat.onRespawn;classCombat.onRespawn=function(...args){reset();return respawn(...args);};
  window.mobileHUD={input,reset,refresh,closeMenu};refresh();
})();
