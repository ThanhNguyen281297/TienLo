/* Pixel art style switch (set from ⚙ → Phong cách; default Pixel), applied before any art loads.
   - js/00-pixel-on.js adds html.pixel-art when the game boots, so css/pixel-ui.css restyles the interface;
   - points item icons and NPC portraits at their pixel versions (*.px.png, tools/pixel/icons.py),
     for src set from script, setAttribute and markup inserted later. */
(function(){
 'use strict';
 let style='pixel';try{style=localStorage.getItem('tienlo-art-style')||'pixel';}catch{}
 window.artStyle=window.artStyle||{get:()=>style,set(v){try{localStorage.setItem('tienlo-art-style',v);}catch{}location.reload();}};
 if(style!=='pixel')return;
 const set=new Set(window.pixelAssets||[]);if(!set.size)return;
 const base=location.origin+location.pathname.replace(/[^/]*$/,'');
 // Only inside the game: js/00-pixel-on.js (first script of the game boot) sets html.pixel-art.
 const on=()=>document.documentElement.classList.contains('pixel-art');
 function swap(value){
  if(typeof value!=='string'||value.includes('.px.png')||!on())return value;
  let path=value,prefix='';if(path.startsWith(base)){prefix=base;path=path.slice(base.length);}else if(/^[a-z]+:/i.test(path))return value;
  if(path.startsWith('/')){prefix+='/';path=path.slice(1);}
  const q=path.indexOf('?'),file=q<0?path:path.slice(0,q),rest=q<0?'':path.slice(q);
  let key=file.replace(/\.d\.webp$|\.webp$/,'.png');try{key=decodeURIComponent(key);}catch{}
  return set.has(key)?prefix+key.slice(0,-4)+'.px.png'+rest:value;
 }
 const desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
 Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:desc.enumerable,get(){return desc.get.call(this);},set(v){desc.set.call(this,swap(v));}});
 const setAttr=Element.prototype.setAttribute;
 Element.prototype.setAttribute=function(name,value){return setAttr.call(this,name,this instanceof HTMLImageElement&&String(name).toLowerCase()==='src'?swap(value):value);};
 // Markup inserted with innerHTML bypasses both setters.
 const fix=img=>{const v=img.getAttribute('src');if(v){const s=swap(v);if(s!==v)setAttr.call(img,'src',s);}};
 new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.tagName==='IMG')fix(n);else if(n.querySelectorAll)n.querySelectorAll('img').forEach(fix);}})
  .observe(document.documentElement,{childList:true,subtree:true});
 addEventListener('DOMContentLoaded',()=>document.querySelectorAll('img').forEach(fix));
 window.pixelURL=swap;
})();
