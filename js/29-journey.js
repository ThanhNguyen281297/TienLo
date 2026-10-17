/* Hướng dẫn nhập môn và các mốc tiến trình của nhân vật. */
(function(){
  const objective=document.createElement('aside');objective.id='journey-objective';objective.innerHTML='<small>TIÊN ĐỒ</small><b></b><span></span>';document.body.append(objective);
  const originalHud=hud;let last='';
  hud=function(){originalHud();objective.hidden=!P.ap||paused();if(!P.ap)return;const p=worldMap.progress();let title,detail;
    if(!p.tutorial){title='Gặp Sư phụ';detail='Đi lên phía bắc sân rồi nhấn E cạnh Sư phụ.';}
    else if(characterLevel()<10){title='Luyện đến cấp 10';detail='Chọn quái · F đánh thường · Nhận 3 điểm mỗi level · Cấp 10 tự mở chiêu đầu.';}
    else if(characterLevel()<40){const next=cultivation.requirements.find(req=>req.level>characterLevel());title='Chiêu tiếp theo · Cấp '+next.level;detail='Luyện quái nhận EXP · Cộng điểm trong Thuộc tính · Truyền Công Các nâng kỹ năng.';}
    else if(P.stage===10){title='Chuẩn bị đột phá';detail='Đan Phòng luyện Đột Phá Đan · Thăng Vị Đan '+(p.thangViDan||0)+'/'+thangViDanNeed(P.r)+'.';}
    else{title='Tu luyện & hợp sức';detail='Đạo hạnh '+Math.floor(P.xp)+'/'+need()+' · Chat để rủ đạo hữu.';}
    const key=title+detail;if(key!==last){objective.querySelector('b').textContent=title;objective.querySelector('span').textContent=detail;last=key;}
  };
})();
