/* Procedural sound: no audio files to download.
   - Music: pentatonic guzheng plucks over a soft drone, with a bamboo-flute
     line and taiko drums in battle zones. Mood follows the current map.
   - Effects: hits/crits, skill casts per class, monster deaths, hurt, pickups,
     level-ups, chests/rewards and UI taps.
   - The speaker button (top-right) cycles: all on → effects only → muted. */
(function(){
 let ctx=null,master,musicBus,sfxBus,noiseBuffer=null;
 const KEY='tienlo-audio';let mode='all';try{mode=localStorage.getItem(KEY)||'all';}catch{}
 const button=document.createElement('button');button.id='vl-audio';button.type='button';document.body.append(button);
 const ICON={all:'🔊',sfx:'🔉',off:'🔇'},LABEL={all:'Âm thanh: bật',sfx:'Chỉ hiệu ứng',off:'Tắt âm thanh'};
 function paintButton(){button.textContent=ICON[mode];button.setAttribute('aria-label',LABEL[mode]);button.title=LABEL[mode];}
 button.onclick=()=>{mode=mode==='all'?'sfx':mode==='sfx'?'off':'all';try{localStorage.setItem(KEY,mode);}catch{}paintButton();start();apply();};paintButton();

 function start(){if(ctx){if(ctx.state==='suspended'&&!document.hidden)ctx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();
  master=ctx.createGain();const limiter=ctx.createDynamicsCompressor();limiter.threshold.value=-3;limiter.knee.value=0;limiter.ratio.value=20;limiter.attack.value=.002;limiter.release.value=.1;master.connect(limiter);limiter.connect(ctx.destination);
  const comp=ctx.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=4;comp.connect(master);
  musicBus=ctx.createGain();sfxBus=ctx.createGain();musicBus.connect(comp);sfxBus.connect(comp);
  // a little hall reverb for the music
  const verb=ctx.createConvolver(),len=ctx.sampleRate*2.2,ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}
  verb.buffer=ir;const wet=ctx.createGain();wet.gain.value=.28;musicBus.connect(verb);verb.connect(wet);wet.connect(comp);
  noiseBuffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const n=noiseBuffer.getChannelData(0);for(let i=0;i<n.length;i++)n[i]=Math.random()*2-1;
  apply();}
 function apply(){if(!ctx)return;const t=ctx.currentTime;master.gain.setTargetAtTime(mode==='off'?0:2.4,t,.05);musicBus.gain.setTargetAtTime(mode==='all'?.55:0,t,.3);sfxBus.gain.setTargetAtTime(1,t,.05);}
 for(const ev of ['pointerdown','keydown','touchstart'])addEventListener(ev,start,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(!ctx)return;if(document.hidden)ctx.suspend();else ctx.resume();});

 // ---------- voices
 function env(g,t,a,peak,dec){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(peak,t+a);g.gain.exponentialRampToValueAtTime(0.0001,t+a+dec);}
 function tone(bus,freq,t,{type='sine',a=.005,peak=.3,dec=.4,detune=0,glide=0}={}){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(glide)o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*glide),t+a+dec);o.detune.value=detune;env(g,t,a,peak,dec);o.connect(g);g.connect(bus);o.start(t);o.stop(t+a+dec+.05);}
 function noise(bus,t,{dur=.15,peak=.3,f=1200,q=1,type='bandpass',sweep=0}={}){const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();s.buffer=noiseBuffer;fl.type=type;fl.frequency.setValueAtTime(f,t);if(sweep)fl.frequency.exponentialRampToValueAtTime(Math.max(60,f*sweep),t+dur);fl.Q.value=q;env(g,t,.004,peak,dur);s.connect(fl);fl.connect(g);g.connect(bus);s.start(t,Math.random()*.5);s.stop(t+dur+.05);}
 function pluck(freq,t,vol=.16){tone(musicBus,freq,t,{type:'triangle',a:.003,peak:vol,dec:1.3});tone(musicBus,freq*2,t,{type:'sine',a:.002,peak:vol*.35,dec:.5});tone(musicBus,freq*3.01,t,{type:'sine',a:.002,peak:vol*.12,dec:.25});}
 function flute(freq,t,dur){const o=ctx.createOscillator(),v=ctx.createOscillator(),vg=ctx.createGain(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;v.frequency.value=5.2;vg.gain.value=freq*.012;v.connect(vg);vg.connect(o.frequency);
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(.07,t+.18);g.gain.setValueAtTime(.07,t+dur*.7);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.connect(g);g.connect(musicBus);o.start(t);v.start(t);o.stop(t+dur+.05);v.stop(t+dur+.05);noise(musicBus,t,{dur:.12,peak:.02,f:freq*2,q:3});}
 function drum(t,vol=.35,low=70){tone(musicBus,low*1.8,t,{type:'sine',a:.002,peak:vol,dec:.35,glide:.45});noise(musicBus,t,{dur:.08,peak:vol*.25,f:400,type:'lowpass'});}

 // ---------- music
 const SCALES={calm:[0,2,4,7,9],field:[0,2,4,7,9],tense:[0,3,5,7,10],battle:[0,3,5,7,10]};
 const MOODS={calm:{root:220,bpm:66,density:.45,drums:0,flute:.25},field:{root:246.94,bpm:84,density:.6,drums:.15,flute:.3},tense:{root:196,bpm:92,density:.55,drums:.4,flute:.15},battle:{root:174.61,bpm:118,density:.7,drums:1,flute:.1}};
 const moodOf=s=>!s||s==='hub'||['sword','moon','thunder','mystic','duel'].includes(s)?'calm':s.startsWith('field-')?'field':s==='worldboss'||s==='raid'?'battle':'tense';
 const note=(m,deg,oct=0)=>{const sc=SCALES[m],i=((deg%sc.length)+sc.length)%sc.length,o=Math.floor(deg/sc.length)+oct;return MOODS[m].root*Math.pow(2,(sc[i]+12*o)/12);};
 let nextBeat=0,beat=0,melody=2,current='calm',droneNodes=null;
 function drone(m){if(droneNodes){for(const n of droneNodes){try{n.g.gain.setTargetAtTime(0.0001,ctx.currentTime,.8);n.o.stop(ctx.currentTime+3);}catch{}}}
  droneNodes=[note(m,0,-2),note(m,3,-2)].map((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;o.detune.value=i?4:-4;g.gain.value=0.0001;g.gain.setTargetAtTime(.035,ctx.currentTime,1.5);o.connect(g);g.connect(musicBus);o.start();return{o,g};});}
 function schedule(){if(!ctx||mode!=='all'||ctx.state!=='running')return;const scene=window.worldMap?.state.scene,m=moodOf(scene);
  if(m!==current||!droneNodes){current=m;drone(m);}
  const mood=MOODS[m],step=60/mood.bpm/2;if(nextBeat<ctx.currentTime)nextBeat=ctx.currentTime+.05;
  while(nextBeat<ctx.currentTime+.4){const t=nextBeat,bar=beat%16;
   if(Math.random()<mood.density*(bar%4===0?1.4:bar%2===0?.9:.5)){melody=Math.max(-2,Math.min(9,melody+[-2,-1,-1,1,1,2,0][Math.floor(Math.random()*7)]));pluck(note(m,melody),t,bar%4===0?.17:.11);if(bar%8===0)pluck(note(m,melody-5),t,.08);}
   if(bar===0&&Math.random()<mood.flute)flute(note(m,melody+5),t+step,step*6);
   if(mood.drums){if(bar%8===0)drum(t,.3*mood.drums+.08);else if(bar%4===2&&Math.random()<mood.drums)drum(t,.18*mood.drums,95);if(m==='battle'&&bar%2===1&&Math.random()<.5)noise(musicBus,t,{dur:.05,peak:.05,f:5000,type:'highpass'});}
   nextBeat+=step;beat++;}}
 setInterval(schedule,120);

 // ---------- effects
 const last={};const gate=(k,ms)=>{const now=performance.now();if(now-(last[k]||0)<ms)return false;last[k]=now;return true;};
 const CLASS_COLOR=[1.0,1.2,.8,1.4];
 const sfx={
  hit(c){if(!gate('hit',55))return;const t=ctx.currentTime;noise(sfxBus,t,{dur:.07,peak:c?.32:.2,f:c?2600:1600,q:.8});tone(sfxBus,c?520:260,t,{type:'square',a:.002,peak:c?.08:.05,dec:.08,glide:.5});if(c)tone(sfxBus,1320,t+.02,{type:'triangle',peak:.08,dec:.25});},
  cast(i,w){if(!gate('cast'+i,90))return;const t=ctx.currentTime,k=CLASS_COLOR[w]||1;noise(sfxBus,t,{dur:.28+i*.06,peak:.16+i*.03,f:900*k,q:2,sweep:3});tone(sfxBus,330*k*(1+i*.12),t,{type:'triangle',a:.01,peak:.07,dec:.35,glide:1.8});if(i===3){tone(sfxBus,70,t+.05,{type:'sine',peak:.25,dec:.45,glide:.5});tone(sfxBus,110,t,{type:'sawtooth',a:.02,peak:.06,dec:.7,glide:.5});}},
  death(){if(!gate('death',80))return;const t=ctx.currentTime;tone(sfxBus,420,t,{type:'triangle',peak:.09,dec:.35,glide:.35});noise(sfxBus,t,{dur:.2,peak:.08,f:700,type:'lowpass',sweep:.3});},
  hurt(){if(!gate('hurt',250))return;const t=ctx.currentTime;tone(sfxBus,95,t,{type:'sine',peak:.25,dec:.2,glide:.6});noise(sfxBus,t,{dur:.08,peak:.1,f:300,type:'lowpass'});},
  pickup(){if(!gate('pick',120))return;const t=ctx.currentTime;tone(sfxBus,1046.5,t,{type:'triangle',peak:.1,dec:.18});tone(sfxBus,1568,t+.07,{type:'triangle',peak:.09,dec:.3});},
  level(){const t=ctx.currentTime;[523.25,659.25,783.99,1046.5,1318.5].forEach((f,i)=>tone(sfxBus,f,t+i*.08,{type:'triangle',peak:.12,dec:.55}));noise(sfxBus,t+.3,{dur:.6,peak:.05,f:6000,type:'highpass'});},
  chest(){const t=ctx.currentTime;[784,988,1175,1568].forEach((f,i)=>tone(sfxBus,f,t+i*.06,{type:'sine',peak:.1,dec:.4}));noise(sfxBus,t,{dur:.35,peak:.05,f:7000,type:'highpass'});},
  click(){if(!gate('click',60))return;tone(sfxBus,880,ctx.currentTime,{type:'sine',peak:.035,dec:.05});},
 };
 function play(name,...args){if(!ctx||mode==='off'||ctx.state!=='running')return;try{sfx[name](...args);}catch{}}

 // ---------- hooks into the game
 const baseDamage=damageNumber;damageNumber=function(x,y,value,critical=false){baseDamage(x,y,value,critical);if(Math.hypot(x-P.x,y-P.y)<700)play('hit',critical);};
 const cooldown=i=>{try{return getClassCombat()?.state?.cooldown?.[i]||0;}catch{return 0;}};
 const baseSkill=skill;skill=function(i){const before=cooldown(i),mp=P.mp;const r=baseSkill(i);if(cooldown(i)>before+.01||P.mp<mp-.5)play('cast',i,P.ap?.w||0);return r;};
 const baseHit=hit;hit=function(e,v){const alive=!e.dead&&e.hp>0;baseHit(e,v);if(alive&&!e.rewardReplay&&(e.dead||e.hp<=0))play('death');};
 const baseMsg=msg;msg=function(s){baseMsg(s);const t=String(s);if(/^Nhặt được|Nhận được/.test(t))play('pickup');else if(/Điểm danh|Thành tựu|Xuất quan|Rương|Chiến thắng|nhận thưởng/i.test(t))play('chest');else if(/Đột phá thành công|Lên cấp|Cấp mới/i.test(t))play('level');};
 let lastHp=null,lastLevel=null;
 const baseUp=up;up=function(dt){const r=baseUp(dt);if(P.ap){if(lastHp!=null&&P.hp<lastHp-1&&P.hp>0)play('hurt');lastHp=P.hp;const lv=characterLevel();if(lastLevel!=null&&lv>lastLevel)play('level');lastLevel=lv;}return r;};
 document.addEventListener('click',e=>{if(e.target.closest?.('button')&&e.target!==button)play('click');},true);

 const css=document.createElement('style');css.textContent=`#vl-audio{position:fixed;top:8px;right:44px;z-index:6;width:30px;height:30px;padding:0;border-radius:50%;border:1px solid #c9a960;background:#14262ee6;color:#ffe7a0;font:14px/1 Arial;min-height:0!important}body:not(.vl-hud) #vl-audio{display:none}`;document.head.append(css);
 window.gameAudio={play,start,get mode(){return mode;},moodOf,get context(){return ctx;},tap(node){if(master)master.connect(node);}};
})();
