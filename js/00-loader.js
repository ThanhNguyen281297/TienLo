/* Pixel loading screen shown while the game scripts download (started by boot() in index.html).
   A pixel hero walks over scrolling grass, the bar fills as scripts arrive and a tip rotates.
   window.tienloLoader.progress(done,total) and .finish() are called by the boot code. */
(function(){
 'use strict';
 const TIPS=['Đả tọa ở nơi an toàn để tăng tu vi khi rảnh tay.','Vượt Thiên Kiếp: nhìn vòng báo trước rồi chạy ra kịp lúc.',
  'Đổi mảnh trang bị ở Trưởng môn để nhận Hộ Thuẫn.','Tổ đội đánh Ma Quật nhận Mảnh Pháp Bảo.','Leo Vạn Tầng Tháp mỗi ngày, 5 tầng gặp yêu vương.',
  'Song Hỷ cuối tuần: nhân đôi kinh nghiệm.','Tưới linh tuyền ở Động phủ để linh dược chín sớm.'];
 const CLASSES=['Kiem','Liem','Thuong','Quat'],hero=CLASSES[Math.floor(Math.random()*4)]+'-'+(Math.random()<.5?'Nam':'Nu');
 const box=document.createElement('div');box.id='px-loader';box.setAttribute('role','status');box.setAttribute('aria-live','polite');
 box.innerHTML='<div class="pl-sky"></div><div class="pl-title">TIÊN LỘ<small>ONLINE</small></div><canvas width="240" height="72" aria-hidden="true"></canvas>'+
  '<div class="pl-bar" aria-hidden="true"></div><div class="pl-text">Đang tải thế giới tu tiên… <b>0%</b></div><div class="pl-tip"></div>';
 const css=document.createElement('style');css.textContent=`
#px-loader{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#140c1e;color:#f6e6b4;font-family:'VT323','Courier New',monospace;image-rendering:pixelated;transition:opacity .45s}
#px-loader.out{opacity:0;pointer-events:none}
#px-loader .pl-sky{position:absolute;inset:0;z-index:-1;background:
 radial-gradient(2px 2px at 15% 48%,#ffd6f0 50%,transparent 51%),radial-gradient(2px 2px at 13% 6%,#fff 50%,transparent 51%),radial-gradient(2px 3px at 39% 53%,#fff 50%,transparent 51%),radial-gradient(2px 3px at 70% 25%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 35% 15%,#fff 50%,transparent 51%),radial-gradient(3px 2px at 36% 14%,#ffe9a8 50%,transparent 51%),radial-gradient(2px 2px at 82% 57%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 3px at 45% 44%,#ffd6f0 50%,transparent 51%),radial-gradient(3px 2px at 24% 17%,#ffd6f0 50%,transparent 51%),radial-gradient(2px 2px at 72% 55%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 75% 47%,#cfe3ff 50%,transparent 51%),radial-gradient(3px 2px at 54% 29%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 22% 16%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 12% 4%,#ffd6f0 50%,transparent 51%),radial-gradient(3px 2px at 68% 36%,#ffd6f0 50%,transparent 51%),radial-gradient(3px 2px at 20% 45%,#ffe9a8 50%,transparent 51%),radial-gradient(2px 2px at 27% 42%,#ffd6f0 50%,transparent 51%),radial-gradient(2px 2px at 47% 29%,#cfe3ff 50%,transparent 51%),radial-gradient(3px 3px at 27% 59%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 92% 16%,#cfe3ff 50%,transparent 51%),radial-gradient(3px 3px at 32% 9%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 60% 3%,#fff 50%,transparent 51%),radial-gradient(2px 3px at 12% 59%,#cfe3ff 50%,transparent 51%),radial-gradient(3px 3px at 43% 3%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 21% 51%,#ffd6f0 50%,transparent 51%),radial-gradient(3px 3px at 11% 20%,#ffe9a8 50%,transparent 51%),radial-gradient(2px 2px at 19% 18%,#ffd6f0 50%,transparent 51%),radial-gradient(3px 2px at 44% 38%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 60% 12%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 2px at 75% 8%,#ffd6f0 50%,transparent 51%),radial-gradient(2px 2px at 28% 9%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 96% 12%,#ffe9a8 50%,transparent 51%),radial-gradient(3px 2px at 71% 33%,#ffe9a8 50%,transparent 51%),radial-gradient(2px 2px at 17% 55%,#cfe3ff 50%,transparent 51%),radial-gradient(2px 3px at 27% 32%,#ffe9a8 50%,transparent 51%),radial-gradient(2px 2px at 54% 33%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 58% 17%,#ffd6f0 50%,transparent 51%),radial-gradient(2px 2px at 26% 4%,#fff 50%,transparent 51%),radial-gradient(2px 2px at 33% 35%,#ffe9a8 50%,transparent 51%),radial-gradient(2px 2px at 35% 11%,#cfe3ff 50%,transparent 51%),
 linear-gradient(#1b1030 0 25%,#241640 25% 50%,#2e1c4e 50% 75%,#3a2358 75%)}
#px-loader .pl-title{font-size:clamp(56px,11vw,104px);line-height:.9;letter-spacing:.06em;color:#ffd75e;text-shadow:4px 4px 0 #8a3a12,8px 8px 0 #2a1206;text-align:center}
#px-loader .pl-title small{display:block;font-size:.32em;letter-spacing:.5em;color:#bfe3ff;text-shadow:2px 2px 0 #1b2a4a}
#px-loader canvas{width:min(720px,92vw);height:auto;image-rendering:pixelated}
#px-loader .pl-bar{display:grid;grid-template-columns:repeat(20,1fr);gap:3px;width:min(420px,80vw);padding:5px;background:#2a1206;box-shadow:0 0 0 3px #d8a446,0 0 0 6px #140806}
#px-loader .pl-bar i{height:14px;background:#3d2414}#px-loader .pl-bar i.on{background:linear-gradient(#ffe39a 0 40%,#e0a640 40%)}
#px-loader .pl-text{font-size:22px}#px-loader .pl-text b{color:#ffd75e;font-weight:400}
#px-loader .pl-tip{max-width:min(520px,88vw);text-align:center;font-size:20px;color:#bfa9e8;min-height:2.4em}`;
 document.head.append(css);document.body.append(box);
 const bar=box.querySelector('.pl-bar');for(let i=0;i<20;i++)bar.append(document.createElement('i'));
 const cells=[...bar.children],text=box.querySelector('.pl-text b'),tip=box.querySelector('.pl-tip');
 let t=0;const nextTip=()=>{tip.textContent='Mẹo: '+TIPS[t++%TIPS.length];};nextTip();const tipTimer=setInterval(nextTip,3500);
 // Walking hero on scrolling grass, drawn at 3 screen pixels per art pixel.
 const cv=box.querySelector('canvas'),x=cv.getContext('2d');x.imageSmoothingEnabled=false;
 const img=new Image();img.src='Character/Pixel/'+hero+'.png';
 const grass=['#3f7a3a','#4f8f44','#2f5f30','#6aa84f'];let frame=0,running=true;
 function draw(now){if(!running)return;x.clearRect(0,0,240,72);const off=Math.floor(now/60)%8;
  for(let gx=-8;gx<248;gx+=8){x.fillStyle=grass[0];x.fillRect(gx-off,58,8,14);x.fillStyle=grass[1];x.fillRect(gx-off,58,8,2);x.fillStyle=grass[2];x.fillRect(gx-off+2,64,2,2);x.fillStyle=grass[3];x.fillRect(gx-off+5,56,1,2);}
  for(let k=0;k<6;k++){const fx=((k*53-Math.floor(now/30))%280+280)%280-20;x.fillStyle=k%2?'#ffd6f0':'#fff3b0';x.fillRect(fx,60+(k%3)*3,2,2);}
  if(img.complete&&img.naturalWidth){const f=Math.floor(now/140)%4;x.drawImage(img,f*46,3*46,46,46,97,14,46,46);}
  requestAnimationFrame(draw);}
 requestAnimationFrame(draw);
 window.tienloLoader={
  progress(done,total){const p=Math.max(0,Math.min(1,done/Math.max(1,total)));const n=Math.round(p*20);cells.forEach((c,i)=>c.classList.toggle('on',i<n));text.textContent=Math.round(p*100)+'%';},
  finish(){this.progress(1,1);setTimeout(()=>{box.classList.add('out');setTimeout(()=>{running=false;clearInterval(tipTimer);box.remove();css.remove();},500);},450);}
 };
})();
