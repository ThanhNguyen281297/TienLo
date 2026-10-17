/* Shared visual controls use existing raster assets and real gameplay handlers. */
(function(){
 const keys=[['phikiemquyet','kiemanhbo','batquaikiemtran','vankiemquytong'],['tamnguyettram','nguyetanhbo','nguyetluantran','minhnguyetgiangthe'],['loithuongdotkich','hoanhtaothienquan','cuuthienloitran','loilonggiangthe'],['philinhchu','phonglinhphien','thiencotran','vanphuphongan']];
 function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function art(src,cls='visual-art'){const img=node('img',cls);img.src=src.startsWith('data:')||/[?&]v=/.test(src)?src:artworkURL(src);img.alt='';img.loading='lazy';img.decoding='async';return img;}
 function skillArt(c,i){return art('Skill/Class/'+characterClasses[c].folder+'/'+keys[c][i]+'/03.png','visual-skill');}
 function chips(values,parent){const row=node('div','visual-chips');for(const [label,value]of values){const chip=node('span','visual-chip');chip.append(node('b','',String(value)),node('small','',label));row.append(chip);}parent.append(row);return row;}
 function meter(value,max,label,parent){const box=node('div','visual-meter'),p=node('progress');p.max=Math.max(1,max);p.value=Math.max(0,Math.min(max,value));p.setAttribute('aria-label',label);box.append(node('small','',label+' · '+Math.floor(value)+'/'+max),p);parent.append(box);return p;}
 function details(text,parent,label='Chi tiết'){const box=node('details','visual-details');box.append(node('summary','',label),node('p','',text));parent.append(box);return box;}
 function action(parent,text,handler,disabled=false){const b=node('button','visual-action',text);b.type='button';b.disabled=disabled;b.onclick=handler;parent.append(b);return b;}
 function panel(title,src,parent=$('world-content')){const card=node('article','visual-card');if(src)card.append(art(src));const body=node('div','visual-card-body');body.append(node('h3','',title));card.append(body);parent.append(card);return {card,body};}
 window.visualUI={node,art,skillArt,chips,meter,details,action,panel};
 let toastTimer;addEventListener('tienlo-item-success',event=>{let toast=$('item-success');if(!toast){toast=node('aside','');toast.id='item-success';toast.setAttribute('role','status');document.body.append(toast);}toast.replaceChildren(art(event.detail.src),node('div',''));const body=toast.lastChild;body.append(node('small','',event.detail.caption),node('b','',event.detail.name));toast.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.hidden=true,2400);});
 // Preserve important confirmation text. Long introductory prose is optional help.
 const d=worldMap.dialog,show=d.show;
 d.show=function(title,description=''){show(title,description);const section=$('world-title').closest('section');section.classList.add('visual-dialog');
   if(description.length>150&&!/Xác nhận|Rời đấu trường/.test(title)){$('world-description').textContent='';details(description,$('world-content'),'Cách chơi');}
 };
 const close=d.close;d.close=function(){const section=$('world-title').closest('section');section.classList.remove('visual-dialog');return close();};
})();
