/* Cooldowns follow total damage per cast, area coverage and control value.
   Damage multipliers remain in each class module; these are base cooldowns. */
(function(){
  const profiles=[
    {name:'Kiếm Tông',role:'Cơ động · sát thương đơn mục tiêu',description:'Áp sát, liên trảm và dùng Kiếm Ảnh Bộ để né. Kiếm trận khiến mục tiêu nhận thêm sát thương.',cooldowns:[7,6,18,32],basic:{name:'Ngự Kiếm Liên Trảm',steps:4,interval:.34,range:82,power:[.8,.85,1,1.8]}},
    {name:'Minh Nguyệt',role:'Khống chế · giữ khoảng cách',description:'Lưỡi liềm đi và về, làm chậm rồi đóng băng. Giữ địch trong Nguyệt Luân Trận để khống chế.',cooldowns:[10,5,20,36],basic:{name:'Tam Nguyệt Luân',steps:3,interval:.44,range:215,power:[.75,.85,1.25]}},
    {name:'Lôi Thương',role:'Áp sát · tích ấn · chống chịu',description:'Đánh xuyên và quét nhiều mục tiêu, tích Lôi Ấn rồi bộc phát. Đứng trong Lôi Trận giảm 20% sát thương nhận.',cooldowns:[5,8,14,28],basic:{name:'Lôi Thương Tứ Kích',steps:4,interval:.50,range:115,power:[1.1,1.2,1.25,1.65]}},
    {name:'Thiên Cơ',role:'Trận pháp · suy yếu · đánh xa',description:'Gắn phù ấn rồi kích nổ, giữ khoảng cách. Thiên Cơ Trận giảm 20% công của địch và phong ấn đánh thường.',cooldowns:[6,5,14,24],basic:{name:'Linh Phù Tam Thức',steps:3,interval:.50,range:275,power:[.75,.9,1.25]}}
  ];
  for(const profile of profiles){Object.freeze(profile.cooldowns);Object.freeze(profile.basic.power);Object.freeze(profile.basic);}
  profiles.forEach(Object.freeze);Object.freeze(profiles);
  window.combatBalance=Object.freeze({profiles,cooldowns:sect=>profiles[sect].cooldowns});
})();
