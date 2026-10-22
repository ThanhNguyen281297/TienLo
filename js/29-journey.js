/* Main-quest tracker; adventureGame supplies quest progress without onboarding. */
(function(){
  const objective=document.createElement('aside');objective.id='journey-objective';objective.hidden=true;objective.innerHTML='<small>CHÍNH TUYẾN</small><b></b><span></span>';document.body.append(objective);
  const originalHud=hud;
  hud=function(){originalHud();if(!P.ap||paused())objective.hidden=true;};
})();
