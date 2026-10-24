/* Serve the WebP twin (same pixel size, ~4x lighter) of any game PNG.
   Every <img>/Image() whose src points at Character/, Item/, Map/ or Skill/ *.png
   is rewritten to .webp when tools/build_webp.py produced one. */
(function(){
 const list=window.webpAssets||[];if(!list.length)return;
 const probe=document.createElement('canvas');probe.width=probe.height=1;
 if(!probe.toDataURL('image/webp').startsWith('data:image/webp'))return;
 const set=new Set(list),base=location.origin+location.pathname.replace(/[^/]*$/,'');
 function swap(value){if(typeof value!=='string'||!value.includes('.png'))return value;
  let path=value,prefix='';if(path.startsWith(base)){prefix=base;path=path.slice(base.length);}else if(/^[a-z]+:/i.test(path))return value;
  if(path.startsWith('/')){prefix+='/';path=path.slice(1);}const q=path.indexOf('?'),file=q<0?path:path.slice(0,q),rest=q<0?'':path.slice(q);
  let key=file;try{key=decodeURIComponent(file);}catch{}
  return set.has(key)?prefix+file.slice(0,-4)+'.webp'+rest:value;}
 const desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
 Object.defineProperty(HTMLImageElement.prototype,'src',{configurable:true,enumerable:desc.enumerable,get(){return desc.get.call(this);},set(v){desc.set.call(this,swap(v));}});
 const setAttribute=Element.prototype.setAttribute;
 Element.prototype.setAttribute=function(name,value){return setAttribute.call(this,name,this instanceof HTMLImageElement&&String(name).toLowerCase()==='src'?swap(value):value);};
 window.webpURL=swap;
})();
