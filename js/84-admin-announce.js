/* Thông báo từ Ban quản trị: a banner in the middle of the screen (not in chat).
   The server sends live announcements with every world update (admin.py → ANNOUNCE);
   each one is shown once, for the number of seconds the GM chose, then fades out.
   Several announcements queue one after another. */
(function(){
 'use strict';
 const seen=new Set(),queue=[];let showing=false;
 const box=document.createElement('section');box.id='admin-announce';box.setAttribute('role','alert');box.setAttribute('aria-live','assertive');box.hidden=true;
 const head=document.createElement('div');head.className='aa-head';head.textContent='THÔNG BÁO TỪ ADMIN';
 const text=document.createElement('p');text.className='aa-text';
 const close=document.createElement('button');close.type='button';close.className='aa-close';close.setAttribute('aria-label','Đóng thông báo');close.textContent='✕';
 box.append(head,text,close);document.body.append(box);
 let timer=0;
 function next(){if(!queue.length){showing=false;return;}showing=true;const a=queue.shift();text.textContent=a.text;box.hidden=false;box.classList.remove('out');void box.offsetWidth;box.classList.add('in');
  clearTimeout(timer);timer=setTimeout(hide,Math.max(3,Math.min(60,a.seconds||10))*1000);}
 function hide(){clearTimeout(timer);box.classList.remove('in');box.classList.add('out');setTimeout(()=>{box.hidden=true;next();},450);}
 close.onclick=hide;
 function receive(data){for(const a of data?.announce||[]){if(!a||seen.has(a.id))continue;seen.add(a.id);queue.push(a);}if(!showing&&queue.length)next();}
 const css=document.createElement('style');css.textContent=`
#admin-announce{position:fixed;left:50%;top:38%;transform:translate(-50%,-50%) scale(.92);z-index:30;width:min(640px,calc(100vw - 32px));padding:18px 44px 20px;border-radius:16px;text-align:center;pointer-events:auto;opacity:0;
 background:linear-gradient(180deg,#2a1406f2,#140a04f2);border:2px solid #f0c66a;box-shadow:0 0 0 4px #00000066,0 18px 60px #000c,0 0 40px #ffb84a55;color:#fff3d6;transition:opacity .4s,transform .4s}
#admin-announce[hidden]{display:none}
#admin-announce.in{opacity:1;transform:translate(-50%,-50%) scale(1)}
#admin-announce.out{opacity:0;transform:translate(-50%,-50%) scale(.96)}
#admin-announce .aa-head{display:inline-block;margin-bottom:8px;padding:3px 14px;border-radius:999px;background:linear-gradient(180deg,#ffe08a,#d39a3a);color:#2a1406;font:800 13px/1.4 system-ui,Arial,sans-serif;letter-spacing:.18em}
#admin-announce .aa-text{margin:0;font:700 clamp(17px,2.6vw,24px)/1.45 system-ui,Arial,sans-serif;text-shadow:0 2px 6px #000;white-space:pre-wrap;word-break:break-word}
#admin-announce .aa-close{position:absolute;right:10px;top:10px;width:28px;height:28px;min-height:0!important;padding:0;border-radius:50%;border:1px solid #f0c66a88;background:#00000055;color:#ffe7b0;font-size:13px;cursor:pointer}
@media(prefers-reduced-motion:reduce){#admin-announce{transition:none}}`;document.head.append(css);
 window.adminAnnounce={receive};
})();
