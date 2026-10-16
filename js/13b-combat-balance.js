/* Cooldowns follow total damage per cast, area coverage and control value.
   Damage multipliers remain in each class module; these are base cooldowns. */
(function(){
  const profiles=[
    {name:'Kiếm Tông',cooldowns:[7,6,18,32]},
    {name:'Minh Nguyệt',cooldowns:[10,5,20,36]},
    {name:'Lôi Thương',cooldowns:[5,8,14,28]},
    {name:'Thiên Cơ',cooldowns:[6,5,14,24]}
  ];
  for(const profile of profiles)Object.freeze(profile.cooldowns);
  profiles.forEach(Object.freeze);Object.freeze(profiles);
  window.combatBalance=Object.freeze({profiles,cooldowns:sect=>profiles[sect].cooldowns});
})();
