/* Cân bằng sát thương giữa 4 phái.
   Đo bằng mô phỏng tự động đánh 60 giây vào mộc nhân (cấp 15 / 45 / 80, không trang bị,
   không điểm thuộc tính), sát thương mỗi giây so với công, chưa có hệ số:
     Kiếm Tông 3,9× · Minh Nguyệt 3,4× · Lôi Thương 3,3× · Thiên Cơ 2,7×.
   Mục tiêu: cận chiến (Kiếm, Lôi) ~3,4×, đánh xa (Minh Nguyệt, Thiên Cơ) ~3,1× — đánh xa
   an toàn hơn nên thấp hơn một chút. Quái ngoài bãi săn (overworld.py) được chỉnh theo
   mức ~3,4× này để một con cùng cấp chết sau ~4 giây.
   Hệ số áp lên mọi đòn của người chơi (đánh thường + kỹ năng), không áp cho linh thú. */
(function(){
 // Hệ số mới tính cả điểm mạnh phái (Character/sect-potential.json): Kiếm có bạo sẵn, Minh Nguyệt/Thiên Cơ có
 // skill sẵn, Lôi Thương có +20% máu nên sát thương gốc hạ để tổng DPS các phái vẫn ngang nhau.
 const CLASS_DAMAGE=window.sectPotential?.data?.classDamage||[.88,.92,1.04,1.15];
 const base=hit;
 hit=function(enemy,power){
  if(P.ap&&!window.petCombat?.dealing&&typeof power==='number')power*=CLASS_DAMAGE[P.ap.w]??1;
  return base(enemy,power);
 };
 window.classBalance={CLASS_DAMAGE};
})();
