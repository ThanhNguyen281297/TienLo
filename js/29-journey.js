/* Mốc nhập môn, bộ đồ khởi hành và tích mảnh đột phá để tránh farm vô hạn. */
(function(){
  const creator=$('ok').onclick;
  $('ok').onclick=()=>{creator();if(!P.ap||cr.style.display!=='none')return;
    for(const id of ['moc-kiem','vai-bao','hoi-huyet-dan','hoi-linh-dan'])inventory.addItem(id,id.includes('dan')?3:1);
    msg('Nhập môn: gặp Sư phụ, mở túi (I) để trang bị và chọn bãi Bọ Ngựa phía bắc.');saveCharacter();
  };
  const objective=document.createElement('aside');objective.id='journey-objective';objective.innerHTML='<small>TIÊN ĐỒ</small><b></b><span></span>';document.body.append(objective);
  const originalHud=hud;let last='';
  hud=function(){originalHud();objective.hidden=!P.ap||paused();if(!P.ap)return;const p=worldMap.progress();let title,detail;
    if(!p.tutorial){title='Gặp Sư phụ';detail='Đi lên phía bắc sân rồi nhấn E cạnh Sư phụ.';}
    else if(P.r===0&&P.stage<3){title='Đạt Phàm Nhân 3';detail='Trang bị trong túi (I), chọn quái · F để đánh · B tăng tầng tại đài.';}
    else if(!p.learnedSkills?.[0]){title='Học chiêu đầu tiên';detail='Truyền tống đến Thiên Vân Thành · Truyền Công Các · 15 Linh Thạch.';}
    else if(P.stage===10){title='Chuẩn bị đột phá';detail='Đan Phòng luyện Đột Phá Đan · Thăng Vị Đan '+(p.thangViDan||0)+'/'+thangViDanNeed(P.r)+'.';}
    else{title='Tu luyện & hợp sức';detail='Đạo hạnh '+Math.floor(P.xp)+'/'+need()+' · Mảnh Thăng Vị '+(p.thangViFragments||0)+'/20 · Chat để rủ đạo hữu.';}
    const key=title+detail;if(key!==last){objective.querySelector('b').textContent=title;objective.querySelector('span').textContent=detail;last=key;}
  };
})();
