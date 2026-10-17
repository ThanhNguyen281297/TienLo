/* Shared catalog. Ratios use basis points; affixes do not scale with enhancement. */
(function(){
 const rules=equipmentRules,templates=[...rules.classGear,...rules.rings,...rules.shields,...rules.backs,...rules.formations],byId=new Map(templates.map(t=>[t.id,t])),statKeys=['atk','hp','mp','armor','crit','dodge','skill'];
 const pool=item=>item?.slot==='phapbao'?rules.offense:item?.slot==='ngoc'?rules.defense:[];
 const defaults=item=>pool(item).slice(0,5).map(r=>({key:r.key,value:r.min}));
 const capacity=p=>30+(byId.get(p?.equip?.gioi?.id)?.capacity||0);
 function collection(id){const m=/^rift-([a-z]+)-([a-z]+)-(0|10|25|45)$/.exec(id);if(!m)return null;const slot=m[2]==='gioi'?'chan':m[2];return rules.collectionAppearance[m[1]]&&rules.legacyCollection.slots[slot]?{id,slot,setId:m[1],req:Number(m[3])}:null;}
 function canonicalId(id,cls=P.ap?.w||0){if(byId.has(id))return id;if(rules.classGear.some(t=>t.baseId===id))return id+'-class-'+cls;
  const gems=['thach-ngoc','tu-linh-ngoc','minh-nguyet-ngoc'];if(gems.includes(id))return 'shield-'+(gems.indexOf(id)+1);
  if(['ho-tam-kinh','tu-linh-chau','cuu-chuyen-dinh'].includes(id))return 'back-class-'+cls;
  const old=collection(id);if(!old)return id;if(rules.classSlots.includes(old.slot))return rules.legacySlotTiers[old.slot][[0,10,25,45].indexOf(old.req)]+'-class-'+cls;
  const style=rules.collectionAppearance[old.setId];return old.slot==='phapbao'?style.back:'shield-'+style.shield;
 }
 function normalize(p,cls=P.ap?.w||0){
  p.bag??=[];p.equip??={};if(p.equipmentVersion>=4)return p;
  if(p.equip.gioi?.id.startsWith('rift-')){p.equip.chan=p.equip.gioi;p.equip.gioi=null;}
  function convert(item){const meta=byId.get(canonicalId(item.id,cls));if(meta){for(const key of [...statKeys,'classIndex','art','capacity','variant','setId','source','baseId'])delete item[key];Object.assign(item,meta);if(pool(item).length&&!item.affixes)item.affixes=defaults(item);}else{delete item.setId;delete item.source;}}
  for(const item of [...p.bag,...Object.values(p.equip).filter(Boolean)])convert(item);
  if(p.riftPendingItem){const item={id:p.riftPendingItem,uid:crypto.randomUUID()};convert(item);if(byId.has(item.id)){if(p.bag.length<capacity(p))p.bag.push(item);else P.gold=Math.min(1e9,P.gold+Math.max(1,item.price||60));}}
  if(p.riftShards>0){const gold=Math.min(1e9,p.riftShards*20);P.gold=Math.min(1e9,P.gold+gold);p.retiredShardGold=(p.retiredShardGold||0)+gold;}
  if(p.thangViFragments>0)P.gold=Math.min(1e9,P.gold+p.thangViFragments);delete p.thangViFragments;
  delete p.riftShards;delete p.riftFocus;delete p.riftPendingItem;
  for(const slot of Object.keys(rules.slots))p.equip[slot]??=null;p.equipmentVersion=4;return p;
 }
 function shieldVariant(item){const meta=byId.get(item?.id),style=item?.id?.startsWith('rift-')?rules.collectionAppearance[item.setId]:null;return meta?.variant||style?.shield||1;}
 function appearance(item){if(!item)return null;const meta=byId.get(item.id),style=item.id?.startsWith('rift-')?rules.collectionAppearance[item.setId]:null;
  if(item.slot==='ngoc')return 'Item/Thuan/'+shieldVariant(item)+'.png';
  if(item.slot==='gioi')return 'Item/Nhan/gioi.png';
  if(item.slot==='phapbao'&&style)return byId.get(style.back).art;
  return meta?.art||null;
 }
 function affixStats(p){const out={};for(const item of Object.values(p.equip||{})){if(!item)continue;for(const line of item.affixes||[]){const rule=pool(item).find(r=>r.key===line.key);if(rule)out[line.key]=(out[line.key]||0)+line.value/(rule.percent?10000:rule.key==='regen'?100:1);}}return out;}
 window.equipmentData={rules,templates,byId,pool,defaults,capacity,canonicalId,normalize,affixStats,collection,appearance,shieldVariant};
})();
