/* Shared catalog. Ratios use basis points; affixes do not scale with enhancement. */
(function(){
 const rules=equipmentRules,templates=[...rules.rings,...rules.shields,...rules.backs,...rules.formations],byId=new Map(templates.map(t=>[t.id,t])),statKeys=['atk','hp','mp','armor','crit','dodge','skill'];
 const pool=item=>item?.slot==='phapbao'?rules.offense:item?.slot==='ngoc'?rules.defense:[];
 const defaults=item=>pool(item).slice(0,5).map(r=>({key:r.key,value:r.min}));
 const capacity=p=>30+(byId.get(p?.equip?.gioi?.id)?.capacity||0);
 const collection=id=>{const m=/^rift-([a-z]+)-([a-z]+)-(0|10|25|45)$/.exec(id);if(!m)return null;const set=buildCatalog.sets.find(s=>s.id===m[1]),grade=buildCatalog.grades.find(g=>g.req===Number(m[3])),slot=m[2];if(!set||!grade||!buildCatalog.baseStats[slot])return null;const stats={};for(const [k,v]of Object.entries(buildCatalog.baseStats[slot]))stats[k]=Math.round(v*(['crit','dodge','skill'].includes(k)?1:grade.scale)*100)/100;return{id,setId:set.id,slot,req:grade.req,rarity:grade.rarity,...stats};};
 function normalize(p,cls=P.ap?.w||0){
  p.bag??=[];p.equip??={};if(p.equipmentVersion>=2)return p;
  if(p.equip.gioi?.id.startsWith('rift-')){p.equip.chan=p.equip.gioi;p.equip.gioi=null;}
  for(const item of [...p.bag,...Object.values(p.equip).filter(Boolean)]){
   let id=item.id,meta;
   const wi=['moc-kiem','huyen-kiem','linh-kiem','tien-kiem'].indexOf(id);if(wi>=0)item.name=rules.weaponNames[cls][wi];
   if(id.startsWith('rift-')){id=id.replace('-gioi-','-chan-');meta=collection(id);}
   else if(['thach-ngoc','tu-linh-ngoc','minh-nguyet-ngoc'].includes(id))meta=byId.get('shield-'+(1+['thach-ngoc','tu-linh-ngoc','minh-nguyet-ngoc'].indexOf(id)));
   else if(['ho-tam-kinh','tu-linh-chau','cuu-chuyen-dinh'].includes(id))meta=byId.get('back-class-'+cls);
   else meta=byId.get(id);
   if(meta){for(const key of statKeys)delete item[key];Object.assign(item,meta);if(id.startsWith('rift-')&&item.name)item.name=item.name.replace('Nhẫn','Hộ thối').replace('Linh ngọc','Hộ thuẫn');}
   if(pool(item).length)item.affixes=defaults(item);
  }
  for(const [slot,id]of [['phapbao','back-class-'+cls],['phaptran','formation-'+cls]])if(!p.equip[slot]){const item={...byId.get(id),uid:crypto.randomUUID()};if(pool(item).length)item.affixes=defaults(item);p.equip[slot]=item;}
  for(const slot of Object.keys(rules.slots))p.equip[slot]??=null;
  p.equipmentVersion=2;return p;
 }
 function affixStats(p){const out={};for(const item of Object.values(p.equip||{})){if(!item)continue;for(const line of item.affixes||[]){const rule=pool(item).find(r=>r.key===line.key);if(rule)out[line.key]=(out[line.key]||0)+line.value/(rule.percent?10000:rule.key==='regen'?100:1);}}return out;}
 window.equipmentData={rules,templates,byId,pool,defaults,capacity,normalize,affixStats};
})();
