/* Tiềm năng theo phái: mỗi phái có điểm mạnh riêng (bạo kích, skill, máu, né) và hệ số
   thuộc tính riêng; nút "Cộng theo đề xuất" chia điểm theo tỉ lệ hợp phái.
   Số liệu chép từ Character/sect-potential.json (server dùng cùng file, test giữ hai bên bằng nhau). */
(function(){
 'use strict';
 const DATA={"base":{"luc":{"atk":2},"the":{"hp":15,"armorEvery":5},"nhanh":{"crit":0.006,"dodge":0.004},"linh":{"mp":8,"skill":0.005}},"sects":[{"name":"Kiếm Tông","role":"Kiếm khách bạo kích","strength":"Bạo kích cao nhất: +6% bạo, +25% sát thương bạo, trần bạo 50%. Lực và Nhanh hiệu quả hơn.","attr":{"luc":{"atk":2.2},"nhanh":{"crit":0.008}},"stats":{"crit":0.06,"critDamage":0.25,"critCap":0.5,"hpPercent":0,"skill":0,"dodge":0},"suggest":{"luc":5,"nhanh":4,"the":1,"linh":0}},{"name":"Minh Nguyệt","role":"Pháp sư băng nguyệt","strength":"Sát thương kỹ năng cao nhất: +12% skill, Linh tăng skill và linh lực mạnh hơn; máu -8%.","attr":{"linh":{"mp":10,"skill":0.008}},"stats":{"crit":0.03,"critDamage":0.1,"critCap":0.4,"hpPercent":-0.08,"skill":0.12,"dodge":0},"suggest":{"linh":5,"the":2,"luc":2,"nhanh":1}},{"name":"Lôi Thương","role":"Thương thủ trấn tuyến","strength":"Trâu nhất: +20% máu, Thể cho nhiều máu và giáp hơn, Lực mạnh hơn; sát thương hơi thấp.","attr":{"luc":{"atk":2.2},"the":{"hp":20,"armorEvery":4}},"stats":{"crit":0.02,"critDamage":0.1,"critCap":0.35,"hpPercent":0.2,"skill":0,"dodge":0},"suggest":{"the":4,"luc":4,"nhanh":2,"linh":0}},{"name":"Thiên Cơ","role":"Phù sư thiên cơ","strength":"Linh hoạt: +8% skill, +3% né, trần bạo 45%; Linh tăng skill, Nhanh tăng né mạnh hơn.","attr":{"linh":{"skill":0.007},"nhanh":{"dodge":0.006}},"stats":{"crit":0.04,"critDamage":0.15,"critCap":0.45,"hpPercent":-0.04,"skill":0.08,"dodge":0.03},"suggest":{"linh":4,"nhanh":3,"luc":2,"the":1}}],"classDamage":[0.84,0.86,1.0,1.07]};
 const KEYS=['luc','the','nhanh','linh'];
 const sect=()=>DATA.sects[P.ap?.w]||null;
 const coef=(attr,key)=>{const s=sect();const v=s?.attr?.[attr]?.[key];return v??DATA.base[attr][key]??0;};
 const stat=(key,def=0)=>sect()?.stats?.[key]??def;
 const critCap=()=>stat('critCap',.35);
 const base=window.bonusStats;
 if(base)window.bonusStats=function(){const b=base(),a=window.inventory?.progress?.().attrs||{},n=k=>Math.max(0,Math.min(1000,a[k]||0)),B=DATA.base;
  const delta=(attr,key)=>n(attr)*(coef(attr,key)-(B[attr][key]||0));
  const armorEvery=coef('the','armorEvery'),armor=Math.floor(n('the')/armorEvery)-Math.floor(n('the')/B.the.armorEvery);
  return{...b,atk:b.atk+delta('luc','atk'),hp:b.hp+delta('the','hp'),mp:b.mp+delta('linh','mp'),armor:b.armor+armor,
   crit:Math.min(critCap(),b.crit+stat('crit')+delta('nhanh','crit')),dodge:Math.min(.2,b.dodge+stat('dodge')+delta('nhanh','dodge')),
   skill:b.skill+stat('skill')+delta('linh','skill'),critDamage:(b.critDamage||0)+stat('critDamage'),hpPercent:(b.hpPercent||0)+stat('hpPercent')};};
 // Chia điểm: mỗi điểm vào thuộc tính đang thiếu nhiều nhất so với tỉ lệ đề xuất của phái.
 // Nhanh dừng khi bạo đã chạm trần (điểm thừa chuyển sang thuộc tính khác).
 function suggest(points,attrs){const s=sect(),add={luc:0,the:0,nhanh:0,linh:0};if(!s||!(points>0))return add;
  const cur=k=>(attrs?.[k]||0)+add[k],gearCrit=()=>{try{return window.bonusStats().crit-(stat('crit')+(attrs?.nhanh||0)*coef('nhanh','crit'));}catch{return 0;}};
  const g=Math.max(0,gearCrit()),critFull=k=>k==='nhanh'&&g+stat('crit')+cur('nhanh')*coef('nhanh','crit')>=critCap()&&stat('dodge')+cur('nhanh')*coef('nhanh','dodge')>=.2;
  for(let i=0;i<points;i++){let w=KEYS.filter(k=>s.suggest[k]>0&&cur(k)<1000&&!critFull(k));if(!w.length)w=KEYS.filter(k=>cur(k)<1000&&k!=='nhanh'&&s.suggest[k]>0);if(!w.length)break;
   const sum=w.reduce((t,k)=>t+s.suggest[k],0),total=w.reduce((t,k)=>t+cur(k),0)+1;
   const pick=w.reduce((best,k)=>{const need=s.suggest[k]/sum*total-cur(k);return need>best[1]?[k,need]:best;},[null,-Infinity])[0];add[pick]++;}
  return add;}
 const ratioText=()=>{const s=sect(),N={luc:'Lực',the:'Thể',nhanh:'Nhanh',linh:'Linh'};if(!s)return'';const sum=KEYS.reduce((t,k)=>t+s.suggest[k],0);
  return KEYS.filter(k=>s.suggest[k]>0).sort((a,b)=>s.suggest[b]-s.suggest[a]).map(k=>N[k]+' '+Math.round(s.suggest[k]/sum*100)+'%').join(' · ');};
 const hint=attr=>{const parts=[],c=k=>coef(attr,k);
  if(attr==='luc')parts.push('+'+c('atk')+' công');if(attr==='the')parts.push('+'+c('hp')+' máu, +1 giáp mỗi '+c('armorEvery')+' điểm');
  if(attr==='nhanh')parts.push('+'+(c('crit')*100).toFixed(1)+'% bạo, +'+(c('dodge')*100).toFixed(1)+'% né');if(attr==='linh')parts.push('+'+c('mp')+' linh lực, +'+(c('skill')*100).toFixed(1)+'% skill');
  return parts.join(', ')+' / điểm';};
 window.sectPotential={data:DATA,sect,coef,stat,critCap,suggest,ratioText,hint,classDamage:i=>DATA.classDamage[i]??1};
})();
