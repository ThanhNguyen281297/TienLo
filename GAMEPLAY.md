# Thiết kế gameplay Tiên Lộ Online

Không có gameplay tốt nhất cho mọi nhóm người chơi. Hướng phù hợp với source này là **ARPG tu tiên hợp tác**, chơi được một mình nhưng gặp đạo hữu sẽ có lợi: combo rõ, skill chủ động, tiến trình có mục tiêu và trang bị có lựa chọn.

Thiết kế tham khảo cách hướng dẫn theo mốc của [Guild Wars 2 New Player Guide](https://www.guildwars2.com/en/new-player-guide/) và chiến đấu hợp tác ngoài thế giới của [Guild Wars 2 Combat](https://www.guildwars2.com/en/the-game/combat/). Các con số dưới đây là lựa chọn riêng của Tiên Lộ, chưa phải kết quả cân bằng qua dữ liệu người chơi.

## Vòng chơi đã triển khai

Đăng ký → chọn phái → nhận bộ đồ/thuốc → gặp Sư phụ → farm và nhiệm vụ nhập môn → Phàm Nhân 3 → học skill trong thành → chọn thuộc tính/trang bị → luyện đan/tăng tầng → farm cùng đạo hữu → thử đấu trường.

Khung Tiên Đồ hiển thị mục tiêu hiện tại. Túi 30 ô và sáu ô trang bị hỗ trợ kéo thả/chạm. Đồ khởi hành gồm Mộc Kiếm, Vải Bố Đạo Bào và ba thuốc mỗi loại hồi máu/linh; người chơi chủ động trang bị thay vì tự cộng chỉ số.

## Bản sắc bốn phái

| Phái | Điểm mạnh | Quyết định khi chơi |
|---|---|---|
| Kiếm Tông | Combo nhanh, dash, kiếm trận và bộc phát | Giữ khoảng cách ngắn, chọn lúc dựng trận và ultimate |
| Minh Nguyệt Tông | Lưỡi bay/thu về, dịch chuyển, khống chế vùng | Canh đường đi/về và điểm dịch chuyển an toàn |
| Lôi Thương Tông | Áp sát, tích ấn, kích nổ | Tích ấn trước chiêu lớn, tận dụng trận tăng tốc đánh |
| Thiên Cơ Môn | Tầm xa, phù, trận và phong ấn | Giữ khoảng cách, đặt vùng khống chế để nối combo |

Đánh thường dùng ngay, không tốn mana; chọn mục tiêu bằng chạm/Tab và bật/tắt F. Skill phải học riêng, có mana/cooldown. Auto Z dành cho farm; kiểm tra cao hơn nên yêu cầu di chuyển và chọn thời điểm dùng chiêu.

## Tu luyện và kinh tế hiện tại

15 cảnh giới, mỗi cảnh giới 10 tầng, tổng 150 tầng. Tầng 1–9 dùng đạo hạnh và Linh Thạch để tăng; tầng 10 cần một Đột Phá Đan và r+1 Thăng Vị Đan để sang cảnh giới mới. Đạo Tổ 10 là giới hạn. Không có đột phá ngẫu nhiên làm mất tiến độ.

Đạo hạnh dự trữ tối đa ba lần yêu cầu hiện tại, nhất quán giữa đánh quái, đả tọa, đan và nhận thưởng. Tăng tầng tiêu thụ phần đã dùng. Tăng tầng cấp ba điểm thuộc tính, đột phá năm điểm.

Thăng Vị Đan vừa có drop ngẫu nhiên, vừa có tích mảnh: mỗi quái nhận một mảnh; 20 mảnh đổi một đan tự động. Quái thường 1,5%, Linh Mạch Cốc 2,5%; quái đấu trường 2%, thủ lĩnh chắc chắn ít nhất một. Nhờ đó người chơi luôn tiến gần tới đột phá. Thủ lĩnh rơi trang bị theo cấp hiện tại hoặc mốc sắp tới, tránh chỉ cho đồ chưa dùng được trong thời gian quá dài.

Sáu ô: vũ khí, đạo bào, linh ngọc, nhẫn, giày, pháp bảo. Thuộc tính Lực tăng công; Thể tăng máu/giáp; Nhanh tăng bạo/né; Linh tăng mana/sát thương skill. Phẩm chất Phàm/Huyền/Linh/Tiên có màu và ánh sáng; vũ khí trang bị tăng cường độ phát sáng nhưng giữ asset phái.

## Học skill

| Ô | Điều kiện | Phí |
|---|---|---|
| 1 | Phàm Nhân 3 | 15 Linh Thạch |
| 2 | Luyện Khí 1 | 50 Linh Thạch |
| 3 | Trúc Cơ 1 | 120 Linh Thạch |
| 4 | Kim Đan 1 | 250 Linh Thạch |

Học tại Truyền Công Các ở Thiên Vân Thành. Tu luyện tối đa ba cấp, mỗi cấp +8% sát thương; phí 30/60/90 Linh Thạch. Đủ cảnh giới không tự mở kỹ năng.

## Hợp tác và thử thách

Người cùng map nhìn thấy nhau và chat/biểu cảm. Quái farm chia phòng theo map/cảnh giới luyện công để tân thủ không phải đánh quái của người quá mạnh. Người góp sát thương trong 15 giây trước khi quái chết được nhận thưởng khi còn cùng phòng. Quái hồi sinh sau tám giây; máu/quá trình chết dùng trạng thái chung trên server. Loot cá nhân được sinh ở client trong bản alpha.

Đấu trường là instance riêng, 30 lượt, 3–10 quái mỗi lượt, thủ lĩnh mỗi năm lượt, nghỉ hai giây giữa lượt. Độ khó chốt theo cấp lúc vào, hoàn tất +300 Linh Thạch. Hai lượt mỗi tài khoản mỗi ngày, reset 00:00 giờ Việt Nam, không hoàn khi thua hoặc rời sớm.

## Hướng phát triển nên ưu tiên tiếp theo

1. Chuyển toàn bộ skill/cooldown/mana, tiến trình và kinh tế sang server trước PvP hoặc giao dịch. Hiện server chỉ quản lý HP quái chung, kiểm tra tầm/tần suất damage và xác thực tài khoản/bản lưu.
2. Thêm boss hợp tác có vùng báo đòn trước 0,7–1 giây, ba cơ chế tránh được bằng di chuyển. Mục tiêu là thắng nhờ hiểu chiêu, không chỉ đứng auto và tăng chỉ số. Chưa triển khai trong bản này.
3. Thêm nhiệm vụ tuần/sự kiện bản đồ và đội nhỏ, phần thưởng cá nhân; tránh tranh quyền last-hit. Giữ solo đủ khả năng tiến trình.
4. Đo thời gian tới skill đầu, số lần chết, thời gian hoàn thành tầng và mức dùng thuốc. Điều chỉnh từ dữ liệu playtest; chưa tuyên bố các chỉ số hiện tại đã cân bằng.
5. Tách renderer/update/event thành hệ thống rõ ràng, chuyển online transport sang WebSocket và benchmark tải trước khi mở đông người.

Mốc playtest đề xuất: người mới hiểu điều khiển và trang bị trong năm phút; được dùng skill đầu trong 10–15 phút; mỗi lần chơi 15–30 phút có một nâng cấp nhìn thấy được. Đây là mục tiêu thiết kế để kiểm chứng, chưa phải số đo thực tế.
