/* Browsers require a user gesture for fullscreen/orientation; native Android
   starts in sensor-landscape. Portrait remains playable when the API is absent. */
(function(){
 const touch=matchMedia('(pointer:coarse)'),portrait=matchMedia('(orientation:portrait)'),native=/TienLoAndroid\//.test(navigator.userAgent),state={dismissed:false,busy:false,locked:false};
 const button=document.createElement('button');button.id='mobile-screen-button';button.type='button';button.className='hud-icon';button.innerHTML='<span class="screen-symbol" aria-hidden="true">▱</span>';button.setAttribute('aria-label','Chơi ngang / Toàn màn hình');$('hud-more-menu').append(button);
 const hint=document.createElement('aside');hint.id='landscape-hint';hint.hidden=true;hint.setAttribute('aria-label','Chế độ màn hình');hint.innerHTML='<b>Chơi ngang để nhìn rộng hơn</b><p id="landscape-help">Mở toàn màn hình và xoay ngang để dễ di chuyển, ngắm kỹ năng.</p><div><button type="button" id="landscape-play">Chơi ngang</button><button type="button" id="landscape-dismiss">Tiếp tục màn hình dọc</button></div>';document.body.append(hint);
 function editing(){return !!document.activeElement?.matches('input,textarea,[contenteditable=true]');}
 let previousHeight=0;
 function refresh(){const full=!!document.fullscreenElement;button.hidden=!touch.matches||native;button.dataset.hudLabel=full?'Thu nhỏ':'Chơi ngang';button.title=full?'Thoát toàn màn hình':'Chơi ngang / Toàn màn hình';button.setAttribute('aria-label',button.title);const height=window.visualViewport?.height||innerHeight;if(height!==previousHeight){document.documentElement.style.setProperty('--screen-height',height+'px');previousHeight=height;}document.body.classList.toggle('keyboard-active',touch.matches&&editing());hint.hidden=native||!touch.matches||!portrait.matches||state.dismissed||!P.ap||!account.state.ready||worldMap.dialog.isOpen()||editing();}
 async function enter(){if(state.busy)return;state.busy=true;mobileHUD.reset();K={};ptr=null;
  let locked=false;try{if(!document.fullscreenElement&&document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen({navigationUI:'hide'});}catch(e){/* The user may still rotate the phone manually. */}
  try{if(screen.orientation?.lock){await screen.orientation.lock('landscape');locked=true;}}catch(e){/* Safari and restricted browsers retain the responsive layout. */}
  state.locked=locked;state.busy=false;if(!locked)$('landscape-help').textContent='Nếu màn hình chưa xoay, hãy xoay điện thoại ngang hoặc bật tự động xoay trên máy.';rs();refresh();return{locked,fullscreen:!!document.fullscreenElement};
 }
 button.onclick=async()=>{if(document.fullscreenElement){screen.orientation?.unlock?.();state.locked=false;await document.exitFullscreen().catch(()=>{});refresh();}else await enter();};$('landscape-play').onclick=enter;$('landscape-dismiss').onclick=()=>{state.dismissed=true;refresh();};
 for(const event of ['resize','orientationchange','fullscreenchange','tienlo-auth'])addEventListener(event,refresh);document.addEventListener('focusin',()=>{mobileHUD.reset();refresh();});document.addEventListener('focusout',()=>setTimeout(refresh,0));window.visualViewport?.addEventListener('resize',refresh);
 const update=up;up=function(dt){update(dt);refresh();};window.mobileScreen={enter,refresh,state,native};refresh();
})();
