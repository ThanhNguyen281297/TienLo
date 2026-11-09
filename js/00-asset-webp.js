/* The one image-path resolver. Every <img>/Image() src (set from script, setAttribute or
   inserted markup) that points at a game PNG is rewritten once:
     1. pixel art version  <name>.px.png  (window.pixelAssets, tools/pixel/*)
     2. display-size WebP  <name>.d.webp  (window.displayAssets)
     3. WebP twin          <name>.webp    (window.webpAssets)
   Nothing else rewrites image paths (js/00-asset-gate.js only delays per-sect loads). */
(function(){
 'use strict';
 const pixel=new Set(window.pixelAssets||[]),webp=new Set(window.webpAssets||[]),display=window.displayAssets||{};
 const probe=document.createElement('canvas');probe.width=probe.height=1;
 const canWebp=probe.toDataURL('image/webp').startsWith('data:image/webp');
 const base=location.origin+location.pathname.replace(/[^/]*$/,'');
 function pick(key,file){
  if(pixel.has(key))return file.slice(0,-4)+'.px.png';
  if(!canWebp)return null;
  if(Object.prototype.hasOwnProperty.call(display,key))return file.slice(0,-4)+'.d.webp';
  return webp.has(key)?file.slice(0,-4)+'.webp':null;
 }
 function swap(value){
  if(typeof value!=='string'||!/\.png(?:[?#]|$)/.test(value)||value.includes('.px.png'))return value;
  let path=value,prefix='';if(path.startsWith(base)){prefix=base;path=path.slice(base.length);}else if(/^[a-z]+:/i.test(path))return value;
  if(path.startsWith('/')){prefix+='/';path=path.slice(1);}
  const q=path.search(/[?#]/),file=q<0?path:path.slice(0,q),rest=q<0?'':path.slice(q);
  let key=file;try{key=decodeURIComponent(file);}catch{}
  const chosen=pick(key,file);return chosen?prefix+chosen+rest:value;
 }
 const desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
 Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:desc.enumerable,get(){return desc.get.call(this);},set(v){desc.set.call(this,swap(v));}});
 const setAttribute=Element.prototype.setAttribute;
 Element.prototype.setAttribute=function(name,value){return setAttribute.call(this,name,this instanceof HTMLImageElement&&String(name).toLowerCase()==='src'?swap(value):value);};
 // Markup inserted with innerHTML bypasses both setters.
 const fix=img=>{const v=img.getAttribute('src');if(v){const s=swap(v);if(s!==v)setAttribute.call(img,'src',s);}};
 new MutationObserver(list=>{for(const m of list)for(const n of m.addedNodes){if(n.nodeType!==1)continue;if(n.tagName==='IMG')fix(n);else if(n.querySelectorAll)n.querySelectorAll('img').forEach(fix);}})
  .observe(document.documentElement,{childList:true,subtree:true});
 window.webpURL=window.pixelURL=swap;
})();
