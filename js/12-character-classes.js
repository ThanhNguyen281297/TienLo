/* Hai class dùng ảnh gốc; nạp cuối để thay toàn bộ nhân vật tự vẽ. */
(function () {
  const classes = [
    { folder: 'Kiem', name: 'Kiếm Tông', color: '#88cfff' },
    { folder: 'Liem', name: 'Minh Nguyệt Tông', color: '#65ffdf' },
    { folder: 'Thuong', name: 'Lôi Thương Tông', color: '#aa88ff' },
    { folder: 'Quat', name: 'Thiên Cơ Môn', color: '#e9fff2' }
  ];
  window.characterClasses=classes;
  window.sectName=()=>classes[P.ap?.w||0].name;
  const classOf=ap=>Number.isInteger(ap?.w)&&ap.w>=0&&ap.w<4?ap.w:0;
  const assets=classes.map(info=>{
    const result={Nam:{},Nu:{}};
    for(const gender of ['Nam','Nu'])for(const direction of ['truoc','sau','trai','phai']){
      const img=new Image();img.src='CHARACTER/'+info.folder+'/'+gender+'/'+direction+'.png';result[gender][direction]=img;
    }
    for(const [key,folder] of [['vukhi','VuKhi'],['vong','Vong'],['lung','Lung']]){
      const img=new Image();img.src='CHARACTER/'+info.folder+'/'+folder+'/'+key+'.png';result[key]=img;
    }
    return result;
  });
  DEF.w = 0;
  OPT.splice(0, OPT.length, ['Tông môn', 'w', ['Kiếm Tông · Kiếm', 'Minh Nguyệt Tông · Liềm']]);
  if (P.ap) P.ap.w = classOf(P.ap);
  tp.w = classOf(tp);
  const panel = cr.querySelector('.pn');
  panel.setAttribute('role', 'dialog');panel.setAttribute('aria-labelledby', 'creator-title');
  const heading = panel.querySelector('h2');heading.id='creator-title';heading.textContent='Khởi đầu tiên lộ';
  const intro=document.createElement('p');intro.className='creator-intro';intro.textContent='Chọn tông môn, đặt đạo hiệu và bắt đầu hành trình của bạn.';heading.after(intro);
  const layout=document.createElement('div');layout.className='creator-layout';panel.appendChild(layout);
  const preview=document.createElement('div');preview.className='creator-preview';layout.appendChild(preview);preview.appendChild($('pv'));
  const badge=document.createElement('div');badge.className='creator-badge';preview.appendChild(badge);
  const controls=document.createElement('div');controls.className='creator-controls';layout.appendChild(controls);
  controls.appendChild($('rows'));
  const label=document.createElement('label');label.htmlFor='nm';label.textContent='ĐẠO HIỆU';controls.appendChild(label);
  controls.appendChild($('nm'));$('nm').setAttribute('autocomplete','off');
  const note=document.createElement('p');note.className='creator-note';note.textContent='Đạo hiệu từ 3–12 ký tự. Tông môn được giữ cố định sau khi tạo.';controls.appendChild(note);controls.appendChild($('ok'));
  $('ok').textContent='Bắt đầu hành trình →';
  rows=function(){
    $('rows').innerHTML='<div class="creator-label">CHỌN TÔNG MÔN</div>';
    classes.forEach((info,index)=>{
      const button=document.createElement('button');button.className='sect-choice';button.type='button';button.setAttribute('aria-pressed',String(classOf(tp)===index));
      const weapon=document.createElement('img');weapon.src='CHARACTER/'+info.folder+'/VuKhi/vukhi.png';weapon.alt='';button.appendChild(weapon);
      const text=document.createElement('span');const title=document.createElement('b');title.textContent=info.name;const description=document.createElement('small');description.textContent=['Kiếm khí · tốc độ · bộc phát','Nguyệt nhận · dịch chuyển · khống chế','Lôi Ấn · đột kích · bùng nổ','Linh phù · trận pháp · phong ấn'][index];text.append(title,description);button.appendChild(text);
      button.onclick=()=>{tp.w=index;rows();};$('rows').appendChild(button);
    });
    const genders=document.createElement('div');genders.className='gender-choice';
    for(const [value,text]of [['Nam','Nam'],['Nu','Nữ']]){const button=document.createElement('button');button.type='button';button.textContent=text;button.setAttribute('aria-pressed',String((tp.gender||'Nam')===value));button.onclick=()=>{tp.gender=value;rows();};genders.appendChild(button);}
    $('rows').appendChild(genders);
    badge.textContent=classes[classOf(tp)].name;
  };
  const creatorStyle=document.createElement('style');
  creatorStyle.textContent=`
    #cr{box-sizing:border-box;background:#10151d;padding:24px;overflow:auto;touch-action:pan-y}
    #cr .pn{box-sizing:border-box;width:min(760px,100%);max-height:100%;padding:32px;border:1px solid #384450;border-radius:20px;background:#171e28;text-align:left;overflow:auto;box-shadow:0 24px 70px #0005}
    #cr h2{font-size:28px;color:#f0dfb5;margin:0 0 8px;letter-spacing:.4px}
    #cr .creator-intro{font-size:13px;color:#9caebb;margin:0 0 24px;line-height:1.7}
    #cr .creator-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:28px;align-items:center}
    #cr .creator-preview{min-width:0;text-align:center;align-self:center}
    #cr #pv{position:static!important;inset:auto!important;display:block;width:min(280px,100%)!important;height:auto!important;aspect-ratio:1;margin:0 auto!important;border:0;background:transparent;image-rendering:auto}
    #cr .creator-badge{color:#dfcc9f;font-size:15px;letter-spacing:1px;margin:0 0 16px}
    #cr .creator-controls{min-width:0}
    #cr .creator-label,#cr label{display:block;font-size:11px;letter-spacing:1.5px;color:#9caebb;margin-bottom:10px}
    #cr #rows{display:grid;gap:10px;margin-bottom:24px}
    #cr .sect-choice{display:flex;align-items:center;gap:14px;width:100%;box-sizing:border-box;text-align:left;padding:14px;border:1px solid #384450;border-radius:12px;background:#111822;min-height:80px}
    #cr .sect-choice[aria-pressed=true]{border-color:#d3b77f;background:#282923;box-shadow:inset 3px 0 #d3b77f}
    #cr .sect-choice img{width:42px;height:48px;object-fit:contain;flex-shrink:0}
    #cr .sect-choice span{min-width:0}#cr .sect-choice b{display:block;font-size:15px;color:#efe5cc}
    #cr .sect-choice small{display:block;font-size:11px;color:#9caebb;margin-top:6px;line-height:1.5}
    #cr #nm{margin:0;width:100%;border:1px solid #384450;border-radius:10px;background:#111822;padding:13px;color:#fff;user-select:text}
    #cr #nm:focus{outline:2px solid #d3b77f;outline-offset:2px}
    #cr .creator-note{font-size:11px;color:#899ba8;line-height:1.8;margin:12px 0 20px}
    #cr #ok{background:#d7bd88;border:0;border-radius:10px;color:#201b12;min-height:48px;font-weight:bold}
    #cr #ok:hover{background:#e9d3a8}
    @media(max-width:600px){#cr{padding:12px}#cr .pn{padding:22px 20px;border-radius:16px}#cr h2{font-size:24px}#cr .creator-intro{margin-bottom:12px}#cr .creator-layout{grid-template-columns:1fr;gap:10px}#cr #pv{width:180px!important}#cr .creator-badge{margin-bottom:8px}#cr #rows{margin-bottom:18px}#cr .sect-choice{min-height:72px;padding:10px 12px}#cr .creator-note{margin:10px 0 14px}}
    @media(max-height:600px) and (min-width:601px){#cr{padding:12px}#cr .pn{padding:20px}#cr .creator-intro{margin-bottom:10px}#cr #pv{width:200px!important}}
  `;
  document.head.appendChild(creatorStyle);
  rows();
  // Hiển thị creator phía sau màn đăng nhập; tài khoản có nhân vật sẽ khôi phục từ DB.
  ttl.style.display = 'none';
  if (!P.ap) openCr();

  function ready(img) { return img.complete && img.naturalWidth > 0; }
  // Skill origin follows the fixed weapon beside the character.
  window.characterWeapon = {
    position: (index = classOf(P.ap), x = P.x, y = P.y, bob = 0) => {
      return {x:x+28,y:y-24-bob};
    },
    trail: (ctx, points, end, offset, color) => {
      if (!points.length) return;
      const path = points.concat(end);
      ctx.save();ctx.globalCompositeOperation = 'lighter';ctx.lineCap = 'round';ctx.lineJoin = 'round';
      for (let i = 1; i < path.length; i++) {
        const strength = i / path.length;
        for (const layer of [0, 1]) {
          ctx.strokeStyle = layer ? '#f4ffff' : color;
          ctx.globalAlpha = strength * (layer ? .7 : .22);
          ctx.lineWidth = strength * (layer ? 1.2 : 6);
          ctx.beginPath();ctx.moveTo(path[i-1].x,path[i-1].y-offset);ctx.lineTo(path[i].x,path[i].y-offset);ctx.stroke();
        }
        if (i % 3 === 0) {
          ctx.fillStyle = color;ctx.globalAlpha = strength * .55;
          ctx.beginPath();ctx.arc(path[i].x + Math.sin(tm * 5+i)*3,path[i].y-offset + Math.cos(tm * 4+i)*3,.7,0,Math.PI*2);ctx.fill();
        }
      }
      ctx.restore();
    }
  };
  function sprite(ctx, img, x, y, height) {
    if (!ready(img)) return;
    const width = height * img.naturalWidth / img.naturalHeight;
    renderArtwork(ctx,img, x - width / 2, y - height, width, height);
  }

  function footRing(ctx, img, x, y, color) {
    if (!ready(img)) return;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = .52 + Math.sin(tm * 3) * .06;
    ctx.shadowColor = color;
    ctx.shadowBlur = 2;
    // Ảnh đã có phối cảnh: giữ hình vòng, chỉ thu chiều cao cho mặt đất.
    renderArtwork(ctx,img, x - 44, y - 17, 88, 40);
    ctx.restore();
  }

  // Weapon effects remain in the fixed local weapon coordinates.
  const reducedWeaponMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const weaponTones=['#59bfff','#4de2b7','#a77aff','#f3c76b'];
  const weaponAuras=new Map();
  function weaponAura(index){
    if(weaponAuras.has(index))return weaponAuras.get(index);
    const image=assets[index].vukhi;if(!ready(image))return null;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
    const c=canvas.getContext('2d',{willReadFrequently:true});
    const width=36*image.naturalWidth/image.naturalHeight;
    c.drawImage(image,48-width/2,30,width,36);
    const edges=[];
    // Seed wisps geometrically; the glow itself uses the image alpha mask.
    // Avoid readback/taint so direct file opening keeps rendering reliably.
    for(let y=32;y<65;y+=3){const spread=width*(.24+.12*Math.sin((y-30)/36*Math.PI));for(const side of [-1,1])edges.push({x:side*spread,y:y-48});}
    c.globalCompositeOperation='source-in';c.fillStyle=weaponTones[index];c.fillRect(0,0,96,96);
    const aura={canvas,edges};weaponAuras.set(index,aura);return aura;
  }
  function weaponEnergy(ctx,index,quality,attacking,front) {
    const aura=weaponAura(index);if(!aura)return;
    const t=reducedWeaponMotion.matches?0:tm,color=weaponTones[index];
    const power=1+quality*.1+(attacking?.18:0);
    ctx.save();ctx.globalCompositeOperation='lighter';
    if(!front){
      // Alpha-masked bloom follows the real blade, rather than an invented outline.
      for(const [blur,alpha] of [[8,.19],[3,.3]]){
        ctx.shadowColor=color;ctx.shadowBlur=blur;ctx.globalAlpha=alpha*power;
        ctx.drawImage(aura.canvas,-48,-48);
      }
      ctx.shadowBlur=0;
      // Soft, rising spirit flames seeded on the actual silhouette of each weapon.
      const count=reducedWeaponMotion.matches?6:14;
      for(let i=0;i<count&&aura.edges.length;i++){
        const edge=aura.edges[(i*37+index*13)%aura.edges.length];
        const life=(t*.36+i*.618)%1,fade=Math.sin(life*Math.PI);
        const x=edge.x+Math.sin(t*1.8+i*2)*life*3,y=edge.y-life*9;
        ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t+i)*.22);ctx.scale(1,1.8);
        const radius=1.2+life*2.1,flame=ctx.createRadialGradient(0,0,0,0,0,radius);
        flame.addColorStop(0,color);flame.addColorStop(.35,color+'99');flame.addColorStop(1,color+'00');
        ctx.fillStyle=flame;ctx.globalAlpha=fade*.43*power;
        ctx.fillRect(-radius,-radius,radius*2,radius*2);ctx.restore();
      }
    }else{
      // Tiny embers drift off the blade. No lightning, white strokes or strobe.
      for(let i=0;i<5&&aura.edges.length;i++){
        const edge=aura.edges[(i*53+7)%aura.edges.length];
        const life=(t*.24+i*.23)%1;
        ctx.globalAlpha=Math.sin(life*Math.PI)*.55;ctx.fillStyle=color;
        ctx.beginPath();ctx.arc(edge.x+Math.sin(i*3+t)*life*6,edge.y-life*13,.35+(1-life)*.3,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();
  }

  // Nam Thương có búi tóc và dải áo lớn: tăng riêng thân ảnh để đầu/thân
  // nhìn cân với các phái khác. Neo đáy bàn chân theo từng ảnh 1122 × 1402.
  const spearMaleFit = { height: 52.5, feet: { truoc: 1339, sau: 1331, trai: 1353, phai: 1343 }, sourceHeight: 1402 };
  window.characterNameHeight = ap => [105,109,117,111][classOf(ap)];
  drawChar = function (ctx, x, y, dir, facing, moving, phase, attacking, ap) {
    const index = classOf(ap), info = classes[index], images = assets[index];
    const direction = dir === 1 ? 'sau' : dir === 2 ? (facing < 0 ? 'trai' : 'phai') : 'truoc';
    const bob = moving ? Math.abs(Math.sin(phase)) * 1.2 : Math.sin(tm * 2) * .4;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    footRing(ctx, images.vong, x, y, info.color);
    // Fixed position and class angle; only the back accessory floats.
    const angle = [-.18,-.3,.12,-.2][index];
    const weapon = window.characterWeapon.position(index, x, y, bob);
    const wx = weapon.x, wy = weapon.y;
    const gear=P.world?.equip?.vukhi,quality=({pham:0,huyen:1,linh:2,tien:3}[ap===P.ap?gear?.rarity:ap?.weaponRarity]||0);
    const weaponColor=weaponTones[index];
    const drawBackItem = () => {
      if (!ready(images.lung)) return;
      ctx.save();
      const t=reducedWeaponMotion.matches?0:tm,height=[82,86,94,88][index];
      const lift=Math.sin(t*1.8+index)*1.3;
      // Anchor at the shoulder blades, on the far side in profile.
      ctx.translate(x+(dir===2?-facing*11:0),y-10-bob+lift);
      ctx.rotate(Math.sin(t*1.3+index)*.025);
      ctx.scale((dir===2?.7:1)*(1+Math.sin(t*(index===2?2.5:1.7))*.025),1);
      sprite(ctx,images.lung,0,0,height);
      const n=ap===P.ap?window.equipmentProgression?.level(P.world?.equip?.phapbao):(ap?.backEnhance||0);
      window.equipmentProgression?.outline(ctx,images.lung,-height*images.lung.naturalWidth/images.lung.naturalHeight/2,-height,height*images.lung.naturalWidth/images.lung.naturalHeight,height,n||0);
      ctx.restore();
    };
    const drawWeapon = () => {
      if (!ready(images.vukhi)) return;
      ctx.save();
      ctx.translate(wx, wy);
      ctx.rotate(angle);
      ctx.scale(1.4,1.4);
      weaponEnergy(ctx,index,quality,attacking,false);
      ctx.shadowColor = weaponColor;
      ctx.shadowBlur = attacking ? 7 : 3+quality*.5;
      sprite(ctx, images.vukhi, 0, 18, 36);
      const n=ap===P.ap?window.equipmentProgression?.level(gear):(ap?.weaponEnhance||0);
      window.equipmentProgression?.outline(ctx,images.vukhi,-18*images.vukhi.naturalWidth/images.vukhi.naturalHeight,-18,36*images.vukhi.naturalWidth/images.vukhi.naturalHeight,36,n||0,weaponColor);
      ctx.shadowBlur = 0;
      weaponEnergy(ctx,index,quality,attacking,true);
      ctx.restore();
    };
    // Facing the camera hides the back mount; facing away reveals it over the back.
    if(dir!==1)drawBackItem();
    const gender = ap?.gender === 'Nu' ? 'Nu' : 'Nam';
    const fit = index === 2 && gender === 'Nam' ? spearMaleFit : null;
    const bodyHeight = fit ? fit.height : 42;
    const footOffset = fit ? bodyHeight * (1 - fit.feet[direction] / fit.sourceHeight) : 0;
    sprite(ctx, images[gender][direction], x, y - bob + footOffset, bodyHeight);
    const bodyLevel=ap===P.ap?window.equipmentProgression?.level(P.world?.equip?.daobao):(ap?.bodyEnhance||0);
    const bodyImage=images[gender][direction],bodyWidth=bodyHeight*bodyImage.naturalWidth/(bodyImage.naturalHeight||1);
    window.equipmentProgression?.outline(ctx,bodyImage,x-bodyWidth/2,y-bob+footOffset-bodyHeight,bodyWidth,bodyHeight,bodyLevel||0);
    // Facing away: the complete back mount sits in front of the rear sprite, including long hair.
    if(dir===1)drawBackItem();
    drawWeapon();
    ctx.restore();
  };

  // Ảnh không có tư thế ngồi: dùng nhân vật gốc lơ lửng trên pháp trận đả tọa.
  sit = function () {
    const color = classes[classOf(AP())].color;
    sh(P.x, P.y + 2, 17, 5, .3);
    glow(P.x, P.y - 14, 42, color, .28);
    drawChar(g, P.x, P.y - 3, P.dir || 0, P.f, false, 0, false, AP());
  };
  // Vũ khí class thay cho phi kiếm tự sinh ở cảnh giới cao.
  orbit = function () {};
  const previousHud = hud;
  hud = function () {
    previousHud();
    $('rn').textContent = classes[classOf(AP())].name + ' · ' + $('rn').textContent;
  };
})();
