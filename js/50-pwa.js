/* Installable game ("Thêm vào màn hình chính") and event notifications.
   - Chrome/Edge/Android: the browser's install prompt is offered from the ⚙ menu
     and once after the first login.
   - iOS Safari: a short how-to (Chia sẻ → Thêm vào MH chính).
   - 🔔 notifications: when the tab is in the background, event starts, party raids
     and full offline cultivation are announced with a system notification. */
(function(){
 let deferred=null;const badge=$('account-badge');
 const isStandalone=()=>matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
 const box=document.createElement('div');box.id='vl-app-actions';
 const install=document.createElement('button');install.type='button';install.textContent='📲 Cài game';install.hidden=true;
 const notify=document.createElement('button');notify.type='button';
 box.append(install,notify);(badge||document.body).append(box);
 addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;install.hidden=isStandalone();});
 addEventListener('appinstalled',()=>{deferred=null;install.hidden=true;msg('Đã cài Tiên Lộ vào màn hình chính.');});
 if(isIOS&&!isStandalone())install.hidden=false;
 install.onclick=async()=>{if(deferred){deferred.prompt();await deferred.userChoice.catch(()=>null);deferred=null;install.hidden=true;return;}
  if(isIOS)worldMap.dialog.show('Cài Tiên Lộ','Trên iPhone/iPad: bấm nút Chia sẻ của Safari ⟶ "Thêm vào MH chính". Game sẽ mở toàn màn hình như ứng dụng.');};

 const supported='Notification' in window;
 function paintNotify(){if(!supported){notify.hidden=true;return;}const p=Notification.permission;notify.textContent=p==='granted'?'🔔 Thông báo: bật':p==='denied'?'🔕 Thông báo bị chặn':'🔔 Bật thông báo';notify.disabled=p==='denied';}
 notify.onclick=async()=>{if(!supported)return;if(Notification.permission==='default'){await Notification.requestPermission();}paintNotify();if(Notification.permission==='granted')send('Tiên Lộ','Bạn sẽ nhận thông báo sự kiện khi game chạy nền.',true);};
 paintNotify();
 function send(title,body,force=false){if(!supported||Notification.permission!=='granted'||(!document.hidden&&!force))return;try{const n=new Notification(title,{body,icon:'Character/App/icon-192.png',tag:'tienlo-'+title,renotify:false});n.onclick=()=>{focus();n.close();};}catch{}}
 // Announcements already go through msg(): forward the important ones while hidden.
 const baseMsg=msg;msg=function(s){baseMsg(s);const t=String(s);if(/^⚡ Sự kiện bắt đầu/.test(t))send('Sự kiện Tiên Lộ',t.replace(/^⚡ /,''));else if(/^⚔ Tổ đội đã mở/.test(t))send('Huyết Trì Ma Quật',t.replace(/^⚔ /,''));else if(/Chiến thắng|Ma Long cuồng nộ/.test(t))send('Ma Quật',t);};
 let warned=false;setInterval(()=>{const o=window.engagementGame?.state.data?.offline;if(o&&o.seconds>=o.cap-60&&!warned){warned=true;send('Bế quan đã đầy','Vào nhận tu vi bế quan kẻo phí thời gian.');}},60000);

 // First login on a phone: suggest installing once.
 let suggested=false;try{suggested=localStorage.getItem('tienlo-install-suggested')==='1';}catch{}
 setInterval(()=>{if(suggested||!deferred||isStandalone()||!P.ap||paused()||worldMap.dialog.isOpen())return;if(!matchMedia('(pointer:coarse)').matches)return;suggested=true;try{localStorage.setItem('tienlo-install-suggested','1');}catch{}
  worldMap.dialog.show('Cài Tiên Lộ lên điện thoại','');const c=$('world-content');c.append(visualUI.node('p','world-line','Mở game toàn màn hình, vào nhanh hơn từ màn hình chính.'));worldMap.dialog.action('📲 Cài ngay',()=>{worldMap.dialog.close();install.onclick();});},5000);

 const css=document.createElement('style');css.textContent=`#vl-app-actions{display:flex;flex-direction:column;gap:6px;margin-top:6px;width:100%}#vl-app-actions button{font:600 12px Arial;padding:7px 10px;border-radius:8px;min-height:0}#vl-app-actions button[hidden]{display:none}body.vl-hud #account-badge.vl-open{flex-wrap:wrap;max-width:220px}`;document.head.append(css);
 window.gameApp={send,install:()=>install.onclick(),get installable(){return !!deferred;}};
})();
