/* Equipment levels are stored on each item; base stats never get overwritten. */
(function(){
 const slots=equipmentRules.combatSlots;
 const level=item=>Math.max(0,Math.min(15,Number.isInteger(item?.enhance)?item.enhance:0));
 const color=n=>n>=15?'#ffdc65':n>=14?'#ff5757':n>=11?'#ff9b45':n>=9?'#58b5ff':n>=1?'#64ed92':null;
 function setInfo(equip=P.world?.equip||{}){const minimum=Math.min(...slots.map(s=>equip[s]?level(equip[s]):0));const tier=[15,13,11,9].find(n=>minimum>=n)||0;return{tier,bonus:({9:.05,11:.1,13:.15,15:.2})[tier]||0,count:slots.filter(s=>equip[s]).length};}
 const stat=(item,key)=>Math.round((Number(item?.[key])||0)*(1+level(item)*.05)*100000)/100000;
 const cost=next=>({gold:next*40,essence:next*8});
 function enhance(uid){
  const p=inventory.progress(),item=[...p.bag,...Object.values(p.equip)].find(i=>i?.uid===uid);
  if(!item?.slot||item.slot==='gioi')return false;const next=level(item)+1;if(next>15){msg('Trang bị đã đạt tối đa +15.');return false;}
  const price=cost(next),free=!!window.gmTest?.enabled;
  if(!free&&(P.gold<price.gold||(p.essence||0)<price.essence)){msg('Cần '+price.gold+' Linh Thạch và '+price.essence+' Linh Nguyên.');return false;}
  if(!free){P.gold-=price.gold;p.essence-=price.essence;}item.enhance=next;saveCharacter();msg(item.name+' đã cường hóa +'+next+(free?' · GM miễn phí.':'.'));window.dispatchEvent(new CustomEvent('tienlo-item-success',{detail:{name:item.name,caption:'CƯỜNG HÓA THÀNH CÔNG · +'+next,src:inventory.itemIcon(item)}}));return true;
 }
 function decorate(button,item){const n=level(item);if(!n)return;button.classList.add('enhanced-item');button.style.setProperty('--enhance-color',color(n));button.style.setProperty('border-color',color(n),'important');const badge=document.createElement('span');badge.className='enhance-badge';badge.textContent='+'+n;button.append(badge);}
 function open(){const p=inventory.progress(),d=worldMap.dialog,ui=visualUI;d.show('Luyện Khí Phường · Cường hóa +15','Chọn trang bị để nâng cấp · Thành công 100%');
  const set=setInfo();ui.chips([['◈',P.gold],['Linh Nguyên',p.essence||0],['Bộ','+'+set.tier],['Thưởng',Math.round(set.bonus*100)+'%']],$('world-content'));ui.details('Mỗi cấp +5% chỉ số gốc. Full 6 món +9/+11/+13/+15: thêm 5/10/15/20% chỉ số tổng.',$('world-content'));
  const items=[...Object.values(p.equip).filter(Boolean),...p.bag.filter(i=>i.slot)];if(!items.length)d.line('Chưa có trang bị. Mở túi đồ hoặc mua ở Bảo Khí Các.');
  const grid=ui.node('div','visual-grid');$('world-content').append(grid);for(const item of items){const n=level(item),price=cost(n+1),{body}=ui.panel(item.name,inventory.itemIcon(item),grid);ui.meter(n,15,'Cường hóa',body);ui.chips(Object.entries({atk:'Công',hp:'HP',mp:'MP',armor:'Giáp'}).filter(([key])=>item[key]).slice(0,2).map(([key,label])=>[label,stat(item,key)]),body);ui.action(body,n===15?'Đã tối đa':'Nâng +'+(n+1)+' · '+(gmTest.enabled?'GM':price.gold+' ◈ / '+price.essence+' LN'),()=>{if(enhance(item.uid))open();},n===15||(!gmTest.enabled&&(P.gold<price.gold||(p.essence||0)<price.essence)));}
  d.action('Mở túi đồ',inventory.openBag);
 }
 const masks=new WeakMap(),scratches=new WeakMap();
 function outline(ctx,image,x,y,width,height,n,fallbackTone){
  const tone=color(n)||fallbackTone;if(!tone||!image.complete||!image.naturalWidth)return;
  let byColor=masks.get(image);if(!byColor){byColor=new Map();masks.set(image,byColor);}let mask=byColor.get(tone);
  const pad=8,h=256,w=Math.round(h*image.naturalWidth/image.naturalHeight);
  if(!mask){mask=document.createElement('canvas');mask.width=w+pad*2;mask.height=h+pad*2;const c=mask.getContext('2d');for(let i=0;i<12;i++){const a=i*Math.PI/6;c.drawImage(image,pad+Math.cos(a)*2.6,pad+Math.sin(a)*2.6,w,h);}c.globalCompositeOperation='source-in';c.fillStyle=tone;c.fillRect(0,0,mask.width,mask.height);c.globalCompositeOperation='destination-out';c.drawImage(image,pad,pad,w,h);byColor.set(tone,mask);}
  const sx=width/w,sy=height/h,dx=x-pad*sx,dy=y-pad*sy,dw=mask.width*sx,dh=mask.height*sy;
  ctx.save();ctx.globalAlpha*=.8;ctx.drawImage(mask,dx,dy,dw,dh);
  let scratch=scratches.get(mask);if(!scratch){scratch=document.createElement('canvas');scratch.width=mask.width;scratch.height=mask.height;scratches.set(mask,scratch);}
  const c=scratch.getContext('2d');c.globalCompositeOperation='source-over';c.clearRect(0,0,scratch.width,scratch.height);c.drawImage(mask,0,0);c.globalCompositeOperation='source-in';
  const a=matchMedia('(prefers-reduced-motion: reduce)').matches?0:tm*1.6,cx=mask.width/2,cy=mask.height/2,gradient=c.createConicGradient(a,cx,cy);gradient.addColorStop(0,'#ffffff00');gradient.addColorStop(.62,'#ffffff00');gradient.addColorStop(.84,tone);gradient.addColorStop(.94,'#fffbea');gradient.addColorStop(1,'#ffffff00');c.fillStyle=gradient;c.fillRect(0,0,mask.width,mask.height);ctx.shadowColor=tone;ctx.shadowBlur=3;ctx.drawImage(scratch,dx,dy,dw,dh);ctx.restore();
 }
 window.equipmentProgression={slots,level,color,setInfo,stat,cost,enhance,decorate,open,outline};inventory.enhance=enhance;
 window.totalArmor=(b=bonusStats())=>((P.world?.armor||0)+(b.armor||0))*(1+(b.setBonus||0));
 const button=document.createElement('button');button.id='enhance-button';button.textContent='Cường hóa';button.onclick=()=>{if(!paused())open();};$('bt').append(button);
 const style=document.createElement('style');style.textContent='.enhance-badge{position:absolute;left:3px;top:2px;color:var(--enhance-color);font:700 11px Arial;text-shadow:0 1px 3px #000}.enhanced-item{border-color:var(--enhance-color)!important;box-shadow:inset 0 0 12px color-mix(in srgb,var(--enhance-color) 18%,transparent)}@property --gear-angle{syntax:"<angle>";initial-value:0deg;inherits:false}.enhanced-item:after{content:"";position:absolute;inset:0;border-radius:8px;padding:2px;background:conic-gradient(from var(--gear-angle),transparent 20%,var(--enhance-color) 45%,#fff3ce 50%,transparent 60%);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:gear-shine 2.5s linear infinite;pointer-events:none}@keyframes gear-shine{to{--gear-angle:360deg}}@media(prefers-reduced-motion:reduce){.enhanced-item:after{animation:none}}';document.head.append(style);
})();
