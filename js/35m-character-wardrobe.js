/* Outfit palette rendering, base face/color choices and the level-1 starter set. */
(function(){
 const styles=equipmentRules.outfitStyles,byStyle=new Map(styles.map(s=>[s.id,s])),iconCache=new Map();
 const atlas=new Image();atlas.src=artworkURL(equipmentRules.outfitIconAtlas);
 function styleOf(ap){
  if(!ap)return 'class';
  if(ap===tp&&!P.ap)return byStyle.has(ap.outfitStyle)?ap.outfitStyle:'class';
  const robe=ap===P.ap?P.world?.equip?.daobao:equipmentData.byId.get(ap.robeId);
  return equipmentData.byId.get(robe?.id)?.outfitStyle||'class';
 }
 function hsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
  let h=!d?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;
  return[h,max?d/max:0,max];
 }
 function rgb(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;
  const a=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return a.map(n=>Math.round((n+m)*255));
 }
 function paint(source,ap,direction,style=styleOf(ap)){
  const target=byStyle.get(style);if(!target)return source;
  const canvas=document.createElement('canvas');canvas.width=source.width;canvas.height=source.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),p=pixels.data,w=canvas.width,h=canvas.height;
  const cls=ap.w||0,female=ap.gender==='Nu',rear=direction==='sau';
  // The complete head is a protected region. This shader changes garment colors,
  // never facial features, skin, outlines or gold embroidery.
  const neckline=rear?.50:(female?.50:cls===1?.61:.55);
  for(let y=Math.ceil(h*neckline);y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4;if(!p[i+3])continue;
   const [hue,sat,value]=hsv(p[i],p[i+1],p[i+2]);if(value<.10)continue;
   if(p[i]>150&&p[i]>=p[i+1]&&p[i+1]>=p[i+2]&&sat>.06&&hue<28)continue;
   let cloth=cls===0?hue>178&&hue<258&&sat>.22:cls===1?hue>132&&hue<208&&sat>.22:cls===2?hue>258&&hue<324&&sat>.24: sat<.22||(hue>28&&hue<65&&sat<.34&&value>.5)||(hue>205&&hue<258&&sat<.34);
   if(cls===3&&hue<35&&sat>.12&&value<.6)cloth=false;
   if(cls===2&&female){const nx=x/w,range=direction==='trai'?[.18,.65]:direction==='phai'?[.35,.84]:[.23,.79];if(nx<range[0]||nx>range[1])cloth=false;}
   if(!cloth)continue;
   const color=rgb(target.hue,target.saturation*Math.min(1,.65+sat*.5),Math.min(1,value*(.23+target.value*.77)));
   for(let c=0;c<3;c++)p[i+c]=color[c];
  }
  ctx.putImageData(pixels,0,0);return canvas;
 }
 function itemIcon(item){
  const meta=equipmentData.byId.get(item?.id);if(!meta?.iconRect)return null;
  if(!atlas.complete||!atlas.naturalWidth)return artworkURL({daobao:'Item/Ao/daobao.png',chan:'Item/Chan/dai-v2.png',giay:'Item/Giay/giay.png'}[meta.slot]);
  const key=meta.outfitStyle+'/'+meta.slot;if(iconCache.has(key))return iconCache.get(key);
  const [x,y,w,h]=meta.iconRect,canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const scale=118/Math.max(w,h),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(atlas,x,y,w,h,(128-w*scale)/2,(128-h*scale)/2,w*scale,h*scale);
  const result=canvas.toDataURL();iconCache.set(key,result);return result;
 }
 function refreshCreator(){if(cr.style.display!=='none'&&!P.ap)rows();}
 const originalRows=rows;
 rows=function(){
  originalRows();if(P.ap)return;
  tp.face=Number.isInteger(tp.face)&&tp.face>=1&&tp.face<=10?tp.face:1;
  tp.outfitStyle=byStyle.has(tp.outfitStyle)?tp.outfitStyle:'class';
  const parent=$('rows'),faces=document.createElement('fieldset');faces.className='creator-faces';
  const legend=document.createElement('legend');legend.textContent='CHỌN DUNG MẠO';faces.append(legend);
  const grid=document.createElement('div');grid.className='face-options';faces.append(grid);
  for(let n=1;n<=10;n++){
   const button=document.createElement('button');button.type='button';button.dataset.face=n;button.setAttribute('aria-label','Dung mạo '+n);button.setAttribute('aria-pressed',String(tp.face===n));
   const c=document.createElement('canvas');c.width=c.height=96;characterMasks.portrait(c.getContext('2d'),{...tp,face:n,maskId:null},96);button.append(c);
   const label=document.createElement('small');label.textContent=n;button.append(label);button.onclick=()=>{tp.face=n;rows();};grid.append(button);
  }
  const colors=document.createElement('fieldset');colors.className='creator-colors';const title=document.createElement('legend');title.textContent='MÀU TRANG PHỤC';colors.append(title);
  const options=document.createElement('div');options.className='color-options';colors.append(options);
  for(const style of [{id:'class',name:'Tông môn',color:characterClasses[tp.w||0].color},...styles]){
   const b=document.createElement('button');b.type='button';b.dataset.outfitStyle=style.id;b.style.setProperty('--outfit-color',style.color);b.setAttribute('aria-label','Trang phục '+style.name);b.setAttribute('aria-pressed',String(tp.outfitStyle===style.id));
   const dot=document.createElement('i'),name=document.createElement('small');name.textContent=style.name;b.append(dot,name);b.onclick=()=>{tp.outfitStyle=style.id;rows();};options.append(b);
  }
  parent.append(faces,colors);const ready=!!characterMasks.frameFor(tp,'truoc');$('ok').disabled=!ready;$('ok').textContent=ready?'Bắt đầu hành trình →':'Đang tải nhân vật…';
 };
 const creator=$('ok').onclick;
 $('ok').onclick=function(){
  if(P.ap)return;
  if(!characterMasks.frameFor(tp,'truoc'))return msg('Đang tải hình nhân vật, vui lòng đợi.');
  creator();if(!P.ap||cr.style.display!=='none')return;
  const p=inventory.progress(),style=P.ap.outfitStyle;
  for(const [slot,base]of [['daobao','vai-bao'],['chan','chan-0'],['giay','vai-giay']]){
   const id=style==='class'?base+'-class-'+P.ap.w:'outfit-'+style+'-'+slot+'-class-'+P.ap.w;
   p.equip[slot]={...equipmentData.byId.get(id),uid:crypto.randomUUID()};
  }
  // The level-1 weapon completes the starter set.
  for(const [slot,id] of [['vukhi','moc-kiem-class-'+P.ap.w]])if(equipmentData.byId.has(id))p.equip[slot]={...equipmentData.byId.get(id),uid:crypto.randomUUID()};
  p.starterOutfit=style;P.hp=mhp();P.mp=mmp();saveCharacter();hud();
 };
 const style=document.createElement('style');style.textContent=`
 #cr .creator-layout{align-items:start}#cr .creator-preview{position:sticky;top:12px;align-self:start;padding-top:14px}#cr .pn{width:min(900px,100%)}
 #cr #rows{grid-template-columns:repeat(2,minmax(0,1fr))}#cr .creator-label,#cr .gender-choice,#cr .creator-faces,#cr .creator-colors{grid-column:1/-1}
 #cr .sect-choice{gap:8px;padding:10px;min-height:80px}#cr .sect-choice img{width:30px;height:42px}#cr .sect-choice b{font-size:13px}#cr .sect-choice small{font-size:10px}
 #cr .creator-faces,#cr .creator-colors{min-width:0;margin:5px 0;padding:0;border:0}#cr legend{font:600 10px Arial;color:#b7c6ce;letter-spacing:1.2px;margin-bottom:8px}
 #cr .face-options{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px}#cr .face-options button{position:relative;padding:2px;border:1px solid #384450;border-radius:9px;background:#111822;min-width:0;min-height:48px}
 #cr .face-options canvas{position:static!important;inset:auto!important;display:block;width:100%!important;height:auto!important;max-width:56px;aspect-ratio:1;margin:auto;pointer-events:none}#cr .face-options small{position:absolute;bottom:1px;right:4px;color:#a9bac5;font:9px Arial;pointer-events:none}
 #cr .face-options button[aria-pressed=true]{border-color:#e1bc73;background:#353021;box-shadow:0 0 0 1px #e1bc7344}
 #cr .color-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}#cr .color-options button{display:flex;align-items:center;gap:5px;min-width:0;padding:8px 5px;border:1px solid #384450;background:#111822;border-radius:8px;color:#c6d1d8}
 #cr .color-options i{display:block;width:16px;height:16px;flex-shrink:0;background:var(--outfit-color);border:1px solid #b1bbbf77;border-radius:50%;box-shadow:inset 0 1px 4px #fff4}
 #cr .color-options small{font:10px Arial}#cr .color-options button[aria-pressed=true]{border-color:#e1bc73;background:#353021}#cr #ok:disabled{opacity:.5;cursor:wait}
 @media(max-width:600px){#cr .creator-preview{position:static}#cr .creator-faces canvas{max-width:42px}#cr .sect-choice small{display:none}#cr .sect-choice{min-height:64px}#cr .sect-choice b{font-size:12px}}
 `;document.head.append(style);
 window.characterWardrobe={styles,styleOf,paint,itemIcon,refreshCreator};
 atlas.onload=()=>{for(const node of document.querySelectorAll('[data-item-id],[data-gm-item]')){
  const item=equipmentData.byId.get(node.dataset.itemId||node.dataset.gmItem),img=node.querySelector('img');
  if(item?.iconRect&&img)img.src=itemIcon(item);
 }};
 refreshCreator();characterMasks.refreshAvatar(true);
})();
