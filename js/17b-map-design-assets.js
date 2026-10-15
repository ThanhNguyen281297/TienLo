/* Tách từ atlas MAP gốc: PNG alpha độc lập hoạt động cả HTTP và file://. */
(function(){
  const world=window.worldMap;
  if(!world)return;
  // Atlas chỉ ghi nguồn để tra cứu. Renderer nạp trực tiếp MAP/vector/<key>.svg.
  const sources={
    thunderHall:[5,0,0,606,365],thunderAltar:[5,563,577,189,247],
    crystalPillar:[8,978,0,114,269],cloudRock:[8,0,918,169,90],
    mysticHall:[7,298,287,346,308],mysticArchive:[7,373,0,406,325],
    mysticGarden:[5,985,0,463,365],mysticDais:[8,555,414,146,207],
    hubWell:[7,0,0,374,323],hubBazaar:[7,660,576,398,279],
    pineTree:[8,1071,737,129,124],whiteBlossom:[8,935,735,140,125],
    lotusPond:[8,994,845,112,74],guardianLion:[8,0,0,253,270]
  };
  // Kích thước PNG và bề rộng gợi ý, giữ đúng tỷ lệ ảnh gốc.
  // baseY là vị trí tương đối của mặt đất trong PNG; các đài nổi có chân đá bên dưới.
  const catalog={
    thunderHall:{name:'Lôi Vân Điện',width:601,height:359,size:330,baseY:.78},
    thunderAltar:{name:'Lôi Đình Đài',width:181,height:232,size:105,baseY:.64},
    crystalPillar:{name:'Lôi Tinh Trụ',width:94,height:252,size:35,baseY:.91},
    cloudRock:{name:'Phù Vân Đảo',width:139,height:90,size:180,baseY:.45},
    mysticHall:{name:'Thiên Cơ Điện',width:328,height:292,size:270,baseY:.84},
    mysticArchive:{name:'Tàng Thư Các',width:391,height:314,size:235,baseY:.74},
    mysticGarden:{name:'Linh Dược Uyển',width:458,height:359,size:245,baseY:.66},
    mysticDais:{name:'Linh Phù Liên Đài',width:136,height:192,size:85,baseY:.72},
    hubWell:{name:'Vân Đan Lô',width:370,height:322,size:235,baseY:.76},
    hubBazaar:{name:'Vân Thị',width:376,height:270,size:220,baseY:.9},
    pineTree:{name:'Cổ Tùng',width:129,height:114,size:75,baseY:.97},
    whiteBlossom:{name:'Bạch Anh',width:129,height:113,size:75,baseY:.97},
    lotusPond:{name:'Liên Trì',width:106,height:72,size:95,baseY:.68},
    guardianLion:{name:'Lôi Linh Sư',width:241,height:240,size:75,baseY:.91}
  };
  for(const [key,rect]of Object.entries(sources)){
    const [atlas,x,y,width,height]=rect;
    world.definitions[key]=[atlas,x/1448,y/1086,width/1448,height/1086];
    catalog[key].source='MAP/asset'+(atlas+1)+'.png';
    catalog[key].rect={x,y,width,height};
  }
  world.mapAssetCatalog=catalog;
  world.preloadSprites();
})();
