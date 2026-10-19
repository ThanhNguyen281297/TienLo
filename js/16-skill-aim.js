/* Ngắm bằng chuột hoặc kéo nút skill; không tự chọn địch gần. */
(function(){
  const state={drag:null,index:0,visible:false};
  const fallbackCombat=()=>P.ap?.w===1?window.moonCombat:window.kiemCombat;
  const combat=()=>{try{if(typeof getClassCombat==='function')return getClassCombat()||fallbackCombat();}catch(e){}return (typeof window!=='undefined'&&window.getClassCombat&&window.getClassCombat())||fallbackCombat()||window.classCombat;};
  window.getClassCombatSafe=combat;
  const range=index=>index===1?(P.ap?.w===1?185:180):index===3?(P.ap?.w===1?320:340):(P.ap?.w===1?240:280);
  const camera=()=>gameCamera();
  function aim(point){try{if(window.kiemCombat)kiemCombat.state.aim={...point};}catch(e){}try{if(window.moonCombat)moonCombat.state.aim={...point};}catch(e){}try{if(window.newClassCombat)newClassCombat.state.aim={...point};}catch(e){}}
  cv.addEventListener('pointermove',event=>{
    if(event.pointerType!=='mouse'||paused())return;
    const c=camera(),b=cv.getBoundingClientRect();aim({x:c.x+(event.clientX-b.left)/b.width*W/Z,y:c.y+(event.clientY-b.top)/b.height*H/Z});
  });
  const cancel=document.createElement('div');cancel.id='aim-cancel';cancel.textContent='Kéo vào đây để hủy';document.body.appendChild(cancel);
  const style=document.createElement('style');style.textContent='#aim-cancel{display:none;position:fixed;left:50%;transform:translateX(-50%);bottom:calc(200px + env(safe-area-inset-bottom,0px));z-index:5;border:1px solid #d88b83;background:#351e27e8;color:#ffd8d3;border-radius:24px;padding:12px 20px;font-size:12px;pointer-events:none}#aim-cancel.active{display:block}.sk,#bs{touch-action:none}';document.head.appendChild(style);
  function overCancel(event){const b=cancel.getBoundingClientRect();return event.clientX>=b.left&&event.clientX<=b.right&&event.clientY>=b.top&&event.clientY<=b.bottom;}
  function finish(event,abort=false){
    const drag=state.drag;if(!drag||event.pointerId!==drag.id)return;
    const canceled=abort||overCancel(event);state.drag=null;state.visible=false;cancel.classList.remove('active');
    if(drag.button?.hasPointerCapture(drag.id))drag.button.releasePointerCapture(drag.id);
    if(canceled){try{if(window.kiemCombat)kiemCombat.state.aim=drag.previous;}catch(e){}try{if(window.moonCombat)moonCombat.state.aim=drag.previous;}catch(e){}try{if(window.newClassCombat)newClassCombat.state.aim=drag.previous;}catch(e){}return;}
    skill(drag.index);
  }
  for(const [button,index]of [...sb.children].map((b,i)=>[b,i]).concat([[$('bs'),0]])){
    button.addEventListener('pointerenter',()=>{state.index=index;});
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||paused()||window.worldMap?.dialog.isOpen()||button.disabled||state.drag)return;
      event.preventDefault();event.stopPropagation();state.index=index;
      state.drag={id:event.pointerId,index,x:event.clientX,y:event.clientY,button,previous:combat().state.aim?{...combat().state.aim}:null};
      if(!combat().state.aim)aim({x:P.x+(P.dir===2?P.f:0)*range(index),y:P.y+(P.dir===1?-1:P.dir===2?0:1)*range(index)});
      button.setPointerCapture(event.pointerId);cancel.classList.add('active');state.visible=true;
    });
    button.addEventListener('pointermove',event=>{
      const drag=state.drag;if(!drag||drag.id!==event.pointerId)return;
      const dx=event.clientX-drag.x,dy=event.clientY-drag.y,d=Math.hypot(dx,dy);if(d<8)return;
      const length=range(index)*Math.min(1,d/90);aim({x:P.x+dx/d*length,y:P.y+dy/d*length});
      cancel.style.borderColor=overCancel(event)?'#fff':'#d88b83';
    });
    button.addEventListener('pointerup',event=>finish(event));
    button.addEventListener('pointercancel',event=>finish(event,true));
    button.addEventListener('lostpointercapture',event=>finish(event,true));
    // Click tổng hợp sau pointerup không được cast thêm; Enter vẫn dùng được.
    button.addEventListener('click',event=>{if(event.detail>0){event.preventDefault();event.stopImmediatePropagation();}},true);
  }
  addEventListener('keydown',event=>{
    if(event.target instanceof HTMLInputElement)return;
    if('1234'.includes(event.key)&&event.key.length===1)state.index=Number(event.key)-1;
    if(event.key===' ')state.index=0;
    if(event.key==='Escape'&&state.drag)finish({pointerId:state.drag.id},true);
  });
  const abort=()=>{if(state.drag)finish({pointerId:state.drag.id},true);else state.visible=false;};
  const isPreviewing=()=>!!state.drag&&state.visible&&!paused()&&!window.worldMap?.dialog.isOpen();
  addEventListener('blur',abort);document.addEventListener('visibilitychange',()=>{if(document.hidden)abort();});
  const oldUpdate=up;up=function(dt){if(paused()||window.worldMap?.dialog.isOpen()||P.hp<=0)abort();oldUpdate(dt);};
  const oldRespawn=classCombat.onRespawn;classCombat.onRespawn=function(...args){abort();return oldRespawn.apply(this,args);};
  function drawPreview(){if(!isPreviewing())return;
    let point=null;try{point=combat()?.state?.aim;}catch(e){}if(!point)return;
    const index=state.index,c=camera(),dx=point.x-P.x,dy=point.y-P.y,d=Math.hypot(dx,dy)||1;
    const limit=index===1?(P.ap.w===0?180:185):range(index),length=index===0&&P.ap.w===0?limit:Math.min(limit,d);
    let end={x:Math.max(20,Math.min(M-20,P.x+dx/d*length)),y:Math.max(20,Math.min(M-20,P.y+dy/d*length))};
    if(index===1&&P.ap.w===0&&window.worldMap?.traceMove)end=worldMap.traceMove(P,end);
    const invalid=index===1&&P.ap.w===1&&window.worldMap?.canWalk&&!worldMap.canWalk(end);
    g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);g.strokeStyle=invalid?'#ff9d94':P.ap.w===1?'#d9fcff':'#83edff';g.fillStyle=g.strokeStyle;g.lineWidth=1.2;g.globalAlpha=state.drag?.85:.45;g.setLineDash([5,4]);
    if(P.ap.w>=2&&index===1){const angle=Math.atan2(dy,dx),width=P.ap.w===2?Math.PI*1.35:Math.PI*.6,radius=P.ap.w===2?145:165;g.beginPath();g.moveTo(P.x,P.y);g.arc(P.x,P.y,radius,angle-width/2,angle+width/2);g.closePath();g.stroke();}
    else if(index===2){g.beginPath();g.ellipse(P.x,P.y,P.ap.w===1?102:98,(P.ap.w===1?102:98)*.58,0,0,Math.PI*2);g.stroke();}
    else{
      g.beginPath();g.moveTo(P.x,P.y);g.lineTo(end.x,end.y);g.stroke();g.setLineDash([]);
      if(index===3){g.beginPath();g.ellipse(end.x,end.y,P.ap.w===1?132:105,(P.ap.w===1?132:105)*.58,0,0,Math.PI*2);g.stroke();}
      else{
        const angle=Math.atan2(dy,dx),near=Math.min(length,Math.min(W/Z,H/Z)*.3),arrow={x:P.x+dx/d*near,y:P.y+dy/d*near};
        g.beginPath();g.moveTo(arrow.x,arrow.y);g.lineTo(arrow.x-Math.cos(angle-.5)*8,arrow.y-Math.sin(angle-.5)*8);g.moveTo(arrow.x,arrow.y);g.lineTo(arrow.x-Math.cos(angle+.5)*8,arrow.y-Math.sin(angle+.5)*8);g.stroke();
      }
      g.beginPath();g.arc(end.x,end.y,3,0,Math.PI*2);g.stroke();
    }
    g.restore();
  }
  const oldDraw=dr;dr=function(){oldDraw();drawPreview();};
  window.skillAim={state,isPreviewing,drawPreview,cancel:abort};
})();
