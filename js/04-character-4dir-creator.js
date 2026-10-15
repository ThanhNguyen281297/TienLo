/* NHÂN VẬT 2D 4 HƯỚNG + TẠO ĐẠO THỂ */
const DEF={w:0,gender:'Nam'},AP=()=>P.ap||DEF;
let drawChar;
let hx=0,hy=0;
human=function(){if(P.med)return sit();orbit();const dx=P.x-hx,dy=P.y-hy;hx=P.x;hy=P.y;
 if(P.sl>0){const e=near(80);if(e){const ex=e.x-P.x,ey=e.y-P.y;if(Math.abs(ex)>Math.abs(ey)){P.dir=2;P.f=ex<0?-1:1}else P.dir=ey>0?0:1}}
 else if(dx||dy){if(Math.abs(dx)>Math.abs(dy)){P.dir=2;P.f=dx<0?-1:1}else P.dir=dy>0?0:1}
 const c=RC[P.r],d=P.dir||0;glow(P.x,P.y-8,34,c,.25);sh(P.x,P.y+1,8,3,.3);
 drawChar(g,P.x,P.y,d,P.f,P.mv,tm*10,P.sl>0,AP(),c);
 if(P.sl>0&&!window.basicCombat?.poseActive()){const vx=d==2?P.f:0,vy=d==0?1:d==1?-1:0,an=Math.atan2(vy,vx);g.save();g.globalCompositeOperation='lighter';g.strokeStyle='#bff';g.lineWidth=3;g.beginPath();g.arc(P.x+vx*10,P.y-10+vy*10,18,an-1,an+1);g.stroke();g.restore()}
 g.textAlign='center';g.font='bold 9px Georgia,serif';g.lineWidth=3;g.strokeStyle='rgba(20,12,8,.9)';const nt=(P.nm||'Đạo hữu')+' · '+(window.cultivation?.realmName()||R[P.r]);g.strokeText(nt,P.x,P.y-(window.characterNameHeight?.(AP())||48));g.fillStyle='#ffd27a';g.fillText(nt,P.x,P.y-(window.characterNameHeight?.(AP())||48))};
const _up=up;up=function(dt){if(cr.style.display!='none')return;_up(dt)};
const OPT=[];
const st2=document.createElement('style');st2.textContent='#cr{position:fixed;inset:0;z-index:9;background:rgba(23,19,16,.94);display:flex;align-items:center;justify-content:center;padding:12px}#cr .pn{width:min(340px,100%);background:#241d16;border:1px solid #8a6d3b;padding:16px;text-align:center;max-height:100%;overflow:auto}#cr h2{margin:0 0 8px;color:#d9a441;font-size:20px}#pv{width:160px;height:160px;border:1px solid #5a4a36;image-rendering:pixelated;background:#cfc3a1}.rw{display:flex;align-items:center;justify-content:space-between;margin:6px 0;font-size:14px}.rw span{flex:1}.rw button{padding:4px 12px;min-height:34px}#nm{width:100%;box-sizing:border-box;margin:10px 0;padding:10px;font:inherit;background:#171310;color:#e8dcc0;border:1px solid #5a4a36}#ok{width:100%}';document.head.appendChild(st2);
const cr=document.createElement('div');cr.id='cr';cr.innerHTML='<div class="pn"><h2>Tạo đạo thể</h2><canvas id="pv" width="320" height="320"></canvas><div id="rows"></div><input id="nm" maxlength="12" placeholder="Đạo hiệu (3–12 ký tự)"><button class="go" id="ok">Bước Vào Tiên Đồ</button></div>';document.body.appendChild(cr);
let tp={};const pv=$('pv').getContext('2d'),previewDensity=Math.max(1.5,Math.min(3,devicePixelRatio||1));$('pv').width=$('pv').height=Math.round(320*previewDensity);
// Module nhân vật theo phái đăng ký các lựa chọn và bản xem trước.
function rows(){}
function openCr(){if(P.ap)return;tp=Object.assign({},AP());$('nm').value=P.nm||'';rows();cr.style.display='flex'}
$('ok').onclick=()=>{const n=$('nm').value.trim();if(n.length<3){$('nm').style.borderColor='#b8412f';$('nm').placeholder='Đạo hiệu cần ít nhất 3 ký tự';return}P.ap=Object.assign({},tp);P.nm=n;K={};ptr=null;cr.style.display='none';msg('Chào mừng đạo hữu '+n+', tiên lộ mở ra.');saveCharacter()};
function previewCharacter(){if(cr.style.display!='none'){pv.setTransform(1,0,0,1,0,0);pv.clearRect(0,0,pv.canvas.width,pv.canvas.height);pv.imageSmoothingEnabled=true;pv.setTransform(2.8*previewDensity,0,0,2.8*previewDensity,160*previewDensity,220*previewDensity);const d=Math.floor(tm/1.6)%4;drawChar(pv,0,0,d===3?2:d,d===3?-1:1,false,tm*8,false,tp,'#5fb3a1');pv.setTransform(1,0,0,1,0,0)}requestAnimationFrame(previewCharacter)}
if(P.ap)cr.style.display='none';else openCr();
