/* Per-class art on demand. Skill frames, motion sheets, faces and bodies of a sect are
   only downloaded once that sect is on screen: the player's own sect, a sect picked in
   the character creator, or another player of that sect drawn nearby. A newcomer no
   longer downloads all four sects' art (several MB) before seeing the login screen.
   Images keep their src assignment order; they simply start loading later. */
(function(){
 'use strict';
 const FOLDERS=['Kiem','Liem','Thuong','Quat'];
 const RULES=FOLDERS.map(f=>new RegExp('(^|/)(Skill/Class/'+f+'/|Skill/Basic/'+f+'-|Character/Motion/'+f+'-|Character/Expressions/'+f+'/|Character/'+f+'/)'));
 const desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
 const ready=new Set(),queue=FOLDERS.map(()=>[]);
 const classOf=v=>{if(typeof v!=='string')return -1;for(let i=0;i<RULES.length;i++)if(RULES[i].test(v))return i;return -1;};
 Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:desc.enumerable,get(){return desc.get.call(this);},
  set(v){const c=classOf(v);if(c<0||ready.has(c)){desc.set.call(this,v);return;}queue[c].push([this,v]);}});
 function need(c){c=Number(c);if(!(c>=0&&c<FOLDERS.length)||ready.has(c))return;ready.add(c);for(const [img,v] of queue[c].splice(0))desc.set.call(img,v);}
 // Who is on screen: hook drawChar (defined later) and watch the player's own sect.
 let hooked=null;const creatorOpen=()=>!!window.account?.state?.user&&document.getElementById('cr')?.style.display==='flex';
 setInterval(()=>{
  if(typeof P!=='undefined'&&P?.ap&&P.ap.w!=null)need(P.ap.w);
  if(typeof tp!=='undefined'&&tp?.w!=null&&creatorOpen())need(tp.w);
  if(typeof drawChar==='function'&&drawChar!==hooked){const base=drawChar;hooked=function(ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest){if(ap&&ap.w!=null&&!ready.has(ap.w)&&window.account?.state?.user&&(P.ap||creatorOpen()||ap!==window.tp))need(ap.w);return base.call(this,ctx,x,y,dir,facing,moving,phase,attacking,ap,...rest);};drawChar=hooked;}
 },250);
 // Safety net: everything loads anyway once the game has been running for a while.
 setTimeout(()=>{for(let c=0;c<FOLDERS.length;c++)need(c);},120000);
 window.assetGate={need,ready};
})();
