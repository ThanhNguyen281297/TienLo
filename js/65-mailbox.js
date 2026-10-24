/* Hòm thư: every server mail (raid / battle chests, leaderboard prizes, auction
   deliveries, top-up notices, gifts) in one panel, claim one or all. Also exposes
   window.addActivity for the round HUD icons used by Kỳ Trân Các. */
(function(){
 const ui=visualUI,d=worldMap.dialog,hud=window.vlHud,TITLE='Hòm thư';
 const state={data:null,busy:false,polling:false};
 // ---------- shared helper: a round activity icon in the VLTK strip
 window.addActivity=function(a){if(!hud)return null;const b=document.createElement('button');b.type='button';b.className='vl-activity';b.dataset.id=a.id;b.setAttribute('aria-label',a.label);
  const c=document.createElement('canvas');c.width=c.height=96;const badge=document.createElement('i');badge.hidden=true;b.append(c,badge,ui.node('span','',a.label));
  b.onclick=()=>{if(!paused())a.run();};Object.assign(a,{img:a.src?hud.art(a.src):null,button:b,canvas:c,badgeEl:badge});hud.ACTIVITIES.push(a);$('vl-activities')?.append(b);return a;};
 const fmt=n=>Number(n||0).toLocaleString('vi-VN');
 const when=t=>{const s=Date.now()/1000-t;return s<3600?Math.max(1,Math.round(s/60))+' phút trước':s<86400?Math.round(s/3600)+' giờ trước':Math.round(s/86400)+' ngày trước';};
 async function refresh(){if(state.polling||!P.ap||!account.state.ready)return;state.polling=true;try{state.data=await account.api('/api/mail');render();}catch{}finally{state.polling=false;}}
 async function act(action,id){if(state.busy)return;state.busy=true;try{const r=await account.transact('/api/mail',{action,id},{live:true,gold:true,world:['essence','equip','mounts']});state.data=r.mail;msg(r.message||'Đã nhận thư.');window.gameAudio?.play?.('reward');}
  catch(e){msg(e.message);}finally{state.busy=false;render();}}
 function open(){if(!P.ap||paused())return;d.show(TITLE,'Phần thưởng gửi qua thư được giữ ở đây cho tới khi bạn nhận.');$('world-content').closest('section')?.classList.add('visual-dialog');render();refresh();}
 function render(){const root=$('world-content');if(!root||$('world-title').textContent!==TITLE)return;root.replaceChildren();
  const data=state.data;if(!data){root.append(ui.node('p','world-line','Đang mở hòm thư…'));return;}
  const bar=ui.node('div','mail-bar');root.append(bar);bar.append(ui.node('span','',data.unread?data.unread+' thư chưa nhận':'Không có thư mới'));
  if(data.unread)ui.action(bar,'Nhận tất cả',()=>act('claim_all'),state.busy);
  const list=ui.node('div','mail-list');root.append(list);
  if(!data.mails.length)list.append(ui.node('p','world-line','Hòm thư trống.'));
  for(const m of data.mails){const row=ui.node('article','mail-row'+(m.claimed?' read':''));list.append(row);
   row.append(ui.node('b','mail-icon',m.claimed?'✉':'📜'));const body=ui.node('div','mail-body');row.append(body);
   body.append(ui.node('h4','',m.title),ui.node('p','',m.text),ui.node('small','',when(m.created)));
   if(m.claimed)row.append(ui.node('span','mail-done','Đã nhận'));else ui.action(row,'Nhận',()=>act('claim',m.id),state.busy);}
 }
 const icon=window.addActivity({id:'mail',label:'Hòm thư',src:'Item/KyTran/nguyet-tap.png',run:open,badge:()=>state.data?.unread||0});
 // Painted envelope instead of the card art.
 if(icon){icon.img=null;const c=icon.canvas,x=c.getContext('2d');const draw=()=>{hud.paint(c,null);x.save();x.translate(48,50);x.fillStyle='#f6e7c0';x.strokeStyle='#6b4a1a';x.lineWidth=3;x.beginPath();x.roundRect(-22,-15,44,30,4);x.fill();x.stroke();x.beginPath();x.moveTo(-22,-13);x.lineTo(0,4);x.lineTo(22,-13);x.stroke();x.fillStyle='#c8402f';x.beginPath();x.arc(0,4,5,0,Math.PI*2);x.fill();x.restore();};icon.painted='ok';setTimeout(draw,50);setTimeout(draw,1500);}
 addEventListener('tienlo-auth',()=>{state.data=null;setTimeout(refresh,1500);});
 setInterval(()=>{if(!paused())refresh();},30000);setTimeout(refresh,4000);
 const css=document.createElement('style');css.textContent=`
.mail-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:6px 0 10px;color:#e8d8b0;font-size:13px}
.mail-list{display:grid;gap:8px;max-height:60vh;overflow:auto}
.mail-row{display:flex;align-items:center;gap:10px;padding:10px;border-radius:10px;border:1px solid #b8925066;background:linear-gradient(160deg,#1b2b30f0,#121c20f0)}
.mail-row.read{opacity:.6}.mail-icon{font-size:22px;flex:none}.mail-body{flex:1;min-width:0}.mail-body h4{margin:0 0 2px;font-size:14px;color:#ffe3a8}
.mail-body p{margin:0;font-size:12px;color:#c9d6cf;line-height:1.35}.mail-body small{font-size:10px;color:#8fa6a6}.mail-done{font-size:11px;color:#8fd6a5}`;document.head.append(css);
 window.mailbox={state,open,refresh};
})();
