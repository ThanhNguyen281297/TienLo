/* MÀN HÌNH CHÍNH + 4 KỸ NĂNG + HIỆU ỨNG */
const V=[],SP=[],LT=[],SC=[0,0,0,0],SN=[['火','Hỏa Cầu','#ff8a3d'],['冰','Băng Châm','#7fd0ff'],['风','Phong Nhẫn','#7fffc8'],['雷','Lôi Kiếp','#b79bff']],SCD=[1,1.6,2.6,5],SMP=[10,14,18,30];
let shk=0,lr=P.r;
const paused=()=>cr.style.display!='none'||ttl.style.display!='none',dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fl=document.createElement('link');fl.rel='stylesheet';fl.href='https://fonts.googleapis.com/css2?family=Noto+Serif:wght@600;900&display=swap';document.head.appendChild(fl);
const st3=document.createElement('style');st3.textContent='#sb{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;gap:6px}@media(max-width:700px){#sb{bottom:calc(70px + env(safe-area-inset-bottom,0px))}}.sk{position:relative;width:54px;height:54px;padding:0;overflow:hidden;border-width:2px}.sk .ic{font-style:normal;font-size:24px}.sk small{position:absolute;left:4px;top:2px;font-size:10px;color:#a8977a}.sk u{position:absolute;left:0;right:0;bottom:0;height:0;background:rgba(0,0,0,.7)}.sk.lk{opacity:.35;filter:grayscale(1)}.sk.lm .ic{opacity:.45}#ttl{position:fixed;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;padding-top:9vh;box-sizing:border-box}#tc{position:absolute;inset:0;width:100%;height:100%}#ttl h1{position:relative;margin:0;font:900 clamp(60px,13vw,130px) "Noto Serif",Georgia,serif;letter-spacing:.12em;background:linear-gradient(#fff3c8,#d9a441 60%,#8a5a1c);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 12px #000c)}#ttl p{position:relative;margin:4px 0 22px;color:#f1e3c4;text-shadow:0 2px 6px #000;font-size:16px}#tb{position:relative;display:flex;flex-direction:column;gap:10px;width:min(260px,80vw)}#tb button{font-size:16px;padding:12px}';document.head.appendChild(st3);
const sb=document.createElement('div');sb.id='sb';SN.forEach((s,i)=>{const b=document.createElement('button');b.className='sk';b.style.borderColor=s[2];b.title=s[1];b.innerHTML='<i class="ic">'+s[0]+'</i><small>'+(i+1)+'</small><u></u>';b.onclick=()=>skill(i);sb.appendChild(b)});document.body.appendChild(sb);
function boom(x,y){V.push({l:.45,m:.45,f:p=>{glow(x,y,50*(.5+p),'rgba(255,140,50,.9)',(1-p)*.8);g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,200,100,'+(1-p)+')';g.lineWidth=3*(1-p)+1;g.beginPath();g.arc(x,y,6+p*34,0,6.3);g.stroke();g.restore()}});spark(x,y,'#ff9a4a',16);spark(x,y,'#ffe08a',8);
 E.forEach(e=>{const d=Math.hypot(e.x-x,e.y-y);if(!e.dead&&d>T[e.t].s+10&&d<40)hit(e,atk()*.8)});shk=Math.max(shk,2.5)}
function burst(){const x=P.x,y=P.y,c=RC[P.r];V.push({l:1.6,m:1.6,f:p=>{const a=1-p;g.save();g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(0,y-420,0,y);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,c);g.globalAlpha=a*.85;g.fillStyle=gr;const w=26*(1-p*.6);g.fillRect(x-w,y-420,w*2,420);g.fillStyle='#fff';g.fillRect(x-w*.3,y-420,w*.6,420);
  for(let i=0;i<3;i++){const q=Math.max(0,p*1.4-i*.2);g.strokeStyle=c;g.globalAlpha=Math.max(0,1-q);g.lineWidth=3;g.beginPath();g.ellipse(x,y,10+q*80,4+q*30,0,0,6.3);g.stroke()}g.restore();glow(x,y-10,90,c,a*.8)}});
 for(let i=0;i<4;i++)spark(x,y-10,c,12);spark(x,y-10,'#fff',20);shk=8}
function skill(i){if(paused())return;if(i==0)return cast();if(P.r<i)return msg('Cần đạt cảnh giới '+R[i]+' để dùng '+SN[i][1]+'.');if(SC[i]>0||P.mp<SMP[i])return;
 const e=near(340);let ax=P.dir==2?P.f:0,ay=P.dir==0?1:P.dir==1?-1:0;if(e){const d=dist(e,P)||1;ax=(e.x-P.x)/d;ay=(e.y-P.y)/d}
 P.mp-=SMP[i];SC[i]=SCD[i];const a=Math.atan2(ay,ax);
 if(i==1){for(let k=-2;k<=2;k++){const b=a+k*.17;SP.push({k:1,x:P.x,y:P.y-10,vx:Math.cos(b)*380,vy:Math.sin(b)*380,l:.7,a:b,h:[]})}spark(P.x,P.y-10,'#bfeaff',10)}
 if(i==2)SP.push({k:2,x:P.x,y:P.y-10,vx:ax*270,vy:ay*270,l:1,a,h:[]});
 if(i==3){let ts=E.filter(q=>!q.dead&&dist(q,P)<320).sort((p,q)=>dist(p,P)-dist(q,P)).slice(0,4).map(q=>({x:q.x,y:q.y,r:1}));if(!ts.length)ts=[{x:P.x+ax*120,y:P.y+ay*120}];
  ts.forEach((q,n)=>{const dl=.45+n*.1,bolt=[];for(let s=0;s<=9;s++)bolt.push([q.x+(s<9?rn(-16,16):0),q.y-340+s*38]);
   V.push({l:dl,m:dl,f:p=>{g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(183,155,255,.8)';g.lineWidth=2;g.beginPath();g.ellipse(q.x,q.y,40*(1-p*.5),15*(1-p*.5),0,0,6.3);g.stroke();g.restore()}});
   LT.push({t:dl,f:()=>{E.forEach(e=>{if(!e.dead&&Math.hypot(e.x-q.x,e.y-q.y)<48)hit(e,atk()*4)});shk=Math.max(shk,6);spark(q.x,q.y,'#d9c8ff',16);
    V.push({l:.35,m:.35,f:p=>{const a2=1-p;g.save();g.globalCompositeOperation='lighter';g.globalAlpha=a2;g.beginPath();bolt.forEach((v,j)=>j?g.lineTo(v[0],v[1]):g.moveTo(v[0],v[1]));g.strokeStyle='#cbb8ff';g.lineWidth=7;g.stroke();g.strokeStyle='#fff';g.lineWidth=2.5;g.stroke();g.beginPath();g.ellipse(q.x,q.y,10+p*46,4+p*18,0,0,6.3);g.strokeStyle='#b79bff';g.lineWidth=2;g.stroke();g.restore();glow(q.x,q.y,70,'rgba(180,150,255,.9)',a2*.9)}})}})})}}
addEventListener('keydown',e=>{if('1234'.includes(e.key)&&e.key.length==1)skill(+e.key-1)});
const _h2=hit;hit=function(e,v){const h0=e.hp;_h2(e,v);const k=T[e.t];e.fl=.12;const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;if(e.t<2){e.x+=dx/d*5;e.y+=dy/d*5}
 if(e.hp<=0&&h0>0){const x=e.x,y=e.y-k.s/2;V.push({l:1.1,m:1.1,f:p=>{glow(x,y-p*40,k.s*2.2*(1-p*.4),'rgba(190,230,255,.9)',(1-p)*.8);g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,230,160,'+(1-p)+')';g.lineWidth=2;g.beginPath();g.arc(x,y,4+p*30,0,6.3);g.stroke();g.restore()}});spark(x,y,'#ffd23a',10);shk=Math.max(shk,e.t==2?9:2)}};
const SK2=[...sb.children],_u2=up;
up=function(dt){if(paused())return;const fz=E.filter(e=>e.fr>0).map(e=>[e,e.x,e.y]),pb=B.map(b=>[b,b.l]);_u2(dt);
 for(const [e,x,y] of fz){e.x=x;e.y=y;e.cd=Math.max(e.cd,.3);e.fr-=dt}
 for(const [b,l] of pb)if(b.l<=0&&l>.05)boom(b.x,b.y);
 for(const s of SP){s.x+=s.vx*dt;s.y+=s.vy*dt;s.l-=dt;for(const e of E){if(e.dead||s.l<=0||s.h.includes(e))continue;if(Math.hypot(e.x-s.x,e.y-s.y)<T[e.t].s+(s.k==2?16:8)){s.h.push(e);hit(e,atk()*(s.k==1?1.4:2.2));if(s.k==1){e.fr=1.4;s.l=0;spark(s.x,s.y,'#bfeaff',8)}}}}
 for(let i=SP.length-1;i>=0;i--)if(SP[i].l<=0)SP.splice(i,1);
 for(let i=LT.length-1;i>=0;i--){LT[i].t-=dt;if(LT[i].t<=0){LT[i].f();LT.splice(i,1)}}
 for(let i=1;i<4;i++)SC[i]=Math.max(0,SC[i]-dt);
 SK2.forEach((b,i)=>{b.lastChild.style.height=Math.min(1,Math.max(0,i?SC[i]/SCD[i]:P.scd))*100+'%';b.classList.toggle('lk',P.r<i);b.classList.toggle('lm',P.mp<SMP[i])});
 if(P.r>lr)burst();lr=P.r};
const _dr2=dr;let l2=performance.now();
dr=function(){_dr2();const now=performance.now(),dt=Math.min(.05,(now-l2)/1000);l2=now;const vw=W/Z,vh=H/Z,{x:cx,y:cy}=gameCamera(vw,vh);
 g.setTransform(Z,0,0,Z,-cx*Z,-cy*Z);
 for(const s of SP){if(s.k==1){glow(s.x,s.y,16,'rgba(150,220,255,.9)',.6);g.save();g.translate(s.x,s.y);g.rotate(s.a);g.fillStyle='#e8fbff';g.beginPath();g.moveTo(8,0);g.lineTo(0,-2.5);g.lineTo(-7,0);g.lineTo(0,2.5);g.fill();g.fillStyle='#7fd0ff';g.fillRect(-5,-1,8,2);g.restore();if(Math.random()<.6)PT.push({x:s.x,y:s.y,vx:rn(-10,10),vy:rn(-10,10),l:.3,m:.3,c:'#bfeaff',s:2})}
  else{glow(s.x,s.y,34,'rgba(160,255,210,.8)',.5);g.save();g.translate(s.x,s.y);g.rotate(s.a);g.globalCompositeOperation='lighter';[[16,'rgba(230,255,245,.95)',4],[10,'rgba(130,255,200,.6)',3],[22,'rgba(130,255,200,.3)',2]].forEach(([r,c,w])=>{g.strokeStyle=c;g.lineWidth=w;g.beginPath();g.arc(-6,0,r,-1,1);g.stroke()});g.restore();PT.push({x:s.x-rn(0,12)*Math.cos(s.a),y:s.y-rn(0,12)*Math.sin(s.a)+rn(-8,8),vx:0,vy:rn(-10,10),l:.4,m:.4,c:'#a8ffd8',s:2})}}
 for(const e of E){if(e.dead)continue;const k=T[e.t];
  if(e.fr>0&&!window.creatureArt){g.fillStyle='rgba(150,220,255,.5)';g.fillRect(e.x-k.s/2-3,e.y-k.s/2-3,k.s+6,k.s+6);g.strokeStyle='#e8fbff';g.lineWidth=1.5;g.strokeRect(e.x-k.s/2-3,e.y-k.s/2-3,k.s+6,k.s+6);g.fillStyle='#fff';g.fillRect(e.x-k.s/2,e.y-k.s/2,3,3)}
  if(e.fl>0){e.fl-=dt;glow(e.x,e.y,k.s*1.3,'rgba(255,255,255,1)',.7)}
  if(e.t==2){g.save();g.globalCompositeOperation='lighter';g.strokeStyle='rgba(255,100,40,.55)';g.lineWidth=2;g.beginPath();g.ellipse(e.x,e.y+11,36+3*Math.sin(tm*4),13,0,0,6.3);g.stroke();g.restore();if(Math.random()<.5)PT.push({x:e.x+rn(-20,20),y:e.y+rn(-4,10),vx:0,vy:-rn(20,45),l:.9,m:.9,c:'#ff9a4a',s:2})}}
 for(let i=V.length-1;i>=0;i--){const v=V[i];v.l-=dt;if(v.l<=0){V.splice(i,1);continue}v.f(1-v.l/v.m)}
 g.setTransform(1,0,0,1,0,0);shk*=.88;cv.style.transform=shk>.3?'translate('+rn(-shk,shk)+'px,'+rn(-shk,shk)+'px)':''};
// Điểm tạm dừng giao diện; người chơi vào màn tạo nhân vật trực tiếp.
const ttl=document.createElement('div');ttl.id='ttl';ttl.style.display='none';document.body.appendChild(ttl);
