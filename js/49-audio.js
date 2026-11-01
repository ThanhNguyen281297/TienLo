/* Âm thanh trong game đã tắt hẳn: không nhạc nền, không hiệu ứng, không nút loa.
   The old procedural music/effects engine lives in git history (before this commit).
   Other modules still call window.gameAudio?.play(...); these calls are now no-ops. */
(function(){
 'use strict';
 try{localStorage.removeItem('tienlo-audio');}catch{}
 const none=()=>{};
 window.gameAudio={play:none,start:none,get mode(){return 'off';},moodOf:()=>'',get context(){return null;},tap:none};
})();
