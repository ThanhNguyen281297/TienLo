/* Desktop HUD and screen-space safety (graphics pass 3).
   - Mouse + keyboard devices get their own layout: no thumb joystick, the four
     skills, basic attack and pet sit on one horizontal action bar bottom-right with
     their keys printed (1-4, F). Touch devices keep the two-thumb wheel unchanged.
   - The camera never lets the player slide under the bottom HUD or the top bar
     when a map edge clamps it (dashes to the edge used to hide the character).
   - The world event pill docks under the minimap on desktop instead of covering
     boss names in the middle of the screen.
   - Welfare opens by itself at most once per day per device. */
(function(){
 'use strict';
 const desk=matchMedia('(hover:hover) and (pointer:fine)');
 const apply=()=>{document.body.classList.toggle('desk-hud',desk.matches);document.body.classList.toggle('touch-hud',!desk.matches);if(typeof rs==='function')rs();};
 desk.addEventListener?.('change',apply);apply();

 // ---------- key labels on the desktop action bar
 // R = pet skill, G = shield buff: the two round buttons had no keyboard shortcut.
 const keyOf={'pet-skill':'R','shield-skill':'G'};
 for(const [id,key] of Object.entries(keyOf)){const b=$(id);if(b)b.dataset.key=key;}
 addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||e.target.closest?.('input,textarea,select,[contenteditable="true"]')||paused()||worldMap.dialog.isOpen())return;
  const id=e.code==='KeyR'?'pet-skill':e.code==='KeyG'?'shield-skill':null,b=id&&$(id);if(b&&!b.disabled&&!b.hidden&&b.offsetParent){e.preventDefault();b.click();}});

 // (interaction hint: js/17 prints the key "E" only for keyboard + mouse)

 // ---------- camera keeps the player inside the safe area
 const view=gameCamera;
 gameCamera=function(vw=W/Z,vh=H/Z){
  const cam=view(vw,vh);if(!cam||!P.ap)return cam;
  const unit=(W/innerWidth)/Z,bottom=(desk.matches?118:150)*unit,top=96*unit;
  if(vh>bottom+top+80){const y=Math.max(Math.min(cam.y,P.y-top-30*unit),P.y-(vh-bottom));if(y!==cam.y)return {...cam,y};}
  return cam;
 };

 // ---------- gold corner flourishes on framed panels (styled in css/xianxia-ui.css)
 function corners(el){if(!el||el.querySelector(':scope>.xx-corner'))return;for(const k of ['tl','tr','bl','br']){const c=document.createElement('i');c.className='xx-corner '+k;c.setAttribute('aria-hidden','true');el.prepend(c);}}
 const frame=()=>{corners(document.querySelector('#world-dialog>section'));corners(document.querySelector('#cr .pn'));corners(document.querySelector('.account-card'));};
 frame();new MutationObserver(frame).observe(document.body,{childList:true});

 // ---------- welfare popup: opens by itself at most once a day per device
 const today=()=>new Date(Date.now()+7*3600e3).toISOString().slice(0,10);
 let seen='',lastInput=-1e9;try{seen=localStorage.getItem('tienlo.welfareSeen')||'';}catch{}
 for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{lastInput=performance.now();},true);
 const dialog=worldMap.dialog,show=dialog.show;
 dialog.show=function(title,...rest){
  if(title==='Phúc lợi'&&performance.now()-lastInput>1500){if(seen===today())return;seen=today();try{localStorage.setItem('tienlo.welfareSeen',seen);}catch{}}
  const result=show.call(this,title,...rest);frame();return result;
 };

 const css=document.createElement('style');css.id='desktop-hud-css';css.textContent=`
body.desk-hud #move-joystick{display:none!important}
body.desk-hud #combat-wheel{width:404px!important;height:84px!important;right:18px!important;bottom:14px!important;
 border-radius:18px;background:linear-gradient(180deg,#0e1c24cc,#08121acc);border:1px solid #c9a96066;box-shadow:0 6px 22px #0008,inset 0 1px #f3e3b422;pointer-events:auto}
body.desk-hud #combat-wheel::before{content:'';position:absolute;left:10px;right:10px;top:-1px;height:2px;background:linear-gradient(90deg,transparent,#e8c77a,transparent);opacity:.7}
body.desk-hud #combat-wheel #sb .sk{width:58px!important;height:58px!important;top:13px!important;border-radius:14px!important}
body.desk-hud #combat-wheel #sb .ic{border-radius:12px!important}
body.desk-hud #combat-wheel #sb .sk:nth-child(1){left:12px!important}
body.desk-hud #combat-wheel #sb .sk:nth-child(2){left:76px!important}
body.desk-hud #combat-wheel #sb .sk:nth-child(3){left:140px!important}
body.desk-hud #combat-wheel #sb .sk:nth-child(4){left:204px!important}
body.desk-hud #combat-wheel #sb .sk small{right:auto!important;left:5px!important;top:3px!important;font:700 11px Arial!important;color:#ffe9b0!important;background:#0a141cc0;border-radius:4px;padding:0 4px;line-height:14px}
body.desk-hud #combat-wheel #sb .sk u{border-radius:0 0 12px 12px!important}
body.desk-hud #combat-wheel #sb .sk.lk::after{border-radius:12px!important}
body.desk-hud #combat-wheel #basic-attack{left:276px!important;top:6px!important;width:72px!important;height:72px!important}
body.desk-hud #combat-wheel #pet-skill{left:354px!important;top:17px!important;width:44px!important;height:44px!important;right:auto!important;bottom:auto!important}
body.desk-hud #combat-wheel #shield-skill{left:354px!important;top:-52px!important;width:44px!important;height:44px!important}
body.desk-hud #combat-wheel #pet-skill::after,body.desk-hud #combat-wheel #shield-skill::after{content:attr(data-key);position:absolute;left:-3px;top:-4px;font:700 10px Arial;color:#ffe9b0;background:#0a141c;border:1px solid #c9a96088;border-radius:4px;padding:0 3px;line-height:13px}
body.desk-hud #basic-attack::after{content:'Đánh · F'!important}
body.desk-hud #event-banner{top:auto!important;bottom:122px!important;left:8px!important;right:auto!important;transform:none!important;max-width:260px;font-size:11px!important;padding:4px 10px!important;border-radius:10px!important;text-align:left}
body.desk-hud #vl-guide{bottom:110px!important}
body.desk-hud #bt{bottom:14px!important}
body.desk-hud #vl-chat-ticker{bottom:104px!important}
@media(orientation:landscape) and (max-height:520px){
 body.touch-hud #event-banner{top:calc(env(safe-area-inset-top,0px) + 124px)!important;left:12px!important;right:auto!important;transform:none!important;max-width:168px;font-size:9px!important;padding:2px 8px!important;border-radius:8px!important;opacity:.92}
 body.touch-hud #log{top:58px!important;left:50%!important;transform:translateX(-50%);width:44vw!important;max-width:44vw!important;text-align:center;font-size:10.5px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
}
`;document.head.append(css);
 window.desktopHud={desk,apply};
})();
