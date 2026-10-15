/* Cast start cues use simulation time and only follow successful casts. */
(function(){
  const cues=[];
  const previous=skill;
  skill=function(index){
    const before=P.mp,start={x:P.x,y:P.y-22},result=previous(index);
    if(P.mp<before&&index!==1){
      const sect=P.ap.w,origin=characterWeapon.position(sect,start.x,start.y+22);
      cues.push({sect,index,x:origin.x,y:origin.y,age:0,duration:index===3?.7:.35});
      if(cues.length>12)cues.shift();
    }
    return result;
  };
  const update=up;up=function(dt){update(dt);if(paused())return;for(const c of cues)c.age+=dt;for(let i=cues.length-1;i>=0;i--)if(cues[i].age>=cues[i].duration)cues.splice(i,1);};
  const draw=dr;dr=function(){draw();if(paused())return;const c=gameCamera();g.save();g.setTransform(Z,0,0,Z,-c.x*Z,-c.y*Z);for(const cue of cues)spellMotion.charge(g,cue.sect,cue.x,cue.y,cue.age,cue.duration);g.restore();};
  const reset=classCombat.onRespawn;classCombat.onRespawn=function(){cues.length=0;return reset();};
  window.castChoreography={cues};
})();
