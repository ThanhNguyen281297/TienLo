/* Tài khoản + bản lưu SQLite: một nhân vật cho mỗi tài khoản, không lưu TXT/localStorage. */
(function () {
  const state = { user: null, csrf: null, revision: 0, character: null, ready: false, restoring: false, conflict: false };
  let timer, saving = false, pending = false;
  const saveWaiters=[];
  const panel = document.createElement('div'); panel.id = 'account-screen';
  panel.innerHTML = `<form class="account-card"><span class="account-kicker">TIÊN LỘ · ONLINE</span><h1>Hành trình bất tận</h1><p>Bước vào tiên giới. Gặp đạo hữu. Viết nên truyền thuyết của bạn.</p><div class="account-tabs"><button type="button" data-mode="login" class="active">Đăng nhập</button><button type="button" data-mode="register">Đăng ký</button></div><label>TÊN ĐĂNG NHẬP<input id="account-name" autocomplete="username" minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]+" required placeholder="Đạo hữu của tiên giới"></label><label>MẬT KHẨU<input id="account-password" type="password" autocomplete="current-password" minlength="10" maxlength="128" required placeholder="Tối thiểu 10 ký tự"></label><button class="account-submit" type="submit">Đăng nhập →</button><p id="account-error" role="status" aria-live="polite"></p><small>Mỗi tài khoản có một nhân vật. Tiến trình lưu trên server.</small></form>`;
  document.body.append(panel);
  const badge=document.createElement('div');badge.id='account-badge';badge.hidden=true;
  const username=document.createElement('span'), logout=document.createElement('button');logout.textContent='Đăng xuất';badge.append(username,logout);document.body.append(badge);
  const notice=document.createElement('p');notice.id='db-status';notice.textContent='Tạo nhân vật gắn với tài khoản. Tiến trình tự lưu trên server.';cr.querySelector('.pn').append(notice);
  let mode='login';const form=panel.querySelector('form'),submit=panel.querySelector('.account-submit'),error=$('account-error');
  for(const tab of panel.querySelectorAll('[data-mode]'))tab.onclick=()=>{mode=tab.dataset.mode;panel.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b===tab));submit.textContent=mode==='login'?'Đăng nhập →':'Tạo tài khoản →';$('account-password').autocomplete=mode==='login'?'current-password':'new-password';error.textContent='';};
  async function api(path,data,options={}) {
    const response=await fetch(path,{credentials:'same-origin',...options,...(data!==undefined?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,csrf:state.csrf})}:{})});
    let body;try{body=await response.json();}catch{throw new Error('Không kết nối được server game. Chạy python server.py để chơi.');}
    if(!response.ok){const e=new Error(body.error||'Kết nối thất bại.');e.status=response.status;e.conflict=body.conflict;throw e;}
    return body;
  }
  function restore(character){
    state.restoring=true;
    try {
      const saved=structuredClone(character.player),sx=saved.x,sy=saved.y;
      classCombat.onRespawn();window.basicCombat?.reset();window.autoCombat?.toggle(false);
      for(const key of Object.keys(P))delete P[key];Object.assign(P,{x:1000,y:1100,hp:100,mp:20,xp:0,r:0,stage:1,gold:0,f:1,med:0,acd:0,scd:0,sl:0,mv:false,dir:0,ap:null,nm:''},saved);
      characterProgression.normalize(P);
      K={};ptr=null;cr.style.display='none';ttl.style.display='none';worldMap.dialog.close();
      let map=P.world?.map||worldMap.sectMapFor(P.ap.w);
      if(map==='arena'||!worldMap.sectMaps[map])map=worldMap.sectMapFor(P.ap.w);
      worldMap.switchScene(map,true);
      // Restoring a valid saved point is a teleport, not a movement trace across bridges.
      if(Number.isFinite(sx)&&Number.isFinite(sy)&&worldMap.canWalk({x:sx,y:sy})){P.x=sx;P.y=sy;}
      P.hp=Math.max(1,Math.min(mhp(),P.hp));P.mp=Math.max(0,Math.min(mmp(),P.mp));
      cultivation.refresh();worldMap.updateInterface();window.newClassCombat?.refreshUI();
      msg('Chào mừng trở lại, '+P.nm+'.');
    } finally {state.restoring=false;}
  }
  async function enter(session){
    state.user=session.user;state.csrf=session.csrf;state.conflict=false;state.ready=false;
    const data=await api('/api/characters');state.character=data.character;state.revision=data.character?.revision||0;
    panel.hidden=true;badge.hidden=false;username.textContent=session.user.username;
    if(data.character)restore(data.character);else{P.ap=null;openCr();}
    state.ready=true;window.dispatchEvent(new CustomEvent('tienlo-auth',{detail:state.user}));
  }
  form.onsubmit=async event=>{
    event.preventDefault();submit.disabled=true;error.textContent='Đang kết nối…';
    try{await enter(await api('/api/'+mode,{username:$('account-name').value.trim(),password:$('account-password').value}));$('account-password').value='';error.textContent='';}
    catch(e){error.textContent=e.message;panel.hidden=false;}finally{submit.disabled=false;}
  };
  function snapshot(){return structuredClone(P);}
  async function flush(){
    clearTimeout(timer);
    if(!state.ready||state.restoring||state.conflict||!P.ap)return;
    if(saving){pending=true;return new Promise(resolve=>saveWaiters.push(resolve));}
    saving=true;let ok=false;notice.textContent='Đang lưu…';
    try{
      const result=await api('/api/characters',{revision:state.revision,player:snapshot()},{keepalive:true});
      state.revision=result.revision;ok=true;notice.textContent='Đã lưu trên server';
    }catch(e){
      notice.textContent=e.message;console.error('Lưu nhân vật:',e);
      if(e.status===401){state.ready=false;panel.hidden=false;error.textContent='Phiên đã hết hạn. Đăng nhập lại để tiếp tục.';}
      if(e.conflict){state.conflict=true;msg(e.message);}
    }finally{saving=false;if(pending){pending=false;ok=await flush();}for(const resolve of saveWaiters.splice(0))resolve(ok);}
    return ok;
  }
  window.saveLocalCharacter=()=>{if(state.restoring)return;clearTimeout(timer);timer=setTimeout(flush,300);};
  logout.onclick=async()=>{
    logout.disabled=true;
    try{const saved=await flush();if(P.ap&&!saved)throw new Error('Chưa lưu được tiến trình. Hãy thử đăng xuất lại sau khi kết nối ổn định.');await api('/api/logout',{});location.reload();}
    catch(e){msg(e.message);logout.disabled=false;}
  };
  addEventListener('pagehide',()=>{
    if(location.protocol!=='file:'&&state.ready&&!state.restoring&&!state.conflict&&P.ap&&!saving){navigator.sendBeacon('/api/characters',new Blob([JSON.stringify({csrf:state.csrf,revision:state.revision,player:snapshot()})],{type:'application/json'}));}
  });
  async function transact(path,data,options={}){
    if(state.restoring||!await flush())throw new Error('Chưa lưu được nhân vật. Hãy thử lại.');
    clearTimeout(timer);state.restoring=true;
    try{const result=await api(path,{...data,revision:state.revision});if(result.character){state.revision=result.character.revision;if(options.live){P.world.bag=structuredClone(result.character.player.world.bag);}else restore(result.character);}return result;}
    catch(e){if(e.conflict||!e.status){try{const latest=await api('/api/characters');if(latest.character){state.revision=latest.character.revision;restore(latest.character);}}catch{}}throw e;}
    finally{state.restoring=false;}
  }
  window.account={state,api,flush,restore,transact};
  addEventListener('DOMContentLoaded',async()=>{
    if(location.protocol==='file:'){error.textContent='Game online cần server. Chạy python server.py rồi mở http://127.0.0.1:8080.';submit.disabled=true;return;}
    try{const session=await api('/api/session');if(session.user)await enter(session);}catch(e){error.textContent=e.message;}
  });
})();
