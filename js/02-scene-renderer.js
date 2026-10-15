/* Vẽ cảnh đang dùng: actor theo chiều sâu, ánh sáng và hạt chiến đấu. */
const PT=[],rn=(a,b)=>a+Math.random()*(b-a);
function spark(x,y,c,n){for(let i=0;i<n;i++){const a=rn(0,6.28),s=rn(30,120);PT.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-25,l:rn(.25,.6),m:.6,c,s:rn(1.5,3)})}}
const _hit=hit;hit=function(e,v){const k=T[e.t];_hit(e,v);spark(e.x,e.y-k.s/2,e.hp<=0?'#ffd27a':'#fff1b8',e.hp<=0?20:7)};
let human, mon, drawGround, sit, orbit;
function sh(x,y,w,h,a=.28){g.fillStyle='rgba(20,15,10,'+a+')';g.beginPath();g.ellipse(x,y,w,h,0,0,6.3);g.fill()}
function glow(x,y,r,c,a){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.save();g.globalCompositeOperation='lighter';g.globalAlpha=a;g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);g.restore()}
let lpx=0,lpy=0,lt=performance.now();
dr=function(){const now=performance.now(),dt=Math.min(.05,(now-lt)/1000);lt=now;
 P.mv=P.x!=lpx||P.y!=lpy;lpx=P.x;lpy=P.y;
 const vw=W/Z,vh=H/Z,{x:cx,y:cy}=gameCamera(vw,vh);
 g.setTransform(1,0,0,1,0,0);g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.fillStyle='#171310';g.fillRect(0,0,W,H);
 g.setTransform(Z,0,0,Z,-cx*Z,-cy*Z);drawGround(cx,cy,vw,vh);window.worldMap?.drawGroundDetails(g,cx,cy,vw,vh);window.classCombat?.drawGroundEffects(g);
 if(P.med||P.xp>=need()){const c=P.med?'95,224,192':'217,164,65',p=Math.sin(tm*4);g.lineWidth=2;for(let i=0;i<3;i++){g.strokeStyle='rgba('+c+','+(.7-i*.2)+')';g.beginPath();g.ellipse(P.x,P.y+2,14+i*6+p*2,6+i*2.5+p,0,0,6.3);g.stroke()}glow(P.x,P.y,40,'rgba('+c+',.8)',.3)}
 const it=[];
 window.worldMap?.queueActors(it,cx,cy,vw,vh);
 for(const e of E)if(!e.dead&&e.x>cx-60&&e.x<cx+vw+60&&e.y>cy-60&&e.y<cy+vh+60)it.push([e.y+T[e.t].s/2,()=>mon(e)]);
 it.push([P.y,human]);it.sort((a,b)=>a[0]-b[0]);for(const o of it){try{o[1]()}catch(e){showErr(e)}g.globalAlpha=1;g.globalCompositeOperation='source-over';g.setLineDash([])}
 if(P.med)for(let i=0;i<6;i++){const a=tm*2+i*1.047;glow(P.x+Math.cos(a)*24,P.y-12+Math.sin(a)*8,9,'rgba(120,255,220,.9)',.8)}
 for(const b of B){glow(b.x,b.y,26,'rgba(255,140,50,.9)',.6);g.fillStyle='#ff8a3d';g.beginPath();g.arc(b.x,b.y,4.5,0,6.3);g.fill();g.fillStyle='#fff3b0';g.beginPath();g.arc(b.x,b.y,2.4,0,6.3);g.fill();PT.push({x:b.x,y:b.y,vx:rn(-15,15),vy:rn(-15,15),l:.35,m:.35,c:'#ff9a4a',s:rn(2,3.5)})}
 if(P.med&&Math.random()<dt*25)PT.push({x:P.x+rn(-16,16),y:P.y+rn(-4,6),vx:0,vy:-rn(25,50),l:1,m:1,c:'#7ff0d0',s:rn(1.5,2.5)});
 g.save();g.globalCompositeOperation='lighter';for(const p of PT){p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.m<.7)p.vy+=60*dt;g.globalAlpha=Math.max(0,p.l/p.m);g.fillStyle=p.c;g.fillRect(p.x,p.y,p.s,p.s)}g.restore();
 for(let i=PT.length-1;i>=0;i--)if(PT[i].l<=0)PT.splice(i,1);
 g.textAlign='center';g.font='bold 11px Georgia,serif';g.lineWidth=3;g.strokeStyle='rgba(20,12,8,.9)';
 for(const f of X){g.globalAlpha=Math.min(1,f.l*2);g.strokeText(f.t,f.x,f.y);g.fillStyle=f.c;g.fillText(f.t,f.x,f.y)}g.globalAlpha=1;
 g.setTransform(1,0,0,1,0,0);
};
