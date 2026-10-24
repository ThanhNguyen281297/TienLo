/* Equipment levels are stored on each item; base stats never get overwritten. */
(function(){
 const slots=equipmentRules.enhanceSlots;
 const level=item=>slots.includes(item?.slot)?Math.max(0,Math.min(15,Number.isInteger(item?.enhance)?item.enhance:0)):0;
 const color=n=>n>=15?'#ffdc65':n>=14?'#ff5757':n>=11?'#ff9b45':n>=9?'#58b5ff':n>=1?'#64ed92':null;
 const stat=(item,key)=>Math.round(((Number(item?.[key])||0)*(1+level(item)*.05)+(equipmentData.optionStats?.(item)?.[key]||0))*100000)/100000;
 const cost=next=>({stone:2+next*2,refined:Math.max(0,next-9),essence:30+next*next*15});
 const near=()=>worldMap.state.scene==='hub'&&Math.hypot(P.x-1240,P.y-1210)<=110;
 const selection={uid:null,materials:{},busy:false};
 async function enhance(uid=selection.uid){
  if(!near()){msg('Tới NPC Luyện Khí trong Thiên Vân Thành để cường hóa.');return false;}
  if(selection.busy)return false;selection.busy=true;
  try{const result=await account.transact('/api/equipment',{action:'enhance',uid,materials:selection.materials,free:!!window.gmTest?.enabled,opId:crypto.randomUUID()});const item=[...P.world.bag,...Object.values(P.world.equip)].find(i=>i?.uid===result.enhanced);if(item)dispatchEvent(new CustomEvent('tienlo-item-success',{detail:{name:item.name,caption:'CƯỜNG HÓA THÀNH CÔNG · +'+level(item),src:inventory.itemIcon(item)}}));return true;}catch(e){msg(e.message);return false;}finally{selection.busy=false;}
 }
 function decorate(button,item){const n=level(item);if(!n)return;button.classList.add('enhanced-item');button.style.setProperty('--enhance-color',color(n));button.style.setProperty('border-color',color(n),'important');const badge=document.createElement('span');badge.className='enhance-badge';badge.textContent='+'+n;button.append(badge);}
 function open(uid){
  if(!near())return msg('Tới NPC Luyện Khí trong Thiên Vân Thành để cường hóa.');
  if(uid)selection.uid=uid;
  const p=inventory.progress(),d=worldMap.dialog,ui=visualUI;
  d.show('Luyện Khí Phường · Lò cường hóa','Đặt trang bị, thêm nguyên liệu vào ô, rồi bấm Cường hóa. Thành công 100% · tối đa +15.');
  const root=$('world-content'),items=[...Object.values(p.equip).filter(Boolean),...p.bag].filter(i=>slots.includes(i.slot)&&i.classIndex===P.ap.w),item=items.find(i=>i.uid===selection.uid),n=level(item)+1,price=cost(n),free=!!window.gmTest?.enabled;
  const board=ui.node('div','forge-board');root.append(board);
  function slot(label,chosen,onClear,accept){const box=ui.node('button','forge-slot');box.type='button';box.setAttribute('aria-label',label);box.append(ui.node('small','',label));if(chosen){box.append(ui.art(inventory.itemIcon(chosen)),ui.node('b','',chosen.name+(chosen.qty?' ×'+chosen.qty:level(chosen)?' +'+level(chosen):'')));}else box.append(ui.node('span','','＋'));box.onclick=onClear;box.ondragover=e=>e.preventDefault();box.ondrop=e=>{e.preventDefault();accept(e.dataTransfer.getData('text/plain'));};board.append(box);return box;}
  const find=id=>[...p.bag,...Object.values(p.equip).filter(Boolean)].find(i=>i.uid===id);
  slot('Trang bị',item,()=>{selection.uid=null;open();},id=>{const i=find(id);if(i&&items.includes(i)){selection.uid=id;open();}});
  for(const [iid,label,amount]of [['cuong-hoa-thach','Cường Hóa Thạch',price.stone],['tinh-luyen-thach','Tinh Luyện Thạch',price.refined]]){const material=p.bag.find(i=>i.uid===selection.materials[iid]&&i.id===iid);slot(label+' · Cần '+(free?0:amount),material,()=>{delete selection.materials[iid];open();},id=>{const i=find(id);if(i?.id===iid){selection.materials[iid]=id;open();}});}
  ui.chips([['Cấp nâng',item?'+'+level(item)+' → +'+Math.min(15,n):'Chưa chọn'],['Linh Nguyên',(p.essence||0)+' / '+(free?0:price.essence)]],root);
  if(item)ui.details('Hiện tại: '+inventory.statText(item)+' · Mỗi cấp +5% chỉ số gốc. Option rơi đồ giữ nguyên.',root,'Xem chỉ số');
  ui.action(root,selection.busy?'Đang cường hóa…':free?'Cường hóa · GM miễn phí':'Cường hóa '+(item?'+'+n:''),async()=>{if(await enhance())open();},!item||n>15||selection.busy||(!free&&((p.essence||0)<price.essence||[['cuong-hoa-thach',price.stone],['tinh-luyen-thach',price.refined]].some(([id,qty])=>qty>0&&!p.bag.some(i=>i.id===id&&i.uid===selection.materials[id]&&(i.qty||1)>=qty)))));
  root.append(ui.node('h4','','Chọn hoặc kéo trang bị vào ô'));
  const grid=ui.node('div','forge-choices');root.append(grid);
  for(const i of items){const b=ui.action(grid,i.name+' +'+level(i),()=>{selection.uid=i.uid;open();});b.prepend(ui.art(inventory.itemIcon(i)));b.draggable=true;b.ondragstart=e=>e.dataTransfer.setData('text/plain',i.uid);}
  root.append(ui.node('h4','','Nguyên liệu trong túi'));
  const materials=ui.node('div','forge-choices');root.append(materials);
  for(const i of p.bag.filter(i=>i.type==='material')){const b=ui.action(materials,i.name+' ×'+(i.qty||1),()=>{selection.materials[i.id]=i.uid;open();});b.prepend(ui.art(inventory.itemIcon(i)));b.draggable=true;b.ondragstart=e=>e.dataTransfer.setData('text/plain',i.uid);}
  if(!materials.children.length)root.append(ui.node('p','','Săn quái để nhặt Cường Hóa Thạch; quái cấp 30+ có thể rơi Tinh Luyện Thạch.'));
 }
 const masks=new WeakMap(),scratches=new WeakMap();
 function outline(ctx,image,x,y,width,height,n,fallbackTone){
  const tone=color(n)||fallbackTone,iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;if(!tone||image.complete===false||!iw||!ih)return;
  let byColor=masks.get(image);if(!byColor){byColor=new Map();masks.set(image,byColor);}let mask=byColor.get(tone);
  const pad=8,h=256,w=Math.round(h*iw/ih);
  if(!mask){mask=document.createElement('canvas');mask.width=w+pad*2;mask.height=h+pad*2;const c=mask.getContext('2d');for(let i=0;i<12;i++){const a=i*Math.PI/6;c.drawImage(image,pad+Math.cos(a)*2.6,pad+Math.sin(a)*2.6,w,h);}c.globalCompositeOperation='source-in';c.fillStyle=tone;c.fillRect(0,0,mask.width,mask.height);c.globalCompositeOperation='destination-out';c.drawImage(image,pad,pad,w,h);byColor.set(tone,mask);}
  const sx=width/w,sy=height/h,dx=x-pad*sx,dy=y-pad*sy,dw=mask.width*sx,dh=mask.height*sy;
  ctx.save();ctx.globalAlpha*=.8;ctx.drawImage(mask,dx,dy,dw,dh);
  let scratch=scratches.get(mask);if(!scratch){scratch=document.createElement('canvas');scratch.width=mask.width;scratch.height=mask.height;scratches.set(mask,scratch);}
  const c=scratch.getContext('2d');c.globalCompositeOperation='source-over';c.clearRect(0,0,scratch.width,scratch.height);c.drawImage(mask,0,0);c.globalCompositeOperation='source-in';
  const a=matchMedia('(prefers-reduced-motion: reduce)').matches?0:tm*1.6,cx=mask.width/2,cy=mask.height/2,gradient=c.createConicGradient(a,cx,cy);gradient.addColorStop(0,'#ffffff00');gradient.addColorStop(.62,'#ffffff00');gradient.addColorStop(.84,tone);gradient.addColorStop(.94,'#fffbea');gradient.addColorStop(1,'#ffffff00');c.fillStyle=gradient;c.fillRect(0,0,mask.width,mask.height);ctx.shadowColor=tone;ctx.shadowBlur=3;ctx.drawImage(scratch,dx,dy,dw,dh);ctx.restore();
 }
 window.equipmentProgression={slots,level,color,stat,cost,enhance,decorate,open,outline,near,selection};inventory.enhance=enhance;
 window.totalArmor=(b=bonusStats())=>((P.world?.armor||0)+(b.armor||0));
 const service=worldMap.handleService;worldMap.handleService=function(id){if(id==='forge'){open();return true;}return service(id);};
 const style=document.createElement('style');style.textContent='.forge-board{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:16px 0}.forge-slot{min-height:150px;display:grid;place-items:center;align-content:center;gap:8px;background:radial-gradient(ellipse,#34494a,#142a32);border:2px solid #b39b66;border-radius:14px;color:#eee0bc}.forge-slot img{width:64px;height:64px;object-fit:contain}.forge-slot small{font-size:11px}.forge-slot b{font-size:10px}.forge-slot span{font-size:35px;color:#a99a74}.forge-choices{display:flex;gap:7px;flex-wrap:wrap}.forge-choices button{display:grid;place-items:center;font-size:10px;max-width:145px}.forge-choices img{width:45px;height:45px;object-fit:contain}.enhance-badge{position:absolute;left:3px;top:2px;color:var(--enhance-color);font:700 11px Arial;text-shadow:0 1px 3px #000}.enhanced-item{border-color:var(--enhance-color)!important;box-shadow:inset 0 0 12px color-mix(in srgb,var(--enhance-color) 18%,transparent)}@property --gear-angle{syntax:"<angle>";initial-value:0deg;inherits:false}.enhanced-item:after{content:"";position:absolute;inset:0;border-radius:8px;padding:2px;background:conic-gradient(from var(--gear-angle),transparent 20%,var(--enhance-color) 45%,#fff3ce 50%,transparent 60%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:gear-shine 2.5s linear infinite;pointer-events:none}@keyframes gear-shine{to{--gear-angle:360deg}}@media(prefers-reduced-motion:reduce){.enhanced-item:after{animation:none}}';document.head.append(style);
})();
