/* Tân thủ: the first ~10 minutes, one step at a time.
   A small card above the action dock shows the current step with progress and a
   ➤ button (auto-walk / open the right panel); the HUD button involved pulses.
   Steps are read from real game state, so they also complete when done another way.
   Veterans (level 25+) and players who finished or dismissed it never see it. */
(function(){
 const ui=visualUI,world=worldMap;
 const store=()=>'tienlo-guide-'+(account.state.user?.id||'x');
 const read=()=>{try{return JSON.parse(localStorage.getItem(store())||'{}');}catch{return{};}};
 const write=v=>{try{localStorage.setItem(store(),JSON.stringify(v));}catch{}};
 const tut=k=>window.adventureGame?.state?.data?.tutorial?.[k]||0;
 const kills=()=>world.progress?.().kills||0;
 const rift=()=>expeditionsGame?.maps?.get('rift-wood');
 const quest=id=>window.adventureGame?.state?.data?.quests?.find(q=>q.id===id);
 const STEPS=[
  // The story starts with Vân Châu: the guide follows the first main quest instead of competing with it.
  {id:'awaken',icon:'✦',text:()=>quest('awakening')?.ready?'Gặp Vân Châu báo cáo nhiệm vụ':'Dạo quanh quảng trường rồi gặp Vân Châu',progress:()=>{const q=quest('awakening');return q?[q.value,q.target]:null;},
   done:()=>{if(!window.adventureGame?.state?.data)return false;const q=quest('awakening');return !q||q.claimed;},go:()=>questNav.go({map:'hub',npc:'quest',name:'Thiên Vân Thành'},'Gặp Vân Châu'),target:null},
  {id:'hunt',icon:'⚔',text:()=>'Ra Sơn Hà săn yêu thú',progress:()=>[Math.min(5,kills()),5],done:()=>kills()>=5,
   go:()=>questNav.go({map:'field-meadow',x:440,y:1320,auto:true},'Săn yêu thú'),target:null},
  {id:'bag',icon:'🎒',text:()=>'Mở Túi đồ, mặc trang bị vừa nhặt',done:()=>tut('ui:bag')>0,go:()=>$('bag-button')?.click(),target:'bag-button'},
  {id:'attrs',icon:'✚',text:()=>'Cộng điểm Thuộc tính',done:()=>tut('ui:attrs')>0,go:()=>$('attr-button')?.click(),target:'attr-button'},
  {id:'level',icon:'⬆',text:()=>'Đạt cấp 10 để mở chiêu đầu tiên',progress:()=>[Math.min(10,characterLevel()),10],done:()=>characterLevel()>=10,
   go:()=>{if(!autoCombat.state.enabled)autoCombat.toggle(true);if(world.state.scene==='hub'||world.isSectMap?.(world.state.scene))questNav.go({map:'field-meadow',x:440,y:1320,auto:true},'Luyện cấp');},target:'auto-button'},
  {id:'rift',icon:'🌀',text:()=>'Vào Bí Cảnh đầu tiên: '+(rift()?.name||'Thanh Mộc Linh Cảnh'),done:s=>!!s.rift,
   go:()=>{const r=rift();if(!r)return;if(world.state.scene==='hub'&&Math.hypot(P.x-r.portal.x,P.y-r.portal.y)<90)return expeditionsGame.show('rift-wood');questNav.go({map:'hub',x:r.portal.x,y:r.portal.y+20,auto:false},'Cổng Bí Cảnh');},target:'rift'},
 ];
 const card=document.createElement('aside');card.id='vl-guide';card.hidden=true;card.setAttribute('aria-live','polite');
 const icon=ui.node('b','vl-guide-icon',''),body=ui.node('div','vl-guide-body'),title=ui.node('small','','TÂN THỦ'),text=ui.node('span','',''),bar=ui.node('i','vl-guide-bar','');
 const go=document.createElement('button');go.type='button';go.className='vl-guide-go';go.textContent='➤';go.setAttribute('aria-label','Làm ngay');
 const close=document.createElement('button');close.type='button';close.className='vl-guide-close';close.textContent='✕';close.setAttribute('aria-label','Ẩn hướng dẫn');
 body.append(title,text,bar);card.append(icon,body,go,close);document.body.append(card);
 let current=null,lit=null;
 close.onclick=()=>{const s=read();s.dismissed=true;write(s);card.hidden=true;light(null);};
 go.onclick=()=>{if(current&&!paused())current.go();};
 function light(id){const el=id==='rift'?document.querySelector('.vl-activity[data-id="rift"]'):id?$(id):null;if(lit&&lit!==el)lit.classList.remove('vl-pulse');if(el)el.classList.add('vl-pulse');lit=el;}
 function update(){
  if(!P.ap||!account.state.ready||paused()){card.hidden=true;light(null);return;}
  const s=read();if(world.state.scene.startsWith('rift-')&&!s.rift){s.rift=true;write(s);}
  if(s.dismissed||s.finished||characterLevel()>=25){card.hidden=true;light(null);return;}
  const step=STEPS.find(st=>!st.done(s));
  if(!step){s.finished=true;write(s);current=null;card.hidden=false;card.classList.add('done');icon.textContent='✦';title.textContent='TÂN THỦ';text.textContent='Hoàn thành! Ghé Phúc lợi nhận quà mỗi ngày.';bar.style.width='100%';go.hidden=true;light(null);
   setTimeout(()=>{card.hidden=true;},8000);window.gameAudio?.play('chest');return;}
  if(step!==current&&current)window.gameAudio?.play('pickup');
  current=step;card.hidden=world.dialog.isOpen();card.classList.remove('done');go.hidden=false;
  const index=STEPS.indexOf(step)+1;title.textContent='TÂN THỦ '+index+'/'+STEPS.length;icon.textContent=step.icon;
  const pr=step.progress?.();text.textContent=step.text()+(pr?' ('+pr[0]+'/'+pr[1]+')':'');bar.style.width=(pr?pr[0]/pr[1]*100:0)+'%';
  light(card.hidden?null:step.target);
 }
 setInterval(update,500);
 const css=document.createElement('style');css.textContent=`
#vl-guide{position:fixed;left:50%;bottom:calc(92px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);z-index:5;display:flex;align-items:center;gap:8px;max-width:min(440px,calc(100vw - 32px));padding:6px 6px 6px 8px;border-radius:12px;border:1px solid #d6aa52aa;background:linear-gradient(90deg,#1b2a30f2,#22343af2);box-shadow:0 4px 14px #0009;color:#f3e3b4}
#vl-guide[hidden]{display:none}#vl-guide.done{border-color:#ffd27a;box-shadow:0 0 18px #ffb84a66}
.vl-guide-icon{flex:none;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 40% 30%,#ffe7a0,#b07a22);color:#2a1800;font:900 15px Arial}
.vl-guide-body{display:grid;gap:2px;min-width:0;flex:1}.vl-guide-body small{font:800 9px Arial;letter-spacing:.08em;color:#d6aa52}.vl-guide-body span{font:600 12px Arial;color:#fff3d0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vl-guide-bar{display:block;height:3px;border-radius:2px;background:linear-gradient(90deg,#c9a14a,#ffe7a0);width:0;transition:width .3s}
.vl-guide-go{flex:none;width:34px;height:34px;padding:0;border-radius:50%;border:1px solid #ffd27a;background:#5a3a12;color:#ffe7a0;font:800 14px Arial;min-height:0!important}
.vl-guide-close{flex:none;width:22px;height:22px;padding:0;border:0;background:none;color:#9fb7b0;font:12px Arial;min-height:0!important}
.vl-pulse{outline:2px solid #ffd27a!important;outline-offset:2px}
@media(prefers-reduced-motion:no-preference){.vl-pulse{animation:vl-pulse 1.1s ease-in-out infinite}@keyframes vl-pulse{50%{outline-color:#ffd27a33}}}
@media(max-height:500px){#vl-guide{bottom:calc(70px + env(safe-area-inset-bottom,0px))}}`;
 document.head.append(css);
 window.newbieGuide={STEPS,update,reset:()=>write({})};
})();
